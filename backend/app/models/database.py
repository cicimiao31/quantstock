from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime

from app.core.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class StockGroup(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#3b82f6")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    stocks = relationship("Favorite", back_populates="group", cascade="all, delete-orphan")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(20), nullable=False)
    stock_name = Column(String(50), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"))
    added_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, default="")
    group = relationship("StockGroup", back_populates="stocks")


class AlertRecord(Base):
    __tablename__ = "alert_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(20), nullable=False)
    stock_name = Column(String(50), nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)  # critical, warning, info
    message = Column(Text, nullable=False)
    price = Column(Float)
    change_pct = Column(Float)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Integer, default=0)


class AlertSetting(Base):
    __tablename__ = "alert_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    price_change_threshold = Column(Float, default=2.0)
    volume_multiplier = Column(Float, default=3.0)
    near_limit_threshold = Column(Float, default=1.0)
    sound_enabled = Column(Integer, default=1)


class KlineCache(Base):
    __tablename__ = "kline_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(20), nullable=False)
    trade_date = Column(String(10), nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    amount = Column(Float)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(AlertSetting))
        if not result.scalars().first():
            session.add(AlertSetting())
            await session.commit()


async def get_session():
    async with async_session() as session:
        yield session
