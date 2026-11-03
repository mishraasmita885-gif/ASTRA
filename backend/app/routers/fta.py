"""
ASTRA FTA Router — Fault Tree Analysis REST Endpoint
GET /api/v1/fault-tree/active-cascade
"""
import logging
from fastapi import APIRouter, Query
from app.services.fta_service import fta_service
from app.services.telemetry_service import telemetry_service
from app.storage.event_store import event_store

logger = logging.getLogger("astra.fta_router")
router = APIRouter()


@router.get("/active-cascade")
async def get_active_cascade(
    spacecraft_id: str = Query(default="ASTRA-ALPHA", description="Spacecraft node identifier")
):
    """
    Returns the live cascading failure graph for a given spacecraft.
    All node statuses and live values are computed from current telemetry + active anomaly events.
    """
    sc_id = spacecraft_id.strip().upper()
    telemetry = telemetry_service.current_state
    active_events = event_store.list_events()

    graph = fta_service.build_cascade(
        spacecraft_id=sc_id,
        telemetry=telemetry,
        active_events=active_events,
    )
    return graph

