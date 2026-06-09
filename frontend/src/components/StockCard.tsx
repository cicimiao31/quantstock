"use client";
import { useStore } from "@/stores/useStore";
import { StockQuote } from "@/lib/api";
import { MiniChart } from "./MiniChart";
import { FavoriteButton } from "./FavoriteButton";

interface Props {
  code: string;
  name: string;
}

export function StockCard({ code, name }: Props) {
  const quote = useStore((s) => s.quotes[code]);
  const removeFromWatchlist = useStore((s) => s.removeFromWatchlist);

  const isUp = quote && quote.change_pct > 0;
  const isDown = quote && quote.change_pct < 0;

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <button
        onClick={() => removeFromWatchlist(code)}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm"
      >
        ✕
      </button>

      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg dark:text-white">{name}</h3>
          <p className="text-xs text-gray-500 font-mono">{code}</p>
        </div>
      </div>

      {quote ? (
        <>
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className={`text-2xl font-bold ${
                isUp ? "text-red-600" : isDown ? "text-green-600" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {quote.price.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-3 text-sm mb-3">
            <span className={isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-500"}>
              {isUp ? "+" : ""}
              {quote.change.toFixed(2)}
            </span>
            <span className={isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-500"}>
              {isUp ? "+" : ""}
              {quote.change_pct.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-2">
            <span>开: {quote.open.toFixed(2)}</span>
            <span>高: {quote.high.toFixed(2)}</span>
            <span>低: {quote.low.toFixed(2)}</span>
            <span>量: {(quote.volume / 10000).toFixed(0)}万</span>
          </div>
          <MiniChart code={code} />
        </>
      ) : (
        <div className="text-gray-400 text-sm py-4 text-center">加载中...</div>
      )}

      <div className="mt-2 flex justify-between items-center">
        <a
          href={`/analysis?code=${code}`}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          量化分析 →
        </a>
        <FavoriteButton stockCode={code} stockName={name} size="sm" />
      </div>
    </div>
  );
}
