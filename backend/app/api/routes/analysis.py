"""Analysis job endpoints."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.analysis_service import AnalysisService

router = APIRouter()


class StartAnalysisRequest(BaseModel):
    file_id: str


class AnalysisResponse(BaseModel):
    id: str
    file_id: str
    status: str
    retry_count: int
    error_message: str | None
    result_summary: str | None
    started_at: str | None
    completed_at: str | None
    created_at: str


def _job_to_response(job: object) -> AnalysisResponse:
    return AnalysisResponse(
        id=job.id,
        file_id=job.file_id,
        status=job.status,
        retry_count=job.retry_count,
        error_message=job.error_message,
        result_summary=job.result_summary,
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        created_at=job.created_at.isoformat(),
    )


@router.post("", response_model=AnalysisResponse, status_code=202)
async def start_analysis(
    body: StartAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalysisResponse:
    """Start an AI analysis job for a file."""
    svc = AnalysisService(db)
    job = await svc.create_job(body.file_id)
    # Commit before the background task opens its independent session.
    await db.commit()
    background_tasks.add_task(svc.run_job, job.id)
    return _job_to_response(job)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalysisResponse:
    """Poll the status of an analysis job."""
    svc = AnalysisService(db)
    job = await svc.get_job(analysis_id)
    return _job_to_response(job)
