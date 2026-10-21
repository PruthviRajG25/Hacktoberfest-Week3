"""Audit event recording service."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import AuditEvent

logger = get_logger(__name__)


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def record(
        self,
        event_type: str,
        description: str,
        actor: str = "system",
        related_file_id: str | None = None,
        related_action_id: str | None = None,
        related_analysis_id: str | None = None,
        metadata: dict | None = None,
    ) -> AuditEvent:
        """Record an audit event. Never logs sensitive document content."""
        import json

        event = AuditEvent(
            event_type=event_type,
            description=description[:1024],
            actor=actor,
            related_file_id=related_file_id,
            related_action_id=related_action_id,
            related_analysis_id=related_analysis_id,
            event_metadata=json.dumps(metadata) if metadata else None,
        )
        self.db.add(event)
        try:
            await self.db.flush()
        except Exception as exc:
            # Audit failure should not block primary operations
            logger.warning("Failed to record audit event: %s", exc)
        return event

    async def list_events(
        self, skip: int = 0, limit: int = 50
    ) -> tuple[list[AuditEvent], int]:
        total = (
            await self.db.execute(select(func.count()).select_from(AuditEvent))
        ).scalar_one()
        result = await self.db.execute(
            select(AuditEvent).order_by(AuditEvent.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total
