import sqlite3
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("astra.db")

DB_PATH = Path(__file__).parent / "astra.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                channel TEXT NOT NULL,
                detector TEXT NOT NULL,
                start_timestamp INTEGER NOT NULL,
                end_timestamp INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                anomaly_score REAL NOT NULL,
                status TEXT NOT NULL,
                operator_approval_required INTEGER DEFAULT 1,
                operator_decision TEXT,
                gemini_analysis TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        
        # Audit Log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                time TEXT NOT NULL,
                timestamp_epoch REAL NOT NULL,
                type TEXT NOT NULL,
                subsystem TEXT NOT NULL,
                event TEXT NOT NULL,
                telemetry_summary TEXT
            );
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_epoch ON audit_log(timestamp_epoch DESC);")
        
        conn.commit()
        conn.close()
        logger.info(f"SQLite Relational Database initialized at {DB_PATH}")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {e}")


def db_save_event(event_dict: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO events (
                event_id, channel, detector, start_timestamp, end_timestamp, duration,
                anomaly_score, status, operator_approval_required, operator_decision,
                gemini_analysis, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_dict.get("event_id"),
            event_dict.get("channel", "P-3"),
            event_dict.get("detector", "change_detection"),
            int(event_dict.get("start_timestamp", 0)),
            int(event_dict.get("end_timestamp", 0)),
            int(event_dict.get("duration", 0)),
            float(event_dict.get("anomaly_score", 0.0)),
            event_dict.get("status", "ANOMALY_DETECTED"),
            1 if event_dict.get("operator_approval_required", True) else 0,
            json.dumps(event_dict.get("operator_decision")) if event_dict.get("operator_decision") else None,
            json.dumps(event_dict.get("gemini_analysis")) if event_dict.get("gemini_analysis") else None,
            event_dict.get("created_at"),
            event_dict.get("updated_at")
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error persisting event to SQLite: {e}")


def db_save_audit_entry(audit_dict: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO audit_log (
                id, time, timestamp_epoch, type, subsystem, event, telemetry_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_dict.get("id"),
            audit_dict.get("time"),
            float(audit_dict.get("timestamp_epoch", 0.0)),
            audit_dict.get("type"),
            audit_dict.get("subsystem"),
            audit_dict.get("event"),
            json.dumps(audit_dict.get("telemetry_summary")) if audit_dict.get("telemetry_summary") else None
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error persisting audit entry to SQLite: {e}")


def db_list_events() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events ORDER BY start_timestamp DESC;")
        rows = cursor.fetchall()
        conn.close()
        results = []
        for row in rows:
            d = dict(row)
            if d.get("operator_decision"):
                d["operator_decision"] = json.loads(d["operator_decision"])
            if d.get("gemini_analysis"):
                d["gemini_analysis"] = json.loads(d["gemini_analysis"])
            d["operator_approval_required"] = bool(d.get("operator_approval_required", 1))
            results.append(d)
        return results
    except Exception as e:
        logger.warning(f"Error loading events from SQLite: {e}")
        return []


def db_list_audit_entries(limit: int = 50) -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_log ORDER BY timestamp_epoch DESC LIMIT ?;", (limit,))
        rows = cursor.fetchall()
        conn.close()
        results = []
        for row in rows:
            d = dict(row)
            if d.get("telemetry_summary"):
                d["telemetry_summary"] = json.loads(d["telemetry_summary"])
            results.append(d)
        return results
    except Exception as e:
        logger.warning(f"Error loading audit log from SQLite: {e}")
        return []
