from datetime import datetime, timedelta
import httpx

async def search_stocks(keyword: str) -> list[dict]:
    """Search stocks using East Money suggest API (free, no auth)."""
    url = "https://searchapi.eastmoney.com/api/suggest/get"
    params = {
        "input": keyword,
        "type": "14",
        "token": "D43BF722C8E33BDC906FB84D85E326E8",
        "count": "20",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10)
            data = resp.json()

        results = []
        items = data.get("QuotationCodeTable", {}).get("Data", [])
        for item in items:
            classify = item.get("Classify", "")
            if classify != "AStock":
                continue
            code = item.get("Code", "")
            name = item.get("Name", "")
            jys = item.get("JYS", "")
            security_type_name = item.get("SecurityTypeName", "")

            if jys == "2" or "沪" in security_type_name:
                ts_code = f"{code}.SH"
            else:
                ts_code = f"{code}.SZ"

            results.append({
                "ts_code": ts_code,
                "symbol": code,
                "name": name,
                "area": "",
                "industry": security_type_name,
            })
        return results
    except Exception:
        return []


async def get_realtime_quote(codes: list[str]) -> list[dict]:
    """Get realtime quotes using Sina finance API (free)."""
    if not codes:
        return []

    sina_codes = []
    for code in codes:
        if code.endswith('.SH'):
            sina_codes.append(f"sh{code[:6]}")
        elif code.endswith('.SZ'):
            sina_codes.append(f"sz{code[:6]}")

    url = f"https://hq.sinajs.cn/list={','.join(sina_codes)}"
    headers = {"Referer": "https://finance.sina.com.cn"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=5)
            resp.encoding = 'gbk'
            lines = resp.text.strip().split('\n')

        results = []
        for i, line in enumerate(lines):
            if '="' not in line:
                continue
            data = line.split('="')[1].rstrip('";').split(',')
            if len(data) < 32:
                continue

            results.append({
                "code": codes[i],
                "name": data[0],
                "open": float(data[1]) if data[1] else 0,
                "pre_close": float(data[2]) if data[2] else 0,
                "price": float(data[3]) if data[3] else 0,
                "high": float(data[4]) if data[4] else 0,
                "low": float(data[5]) if data[5] else 0,
                "volume": float(data[8]) if data[8] else 0,
                "amount": float(data[9]) if data[9] else 0,
                "bid1_vol": float(data[10]) if data[10] else 0,
                "bid1_price": float(data[11]) if data[11] else 0,
                "ask1_vol": float(data[20]) if data[20] else 0,
                "ask1_price": float(data[21]) if data[21] else 0,
                "date": data[30],
                "time": data[31],
            })

        for r in results:
            if r["pre_close"] > 0 and r["price"] > 0:
                r["change"] = r["price"] - r["pre_close"]
                r["change_pct"] = round((r["change"] / r["pre_close"]) * 100, 2)
            else:
                r["change"] = 0
                r["change_pct"] = 0

        return results
    except Exception:
        return []


async def get_kline_data(code: str, period: str = "daily", count: int = 120) -> list[dict]:
    """Get K-line data from Tencent finance (free, no auth)."""
    symbol = code[:6]
    if code.endswith('.SH'):
        prefix = f"sh{symbol}"
    else:
        prefix = f"sz{symbol}"

    period_map = {"daily": "day", "weekly": "week", "monthly": "month"}
    p = period_map.get(period, "day")

    url = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
    params = {"param": f"{prefix},{p},,,{count},qfq"}
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=10)
            data = resp.json()

        stock_data = data.get("data", {}).get(prefix, {})
        day_data = stock_data.get(p) or stock_data.get(f"qfq{p}", [])

        if not day_data:
            return []

        results = []
        for item in day_data:
            if len(item) >= 6:
                results.append({
                    "trade_date": item[0].replace("-", ""),
                    "open": float(item[1]),
                    "close": float(item[2]),
                    "high": float(item[3]),
                    "low": float(item[4]),
                    "vol": float(item[5]),
                    "amount": 0,
                })
        return results
    except Exception:
        return []


async def get_minute_data(code: str) -> list[dict]:
    """Get minute-level data from Tencent finance."""
    symbol = code[:6]
    if code.endswith('.SH'):
        prefix = f"sh{symbol}"
    else:
        prefix = f"sz{symbol}"

    url = "https://web.ifzq.gtimg.cn/appstock/app/minute/query"
    params = {"code": prefix}
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=10)
            data = resp.json()

        minutes = data.get("data", {}).get(prefix, {}).get("data", {}).get("data", [])
        if not minutes:
            return []

        results = []
        for item in minutes:
            parts = item.split(" ")
            if len(parts) >= 3:
                results.append({
                    "trade_time": parts[0],
                    "price": float(parts[1]),
                    "vol": float(parts[2]),
                })
        return results
    except Exception:
        return []
