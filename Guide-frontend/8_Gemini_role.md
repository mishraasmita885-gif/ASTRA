# 8. Then Gemini comes in

This is the coolest part of the project.

ML says:

> "Something abnormal is happening."

But ML doesn't necessarily explain:

> "What does this mean?"

That's where Gemini comes in.

The backend gives Gemini:

```
Recent telemetry
+
Anomaly score
+
Violated thresholds
+
Affected channels
+
Subsystem states
+
Mission context
+
Previous anomaly information
```

Gemini then returns structured information such as:

```JSON
{
    "telemetry_analysis": "...",
    "criticality_level": "CRITICAL",
    "root_cause_diagnosis": "...",
    "confidence_score": 91,
    "flight_director_commands": [
        "CMD_SAFE_MODE",
        "CMD_REDUCE_POWER",
        "CMD_REORIENT"
    ],
    "survival_probability": 72
}
```

The report gives essentially this structure.