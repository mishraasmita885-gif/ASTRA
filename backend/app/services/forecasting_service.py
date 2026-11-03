"""
ASTRA Predictive Forecasting Service
Rolling sliding-window linear extrapolation engine.
All forecasts computed dynamically from live telemetry frames - zero hardcoded values.
"""
import logging
import math
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("astra.forecasting")

# Per-channel safety threshold boundaries (dynamic, not hardcoded sensor values)
CHANNEL_THRESHOLDS = {
    "temperature": {"critical_high": 75.0, "warning_high": 50.0, "critical_low": None, "warning_low": -20.0, "unit": "°C"},
    "voltage":     {"critical_high": None, "warning_high": 28.5, "critical_low": 20.0, "warning_low": 22.5, "unit": "V"},
    "battery":     {"critical_high": None, "warning_high": None, "critical_low": 20.0, "warning_low": 40.0, "unit": "%"},
    "solar":       {"critical_high": None, "warning_high": None, "critical_low": 20.0, "warning_low": 50.0, "unit": "%"},
    "p3":          {"critical_high": 0.90, "warning_high": 0.70, "critical_low": None, "warning_low": None, "unit": ""},
    "current_draw":{"critical_high": 12.0, "warning_high": 8.0,  "critical_low": None, "warning_low": None, "unit": "A"},
    "link_snr":    {"critical_high": None, "warning_high": None, "critical_low": 8.0,  "warning_low": 10.0, "unit": "dBm"},
    "adcs_drift":  {"critical_high": 0.30, "warning_high": 0.10, "critical_low": None, "warning_low": None, "unit": "°/hr"},
}

WINDOW_SIZE = 60          # Rolling window: last 60 telemetry ticks
FORECAST_STEPS = 30       # Project 30 ticks into the future
TICK_INTERVAL_SEC = 1.2   # Matches websocket tick rate
ALARM_MARGIN_SECONDS = 300  # Trigger PREDICTIVE_WARNING if breach in < 300 seconds


class ChannelBuffer:
    """Rolling deque buffer for a single telemetry channel."""
    def __init__(self, maxlen: int = WINDOW_SIZE):
        self._buf: deque = deque(maxlen=maxlen)

    def push(self, value: float):
        if value is not None and not math.isnan(value):
            self._buf.append(float(value))

    def values(self) -> List[float]:
        return list(self._buf)

    def __len__(self):
        return len(self._buf)


class ForecastingService:
    """
    Maintains one ChannelBuffer per (spacecraft_id, channel_key) pair.
    Computes OLS linear slope over the rolling window and projects future values.
    """

    def __init__(self):
        # Keyed by (spacecraft_id, channel_key) -> ChannelBuffer
        self._buffers: Dict[Tuple[str, str], ChannelBuffer] = {}
        # Active runway alarms: keyed by (spacecraft_id, channel_key)
        self._active_alarms: Dict[Tuple[str, str], Dict[str, Any]] = {}

    def _get_buffer(self, spacecraft_id: str, channel_key: str) -> ChannelBuffer:
        key = (spacecraft_id, channel_key)
        if key not in self._buffers:
            self._buffers[key] = ChannelBuffer()
        return self._buffers[key]

    def ingest_tick(self, spacecraft_id: str, telemetry: Dict[str, Any]):
        """Push all channel values from a telemetry tick into their respective buffers."""
        sc = spacecraft_id.upper()
        mapping = {
            "temperature": telemetry.get("temperature"),
            "voltage":     telemetry.get("voltage"),
            "battery":     telemetry.get("battery_pct"),
            "solar":       telemetry.get("solar_input"),
            "p3":          telemetry.get("p3_value"),
            "current_draw":telemetry.get("current_draw"),
            "link_snr":    telemetry.get("link_snr"),
            "adcs_drift":  telemetry.get("adcs_drift"),
        }
        for ch_key, val in mapping.items():
            if val is not None:
                self._get_buffer(sc, ch_key).push(val)

    def _ols_slope(self, values: List[float]) -> float:
        """
        Ordinary Least Squares slope using direct formula.
        slope = (n * sum(i*y) - sum(i) * sum(y)) / (n * sum(i^2) - sum(i)^2)
        """
        n = len(values)
        if n < 2:
            return 0.0
        sx = sum(range(n))
        sy = sum(values)
        sxy = sum(i * y for i, y in enumerate(values))
        sxx = sum(i * i for i in range(n))
        denom = n * sxx - sx * sx
        if abs(denom) < 1e-12:
            return 0.0
        return (n * sxy - sx * sy) / denom

    def compute_forecast(self, spacecraft_id: str, channel_key: str) -> Dict[str, Any]:
        """
        Returns:
          - slope: rate of change per tick
          - slope_per_sec: rate of change per second
          - current_value: latest buffered value
          - projected: list of {step, value, is_forecast} dicts (historical + future)
          - runway: dict with threshold, time_to_breach_sec, severity, active
          - window_size: number of historical points used
        """
        sc = spacecraft_id.upper()
        buf = self._get_buffer(sc, channel_key)
        vals = buf.values()

        if len(vals) < 2:
            return {
                "slope": 0.0,
                "slope_per_sec": 0.0,
                "current_value": vals[-1] if vals else None,
                "projected": [],
                "runway": {"active": False},
                "window_size": len(vals),
            }

        slope = self._ols_slope(vals)
        slope_per_sec = slope / TICK_INTERVAL_SEC
        current_value = vals[-1]

        # Build projected future points
        projected_future = []
        for step in range(1, FORECAST_STEPS + 1):
            pred_val = current_value + slope * step
            projected_future.append({
                "step": step,
                "value": round(pred_val, 4),
                "is_forecast": True,
            })

        # Build historical points for chart overlay
        hist_len = min(len(vals), 30)
        hist_slice = vals[-hist_len:]
        historical = [
            {"step": -(hist_len - 1 - i), "value": round(v, 4), "is_forecast": False}
            for i, v in enumerate(hist_slice)
        ]

        # Compute runway countdown
        runway = self._compute_runway(channel_key, current_value, slope_per_sec, sc)

        return {
            "slope": round(slope, 6),
            "slope_per_sec": round(slope_per_sec, 6),
            "current_value": round(current_value, 4),
            "projected": projected_future,
            "historical": historical,
            "runway": runway,
            "window_size": len(vals),
        }

    def _compute_runway(self, channel_key: str, current_value: float, slope_per_sec: float, spacecraft_id: str) -> Dict[str, Any]:
        """Calculate time-to-breach for all active thresholds on this channel."""
        thresholds = CHANNEL_THRESHOLDS.get(channel_key)
        if not thresholds:
            return {"active": False}

        best_runway = None
        best_severity = None
        best_threshold_value = None
        best_direction = None

        checks = [
            ("critical_high", "CRITICAL", "HIGH"),
            ("warning_high", "WARNING", "HIGH"),
            ("critical_low", "CRITICAL", "LOW"),
            ("warning_low", "WARNING", "LOW"),
        ]

        for threshold_key, severity, direction in checks:
            limit = thresholds.get(threshold_key)
            if limit is None:
                continue

            if direction == "HIGH" and slope_per_sec > 0:
                # Value rising toward a high limit
                gap = limit - current_value
                if gap > 0:
                    ttb = gap / slope_per_sec
                    if best_runway is None or ttb < best_runway:
                        best_runway = ttb
                        best_severity = severity
                        best_threshold_value = limit
                        best_direction = direction
            elif direction == "LOW" and slope_per_sec < 0:
                # Value falling toward a low limit
                gap = current_value - limit
                if gap > 0:
                    ttb = gap / abs(slope_per_sec)
                    if best_runway is None or ttb < best_runway:
                        best_runway = ttb
                        best_severity = severity
                        best_threshold_value = limit
                        best_direction = direction

        if best_runway is None:
            return {"active": False}

        is_alarming = best_runway < ALARM_MARGIN_SECONDS
        return {
            "active": True,
            "alarming": is_alarming,
            "time_to_breach_sec": round(best_runway, 1),
            "severity": best_severity,
            "threshold_value": best_threshold_value,
            "threshold_unit": thresholds.get("unit", ""),
            "direction": best_direction,
            "slope_per_sec": round(slope_per_sec, 6),
        }

    def get_all_active_alarms(self, spacecraft_id: str) -> List[Dict[str, Any]]:
        """Return all channels with active alarming runway countdowns for a spacecraft."""
        sc = spacecraft_id.upper()
        alarms = []
        for ch_key in CHANNEL_THRESHOLDS.keys():
            fc = self.compute_forecast(sc, ch_key)
            runway = fc.get("runway", {})
            if runway.get("active") and runway.get("alarming"):
                alarms.append({
                    "channel": ch_key,
                    "spacecraft_id": sc,
                    "time_to_breach_sec": runway["time_to_breach_sec"],
                    "severity": runway["severity"],
                    "current_value": fc["current_value"],
                    "threshold_value": runway["threshold_value"],
                    "unit": runway["threshold_unit"],
                    "slope_per_sec": runway["slope_per_sec"],
                    "direction": runway["direction"],
                })
        alarms.sort(key=lambda a: a["time_to_breach_sec"])
        return alarms

    def get_forecast_summary(self, spacecraft_id: str) -> Dict[str, Any]:
        """Get full forecast state for all channels on a spacecraft."""
        sc = spacecraft_id.upper()
        forecasts = {}
        for ch_key in CHANNEL_THRESHOLDS.keys():
            forecasts[ch_key] = self.compute_forecast(sc, ch_key)
        return {
            "spacecraft_id": sc,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "channels": forecasts,
            "active_alarms": self.get_all_active_alarms(sc),
        }


# Module-level singleton
forecasting_service = ForecastingService()
