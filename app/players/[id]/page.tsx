import Link from "next/link";
import { getPlayerStats } from "@/lib/stats";
import { notFound } from "next/navigation";
import RatingChart from "@/components/RatingChart";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="font-bold text-lg leading-tight">{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return <span style={{ color: "var(--muted)" }}>—</span>;
  const positive = streak > 0;
  return (
    <span
      className="font-bold"
      style={{ color: positive ? "var(--green)" : "var(--red)" }}
    >
      {positive ? "🔥" : "❄️"} {Math.abs(streak)}-{positive ? "win" : "loss"} streak
    </span>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await getPlayerStats(id);
  if (!stats) notFound();

  const h2hEntries = Object.entries(stats.headToHead).sort(
    (a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses)
  );

  return (
    <div className="space-y-4 mt-2">
      {/* Header */}
      <div
        className="p-4 rounded-xl flex items-center gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {stats.player.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{stats.player.name}</h1>
          <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            <StreakBadge streak={stats.currentStreak} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: "var(--accent2)" }}>
            {stats.rating.toFixed(0)}
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            ±{stats.rd.toFixed(0)} RD
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Matches" value={stats.totalMatches.toString()} />
        <StatCard label="Win Rate" value={stats.totalMatches > 0 ? `${(stats.winRate * 100).toFixed(0)}%` : "—"} sub={`${stats.wins}W ${stats.losses}L`} />
        <StatCard label="Best Streak" value={`${stats.longestWinStreak}W`} sub={`${stats.longestLossStreak}L worst`} />
        <StatCard label="Rank Score" value={stats.rankScore.toFixed(0)} sub="rating − 1.5×RD" />
      </div>

      {/* Rating chart */}
      {stats.ratingHistory.length > 1 && (
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>
            RATING HISTORY
          </h2>
          <RatingChart history={stats.ratingHistory} />
        </div>
      )}

      {/* Best win / worst loss */}
      {(stats.bestWin || stats.worstLoss) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stats.bestWin && (
            <div
              className="p-3 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Best Win</div>
              <div className="font-semibold">vs {stats.bestWin.opponentName}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--green)" }}>
                Opp. rating {stats.bestWin.opponentRating.toFixed(0)}
              </div>
            </div>
          )}
          {stats.worstLoss && (
            <div
              className="p-3 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Worst Loss</div>
              <div className="font-semibold">vs {stats.worstLoss.opponentName}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--red)" }}>
                Opp. rating {stats.worstLoss.opponentRating.toFixed(0)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Head-to-head */}
      {h2hEntries.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              HEAD-TO-HEAD
            </h2>
          </div>
          {h2hEntries.map(([opponentId, h2h]) => {
            const total = h2h.wins + h2h.losses;
            const winPct = total > 0 ? h2h.wins / total : 0;
            return (
              <Link
                key={opponentId}
                href={`/players/${opponentId}`}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:opacity-80"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex-1">
                  <span className="font-medium">{h2h.opponentName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span style={{ color: "var(--green)" }}>{h2h.wins}W</span>
                    {" "}
                    <span style={{ color: "var(--red)" }}>{h2h.losses}L</span>
                  </div>
                  <div
                    className="w-16 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${winPct * 100}%`,
                        background: winPct >= 0.5 ? "var(--green)" : "var(--red)",
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
