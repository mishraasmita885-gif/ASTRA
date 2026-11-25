import sqlite3
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("astra.db")

DB_PATH = Path(__file__).parent / "astra.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
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
                telemetry_summary TEXT,
                crypto_hash TEXT,
                signature_status TEXT,
                transmission_timestamp TEXT
            );
        """)
        # Ensure migration columns in existing audit_log
        for col in ["crypto_hash", "signature_status", "transmission_timestamp"]:
            try:
                cursor.execute(f"ALTER TABLE audit_log ADD COLUMN {col} TEXT;")
            except Exception:
                pass

        # Staged Cryptographic Commands Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS staged_commands (
                command_id TEXT PRIMARY KEY,
                anomaly_id TEXT,
                spacecraft_id TEXT DEFAULT 'ASTRA-ALPHA',
                subsystem TEXT NOT NULL,
                command_code TEXT NOT NULL,
                command_name TEXT NOT NULL,
                severity TEXT DEFAULT 'HIGH',
                status TEXT NOT NULL,
                crypto_hash TEXT,
                signature_status TEXT,
                authorized_by TEXT,
                transmission_timestamp TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
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

        # Automated Contingency Runbooks Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contingency_runbooks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subsystem TEXT NOT NULL,
                description TEXT NOT NULL,
                steps_json TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT
            );
        """)

        # Contingency Runbook Executions State & Audit Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS runbook_executions (
                execution_id TEXT PRIMARY KEY,
                runbook_id TEXT NOT NULL,
                runbook_title TEXT,
                spacecraft_id TEXT DEFAULT 'ASTRA-ALPHA',
                status TEXT NOT NULL,
                current_step INTEGER DEFAULT 1,
                authorized_by TEXT NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                step_states_json TEXT,
                failure_reason TEXT
            );
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_epoch ON audit_log(timestamp_epoch DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_runbook_exec_started ON runbook_executions(started_at DESC);")

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

        # Seed aerospace contingency runbooks tied dynamically to ASTRA's real channels
        cursor.execute("SELECT COUNT(*) as cnt FROM contingency_runbooks;")
        rb_count = cursor.fetchone()["cnt"]
        if rb_count == 0:
            now_iso = "2026-11-25T12:00:00Z"
            default_runbooks = [
                (
                    "RB-EPS-SOLAR-01",
                    "Emergency Solar Reconstitution Sequence",
                    "EPS",
                    "Multi-step recovery for photovoltaic array collapse and primary power bus undervoltage: sheds non-essential loads, deploys redundant wing P-1, and transfers instrumentation to regulated bus P-3.",
                    json.dumps([
                        {
                            "step_number": 1,
                            "command_code": "CMD_SHED_NON_ESSENTIAL",
                            "action_title": "Shed Non-Essential Payload & Heater Loads",
                            "description": "Isolate non-vital secondary loads on D-1 to halt bus drain before array switchover.",
                            "target_channel": "D-1",
                            "metric_key": "current_draw",
                            "unit": "A",
                            "verification_operator": "<",
                            "threshold_min": None,
                            "threshold_max": 12.0,
                            "required_ticks": 3,
                            "timeout_seconds": 18.0,
                        },
                        {
                            "step_number": 2,
                            "command_code": "CMD_DEPLOY_SOLAR_B",
                            "action_title": "Engage Redundant Starboard Solar Wing (P-1)",
                            "description": "Actuate backup solar wing bus relay and track sunline on channel P-1.",
                            "target_channel": "P-1",
                            "metric_key": "solar_input",
                            "unit": "%",
                            "verification_operator": ">",
                            "threshold_min": 75.0,
                            "threshold_max": None,
                            "required_ticks": 3,
                            "timeout_seconds": 20.0,
                        },
                        {
                            "step_number": 3,
                            "command_code": "CMD_STABILIZE_BUS_P3",
                            "action_title": "Transfer Instrumentation to Regulated Bus P-3",
                            "description": "Close S3R shunt regulator tie and verify primary bus P-3 within nominal 23.5–28.0 V envelope.",
                            "target_channel": "P-3",
                            "metric_key": "voltage",
                            "unit": "V",
                            "verification_operator": "BETWEEN",
                            "threshold_min": 23.5,
                            "threshold_max": 28.0,
                            "required_ticks": 3,
                            "timeout_seconds": 20.0,
                        },
                    ]),
                    now_iso,
                    now_iso,
                ),
                (
                    "RB-TCS-BATT-01",
                    "Battery Thermal Runaway Isolation",
                    "TCS",
                    "Isolates over-heating Li-Ion cell bank, opens emergency ammonia radiator bypass louvers on T-2, and verifies bus P-3 diode tie stability.",
                    json.dumps([
                        {
                            "step_number": 1,
                            "command_code": "CMD_ISOLATE_CELL_BANK_3",
                            "action_title": "Disconnect Compromised Li-Ion Cell Bank 3",
                            "description": "Open high-current contactor on compromised battery branch and limit discharge current on D-2.",
                            "target_channel": "D-2",
                            "metric_key": "current_draw",
                            "unit": "A",
                            "verification_operator": "<",
                            "threshold_min": None,
                            "threshold_max": 10.0,
                            "required_ticks": 3,
                            "timeout_seconds": 18.0,
                        },
                        {
                            "step_number": 2,
                            "command_code": "CMD_OPEN_RADIATOR_LOUVERS",
                            "action_title": "Open Emergency Ammonia Radiator Bypass Loop",
                            "description": "Command 100% thermal louver deployment and pump surge until core T-2 drops below 42.0 °C.",
                            "target_channel": "T-2",
                            "metric_key": "temperature",
                            "unit": "°C",
                            "verification_operator": "<",
                            "threshold_min": None,
                            "threshold_max": 42.0,
                            "required_ticks": 3,
                            "timeout_seconds": 22.0,
                        },
                        {
                            "step_number": 3,
                            "command_code": "CMD_VERIFY_BUS_DIODE_TIE",
                            "action_title": "Confirm Backup Bus Voltage & Cell Equilibrium",
                            "description": "Verify redundant power rail P-3 maintains 23.5–28.0 V with battery pack isolated.",
                            "target_channel": "P-3",
                            "metric_key": "voltage",
                            "unit": "V",
                            "verification_operator": "BETWEEN",
                            "threshold_min": 23.5,
                            "threshold_max": 28.0,
                            "required_ticks": 3,
                            "timeout_seconds": 20.0,
                        },
                    ]),
                    now_iso,
                    now_iso,
                ),
                (
                    "RB-EPS-BUS-01",
                    "Bus Undervoltage Load Shedding",
                    "EPS",
                    "Rapid two-stage recovery for NASA P-3 step-change anomalies and secondary bus brownouts via priority load shedding and shunt tie restoration.",
                    json.dumps([
                        {
                            "step_number": 1,
                            "command_code": "CMD_SHED_AUX_BUS",
                            "action_title": "Shed Auxiliary Instrument Loads on Bus P-2",
                            "description": "Drop non-critical science instrument rails to raise secondary bus P-2 above 20.0 V.",
                            "target_channel": "P-2",
                            "metric_key": "voltage",
                            "unit": "V",
                            "verification_operator": ">",
                            "threshold_min": 20.0,
                            "threshold_max": None,
                            "required_ticks": 3,
                            "timeout_seconds": 18.0,
                        },
                        {
                            "step_number": 2,
                            "command_code": "CMD_ENGAGE_SHUNT_REG",
                            "action_title": "Engage S3R Shunt Regulator on Channel P-3",
                            "description": "Lock primary regulated bus P-3 between 23.5 V and 28.0 V across 3 consecutive telemetry frames.",
                            "target_channel": "P-3",
                            "metric_key": "voltage",
                            "unit": "V",
                            "verification_operator": "BETWEEN",
                            "threshold_min": 23.5,
                            "threshold_max": 28.0,
                            "required_ticks": 3,
                            "timeout_seconds": 20.0,
                        },
                    ]),
                    now_iso,
                    now_iso,
                ),
                (
                    "RB-ADCS-DESAT-01",
                    "ADCS Wheel Desaturation & S-Band Relock",
                    "ADCS",
                    "Counteracts reaction wheel saturation and pointing drift on A-1, then re-acquires high-gain DSN Madrid-63 S-Band carrier lock on C-1.",
                    json.dumps([
                        {
                            "step_number": 1,
                            "command_code": "CMD_MOMENTUM_DUMP_RCS",
                            "action_title": "Execute Magnetorquer & RCS Momentum Dump",
                            "description": "Desaturate X/Y/Z reaction wheels until gyro drift rate A-1 stabilizes below 0.08 °/hr.",
                            "target_channel": "A-1",
                            "metric_key": "adcs_drift",
                            "unit": "°/hr",
                            "verification_operator": "<",
                            "threshold_min": None,
                            "threshold_max": 0.08,
                            "required_ticks": 3,
                            "timeout_seconds": 20.0,
                        },
                        {
                            "step_number": 2,
                            "command_code": "CMD_HGA_REPOINT_DSN",
                            "action_title": "Re-Point High-Gain Antenna to DSN Madrid-63",
                            "description": "Trim gimbal azimuth/elevation and confirm S-Band carrier SNR C-1 exceeds +11.0 dBm.",
                            "target_channel": "C-1",
                            "metric_key": "link_snr",
                            "unit": "dBm",
                            "verification_operator": ">",
                            "threshold_min": 11.0,
                            "threshold_max": None,
                            "required_ticks": 3,
                            "timeout_seconds": 20.0,
                        },
                    ]),
                    now_iso,
                    now_iso,
                ),
            ]
            cursor.executemany("""
                INSERT INTO contingency_runbooks (id, title, subsystem, description, steps_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, default_runbooks)
            logger.info("Seeded 4 aerospace contingency runbooks into SQLite astra.db")
        
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
                id, time, timestamp_epoch, type, subsystem, event, telemetry_summary,
                crypto_hash, signature_status, transmission_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_dict.get("id"),
            audit_dict.get("time"),
            float(audit_dict.get("timestamp_epoch", 0.0)),
            audit_dict.get("type"),
            audit_dict.get("subsystem"),
            audit_dict.get("event"),
            json.dumps(audit_dict.get("telemetry_summary")) if audit_dict.get("telemetry_summary") else None,
            audit_dict.get("crypto_hash"),
            audit_dict.get("signature_status"),
            audit_dict.get("transmission_timestamp")
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error persisting audit entry to SQLite: {e}")


def db_save_staged_command(cmd_dict: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO staged_commands (
                command_id, anomaly_id, spacecraft_id, subsystem, command_code, command_name,
                severity, status, crypto_hash, signature_status, authorized_by,
                transmission_timestamp, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cmd_dict.get("command_id"),
            cmd_dict.get("anomaly_id"),
            cmd_dict.get("spacecraft_id", "ASTRA-ALPHA"),
            cmd_dict.get("subsystem", "GENERAL"),
            cmd_dict.get("command_code", "CMD_DEFAULT"),
            cmd_dict.get("command_name", "Command"),
            cmd_dict.get("severity", "HIGH"),
            cmd_dict.get("status", "STAGED"),
            cmd_dict.get("crypto_hash"),
            cmd_dict.get("signature_status", "PENDING_ABORT_WINDOW"),
            cmd_dict.get("authorized_by"),
            cmd_dict.get("transmission_timestamp"),
            cmd_dict.get("created_at"),
            cmd_dict.get("updated_at")
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error persisting staged command to SQLite: {e}")


def db_get_staged_command(command_id: str) -> Optional[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staged_commands WHERE command_id = ?;", (command_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.warning(f"Error getting staged command {command_id}: {e}")
        return None


def db_list_staged_commands(spacecraft_id: Optional[str] = None) -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if spacecraft_id:
            cursor.execute("SELECT * FROM staged_commands WHERE spacecraft_id = ? ORDER BY created_at DESC;", (spacecraft_id,))
        else:
            cursor.execute("SELECT * FROM staged_commands ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warning(f"Error listing staged commands: {e}")
        return []


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


# ============================================================
# Automated Contingency Runbooks & Execution Persistence
# ============================================================

def db_list_runbooks() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contingency_runbooks ORDER BY subsystem ASC, id ASC;")
        rows = cursor.fetchall()
        conn.close()
        results = []
        for row in rows:
            d = dict(row)
            d["steps"] = json.loads(d.pop("steps_json", "[]"))
            results.append(d)
        return results
    except Exception as e:
        logger.warning(f"Error listing contingency runbooks: {e}")
        return []


def db_get_runbook(runbook_id: str) -> Optional[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contingency_runbooks WHERE id = ?;", (runbook_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["steps"] = json.loads(d.pop("steps_json", "[]"))
        return d
    except Exception as e:
        logger.warning(f"Error getting runbook {runbook_id}: {e}")
        return None


def db_save_runbook(runbook_dict: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO contingency_runbooks (
                id, title, subsystem, description, steps_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            runbook_dict["id"],
            runbook_dict["title"],
            runbook_dict["subsystem"],
            runbook_dict["description"],
            json.dumps(runbook_dict.get("steps", [])),
            runbook_dict.get("created_at"),
            runbook_dict.get("updated_at"),
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error persisting runbook {runbook_dict.get('id')}: {e}")


def db_save_runbook_execution(exec_dict: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO runbook_executions (
                execution_id, runbook_id, runbook_title, spacecraft_id, status,
                current_step, authorized_by, started_at, completed_at,
                step_states_json, failure_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            exec_dict["execution_id"],
            exec_dict["runbook_id"],
            exec_dict.get("runbook_title"),
            exec_dict.get("spacecraft_id", "ASTRA-ALPHA"),
            exec_dict["status"],
            int(exec_dict.get("current_step", 1)),
            exec_dict.get("authorized_by", "Flight Director"),
            exec_dict["started_at"],
            exec_dict.get("completed_at"),
            json.dumps(exec_dict.get("step_states", [])),
            exec_dict.get("failure_reason"),
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error persisting runbook execution {exec_dict.get('execution_id')}: {e}")


def db_get_runbook_execution(execution_id: str) -> Optional[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM runbook_executions WHERE execution_id = ?;", (execution_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["step_states"] = json.loads(d.pop("step_states_json", "[]") or "[]")
        return d
    except Exception as e:
        logger.warning(f"Error getting runbook execution {execution_id}: {e}")
        return None


def db_list_runbook_executions(limit: int = 25) -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM runbook_executions ORDER BY started_at DESC LIMIT ?;", (limit,))
        rows = cursor.fetchall()
        conn.close()
        results = []
        for row in rows:
            d = dict(row)
            d["step_states"] = json.loads(d.pop("step_states_json", "[]") or "[]")
            results.append(d)
        return results
    except Exception as e:
        logger.warning(f"Error listing runbook executions: {e}")
        return []


