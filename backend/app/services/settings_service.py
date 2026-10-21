"""Persistent settings service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppSetting


class SettingsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, key: str) -> str | None:
        result = await self.db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
        return row.value if row else None

    async def set(self, key: str, value: str) -> None:
        result = await self.db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            self.db.add(AppSetting(key=key, value=value))
        await self.db.flush()

    async def apply_updates(self, updates: dict) -> None:
        allowed = {"ollama_model", "ollama_base_url", "max_upload_size_mb"}
        for key, value in updates.items():
            if key in allowed:
                await self.set(key, str(value))
