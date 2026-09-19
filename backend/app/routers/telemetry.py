from fastapi import APIRouter, Query, Body, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from app.services.telemetry_service import telemetry_service
from app.storage.event_store import event_store
from app.gemini.client import gemini_service

router = APIRouter()


class TelemetryIngestRequest(BaseModel):
    channel: str = Field(default="P-3", description="Channel identifier (e.g., P-3)")
    timestamp: int = Field(..., description="Timestamp index or sequence counter")
    value: float = Field(..., description="Numerical telemetry reading")


class SimulationModeRequest(BaseModel):
    mode: str = Field(..., description="Mode: 'nominal', 'nasa_p3', or 'crisis'")
    start_index: int = Field(default=5200, description="Start index if nasa_p3")


@router.get("/health")
def health_check():
    """
    Health check verifying detector status and Gemini readiness.
    """
    return {
        "status": "HEALTHY",
        "service": "ASTRA Mission Control Backend",
        "detector": {
            "channel": telemetry_service.detector.channel,
            "threshold": telemetry_service.detector.threshold,
            "max_gap": telemetry_service.detector.max_gap,
            "buffer": telemetry_service.detector.buffer,
            "merge_gap": telemetry_service.detector.merge_gap,
            "loaded": True
        },
        "gemini": {
            "configured": gemini_service.is_configured(),
            "model": gemini_service.model_name
        },
        "nasa_p3_dataset_loaded": telemetry_service.p3_data is not None,
        "total_p3_points": telemetry_service.p3_total_points
    }


@router.post("/telemetry")
def ingest_telemetry(payload: TelemetryIngestRequest):
    """
    Ingest single telemetry reading and run through P3AnomalyDetector.
    """
    result = telemetry_service.process_external_point(
        channel=payload.channel,
        value=payload.value,
        timestamp=payload.timestamp
    )
    return result


@router.get("/metrics")
def get_benchmarks():
    """
    Returns separate metrics for:
    1. Overall 68-channel NASA benchmark
    2. P-3 specific demonstration
    As mandated by ASTRA_BACKEND_HANDOFF.md (Section 4).
    """
    return {
        "nasa_68_channel_benchmark": {
            "description": "Evaluated across 68 telemetry channels and 87 NASA anomaly events",
            "channels_evaluated": 68,
            "total_anomaly_events": 87,
            "accuracy": 80.39,
            "precision": 24.11,
            "recall": 33.80,
            "f1_score": 28.14,
            "event_detection_rate": 81.61,
            "detected_events": "71/87"
        },
        "p3_demonstration": {
            "description": "P-3 Telemetry change detection with event grouping and merging",
            "channel": "P-3",
            "accuracy": 96.70,
            "precision": 99.91,
            "recall": 79.12,
            "f1_score": 88.30,
            "event_detection_rate": 100.0,
            "verified_event": "5400 -> 6656 (100% caught)",
            "warning": "Do not describe 96.70% as the overall ASTRA accuracy. It is the P-3 demonstration result."
        }
    }


@router.get("/simulation/p3/data")
def get_p3_data_window(
    start: int = Query(default=5200, ge=0),
    count: int = Query(default=1800, le=10000)
):
    """
    Retrieve raw NASA P-3 data window around event 5400->6656 for visual plotting.
    """
    samples = telemetry_service.get_p3_samples(start=start, count=count)
    return {
        "channel": "P-3",
        "start_index": start,
        "count": len(samples),
        "event_range": [5400, 6656],
        "samples": samples
    }


@router.post("/simulation/mode")
def set_simulation_mode(payload: SimulationModeRequest):
    """
    Control real-time stream playback mode ('nominal', 'nasa_p3', or 'crisis').
    """
    telemetry_service.set_mode(payload.mode, payload.start_index)
    return {
        "message": f"Simulation mode updated to '{payload.mode}'",
        "mode": payload.mode,
        "start_index": payload.start_index
    }


@router.get("/audit-log")
def get_audit_log(limit: int = Query(default=50, le=200)):
    """
    Retrieve mission control audit trail and operator approvals.
    """
    return event_store.list_audit_log(limit=limit)
