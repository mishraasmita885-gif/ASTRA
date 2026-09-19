import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    PROJECT_NAME: str = "ASTRA Spacecraft Telemetry & Anomaly Intelligence"
    API_V1_STR: str = "/api"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # NASA Data Paths
    BASE_DIR: Path = Path(__file__).resolve().parents[2]
    NASA_P3_TEST_PATH: Path = BASE_DIR.parent / "archive" / "data" / "data" / "test" / "P-3.npy"

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]


settings = Settings()
