import os
from dotenv import load_dotenv

load_dotenv()

TUSHARE_TOKEN = os.getenv("TUSHARE_TOKEN", "")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./quantstock.db")
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
POLLING_INTERVAL_SECONDS = 5
