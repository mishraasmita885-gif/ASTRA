"""
ASTRA Automated Contingency Runbooks & Multi-Step Playbooks REST Router
Exposes playbook library, custom playbook creation, RBAC-enforced async execution,
and immediate mid-flight abort controls.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.runbook_engine import runbook_engine
from app.storage.event_store import event_store

logger = logging.getLogger("astra.runbooks_router")
router = APIRouter()


class RunbookStepModel(BaseModel):
    step_number: Optional[int] = None
    command_code: str = Field(..., min_length=2)
    action_title: str = Field(..., min_length=2)
    description: str = ""
    target_channel: str = "P-3"
    metric_key: Optional[str] = None
    unit: Optional[str] = None
    verification_operator: str = Field(default="BETWEEN", pattern="^(>|<|BETWEEN)$")
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    required_ticks: int = Field(default=3, ge=1, le=10)
    timeout_seconds: float = Field(default=18.0, ge=4.0, le=120.0)


class RunbookCreateRequest(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=3)
    subsystem: str = Field(default="EPS")
    description: str = ""
    steps: List[RunbookStepModel] = Field(..., min_length=1)
    operator_role: str = "FLIGHT_DIRECTOR"


class RunbookExecuteRequest(BaseModel):
    operator_id: str = "Flight Director Gene Kranz"
    operator_role: str = "FLIGHT_DIRECTOR"
    spacecraft_id: str = "ASTRA-ALPHA"


class RunbookAbortRequest(BaseModel):
    operator_id: str = "Flight Director Gene Kranz"
    operator_role: str = "FLIGHT_DIRECTOR"
    reason: str = "Manual operator abort requested"


@router.get("")
@router.get("/")
async def list_runbooks_and_executions():
    """List all seeded/custom contingency runbooks and active/historical execution states."""
    return {
        "runbooks": runbook_engine.list_runbooks(),
        "executions": runbook_engine.list_executions(limit=25),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_custom_runbook(req: RunbookCreateRequest):
    """Create and persist a custom multi-step contingency playbook in SQLite astra.db."""
    if req.operator_role != "FLIGHT_DIRECTOR":
        event_store.add_audit_entry(
            type_="WARNING",
            subsystem="RUNBOOKS (RBAC)",
            event=f"ACCESS DENIED: Role {req.operator_role} attempted to create custom runbook '{req.title}'.",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS DENIED: Flight Director clearance is required to create or modify contingency runbooks.",
        )

    for step in req.steps:
        if step.verification_operator == "BETWEEN" and (step.threshold_min is None or step.threshold_max is None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step '{step.action_title}' with operator BETWEEN requires both threshold_min and threshold_max.",
            )
        if step.verification_operator == ">" and step.threshold_min is None and step.threshold_max is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step '{step.action_title}' with operator '>' requires threshold_min.",
            )
        if step.verification_operator == "<" and step.threshold_max is None and step.threshold_min is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step '{step.action_title}' with operator '<' requires threshold_max.",
            )

    runbook = runbook_engine.create_runbook(req.model_dump())
    return {"runbook": runbook}


@router.post("/{runbook_id}/execute")
async def execute_runbook(runbook_id: str, req: RunbookExecuteRequest):
    """Enforce FLIGHT_DIRECTOR RBAC clearance and launch the async telemetry-gated state machine."""
    if req.operator_role != "FLIGHT_DIRECTOR":
        logger.warning(f"RBAC blocked runbook execution on {runbook_id} for {req.operator_id} ({req.operator_role})")
        event_store.add_audit_entry(
            type_="WARNING",
            subsystem="RUNBOOKS (RBAC)",
            event=f"ACCESS DENIED: {req.operator_id} ({req.operator_role}) blocked from executing runbook {runbook_id}.",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS DENIED: Flight Director clearance is required to execute contingency runbooks.",
        )

    try:
        execution = await runbook_engine.start_execution(
            runbook_id=runbook_id,
            authorized_by=req.operator_id,
            spacecraft_id=req.spacecraft_id,
        )
        return {"execution": execution, "execution_id": execution["execution_id"]}
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/executions/{execution_id}/abort")
async def abort_runbook_execution(execution_id: str, req: RunbookAbortRequest):
    """Immediately halt an active runbook execution between steps and commit an abort record."""
    if req.operator_role != "FLIGHT_DIRECTOR":
        event_store.add_audit_entry(
            type_="WARNING",
            subsystem="RUNBOOKS (RBAC)",
            event=f"ACCESS DENIED: {req.operator_id} ({req.operator_role}) blocked from aborting execution {execution_id}.",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS DENIED: Flight Director clearance is required to abort contingency runbooks.",
        )

    try:
        execution = await runbook_engine.abort_execution(
            execution_id=execution_id,
            operator_id=req.operator_id,
            reason=req.reason,
        )
        return {"execution": execution}
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
