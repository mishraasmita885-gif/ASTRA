import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("astra.storage")


class AnomalyEvent(BaseModel):
    event_id: str
    channel: str = "P-3"
    detector: str = "change_detection"
    start_timestamp: int
    end_timestamp: int
    duration: int
    anomaly_score: float = 0.52
    status: str = "ANOMALY_DETECTED"  # ANOMALY_DETECTED | ANALYZING | UNDER_REVIEW | APPROVED | REJECTED | RESOLVED
    operator_approval_required: bool = True
    operator_decision: Optional[Dict[str, Any]] = None  # { approved: bool, officer: str, timestamp: str, note: str }
    gemini_analysis: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AuditLogEntry(BaseModel):
    id: str
    time: str
    timestamp_epoch: float
    type: str  # NOMINAL | WARNING | CRITICAL | AI_ACTION | OPERATOR_APPROVAL
    subsystem: str
    event: str
    telemetry_summary: Optional[Dict[str, Any]] = None


def _dump(item: Any) -> Dict[str, Any]:
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return item.dict()


from app.storage.db import init_db, db_save_event, db_save_audit_entry, db_list_events, db_list_audit_entries

class EventStore:
    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path or (Path(__file__).parent / "event_store.json")
        self._events: Dict[str, AnomalyEvent] = {}
        self._audit_log: List[AuditLogEntry] = []
        self._counter: int = 1
        
        init_db()
        if not self._load_from_disk():
            self._seed_initial_data()
            self._save_to_disk()

    def _save_to_disk(self):
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "counter": self._counter,
                "events": {k: _dump(v) for k, v in self._events.items()},
                "audit_log": [_dump(e) for e in self._audit_log],
            }
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to persist event store to {self.storage_path}: {e}")

    def _load_from_disk(self) -> bool:
        # Check SQLite first
        try:
            sqlite_events = db_list_events()
            if sqlite_events:
                self._events = {e["event_id"]: AnomalyEvent(**e) for e in sqlite_events}
                sqlite_audit = db_list_audit_entries(200)
                self._audit_log = [AuditLogEntry(**a) for a in sqlite_audit]
                self._counter = max(len(self._events), 1)
                logger.info(f"Loaded {len(self._events)} events from SQLite database")
                return True
        except Exception as err:
            logger.warning(f"SQLite initial load notice: {err}")

        if not self.storage_path.exists():
            return False
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            raw_events = data.get("events", {})
            self._events = {k: AnomalyEvent(**v) for k, v in raw_events.items()}
            raw_audit = data.get("audit_log", [])
            self._audit_log = [AuditLogEntry(**e) for e in raw_audit]
            self._counter = data.get("counter", max(len(self._events), 1))
            logger.info(f"Loaded {len(self._events)} events and {len(self._audit_log)} audit entries from {self.storage_path}")
            
            # Sync loaded events to SQLite
            for ev in self._events.values():
                db_save_event(_dump(ev))
            for au in self._audit_log:
                db_save_audit_entry(_dump(au))
            return True
        except Exception as e:
            logger.warning(f"Failed to load event store from disk ({e}); seeding fresh data")
            return False

    def _seed_initial_data(self):
        # Initial event for P-3 baseline
        initial_evt = AnomalyEvent(
            event_id="ASTRA-P3-0001",
            channel="P-3",
            detector="change_detection",
            start_timestamp=5400,
            end_timestamp=6656,
            duration=1257,
            anomaly_score=0.91,
            status="ANOMALY_DETECTED",
            operator_approval_required=True,
            gemini_analysis={
                "diagnosis": "Telemetry pattern on channel P-3 is consistent with an abnormal subsystem state requiring diagnostic isolation.",
                "severity": "HIGH",
                "confidence": 0.91,
                "evidence": [
                    "Channel P-3 telemetry step-change exceeded learned validation threshold (0.3889).",
                    "Anomaly deviation persisted across 1257 telemetry cycles (index 5400 to 6656).",
                    "Peak change magnitude recorded at 0.9100 units."
                ],
                "recommendation": "Place channel P-3 and associated subsystem under active operator review. Verify bus/thermal margins and assess execution of contingency safe-state protocol CMD_SAFE_P3.",
                "operator_approval_required": True
            }
        )
        self._events[initial_evt.event_id] = initial_evt

        now_str = datetime.now().strftime("%H:%M:%S")
        self._audit_log.append(AuditLogEntry(
            id=f"evt_{int(time.time()*1000)}",
            time=now_str,
            timestamp_epoch=time.time(),
            type="WARNING",
            subsystem="INSTRUMENTATION (P-3)",
            event="P-3 Change detector initialized. Baseline threshold loaded: 0.3888857."
        ))

    def create_event(
        self,
        channel: str,
        start_timestamp: int,
        end_timestamp: int,
        duration: int,
        score: float,
        detector: str = "change_detection"
    ) -> AnomalyEvent:
        self._counter += 1
        event_id = f"ASTRA-{channel}-{self._counter:04d}"
        now_iso = datetime.now(timezone.utc).isoformat()
        
        event = AnomalyEvent(
            event_id=event_id,
            channel=channel,
            detector=detector,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp,
            duration=duration,
            anomaly_score=round(score, 4),
            status="ANOMALY_DETECTED",
            operator_approval_required=True,
            created_at=now_iso,
            updated_at=now_iso
        )
        self._events[event_id] = event
        db_save_event(_dump(event))
        self.add_audit_entry(
            type_="CRITICAL",
            subsystem=f"CHANNEL {channel}",
            event=f"Anomaly event {event_id} flagged: steps {start_timestamp} -> {end_timestamp} (duration: {duration})."
        )
        return event

    def get_event(self, event_id: str) -> Optional[AnomalyEvent]:
        return self._events.get(event_id)

    def list_events(self) -> List[AnomalyEvent]:
        return sorted(list(self._events.values()), key=lambda e: e.start_timestamp, reverse=True)

    def update_event_span(
        self,
        event_id: str,
        end_timestamp: int,
        duration: int,
        score: Optional[float] = None
    ) -> Optional[AnomalyEvent]:
        event = self._events.get(event_id)
        if not event:
            return None
        if end_timestamp > event.end_timestamp:
            event.end_timestamp = end_timestamp
            event.duration = max(event.duration, duration)
            if score is not None and score > event.anomaly_score:
                event.anomaly_score = round(score, 4)
            event.updated_at = datetime.now(timezone.utc).isoformat()
            db_save_event(_dump(event))
            self._save_to_disk()
        return event

    def update_gemini_analysis(self, event_id: str, analysis: Dict[str, Any]) -> Optional[AnomalyEvent]:
        event = self._events.get(event_id)
        if not event:
            return None
        event.gemini_analysis = analysis
        event.status = "UNDER_REVIEW"
        event.updated_at = datetime.now(timezone.utc).isoformat()
        db_save_event(_dump(event))

        self.add_audit_entry(
            type_="AI_ACTION",
            subsystem=f"REASONER ({event.channel})",
            event=f"Gemini diagnosis generated for {event_id}. Severity: {analysis.get('severity')}. Operator sign-off required."
        )
        return event

    def approve_event(self, event_id: str, approved: bool, officer: str = "Flight Director", note: str = "") -> Optional[AnomalyEvent]:
        event = self._events.get(event_id)
        if not event:
            return None
        
        status = "APPROVED" if approved else "REJECTED"
        event.status = status
        event.operator_decision = {
            "approved": approved,
            "officer": officer,
            "note": note,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        event.updated_at = datetime.now(timezone.utc).isoformat()
        db_save_event(_dump(event))

        self.add_audit_entry(
            type_="OPERATOR_APPROVAL",
            subsystem=f"FLIGHT CONTROL ({officer})",
            event=f"Action on {event_id} marked as {status} by {officer}. Note: {note or 'Standard procedure executed.'}"
        )
        return event

    def resolve_event(self, event_id: str, reason: str = "Nominal telemetry restored.") -> Optional[AnomalyEvent]:
        event = self._events.get(event_id)
        if not event:
            return None
        event.status = "RESOLVED"
        event.updated_at = datetime.now(timezone.utc).isoformat()
        db_save_event(_dump(event))
        self.add_audit_entry(
            type_="NOMINAL",
            subsystem=f"RECOVERY ({event.channel})",
            event=f"Anomaly event {event_id} marked as RESOLVED. {reason}"
        )
        return event

    def add_audit_entry(self, type_: str, subsystem: str, event: str, telemetry_summary: Optional[Dict[str, Any]] = None):
        now_str = datetime.now().strftime("%H:%M:%S")
        entry = AuditLogEntry(
            id=f"evt_{int(time.time()*1000)}",
            time=now_str,
            timestamp_epoch=time.time(),
            type=type_,
            subsystem=subsystem,
            event=event,
            telemetry_summary=telemetry_summary
        )
        self._audit_log.insert(0, entry)
        if len(self._audit_log) > 200:
            self._audit_log.pop()
        db_save_audit_entry(_dump(entry))
        self._save_to_disk()

    def list_audit_log(self, limit: int = 50) -> List[AuditLogEntry]:
        return self._audit_log[:limit]


event_store = EventStore()
