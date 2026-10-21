"""Daily briefing generation service."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import DailyBriefing, ExtractedTask, FileRecord
from app.ai.ollama_client import OllamaClient
from app.db.session import AsyncSessionLocal

logger = get_logger(__name__)

BRIEFING_PROMPT_TEMPLATE = """You are an inbox and messaging triage assistant. Create a specific daily briefing from the document contents and extracted tasks below.

Context:
{context}

Rules:
- Use only facts present in the context; never invent a sender, date, deadline, or action.
- Refer to messages by sender and subject when those fields appear.
- Separate email or message facts from inferred priorities.
- Identify every explicit action and its stated deadline.
- If a deadline is relative (for example "tomorrow" or "Friday"), repeat the original wording and do not convert it to a calendar date.
- Do not say only that a file should be reviewed or categorized. Explain what the messages are about and what the user should do.
- If the context has no actionable content, say exactly what was checked and why no action was found.
- Plain text only, with these headings:
SUMMARY
MESSAGES
ACTION ITEMS
PRIORITIES

Daily Briefing:"""


class BriefingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_latest(self) -> DailyBriefing | None:
        result = await self.db.execute(
            select(DailyBriefing)
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

                # Include parsed content, not only filenames, so the briefing can cite
                # the actual inbox messages and distinguish facts from suggestions.
                context_parts = []
                if recent_files:
                    context_parts.append("DOCUMENTS:")
                    for f in recent_files:
                        context_parts.append(
                            f"\nFILE: {f.original_name}\n"
                            f"FORMAT: {f.format}\n"
                            f"CATEGORY: {f.suggested_category or 'uncategorized'}\n"
                            f"CONTENT:\n{(f.extracted_text or '[No parsed text available]')[:2500]}"
                        )

                if active_tasks:
                    context_parts.append("\nEXTRACTED TASKS:")
                    for t in active_tasks:
                        deadline_str = f" [due: {t.deadline}]" if t.deadline else ""
                        context_parts.append(
                            f"  - [{t.priority}] {t.description[:240]}"
                            f"{deadline_str}"
                            f" (original deadline: {t.deadline_raw or 'not stated'})"
                        )

                if not context_parts:
                    context_parts.append("No files or tasks found yet.")

                context = "\n".join(context_parts)[:16000]
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
                await db.rollback()
                result = await db.execute(
                    select(DailyBriefing).where(DailyBriefing.id == briefing_id)
                )
                briefing = result.scalar_one_or_none()
                if briefing:
                    briefing.status = "failed"
                    briefing.error_message = str(exc)[:512]
                    briefing.content = "Briefing generation failed. Please check Ollama status and try again."
                    await db.commit()
