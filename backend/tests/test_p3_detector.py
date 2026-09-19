import os
import pytest
import numpy as np
from pathlib import Path
from app.detector.p3_detector import P3AnomalyDetector


def test_p3_detector_config():
    detector = P3AnomalyDetector()
    assert detector.channel == "P-3"
    assert pytest.approx(detector.threshold, 1e-7) == 0.3888857066631317
    assert detector.max_gap == 30
    assert detector.buffer == 15
    assert detector.merge_gap == 250
    assert detector.requires_operator_approval is True


def test_p3_detector_single_step():
    detector = P3AnomalyDetector()
    detector.reset()

    # First point initializes baseline
    res1 = detector.process(10.0, 0)
    assert res1["anomaly"] is False
    assert res1["score"] == 0.0

    # Small nominal fluctuation (0.1 < threshold)
    res2 = detector.process(10.1, 1)
    assert res2["anomaly"] is False
    assert pytest.approx(res2["score"], 1e-4) == 0.1

    # Large spike (> threshold 0.3888857)
    res3 = detector.process(10.8, 2)
    assert res3["anomaly"] is True
    assert pytest.approx(res3["score"], 1e-4) == 0.7


def test_p3_nasa_stream_reproduction():
    """
    CRITICAL MANDATORY INTEGRATION TEST:
    Process the full P-3 NASA test stream from timestamp 0.
    Expected output:
        Event 1: 5400 -> 6656
        Total events: 1
    Do not proceed unless this test passes!
    """
    root_dir = Path(__file__).resolve().parents[2]
    p3_path = root_dir / "archive" / "data" / "data" / "test" / "P-3.npy"

    assert p3_path.exists(), f"NASA P-3.npy not found at {p3_path}"

    data = np.load(str(p3_path))
    # telemetry_feature is 0 (P-3 1D telemetry or 2D array feature 0)
    if data.ndim == 2:
        telemetry = data[:, 0]
    else:
        telemetry = data

    detector = P3AnomalyDetector()
    detector.reset()

    for idx, val in enumerate(telemetry):
        detector.process(float(val), idx)

    events = detector.build_events()

    print(f"\n[NASA P-3 REPRODUCTION RESULT] Total events detected: {len(events)}")
    for i, (s, e) in enumerate(events, 1):
        print(f"Event {i}: {s} -> {e}")

    assert len(events) == 1, f"Expected exactly 1 event, got {len(events)}: {events}"
    assert events[0] == (5400, 6656), f"Expected event (5400, 6656), got {events[0]}"
