"use client";
import { useEffect, useState } from "react";
import { api, KlineData } from "@/lib/api";

export function MiniChart({ code }: { code: string }) {
  const [data, setData] = useState<KlineData[]>([]);

  useEffect(() => {
    api.stocks.kline(code, "daily", 30).then(({ data }) => setData(data)).catch(() => {});
  }, [code]);

  if (data.length === 0) return <div className="h-12" />;

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const height = 48;
  const width = 160;

  const points = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * width;
      const y = height - ((c - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const isUp = closes[closes.length - 1] >= closes[0];

  return (
    <svg width={width} height={height} className="w-full">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "#ef4444" : "#22c55e"}
        strokeWidth="1.5"
      />
    </svg>
  );
}
