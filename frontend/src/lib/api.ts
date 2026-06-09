const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  stocks: {
    search: (q: string) => fetchJSON<{ results: StockInfo[] }>(`/api/stocks/search?q=${encodeURIComponent(q)}`),
    batch: (codes: string[]) => fetchJSON<{ quotes: StockQuote[] }>(`/api/stocks/batch?codes=${codes.join(",")}`),
    realtime: (code: string) => fetchJSON<StockQuote>(`/api/stocks/${code}/realtime`),
    kline: (code: string, period = "daily", count = 120) =>
      fetchJSON<{ data: KlineData[] }>(`/api/stocks/${code}/kline?period=${period}&count=${count}`),
  },
  groups: {
    list: () => fetchJSON<{ groups: StockGroup[] }>("/api/groups"),
    create: (name: string, color?: string) =>
      fetchJSON<StockGroup>("/api/groups", { method: "POST", body: JSON.stringify({ name, color }) }),
    update: (id: number, data: Partial<StockGroup>) =>
      fetchJSON("/api/groups/" + id, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJSON("/api/groups/" + id, { method: "DELETE" }),
    addStock: (groupId: number, stock: { stock_code: string; stock_name: string }) =>
      fetchJSON(`/api/groups/${groupId}/stocks`, { method: "POST", body: JSON.stringify(stock) }),
    removeStock: (groupId: number, code: string) =>
      fetchJSON(`/api/groups/${groupId}/stocks/${code}`, { method: "DELETE" }),
  },
  alerts: {
    list: (limit = 50) => fetchJSON<{ alerts: AlertItem[] }>(`/api/alerts?limit=${limit}`),
    history: (page = 1) => fetchJSON<{ alerts: AlertItem[] }>(`/api/alerts/history?page=${page}`),
    settings: () => fetchJSON<AlertSettings>("/api/alerts/settings"),
    updateSettings: (data: Partial<AlertSettings>) =>
      fetchJSON("/api/alerts/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
  quant: {
    indicators: (code: string) => fetchJSON<{ indicators: any }>(`/api/quant/${code}/indicators`),
    signals: (code: string) => fetchJSON<{ signals: Signal[] }>(`/api/quant/${code}/signals`),
    predict: (code: string, days = 5) => fetchJSON<PredictionResult>(`/api/quant/${code}/predict?days=${days}`),
    backtest: (code: string, strategy = "ma_cross") =>
      fetchJSON<BacktestResult>(`/api/quant/${code}/backtest?strategy=${strategy}`),
  },
  recommend: {
    today: () => fetchJSON<{ recommendations: Recommendation[] }>("/api/recommend/today"),
    signals: () => fetchJSON<{ buy_signals: Recommendation[]; sell_signals: any[] }>("/api/recommend/signals"),
  },
};

export interface StockInfo {
  ts_code: string;
  symbol: string;
  name: string;
  area: string;
  industry: string;
}

export interface StockQuote {
  code: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  pre_close: number;
  volume: number;
  amount: number;
  change: number;
  change_pct: number;
  date: string;
  time: string;
}

export interface KlineData {
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  amount: number;
}

export interface StockGroup {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  stocks: { id: number; stock_code: string; stock_name: string; notes: string }[];
}

export interface AlertItem {
  id: number;
  stock_code: string;
  stock_name: string;
  alert_type: string;
  severity: string;
  message: string;
  price: number | null;
  change_pct: number | null;
  triggered_at: string;
  is_read: boolean;
}

export interface AlertSettings {
  price_change_threshold: number;
  volume_multiplier: number;
  near_limit_threshold: number;
  sound_enabled: boolean;
}

export interface Signal {
  type: "buy" | "sell";
  strategy: string;
  desc: string;
  strength: number;
}

export interface PredictionResult {
  code: string;
  predictions: number[];
  price_ranges: { predicted: number; upper: number; lower: number }[];
  confidence: number;
  trend: string;
  expected_change_pct: number;
  disclaimer: string;
}

export interface BacktestResult {
  total_trades: number;
  win_rate: number;
  avg_return: number;
  total_return: number;
  kelly_position: number;
}

export interface Recommendation {
  code: string;
  signals: Signal[];
  signal_count: number;
  avg_strength: number;
  recommendation: string;
  reason: string;
}
