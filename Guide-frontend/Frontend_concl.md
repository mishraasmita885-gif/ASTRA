# 23. What data does the frontend actually receive?

This is the part you should discuss with your backend teammate **right now**.

I would establish a contract like this.

## WebSocket

### `/ws/telemetry`

Every second:

```JSON
{
  "timestamp": "2026-09-17T10:30:01Z",
  "temperature": 15.2,
  "voltage": 24.1,
  "battery_pct": 98,
  "solar_input": 96,
  "communication_status": "ONLINE"
}
```

* * *

## REST

### `GET /api/health`

```JSON
{
  "system": "NOMINAL",
  "mission": "ACTIVE",
  "ai": "ONLINE",
  "telemetry": "LIVE"
}
```

* * *

### `GET /api/mission-status`

```JSON
{
  "mission_id": "ASTRA-001",
  "mission_name": "ASTRA Demonstration Mission",
  "spacecraft_name": "ASTRA-1",
  "mission_status": "ACTIVE",
  "current_phase": "ORBITAL_OPERATIONS"
}
```

* * *

### `GET /api/events`

```JSON
[
  {
    "id": "EVT001",
    "timestamp": "...",
    "type": "SOLAR_INPUT_ANOMALY",
    "subsystem": "POWER",
    "severity": "CRITICAL",
    "status": "ACTIVE"
  }
]
```

* * *

### `POST /api/trigger-crisis`

Frontend:

```
POST
/api/trigger-crisis
```

Backend:

```
activate solar failure
```

Then telemetry starts changing.

* * *

# 24. And your WebSocket could eventually send anomaly data too

Instead of making the frontend repeatedly request:

```
GET /anomaly
```

your WebSocket message could become:

```JSON
{
  "type": "anomaly",
  "timestamp": "...",

  "telemetry": {
    "temperature": 85,
    "voltage": 11,
    "battery_pct": 82,
    "solar_input": 0
  },

  "anomaly": {
    "detected": true,
    "score": 0.94
  },

  "diagnosis": {
    "subsystem": "POWER / THERMAL",
    "severity": "CRITICAL",
    "confidence": 91,
    "explanation": "...",
    "survival_probability": 72
  },

  "recommendations": [
    {
      "command": "CMD_SAFE_MODE",
      "priority": "HIGH",
      "approval_status": "PENDING"
    }
  ]
}
```

Then your frontend becomes extremely easy:

```
WebSocket
     ↓
React state
     ↓
UI
```

* * *

# 25. One thing I would change in your architecture

The report currently describes FastAPI sitting between everything.

That's okay.

But conceptually think of your backend as the **orchestrator**:

```
                    FASTAPI
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
 Telemetry          ML Model         Gemini
       │               │                │
       └───────────────┼────────────────┘
                       │
                       ▼
                  Unified Event
                       │
                 ┌─────┴─────┐
                 ▼           ▼
             WebSocket    PostgreSQL
                 │
                 ▼
              FRONTEND
```

That means your frontend doesn't need to know:

* how LSTM works
* how Gemini works
* how the dataset works
* how anomaly scores are calculated

It just consumes **clean API responses**.

* * *

# 26. What you should NOT put in the frontend

Don't make the dashboard a giant science project.

You don't need:

```
LSTM architecture
Training loss
Epoch 1
Epoch 2
Epoch 3
Reconstruction error graph
Dataset preprocessing
```

Those are useful for your **presentation/research explanation**, not necessarily the operator dashboard.

The report itself says evaluation metrics such as precision, recall and F1 can be kept in project documentation rather than cluttering the main dashboard.

Your operator wants:

> **What's happening?**

> **How bad is it?**

> **Why?**

> **What should I do?**

* * *

# 27. Your frontend's ideal information hierarchy

Think:

### Level 1 — Is spacecraft okay?

```
🟢 NOMINAL
```

### Level 2 — What's happening?

```
Solar input → 0%
Voltage → 11V
Temperature → 85°C
```

### Level 3 — Where is the problem?

```
POWER / THERMAL
```

### Level 4 — How serious?

```
CRITICAL
```

### Level 5 — Why?

```
Solar input collapse + voltage decline
+ temperature increase
```

### Level 6 — What should we do?

```
SAFE MODE
REDUCE POWER
REORIENT
```

### Level 7 — Human decision

```
APPROVE / REJECT
```

That's basically the entire UX.
