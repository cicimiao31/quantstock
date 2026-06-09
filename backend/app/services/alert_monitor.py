import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional

from app.services.data_fetcher import get_realtime_quote, get_kline_data
from app.services.quant_engine import calculate_macd, calculate_bollinger
from app.core.ws_manager import ws_manager


_previous_prices: dict[str, float] = {}
_volume_history: dict[str, list[float]] = {}


async def check_price_anomaly(code: str, current_price: float, pre_close: float,
                               threshold: float = 2.0) -> Optional[dict]:
    if pre_close <= 0:
        return None

    change_pct = (current_price - pre_close) / pre_close * 100

    prev_price = _previous_prices.get(code)
    _previous_prices[code] = current_price

    if prev_price and prev_price > 0:
        short_change = (current_price - prev_price) / prev_price * 100
        if abs(short_change) >= threshold:
            severity = "critical" if abs(short_change) >= threshold * 2 else "warning"
            direction = "急涨" if short_change > 0 else "急跌"
            return {
                "stock_code": code,
                "alert_type": "price_anomaly",
                "severity": severity,
                "message": f"短期{direction} {short_change:.2f}%",
                "price": current_price,
                "change_pct": change_pct,
            }
    return None


async def check_volume_anomaly(code: str, current_volume: float,
                                multiplier: float = 3.0) -> Optional[dict]:
    if code not in _volume_history:
        _volume_history[code] = []

    history = _volume_history[code]
    history.append(current_volume)

    if len(history) > 20:
        history.pop(0)

    if len(history) >= 5:
        avg_vol = np.mean(history[:-1])
        if avg_vol > 0 and current_volume > avg_vol * multiplier:
            return {
                "stock_code": code,
                "alert_type": "volume_anomaly",
                "severity": "warning",
                "message": f"成交量异动，当前量是均值的{current_volume/avg_vol:.1f}倍",
                "price": None,
                "change_pct": None,
            }
    return None


async def check_ma_breakthrough(code: str, kline_data: list[dict]) -> Optional[dict]:
    if len(kline_data) < 20:
        return None

    df = pd.DataFrame(kline_data)
    close = df['close']
    ma20 = close.rolling(20).mean()

    if close.iloc[-1] > ma20.iloc[-1] and close.iloc[-2] <= ma20.iloc[-2]:
        return {
            "stock_code": code,
            "alert_type": "ma_breakthrough",
            "severity": "info",
            "message": "股价突破MA20均线",
            "price": close.iloc[-1],
            "change_pct": None,
        }
    elif close.iloc[-1] < ma20.iloc[-1] and close.iloc[-2] >= ma20.iloc[-2]:
        return {
            "stock_code": code,
            "alert_type": "ma_breakdown",
            "severity": "warning",
            "message": "股价跌破MA20均线",
            "price": close.iloc[-1],
            "change_pct": None,
        }
    return None


async def check_near_limit(code: str, current_price: float, pre_close: float,
                           threshold: float = 1.0) -> Optional[dict]:
    if pre_close <= 0:
        return None

    limit_up = pre_close * 1.1
    limit_down = pre_close * 0.9
    change_pct = (current_price - pre_close) / pre_close * 100

    dist_to_up = (limit_up - current_price) / current_price * 100
    dist_to_down = (current_price - limit_down) / current_price * 100

    if dist_to_up <= threshold and dist_to_up > 0:
        return {
            "stock_code": code,
            "alert_type": "near_limit_up",
            "severity": "critical",
            "message": f"距涨停仅{dist_to_up:.2f}%",
            "price": current_price,
            "change_pct": change_pct,
        }
    elif dist_to_down <= threshold and dist_to_down > 0:
        return {
            "stock_code": code,
            "alert_type": "near_limit_down",
            "severity": "critical",
            "message": f"距跌停仅{dist_to_down:.2f}%",
            "price": current_price,
            "change_pct": change_pct,
        }
    return None


async def check_bollinger_breakthrough(code: str, kline_data: list[dict]) -> Optional[dict]:
    if len(kline_data) < 20:
        return None

    df = pd.DataFrame(kline_data)
    boll = calculate_bollinger(df['close'])

    if boll["upper"] and df['close'].iloc[-1] > boll["upper"]:
        return {
            "stock_code": code,
            "alert_type": "bollinger_upper",
            "severity": "warning",
            "message": "股价突破布林带上轨，注意回调风险",
            "price": df['close'].iloc[-1],
            "change_pct": None,
        }
    elif boll["lower"] and df['close'].iloc[-1] < boll["lower"]:
        return {
            "stock_code": code,
            "alert_type": "bollinger_lower",
            "severity": "info",
            "message": "股价跌破布林带下轨，可能超卖",
            "price": df['close'].iloc[-1],
            "change_pct": None,
        }
    return None


async def run_alert_check(watched_codes: list[str], settings: dict) -> list[dict]:
    alerts = []

    quotes = await get_realtime_quote(watched_codes)

    for quote in quotes:
        code = quote["code"]
        price = quote["price"]
        pre_close = quote["pre_close"]
        volume = quote["volume"]

        alert = await check_price_anomaly(code, price, pre_close, settings.get("price_change_threshold", 2.0))
        if alert:
            alert["stock_name"] = quote["name"]
            alerts.append(alert)

        alert = await check_volume_anomaly(code, volume, settings.get("volume_multiplier", 3.0))
        if alert:
            alert["stock_name"] = quote["name"]
            alerts.append(alert)

        alert = await check_near_limit(code, price, pre_close, settings.get("near_limit_threshold", 1.0))
        if alert:
            alert["stock_name"] = quote["name"]
            alerts.append(alert)

    if alerts:
        for alert in alerts:
            alert["triggered_at"] = datetime.now().isoformat()
            await ws_manager.broadcast({"type": "alert", "data": alert})

    return alerts
