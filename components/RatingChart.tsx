"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type HistoryPoint = {
  timestamp: Date | string;
  rating: number;
  rd: number;
  matchId: string | null;
};

export default function RatingChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h, i) => ({
    match: i + 1,
    rating: Math.round(h.rating),
    upper: Math.round(h.rating + h.rd),
    lower: Math.round(h.rating - h.rd),
  }));

  const minY = Math.min(...data.map((d) => d.lower)) - 50;
  const maxY = Math.max(...data.map((d) => d.upper)) + 50;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="match"
          tick={{ fontSize: 10, fill: "#8888aa" }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Match #", position: "insideBottom", fill: "#8888aa", fontSize: 10 }}
        />
        <YAxis
          domain={[minY, maxY]}
          tick={{ fontSize: 10, fill: "#8888aa" }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "#22222e",
            border: "1px solid #2e2e3e",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8888aa" }}
          formatter={(value, name) => {
            const labels: Record<string, string> = { rating: "Rating", upper: "Upper bound", lower: "Lower bound" };
            return [value as number, labels[name as string] ?? name];
          }}
          labelFormatter={(v) => `Match ${v}`}
        />
        <ReferenceLine y={1500} stroke="#2e2e3e" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="upper"
          stroke="#2e2e3e"
          strokeWidth={1}
          dot={false}
          strokeDasharray="3 3"
        />
        <Line
          type="monotone"
          dataKey="lower"
          stroke="#2e2e3e"
          strokeWidth={1}
          dot={false}
          strokeDasharray="3 3"
        />
        <Line
          type="monotone"
          dataKey="rating"
          stroke="#818cf8"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#818cf8" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
