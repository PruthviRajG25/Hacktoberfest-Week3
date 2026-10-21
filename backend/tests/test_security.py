"""Security tests — path traversal, injection, and safe operations."""

import pytest
from pathlib import Path

from app.tools.safe_file_operations import _sanitize_filename, _resolve_and_validate
from app.core.errors import PathViolationError


class TestSanitizeFilename:
    def test_normal_filename(self):
        assert _sanitize_filename("my-document.txt") == "my-document.txt"

    def test_path_traversal_attempt(self):
        result = _sanitize_filename("../../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    def test_windows_path_separators(self):
        result = _sanitize_filename("folder\\file.txt")
        assert "\\" not in result

    def test_dangerous_chars(self):
        result = _sanitize_filename('file<>:"|?*.txt')
        assert "<" not in result
        assert ">" not in result
        assert ":" not in result

    def test_null_bytes(self):
        result = _sanitize_filename("file\x00name.txt")
        assert "\x00" not in result

    def test_truncation(self):
        long_name = "a" * 300
        assert len(_sanitize_filename(long_name)) <= 255


class TestPathValidation:
    def test_valid_path_within_root(self, tmp_path):
        file_path = tmp_path / "file.txt"
        # Should not raise
        _resolve_and_validate(file_path, tmp_path)

    def test_path_traversal_rejected(self, tmp_path):
        # Attempt to escape via relative traversal
        escape_path = tmp_path / ".." / "escape.txt"
        with pytest.raises(PathViolationError):
            _resolve_and_validate(escape_path, tmp_path)


class TestExecuteActionSecurity:
    @pytest.mark.asyncio
    async def test_unknown_action_type_rejected(self):
        from app.tools.safe_file_operations import execute_action
        with pytest.raises(ValueError, match="Unknown action type"):
            await execute_action("shell_command", {"cmd": "rm -rf /"}, "file-id")

    @pytest.mark.asyncio
    async def test_categorize_action_succeeds(self):
        from app.tools.safe_file_operations import execute_action
        result = await execute_action("categorize", {"category": "work"}, "file-id")
        assert result["result"] == "category_applied"

    @pytest.mark.asyncio
    async def test_rename_action_sanitizes(self):
        from app.tools.safe_file_operations import execute_action
        result = await execute_action("rename", {"new_name": "../etc/passwd.txt"}, "file-id")
        assert ".." not in result["new_name"]
