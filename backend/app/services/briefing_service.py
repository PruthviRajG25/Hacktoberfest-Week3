"""Daily briefing generation service."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import DailyBriefing, ExtractedTask, FileRecord
from app.db.session import AsyncSessionLocal
from app.ai.ollama_client import OllamaClient
from app.core.config import settings

logger = get_logger(__name__)

BRIEFING_PROMPT_TEMPLATE = """You are a helpful productivity assistant. Generate a concise daily briefing (3-5 paragraphs) based on the following context about the user's recent documents and tasks.

Context:
{context}

Requirements:
- Be concise and actionable
- Highlight urgent deadlines
- Mention key themes from recent files
- Suggest top priorities for today
- Do not invent information not present in the context
- Plain text only, no markdown formatting

Daily Briefing:"""


class BriefingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_latest(self) -> DailyBriefing | None:
        result = await self.db.execute(
            select(DailyBriefing)
            .where(DailyBriefing.status == "ready")
            .order_by(DailyBriefing.generated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_pending(self) -> str:
        briefing_id = str(uuid.uuid4())
        briefing = DailyBriefing(id=briefing_id, content="", status="generating")
        self.db.add(briefing)
        await self.db.flush()
        return briefing_id

    async def generate(self, briefing_id: str) -> None:
        """Background task: generate briefing content using Ollama."""
        async with AsyncSessionLocal() as db:
            try:
                # Gather context
                files_result = await db.execute(
                    select(FileRecord).order_by(FileRecord.created_at.desc()).limit(10)
                )
                recent_files = list(files_result.scalars().all())

                tasks_result = await db.execute(
                    select(ExtractedTask)
                    .where(ExtractedTask.status == "active")
                    .order_by(ExtractedTask.deadline.asc().nullslast())
                    .limit(20)
                )
                active_tasks = list(tasks_result.scalars().all())

                # Build context string
                context_parts = []
                if recent_files:
                    context_parts.append("Recent files:")
                    for f in recent_files:
                        context_parts.append(f"  - {f.original_name} ({f.format}, {f.suggested_category or 'uncategorized'})")

                if active_tasks:
                    context_parts.append("\nActive tasks:")
                    for t in active_tasks:
                        deadline_str = f" [due: {t.deadline}]" if t.deadline else ""
                        context_parts.append(f"  - [{t.priority}] {t.description[:120]}{deadline_str}")

                if not context_parts:
                    context_parts.append("No files or tasks found yet.")

                context = "\n".join(context_parts)
                prompt = BRIEFING_PROMPT_TEMPLATE.format(context=context)

                # Invoke Ollama
                client = OllamaClient()
                content = await client.generate_text(prompt)

                # Update briefing
                result = await db.execute(
                    select(DailyBriefing).where(DailyBriefing.id == briefing_id)
                )
                briefing = result.scalar_one_or_none()
                if briefing:
                    briefing.content = content[:4000]
                    briefing.status = "ready"
                    await db.commit()

            except Exception as exc:
                logger.error("Briefing generation failed: %s", exc, exc_info=True)
                async with AsyncSessionLocal() as err_db:
                    result = await err_db.execute(
                        select(DailyBriefing).where(DailyBriefing.id == briefing_id)
                    )
                    b = result.scalar_one_or_none()
                    if b:
                        b.status = "failed"
                        b.error_message = str(exc)[:512]
                        b.content = "Briefing generation failed. Please check Ollama status and try again."
                        await err_db.commit()
