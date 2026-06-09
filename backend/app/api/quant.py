from fastapi import APIRouter, Query
import pandas as pd

from app.services.data_fetcher import get_kline_data
from app.services.quant_engine import get_all_indicators, generate_signals, multi_factor_score
from app.services.predictor import predict_trend_ensemble
from app.services.recommender import backtest_strategy

router = APIRouter(prefix="/api/quant", tags=["quant"])


@router.get("/{code}/indicators")
async def get_indicators(code: str):
    kline = await get_kline_data(code, "daily", 120)
    if not kline:
        return {"error": "No data available"}
    df = pd.DataFrame(kline)
    indicators = get_all_indicators(df)
    return {"code": code, "indicators": indicators}


@router.get("/{code}/signals")
async def get_signals(code: str):
    kline = await get_kline_data(code, "daily", 120)
    if not kline:
        return {"error": "No data available"}
    df = pd.DataFrame(kline)
    signals = generate_signals(df)
    return {"code": code, "signals": signals}


@router.get("/{code}/predict")
async def predict(code: str, days: int = Query(default=5, ge=1, le=30)):
    kline = await get_kline_data(code, "daily", 200)
    if not kline:
        return {"error": "No data available"}
    df = pd.DataFrame(kline)
    prediction = predict_trend_ensemble(df, days)
    return {"code": code, "days": days, **prediction}


@router.get("/{code}/backtest")
async def backtest(code: str, strategy: str = "ma_cross"):
    kline = await get_kline_data(code, "daily", 500)
    if not kline:
        return {"error": "No data available"}
    df = pd.DataFrame(kline)
    result = backtest_strategy(df, strategy)
    return {"code": code, "strategy": strategy, **result}


@router.get("/{code}/score")
async def factor_score(code: str, pe: float = None, pb: float = None,
                       roe: float = None, revenue_growth: float = None):
    kline = await get_kline_data(code, "daily", 120)
    if not kline:
        return {"error": "No data available"}
    df = pd.DataFrame(kline)
    score = multi_factor_score(df, pe, pb, roe, revenue_growth)
    return {"code": code, **score}
