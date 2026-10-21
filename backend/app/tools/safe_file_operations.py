"""Safe file operations — restricted to the configured workspace root."""

import re
from pathlib import Path

from app.core.errors import PathViolationError
from app.core.logging import get_logger

logger = get_logger(__name__)


def _resolve_and_validate(path: Path, root: Path) -> Path:
    """Resolve path and ensure it is within root. Reject symlinks that escape."""
    resolved = path.resolve()
    root_resolved = root.resolve()
    try:
        resolved.relative_to(root_resolved)
    except ValueError as exc:
        raise PathViolationError(
            "File path is outside the permitted directory.",
            detail=f"Resolved: {resolved}, Root: {root_resolved}",
        ) from exc
    # Check for symlink escape
    if path.is_symlink():
        link_target = path.resolve()
        try:
            link_target.relative_to(root_resolved)
        except ValueError as exc:
            raise PathViolationError(
                "Symlink target is outside the permitted directory.",
                detail=str(exc),
            ) from exc
    return resolved


def _sanitize_filename(name: str) -> str:
    """Remove dangerous characters from a filename."""
    # Remove path separators and dangerous chars
    name = re.sub(r'[/\\<>:"|?*\x00-\x1f]', "_", name)
    name = name.replace("..", "_")
    name = name.strip(". ")
    if not name:
        raise ValueError("Sanitized filename is empty.")
    return name[:255]


async def execute_action(action_type: str, params: dict, file_id: str) -> dict:
    """
    Execute a safe, pre-approved file action.
    Only these action types are supported; all others are rejected.
    File operations are restricted to the uploads directory.
    """
    if action_type == "categorize":
        # Categorize is a metadata-only operation — update the DB record
        # (actual DB update is handled by the orchestrator before this)
        logger.info("Categorize action: file=%s category=%s", file_id, params.get("category"))
        return {"result": "category_applied", "category": params.get("category")}

    elif action_type == "rename":
        # Rename is a metadata-only operation for now (storage uses UUID names)
        # The "rename" only affects the original_name metadata, not the actual file path
        new_name = params.get("new_name", "")
        sanitized = _sanitize_filename(new_name)
        logger.info("Rename action: file=%s new_name=%s", file_id, sanitized)
        return {"result": "rename_recorded", "new_name": sanitized}

    elif action_type == "flag_duplicate":
        logger.info("Flag duplicate action: file=%s", file_id)
        return {"result": "flagged_as_duplicate", "note": params.get("note", "")}

    elif action_type == "create_task":
        # Tasks are already persisted during analysis; this is a no-op confirmation
        logger.info("Create task action: file=%s", file_id)
        return {"result": "task_confirmed"}

    elif action_type == "generate_briefing":
        # Briefing generation is triggered separately
        logger.info("Generate briefing action")
        return {"result": "briefing_requested"}

    else:
        raise ValueError(f"Unknown action type: '{action_type}'. Execution rejected.")
