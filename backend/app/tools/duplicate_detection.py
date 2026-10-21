"""Duplicate file detection using SHA-256 hashing."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FileRecord


async def detect_duplicate_candidates(
    file_id: str, file_hash: str, db: AsyncSession
) -> list[dict]:
    """
    Find files with the same SHA-256 hash (exact duplicates).
    Returns a list of duplicate candidate records.
    Note: semantic similarity is noted by the AI, not confirmed here.
    """
    if not file_hash:
        return []

    result = await db.execute(
        select(FileRecord).where(
            FileRecord.file_hash == file_hash,
            FileRecord.id != file_id,
        )
    )
    duplicates = result.scalars().all()

    return [
        {
            "file_id": f.id,
            "original_name": f.original_name,
            "similarity_type": "exact",  # hash-confirmed
        }
        for f in duplicates
    ]
