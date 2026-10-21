"""Activity/audit log endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.audit_service import AuditService

router = APIRouter()


class AuditEventResponse(BaseModel):
    id: str
    event_type: str
    description: str
    actor: str
    related_file_id: str | None
    related_action_id: str | None
    related_analysis_id: str | None
    created_at: str


class ActivityResponse(BaseModel):
    events: list[AuditEventResponse]
    total: int


@router.get("", response_model=ActivityResponse)
async def get_activity(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 50,
) -> ActivityResponse:
    """Get the audit event history."""
    svc = AuditService(db)
    events, total = await svc.list_events(skip=skip, limit=limit)
    return ActivityResponse(
        events=[
            AuditEventResponse(
                id=e.id,
                event_type=e.event_type,
                description=e.description,
                actor=e.actor,
                related_file_id=e.related_file_id,
                related_action_id=e.related_action_id,
                related_analysis_id=e.related_analysis_id,
                created_at=e.created_at.isoformat(),
            )
            for e in events
        ],
        total=total,
    )
