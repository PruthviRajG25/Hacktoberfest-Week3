"""AI status and model listing endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.ollama_client import OllamaClient
from app.core.config import settings

router = APIRouter()


class ModelInfo(BaseModel):
    name: str
    size: int | None = None
    modified_at: str | None = None


class AIStatusResponse(BaseModel):
    ollama_available: bool
    ollama_url: str
    configured_model: str
    model_available: bool
    error: str | None = None


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status() -> AIStatusResponse:
    """Check Ollama availability and configured model status."""
    client = OllamaClient()
    status = await client.get_status()
    return AIStatusResponse(**status)


@router.get("/models", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    """List all models available in the local Ollama instance."""
    client = OllamaClient()
    models = await client.list_models()
    return ModelsResponse(models=[ModelInfo(**m) for m in models])
