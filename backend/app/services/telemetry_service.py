import asyncio
import logging
import math
import random
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.detector.p3_detector import P3AnomalyDetector
from app.storage.event_store import event_store

logger = logging.getLogger("astra.telemetry")


class TelemetryService:
    def __init__(self):
        self.detector = P3AnomalyDetector()
        self.mode: str = "nominal"  # "nominal" | "nasa_p3" | "crisis"
        self.p3_data: Optional[np.ndarray] = None
        self.p3_index: int = 0
        self.p3_total_points: int = 0
        self.is_running: bool = False
        self.playback_speed: float = 1.0  # seconds between ticks

        # Baseline telemetry metrics
        self.current_state = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "step": 0,
            "channel": "P-3",
            "p3_value": 0.0,
            "temperature": 15.2,
            "voltage": 24.1,
            "battery_pct": 98.4,
            "solar_input": 96.4,
            "current_draw": 4.2,
            "adcs_drift": 0.02,
            "packet_rate": 10.0,
            "link_snr": 14.2,
            "uplink_quality": 99.8,
            "anomaly_score": 0.02,
            "is_anomaly": False,
            "mode": "nominal"
        }

        self._load_nasa_data()

    def _load_nasa_data(self):
        p3_path = settings.NASA_P3_TEST_PATH
        if p3_path.exists():
            try:
                raw_data = np.load(str(p3_path))
                if raw_data.ndim == 2:
                    self.p3_data = raw_data[:, 0]
                else:
                    self.p3_data = raw_data
                self.p3_total_points = len(self.p3_data)
                logger.info(f"Loaded NASA P-3 test dataset: {self.p3_total_points} telemetry points.")
            except Exception as e:
                logger.error(f"Error loading NASA P-3 data: {e}")
        else:
            logger.warning(f"NASA P-3 data not found at {p3_path}")

    def reset_detector(self):
        self.detector.reset()

    def set_mode(self, mode: str, start_index: int = 0):
        """Change streaming mode: nominal, nasa_p3, crisis"""
        self.mode = mode
        if mode == "nasa_p3":
            self.p3_index = max(0, min(start_index, self.p3_total_points - 1))
            self.detector.reset()
            # Fast-forward detector state to start_index - 1 if jumping ahead
            if self.p3_data is not None and self.p3_index > 0:
                # Prime detector with recent baseline
                prime_start = max(0, self.p3_index - 50)
                for idx in range(prime_start, self.p3_index):
                    self.detector.process(float(self.p3_data[idx]), idx)
        elif mode == "crisis":
            pass
        elif mode == "nominal":
            self.detector.reset()
        self.current_state["mode"] = mode
        logger.info(f"Telemetry mode set to {mode} (index: {start_index})")

    def process_external_point(self, channel: str, value: float, timestamp: int) -> Dict[str, Any]:
        """Ingest individual telemetry point from REST API"""
        res = self.detector.process(value, timestamp)
        
        # Check if new event should be built
        events = self.detector.build_events()
        event_created = None
        if events:
            latest_start, latest_end = events[-1]
            existing = [e for e in event_store.list_events() if e.start_timestamp == latest_start]
            if not existing:
                duration = latest_end - latest_start + 1
                event_created = event_store.create_event(
                    channel=channel,
                    start_timestamp=latest_start,
                    end_timestamp=latest_end,
                    duration=duration,
                    score=res["score"]
                )

        return {
            "channel": channel,
            "timestamp": timestamp,
            "value": value,
            "anomaly": res["anomaly"],
            "score": res["score"],
            "threshold": self.detector.threshold,
            "event_created": event_created.model_dump() if event_created else None
        }

    def generate_next_tick(self) -> Dict[str, Any]:
        """Generate next telemetry frame according to active mode"""
        now_iso = datetime.now(timezone.utc).isoformat()
        step = self.current_state["step"] + 1

        if self.mode == "nasa_p3" and self.p3_data is not None:
            # Replay actual NASA P-3 data point
            if self.p3_index >= self.p3_total_points:
                self.p3_index = 0  # Loop or stay at end
            
            p3_val = float(self.p3_data[self.p3_index])
            det_res = self.detector.process(p3_val, self.p3_index)
            is_anomaly = det_res["anomaly"]
            anomaly_score = det_res["score"]
            current_step = self.p3_index
            self.p3_index += 1

            # If anomaly triggers, check if new event formed
            if is_anomaly:
                events = self.detector.build_events()
                if events:
                    s, e = events[-1]
                    existing = [ev for ev in event_store.list_events() if ev.start_timestamp == s]
                    if not existing:
                        event_store.create_event(
                            channel="P-3",
                            start_timestamp=s,
                            end_timestamp=e,
                            duration=e - s + 1,
                            score=anomaly_score
                        )

            # Map P-3 value to illustrative spacecraft health indicators
            # P-3 represents power/current or telemetry sensor
            voltage = 24.1 - (anomaly_score * 8.0) if is_anomaly else 24.1 + (math.sin(step * 0.1) * 0.08)
            temp = 15.2 + (anomaly_score * 30.0) if is_anomaly else 15.2 + (math.sin(step * 0.05) * 0.3)
            solar = max(0.0, 96.4 - (anomaly_score * 80.0)) if is_anomaly else 96.4 + (math.sin(step * 0.08) * 0.4)
            battery = max(70.0, 98.4 - (step * 0.001))

            self.current_state = {
                "timestamp": now_iso,
                "step": current_step,
                "channel": "P-3",
                "p3_value": round(p3_val, 6),
                "temperature": round(temp, 2),
                "voltage": round(max(10.0, voltage), 2),
                "battery_pct": round(battery, 2),
                "solar_input": round(solar, 2),
                "current_draw": round(4.2 + (anomaly_score * 12.0), 2),
                "adcs_drift": round(0.02 + (anomaly_score * 0.1), 3),
                "packet_rate": 10.0,
                "link_snr": round(14.2 - (anomaly_score * 3.0), 2),
                "uplink_quality": round(99.8 - (anomaly_score * 4.0), 1),
                "anomaly_score": round(anomaly_score, 4),
                "is_anomaly": is_anomaly,
                "mode": "nasa_p3",
                "threshold": self.detector.threshold
            }

        elif self.mode == "crisis":
            # Injected failure state
            noise = (random.random() - 0.5) * 0.4
            temp = round(85.0 + noise, 1)
            voltage = round(11.0 + noise * 0.1, 2)
            solar = 0.0
            battery = round(max(50.0, self.current_state["battery_pct"] - 0.05), 1)
            score = 0.94

            # Process through detector
            p3_val = 0.95
            det_res = self.detector.process(p3_val, step)

            self.current_state = {
                "timestamp": now_iso,
                "step": step,
                "channel": "P-3",
                "p3_value": p3_val,
                "temperature": temp,
                "voltage": voltage,
                "battery_pct": battery,
                "solar_input": solar,
                "current_draw": 18.4,
                "adcs_drift": 0.18,
                "packet_rate": 9.8,
                "link_snr": 12.1,
                "uplink_quality": 98.2,
                "anomaly_score": score,
                "is_anomaly": True,
                "mode": "crisis",
                "threshold": self.detector.threshold
            }

        else:
            # Nominal telemetry
            noise = (random.random() - 0.5) * 0.1
            temp = round(15.1 + math.sin(step * 0.2) * 0.3 + noise * 0.1, 2)
            voltage = round(24.1 + math.cos(step * 0.3) * 0.08 + noise * 0.02, 2)
            solar = round(96.4 + math.sin(step * 0.15) * 0.4 + noise * 0.1, 2)
            battery = round(max(90.0, 98.4 - (step * 0.0005)), 2)

            # Nominal P-3 telemetry has small variation
            p3_val = round(0.12 + math.sin(step * 0.05) * 0.02 + noise * 0.01, 5)
            det_res = self.detector.process(p3_val, step)

            self.current_state = {
                "timestamp": now_iso,
                "step": step,
                "channel": "P-3",
                "p3_value": p3_val,
                "temperature": temp,
                "voltage": voltage,
                "battery_pct": battery,
                "solar_input": solar,
                "current_draw": 4.2,
                "adcs_drift": 0.02,
                "packet_rate": 10.0,
                "link_snr": 14.2,
                "uplink_quality": 99.8,
                "anomaly_score": round(det_res["score"], 4),
                "is_anomaly": False,
                "mode": "nominal",
                "threshold": self.detector.threshold
            }

        return self.current_state

    def get_p3_samples(self, start: int = 5000, count: int = 2000) -> List[Dict[str, Any]]:
        """Return historical window of P-3 test stream for chart preview"""
        if self.p3_data is None:
            return []
        
        end = min(len(self.p3_data), start + count)
        samples = []
        for i in range(start, end):
            samples.append({
                "index": i,
                "value": float(self.p3_data[i]),
                "is_event_range": (5400 <= i <= 6656)
            })
        return samples


telemetry_service = TelemetryService()
