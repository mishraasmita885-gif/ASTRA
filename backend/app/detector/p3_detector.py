import json
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional


class P3AnomalyDetector:
    """
    ASTRA P-3 Anomaly Detector
    Change detection on channel P-3 (feature 0) with event grouping, buffering, and merging.
    Source: P3_ASTRA_Backend/p3_detector.py
    """

    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            # Default to local config in same folder
            config_path = str(Path(__file__).parent / "p3_detector_config.json")
        
        with open(config_path, "r") as f:
            config = json.load(f)

        self.channel = config["channel"]
        self.threshold = float(config["threshold"])
        self.max_gap = int(config["max_gap"])
        self.buffer = int(config["event_buffer"])
        self.merge_gap = int(config["merge_gap"])
        self.requires_operator_approval = bool(config.get("requires_operator_approval", True))
        self.detector_name = config.get("detector", "change_detection")
        self.telemetry_feature = int(config.get("telemetry_feature", 0))

        self.previous_value: Optional[float] = None
        self.raw_anomalies: List[int] = []
        self.current_step: int = 0

    def reset(self):
        """Reset detector state for new stream"""
        self.previous_value = None
        self.raw_anomalies = []
        self.current_step = 0

    # --------------------------------------------------------
    # Process one telemetry value
    # --------------------------------------------------------
    def process(self, value: float, timestamp: int) -> Dict[str, Any]:
        """
        Process a single telemetry point.
        change = abs(current_value - previous_value)
        If change > threshold, marks point as an anomaly.
        """
        value = float(value)
        self.current_step = timestamp

        if self.previous_value is None:
            self.previous_value = value
            return {
                "channel": self.channel,
                "timestamp": timestamp,
                "value": value,
                "anomaly": False,
                "score": 0.0,
                "change": 0.0,
                "threshold": self.threshold
            }

        change = abs(value - self.previous_value)
        self.previous_value = value

        is_anomaly = change > self.threshold
        if is_anomaly:
            self.raw_anomalies.append(int(timestamp))

        return {
            "channel": self.channel,
            "timestamp": timestamp,
            "value": value,
            "anomaly": bool(is_anomaly),
            "score": float(change),
            "change": float(change),
            "threshold": self.threshold
        }

    # --------------------------------------------------------
    # Build final anomaly events
    # --------------------------------------------------------
    def build_events(self) -> List[Tuple[int, int]]:
        """
        Builds and merges anomaly events from accumulated raw anomaly points:
        1. Group detections with gap <= max_gap (30)
        2. Add buffer (15) on both sides
        3. Merge buffered events with gap <= merge_gap (250)
        Returns: list of (start_timestamp, end_timestamp)
        """
        if not self.raw_anomalies:
            return []

        points = sorted(set(self.raw_anomalies))

        # 1. Group nearby detections
        events = []
        start = points[0]
        previous = points[0]

        for current in points[1:]:
            if current - previous <= self.max_gap:
                previous = current
            else:
                events.append((start, previous))
                start = current
                previous = current

        events.append((start, previous))

        # 2. Add buffer
        buffered = []
        for start, end in events:
            buffered.append((
                max(0, start - self.buffer),
                end + self.buffer
            ))

        # 3. Merge nearby events
        merged = []
        current_start, current_end = buffered[0]

        for start, end in buffered[1:]:
            if start - current_end <= self.merge_gap:
                current_end = max(current_end, end)
            else:
                merged.append((current_start, current_end))
                current_start = start
                current_end = end

        merged.append((current_start, current_end))
        return merged
