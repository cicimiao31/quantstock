"use client";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import { api, AlertItem } from "@/lib/api";

const severityColors: Record<string, string> = {
  critical: "border-l-red-500 bg-red-50 dark:bg-red-950",
  warning: "border-l-orange-500 bg-orange-50 dark:bg-orange-950",
  info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950",
};

const severityLabels: Record<string, string> = {
  critical: "紧急",
  warning: "重要",
  info: "提示",
};

export function AlertBoard() {
  const { alerts: wsAlerts } = useWebSocket();
  const [historicalAlerts, setHistoricalAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    api.alerts.list(20).then(({ alerts }) => setHistoricalAlerts(alerts)).catch(() => {});
  }, []);

  const allAlerts = [...wsAlerts, ...historicalAlerts].slice(0, 50);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700">
      <h2 className="text-lg font-bold mb-3 dark:text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        预警公告板
      </h2>

      {allAlerts.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">暂无预警信息</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allAlerts.map((alert, i) => (
            <div
              key={alert.id || `ws-${i}`}
              className={`border-l-4 rounded-r-lg p-3 ${severityColors[alert.severity] || severityColors.info}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 dark:text-gray-200">
                    {severityLabels[alert.severity] || "提示"}
                  </span>
                  <span className="ml-2 font-medium text-sm dark:text-white">
                    {alert.stock_name} ({alert.stock_code})
                  </span>
                </div>
                {alert.price && (
                  <span className="text-xs text-gray-500">{alert.price.toFixed(2)}</span>
                )}
              </div>
              <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{alert.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {alert.triggered_at ? new Date(alert.triggered_at).toLocaleString("zh-CN") : "刚刚"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
