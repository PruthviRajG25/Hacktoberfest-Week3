"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import PrivateAttr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All application configuration loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Ollama ──────────────────────────────────────────────────────────────
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2"
    ollama_timeout: int = 120

    # ── Application ─────────────────────────────────────────────────────────
    app_data_dir: str = "./data"
    database_url: str = "sqlite:///./data/lazyops.db"
    max_upload_size_mb: int = 10
    max_extracted_text_chars: int = 8000

    # ── API Server ───────────────────────────────────────────────────────────
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    # ── Logging ──────────────────────────────────────────────────────────────
    log_level: str = "INFO"

    # ── Security ─────────────────────────────────────────────────────────────
    secret_key: str = "change-this-to-a-random-secret-key"

    # ── Demo ─────────────────────────────────────────────────────────────────
    demo_mode: bool = False
    _uploads_dir_override: Path | None = PrivateAttr(default=None)
    _max_upload_size_bytes_override: int | None = PrivateAttr(default=None)

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    @model_validator(mode="after")
    def ensure_data_dir(self) -> "Settings":
        """Create the data directory if it doesn't exist."""
        data_path = Path(self.app_data_dir)
        data_path.mkdir(parents=True, exist_ok=True)
        (data_path / "uploads").mkdir(exist_ok=True)
        (data_path / "workspace").mkdir(exist_ok=True)
        return self

    @property
    def uploads_dir(self) -> Path:
        if self._uploads_dir_override is not None:
            return self._uploads_dir_override
        return Path(self.app_data_dir) / "uploads"

    @uploads_dir.setter
    def uploads_dir(self, value: Path) -> None:
        self._uploads_dir_override = Path(value)

    @property
    def workspace_dir(self) -> Path:
        return Path(self.app_data_dir) / "workspace"

    @property
    def max_upload_size_bytes(self) -> int:
        if self._max_upload_size_bytes_override is not None:
            return self._max_upload_size_bytes_override
        return self.max_upload_size_mb * 1024 * 1024

    @max_upload_size_bytes.setter
    def max_upload_size_bytes(self, value: int) -> None:
        self._max_upload_size_bytes_override = value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
