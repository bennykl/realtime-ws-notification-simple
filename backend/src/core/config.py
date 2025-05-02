from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # CORS settings
    CORS_ORIGINS: list = ["*"]
    ALLOWED_WS_ORIGINS: list = [
        "http://localhost:80",
        "http://localhost",
        "https://d-realtime-notif.kitahq.com",
    ]

    FRONTEND_URL: str = "http://localhost:80"
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
