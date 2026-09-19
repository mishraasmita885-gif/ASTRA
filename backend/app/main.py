import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import telemetry, events, websocket
from app.services.telemetry_service import telemetry_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("astra.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ASTRA Mission Control Backend Initializing...")
    logger.info(f"Detector Channel: {telemetry_service.detector.channel}")
    logger.info(f"Threshold: {telemetry_service.detector.threshold}")
    logger.info(f"NASA P-3 Points loaded: {telemetry_service.p3_total_points}")
    yield
    logger.info("ASTRA Mission Control Backend Shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="ASTRA Spacecraft Telemetry & Anomaly Intelligence Backend (NASA P-3 ML + Gemini Reasoner)",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST and WebSocket routers
app.include_router(telemetry.router, prefix=settings.API_V1_STR, tags=["Telemetry & Metrics"])
app.include_router(events.router, prefix=settings.API_V1_STR, tags=["Anomaly Events & AI"])
app.include_router(websocket.router, tags=["Real-time Stream"])


@app.get("/")
def root():
    return {
        "system": "ASTRA Mission Control Backend",
        "status": "OPERATIONAL",
        "docs": "/docs",
        "api": "/api/health"
    }


def run_server():
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    run_server()
