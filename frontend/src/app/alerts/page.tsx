"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { api, AlertItem, AlertSettings } from "@/lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.alerts.list(100).then(({ alerts }) => setAlerts(alerts)).catch(() => {});
    api.alerts.settings().then(setSettings).catch(() => {});
  }, []);

  const updateSetting = async (key: keyof AlertSettings, value: number | boolean) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await api.alerts.updateSettings({ [key]: value });
  };

  const severityColors: Record<string, string> = {
    critical: "text-red-600 bg-red-50",
    warning: "text-orange-600 bg-orange-50",
    info: "text-blue-600 bg-blue-50",
  };

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold dark:text-white">预警中心</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-white"
          >
            预警设置
          </button>
        </div>

        {showSettings && settings && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6 border dark:border-gray-700">
            <h3 className="font-bold mb-3 dark:text-white">预警阈值设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">价格异动阈值 (%)</label>
                <input
                  type="number"
                  value={settings.price_change_threshold}
                  onChange={(e) => updateSetting("price_change_threshold", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  step="0.5"
                  min="0.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">成交量倍数</label>
                <input
                  type="number"
                  value={settings.volume_multiplier}
                  onChange={(e) => updateSetting("volume_multiplier", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  step="0.5"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">涨跌停距离 (%)</label>
                <input
                  type="number"
                  value={settings.near_limit_threshold}
                  onChange={(e) => updateSetting("near_limit_threshold", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  step="0.5"
                  min="0.5"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700">
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-center py-12">暂无预警记录</p>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 flex items-start gap-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${severityColors[alert.severity] || severityColors.info}`}
                  >
                    {alert.severity === "critical" ? "紧急" : alert.severity === "warning" ? "重要" : "提示"}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium dark:text-white">
                        {alert.stock_name} <span className="text-gray-400 text-xs">{alert.stock_code}</span>
                      </span>
                      {alert.price && <span className="text-sm text-gray-500">{alert.price.toFixed(2)}</span>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {alert.triggered_at ? new Date(alert.triggered_at).toLocaleString("zh-CN") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
