"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StockSearch } from "@/components/StockSearch";
import { StockCard } from "@/components/StockCard";
import { AlertBoard } from "@/components/AlertBoard";
import { useStore } from "@/stores/useStore";
import { useRealtimeQuotes } from "@/hooks/useRealtimeQuotes";

export default function Home() {
  const watchlist = useStore((s) => s.watchlist);
  const [hydrated, setHydrated] = useState(false);
  useRealtimeQuotes(5000);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1">
          <div className="text-center py-20 text-gray-400">加载中...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1">
        <div className="mb-6">
          <StockSearch />
          <p className="text-xs text-gray-400 mt-1">
            最多同时观测9只股票 ({watchlist.length}/9)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {watchlist.map((item) => (
            <StockCard key={item.code} code={item.code} name={item.name} />
          ))}
          {watchlist.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400">
              <p className="text-lg">搜索并添加股票开始观测</p>
              <p className="text-sm mt-2">支持股票代码、名称搜索</p>
            </div>
          )}
        </div>

        <AlertBoard />

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>免责声明：本平台所有数据和分析仅供参考，不构成任何投资建议。股市有风险，入市需谨慎。</p>
        </div>
      </main>
    </>
  );
}
