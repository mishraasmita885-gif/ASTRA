# 3. Your frontend is NOT doing the AI

This is extremely important.

Your React/Next.js frontend shouldn't be thinking:

> "Is voltage anomalous?"

No.

The frontend's job is basically:

### Backend says:

```JSON
{
  "temperature": 85,
  "voltage": 11,
  "battery": 82,
  "solar_input": 0
}
```

Frontend:

> "Okay, I'll draw that on the chart."

Then backend says:

```JSON
{
  "anomaly": true,
  "severity": "CRITICAL",
  "subsystem": "POWER",
  "confidence": 91
}
```

Frontend:

> "Okay, I'll turn the dashboard red."

Then backend/Gemini says:

```JSON
{
  "diagnosis": "...",
  "commands": [
    "CMD_SAFE_MODE",
    "CMD_REDUCE_POWER",
    "CMD_REORIENT"
  ]
}
```

Frontend:

> "I'll show those recommendations to the operator."

So your frontend is basically the **mission-control cockpit**.
