import os

from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_database_url() -> str:
    url = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL") or ""
    if url.startswith("mysql://"):
        url = "mysql+pymysql://" + url[len("mysql://") :]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    DATABASE_URL: str = ""
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
if not settings.DATABASE_URL:
    settings.DATABASE_URL = _resolve_database_url()
