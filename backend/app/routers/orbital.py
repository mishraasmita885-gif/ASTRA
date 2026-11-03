"""
ASTRA Orbital Mechanics & SGP4 REST Router
Endpoints:
- GET /api/v1/orbital/current-state
- GET /api/v1/orbital/ground-track
- GET /api/v1/orbital/dsn-passes
- GET /api/v1/orbital/saa-status
"""
from fastapi import APIRouter, Query
from app.services.orbital_service import orbital_service

router = APIRouter()


@router.get("/current-state")
async def get_current_state(spacecraft_id: str = Query(default="ASTRA-ALPHA")):
    """
    Computes and returns the exact live geodetic coordinates for the active spacecraft
    at the current UTC second.
    """
    return await orbital_service.get_current_state(spacecraft_id)


@router.get("/ground-track")
async def get_ground_track(
    spacecraft_id: str = Query(default="ASTRA-ALPHA"),
    minutes_back: int = Query(default=45, ge=0, le=180),
    minutes_forward: int = Query(default=45, ge=0, le=180),
    step_seconds: int = Query(default=30, ge=10, le=300),
):
    """
    Computes historical and projected ground track path (array of [lat, lon, timestamp])
    sampled every step_seconds across the specified orbital window.
    """
    return await orbital_service.get_ground_track(spacecraft_id, minutes_back, minutes_forward, step_seconds)


@router.get("/dsn-passes")
async def get_dsn_passes(spacecraft_id: str = Query(default="ASTRA-ALPHA")):
    """
    Calculates real-time line-of-sight acquisition of signal (AOS) and loss of signal (LOS)
    windows for core Deep Space Network (DSN) ground stations (Goldstone, Madrid, Canberra).
    """
    return await orbital_service.get_dsn_passes(spacecraft_id)


@router.get("/saa-status")
async def get_saa_status(spacecraft_id: str = Query(default="ASTRA-ALPHA")):
    """
    Checks if the spacecraft's current live geodetic coordinates fall inside the
    South Atlantic Anomaly (SAA) bounding polygon.
    """
    return await orbital_service.get_saa_status(spacecraft_id)

