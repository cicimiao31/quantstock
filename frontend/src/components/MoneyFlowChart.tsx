"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface FlowData {
  date: string;
  main_net: number;
  small_net: number;
  mid_net: number;
  large_net: number;
  xlarge_net: number;
  main_pct: number;
  close: number;
}

export function MoneyFlowChart({ data }: { data: FlowData[] }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);
    const dates = data.map((d) => d.date);
    const mainNet = data.map((d) => d.main_net);
    const prices = data.map((d) => d.close);
    const cumMain = data.reduce<number[]>((acc, d) => {
      const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(prev + d.main_net);
      return acc;
    }, []);

    chart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter: (params: any) => {
          const date = params[0]?.axisValue || "";
          let html = `<div style="font-size:12px"><b>${date}</b><br/>`;
          for (const p of params) {
            html += `${p.marker} ${p.seriesName}: <b>${p.value.toFixed(0)}</b>${p.seriesName === "股价" ? "" : "万"}<br/>`;
          }
          return html + "</div>";
        },
      },
      legend: {
        data: ["主力净流入", "累计净流入", "股价"],
        top: 0,
        textStyle: { fontSize: 11 },
      },
      grid: { left: "8%", right: "8%", top: "15%", bottom: "10%" },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { fontSize: 10, rotate: 30 },
      },
      yAxis: [
        {
          type: "value",
          name: "万元",
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
        },
        {
          type: "value",
          name: "股价",
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
        },
      ],
      series: [
        {
          name: "主力净流入",
          type: "bar",
          data: mainNet,
          itemStyle: {
            color: (params: any) => (params.value >= 0 ? "#ef4444" : "#22c55e"),
          },
        },
        {
          name: "累计净流入",
          type: "line",
          data: cumMain.map((v) => Math.round(v)),
          smooth: true,
          lineStyle: { width: 2, color: "#f59e0b" },
          itemStyle: { color: "#f59e0b" },
          symbol: "none",
        },
        {
          name: "股价",
          type: "line",
          yAxisIndex: 1,
          data: prices,
          smooth: true,
          lineStyle: { width: 1.5, color: "#6366f1" },
          itemStyle: { color: "#6366f1" },
          symbol: "none",
        },
      ],
      dataZoom: [{ type: "inside", start: 0, end: 100 }],
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} className="w-full h-64 md:h-80" />;
}
