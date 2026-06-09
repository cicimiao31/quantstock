from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import get_session, Favorite
from app.services.data_fetcher import get_kline_data
from app.services.recommender import get_today_recommendations, get_sell_alerts

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.get("/today")
async def today_recommendations(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Favorite.stock_code).distinct())
    codes = [row[0] for row in result.fetchall()]

    if not codes:
        return {"recommendations": [], "message": "请先添加收藏股票"}

    kline_cache = {}
    for code in codes:
        kline = await get_kline_data(code, "daily", 60)
        if kline:
            kline_cache[code] = kline

    recommendations = await get_today_recommendations(codes, kline_cache)
    return {"recommendations": recommendations}


@router.get("/signals")
async def all_signals(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Favorite.stock_code).distinct())
    codes = [row[0] for row in result.fetchall()]

    if not codes:
        return {"buy_signals": [], "sell_signals": []}

    kline_cache = {}
    for code in codes:
        kline = await get_kline_data(code, "daily", 60)
        if kline:
            kline_cache[code] = kline

    buy_recs = await get_today_recommendations(codes, kline_cache)
    sell_alerts = await get_sell_alerts(codes, kline_cache)

    return {"buy_signals": buy_recs, "sell_signals": sell_alerts}


@router.get("/sectors")
async def sector_heatmap():
    # Placeholder - would use Tushare's sector data
    return {"sectors": [], "message": "板块数据需要Tushare Pro接口"}


@router.get("/moneyflow")
async def money_flow():
    # Placeholder - would use Tushare's money flow data
    return {"flows": [], "message": "资金流向数据需要Tushare Pro接口"}
