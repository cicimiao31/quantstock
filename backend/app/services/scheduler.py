from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import asyncio

from app.services.alert_monitor import run_alert_check
from app.models.database import async_session, Favorite, AlertSetting, AlertRecord
from sqlalchemy import select

scheduler = AsyncIOScheduler()
_is_running = False


def is_trading_hours() -> bool:
    now = datetime.now()
    if now.weekday() >= 5:
        return False
    hour_min = now.hour * 100 + now.minute
    morning = 930 <= hour_min <= 1130
    afternoon = 1300 <= hour_min <= 1500
    return morning or afternoon


async def alert_check_job():
    global _is_running
    if _is_running:
        return
    if not is_trading_hours():
        return

    _is_running = True
    try:
        async with async_session() as session:
            result = await session.execute(select(Favorite.stock_code).distinct())
            codes = [row[0] for row in result.fetchall()]

            if not codes:
                return

            settings_result = await session.execute(select(AlertSetting))
            settings = settings_result.scalars().first()
            settings_dict = {
                "price_change_threshold": settings.price_change_threshold if settings else 2.0,
                "volume_multiplier": settings.volume_multiplier if settings else 3.0,
                "near_limit_threshold": settings.near_limit_threshold if settings else 1.0,
            }

            alerts = await run_alert_check(codes, settings_dict)

            for alert in alerts:
                record = AlertRecord(
                    stock_code=alert["stock_code"],
                    stock_name=alert.get("stock_name", ""),
                    alert_type=alert["alert_type"],
                    severity=alert["severity"],
                    message=alert["message"],
                    price=alert.get("price"),
                    change_pct=alert.get("change_pct"),
                )
                session.add(record)
            if alerts:
                await session.commit()
    finally:
        _is_running = False


def start_scheduler():
    scheduler.add_job(alert_check_job, 'interval', seconds=10, id='alert_check', replace_existing=True)
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown(wait=False)
