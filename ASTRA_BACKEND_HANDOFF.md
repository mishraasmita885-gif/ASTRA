# ASTRA Backend Handoff

## 1. Goal

Integrate the already-tested ASTRA P-3 anomaly detector into the existing backend, then connect it to Gemini and the frontend.

**Do not retrain, replace, or silently change the detector.** Read the existing repository first and preserve working code.

## 2. Final ML detector

Current demo detector: **P-3 telemetry + change detection + event logic**.

This is **not a .keras model**. It is Python logic plus a JSON configuration.

### Final configuration

```json
{
  "channel": "P-3",
  "detector": "change_detection",
  "telemetry_feature": 0,
  "threshold": 0.3888857,
  "threshold_method": "99th_percentile_validation_change",
  "max_gap": 30,
  "event_buffer": 15,
  "merge_gap": 250,
  "requires_operator_approval": true
}
```

### Detector logic

For each P-3 telemetry value:

```text
change = abs(current_value - previous_value)
```

If `change > 0.3888857`, mark the point anomalous.

Then:

1. Group detections whose gap is <= 30.
2. Add a 15-point buffer on both sides.
3. Merge buffered events whose gap is <= 250.

## 3. Integration test

The full P-3 NASA test stream previously reproduced:

```text
Event 1: 5400 -> 6656
Total events: 1
```

This is the first backend integration test. Do not proceed to Gemini until this passes.

## 4. Metrics — keep these separate

### Overall benchmark

Evaluated across 68 telemetry channels and 87 NASA anomaly events:

- Accuracy: **80.39%**
- Precision: **24.11%**
- Recall: **33.80%**
- F1: **28.14%**
- Event detection rate: **81.61%** (71/87 events)

### P-3 demonstration

- Accuracy: **96.70%**
- Precision: **99.91%**
- Recall: **79.12%**
- F1: **88.30%**
- Event detection: **100%** for its single labeled event

Do **not** describe 96.70% as the overall ASTRA accuracy. It is the P-3 demonstration result.

## 5. Safety / scope

ASTRA is an AI-assisted mission-control demo, not an autonomous spacecraft controller.

The backend may:

- detect anomalies;
- create events;
- provide evidence;
- ask Gemini for interpretation;
- return recommendations.

The backend must **not automatically execute spacecraft commands**. Any command recommendation must require operator approval.

Do not invent physical causes from a channel change alone. Prefer wording such as:

> telemetry pattern is consistent with an abnormal subsystem state

when evidence is limited.

## 6. Gemini responsibilities

The numerical detector remains responsible for anomaly detection.

Gemini is the reasoning/explanation layer:

```text
P-3 detector -> structured evidence -> Gemini -> diagnosis/severity/evidence/recommendation
```

Do not ask Gemini to replace the numerical detector.

### Suggested Gemini input

```json
{
  "channel": "P-3",
  "anomaly_detected": true,
  "event_start": 5400,
  "event_end": 6656,
  "duration": 1257,
  "detector": "change_detection",
  "threshold": 0.3888857,
  "requires_operator_approval": true
}
```

### Suggested Gemini output schema

```json
{
  "diagnosis": "Telemetry pattern is consistent with an abnormal subsystem state.",
  "severity": "HIGH",
  "confidence": 0.91,
  "evidence": [
    "Telemetry changed beyond the learned normal threshold.",
    "The deviation persisted for an extended period."
  ],
  "recommendation": "Place the affected subsystem under operator review and evaluate predefined safe-state procedures.",
  "operator_approval_required": true
}
```

The values above are example structure only. Validate the actual Gemini response before returning it to the frontend.

## 7. FastAPI integration

Adapt these routes to the existing backend if equivalent routes already exist:

```text
GET  /api/health
POST /api/telemetry
GET  /api/events
POST /api/events/{event_id}/analyze
WS   /ws/telemetry
```

### POST /api/telemetry example

```json
{
  "channel": "P-3",
  "timestamp": 5401,
  "value": 0.42
}
```

Return a detector result such as:

```json
{
  "channel": "P-3",
  "timestamp": 5401,
  "anomaly": true,
  "score": 0.52
}
```

Do not expose Gemini keys to the frontend.

## 8. Event object

Recommended internal event shape:

```json
{
  "event_id": "ASTRA-P3-0001",
  "channel": "P-3",
  "detector": "change_detection",
  "start_timestamp": 5400,
  "end_timestamp": 6656,
  "duration": 1257,
  "anomaly_score": 0.52,
  "status": "ANOMALY_DETECTED",
  "gemini_analysis": null,
  "operator_approval_required": true
}
```

The score above is illustrative.

## 9. Backend architecture

```text
Telemetry / simulator
        |
        v
P3AnomalyDetector
        |
        v
Event builder
(group + buffer + merge)
        |
        v
FastAPI
   |         \
   v          v
Storage      Gemini
               |
               v
       validated AI result
               |
               v
        WebSocket / REST
               |
               v
           Frontend
```

## 10. Storage

If the existing project already uses MongoDB, use it for event summaries such as:

- event_id
- channel
- start/end
- detector
- score
- status
- Gemini analysis
- created/updated timestamps

Do not store every raw telemetry sample forever unless the existing design requires it.

## 11. Demo flow

```text
Normal telemetry -> no alert

Simulated sudden telemetry change
        -> detector triggers
        -> event created
        -> Gemini analysis
        -> dashboard shows diagnosis/severity/recommendation
        -> operator approval shown
```

Do not automatically execute real spacecraft commands.

## 12. Files supplied by ML teammate

Expected package:

```text
P3_ASTRA_Backend/
├── p3_detector.py
├── p3_detector_config.json
└── README.txt
```

The JSON file is the detector configuration source of truth.
The Python file contains detector logic.
The NASA dataset ZIP is provided separately for testing/reproduction.

Do not commit a large raw dataset into the source repository unless explicitly required.

## 13. Agent implementation order

1. Inspect the repository and current backend structure.
2. Integrate `p3_detector.py`.
3. Load `p3_detector_config.json` at startup.
4. Add unit tests for the detector.
5. Run the full P-3 integration test and reproduce `5400 -> 6656`.
6. Add REST/WebSocket telemetry flow.
7. Add event persistence/logging.
8. Add Gemini structured analysis.
9. Validate Gemini responses.
10. Connect the frontend.
11. Add end-to-end tests.

## 14. Do NOT

- Retrain the detector.
- Replace the detector with the earlier LSTM experiments.
- Add StandardScaler to the P-3 detector.
- Change threshold/event settings without explicit approval.
- Put Gemini API keys in frontend code.
- Automatically execute spacecraft commands.
- Invent physical causes unsupported by telemetry evidence.
- Claim P-3 metrics as overall metrics.
- Rewrite unrelated working backend/frontend code.

## 15. Final success checklist

- [ ] Existing backend still works.
- [ ] P-3 config loads.
- [ ] P-3 detector unit tests pass.
- [ ] Full P-3 integration reproduces event `5400 -> 6656`.
- [ ] REST telemetry flow works.
- [ ] WebSocket live flow works.
- [ ] Events are stored/logged.
- [ ] Gemini receives structured evidence.
- [ ] Gemini response is validated.
- [ ] Frontend receives anomaly event and AI analysis.
- [ ] Operator approval is visible.
- [ ] No secrets are exposed.

## 16. Final architecture

```text
Telemetry
   |
   v
P-3 change detector
   |
   v
Event grouping + buffering + merging
   |
   v
FastAPI backend
   |
   +--> event storage
   |
   +--> Gemini structured analysis
              |
              v
       diagnosis / severity /
       evidence / recommendation
              |
              v
       human/operator review
              |
              v
         dashboard
```
