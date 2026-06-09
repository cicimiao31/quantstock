import pandas as pd
import numpy as np
from typing import Optional


def calculate_ma(close: pd.Series, periods: list[int] = [5, 10, 20, 60]) -> dict:
    result = {}
    for p in periods:
        result[f"MA{p}"] = close.rolling(window=p).mean().iloc[-1] if len(close) >= p else None
    return result


def calculate_ema(close: pd.Series, periods: list[int] = [12, 26]) -> dict:
    result = {}
    for p in periods:
        result[f"EMA{p}"] = close.ewm(span=p, adjust=False).mean().iloc[-1] if len(close) >= p else None
    return result


def calculate_macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict:
    if len(close) < slow + signal:
        return {"DIF": None, "DEA": None, "MACD": None}
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    dif = ema_fast - ema_slow
    dea = dif.ewm(span=signal, adjust=False).mean()
    macd = 2 * (dif - dea)
    return {
        "DIF": round(dif.iloc[-1], 4),
        "DEA": round(dea.iloc[-1], 4),
        "MACD": round(macd.iloc[-1], 4),
        "DIF_series": dif.tolist(),
        "DEA_series": dea.tolist(),
        "MACD_series": macd.tolist(),
    }


def calculate_rsi(close: pd.Series, period: int = 14) -> Optional[float]:
    if len(close) < period + 1:
        return None
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi.iloc[-1], 2)


def calculate_kdj(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 9) -> dict:
    if len(close) < period:
        return {"K": None, "D": None, "J": None}
    lowest_low = low.rolling(window=period).min()
    highest_high = high.rolling(window=period).max()
    rsv = (close - lowest_low) / (highest_high - lowest_low) * 100
    k = rsv.ewm(com=2, adjust=False).mean()
    d = k.ewm(com=2, adjust=False).mean()
    j = 3 * k - 2 * d
    return {"K": round(k.iloc[-1], 2), "D": round(d.iloc[-1], 2), "J": round(j.iloc[-1], 2)}


def calculate_bollinger(close: pd.Series, period: int = 20, std_dev: int = 2) -> dict:
    if len(close) < period:
        return {"upper": None, "middle": None, "lower": None}
    middle = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    upper = middle + std_dev * std
    lower = middle - std_dev * std
    return {
        "upper": round(upper.iloc[-1], 2),
        "middle": round(middle.iloc[-1], 2),
        "lower": round(lower.iloc[-1], 2),
        "bandwidth": round((upper.iloc[-1] - lower.iloc[-1]) / middle.iloc[-1] * 100, 2),
    }


def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> Optional[float]:
    if len(close) < period + 1:
        return None
    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    return round(atr.iloc[-1], 2)


def calculate_obv(close: pd.Series, volume: pd.Series) -> list[float]:
    obv = [0]
    for i in range(1, len(close)):
        if close.iloc[i] > close.iloc[i - 1]:
            obv.append(obv[-1] + volume.iloc[i])
        elif close.iloc[i] < close.iloc[i - 1]:
            obv.append(obv[-1] - volume.iloc[i])
        else:
            obv.append(obv[-1])
    return obv


def get_all_indicators(df: pd.DataFrame) -> dict:
    close = df['close']
    high = df['high']
    low = df['low']
    volume = df['vol'] if 'vol' in df.columns else df.get('volume', pd.Series())

    return {
        "ma": calculate_ma(close),
        "ema": calculate_ema(close),
        "macd": calculate_macd(close),
        "rsi": calculate_rsi(close),
        "kdj": calculate_kdj(high, low, close),
        "bollinger": calculate_bollinger(close),
        "atr": calculate_atr(high, low, close),
    }


def generate_signals(df: pd.DataFrame) -> list[dict]:
    signals = []
    close = df['close']
    high = df['high']
    low = df['low']

    # MA crossover
    if len(close) >= 20:
        ma5 = close.rolling(5).mean()
        ma20 = close.rolling(20).mean()
        if ma5.iloc[-1] > ma20.iloc[-1] and ma5.iloc[-2] <= ma20.iloc[-2]:
            signals.append({"type": "buy", "strategy": "MA交叉", "desc": "MA5上穿MA20，金叉买入信号", "strength": 0.7})
        elif ma5.iloc[-1] < ma20.iloc[-1] and ma5.iloc[-2] >= ma20.iloc[-2]:
            signals.append({"type": "sell", "strategy": "MA交叉", "desc": "MA5下穿MA20，死叉卖出信号", "strength": 0.7})

    # RSI overbought/oversold
    rsi = calculate_rsi(close)
    if rsi is not None:
        if rsi < 30:
            signals.append({"type": "buy", "strategy": "RSI超卖", "desc": f"RSI={rsi}，超卖区域，可能反弹", "strength": 0.6})
        elif rsi > 70:
            signals.append({"type": "sell", "strategy": "RSI超买", "desc": f"RSI={rsi}，超买区域，注意回调", "strength": 0.6})

    # Bollinger band
    boll = calculate_bollinger(close)
    if boll["lower"] and close.iloc[-1] <= boll["lower"]:
        signals.append({"type": "buy", "strategy": "布林带下轨", "desc": "价格触及布林带下轨，均值回归买入", "strength": 0.5})
    elif boll["upper"] and close.iloc[-1] >= boll["upper"]:
        signals.append({"type": "sell", "strategy": "布林带上轨", "desc": "价格触及布林带上轨，注意回落", "strength": 0.5})

    # MACD golden/death cross
    macd = calculate_macd(close)
    if macd["DIF"] is not None and len(close) > 30:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        dif = ema12 - ema26
        dea = dif.ewm(span=9, adjust=False).mean()
        if dif.iloc[-1] > dea.iloc[-1] and dif.iloc[-2] <= dea.iloc[-2]:
            signals.append({"type": "buy", "strategy": "MACD金叉", "desc": "MACD金叉，趋势转多", "strength": 0.75})
        elif dif.iloc[-1] < dea.iloc[-1] and dif.iloc[-2] >= dea.iloc[-2]:
            signals.append({"type": "sell", "strategy": "MACD死叉", "desc": "MACD死叉，趋势转空", "strength": 0.75})

    # KDJ
    kdj = calculate_kdj(high, low, close)
    if kdj["J"] is not None:
        if kdj["J"] < 0:
            signals.append({"type": "buy", "strategy": "KDJ超卖", "desc": f"J值={kdj['J']}，极度超卖", "strength": 0.55})
        elif kdj["J"] > 100:
            signals.append({"type": "sell", "strategy": "KDJ超买", "desc": f"J值={kdj['J']}，极度超买", "strength": 0.55})

    return signals


def multi_factor_score(df: pd.DataFrame, pe: float = None, pb: float = None,
                       roe: float = None, revenue_growth: float = None) -> dict:
    close = df['close']
    scores = {}

    # Momentum factor (20-day return)
    if len(close) >= 20:
        momentum = (close.iloc[-1] - close.iloc[-20]) / close.iloc[-20] * 100
        scores["momentum"] = min(max(momentum / 10 + 5, 0), 10)
    else:
        scores["momentum"] = 5

    # Volatility factor (lower is better for value)
    if len(close) >= 20:
        volatility = close.pct_change().tail(20).std() * 100
        scores["stability"] = max(10 - volatility * 2, 0)
    else:
        scores["stability"] = 5

    # Value factors
    if pe and pe > 0:
        scores["value_pe"] = max(10 - pe / 10, 0)
    if pb and pb > 0:
        scores["value_pb"] = max(10 - pb / 2, 0)
    if roe:
        scores["quality"] = min(roe / 3, 10)
    if revenue_growth:
        scores["growth"] = min(max(revenue_growth / 5, 0), 10)

    total = sum(scores.values()) / max(len(scores), 1)
    return {"factors": scores, "total_score": round(total, 2)}
