from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from pydantic import BaseModel
from typing import Optional

from app.models.database import get_session, AlertRecord, AlertSetting

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertSettingsUpdate(BaseModel):
    price_change_threshold: Optional[float] = None
    volume_multiplier: Optional[float] = None
    near_limit_threshold: Optional[float] = None
    sound_enabled: Optional[bool] = None


@router.get("")
async def get_alerts(limit: int = Query(default=50, le=200), session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AlertRecord).order_by(desc(AlertRecord.triggered_at)).limit(limit)
    )
    alerts = result.scalars().all()
    return {"alerts": [
        {
            "id": a.id,
            "stock_code": a.stock_code,
            "stock_name": a.stock_name,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "price": a.price,
            "change_pct": a.change_pct,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            "is_read": bool(a.is_read),
        }
        for a in alerts
    ]}


@router.get("/history")
async def get_alert_history(
    page: int = 1, page_size: int = 20,
    session: AsyncSession = Depends(get_session)
):
    offset = (page - 1) * page_size
    result = await session.execute(
        select(AlertRecord).order_by(desc(AlertRecord.triggered_at)).offset(offset).limit(page_size)
    )
    alerts = result.scalars().all()
    return {"alerts": [
        {
            "id": a.id,
            "stock_code": a.stock_code,
            "stock_name": a.stock_name,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "price": a.price,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
        }
        for a in alerts
    ], "page": page, "page_size": page_size}


@router.get("/settings")
async def get_settings(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AlertSetting))
    s = result.scalars().first()
    if not s:
        return {"price_change_threshold": 2.0, "volume_multiplier": 3.0, "near_limit_threshold": 1.0, "sound_enabled": True}
    return {
        "price_change_threshold": s.price_change_threshold,
        "volume_multiplier": s.volume_multiplier,
        "near_limit_threshold": s.near_limit_threshold,
        "sound_enabled": bool(s.sound_enabled),
    }


@router.put("/settings")
async def update_settings(data: AlertSettingsUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AlertSetting))
    s = result.scalars().first()
    if not s:
        s = AlertSetting()
        session.add(s)

    if data.price_change_threshold is not None:
        s.price_change_threshold = data.price_change_threshold
    if data.volume_multiplier is not None:
        s.volume_multiplier = data.volume_multiplier
    if data.near_limit_threshold is not None:
        s.near_limit_threshold = data.near_limit_threshold
    if data.sound_enabled is not None:
        s.sound_enabled = 1 if data.sound_enabled else 0

    await session.commit()
    return {"ok": True}


@router.post("/{alert_id}/read")
async def mark_read(alert_id: int, session: AsyncSession = Depends(get_session)):
    await session.execute(
        update(AlertRecord).where(AlertRecord.id == alert_id).values(is_read=1)
    )
    await session.commit()
    return {"ok": True}
