from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from pydantic import BaseModel
from typing import Optional

from app.models.database import get_session, StockGroup, Favorite

router = APIRouter(prefix="/api/groups", tags=["favorites"])


class GroupCreate(BaseModel):
    name: str
    color: Optional[str] = "#3b82f6"


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class StockAdd(BaseModel):
    stock_code: str
    stock_name: str
    notes: Optional[str] = ""


@router.get("")
async def list_groups(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(StockGroup).order_by(StockGroup.sort_order)
    )
    groups = result.scalars().all()
    response = []
    for g in groups:
        stocks_result = await session.execute(
            select(Favorite).where(Favorite.group_id == g.id)
        )
        stocks = stocks_result.scalars().all()
        response.append({
            "id": g.id,
            "name": g.name,
            "color": g.color,
            "sort_order": g.sort_order,
            "stocks": [
                {"id": s.id, "stock_code": s.stock_code, "stock_name": s.stock_name, "notes": s.notes}
                for s in stocks
            ],
        })
    return {"groups": response}


@router.post("")
async def create_group(data: GroupCreate, session: AsyncSession = Depends(get_session)):
    group = StockGroup(name=data.name, color=data.color)
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return {"id": group.id, "name": group.name, "color": group.color}


@router.put("/{group_id}")
async def update_group(group_id: int, data: GroupUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(StockGroup).where(StockGroup.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if data.name is not None:
        group.name = data.name
    if data.color is not None:
        group.color = data.color
    if data.sort_order is not None:
        group.sort_order = data.sort_order
    await session.commit()
    return {"id": group.id, "name": group.name, "color": group.color}


@router.delete("/{group_id}")
async def delete_group(group_id: int, session: AsyncSession = Depends(get_session)):
    await session.execute(delete(Favorite).where(Favorite.group_id == group_id))
    await session.execute(delete(StockGroup).where(StockGroup.id == group_id))
    await session.commit()
    return {"ok": True}


@router.post("/{group_id}/stocks")
async def add_stock(group_id: int, data: StockAdd, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(StockGroup).where(StockGroup.id == group_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Group not found")
    fav = Favorite(stock_code=data.stock_code, stock_name=data.stock_name, group_id=group_id, notes=data.notes)
    session.add(fav)
    await session.commit()
    await session.refresh(fav)
    return {"id": fav.id, "stock_code": fav.stock_code, "stock_name": fav.stock_name}


@router.delete("/{group_id}/stocks/{code}")
async def remove_stock(group_id: int, code: str, session: AsyncSession = Depends(get_session)):
    await session.execute(
        delete(Favorite).where(Favorite.group_id == group_id, Favorite.stock_code == code)
    )
    await session.commit()
    return {"ok": True}
