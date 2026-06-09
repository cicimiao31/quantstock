from fastapi import APIRouter, Query
from app.services.data_fetcher import search_stocks, get_realtime_quote, get_kline_data, get_minute_data

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    results = await search_stocks(q)
    return {"results": results}


@router.get("/batch")
async def batch_quotes(codes: str = Query(..., description="Comma-separated stock codes")):
    code_list = [c.strip() for c in codes.split(",") if c.strip()]
    quotes = await get_realtime_quote(code_list)
    return {"quotes": quotes}


@router.get("/{code}/realtime")
async def realtime_quote(code: str):
    quotes = await get_realtime_quote([code])
    if quotes:
        return quotes[0]
    return {"error": "No data available"}


@router.get("/{code}/kline")
async def kline(code: str, period: str = "daily", count: int = 120):
    data = await get_kline_data(code, period, count)
    return {"code": code, "period": period, "data": data}


@router.get("/{code}/minute")
async def minute_data(code: str):
    data = await get_minute_data(code)
    return {"code": code, "data": data}
