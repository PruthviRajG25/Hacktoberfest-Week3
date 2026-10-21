"""Application settings endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as app_settings
from app.db.session import get_db
from app.services.settings_service import SettingsService

router = APIRouter()


class SettingsResponse(BaseModel):
    ollama_base_url: str
    ollama_model: str
    ollama_timeout: int
    max_upload_size_mb: int
    max_extracted_text_chars: int
    log_level: str
    demo_mode: bool
    app_data_dir: str


class SettingsUpdateRequest(BaseModel):
    ollama_model: str | None = None
    ollama_base_url: str | None = None
    max_upload_size_mb: int | None = None


@router.get("", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    """Get current application settings."""
    return SettingsResponse(
        ollama_base_url=app_settings.ollama_base_url,
        ollama_model=app_settings.ollama_model,
        ollama_timeout=app_settings.ollama_timeout,
        max_upload_size_mb=app_settings.max_upload_size_mb,
        max_extracted_text_chars=app_settings.max_extracted_text_chars,
        log_level=app_settings.log_level,
        demo_mode=app_settings.demo_mode,
        app_data_dir=app_settings.app_data_dir,
    )


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SettingsResponse:
    """Update runtime-configurable settings (persisted to DB)."""
    svc = SettingsService(db)
    updates = body.model_dump(exclude_none=True)
    await svc.apply_updates(updates)

    # Return current config (note: some settings require restart to take effect)
    return await get_settings()
