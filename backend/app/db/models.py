"""SQLAlchemy database models for LazyOps AI."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class FileRecord(Base):
    """Represents an uploaded file and its parsed content."""

    __tablename__ = "file_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    original_name: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    format: Mapped[str] = mapped_column(String(16), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # pending | parsed | parse_failed
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    file_metadata: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON blob
    suggested_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    parse_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    # Relationships
    analysis_jobs: Mapped[list["AnalysisJob"]] = relationship(
        "AnalysisJob", back_populates="file_record", cascade="all, delete-orphan"
    )
    extracted_tasks: Mapped[list["ExtractedTask"]] = relationship(
        "ExtractedTask", back_populates="file_record", cascade="all, delete-orphan"
    )
    proposed_actions: Mapped[list["ProposedAction"]] = relationship(
        "ProposedAction", back_populates="file_record", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_file_records_status", "status"),)


class AnalysisJob(Base):
    """Tracks an AI analysis job for a file."""

    __tablename__ = "analysis_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False
    )
    # queued | running | completed | failed | cancelled
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    # Relationships
    file_record: Mapped["FileRecord"] = relationship("FileRecord", back_populates="analysis_jobs")
    extracted_tasks: Mapped[list["ExtractedTask"]] = relationship(
        "ExtractedTask", back_populates="analysis_job", cascade="all, delete-orphan"
    )
    action_plan: Mapped["ActionPlan | None"] = relationship(
        "ActionPlan", back_populates="analysis_job", cascade="all, delete-orphan", uselist=False
    )

    __table_args__ = (
        Index("ix_analysis_jobs_file_id", "file_id"),
        Index("ix_analysis_jobs_status", "status"),
    )


class ExtractedTask(Base):
    """A task or action item extracted from a document by the AI."""

    __tablename__ = "extracted_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False
    )
    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_jobs.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    deadline: Mapped[str | None] = mapped_column(String(32), nullable=True)  # ISO date
    deadline_raw: Mapped[str | None] = mapped_column(String(256), nullable=True)  # original
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    # active | dismissed | completed
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    # Relationships
    file_record: Mapped["FileRecord"] = relationship(
        "FileRecord", back_populates="extracted_tasks"
    )
    analysis_job: Mapped["AnalysisJob"] = relationship(
        "AnalysisJob", back_populates="extracted_tasks"
    )

    __table_args__ = (Index("ix_extracted_tasks_file_id", "file_id"),)


class ActionPlan(Base):
    """A collection of proposed actions generated from an analysis."""

    __tablename__ = "action_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_jobs.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # draft | ready | partially_approved | fully_approved | fully_rejected
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ready")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    # Relationships
    analysis_job: Mapped["AnalysisJob"] = relationship(
        "AnalysisJob", back_populates="action_plan"
    )
    proposed_actions: Mapped[list["ProposedAction"]] = relationship(
        "ProposedAction", back_populates="action_plan", cascade="all, delete-orphan"
    )


class ProposedAction(Base):
    """A single proposed action within an action plan."""

    __tablename__ = "proposed_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    plan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("action_plans.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False
    )
    # categorize | rename | flag_duplicate | create_task | generate_briefing
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    parameters: Mapped[str] = mapped_column(Text, nullable=False, default="{}")  # JSON
    # pending_approval | approved | rejected | executing | succeeded | failed
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending_approval")
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    action_plan: Mapped["ActionPlan"] = relationship(
        "ActionPlan", back_populates="proposed_actions"
    )
    file_record: Mapped["FileRecord"] = relationship(
        "FileRecord", back_populates="proposed_actions"
    )

    __table_args__ = (Index("ix_proposed_actions_plan_id", "plan_id"),)


class AuditEvent(Base):
    """Immutable audit trail of significant events."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[str] = mapped_column(String(64), nullable=False, default="system")
    related_file_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    related_action_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    related_analysis_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    event_metadata: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    __table_args__ = (Index("ix_audit_events_created_at", "created_at"),)


class AppSetting(Base):
    """Persistent application settings."""

    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    __table_args__ = (UniqueConstraint("key", name="uq_app_settings_key"),)


class DailyBriefing(Base):
    """Generated daily briefings."""

    __tablename__ = "daily_briefings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # generating | ready | failed
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ready")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
