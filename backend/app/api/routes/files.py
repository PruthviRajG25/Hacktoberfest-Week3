"""File upload and management endpoints."""

import json
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import FileTooLargeError, UnsupportedFormatError
from app.core.config import settings
from app.db.session import get_db
from app.services.file_service import FileService

router = APIRouter()

SUPPORTED_FORMATS = {".txt", ".md", ".pdf", ".json", ".csv"}


class FileResponse(BaseModel):
    id: str
    original_name: str
    format: str
    size_bytes: int
    status: str
    suggested_category: str | None
    category_confidence: float | None
    parse_error: str | None
    created_at: str
    updated_at: str


class FileListResponse(BaseModel):
    files: list[FileResponse]
    total: int


def _file_to_response(f: object) -> FileResponse:
    return FileResponse(
        id=f.id,
        original_name=f.original_name,
        format=f.format,
        size_bytes=f.size_bytes,
        status=f.status,
        suggested_category=f.suggested_category,
        category_confidence=f.category_confidence,
        parse_error=f.parse_error,
        created_at=f.created_at.isoformat(),
        updated_at=f.updated_at.isoformat(),
    )


@router.post("/upload", response_model=FileResponse, status_code=201)
async def upload_file(
    file: UploadFile,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """Upload and parse a file. Supported formats: .txt .md .pdf .json .csv"""
    # Validate file size
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise FileTooLargeError(
            f"File exceeds maximum size of {settings.max_upload_size_mb} MB.",
            detail=f"File size: {len(content)} bytes",
        )

    # Validate format
    filename = file.filename or "unknown"
    suffix = ""
    if "." in filename:
        suffix = "." + filename.rsplit(".", 1)[-1].lower()

    if suffix not in SUPPORTED_FORMATS:
        raise UnsupportedFormatError(
            f"Format '{suffix}' is not supported.",
            detail=f"Supported formats: {', '.join(sorted(SUPPORTED_FORMATS))}",
        )

    svc = FileService(db)
    record = await svc.store_and_parse(content, filename, suffix.lstrip("."))
    return _file_to_response(record)


@router.get("", response_model=FileListResponse)
async def list_files(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 50,
) -> FileListResponse:
    """List all uploaded files."""
    svc = FileService(db)
    files, total = await svc.list_files(skip=skip, limit=limit)
    return FileListResponse(files=[_file_to_response(f) for f in files], total=total)


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """Get a specific file record."""
    svc = FileService(db)
    record = await svc.get_file(file_id)
    return _file_to_response(record)


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a file and all associated data."""
    svc = FileService(db)
    await svc.delete_file(file_id)
