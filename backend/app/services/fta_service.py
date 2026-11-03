"""
ASTRA Fault Tree Analysis (FTA) Service
Dynamic cascading failure graph engine driven by live telemetry + SQLite anomaly data.
Zero hardcoded sensor values — topology shape is fixed, all status/live_value computed at runtime.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("astra.fta")

# ─── Static subsystem dependency topology (shape only — NO live values here) ───
# Format: node_id -> { meta } + "depends_on": [upstream node ids]
# Propagation rule: if upstream node is CRITICAL → downstream becomes PROPAGATING
SUBSYSTEM_TOPOLOGY = {
    "node-solar": {
        "label": "Solar Array Primary",
        "subsystem": "EPS",
        "channel": "solar",
        "description": "Photovoltaic array primary power generation. Converts solar irradiance to spacecraft bus power.",
        "layer": 0,
        "col": 0,
        "depends_on": [],
    },
    "node-thermal-core": {
        "label": "Thermal Core Bus",
        "subsystem": "TCS",
        "channel": "temperature",
        "description": "Primary thermal regulation loop. Maintains spacecraft body temperature within survivability limits.",
        "layer": 0,
        "col": 1,
        "depends_on": [],
    },
    "node-bus-voltage": {
        "label": "Power Bus Voltage",
        "subsystem": "EPS",
        "channel": "voltage",
        "description": "Main DC power bus. Distributes regulated voltage to all downstream subsystems.",
        "layer": 1,
        "col": 0,
        "depends_on": ["node-solar"],
    },
    "node-battery": {
        "label": "Battery State of Charge",
        "subsystem": "EPS",
        "channel": "battery",
        "description": "Onboard Li-ion battery pack. Provides eclipse-period power reserve.",
        "layer": 2,
        "col": 0,
        "depends_on": ["node-bus-voltage"],
    },
    "node-adcs": {
        "label": "Reaction Wheel / ADCS",
        "subsystem": "ADCS",
        "channel": "adcs_drift",
        "description": "Attitude Determination & Control System. Maintains spacecraft pointing lock via reaction wheels.",
        "layer": 2,
        "col": 1,
        "depends_on": ["node-bus-voltage"],
    },
    "node-tcs-radiator": {
        "label": "TCS Radiator Loop",
        "subsystem": "TCS",
        "channel": "temperature",
        "description": "Passive radiator panel and heat pipe loop. Rejects waste heat to deep space.",
        "layer": 2,
        "col": 2,
        "depends_on": ["node-thermal-core"],
    },
    "node-ttc": {
        "label": "TT&C Transponder",
        "subsystem": "TT&C",
        "channel": "link_snr",
        "description": "Telemetry, Tracking & Command transponder. Maintains DSN uplink/downlink communication.",
        "layer": 2,
        "col": 3,
        "depends_on": ["node-bus-voltage"],
    },
    "node-avionics": {
        "label": "Avionics / OBC",
        "subsystem": "AVIONICS",
        "channel": "p3",
        "description": "On-Board Computer and avionics bus. Executes flight software and subsystem command arbitration.",
        "layer": 3,
        "col": 1,
        "depends_on": ["node-battery", "node-adcs"],
    },
    "node-safe-mode": {
        "label": "Safe-Mode Controller",
        "subsystem": "AVIONICS",
        "channel": "p3",
        "description": "Autonomous safe-mode arbiter. Arms when critical subsystem thresholds are violated.",
        "layer": 3,
        "col": 2,
        "depends_on": ["node-battery", "node-tcs-radiator", "node-ttc"],
    },
}

# Channel → threshold definitions (mirrors forecasting_service.CHANNEL_THRESHOLDS)
# These are engineering limits, NOT live sensor values
CHANNEL_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "temperature": {"critical_high": 75.0, "warning_high": 50.0, "critical_low": None, "warning_low": -20.0, "unit": "°C"},
    "voltage":     {"critical_high": None, "warning_high": 28.5, "critical_low": 20.0, "warning_low": 22.5, "unit": "V"},
    "battery":     {"critical_high": None, "warning_high": None, "critical_low": 20.0, "warning_low": 40.0, "unit": "%"},
    "solar":       {"critical_high": None, "warning_high": None, "critical_low": 20.0, "warning_low": 50.0, "unit": "%"},
    "p3":          {"critical_high": 0.90, "warning_high": 0.70, "critical_low": None, "warning_low": None, "unit": ""},
    "current_draw":{"critical_high": 12.0, "warning_high": 8.0,  "critical_low": None, "warning_low": None, "unit": "A"},
    "link_snr":    {"critical_high": None, "warning_high": None, "critical_low": 8.0,  "warning_low": 10.0, "unit": "dBm"},
    "adcs_drift":  {"critical_high": 0.30, "warning_high": 0.10, "critical_low": None, "warning_low": None, "unit": "°/hr"},
}

# Telemetry field name → channel key mapping
TELEMETRY_CHANNEL_MAP: Dict[str, str] = {
    "temperature": "temperature",
    "voltage": "voltage",
    "battery_pct": "battery",
    "solar_input": "solar",
    "p3_value": "p3",
    "current_draw": "current_draw",
    "link_snr": "link_snr",
    "adcs_drift": "adcs_drift",
}


def _compute_node_status(channel: str, live_value: Optional[float], active_event_channels: List[str]) -> str:
    """
    Derive node status from live telemetry value vs. engineering threshold limits.
    Returns: 'CRITICAL' | 'WARNING' | 'NOMINAL'
    """
    if live_value is None:
        return "NOMINAL"

    thresh = CHANNEL_THRESHOLDS.get(channel)
    if not thresh:
        return "NOMINAL"

    # Check critical breaches
    ch = thresh.get("critical_high")
    cl = thresh.get("critical_low")
    wh = thresh.get("warning_high")
    wl = thresh.get("warning_low")

    if ch is not None and live_value >= ch:
        return "CRITICAL"
    if cl is not None and live_value <= cl:
        return "CRITICAL"
    if wh is not None and live_value >= wh:
        return "WARNING"
    if wl is not None and live_value <= wl:
        return "WARNING"
    return "NOMINAL"


def _format_live_value(channel: str, value: Optional[float]) -> str:
    if value is None:
        return "N/A"
    thresh = CHANNEL_THRESHOLDS.get(channel, {})
    unit = thresh.get("unit", "")
    if channel == "p3":
        return f"{value:.3f}"
    return f"{value:.2f}{unit}"


class FTAService:
    """
    Builds a live fault tree cascade graph from current telemetry + active anomaly events.
    All node status and live_value fields are computed dynamically — never hardcoded.
    """

    def build_cascade(
        self,
        spacecraft_id: str,
        telemetry: Dict[str, Any],
        active_events: List[Any],
    ) -> Dict[str, Any]:
        """
        Returns a JSON-serialisable graph:
        { "nodes": [...], "edges": [...], "spacecraft_id": ..., "timestamp": ... }
        """
        # Build a lookup: channel → live value from current telemetry tick
        channel_values: Dict[str, Optional[float]] = {}
        for telem_key, ch_key in TELEMETRY_CHANNEL_MAP.items():
            raw = telemetry.get(telem_key)
            if raw is not None:
                try:
                    channel_values[ch_key] = float(raw)
                except (TypeError, ValueError):
                    channel_values[ch_key] = None

        # Collect channel IDs for nodes that have active anomaly events
        active_event_channels = []
        for ev in active_events:
            status = getattr(ev, "status", ev.get("status", "")) if not hasattr(ev, "status") else ev.status
            if status in ("ANOMALY_DETECTED", "UNDER_REVIEW", "ANALYZING"):
                ch = getattr(ev, "channel", None) or (ev.get("channel") if isinstance(ev, dict) else None)
                if ch:
                    active_event_channels.append(str(ch).lower())

        # Step 1: Compute raw status for each node
        node_status: Dict[str, str] = {}
        for node_id, meta in SUBSYSTEM_TOPOLOGY.items():
            ch = meta["channel"]
            live_val = channel_values.get(ch)
            node_status[node_id] = _compute_node_status(ch, live_val, active_event_channels)

        # Step 2: Propagate CRITICAL/WARNING downstream
        # Topological order: layer 0 → 1 → 2 → 3
        sorted_nodes = sorted(SUBSYSTEM_TOPOLOGY.keys(), key=lambda n: SUBSYSTEM_TOPOLOGY[n]["layer"])
        for node_id in sorted_nodes:
            meta = SUBSYSTEM_TOPOLOGY[node_id]
            for upstream_id in meta["depends_on"]:
                upstream_status = node_status.get(upstream_id, "NOMINAL")
                current_status = node_status[node_id]
                # If upstream is CRITICAL and current node is still NOMINAL/WARNING → mark PROPAGATING
                if upstream_status == "CRITICAL" and current_status == "NOMINAL":
                    node_status[node_id] = "PROPAGATING"
                elif upstream_status in ("CRITICAL", "PROPAGATING") and current_status == "WARNING":
                    node_status[node_id] = "PROPAGATING"

        # Step 3: Assemble node list
        nodes = []
        for node_id, meta in SUBSYSTEM_TOPOLOGY.items():
            ch = meta["channel"]
            live_val = channel_values.get(ch)
            thresh = CHANNEL_THRESHOLDS.get(ch, {})
            nodes.append({
                "id": node_id,
                "label": meta["label"],
                "subsystem": meta["subsystem"],
                "channel": ch,
                "status": node_status[node_id],
                "live_value": _format_live_value(ch, live_val),
                "live_value_raw": live_val,
                "threshold": {
                    "critical_high": thresh.get("critical_high"),
                    "critical_low": thresh.get("critical_low"),
                    "warning_high": thresh.get("warning_high"),
                    "warning_low": thresh.get("warning_low"),
                    "unit": thresh.get("unit", ""),
                },
                "description": meta["description"],
                "layer": meta["layer"],
                "col": meta["col"],
            })

        # Step 4: Assemble edge list
        edges = []
        for node_id, meta in SUBSYSTEM_TOPOLOGY.items():
            for upstream_id in meta["depends_on"]:
                upstream_status = node_status.get(upstream_id, "NOMINAL")
                # Edge condition label
                if upstream_status == "CRITICAL":
                    condition = "Critical Failure Propagation"
                elif upstream_status == "PROPAGATING":
                    condition = "Cascading Degradation"
                elif upstream_status == "WARNING":
                    condition = "Threshold Proximity Warning"
                else:
                    condition = "Nominal Power/Data Flow"

                edges.append({
                    "source": upstream_id,
                    "target": node_id,
                    "condition": condition,
                    "active": upstream_status in ("CRITICAL", "PROPAGATING"),
                })

        # Step 5: Summary stats
        critical_count = sum(1 for s in node_status.values() if s == "CRITICAL")
        propagating_count = sum(1 for s in node_status.values() if s == "PROPAGATING")
        warning_count = sum(1 for s in node_status.values() if s == "WARNING")

        return {
            "nodes": nodes,
            "edges": edges,
            "spacecraft_id": spacecraft_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "critical": critical_count,
                "propagating": propagating_count,
                "warning": warning_count,
                "nominal": len(nodes) - critical_count - propagating_count - warning_count,
                "total_nodes": len(nodes),
            },
        }


# Module-level singleton
fta_service = FTAService()

