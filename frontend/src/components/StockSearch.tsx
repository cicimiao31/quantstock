"use client";
import { useState, useCallback } from "react";
import { api, StockInfo } from "@/lib/api";
import { useStore } from "@/stores/useStore";

export function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const addToWatchlist = useStore((s) => s.addToWatchlist);
  const watchlist = useStore((s) => s.watchlist);

  const search = useCallback(async (q: string) => {
    if (q.length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { results } = await api.stocks.search(q);
      setResults(results);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
        placeholder="搜索股票代码或名称..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      />
      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          {results.map((stock) => (
            <button
              key={stock.ts_code}
              onClick={() => {
                addToWatchlist(stock.ts_code, stock.name);
                setQuery("");
                setResults([]);
              }}
              disabled={watchlist.length >= 9 || watchlist.some((w) => w.code === stock.ts_code)}
              className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700 flex justify-between items-center disabled:opacity-50"
            >
              <span>
                <span className="font-mono text-sm text-gray-500">{stock.ts_code}</span>
                <span className="ml-2 font-medium dark:text-white">{stock.name}</span>
              </span>
              <span className="text-xs text-gray-400">{stock.industry}</span>
            </button>
          ))}
        </div>
      )}
      {loading && <div className="absolute right-3 top-2.5 text-gray-400 text-sm">搜索中...</div>}
    </div>
  );
}
