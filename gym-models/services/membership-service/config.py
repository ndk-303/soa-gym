from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
DB_FILE = CURRENT_DIR / "membership.db"

ENV_FILE = None
for candidate in [CURRENT_DIR / ".env", CURRENT_DIR.parent / ".env", ROOT_DIR / ".env", ROOT_DIR.parent / ".env"]:
    if candidate.exists():
        ENV_FILE = str(candidate)
        break


class MembershipSettings(BaseSettings):
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8002
    MEMBERSHIP_SERVICE_PORT: Optional[int] = None

    MEMBERSHIP_DATABASE_URL: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def service_port(self) -> int:
        return self.MEMBERSHIP_SERVICE_PORT or self.PORT

    @property
    def effective_db_url(self) -> str:
        return self.MEMBERSHIP_DATABASE_URL or self.DATABASE_URL or f"sqlite:///{DB_FILE}"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["http://localhost:5173", "http://localhost:3000"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = MembershipSettings()
