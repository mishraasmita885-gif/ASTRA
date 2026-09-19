from fastapi import APIRouter, HTTPException, Path, Body
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from app.storage.event_store import event_store
from app.gemini.client import gemini_service

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

    # Pass structured telemetry evidence to Gemini
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
            "bus_voltage": "24.1V nominal",
            "temperature": "15.2C nominal"
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
    return {
        "message": f"Action on {event_id} successfully recorded as {'APPROVED' if payload.approved else 'REJECTED'}",
        "event": updated
    }
