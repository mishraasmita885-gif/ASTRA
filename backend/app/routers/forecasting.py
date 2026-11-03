"""
ASTRA Predictive Forecasting REST Router
GET /api/v1/forecasting/channel/{channel_id}?spacecraft_id=ASTRA-ALPHA
GET /api/v1/forecasting/summary?spacecraft_id=ASTRA-ALPHA
GET /api/v1/forecasting/alarms?spacecraft_id=ASTRA-ALPHA
"""
import logging
from fastapi import APIRouter, Query
from typing import Optional

from app.services.forecasting_service import forecasting_service, CHANNEL_THRESHOLDS

logger = logging.getLogger("astra.forecasting.router")
router = APIRouter()

VALID_CHANNELS = list(CHANNEL_THRESHOLDS.keys())


@router.get("/channel/{channel_id}")
async def get_channel_forecast(
    channel_id: str,
    spacecraft_id: str = Query(default="ASTRA-ALPHA"),
):
    """
    Returns live projected trajectory (30 steps) and runway countdown
    for a single telemetry channel.
    """
    ch = channel_id.lower().strip()
    if ch not in VALID_CHANNELS:
        return {
            "error": f"Unknown channel '{channel_id}'. Valid channels: {VALID_CHANNELS}",
            "spacecraft_id": spacecraft_id.upper(),
            "channel": ch,
        }
    result = forecasting_service.compute_forecast(spacecraft_id, ch)
    result["channel"] = ch
    result["spacecraft_id"] = spacecraft_id.upper()
    return result


@router.get("/summary")
async def get_forecast_summary(
    spacecraft_id: str = Query(default="ASTRA-ALPHA"),
):
    """Returns full forecasting summary for all telemetry channels on a spacecraft."""
    return forecasting_service.get_forecast_summary(spacecraft_id)


@router.get("/alarms")
async def get_active_alarms(
    spacecraft_id: str = Query(default="ASTRA-ALPHA"),
):
    """Returns only channels with active alarming runway countdowns."""
    alarms = forecasting_service.get_all_active_alarms(spacecraft_id)
    return {
        "spacecraft_id": spacecraft_id.upper(),
        "alarm_count": len(alarms),
        "alarms": alarms,
    }
