from fastapi import APIRouter, Query
import httpx

router = APIRouter(prefix="/api/discover", tags=["discover"])

HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn/"}


@router.get("/sectors")
async def get_sectors():
    """Get all industry sectors with summary info."""
    url = "https://vip.stock.finance.sina.com.cn/q/view/newSinaHy.php"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=HEADERS, timeout=10)
            resp.encoding = "gbk"

        text = resp.text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1:
            return {"sectors": []}

        import json
        raw = text[start:end]
        data = json.loads(raw)

        sectors = []
        for key, value in data.items():
            parts = value.split(",")
            if len(parts) >= 5:
                sectors.append({
                    "code": parts[0],
                    "name": parts[1],
                    "stock_count": int(parts[2]) if parts[2].isdigit() else 0,
                    "avg_price": float(parts[3]) if parts[3] else 0,
                    "change_pct": float(parts[4]) if parts[4] else 0,
                    "volume": float(parts[7]) if len(parts) > 7 and parts[7] else 0,
                    "leader_code": parts[8] if len(parts) > 8 else "",
                    "leader_change": float(parts[9]) if len(parts) > 9 and parts[9] else 0,
                    "leader_price": float(parts[10]) if len(parts) > 10 and parts[10] else 0,
                    "leader_name": parts[12] if len(parts) > 12 else "",
                })

        sectors.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
        return {"sectors": sectors}
    except Exception as e:
        return {"sectors": [], "error": str(e)}


@router.get("/sectors/{sector_code}/stocks")
async def get_sector_stocks(sector_code: str, page: int = 1, num: int = 40):
    """Get stocks in a specific sector, sorted by change percent (most volatile first)."""
    url = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
    params = {
        "page": str(page),
        "num": str(num),
        "sort": "changepercent",
        "asc": "0",
        "node": sector_code,
        "symbol": "",
        "_s_r_a": "sort",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=HEADERS, timeout=10)

        stocks = resp.json()
        results = []
        for s in stocks:
            code_raw = s.get("symbol", "")
            if code_raw.startswith("sh"):
                ts_code = f"{code_raw[2:]}.SH"
            else:
                ts_code = f"{code_raw[2:]}.SZ"

            results.append({
                "ts_code": ts_code,
                "symbol": s.get("code", ""),
                "name": s.get("name", ""),
                "price": float(s.get("trade", 0)),
                "open": float(s.get("open", 0)),
                "high": float(s.get("high", 0)),
                "low": float(s.get("low", 0)),
                "change": float(s.get("pricechange", 0)),
                "change_pct": float(s.get("changepercent", 0)),
                "volume": float(s.get("volume", 0)),
                "amount": float(s.get("amount", 0)),
                "turnover": float(s.get("turnoverratio", 0)),
                "pe": float(s.get("per", 0)) if s.get("per") else None,
                "pb": float(s.get("pb", 0)) if s.get("pb") else None,
            })

        return {"stocks": results, "page": page}
    except Exception as e:
        return {"stocks": [], "error": str(e)}


@router.get("/top_movers")
async def get_top_movers():
    """Get top 10 most volatile stocks from each major sector."""
    url = "https://vip.stock.finance.sina.com.cn/q/view/newSinaHy.php"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=HEADERS, timeout=10)
            resp.encoding = "gbk"

        text = resp.text
        start = text.find("{")
        end = text.rfind("}") + 1

        import json
        data = json.loads(text[start:end])

        sectors = []
        for key, value in data.items():
            parts = value.split(",")
            if len(parts) >= 5:
                sectors.append({
                    "code": parts[0],
                    "name": parts[1],
                    "change_pct": float(parts[4]) if parts[4] else 0,
                })
        sectors.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
        top_sectors = sectors

        # Fetch top 10 stocks for each sector
        stock_url = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
        results = []

        async with httpx.AsyncClient() as client:
            for sector in top_sectors:
                params = {
                    "page": "1",
                    "num": "10",
                    "sort": "changepercent",
                    "asc": "0",
                    "node": sector["code"],
                    "symbol": "",
                    "_s_r_a": "sort",
                }
                try:
                    resp = await client.get(stock_url, params=params, headers=HEADERS, timeout=8)
                    stocks = resp.json()
                    stock_list = []
                    for s in stocks:
                        code_raw = s.get("symbol", "")
                        if code_raw.startswith("sh"):
                            ts_code = f"{code_raw[2:]}.SH"
                        else:
                            ts_code = f"{code_raw[2:]}.SZ"
                        stock_list.append({
                            "ts_code": ts_code,
                            "name": s.get("name", ""),
                            "price": float(s.get("trade", 0)),
                            "open": float(s.get("open", 0)),
                            "high": float(s.get("high", 0)),
                            "low": float(s.get("low", 0)),
                            "change_pct": float(s.get("changepercent", 0)),
                            "volume": float(s.get("volume", 0)),
                        })
                    results.append({
                        "sector_code": sector["code"],
                        "sector_name": sector["name"],
                        "sector_change_pct": sector["change_pct"],
                        "stocks": stock_list,
                    })
                except Exception:
                    continue

        return {"sectors": results}
    except Exception as e:
        return {"sectors": [], "error": str(e)}
