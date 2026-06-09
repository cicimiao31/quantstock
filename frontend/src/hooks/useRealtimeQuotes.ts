"use client";
import { useEffect, useRef } from "react";
import { useStore } from "@/stores/useStore";
import { api } from "@/lib/api";

function isTradingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const hm = now.getHours() * 100 + now.getMinutes();
  return (hm >= 930 && hm <= 1130) || (hm >= 1300 && hm <= 1500);
}

export function useRealtimeQuotes(intervalMs = 5000) {
  const watchlist = useStore((s) => s.watchlist);
  const updateQuotes = useStore((s) => s.updateQuotes);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const codes = watchlist.map((w) => w.code);
    if (codes.length === 0) return;

    const fetchQuotes = async () => {
      try {
        const { quotes } = await api.stocks.batch(codes);
        updateQuotes(quotes);
      } catch {}
    };

    fetchQuotes();

    timerRef.current = setInterval(() => {
      if (isTradingHours()) {
        fetchQuotes();
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [watchlist, intervalMs, updateQuotes]);
}
