import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Ping Pong Rankings",
  description: "Private table tennis ranking system",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <Nav />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-24 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}
