"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPlayerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      router.push("/players");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <h1 className="text-xl font-bold mb-6">Add Player</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Player Name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Marko"
            className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-2"
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
          disabled={loading || !name.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Adding..." : "Add Player"}
        </button>
      </form>
    </div>
  );
}
