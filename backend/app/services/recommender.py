import pandas as pd
import numpy as np
from typing import Optional

from app.services.quant_engine import generate_signals, multi_factor_score, calculate_ma


async def get_today_recommendations(stock_codes: list[str], kline_cache: dict) -> list[dict]:
    """Generate today's stock recommendations based on multiple strategies."""
    recommendations = []

    for code in stock_codes:
        kline = kline_cache.get(code)
        if not kline or len(kline) < 30:
            continue

        df = pd.DataFrame(kline)
        signals = generate_signals(df)

        buy_signals = [s for s in signals if s["type"] == "buy"]
        if buy_signals:
            avg_strength = sum(s["strength"] for s in buy_signals) / len(buy_signals)
            recommendations.append({
                "code": code,
                "signals": buy_signals,
                "signal_count": len(buy_signals),
                "avg_strength": round(avg_strength, 2),
                "recommendation": "strong_buy" if len(buy_signals) >= 3 else "buy",
                "reason": "；".join(s["desc"] for s in buy_signals[:3]),
            })

    recommendations.sort(key=lambda x: (x["signal_count"], x["avg_strength"]), reverse=True)
    return recommendations[:10]


async def get_sell_alerts(stock_codes: list[str], kline_cache: dict) -> list[dict]:
    """Check for sell signals on watched stocks."""
    sell_alerts = []

    for code in stock_codes:
        kline = kline_cache.get(code)
        if not kline or len(kline) < 30:
            continue

        df = pd.DataFrame(kline)
        signals = generate_signals(df)

        sell_signals = [s for s in signals if s["type"] == "sell"]
        if sell_signals:
            sell_alerts.append({
                "code": code,
                "signals": sell_signals,
                "urgency": "high" if any(s["strength"] >= 0.7 for s in sell_signals) else "medium",
                "reason": "；".join(s["desc"] for s in sell_signals[:3]),
            })

    return sell_alerts


def calculate_kelly_position(win_rate: float, win_loss_ratio: float) -> float:
    """Kelly Criterion for position sizing.
    f* = (bp - q) / b
    where b = win/loss ratio, p = win probability, q = 1-p
    """
    if win_loss_ratio <= 0 or win_rate <= 0 or win_rate >= 1:
        return 0
    b = win_loss_ratio
    p = win_rate
    q = 1 - p
    kelly = (b * p - q) / b
    return max(0, min(kelly * 0.5, 0.25))  # half-Kelly, capped at 25%


def calculate_var(returns: pd.Series, confidence: float = 0.95) -> float:
    """Value at Risk calculation."""
    if returns.empty:
        return 0
    return float(np.percentile(returns, (1 - confidence) * 100))


def calculate_max_drawdown(prices: pd.Series) -> dict:
    """Maximum drawdown calculation."""
    if prices.empty:
        return {"max_drawdown": 0, "peak_date": None, "trough_date": None}
    cummax = prices.cummax()
    drawdown = (prices - cummax) / cummax
    max_dd = drawdown.min()
    trough_idx = drawdown.idxmin()
    peak_idx = prices[:trough_idx].idxmax() if trough_idx else None
    return {
        "max_drawdown": round(float(max_dd) * 100, 2),
        "peak_idx": int(peak_idx) if peak_idx else None,
        "trough_idx": int(trough_idx) if trough_idx else None,
    }


def backtest_strategy(df: pd.DataFrame, strategy: str = "ma_cross") -> dict:
    """Simple backtesting for strategies."""
    close = df['close']
    trades = []
    position = 0

    if strategy == "ma_cross":
        ma5 = close.rolling(5).mean()
        ma20 = close.rolling(20).mean()
        for i in range(20, len(close)):
            if ma5.iloc[i] > ma20.iloc[i] and ma5.iloc[i-1] <= ma20.iloc[i-1] and position == 0:
                position = close.iloc[i]
                trades.append({"type": "buy", "price": position, "idx": i})
            elif ma5.iloc[i] < ma20.iloc[i] and ma5.iloc[i-1] >= ma20.iloc[i-1] and position > 0:
                ret = (close.iloc[i] - position) / position
                trades.append({"type": "sell", "price": float(close.iloc[i]), "idx": i, "return": float(ret)})
                position = 0

    elif strategy == "rsi":
        delta = close.diff()
        for i in range(14, len(close)):
            window = close.iloc[i-14:i+1]
            d = window.diff()
            gain = d.where(d > 0, 0).mean()
            loss = (-d.where(d < 0, 0)).mean()
            if loss == 0:
                continue
            rsi = 100 - (100 / (1 + gain / loss))
            if rsi < 30 and position == 0:
                position = close.iloc[i]
                trades.append({"type": "buy", "price": position, "idx": i})
            elif rsi > 70 and position > 0:
                ret = (close.iloc[i] - position) / position
                trades.append({"type": "sell", "price": float(close.iloc[i]), "idx": i, "return": float(ret)})
                position = 0

    completed_trades = [t for t in trades if t["type"] == "sell"]
    if not completed_trades:
        return {"total_trades": 0, "win_rate": 0, "avg_return": 0, "total_return": 0}

    returns = [t["return"] for t in completed_trades]
    wins = [r for r in returns if r > 0]

    return {
        "total_trades": len(completed_trades),
        "win_rate": round(len(wins) / len(completed_trades) * 100, 1),
        "avg_return": round(np.mean(returns) * 100, 2),
        "total_return": round((np.prod([1 + r for r in returns]) - 1) * 100, 2),
        "max_single_win": round(max(returns) * 100, 2) if returns else 0,
        "max_single_loss": round(min(returns) * 100, 2) if returns else 0,
        "kelly_position": round(calculate_kelly_position(
            len(wins) / len(completed_trades),
            abs(np.mean(wins)) / abs(np.mean([r for r in returns if r < 0])) if any(r < 0 for r in returns) else 1
        ) * 100, 1),
    }
