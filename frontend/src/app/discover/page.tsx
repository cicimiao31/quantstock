"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FavoriteButton } from "@/components/FavoriteButton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Sector {
  code: string;
  name: string;
  stock_count: number;
  change_pct: number;
  leader_name: string;
  leader_change: number;
  leader_price: number;
}

interface SectorStock {
  ts_code: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change_pct: number;
  volume: number;
}

interface LoadedSector {
  sector: Sector;
  stocks: SectorStock[];
}

const BATCH_SIZE = 6;

export default function DiscoverPage() {
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [loadedSectors, setLoadedSectors] = useState<LoadedSector[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Load sector list
  useEffect(() => {
    fetch(`${API_BASE}/api/discover/sectors`)
      .then((r) => r.json())
      .then((data) => setAllSectors(data.sectors || []))
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  // Load next batch of sectors' stocks
  const loadNextBatch = useCallback(async () => {
    if (loadingMore || loadedCount >= allSectors.length) return;
    setLoadingMore(true);

    const batch = allSectors.slice(loadedCount, loadedCount + BATCH_SIZE);
    const results: LoadedSector[] = [];

    await Promise.all(
      batch.map(async (sector) => {
        try {
          const resp = await fetch(
            `${API_BASE}/api/discover/sectors/${sector.code}/stocks?page=1&num=10`
          );
          const data = await resp.json();
          results.push({ sector, stocks: data.stocks || [] });
        } catch {
          results.push({ sector, stocks: [] });
        }
      })
    );

    // Sort results to match original sector order
    results.sort(
      (a, b) =>
        allSectors.indexOf(a.sector) - allSectors.indexOf(b.sector)
    );

    setLoadedSectors((prev) => {
      const existingCodes = new Set(prev.map((s) => s.sector.code));
      const newItems = results.filter((r) => !existingCodes.has(r.sector.code));
      return [...prev, ...newItems];
    });
    setLoadedCount((prev) => prev + batch.length);
    setLoadingMore(false);
  }, [allSectors, loadedCount, loadingMore]);

  // Load first batch when sectors are ready
  useEffect(() => {
    if (allSectors.length > 0 && loadedCount === 0) {
      loadNextBatch();
    }
  }, [allSectors]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && loadedCount < allSectors.length) {
          loadNextBatch();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadNextBatch, loadingMore, loadedCount, allSectors.length]);

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2 dark:text-white">发现</h1>
        <p className="text-sm text-gray-500 mb-6">
          按行业分类展示波动最大的股票（共{allSectors.length}个行业），点击行业查看全部，点击股票进入分析
        </p>

        {initialLoading ? (
          <div className="text-center py-20 text-gray-400">加载行业数据中...</div>
        ) : (
          <div className="space-y-6">
            {/* Sector grid */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">全部行业板块</h2>
              <div className="flex flex-wrap gap-2">
                {allSectors.map((sector) => (
                  <Link
                    key={sector.code}
                    href={`/discover/${sector.code}?name=${encodeURIComponent(sector.name)}`}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:shadow-sm ${
                      sector.change_pct > 0
                        ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                        : sector.change_pct < 0
                        ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {sector.name}
                    <span className="ml-1 opacity-75">
                      {sector.change_pct > 0 ? "+" : ""}{Number(sector.change_pct).toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Sector details with stocks */}
            {loadedSectors.map(({ sector, stocks }) => (
              <div
                key={sector.code}
                className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <Link
                  href={`/discover/${sector.code}?name=${encodeURIComponent(sector.name)}`}
                  className="block px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg dark:text-white">{sector.name}</h2>
                      <span className="text-xs text-gray-400">{sector.stock_count}只 · 查看全部 →</span>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        sector.change_pct > 0
                          ? "text-red-500"
                          : sector.change_pct < 0
                          ? "text-green-500"
                          : "text-gray-500"
                      }`}
                    >
                      {sector.change_pct > 0 ? "+" : ""}
                      {Number(sector.change_pct).toFixed(2)}%
                    </span>
                  </div>
                </Link>

                <div className="divide-y dark:divide-gray-700 overflow-x-auto">
                  <div className="grid grid-cols-[3fr_2fr_2fr_2fr_2fr_2fr_2fr_2fr_auto] gap-2 px-4 py-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/30 min-w-[700px]">
                    <span>股票</span>
                    <span className="text-right">最新价</span>
                    <span className="text-right">涨跌幅</span>
                    <span className="text-right">开盘</span>
                    <span className="text-right">最高</span>
                    <span className="text-right">最低</span>
                    <span className="text-right">成交量</span>
                    <span className="text-right">成交额</span>
                    <span className="text-right">操作</span>
                  </div>
                  {stocks.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">加载中...</div>
                  ) : (
                    stocks.map((stock) => (
                      <div
                        key={stock.ts_code}
                        className="grid grid-cols-[3fr_2fr_2fr_2fr_2fr_2fr_2fr_2fr_auto] gap-2 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors items-center min-w-[700px]"
                      >
                        <Link href={`/analysis?code=${stock.ts_code}`} className="hover:underline">
                          <span className="font-medium text-sm dark:text-white">{stock.name}</span>
                          <span className="ml-1 text-xs text-gray-400 font-mono">
                            {stock.ts_code.split(".")[0]}
                          </span>
                        </Link>
                        <span className="text-right text-sm font-mono dark:text-white">
                          {stock.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-right text-sm font-bold ${
                            stock.change_pct > 0
                              ? "text-red-500"
                              : stock.change_pct < 0
                              ? "text-green-500"
                              : "text-gray-500"
                          }`}
                        >
                          {stock.change_pct > 0 ? "+" : ""}
                          {stock.change_pct.toFixed(2)}%
                        </span>
                        <span className="text-right text-xs font-mono text-gray-600 dark:text-gray-300">
                          {stock.open ? stock.open.toFixed(2) : "-"}
                        </span>
                        <span className="text-right text-xs font-mono text-red-500">
                          {stock.high ? stock.high.toFixed(2) : "-"}
                        </span>
                        <span className="text-right text-xs font-mono text-green-500">
                          {stock.low ? stock.low.toFixed(2) : "-"}
                        </span>
                        <span className="text-right text-xs text-gray-400">
                          {(stock.volume / 10000).toFixed(0)}万
                        </span>
                        <span className="text-right text-xs text-gray-400">
                          {stock.volume > 0 ? `${((stock.price * stock.volume) / 100000000).toFixed(1)}亿` : "-"}
                        </span>
                        <FavoriteButton stockCode={stock.ts_code} stockName={stock.name} size="sm" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="py-4 text-center">
              {loadingMore && (
                <span className="text-gray-400 text-sm">加载更多行业...</span>
              )}
              {!loadingMore && loadedCount >= allSectors.length && allSectors.length > 0 && (
                <span className="text-gray-300 text-xs">已加载全部 {allSectors.length} 个行业</span>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
