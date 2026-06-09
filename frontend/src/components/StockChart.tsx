"use client";
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { api, KlineData } from "@/lib/api";

interface Props {
  code: string;
  period?: string;
}

export function StockChart({ code, period = "daily" }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<KlineData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    api.stocks.kline(code, selectedPeriod, 120).then(({ data }) => setData(data)).catch(() => {});
  }, [code, selectedPeriod]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);
    const dates = data.map((d) => d.trade_date);
    const ohlc = data.map((d) => [d.open, d.close, d.low, d.high]);
    const volumes = data.map((d) => d.vol);

    chart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      grid: [
        { left: "8%", right: "3%", top: "5%", height: "60%" },
        { left: "8%", right: "3%", top: "72%", height: "20%" },
      ],
      xAxis: [
        { type: "category", data: dates, gridIndex: 0, axisLabel: { show: false } },
        { type: "category", data: dates, gridIndex: 1 },
      ],
      yAxis: [
        { type: "value", gridIndex: 0, scale: true },
        { type: "value", gridIndex: 1, scale: true, splitNumber: 2 },
      ],
      series: [
        {
          type: "candlestick",
          data: ohlc,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: "#ef4444",
            color0: "#22c55e",
            borderColor: "#ef4444",
            borderColor0: "#22c55e",
          },
        },
        {
          type: "bar",
          data: volumes,
          xAxisIndex: 1,
          yAxisIndex: 1,
          itemStyle: {
            color: (params: any) => {
              const idx = params.dataIndex;
              return ohlc[idx][1] >= ohlc[idx][0] ? "#ef4444" : "#22c55e";
            },
          },
        },
      ],
      dataZoom: [{ type: "inside", xAxisIndex: [0, 1], start: 60, end: 100 }],
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [data]);

  return (
    <div>
      <div className="flex gap-2 mb-2">
        {["daily", "weekly", "monthly"].map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={`px-3 py-1 text-xs rounded ${
              selectedPeriod === p
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            {{ daily: "日K", weekly: "周K", monthly: "月K" }[p]}
          </button>
        ))}
      </div>
      <div ref={chartRef} className="w-full h-80" />
    </div>
  );
}
