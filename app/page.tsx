import Link from "next/link";
import { getLeaderboard } from "@/lib/stats";

function RdBadge({ rd }: { rd: number }) {
  const level = rd < 80 ? "high" : rd < 150 ? "mid" : "low";
  const colors = {
    high: { bg: "#16301a", text: "#4ade80" },
    mid: { bg: "#2e2a10", text: "#facc15" },
    low: { bg: "#2e1818", text: "#f87171" },
  };
  const labels = { high: "Proven", mid: "Active", low: "Unranked" };
  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{ background: colors[level].bg, color: colors[level].text }}
    >
      {labels[level]}
    </span>
  );
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold">Rankings</h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Glicko-2 · {leaderboard.length} players
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-4xl mb-3">🏓</p>
          <p className="font-semibold mb-1">No players yet</p>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Add players and start logging matches to see rankings
          </p>
          <Link
            href="/players"
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Add Players
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((p, i) => (
            <Link
              key={p.playerId}
              href={`/players/${p.playerId}`}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:opacity-80"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {i === 0 ? (
                  <span className="text-xl">🥇</span>
                ) : i === 1 ? (
                  <span className="text-xl">🥈</span>
                ) : i === 2 ? (
                  <span className="text-xl">🥉</span>
                ) : (
                  <span className="font-bold text-lg" style={{ color: "var(--muted)" }}>
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Name + badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{p.name}</span>
                  <RdBadge rd={p.rd} />
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {p.wins}W {p.losses}L ·{" "}
                  {p.totalMatches > 0 ? `${(p.winRate * 100).toFixed(0)}%` : "—"}
                </div>
              </div>

              {/* Rating */}
              <div className="text-right">
                <div className="font-bold text-lg" style={{ color: "var(--accent2)" }}>
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

      <div
        className="mt-6 p-4 rounded-xl text-sm space-y-1"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <p className="font-semibold mb-2">How rankings work</p>
        <p style={{ color: "var(--muted)" }}>
          <strong style={{ color: "var(--foreground)" }}>Rating</strong> — skill estimate
          (Glicko-2). Starts at 1500.
        </p>
        <p style={{ color: "var(--muted)" }}>
          <strong style={{ color: "var(--foreground)" }}>±RD</strong> — uncertainty. Falls
          as you play more, rises when inactive.
        </p>
        <p style={{ color: "var(--muted)" }}>
          <strong style={{ color: "var(--foreground)" }}>Rank order</strong> — uses
          rating − 1.5×RD so you must prove yourself over many matches. A 5-0 lucky streak
          won&apos;t beat a proven 35-15 record.
        </p>
      </div>
    </div>
  );
}
