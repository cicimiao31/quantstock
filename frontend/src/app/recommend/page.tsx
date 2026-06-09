"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { api, Recommendation } from "@/lib/api";

export default function RecommendPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sellSignals, setSellSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { buy_signals, sell_signals } = await api.recommend.signals();
        setRecommendations(buy_signals);
        setSellSignals(sell_signals);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">智能推荐</h1>

        {loading ? (
          <p className="text-gray-400 text-center py-10">加载推荐数据中...</p>
        ) : (
          <div className="space-y-6">
            {/* 买入推荐 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
              <h2 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                买入信号
              </h2>

              {recommendations.length === 0 ? (
                <p className="text-gray-400 text-center py-6">暂无买入推荐（请先添加收藏股票）</p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.code}
                      className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-sm text-gray-500">{rec.code}</span>
                          <span
                            className={`ml-2 text-xs px-2 py-0.5 rounded font-bold ${
                              rec.recommendation === "strong_buy"
                                ? "bg-red-500 text-white"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {rec.recommendation === "strong_buy" ? "强烈推荐" : "建议关注"}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">{rec.signal_count}个信号</div>
                          <div className="text-sm font-bold dark:text-white">
                            强度 {(rec.avg_strength * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{rec.reason}</p>
                      <a
                        href={`/analysis?code=${rec.code}`}
                        className="text-xs text-blue-500 hover:text-blue-700 mt-1 inline-block"
                      >
                        详细分析 →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 卖出提醒 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
              <h2 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                卖出提醒
              </h2>

              {sellSignals.length === 0 ? (
                <p className="text-gray-400 text-center py-6">暂无卖出信号</p>
              ) : (
                <div className="space-y-3">
                  {sellSignals.map((sell: any) => (
                    <div
                      key={sell.code}
                      className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm">{sell.code}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            sell.urgency === "high"
                              ? "bg-red-100 text-red-600"
                              : "bg-yellow-100 text-yellow-600"
                          }`}
                        >
                          {sell.urgency === "high" ? "紧急" : "注意"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{sell.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center text-xs text-orange-500 py-4">
              以上推荐基于量化策略模型生成，仅供参考，不构成投资建议。请结合自身判断谨慎决策。
            </div>
          </div>
        )}
      </main>
    </>
  );
}
