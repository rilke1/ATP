import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/stats";

export async function GET() {
  const leaderboard = await getLeaderboard();
  return NextResponse.json(leaderboard);
}
