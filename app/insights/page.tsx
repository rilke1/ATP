import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Insight = { title: string; value: string; detail: string; emoji: string };

async function getInsights(): Promise<Insight[]> {
  const [leaderboard, allMatches] = await Promise.all([
    getLeaderboard(),
    prisma.match.findMany({
      orderBy: { playedAt: "asc" },
      include: {
        winner: { include: { currentRating: true } },
        loser: { include: { currentRating: true } },
      },
    }),
  ]);

  if (allMatches.length === 0) return [];

  const insights: Insight[] = [];

  // Most active
  const activityMap = new Map<string, { name: string; count: number }>();
  for (const m of allMatches) {
    for (const p of [m.winner, m.loser]) {
      const cur = activityMap.get(p.id) ?? { name: p.name, count: 0 };
      activityMap.set(p.id, { ...cur, count: cur.count + 1 });
    }
  }
  const mostActive = [...activityMap.values()].sort((a, b) => b.count - a.count)[0];
  if (mostActive) {
    insights.push({
      emoji: "🏓",
      title: "Most Active Player",
      value: mostActive.name,
      detail: `${mostActive.count} matches played`,
    });
  }

  // Biggest upset
  const ratingHistories = await prisma.ratingHistory.findMany();
  type RatingHistoryRow = (typeof ratingHistories)[number];
  const histByMatch = new Map<string, RatingHistoryRow[]>();
  for (const h of ratingHistories) {
    if (!h.matchId) continue;
    const arr: RatingHistoryRow[] = histByMatch.get(h.matchId) ?? [];
    arr.push(h);
    histByMatch.set(h.matchId, arr);
  }

  let biggestUpsetDiff = 0;
  let biggestUpset: { winnerName: string; loserName: string; diff: number } | null = null;

  for (const m of allMatches) {
    const hist: RatingHistoryRow[] = histByMatch.get(m.id) ?? [];
    const winnerHist = hist.find((h) => h.playerId === m.winnerId);
    const loserHist = hist.find((h) => h.playerId === m.loserId);
    if (!winnerHist || !loserHist) continue;
    const diff = winnerHist.ratingBefore - loserHist.ratingBefore;
    if (diff < biggestUpsetDiff) {
      biggestUpsetDiff = diff;
      biggestUpset = { winnerName: m.winner.name, loserName: m.loser.name, diff: Math.abs(diff) };
    }
  }

  if (biggestUpset) {
    insights.push({
      emoji: "💥",
      title: "Biggest Upset",
      value: `${biggestUpset.winnerName} beat ${biggestUpset.loserName}`,
      detail: `Rating gap: ${biggestUpset.diff.toFixed(0)} points`,
    });
  }

  // King of consistency
  const consistent = leaderboard.filter((p) => p.totalMatches >= 5).sort((a, b) => b.winRate - a.winRate)[0];
  if (consistent) {
    insights.push({
      emoji: "👑",
      title: "King of Consistency",
      value: consistent.name,
      detail: `${(consistent.winRate * 100).toFixed(0)}% win rate (${consistent.totalMatches} matches)`,
    });
  }

  // Most improved (recent 10 matches)
  const recentHistory = await prisma.ratingHistory.findMany({ orderBy: { timestamp: "desc" } });
  type RecentHistoryRow = (typeof recentHistory)[number];
  const last10Map = new Map<string, RecentHistoryRow[]>();
  for (const h of recentHistory) {
    const arr: RecentHistoryRow[] = last10Map.get(h.playerId) ?? [];
    if (arr.length < 10) { arr.push(h); last10Map.set(h.playerId, arr); }
  }
  const playerMap = new Map(leaderboard.map((p) => [p.playerId, p.name]));
  let mostImprovedDiff = 0;
  let mostImproved: { name: string; diff: number } | null = null;
  for (const [pid, hist] of last10Map) {
    if (hist.length < 3) continue;
    const diff = hist[0].ratingAfter - hist[hist.length - 1].ratingBefore;
    if (diff > mostImprovedDiff) {
      mostImprovedDiff = diff;
      mostImproved = { name: playerMap.get(pid) ?? pid, diff };
    }
  }
  if (mostImproved) {
    insights.push({
      emoji: "📈",
      title: "Most Improved",
      value: mostImproved.name,
      detail: `+${mostImproved.diff.toFixed(0)} rating in last matches`,
    });
  }

  // H2H map for rivalry stats
  const h2hMap = new Map<string, { p1: string; p2: string; p1Name: string; p2Name: string; p1Wins: number; p2Wins: number }>();
  for (const m of allMatches) {
    const key = [m.winnerId, m.loserId].sort().join("|");
    const cur = h2hMap.get(key) ?? {
      p1: m.winnerId < m.loserId ? m.winnerId : m.loserId,
      p2: m.winnerId < m.loserId ? m.loserId : m.winnerId,
      p1Name: m.winnerId < m.loserId ? m.winner.name : m.loser.name,
      p2Name: m.winnerId < m.loserId ? m.loser.name : m.winner.name,
      p1Wins: 0, p2Wins: 0,
    };
    if (m.winnerId === cur.p1) cur.p1Wins++; else cur.p2Wins++;
    h2hMap.set(key, cur);
  }

  // Closest rivalry
  let closestRivalry: { p1Name: string; p2Name: string; p1Wins: number; p2Wins: number } | null = null;
  let closestBalance = Infinity;
  for (const r of h2hMap.values()) {
    const total = r.p1Wins + r.p2Wins;
    if (total < 4) continue;
    const balance = Math.abs(r.p1Wins - r.p2Wins) / total;
    if (balance < closestBalance) { closestBalance = balance; closestRivalry = r; }
  }
  if (closestRivalry) {
    insights.push({
      emoji: "⚔️",
      title: "Closest Rivalry",
      value: `${closestRivalry.p1Name} vs ${closestRivalry.p2Name}`,
      detail: `${closestRivalry.p1Wins}–${closestRivalry.p2Wins}`,
    });
  }

  // Most dominant H2H
  let mostDominant: { winnerName: string; loserName: string; wins: number; losses: number } | null = null;
  let bestRatio = 0;
  for (const r of h2hMap.values()) {
    if (r.p1Wins + r.p2Wins < 4) continue;
    const r1 = r.p1Wins / Math.max(1, r.p2Wins);
    const r2 = r.p2Wins / Math.max(1, r.p1Wins);
    if (r1 > bestRatio) { bestRatio = r1; mostDominant = { winnerName: r.p1Name, loserName: r.p2Name, wins: r.p1Wins, losses: r.p2Wins }; }
    if (r2 > bestRatio) { bestRatio = r2; mostDominant = { winnerName: r.p2Name, loserName: r.p1Name, wins: r.p2Wins, losses: r.p1Wins }; }
  }
  if (mostDominant) {
    insights.push({
      emoji: "💪",
      title: "Most Dominant H2H",
      value: `${mostDominant.winnerName} over ${mostDominant.loserName}`,
      detail: `${mostDominant.wins}–${mostDominant.losses}`,
    });
  }

  // Farmer
  if (leaderboard.length >= 4) {
    const half = Math.floor(leaderboard.length / 2);
    const weakIds = new Set(leaderboard.slice(half).map((p) => p.playerId));
    const farmerMap = new Map<string, { name: string; wins: number; total: number }>();
    for (const m of allMatches) {
      if (weakIds.has(m.loserId)) {
        const cur = farmerMap.get(m.winnerId) ?? { name: m.winner.name, wins: 0, total: 0 };
        farmerMap.set(m.winnerId, { ...cur, wins: cur.wins + 1, total: cur.total + 1 });
      }
      if (weakIds.has(m.winnerId)) {
        const cur = farmerMap.get(m.loserId) ?? { name: m.loser.name, wins: 0, total: 0 };
        farmerMap.set(m.loserId, { ...cur, total: cur.total + 1 });
      }
    }
    const farmer = [...farmerMap.values()].filter((f) => f.total >= 5).sort((a, b) => b.wins / b.total - a.wins / a.total)[0];
    if (farmer) {
      insights.push({
        emoji: "🌾",
        title: "The Farmer",
        value: farmer.name,
        detail: `${farmer.wins}/${farmer.total} wins vs lower-ranked opponents`,
      });
    }
  }

  // Ghost
  const ghost = leaderboard.filter((p) => p.rd > 150 && p.rating > 1500 && p.totalMatches >= 3).sort((a, b) => b.rating - a.rating)[0];
  if (ghost) {
    insights.push({
      emoji: "👻",
      title: "The Ghost",
      value: ghost.name,
      detail: `Rating ${ghost.rating.toFixed(0)} but rarely plays (RD: ${ghost.rd.toFixed(0)})`,
    });
  }

  // GOAT
  if (leaderboard.length > 0 && leaderboard[0].totalMatches >= 3) {
    insights.push({
      emoji: "🥇",
      title: "GOAT (All-Time)",
      value: leaderboard[0].name,
      detail: `Rating ${leaderboard[0].rating.toFixed(0)}, rank score ${leaderboard[0].rankScore.toFixed(0)}`,
    });
  }

  return insights;
}

export default async function InsightsPage() {
  const insights = await getInsights();

  return (
    <div>
      <h1 className="text-xl font-bold mb-4 mt-2">Insights</h1>

      {insights.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-4xl mb-3">✨</p>
          <p className="font-semibold">Not enough data yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Log at least 4 matches to see fun insights
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className="p-4 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-2xl mb-2">{ins.emoji}</div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--muted)" }}>
                {ins.title.toUpperCase()}
              </div>
              <div className="font-bold text-base leading-tight">{ins.value}</div>
              <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{ins.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
