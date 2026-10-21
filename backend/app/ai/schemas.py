"""Pydantic schemas for AI-extracted structured output."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ALLOWED_CATEGORIES = Literal[
    "work", "personal", "finance", "health", "learning",
    "legal", "reference", "archive", "other"
]

ALLOWED_PRIORITIES = Literal["high", "medium", "low"]


class ExtractedTaskSchema(BaseModel):
    """A single task or action item extracted from a document."""
    description: str = Field(..., min_length=5, max_length=500)
    deadline_raw: str | None = Field(None, max_length=100)
    priority: ALLOWED_PRIORITIES = "medium"
    confidence: float = Field(0.5, ge=0.0, le=1.0)


class FileCategorySchema(BaseModel):
    """AI-suggested file category."""
    category: ALLOWED_CATEGORIES = "other"
    confidence: float = Field(0.5, ge=0.0, le=1.0)
    rationale: str = Field("", max_length=300)


class FilenameSchema(BaseModel):
    """AI-suggested filename."""
    suggested_name: str = Field(..., min_length=3, max_length=200)
    rationale: str = Field("", max_length=300)

    @field_validator("suggested_name")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        # Strip dangerous characters
        import re
        cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", v)
        return cleaned


class DuplicateCandidateSchema(BaseModel):
    """AI-identified potential duplicate."""
    candidate_note: str = Field("", max_length=200)
    similarity_type: Literal["exact", "near_duplicate", "related"] = "related"


class AnalysisResultSchema(BaseModel):
    """Complete analysis result returned by the AI."""
    tasks: list[ExtractedTaskSchema] = Field(default_factory=list, max_length=20)
    category: FileCategorySchema = Field(default_factory=FileCategorySchema)
    filename_suggestion: FilenameSchema | None = None
    duplicate_note: str | None = Field(None, max_length=300)
    summary: str = Field("", max_length=500)
