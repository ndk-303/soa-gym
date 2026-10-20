import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
DB_FILE = CURRENT_DIR / "user.db"

ENV_FILE = None
for candidate in [CURRENT_DIR / ".env", CURRENT_DIR.parent / ".env", ROOT_DIR / ".env", ROOT_DIR.parent / ".env"]:
    if candidate.exists():
        ENV_FILE = str(candidate)
        break


class UserSettings(BaseSettings):
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    USER_SERVICE_PORT: Optional[int] = None

    JWT_SECRET_KEY: str = "gym_soa_jwt_secret_key_super_secure_32bytes_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24

    USER_DATABASE_URL: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def service_port(self) -> int:
        return self.USER_SERVICE_PORT or self.PORT

    @property
    def effective_db_url(self) -> str:
        return self.USER_DATABASE_URL or self.DATABASE_URL or f"sqlite:///{DB_FILE}"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["http://localhost:5173", "http://localhost:3000"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = UserSettings()
