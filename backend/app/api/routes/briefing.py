"""Daily briefing endpoints."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.briefing_service import BriefingService

router = APIRouter()


class BriefingResponse(BaseModel):
    id: str
    content: str
    status: str
    error_message: str | None
    generated_at: str


@router.get("", response_model=BriefingResponse | None)
async def get_briefing(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BriefingResponse | None:
    """Get the most recent daily briefing."""
    svc = BriefingService(db)
    briefing = await svc.get_latest()
    if not briefing:
        return None
    return BriefingResponse(
        id=briefing.id,
        content=briefing.content,
        status=briefing.status,
        error_message=briefing.error_message,
        generated_at=briefing.generated_at.isoformat(),
    )


@router.post("/generate", status_code=202)
async def generate_briefing(
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Trigger generation of a new daily briefing."""
    svc = BriefingService(db)
    briefing_id = await svc.create_pending()
    background_tasks.add_task(svc.generate, briefing_id)
    return {"briefing_id": briefing_id, "status": "generating"}
