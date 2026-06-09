"use client";
import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stock {
  ts_code: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  amount: number;
  turnover: number;
  pe: number | null;
  pb: number | null;
}

export default function SectorDetailPage({ params }: { params: Promise<{ sector: string }> }) {
  const { sector } = use(params);
  const searchParams = useSearchParams();
  const sectorName = searchParams.get("name") || sector;
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadStocks = (p: number) => {
    setLoading(true);
    fetch(`${API_BASE}/api/discover/sectors/${sector}/stocks?page=${p}&num=40`)
      .then((r) => r.json())
      .then((data) => {
        setStocks(data.stocks || []);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStocks(1);
  }, [sector]);

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/discover" className="text-blue-500 hover:text-blue-700 text-sm">
            ← 返回发现
          </Link>
          <h1 className="text-2xl font-bold dark:text-white">{sectorName}</h1>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-[3fr_2fr_2fr_2fr_1.5fr_1.5fr_1.5fr] gap-2 px-4 py-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700 font-medium min-w-[600px]">
              <span>股票</span>
              <span className="text-right">最新价</span>
              <span className="text-right">涨跌幅</span>
              <span className="text-right">成交额</span>
              <span className="text-right">换手</span>
              <span className="text-right">PE</span>
              <span className="text-right">PB</span>
            </div>

            <div className="divide-y dark:divide-gray-700">
              {stocks.map((stock) => (
                <Link
                  key={stock.ts_code}
                  href={`/analysis?code=${stock.ts_code}`}
                  className="grid grid-cols-[3fr_2fr_2fr_2fr_1.5fr_1.5fr_1.5fr] gap-2 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors items-center min-w-[600px]"
                >
                  <div>
                    <div className="font-medium text-sm dark:text-white">{stock.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{stock.ts_code}</div>
                  </div>
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
                  <span className="text-right text-xs text-gray-500">
                    {stock.amount > 100000000
                      ? `${(stock.amount / 100000000).toFixed(1)}亿`
                      : `${(stock.amount / 10000).toFixed(0)}万`}
                  </span>
                  <span className="text-right text-xs text-gray-500">
                    {stock.turnover.toFixed(1)}%
                  </span>
                  <span className="text-right text-xs text-gray-500">
                    {stock.pe ? stock.pe.toFixed(1) : "-"}
                  </span>
                  <span className="text-right text-xs text-gray-500">
                    {stock.pb ? stock.pb.toFixed(1) : "-"}
                  </span>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 py-4 border-t dark:border-gray-700">
              <button
                onClick={() => loadStocks(page - 1)}
                disabled={page <= 1}
                className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 dark:text-white"
              >
                上一页
              </button>
              <span className="px-4 py-1.5 text-sm text-gray-500">第 {page} 页</span>
              <button
                onClick={() => loadStocks(page + 1)}
                disabled={stocks.length < 40}
                className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 dark:text-white"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
