from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from app.services.telemetry_service import telemetry_service
from app.storage.db import db_list_spacecraft_nodes, db_list_isl_links, db_update_spacecraft_node
from app.storage.event_store import event_store

router = APIRouter()


class SpacecraftSwitchRequest(BaseModel):
    spacecraft_id: str = Field(..., description="Target spacecraft ID (e.g. ASTRA-ALPHA, ASTRA-BETA, ASTRA-GAMMA)")


@router.get("/status")
def get_fleet_status():
    """
    Returns aggregated constellation health metrics, subsystem states, 
    and ISL mesh matrix for all spacecraft nodes.
    """
    live_status = telemetry_service.get_fleet_status()
    db_nodes = db_list_spacecraft_nodes()
    if db_nodes:
        # Merge DB persisted metadata if available
        live_dict = {n["id"]: n for n in live_status["nodes"]}
        for db_n in db_nodes:
            if db_n["id"] in live_dict:
                live_dict[db_n["id"]]["orbit_regime"] = db_n.get("orbit_regime", live_dict[db_n["id"]]["orbit_regime"])
    return live_status


@router.get("/isl-topology")
def get_isl_topology():
    """
    Returns structured node-to-node latency and packet loss links 
    for Inter-Satellite Link (ISL) mesh network topology visualization.
    """
    return telemetry_service.get_isl_topology()


@router.get("/nodes")
def list_spacecraft_nodes():
    """
    List all active constellation spacecraft nodes.
    """
    return {
        "active_spacecraft": telemetry_service.active_spacecraft,
        "nodes": list(telemetry_service.spacecraft_nodes.values()),
        "total_nodes": len(telemetry_service.spacecraft_nodes)
    }


@router.post("/switch")
def switch_active_spacecraft(payload: SpacecraftSwitchRequest):
    """
    Switch ground operator focus to another spacecraft in the constellation.
    """
    clean_id = payload.spacecraft_id.strip().upper()
    success = telemetry_service.set_spacecraft(clean_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Invalid spacecraft ID '{payload.spacecraft_id}'")

    event_store.add_audit_entry(
        type_="COMMAND_UPLINK",
        subsystem=f"FLEET ({clean_id})",
        event=f"STREAM RECONFIGURED: Switched ground telemetry monitoring focus to constellation node {clean_id}."
    )

    return {
        "message": f"Active spacecraft switched to {clean_id}",
        "active_spacecraft": clean_id,
        "spacecraft": telemetry_service.spacecraft_nodes[clean_id]
    }
