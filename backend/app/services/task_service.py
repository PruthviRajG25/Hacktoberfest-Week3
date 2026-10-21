"""Task CRUD service."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.db.models import ExtractedTask


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_tasks(
        self,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[ExtractedTask], int]:
        query = select(ExtractedTask).order_by(ExtractedTask.created_at.desc())
        count_query = select(func.count()).select_from(ExtractedTask)

        if status:
            query = query.where(ExtractedTask.status == status)
            count_query = count_query.where(ExtractedTask.status == status)

        total = (await self.db.execute(count_query)).scalar_one()
        tasks = list((await self.db.execute(query.offset(skip).limit(limit))).scalars().all())
        return tasks, total

    async def get_task(self, task_id: str) -> ExtractedTask:
        result = await self.db.execute(select(ExtractedTask).where(ExtractedTask.id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            raise NotFoundError(f"Task '{task_id}' not found.")
        return task

    async def update_task(self, task_id: str, updates: dict) -> ExtractedTask:
        task = await self.get_task(task_id)
        allowed = {"description", "deadline", "priority", "status"}
        for key, value in updates.items():
            if key in allowed:
                setattr(task, key, value)
        await self.db.flush()
        return task
