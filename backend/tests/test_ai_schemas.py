"""Tests for AI schema validation."""

import pytest
from pydantic import ValidationError

from app.ai.schemas import (
    AnalysisResultSchema,
    ExtractedTaskSchema,
    FileCategorySchema,
    FilenameSchema,
)
from app.ai.orchestrator import AgentOrchestrator


class TestExtractedTaskSchema:
    def test_valid_task(self):
        task = ExtractedTaskSchema(
            description="Submit the project report",
            deadline_raw="2024-12-31",
            priority="high",
            confidence=0.9,
        )
        assert task.description == "Submit the project report"

    def test_description_too_short(self):
        with pytest.raises(ValidationError):
            ExtractedTaskSchema(description="Hi", priority="high", confidence=0.5)

    def test_confidence_out_of_range(self):
        with pytest.raises(ValidationError):
            ExtractedTaskSchema(description="Valid description", priority="high", confidence=1.5)

    def test_invalid_priority(self):
        with pytest.raises(ValidationError):
            ExtractedTaskSchema(description="Valid description", priority="urgent", confidence=0.5)


class TestFileCategorySchema:
    def test_valid_category(self):
        cat = FileCategorySchema(category="work", confidence=0.8)
        assert cat.category == "work"

    def test_invalid_category(self):
        with pytest.raises(ValidationError):
            FileCategorySchema(category="random-made-up-category", confidence=0.5)


class TestFilenameSchema:
    def test_valid_filename(self):
        fn = FilenameSchema(suggested_name="project-notes-2024", rationale="Descriptive name")
        assert fn.suggested_name == "project-notes-2024"

    def test_dangerous_chars_sanitized(self):
        fn = FilenameSchema(suggested_name='file<>:"|?*.txt', rationale="Test")
        assert "<" not in fn.suggested_name
        assert ">" not in fn.suggested_name


class TestAnalysisResultSchema:
    def test_valid_complete_result(self):
        result = AnalysisResultSchema(
            tasks=[
                {"description": "Review pull requests by Friday", "priority": "high", "confidence": 0.9}
            ],
            category={"category": "work", "confidence": 0.85, "rationale": "Technical content"},
            filename_suggestion={"suggested_name": "code-review-notes", "rationale": "Content describes review"},
            summary="Meeting notes about code review process.",
        )
        assert len(result.tasks) == 1
        assert result.category.category == "work"

    def test_empty_result_defaults(self):
        result = AnalysisResultSchema()
        assert result.tasks == []
        assert result.category.category == "other"

    def test_too_many_tasks_rejected(self):
        tasks = [{"description": f"Task number {i} in a long list", "priority": "low", "confidence": 0.5}
                 for i in range(25)]
        with pytest.raises(ValidationError):
            AnalysisResultSchema(tasks=tasks)

    def test_fallback_extracts_explicit_actions_and_deadlines(self):
        tasks = AgentOrchestrator._fallback_tasks(
            "Please review the launch plan by tomorrow.\n"
            "Remember to download the invoice before Friday.\n"
            "This line is informational only."
        )

        assert len(tasks) == 2
        assert tasks[0].description == "review the launch plan"
        assert tasks[0].deadline_raw == "tomorrow"
        assert tasks[1].deadline_raw == "Friday"
