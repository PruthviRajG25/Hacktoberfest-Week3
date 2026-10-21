"""File storage and parsing service."""

import hashlib
import json
import uuid
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import NotFoundError, PathViolationError
from app.core.logging import get_logger
from app.db.models import FileRecord
from app.parsers.registry import parse_file
from app.services.audit_service import AuditService

logger = get_logger(__name__)


def _validate_storage_path(path: Path, root: Path) -> None:
    """Reject paths that escape the storage root."""
    try:
        resolved = path.resolve()
        root_resolved = root.resolve()
        resolved.relative_to(root_resolved)
    except (ValueError, OSError) as exc:
        raise PathViolationError(
            "File path is outside the permitted storage directory.",
            detail=str(exc),
        ) from exc


class FileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.uploads_dir = settings.uploads_dir

    async def store_and_parse(
        self, content: bytes, original_name: str, fmt: str
    ) -> FileRecord:
        """Store a file with a UUID-based path, parse it, and persist a FileRecord."""
        file_id = str(uuid.uuid4())
        storage_name = f"{file_id}.{fmt}"
        storage_path = self.uploads_dir / storage_name

        _validate_storage_path(storage_path, self.uploads_dir)

        # Write to disk
        storage_path.write_bytes(content)
        logger.info("Stored file %s as %s", original_name, storage_name)

        # Hash content
        file_hash = hashlib.sha256(content).hexdigest()

        # Parse
        parsed = parse_file(content, fmt)

        record = FileRecord(
            id=file_id,
            original_name=original_name[:512],
            storage_path=str(storage_path),
            format=fmt,
            size_bytes=len(content),
            status="parsed" if not parsed.error else "parse_failed",
            extracted_text=parsed.text[:settings.max_extracted_text_chars] if parsed.text else None,
            file_hash=file_hash,
            file_metadata=json.dumps(parsed.metadata) if parsed.metadata else None,
            parse_error=parsed.error,
        )
        self.db.add(record)
        await self.db.flush()

        # Audit
        audit_svc = AuditService(self.db)
        await audit_svc.record(
            event_type="file_uploaded",
            description=f"File '{original_name}' uploaded and {'parsed' if not parsed.error else 'failed to parse'}.",
            related_file_id=record.id,
        )

        return record

    async def list_files(self, skip: int = 0, limit: int = 50) -> tuple[list[FileRecord], int]:
        total_result = await self.db.execute(select(func.count()).select_from(FileRecord))
        total = total_result.scalar_one()

        result = await self.db.execute(
            select(FileRecord)
            .order_by(FileRecord.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_file(self, file_id: str) -> FileRecord:
        result = await self.db.execute(select(FileRecord).where(FileRecord.id == file_id))
        record = result.scalar_one_or_none()
        if not record:
            raise NotFoundError(f"File '{file_id}' not found.")
        return record

    async def delete_file(self, file_id: str) -> None:
        record = await self.get_file(file_id)
        storage_path = Path(record.storage_path)
        if storage_path.exists():
            _validate_storage_path(storage_path, self.uploads_dir)
            storage_path.unlink()

        await self.db.delete(record)

        audit_svc = AuditService(self.db)
        await audit_svc.record(
            event_type="file_deleted",
            description=f"File '{record.original_name}' deleted.",
        )
