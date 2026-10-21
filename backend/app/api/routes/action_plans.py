"""Action plan and action approval/rejection endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.action_plan_service import ActionPlanService

router = APIRouter()


class ProposedActionResponse(BaseModel):
    id: str
    plan_id: str
    file_id: str
    action_type: str
    description: str
    rationale: str
    parameters: str
    status: str
    idempotency_key: str
    error_message: str | None
    created_at: str
    executed_at: str | None


class ActionPlanResponse(BaseModel):
    id: str
    analysis_id: str
    status: str
    created_at: str
    actions: list[ProposedActionResponse]


class ActionPlanListResponse(BaseModel):
    plans: list[ActionPlanResponse]
    total: int


def _action_to_response(a: object) -> ProposedActionResponse:
    return ProposedActionResponse(
        id=a.id,
        plan_id=a.plan_id,
        file_id=a.file_id,
        action_type=a.action_type,
        description=a.description,
        rationale=a.rationale,
        parameters=a.parameters,
        status=a.status,
        idempotency_key=a.idempotency_key,
        error_message=a.error_message,
        created_at=a.created_at.isoformat(),
        executed_at=a.executed_at.isoformat() if a.executed_at else None,
    )


def _plan_to_response(plan: object) -> ActionPlanResponse:
    return ActionPlanResponse(
        id=plan.id,
        analysis_id=plan.analysis_id,
        status=plan.status,
        created_at=plan.created_at.isoformat(),
        actions=[_action_to_response(a) for a in plan.proposed_actions],
    )


@router.get("/action-plans", response_model=ActionPlanListResponse)
async def list_action_plans(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 20,
) -> ActionPlanListResponse:
    """List all action plans."""
    svc = ActionPlanService(db)
    plans, total = await svc.list_plans(skip=skip, limit=limit)
    return ActionPlanListResponse(plans=[_plan_to_response(p) for p in plans], total=total)


@router.get("/action-plans/{plan_id}", response_model=ActionPlanResponse)
async def get_action_plan(
    plan_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ActionPlanResponse:
    """Get a specific action plan with all its actions."""
    svc = ActionPlanService(db)
    plan = await svc.get_plan(plan_id)
    return _plan_to_response(plan)


@router.post("/actions/{action_id}/approve", response_model=ProposedActionResponse)
async def approve_action(
    action_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProposedActionResponse:
    """Approve a proposed action and execute it."""
    svc = ActionPlanService(db)
    action = await svc.approve_action(action_id)
    return _action_to_response(action)


@router.post("/actions/{action_id}/reject", response_model=ProposedActionResponse)
async def reject_action(
    action_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProposedActionResponse:
    """Reject a proposed action."""
    svc = ActionPlanService(db)
    action = await svc.reject_action(action_id)
    return _action_to_response(action)
