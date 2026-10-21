"""Action plan management and approval execution service."""

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ActionAlreadyExecutedError, InvalidStateError, NotFoundError
from app.core.logging import get_logger
from app.db.models import ActionPlan, ProposedAction
from app.services.audit_service import AuditService
from app.tools.safe_file_operations import execute_action

logger = get_logger(__name__)


class ActionPlanService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_plans(self, skip: int = 0, limit: int = 20) -> tuple[list[ActionPlan], int]:
        from sqlalchemy import func

        total = (
            await self.db.execute(select(func.count()).select_from(ActionPlan))
        ).scalar_one()
        result = await self.db.execute(
            select(ActionPlan)
            .options(selectinload(ActionPlan.proposed_actions))
            .order_by(ActionPlan.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_plan(self, plan_id: str) -> ActionPlan:
        result = await self.db.execute(
            select(ActionPlan)
            .options(selectinload(ActionPlan.proposed_actions))
            .where(ActionPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise NotFoundError(f"Action plan '{plan_id}' not found.")
        return plan

    async def _get_action(self, action_id: str) -> ProposedAction:
        result = await self.db.execute(
            select(ProposedAction).where(ProposedAction.id == action_id)
        )
        action = result.scalar_one_or_none()
        if not action:
            raise NotFoundError(f"Action '{action_id}' not found.")
        return action

    async def approve_action(self, action_id: str) -> ProposedAction:
        action = await self._get_action(action_id)

        if action.status == "succeeded":
            raise ActionAlreadyExecutedError(
                "This action has already been executed successfully."
            )
        if action.status not in ("pending_approval",):
            raise InvalidStateError(
                f"Action is in state '{action.status}' and cannot be approved."
            )

        # Transition to executing
        action.status = "executing"
        await self.db.flush()

        # Execute the action
        try:
            params = json.loads(action.parameters) if action.parameters else {}
            await execute_action(action.action_type, params, action.file_id)
            action.status = "succeeded"
            action.executed_at = datetime.now(UTC).replace(tzinfo=None)
        except Exception as exc:
            logger.error("Action %s execution failed: %s", action_id, exc)
            action.status = "failed"
            action.error_message = str(exc)[:512]
            action.executed_at = datetime.now(UTC).replace(tzinfo=None)

        await self.db.flush()

        audit_svc = AuditService(self.db)
        await audit_svc.record(
            event_type="action_executed",
            description=f"Action '{action.action_type}' {action.status}: {action.description[:200]}",
            actor="user",
            related_file_id=action.file_id,
            related_action_id=action_id,
        )

        return action

    async def reject_action(self, action_id: str) -> ProposedAction:
        action = await self._get_action(action_id)

        if action.status not in ("pending_approval",):
            raise InvalidStateError(
                f"Action is in state '{action.status}' and cannot be rejected."
            )

        action.status = "rejected"
        await self.db.flush()

        audit_svc = AuditService(self.db)
        await audit_svc.record(
            event_type="action_rejected",
            description=f"Action '{action.action_type}' rejected: {action.description[:200]}",
            actor="user",
            related_file_id=action.file_id,
            related_action_id=action_id,
        )

        return action
