"""Agent orchestrator — coordinates AI analysis and action plan creation."""

import json
import re
import uuid
from datetime import datetime

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.ollama_client import OllamaClient
from app.ai.prompts import build_analysis_prompt
from app.ai.schemas import AnalysisResultSchema, ExtractedTaskSchema
from app.core.errors import InvalidModelResponseError, OllamaUnavailableError
from app.core.logging import get_logger
from app.db.models import ActionPlan, AnalysisJob, ExtractedTask, FileRecord, ProposedAction
from app.tools.duplicate_detection import detect_duplicate_candidates
from app.tools.normalize_deadline import normalize_deadline

logger = get_logger(__name__)

MAX_RETRIES = 2


class AgentOrchestrator:
    """Coordinates AI inference and deterministic tool execution."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.client = OllamaClient()

    async def run(self, job: AnalysisJob, file_record: FileRecord) -> dict:
        """Run a full analysis and create an action plan."""
        if not file_record.extracted_text:
            raise ValueError("No extracted text available for analysis.")

        prompt = build_analysis_prompt(
            file_record.extracted_text,
            file_record.original_name,
            file_record.format,
        )

        # Invoke model with retry
        result = await self._invoke_with_retry(prompt)

        # Run deterministic tools
        tasks = await self._persist_tasks(result, job, file_record)
        action_plan = await self._create_action_plan(result, job, file_record)

        # Update file record with category
        file_record.suggested_category = result.category.category
        file_record.category_confidence = result.category.confidence
        await self.db.flush()

        return {
            "tasks_extracted": len(tasks),
            "actions_proposed": len(action_plan.proposed_actions),
            "category": result.category.category,
            "summary": result.summary,
        }

    async def _invoke_with_retry(self, prompt: str) -> AnalysisResultSchema:
        """Call Ollama and validate the response, with bounded retries."""
        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES + 1):
            try:
                raw = await self.client.generate_json(prompt)
                result = AnalysisResultSchema.model_validate(raw)
                if attempt > 0:
                    logger.info("Analysis succeeded on retry %d", attempt)
                return result
            except (ValidationError, ValueError, json.JSONDecodeError) as exc:
                last_error = exc
                logger.warning("Model response validation failed (attempt %d): %s", attempt + 1, exc)
            except OllamaUnavailableError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning("Model invocation error (attempt %d): %s", attempt + 1, exc)

        raise InvalidModelResponseError(
            "AI model returned an invalid response after retries.",
            detail=str(last_error),
        )

    async def _persist_tasks(
        self, result: AnalysisResultSchema, job: AnalysisJob, file_record: FileRecord
    ) -> list[ExtractedTask]:
        """Persist extracted tasks with normalized deadlines."""
        if not result.tasks:
            result.tasks = self._fallback_tasks(file_record.extracted_text or "")
            if result.tasks:
                logger.info(
                    "Model returned no tasks; extracted %d explicit fallback tasks for %s",
                    len(result.tasks),
                    file_record.original_name,
                )

        tasks = []
        for task_schema in result.tasks:
            # Normalize deadline
            normalized_deadline = None
            if task_schema.deadline_raw:
                normalized_deadline = normalize_deadline(task_schema.deadline_raw)

            task = ExtractedTask(
                file_id=file_record.id,
                analysis_id=job.id,
                description=task_schema.description,
                deadline=normalized_deadline,
                deadline_raw=task_schema.deadline_raw,
                priority=task_schema.priority,
                confidence=task_schema.confidence,
                status="active",
            )
            self.db.add(task)
            tasks.append(task)

        await self.db.flush()
        return tasks

    @staticmethod
    def _fallback_tasks(text: str) -> list[ExtractedTaskSchema]:
        """Extract obvious action sentences when the model omits task items."""
        tasks = []
        seen: set[str] = set()
        action_pattern = re.compile(
            r"(?i)\b(?:please|remember to|action required:|todo:|to-do:|"
            r"need to|must|should)\s+([^.!?\n]{5,240})"
        )
        deadline_pattern = re.compile(
            r"(?i)(?:\b(?:by|before|due|on)\s+)?"
            r"(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|"
            r"friday|saturday|sunday|next week|"
            r"\d{4}[-/]\d{1,2}[-/]\d{1,2}|"
            r"\d{1,2}(?:st|nd|rd|th)?\s+\w+)"
        )
        for line in text.splitlines():
            cleaned = " ".join(line.strip().split())
            if not cleaned:
                continue
            match = action_pattern.search(cleaned)
            if not match:
                continue
            description = match.group(1).strip(" ,:-")
            deadline_match = deadline_pattern.search(description)
            deadline_raw = deadline_match.group(1) if deadline_match else None
            if deadline_match:
                description = description[:deadline_match.start()].strip(" ,:-")
            key = description.casefold()
            if len(description) < 5 or key in seen:
                continue
            seen.add(key)
            tasks.append(
                {
                    "description": description[:500],
                    "deadline_raw": deadline_raw,
                    "priority": "high" if any(word in description.casefold() for word in ("urgent", "asap", "today")) else "medium",
                    "confidence": 0.9,
                }
            )
        return [ExtractedTaskSchema.model_validate(task) for task in tasks[:20]]

    async def _create_action_plan(
        self, result: AnalysisResultSchema, job: AnalysisJob, file_record: FileRecord
    ) -> ActionPlan:
        """Create an action plan with proposed actions from analysis results."""
        plan = ActionPlan(analysis_id=job.id, status="ready")
        self.db.add(plan)
        await self.db.flush()

        actions: list[ProposedAction] = []

        # Action: categorize file
        actions.append(ProposedAction(
            plan_id=plan.id,
            file_id=file_record.id,
            action_type="categorize",
            description=f"Categorize '{file_record.original_name}' as '{result.category.category}'",
            rationale=result.category.rationale or f"AI confidence: {result.category.confidence:.0%}",
            parameters=json.dumps({
                "file_id": file_record.id,
                "category": result.category.category,
                "confidence": result.category.confidence,
            }),
            idempotency_key=f"categorize:{file_record.id}",
        ))

        # Action: rename/filename suggestion
        if result.filename_suggestion:
            ext = file_record.format
            new_name = f"{result.filename_suggestion.suggested_name}.{ext}"
            actions.append(ProposedAction(
                plan_id=plan.id,
                file_id=file_record.id,
                action_type="rename",
                description=f"Rename to '{new_name}'",
                rationale=result.filename_suggestion.rationale or "AI-suggested descriptive filename",
                parameters=json.dumps({
                    "file_id": file_record.id,
                    "original_name": file_record.original_name,
                    "new_name": new_name,
                }),
                idempotency_key=f"rename:{file_record.id}:{new_name}",
            ))

        # Action: flag duplicate if noted
        if result.duplicate_note:
            actions.append(ProposedAction(
                plan_id=plan.id,
                file_id=file_record.id,
                action_type="flag_duplicate",
                description=f"Flag as potential duplicate: {result.duplicate_note[:200]}",
                rationale="AI identified possible duplicate content",
                parameters=json.dumps({
                    "file_id": file_record.id,
                    "note": result.duplicate_note,
                }),
                idempotency_key=f"flag_dup:{file_record.id}",
            ))

        for action in actions:
            self.db.add(action)

        await self.db.flush()
        # Refresh plan to include actions
        plan.proposed_actions = actions
        return plan
