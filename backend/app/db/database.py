import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./smarthire.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

# Columns added after v2.0. `create_all` never alters existing tables, so they are
# added here for SQLite databases created by earlier versions.
_ADDITIVE_COLUMNS = {
    "jobs": {
        "department": "VARCHAR",
        "location": "VARCHAR",
        "employment_type": "VARCHAR",
        "status": "VARCHAR DEFAULT 'open'",
    },
    "candidates": {
        "integrity_report": "JSON",
    },
    "job_candidate_matches": {
        "notes": "TEXT DEFAULT ''",
        "status_source": "VARCHAR DEFAULT 'ai'",
    },
}

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in DATABASE_URL:
            for table, columns in _ADDITIVE_COLUMNS.items():
                rows = await conn.execute(text(f"PRAGMA table_info({table})"))
                existing = {row[1] for row in rows}
                for name, ddl in columns.items():
                    if name not in existing:
                        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
