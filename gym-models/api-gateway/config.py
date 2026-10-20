import os
from typing import List, Dict, Tuple
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine paths for locating .env file
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
ENV_FILE = None
for candidate in [CURRENT_DIR / ".env", ROOT_DIR / ".env", ROOT_DIR.parent / ".env"]:
    if candidate.exists():
        ENV_FILE = str(candidate)
        break


class GatewaySettings(BaseSettings):
    ENVIRONMENT: str = "development"
    GATEWAY_HOST: str = "0.0.0.0"
    GATEWAY_PORT: int = 8000
    GATEWAY_HTTP_TIMEOUT: float = 10.0
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    USER_SERVICE_URL: str = "http://127.0.0.1:8001"
    MEMBERSHIP_SERVICE_URL: str = "http://127.0.0.1:8002"
    CLASS_SERVICE_URL: str = "http://127.0.0.1:8003"
    BOOKING_SERVICE_URL: str = "http://127.0.0.1:8004"
    BILLING_SERVICE_URL: str = "http://127.0.0.1:8005"
    ATTENDANCE_SERVICE_URL: str = "http://127.0.0.1:8006"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["http://localhost:5173", "http://localhost:3000"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = GatewaySettings()

# Service URLs for backwards compatibility and clean imports
USER_SERVICE_URL = settings.USER_SERVICE_URL
MEMBERSHIP_SERVICE_URL = settings.MEMBERSHIP_SERVICE_URL
CLASS_SERVICE_URL = settings.CLASS_SERVICE_URL
BOOKING_SERVICE_URL = settings.BOOKING_SERVICE_URL
BILLING_SERVICE_URL = settings.BILLING_SERVICE_URL
ATTENDANCE_SERVICE_URL = settings.ATTENDANCE_SERVICE_URL

SERVICE_MAP: Dict[str, Tuple[str, str]] = {
    "users": (USER_SERVICE_URL, "/users"),
    "membership-plans": (MEMBERSHIP_SERVICE_URL, "/membership-plans"),
    "members": (MEMBERSHIP_SERVICE_URL, "/members"),
    "gym-classes": (CLASS_SERVICE_URL, "/gym-classes"),
    "class-slots": (CLASS_SERVICE_URL, "/class-slots"),
    "bookings": (BOOKING_SERVICE_URL, "/bookings"),
    "invoices": (BILLING_SERVICE_URL, "/invoices"),
    "payments": (BILLING_SERVICE_URL, "/payments"),
    "attendances": (ATTENDANCE_SERVICE_URL, "/attendance"),
    "attendance": (ATTENDANCE_SERVICE_URL, "/attendance"),
    "auth": (USER_SERVICE_URL, "/users"),
}
