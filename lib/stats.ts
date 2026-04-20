import { prisma } from "./prisma";
import { updateRating, rankScore, DEFAULT_RATING, type Glicko2Rating } from "./glicko2";

/**
 * Recompute all ratings from scratch by replaying every match in chronological order.
 * Called after any match insert/delete to keep ratings consistent.
 */
export async function recomputeAllRatings() {
  const matches = await prisma.match.findMany({
    orderBy: { playedAt: "asc" },
    include: { winner: true, loser: true },
  });

  const players = await prisma.player.findMany();

  // Initialize each player's running state
  const ratings = new Map<string, Glicko2Rating>(
    players.map((p) => [p.id, { ...DEFAULT_RATING }])
  );

  // Delete existing history and ratings
  await prisma.ratingHistory.deleteMany();
  await prisma.playerRating.deleteMany();

  // Replay matches
  for (const match of matches) {
    const winnerRating = ratings.get(match.winnerId) ?? { ...DEFAULT_RATING };
    const loserRating = ratings.get(match.loserId) ?? { ...DEFAULT_RATING };

    const newWinner = updateRating(winnerRating, [{ opponent: loserRating, score: 1 }]);
    const newLoser = updateRating(loserRating, [{ opponent: winnerRating, score: 0 }]);

    // Record history for winner
    await prisma.ratingHistory.create({
      data: {
        playerId: match.winnerId,
        matchId: match.id,
        ratingBefore: winnerRating.rating,
        rdBefore: winnerRating.rd,
        ratingAfter: newWinner.rating,
        rdAfter: newWinner.rd,
        timestamp: match.playedAt,
      },
    });

    // Record history for loser
    await prisma.ratingHistory.create({
      data: {
        playerId: match.loserId,
        matchId: match.id,
        ratingBefore: loserRating.rating,
        rdBefore: loserRating.rd,
        ratingAfter: newLoser.rating,
        rdAfter: newLoser.rd,
        timestamp: match.playedAt,
      },
    });

    ratings.set(match.winnerId, newWinner);
    ratings.set(match.loserId, newLoser);
  }

  // Persist current ratings
  for (const [playerId, rating] of ratings) {
    await prisma.playerRating.upsert({
      where: { playerId },
      create: { playerId, ...rating },
      update: { ...rating },
    });
  }
}

export type PlayerStats = {
  player: { id: string; name: string; createdAt: Date };
  rating: number;
  rd: number;
  volatility: number;
  rankScore: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;   // positive = win streak, negative = loss streak
  longestWinStreak: number;
  longestLossStreak: number;
  bestWin: { opponentName: string; opponentRating: number; matchId: string } | null;
  worstLoss: { opponentName: string; opponentRating: number; matchId: string } | null;
  ratingHistory: Array<{ timestamp: Date; rating: number; rd: number; matchId: string | null }>;
  headToHead: Record<string, { wins: number; losses: number; opponentName: string }>;
};

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      currentRating: true,
      wonMatches: {
        include: { loser: { include: { currentRating: true } } },
        orderBy: { playedAt: "asc" },
      },
      lostMatches: {
        include: { winner: { include: { currentRating: true } } },
        orderBy: { playedAt: "asc" },
      },
      ratingHistory: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!player) return null;

  const rating = player.currentRating ?? { ...DEFAULT_RATING };

  // Build chronological match list
  type MatchEntry = { playedAt: Date; won: boolean; opponentId: string; opponentName: string; opponentRating: number; matchId: string };
  const allMatches: MatchEntry[] = [
    ...player.wonMatches.map((m) => ({
      playedAt: m.playedAt,
      won: true,
      opponentId: m.loserId,
      opponentName: m.loser.name,
      opponentRating: m.loser.currentRating?.rating ?? DEFAULT_RATING.rating,
      matchId: m.id,
    })),
    ...player.lostMatches.map((m) => ({
      playedAt: m.playedAt,
      won: false,
      opponentId: m.winnerId,
      opponentName: m.winner.name,
      opponentRating: m.winner.currentRating?.rating ?? DEFAULT_RATING.rating,
      matchId: m.id,
    })),
  ].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  const wins = allMatches.filter((m) => m.won).length;
  const losses = allMatches.filter((m) => !m.won).length;
  const totalMatches = allMatches.length;

  // Streaks
  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let runWin = 0;
  let runLoss = 0;

  for (const m of allMatches) {
    if (m.won) {
      runWin++;
      runLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, runWin);
    } else {
      runLoss++;
      runWin = 0;
      longestLossStreak = Math.max(longestLossStreak, runLoss);
    }
  }

  if (allMatches.length > 0) {
    const last = allMatches[allMatches.length - 1];
    if (last.won) {
      let streak = 0;
      for (let i = allMatches.length - 1; i >= 0 && allMatches[i].won; i--) streak++;
      currentStreak = streak;
    } else {
      let streak = 0;
      for (let i = allMatches.length - 1; i >= 0 && !allMatches[i].won; i--) streak++;
      currentStreak = -streak;
    }
  }

  // Best win: highest-rated opponent beaten
  const wonMatches = allMatches.filter((m) => m.won);
  const bestWin = wonMatches.length
    ? wonMatches.reduce((best, m) => (m.opponentRating > best.opponentRating ? m : best))
    : null;

  // Worst loss: lowest-rated opponent lost to
  const lostMatches = allMatches.filter((m) => !m.won);
  const worstLoss = lostMatches.length
    ? lostMatches.reduce((worst, m) => (m.opponentRating < worst.opponentRating ? m : worst))
    : null;

  // Head-to-head
  const headToHead: Record<string, { wins: number; losses: number; opponentName: string }> = {};
  for (const m of allMatches) {
    if (!headToHead[m.opponentId]) {
      headToHead[m.opponentId] = { wins: 0, losses: 0, opponentName: m.opponentName };
    }
    if (m.won) headToHead[m.opponentId].wins++;
    else headToHead[m.opponentId].losses++;
  }

  const ratingHistory = player.ratingHistory.map((h) => ({
    timestamp: h.timestamp,
    rating: h.ratingAfter,
    rd: h.rdAfter,
    matchId: h.matchId,
  }));

  return {
    player: { id: player.id, name: player.name, createdAt: player.createdAt },
    rating: rating.rating,
    rd: rating.rd,
    volatility: rating.volatility,
    rankScore: rankScore(rating),
    totalMatches,
    wins,
    losses,
    winRate: totalMatches > 0 ? wins / totalMatches : 0,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    bestWin: bestWin
      ? { opponentName: bestWin.opponentName, opponentRating: bestWin.opponentRating, matchId: bestWin.matchId }
      : null,
    worstLoss: worstLoss
      ? { opponentName: worstLoss.opponentName, opponentRating: worstLoss.opponentRating, matchId: worstLoss.matchId }
      : null,
    ratingHistory,
    headToHead,
  };
}

export async function getLeaderboard() {
  const ratings = await prisma.playerRating.findMany({
    include: {
      player: {
        include: {
          wonMatches: { select: { id: true } },
          lostMatches: { select: { id: true } },
        },
      },
    },
  });

  return ratings
    .map((r) => {
      const totalMatches = r.player.wonMatches.length + r.player.lostMatches.length;
      const wins = r.player.wonMatches.length;
      return {
        playerId: r.playerId,
        name: r.player.name,
        rating: r.rating,
        rd: r.rd,
        volatility: r.volatility,
        rankScore: rankScore(r),
        wins,
        losses: totalMatches - wins,
        totalMatches,
        winRate: totalMatches > 0 ? wins / totalMatches : 0,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}
