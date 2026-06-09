"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StockChart } from "@/components/StockChart";
import { StockSearch } from "@/components/StockSearch";
import { FavoriteButton } from "@/components/FavoriteButton";
import { api, Signal, PredictionResult, BacktestResult } from "@/lib/api";

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-gray-400">加载中...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [indicators, setIndicators] = useState<any>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState("");

  const analyze = async (targetCode: string) => {
    if (!targetCode) return;
    setCode(targetCode);
    setLoading(true);
    try {
      const [ind, sig, pred, bt, det] = await Promise.all([
        api.quant.indicators(targetCode),
        api.quant.signals(targetCode),
        api.quant.predict(targetCode, 5),
        api.quant.backtest(targetCode, "ma_cross"),
        fetch(`${API_BASE}/api/stocks/${targetCode}/detail`).then(r => r.json()),
      ]);
      setIndicators(ind.indicators || null);
      setSignals(sig.signals || []);
      setPrediction(pred);
      setBacktest(bt);
      setDetail(det);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (code) analyze(code);
  }, []);

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">量化分析</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze(searchCode)}
            placeholder="输入股票代码，如 000001.SZ"
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <button
            onClick={() => analyze(searchCode)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            分析
          </button>
        </div>

        {loading && <p className="text-center text-gray-400 py-10">分析中...</p>}

        {code && !loading && (
          <div className="space-y-6">
            {/* K线图 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold dark:text-white">K线图 - {code}</h2>
                <FavoriteButton stockCode={code} stockName={detail?.quote?.name || code} />
              </div>
              <StockChart code={code} />
            </div>

            {/* 盘口 + 基本面 */}
            {detail && (detail.quote || detail.fundamentals) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 盘口五档 */}
                {detail.asks && detail.bids && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
                    <h2 className="font-bold mb-3 dark:text-white">行情盘口</h2>
                    <div className="space-y-1 text-sm">
                      {[...detail.asks].reverse().map((ask: any, i: number) => (
                        <div key={`ask-${i}`} className="flex justify-between">
                          <span className="text-gray-500">卖{5 - i}</span>
                          <span className="text-green-600 font-mono">{ask.price.toFixed(2)}</span>
                          <span className="text-gray-400">{ask.vol}</span>
                        </div>
                      ))}
                      <div className="border-t dark:border-gray-600 my-2" />
                      {detail.bids.map((bid: any, i: number) => (
                        <div key={`bid-${i}`} className="flex justify-between">
                          <span className="text-gray-500">买{i + 1}</span>
                          <span className="text-red-600 font-mono">{bid.price.toFixed(2)}</span>
                          <span className="text-gray-400">{bid.vol}</span>
                        </div>
                      ))}
                    </div>
                    {detail.quote && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t dark:border-gray-600 pt-3">
                        <div><span className="text-gray-500">最新: </span><span className="dark:text-white font-bold">{detail.quote.price}</span></div>
                        <div><span className="text-gray-500">昨收: </span><span className="dark:text-white">{detail.quote.pre_close}</span></div>
                        <div><span className="text-gray-500">今开: </span><span className="dark:text-white">{detail.quote.open}</span></div>
                        <div><span className="text-gray-500">涨幅: </span><span className={detail.quote.change_pct > 0 ? "text-red-500" : "text-green-500"}>{detail.quote.change_pct}%</span></div>
                        <div><span className="text-gray-500">最高: </span><span className="text-red-500">{detail.quote.high}</span></div>
                        <div><span className="text-gray-500">最低: </span><span className="text-green-500">{detail.quote.low}</span></div>
                        {detail.fundamentals && (
                          <>
                            <div><span className="text-gray-500">涨停: </span><span className="text-red-500">{detail.fundamentals.limit_up}</span></div>
                            <div><span className="text-gray-500">跌停: </span><span className="text-green-500">{detail.fundamentals.limit_down}</span></div>
                            <div><span className="text-gray-500">外盘: </span><span className="text-red-400">{(detail.fundamentals.outer_vol / 10000).toFixed(0)}万</span></div>
                            <div><span className="text-gray-500">内盘: </span><span className="text-green-400">{(detail.fundamentals.inner_vol / 10000).toFixed(0)}万</span></div>
                            <div><span className="text-gray-500">换手: </span><span className="dark:text-white">{detail.fundamentals.turnover_rate}%</span></div>
                            <div><span className="text-gray-500">量比: </span><span className="dark:text-white">{detail.fundamentals.volume_ratio}</span></div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 公司基本面 */}
                {detail.fundamentals && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
                    <h2 className="font-bold mb-3 dark:text-white">公司核心数据</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">PE(动)</span><span className="dark:text-white font-mono">{detail.fundamentals.pe || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">PB</span><span className="dark:text-white font-mono">{detail.fundamentals.pb || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">总市值</span><span className="dark:text-white font-mono">{detail.fundamentals.total_market_cap}亿</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">流通市值</span><span className="dark:text-white font-mono">{detail.fundamentals.float_market_cap}亿</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">总股本</span><span className="dark:text-white font-mono">{detail.fundamentals.total_shares}亿</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">流通股</span><span className="dark:text-white font-mono">{detail.fundamentals.float_shares}亿</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">EPS</span><span className="dark:text-white font-mono">{detail.fundamentals.eps || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">ROE</span><span className="dark:text-white font-mono">{detail.fundamentals.roe ? `${detail.fundamentals.roe}%` : "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">毛利率</span><span className="dark:text-white font-mono">{detail.fundamentals.gross_margin ? `${detail.fundamentals.gross_margin}%` : "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">净利率</span><span className="dark:text-white font-mono">{detail.fundamentals.net_margin ? `${detail.fundamentals.net_margin}%` : "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">负债率</span><span className="dark:text-white font-mono">{detail.fundamentals.debt_ratio ? `${detail.fundamentals.debt_ratio}%` : "-"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">营收增速</span><span className="dark:text-white font-mono">{detail.fundamentals.revenue_growth ? `${detail.fundamentals.revenue_growth}%` : "-"}</span></div>
                    </div>
                    {detail.company && (
                      <div className="mt-4 border-t dark:border-gray-600 pt-3 text-xs text-gray-500 space-y-1">
                        <div>全称: {detail.company.name}</div>
                        <div>行业: {detail.company.industry}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 技术指标 */}
            {indicators && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
                <h2 className="font-bold mb-3 dark:text-white">技术指标</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {indicators.ma && Object.entries(indicators.ma).map(([key, val]: [string, any]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-gray-500">{key}: </span>
                      <span className="font-mono dark:text-white">{val ? Number(val).toFixed(2) : "-"}</span>
                    </div>
                  ))}
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <span className="text-gray-500">RSI: </span>
                    <span className="font-mono dark:text-white">{indicators.rsi || "-"}</span>
                  </div>
                  {indicators.kdj && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-gray-500">KDJ: </span>
                      <span className="font-mono dark:text-white">
                        {indicators.kdj.K}/{indicators.kdj.D}/{indicators.kdj.J}
                      </span>
                    </div>
                  )}
                  {indicators.macd && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-gray-500">MACD: </span>
                      <span className="font-mono dark:text-white">{indicators.macd.MACD}</span>
                    </div>
                  )}
                  {indicators.bollinger && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-gray-500">BOLL: </span>
                      <span className="font-mono dark:text-white">
                        {indicators.bollinger.upper}/{indicators.bollinger.middle}/{indicators.bollinger.lower}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 策略信号 */}
            {signals.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
                <h2 className="font-bold mb-3 dark:text-white">策略信号</h2>
                <div className="space-y-2">
                  {signals.map((sig, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg flex justify-between items-center ${
                        sig.type === "buy"
                          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      }`}
                    >
                      <div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            sig.type === "buy" ? "bg-red-500 text-white" : "bg-green-500 text-white"
                          }`}
                        >
                          {sig.type === "buy" ? "买入" : "卖出"}
                        </span>
                        <span className="ml-2 font-medium text-sm dark:text-white">{sig.strategy}</span>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{sig.desc}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">强度</div>
                        <div className="font-bold dark:text-white">{(sig.strength * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 预测 */}
            {prediction && prediction.predictions && prediction.predictions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
                <h2 className="font-bold mb-3 dark:text-white">走势预测（5日）</h2>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {prediction.price_ranges?.map((range, i) => (
                    <div key={i} className="text-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="text-xs text-gray-400">Day {i + 1}</div>
                      <div className="font-bold dark:text-white">{range.predicted}</div>
                      <div className="text-xs text-gray-400">
                        {range.lower}-{range.upper}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">
                    趋势: <span className={prediction.trend === "up" ? "text-red-500" : "text-green-500"}>
                      {prediction.trend === "up" ? "看涨" : prediction.trend === "down" ? "看跌" : "震荡"}
                    </span>
                  </span>
                  <span className="text-gray-500">
                    预期变动: <span className="dark:text-white">{prediction.expected_change_pct}%</span>
                  </span>
                  <span className="text-gray-500">
                    置信度: <span className="dark:text-white">{(prediction.confidence * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <p className="text-xs text-orange-500 mt-3">{prediction.disclaimer}</p>
              </div>
            )}

            {/* 回测 */}
            {backtest && backtest.total_trades > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border dark:border-gray-700">
                <h2 className="font-bold mb-3 dark:text-white">策略回测（均线交叉）</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-center">
                    <div className="text-xs text-gray-400">总交易次数</div>
                    <div className="text-xl font-bold dark:text-white">{backtest.total_trades}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-center">
                    <div className="text-xs text-gray-400">胜率</div>
                    <div className="text-xl font-bold dark:text-white">{backtest.win_rate}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-center">
                    <div className="text-xs text-gray-400">总收益</div>
                    <div className={`text-xl font-bold ${backtest.total_return > 0 ? "text-red-500" : "text-green-500"}`}>
                      {backtest.total_return}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-center">
                    <div className="text-xs text-gray-400">建议仓位(Kelly)</div>
                    <div className="text-xl font-bold dark:text-white">{backtest.kelly_position}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
