import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeAllRatings } from "@/lib/stats";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      take: limit,
      skip: offset,
      orderBy: { playedAt: "desc" },
      include: {
        winner: { select: { id: true, name: true } },
        loser: { select: { id: true, name: true } },
        ratingChanges: { select: { playerId: true, ratingBefore: true, ratingAfter: true } },
      },
    }),
    prisma.match.count(),
  ]);

  return NextResponse.json({ matches, total });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { winnerId, loserId, winnerScore, loserScore, format, playedAt, notes } = body;

  if (!winnerId || !loserId) {
    return NextResponse.json({ error: "Winner and loser are required" }, { status: 400 });
  }
  if (winnerId === loserId) {
    return NextResponse.json({ error: "Winner and loser must be different players" }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      winnerId,
      loserId,
      winnerScore: winnerScore ?? null,
      loserScore: loserScore ?? null,
      format: format ?? "single",
      playedAt: playedAt ? new Date(playedAt) : new Date(),
      notes: notes ?? null,
    },
  });

  // Recompute all ratings after adding the match
  await recomputeAllRatings();

  return NextResponse.json(match, { status: 201 });
}
