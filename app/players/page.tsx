import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/stats";

export default async function PlayersPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold">Players</h1>
        <Link
          href="/players/new"
          className="text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          + Add Player
        </Link>
      </div>

      {leaderboard.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-4xl mb-3">👤</p>
          <p className="font-semibold">No players yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted)" }}>
            Add your group of friends to get started
          </p>
          <Link
            href="/players/new"
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Add First Player
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((p, i) => (
            <Link
              key={p.playerId}
              href={`/players/${p.playerId}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  #{i + 1} · {p.totalMatches} matches · {p.wins}W {p.losses}L
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold" style={{ color: "var(--accent2)" }}>
                  {p.rating.toFixed(0)}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  ±{p.rd.toFixed(0)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
