from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/api/stocks", tags=["stock_detail"])

SINA_HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn/"}
EM_HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://quote.eastmoney.com/"}


@router.get("/{code}/detail")
async def get_stock_detail(code: str):
    """Get full stock detail: bid/ask 5 levels, fundamentals, limits."""
    symbol = code[:6]

    # 1. Sina realtime with bid/ask
    if code.endswith(".SH"):
        sina_code = f"sh{symbol}"
        em_secid = f"1.{symbol}"
        em_code = f"SH{symbol}"
    else:
        sina_code = f"sz{symbol}"
        em_secid = f"0.{symbol}"
        em_code = f"SZ{symbol}"

    result = {"code": code}

    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Sina quote (bid/ask 5 levels)
        try:
            resp = await client.get(
                f"https://hq.sinajs.cn/list={sina_code}",
                headers=SINA_HEADERS, timeout=5
            )
            resp.encoding = "gbk"
            text = resp.text
            if '="' in text:
                data = text.split('="')[1].rstrip('";').split(',')
                if len(data) >= 32:
                    result["quote"] = {
                        "name": data[0],
                        "open": float(data[1]) if data[1] else 0,
                        "pre_close": float(data[2]) if data[2] else 0,
                        "price": float(data[3]) if data[3] else 0,
                        "high": float(data[4]) if data[4] else 0,
                        "low": float(data[5]) if data[5] else 0,
                        "volume": float(data[8]) if data[8] else 0,
                        "amount": float(data[9]) if data[9] else 0,
                    }
                    # Bid 1-5 (买一到买五)
                    result["bids"] = [
                        {"price": float(data[11]), "vol": int(float(data[10]))},
                        {"price": float(data[13]), "vol": int(float(data[12]))},
                        {"price": float(data[15]), "vol": int(float(data[14]))},
                        {"price": float(data[17]), "vol": int(float(data[16]))},
                        {"price": float(data[19]), "vol": int(float(data[18]))},
                    ]
                    # Ask 1-5 (卖一到卖五)
                    result["asks"] = [
                        {"price": float(data[21]), "vol": int(float(data[20]))},
                        {"price": float(data[23]), "vol": int(float(data[22]))},
                        {"price": float(data[25]), "vol": int(float(data[24]))},
                        {"price": float(data[27]), "vol": int(float(data[26]))},
                        {"price": float(data[29]), "vol": int(float(data[28]))},
                    ]

                    price = result["quote"]["price"]
                    pre_close = result["quote"]["pre_close"]
                    if pre_close > 0:
                        result["quote"]["change"] = round(price - pre_close, 2)
                        result["quote"]["change_pct"] = round((price - pre_close) / pre_close * 100, 2)
                    else:
                        result["quote"]["change"] = 0
                        result["quote"]["change_pct"] = 0
        except Exception:
            pass

        # East Money fundamentals
        try:
            resp = await client.get(
                "https://push2.eastmoney.com/api/qt/stock/get",
                params={
                    "secid": em_secid,
                    "ut": "fa5fd1943c7b386f172d6893dbbd4644",
                    "fields": "f49,f50,f51,f52,f55,f84,f85,f116,f117,f162,f167,f173,f177,f187,f188,f190,f192",
                    "invt": "2",
                },
                headers=EM_HEADERS, timeout=8,
            )
            em_data = resp.json().get("data", {})
            if em_data:
                total_vol = result.get("quote", {}).get("volume", 0) / 100  # to 手
                outer = em_data.get("f49", 0)
                inner = int(total_vol - outer) if total_vol > 0 else 0

                result["fundamentals"] = {
                    "total_market_cap": round(em_data.get("f116", 0) / 100000000, 2),
                    "float_market_cap": round(em_data.get("f117", 0) / 100000000, 2),
                    "pe": round(em_data.get("f162", 0) / 100, 2) if em_data.get("f162") else None,
                    "pb": round(em_data.get("f167", 0) / 100, 2) if em_data.get("f167") else None,
                    "total_shares": round(em_data.get("f84", 0) / 100000000, 2),
                    "float_shares": round(em_data.get("f85", 0) / 100000000, 2),
                    "turnover_rate": round(em_data.get("f55", 0) / 1000, 2) if em_data.get("f55") else None,
                    "volume_ratio": round(em_data.get("f50", 0) / 100, 2) if em_data.get("f50") else None,
                    "limit_up": round(em_data.get("f51", 0) / 100, 2) if em_data.get("f51") else None,
                    "limit_down": round(em_data.get("f52", 0) / 100, 2) if em_data.get("f52") else None,
                    "outer_vol": outer,
                    "inner_vol": inner,
                    "roe": round(em_data.get("f173", 0) / 100, 2) if em_data.get("f173") else None,
                    "eps": round(em_data.get("f177", 0) / 10000, 4) if em_data.get("f177") else None,
                    "gross_margin": round(em_data.get("f187", 0) / 100, 2) if em_data.get("f187") else None,
                    "net_margin": round(em_data.get("f188", 0) / 100, 2) if em_data.get("f188") else None,
                    "debt_ratio": round(em_data.get("f190", 0) / 100, 2) if em_data.get("f190") else None,
                    "revenue_growth": round(em_data.get("f192", 0) / 100, 2) if em_data.get("f192") else None,
                }
        except Exception:
            pass

        # Company basic info
        try:
            resp = await client.get(
                "https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax",
                params={"code": em_code},
                headers=EM_HEADERS, timeout=8,
            )
            company_data = resp.json()
            if company_data.get("jbzl"):
                info = company_data["jbzl"][0] if isinstance(company_data["jbzl"], list) else company_data["jbzl"]
                result["company"] = {
                    "name": info.get("ORG_NAME", ""),
                    "industry": info.get("INDUSTRYCSRC1", ""),
                    "president": info.get("PRESIDENT", ""),
                    "secretary": info.get("SECRETARY", ""),
                    "reg_capital": info.get("REG_CAPITAL", ""),
                    "list_date": info.get("FOUND_DATE", ""),
                }
        except Exception:
            pass

    # Main force money flow (主力资金流向) - Sina data source (stable)
    try:
        import asyncio
        import concurrent.futures
        import urllib.request
        import json as jsonlib
        import re

        flow_url = (
            "https://vip.stock.finance.sina.com.cn/quotes_service/api/jsonp.php/"
            f"var%20a/MoneyFlow.ssl_qsfx_zjlrqs?daima={sina_code}"
        )

        def _fetch_flow():
            req = urllib.request.Request(flow_url, headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://finance.sina.com.cn/",
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.read().decode("gbk", "ignore")

        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            raw = await loop.run_in_executor(pool, _fetch_flow)

        match = re.search(r"var a\((\[.*\])\)", raw, re.S)
        money_flow = []
        if match:
            rows = jsonlib.loads(match.group(1))
            # Sina returns newest first; take last 60 days and reverse to oldest-first
            for row in reversed(rows[:60]):
                try:
                    main_net = float(row["netamount"]) / 10000
                    xlarge_net = float(row["r0_net"]) / 10000
                    money_flow.append({
                        "date": row["opendate"],
                        "main_net": round(main_net, 2),
                        "xlarge_net": round(xlarge_net, 2),
                        "large_net": round(main_net - xlarge_net, 2),
                        "small_net": 0,
                        "mid_net": 0,
                        "main_pct": round(float(row["ratioamount"]) * 100, 2),
                        "close": float(row["trade"]),
                    })
                except (KeyError, ValueError):
                    continue
        result["money_flow"] = money_flow
    except Exception:
        pass

    return result
