"""Ollama HTTP client with timeout handling and status checking."""

import json
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import OllamaTimeoutError, OllamaUnavailableError
from app.core.logging import get_logger

logger = get_logger(__name__)


class OllamaClient:
    """Async HTTP client for the Ollama API."""

    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model
        self.timeout = settings.ollama_timeout

    async def get_status(self) -> dict[str, Any]:
        """Check Ollama availability and whether the configured model is present."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                available_models = [m["name"] for m in data.get("models", [])]
                model_available = any(
                    m.startswith(self.model) for m in available_models
                )
                return {
                    "ollama_available": True,
                    "ollama_url": self.base_url,
                    "configured_model": self.model,
                    "model_available": model_available,
                    "error": None if model_available else (
                        f"Model '{self.model}' not found. "
                        f"Run: ollama pull {self.model}"
                    ),
                }
        except httpx.ConnectError:
            return {
                "ollama_available": False,
                "ollama_url": self.base_url,
                "configured_model": self.model,
                "model_available": False,
                "error": (
                    "Cannot connect to Ollama. Make sure Ollama is running: "
                    "https://ollama.com"
                ),
            }
        except Exception as exc:
            return {
                "ollama_available": False,
                "ollama_url": self.base_url,
                "configured_model": self.model,
                "model_available": False,
                "error": str(exc),
            }

    async def list_models(self) -> list[dict[str, Any]]:
        """Return a list of available models from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "name": m["name"],
                        "size": m.get("size"),
                        "modified_at": m.get("modified_at"),
                    }
                    for m in data.get("models", [])
                ]
        except Exception:
            return []

    async def generate_text(self, prompt: str) -> str:
        """Generate plain text from Ollama. Used for briefing generation."""
        return await self._generate(prompt)

    async def generate_json(self, prompt: str) -> dict[str, Any]:
        """Generate and parse JSON from Ollama."""
        text = await self._generate(prompt)
        # Extract JSON from the response (model may wrap it in markdown)
        text = _extract_json(text)
        return json.loads(text)

    async def _generate(self, prompt: str) -> str:
        """Core generation call with timeout handling."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("response", "").strip()
        except httpx.ConnectError as exc:
            raise OllamaUnavailableError(
                "Cannot connect to Ollama.", detail=str(exc)
            ) from exc
        except httpx.TimeoutException as exc:
            raise OllamaTimeoutError(
                f"Ollama request timed out after {self.timeout}s.", detail=str(exc)
            ) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise OllamaUnavailableError(
                    f"Model '{self.model}' not found in Ollama.",
                    detail=f"Run: ollama pull {self.model}",
                ) from exc
            raise OllamaUnavailableError(
                "Ollama returned an error.", detail=str(exc)
            ) from exc


def _extract_json(text: str) -> str:
    """Extract JSON from a model response that may contain markdown code blocks."""
    text = text.strip()
    # Handle ```json ... ``` blocks
    if "```" in text:
        import re
        match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
        if match:
            return match.group(1).strip()
    # Find first { or [ and last } or ]
    start = -1
    for i, ch in enumerate(text):
        if ch in ("{", "["):
            start = i
            break
    if start == -1:
        return text
    # Find matching end
    end = max(text.rfind("}"), text.rfind("]"))
    if end == -1:
        return text
    return text[start : end + 1]
