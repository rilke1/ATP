import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({
    take: 100,
    orderBy: { playedAt: "desc" },
    include: {
      winner: { select: { id: true, name: true } },
      loser: { select: { id: true, name: true } },
      ratingChanges: { select: { playerId: true, ratingBefore: true, ratingAfter: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold">Match History</h1>
        <Link
          href="/matches/new"
          className="text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          + Log Match
        </Link>
      </div>

      {matches.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-4xl mb-3">🏓</p>
          <p className="font-semibold">No matches yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted)" }}>
            Log your first match to start tracking rankings
          </p>
          <Link
            href="/matches/new"
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Log First Match
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const winnerChange = m.ratingChanges.find((c) => c.playerId === m.winner.id);
            const loserChange = m.ratingChanges.find((c) => c.playerId === m.loser.id);
            const winnerDelta = winnerChange
              ? winnerChange.ratingAfter - winnerChange.ratingBefore
              : null;
            const loserDelta = loserChange
              ? loserChange.ratingAfter - loserChange.ratingBefore
              : null;

            return (
              <div
                key={m.id}
                className="p-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {format(new Date(m.playedAt), "MMM d, yyyy · HH:mm")}
                  </span>
                  {m.format !== "single" && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface2)", color: "var(--muted)" }}
                    >
                      {m.format.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/players/${m.winner.id}`}
                    className="flex-1 font-semibold hover:underline"
                    style={{ color: "var(--green)" }}
                  >
                    🏆 {m.winner.name}
                    {m.winnerScore != null && m.loserScore != null && (
                      <span className="text-sm ml-1 font-normal">({m.winnerScore})</span>
                    )}
                  </Link>

                  <span style={{ color: "var(--muted)" }}>vs</span>

                  <Link
                    href={`/players/${m.loser.id}`}
                    className="flex-1 text-right font-semibold hover:underline"
                    style={{ color: "var(--muted)" }}
                  >
                    {m.loser.name}
                    {m.winnerScore != null && m.loserScore != null && (
                      <span className="text-sm ml-1 font-normal">({m.loserScore})</span>
                    )}
                  </Link>
                </div>

                {(winnerDelta !== null || loserDelta !== null) && (
                  <div className="flex justify-between mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
                    {winnerDelta !== null && (
                      <span style={{ color: winnerDelta >= 0 ? "var(--green)" : "var(--red)" }}>
                        {winnerDelta >= 0 ? "+" : ""}{winnerDelta.toFixed(0)} pts
                      </span>
                    )}
                    {loserDelta !== null && (
                      <span style={{ color: loserDelta >= 0 ? "var(--green)" : "var(--red)" }}>
                        {loserDelta >= 0 ? "+" : ""}{loserDelta.toFixed(0)} pts
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
