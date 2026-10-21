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

        # Constellation Fleet Nodes Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS spacecraft_nodes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                orbit_regime TEXT NOT NULL,
                status TEXT NOT NULL,
                health_score REAL NOT NULL,
                last_ping TEXT
            );
        """)

        # Inter-Satellite Link (ISL) Mesh Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS isl_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_sat TEXT NOT NULL,
                target_sat TEXT NOT NULL,
                latency_ms REAL NOT NULL,
                packet_loss_pct REAL NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_epoch ON audit_log(timestamp_epoch DESC);")

        # Seed default constellation spacecraft nodes if not present
        cursor.execute("SELECT COUNT(*) as cnt FROM spacecraft_nodes;")
        count = cursor.fetchone()["cnt"]
        if count == 0:
            now_iso = "2026-10-21T12:00:00Z"
            cursor.executemany("""
                INSERT INTO spacecraft_nodes (id, name, orbit_regime, status, health_score, last_ping)
                VALUES (?, ?, ?, ?, ?, ?)
            """, [
                ("ASTRA-ALPHA", "ASTRA-Alpha (Flagship)", "LEO-SSO (520 km)", "NOMINAL", 98.6, now_iso),
                ("ASTRA-BETA", "ASTRA-Beta (Relay Node)", "LEO-POLAR (680 km)", "NOMINAL", 97.4, now_iso),
                ("ASTRA-GAMMA", "ASTRA-Gamma (Observation)", "MEO (2,000 km)", "WARNING", 89.1, now_iso),
            ])
            logger.info("Seeded 3 default constellation spacecraft nodes: ALPHA, BETA, GAMMA")

        # Seed default ISL mesh links if not present
        cursor.execute("SELECT COUNT(*) as cnt FROM isl_links;")
        link_count = cursor.fetchone()["cnt"]
        if link_count == 0:
            now_iso = "2026-10-21T12:00:00Z"
            cursor.executemany("""
                INSERT INTO isl_links (source_sat, target_sat, latency_ms, packet_loss_pct, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, [
                ("ASTRA-ALPHA", "ASTRA-BETA", 18.4, 0.01, now_iso),
                ("ASTRA-BETA", "ASTRA-GAMMA", 34.2, 0.03, now_iso),
                ("ASTRA-GAMMA", "ASTRA-ALPHA", 28.6, 0.02, now_iso),
            ])
            logger.info("Seeded default Inter-Satellite Link (ISL) mesh topology")
        
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


def db_list_spacecraft_nodes() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM spacecraft_nodes ORDER BY id ASC;")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warning(f"Error listing spacecraft nodes: {e}")
        return []


def db_get_spacecraft_node(node_id: str) -> Optional[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM spacecraft_nodes WHERE id = ?;", (node_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.warning(f"Error getting spacecraft node {node_id}: {e}")
        return None


def db_update_spacecraft_node(node_id: str, status: Optional[str] = None, health_score: Optional[float] = None, last_ping: Optional[str] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        updates = []
        params = []
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if health_score is not None:
            updates.append("health_score = ?")
            params.append(health_score)
        if last_ping is not None:
            updates.append("last_ping = ?")
            params.append(last_ping)
        if updates:
            params.append(node_id)
            cursor.execute(f"UPDATE spacecraft_nodes SET {', '.join(updates)} WHERE id = ?;", tuple(params))
            conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error updating spacecraft node {node_id}: {e}")


def db_list_isl_links() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM isl_links ORDER BY id ASC;")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warning(f"Error listing ISL links: {e}")
        return []


def db_update_isl_link(source_sat: str, target_sat: str, latency_ms: float, packet_loss_pct: float, updated_at: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE isl_links 
            SET latency_ms = ?, packet_loss_pct = ?, updated_at = ?
            WHERE (source_sat = ? AND target_sat = ?) OR (source_sat = ? AND target_sat = ?);
        """, (latency_ms, packet_loss_pct, updated_at, source_sat, target_sat, target_sat, source_sat))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error updating ISL link between {source_sat} and {target_sat}: {e}")

