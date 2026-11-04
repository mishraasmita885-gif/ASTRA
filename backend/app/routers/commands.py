"""
ASTRA Secure Command Uplink REST Endpoints
Handles cryptographic HMAC-SHA256 authorization, 10-second countdown abort window,
and live transmission handshakes.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.crypto_service import crypto_service
from app.routers.websocket import manager

logger = logging.getLogger("astra.commands_router")
router = APIRouter()


class CommandAuthorizeRequest(BaseModel):
    operator_id: str = "Flight Director Gene Kranz"
    operator_role: str = "FLIGHT_DIRECTOR"
    command_code: str = "CMD_CONTINGENCY"
    command_name: str = "Contingency Uplink"
    subsystem: str = "EPS"
    spacecraft_id: str = "ASTRA-ALPHA"
    anomaly_id: Optional[str] = None
    severity: str = "HIGH"
    window_seconds: float = 10.0


class CommandAbortRequest(BaseModel):
    operator_id: str = "Flight Director Gene Kranz"
    reason: str = "Operator manual abort during T-10s countdown window"


class CommandTransmitRequest(BaseModel):
    operator_id: str = "Flight Director Gene Kranz"
    verification_hash: Optional[str] = None


@router.post("/{command_id}/authorize")
async def authorize_command_uplink(command_id: str, req: CommandAuthorizeRequest):
    """
    Validates Flight Director clearance, calculates SHA-256 HMAC cryptographic token,
    and initiates the 10.0-second countdown abort window.
    """
    # Enforce strict Role-Based Access Control (RBAC)
    if req.operator_role != "FLIGHT_DIRECTOR":
        logger.warning(f"Unauthorized command authorization attempt on {command_id} by {req.operator_id} (Role: {req.operator_role})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS DENIED: Flight Director clearance is required to authorize spacecraft command uplinks."
        )

    window = crypto_service.create_abort_window(
        command_id=command_id,
        operator_id=req.operator_id,
        command_code=req.command_code,
        command_name=req.command_name,
        subsystem=req.subsystem,
        spacecraft_id=req.spacecraft_id,
        anomaly_id=req.anomaly_id,
        severity=req.severity,
        window_seconds=req.window_seconds,
    )

    # Broadcast handshake initiation to WebSocket telemetry clients
    await manager.broadcast({
        "type": "COMMAND_HANDSHAKE_INITIATED",
        "command_id": command_id,
        "signature": window["signature"],
        "short_fingerprint": window["short_fingerprint"],
        "window_seconds": req.window_seconds,
        "expires_at_epoch": window["expires_at_epoch"],
        "command_name": req.command_name,
        "subsystem": req.subsystem,
    })

    return window


@router.post("/{command_id}/abort")
async def abort_command_uplink(command_id: str, req: CommandAbortRequest):
    """
    Aborts a pending command uplink during the 10-second countdown window.
    """
    result = crypto_service.abort_command(
        command_id=command_id,
        operator_id=req.operator_id,
        reason=req.reason,
    )

    # Broadcast abort to WebSocket clients
    await manager.broadcast({
        "type": "COMMAND_ABORTED",
        "command_id": command_id,
        "operator_id": req.operator_id,
        "reason": req.reason,
    })

    return result


@router.post("/{command_id}/transmit")
async def transmit_command_uplink(command_id: str, req: CommandTransmitRequest):
    """
    Triggered upon countdown completion to commit the cryptographically signed command
    to the permanent SQLite audit ledger and transmit to the spacecraft.
    """
    result = crypto_service.transmit_command(
        command_id=command_id,
        operator_id=req.operator_id,
        verification_hash=req.verification_hash,
    )

    # Broadcast successful transmission over WebSocket
    await manager.broadcast({
        "type": "COMMAND_TRANSMITTED",
        "command_id": command_id,
        "status": "UPLINK_TRANSMITTED",
        "crypto_hash": result["crypto_hash"],
        "transmission_timestamp": result["transmission_timestamp"],
        "operator_id": req.operator_id,
    })

    return result


@router.get("/staged")
async def list_staged_commands(spacecraft_id: Optional[str] = None):
    """Lists all cryptographically staged commands from SQLite."""
    return crypto_service.list_staged(spacecraft_id)


@router.get("/{command_id}")
async def get_command_status(command_id: str):
    """Retrieves status and cryptographic signature details for a command."""
    window = crypto_service.get_window(command_id)
    if not window:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Command {command_id} not found."
        )
    return window

