from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="SPAMSHIELD_", extra="ignore")

    app_name: str = "SpamShield AI API"
    version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3417", "http://127.0.0.1:3417"]
    artifacts_dir: Path = BACKEND_ROOT / "artifacts"
    default_model: str = "random_forest"
    max_message_chars: int = 5000


@lru_cache
def get_settings() -> Settings:
    return Settings()
