from fastapi import APIRouter, HTTPException, Path, Body
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from app.storage.event_store import event_store
from app.gemini.client import gemini_service
from app.services.telemetry_service import telemetry_service

router = APIRouter()


class OperatorApprovalRequest(BaseModel):
    approved: bool = Field(..., description="True to approve contingency commands, False to reject")
    officer: str = Field(default="Flight Director", description="Callsign of the authorizing operator")
    note: str = Field(default="", description="Mission log rationale or execution memo")


@router.get("/events")
def list_anomaly_events():
    """
    Get all detected anomaly events.
    """
    return event_store.list_events()


@router.get("/events/{event_id}")
def get_anomaly_event(event_id: str = Path(..., description="Event ID, e.g. ASTRA-P3-0001")):
    """
    Retrieve single event details with Gemini reasoning and operator approval status.
    """
    event = event_store.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return event


@router.post("/events/{event_id}/analyze")
async def analyze_event_with_gemini(event_id: str = Path(..., description="Event ID to diagnose")):
    """
    Run Gemini AI reasoning on structured evidence for this anomaly event.
    Enforces structured output schema and human operator approval flags.
    """
    event = event_store.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    live_state = telemetry_service.current_state
    evidence_payload = {
        "channel": event.channel,
        "detector": event.detector,
        "start_timestamp": event.start_timestamp,
        "end_timestamp": event.end_timestamp,
        "duration": event.duration,
        "score": event.anomaly_score,
        "threshold": 0.3888857,
        "requires_operator_approval": True,
        "subsystem_context": {
            "bus_voltage": f"{live_state.get('voltage', 24.1)} V (nominal: 24.0 - 28.0 V)",
            "temperature": f"{live_state.get('temperature', 15.2)} °C (nominal: 10 - 30 °C)",
            "solar_input": f"{live_state.get('solar_input', 96.4)} % (nominal: > 80 %)",
            "battery_pct": f"{live_state.get('battery_pct', 98.4)} % (nominal: > 70 %)",
            "current_draw": f"{live_state.get('current_draw', 4.2)} A",
            "active_mode": live_state.get("mode", "nominal")
        }
    }

    gemini_result = await gemini_service.analyze_event(evidence_payload)
    updated_event = event_store.update_gemini_analysis(event_id, gemini_result.model_dump())
    
    return {
        "event_id": event_id,
        "analysis": gemini_result.model_dump(),
        "event": updated_event
    }


@router.post("/events/{event_id}/approve")
def approve_event_action(
    event_id: str = Path(..., description="Event ID requiring sign-off"),
    payload: OperatorApprovalRequest = Body(...)
):
    """
    Operator sign-off endpoint for human-in-the-loop decision making.
    Safety requirement: Autonomous execution of spacecraft commands is strictly prohibited.
    """
    event = event_store.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    updated = event_store.approve_event(
        event_id=event_id,
        approved=payload.approved,
        officer=payload.officer,
        note=payload.note
    )

    # If operator authorizes contingency uplink, immediately restore spacecraft to nominal baseline
    if payload.approved:
        telemetry_service.set_mode("nominal", 0)
        event_store.resolve_event(
            event_id=event_id,
            reason=f"Contingency commands authorized by {payload.officer}. Telemetry restored."
        )
        event_store.add_audit_entry(
            type_="NOMINAL",
            subsystem="FLIGHT RECOVERY",
            event=f"Contingency commands authorized for {event_id}. Spacecraft telemetry restored to nominal baseline."
        )

    return {
        "message": f"Action on {event_id} successfully recorded as {'APPROVED' if payload.approved else 'REJECTED'}",
        "event": updated
    }


class CopilotChatRequest(BaseModel):
    query: str = Field(..., description="Operator query or aerospace engineering prompt")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Recent conversation turns")


@router.post("/copilot/chat")
async def copilot_chat(payload: CopilotChatRequest = Body(...)):
    """
    Conversational aerospace copilot powered by Gemini reasoning engine.
    Ingests live telemetry context, active channel, and subsystem states.
    """
    live_state = telemetry_service.current_state
    active_channel = getattr(telemetry_service, "active_channel", "P-3")
    active_events = [e.model_dump() for e in event_store.list_events() if e.status != "RESOLVED"]

    context = {
        "active_channel": active_channel,
        "live_telemetry": live_state,
        "unresolved_anomalies": active_events[:3],
        "subsystems": {
            "bus_voltage": live_state.get("voltage", 24.1),
            "temperature": live_state.get("temperature", 15.2),
            "battery_pct": live_state.get("battery_pct", 98.4),
            "solar_input": live_state.get("solar_input", 96.4),
            "adcs_drift": live_state.get("adcs_drift", 0.02),
            "link_snr": live_state.get("link_snr", 12.4),
            "mode": live_state.get("mode", "nominal")
        }
    }

    result = await gemini_service.chat_copilot(
        query=payload.query,
        history=payload.history,
        context=context
    )
    return result

