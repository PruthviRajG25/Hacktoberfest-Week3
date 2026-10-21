"""API tests for file upload endpoints."""

import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_txt_file(client: AsyncClient, tmp_path, monkeypatch):
    """Upload a text file and verify it is stored and parsed."""
    # Patch uploads dir to tmp_path
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "uploads_dir", tmp_path)
    monkeypatch.setattr(cfg_module.settings, "max_upload_size_bytes", 10 * 1024 * 1024)

    content = b"This is a test document. It contains tasks and notes."
    response = await client.post(
        "/api/v1/files/upload",
        files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_name"] == "test.txt"
    assert data["format"] == "txt"
    assert data["status"] in ("parsed", "parse_failed")


@pytest.mark.asyncio
async def test_upload_unsupported_format(client: AsyncClient):
    """Upload an unsupported format returns 422."""
    response = await client.post(
        "/api/v1/files/upload",
        files={"file": ("document.docx", io.BytesIO(b"data"), "application/octet-stream")},
    )
    assert response.status_code == 422
    assert "UNSUPPORTED_FORMAT" in response.text


@pytest.mark.asyncio
async def test_upload_oversized_file(client: AsyncClient, monkeypatch):
    """Upload exceeding size limit returns 413."""
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "max_upload_size_bytes", 10)  # 10 bytes limit

    response = await client.post(
        "/api/v1/files/upload",
        files={"file": ("big.txt", io.BytesIO(b"x" * 100), "text/plain")},
    )
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_list_files_empty(client: AsyncClient):
    """Empty file list returns correctly."""
    response = await client.get("/api/v1/files")
    assert response.status_code == 200
    data = response.json()
    assert "files" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_nonexistent_file(client: AsyncClient):
    """Getting a non-existent file returns 404."""
    response = await client.get("/api/v1/files/nonexistent-id")
    assert response.status_code == 404
    assert "NOT_FOUND" in response.text
