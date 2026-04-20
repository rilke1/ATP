"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Rankings", icon: "🏆" },
  { href: "/matches", label: "Matches", icon: "🏓" },
  { href: "/players", label: "Players", icon: "👤" },
  { href: "/insights", label: "Insights", icon: "✨" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span className="font-bold text-lg tracking-tight" style={{ color: "var(--foreground)" }}>
          🏓 Ping Rankings
        </span>
        <Link
          href="/matches/new"
          className="text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          + Match
        </Link>
      </header>

      {/* Bottom nav for mobile */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex border-t sm:hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {links.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors"
              style={{ color: active ? "var(--accent2)" : "var(--muted)" }}
            >
              <span className="text-lg leading-tight">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop top nav supplement */}
      <nav className="hidden sm:flex gap-6 px-4 py-2 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {links.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors"
              style={{ color: active ? "var(--accent2)" : "var(--muted)" }}
            >
              {l.icon} {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
