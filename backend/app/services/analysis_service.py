"""Analysis job orchestration service."""

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import InvalidStateError, NotFoundError
from app.core.logging import get_logger
from app.db.models import AnalysisJob, FileRecord
from app.db.session import AsyncSessionLocal
from app.services.audit_service import AuditService
from app.ai.orchestrator import AgentOrchestrator

logger = get_logger(__name__)


class AnalysisService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_job(self, file_id: str) -> AnalysisJob:
        """Create a queued analysis job for a file."""
        # Verify file exists
        result = await self.db.execute(select(FileRecord).where(FileRecord.id == file_id))
        file_record = result.scalar_one_or_none()
        if not file_record:
            raise NotFoundError(f"File '{file_id}' not found.")

        if file_record.status == "parse_failed":
            raise InvalidStateError("Cannot analyze a file that failed to parse.")

        job = AnalysisJob(file_id=file_id, status="queued")
        self.db.add(job)
        await self.db.flush()

        audit_svc = AuditService(self.db)
        await audit_svc.record(
            event_type="analysis_queued",
            description=f"Analysis queued for file '{file_record.original_name}'.",
            related_file_id=file_id,
            related_analysis_id=job.id,
        )

        return job

    async def get_job(self, analysis_id: str) -> AnalysisJob:
        result = await self.db.execute(
            select(AnalysisJob).where(AnalysisJob.id == analysis_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundError(f"Analysis job '{analysis_id}' not found.")
        return job

    async def run_job(self, job_id: str) -> None:
        """Background task: run the analysis job using a fresh DB session."""
        # Use a new session since background tasks don't share the request session
        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
                job = result.scalar_one_or_none()
                if not job:
                    logger.error("Job %s not found in background task", job_id)
                    return

                job.status = "running"
                job.started_at = datetime.now(UTC).replace(tzinfo=None)
                await db.commit()

                # Get file record
                result = await db.execute(
                    select(FileRecord).where(FileRecord.id == job.file_id)
                )
                file_record = result.scalar_one_or_none()
                if not file_record:
                    job.status = "failed"
                    job.error_message = "Associated file not found."
                    await db.commit()
                    return

                # Run orchestrator
                orchestrator = AgentOrchestrator(db)
                summary = await orchestrator.run(job, file_record)

                job.status = "completed"
                job.completed_at = datetime.now(UTC).replace(tzinfo=None)
                job.result_summary = json.dumps(summary)

                # Audit
                audit_svc = AuditService(db)
                await audit_svc.record(
                    event_type="analysis_completed",
                    description=f"Analysis completed for '{file_record.original_name}'.",
                    related_file_id=file_record.id,
                    related_analysis_id=job_id,
                )
                await db.commit()

            except Exception as exc:
                logger.error("Analysis job %s failed: %s", job_id, exc, exc_info=True)
                async with AsyncSessionLocal() as err_db:
                    result = await err_db.execute(
                        select(AnalysisJob).where(AnalysisJob.id == job_id)
                    )
                    failed_job = result.scalar_one_or_none()
                    if failed_job:
                        failed_job.status = "failed"
                        failed_job.error_message = str(exc)[:1024]
                        failed_job.completed_at = datetime.now(UTC).replace(tzinfo=None)
                        await err_db.commit()
