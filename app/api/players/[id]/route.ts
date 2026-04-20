import { NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/stats";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await getPlayerStats(id);
  if (!stats) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(stats);
}
