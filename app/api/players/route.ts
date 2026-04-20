import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeAllRatings } from "@/lib/stats";

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: { currentRating: true },
  });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.player.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Player already exists" }, { status: 409 });
  }

  const player = await prisma.player.create({ data: { name: name.trim() } });

  // Initialize rating row
  await prisma.playerRating.create({ data: { playerId: player.id } });

  return NextResponse.json(player, { status: 201 });
}
