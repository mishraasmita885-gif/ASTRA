
ASTRA P-3 Anomaly Detector
===========================

Files:
- p3_detector.py
- p3_detector_config.json

Usage:

from p3_detector import P3AnomalyDetector

detector = P3AnomalyDetector()

result = detector.process(
    value=telemetry_value,
    timestamp=timestamp
)

events = detector.build_events()

Detector settings are stored in:
p3_detector_config.json
