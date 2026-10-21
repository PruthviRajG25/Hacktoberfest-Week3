"""Task management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.task_service import TaskService

router = APIRouter()


class TaskResponse(BaseModel):
    id: str
    file_id: str
    analysis_id: str
    description: str
    deadline: str | None
    deadline_raw: str | None
    priority: str
    confidence: float
    status: str
    created_at: str
    updated_at: str


class TaskUpdateRequest(BaseModel):
    description: str | None = None
    deadline: str | None = None
    priority: str | None = None
    status: str | None = None


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int


def _task_to_response(t: object) -> TaskResponse:
    return TaskResponse(
        id=t.id,
        file_id=t.file_id,
        analysis_id=t.analysis_id,
        description=t.description,
        deadline=t.deadline,
        deadline_raw=t.deadline_raw,
        priority=t.priority,
        confidence=t.confidence,
        status=t.status,
        created_at=t.created_at.isoformat(),
        updated_at=t.updated_at.isoformat(),
    )


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> TaskListResponse:
    """List extracted tasks with optional status filter."""
    svc = TaskService(db)
    tasks, total = await svc.list_tasks(status=status, skip=skip, limit=limit)
    return TaskListResponse(tasks=[_task_to_response(t) for t in tasks], total=total)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    body: TaskUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskResponse:
    """Edit or dismiss an extracted task."""
    svc = TaskService(db)
    task = await svc.update_task(task_id, body.model_dump(exclude_none=True))
    return _task_to_response(task)
