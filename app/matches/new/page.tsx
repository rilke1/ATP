"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Player = { id: string; name: string };

const FORMAT_OPTIONS = [
  { value: "single", label: "Single Game" },
  { value: "bo3", label: "Best of 3" },
  { value: "bo5", label: "Best of 5" },
];

export default function NewMatchPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [format, setFormat] = useState("single");
  const [winnerScore, setWinnerScore] = useState("");
  const [loserScore, setLoserScore] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then(setPlayers);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId || !loserId) {
      setError("Select both players");
      return;
    }
    if (winnerId === loserId) {
      setError("Winner and loser must be different");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winnerId,
        loserId,
        format,
        winnerScore: winnerScore ? parseInt(winnerScore) : undefined,
        loserScore: loserScore ? parseInt(loserScore) : undefined,
        notes: notes || undefined,
      }),
    });

    if (res.ok) {
      router.push("/matches");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
    }
  }

  if (players.length < 2) {
    return (
      <div className="mt-8 text-center">
        <p className="text-4xl mb-3">👤</p>
        <p className="font-semibold mb-1">Need at least 2 players</p>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Add players before logging matches
        </p>
        <a
          href="/players/new"
          className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          Add Players
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h1 className="text-xl font-bold mb-6">Log Match</h1>

      <form onSubmit={submit} className="space-y-5">
        {/* Winner selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Winner 🏆</label>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setWinnerId(p.id);
                  if (loserId === p.id) setLoserId("");
                }}
                className="py-3 px-3 rounded-xl font-medium text-sm text-left transition-all"
                style={{
                  background: winnerId === p.id ? "var(--accent)" : "var(--surface)",
                  border: `1px solid ${winnerId === p.id ? "var(--accent)" : "var(--border)"}`,
                  color: winnerId === p.id ? "#fff" : "var(--foreground)",
                  opacity: loserId === p.id ? 0.4 : 1,
                }}
                disabled={loserId === p.id}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loser selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Loser</label>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setLoserId(p.id);
                  if (winnerId === p.id) setWinnerId("");
                }}
                className="py-3 px-3 rounded-xl font-medium text-sm text-left transition-all"
                style={{
                  background: loserId === p.id ? "#3f1212" : "var(--surface)",
                  border: `1px solid ${loserId === p.id ? "var(--red)" : "var(--border)"}`,
                  color: loserId === p.id ? "var(--red)" : "var(--foreground)",
                  opacity: winnerId === p.id ? 0.4 : 1,
                }}
                disabled={winnerId === p.id}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: format === f.value ? "var(--surface2)" : "var(--surface)",
                  border: `1px solid ${format === f.value ? "var(--accent)" : "var(--border)"}`,
                  color: format === f.value ? "var(--accent2)" : "var(--muted)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Score (optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Score <span style={{ color: "var(--muted)" }}>(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="9"
              value={winnerScore}
              onChange={(e) => setWinnerScore(e.target.value)}
              placeholder="Winner"
              className="flex-1 px-3 py-3 rounded-xl text-center text-base outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
            <span className="font-bold" style={{ color: "var(--muted)" }}>–</span>
            <input
              type="number"
              min="0"
              max="9"
              value={loserScore}
              onChange={(e) => setLoserScore(e.target.value)}
              placeholder="Loser"
              className="flex-1 px-3 py-3 rounded-xl text-center text-base outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Notes <span style={{ color: "var(--muted)" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. crazy comeback, epic match..."
            className="w-full px-3 py-3 rounded-xl text-base outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !winnerId || !loserId}
          className="w-full py-4 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Saving..." : "Log Match"}
        </button>
      </form>
    </div>
  );
}
