# 12. AI Mission Assistant

This should become the centerpiece.

Something like:

```
┌─────────────────────────────────────────┐
│ 🔴 ANOMALY DETECTED                     │
│                                         │
│ Affected Subsystem                      │
│ POWER / THERMAL                         │
│                                         │
│ Criticality                             │
│ CRITICAL                                │
│                                         │
│ Confidence                              │
│ 91%                                     │
│                                         │
│ Diagnosis                               │
│ Telemetry indicates a simultaneous      │
│ reduction in solar input and spacecraft │
│ voltage accompanied by abnormal         │
│ temperature increase.                   │
│                                         │
│ Evidence                                │
│ • Solar input → 0%                      │
│ • Voltage → 11V                         │
│ • Temperature → 85°C                    │
└─────────────────────────────────────────┘
```

The report specifically calls for the affected subsystem, diagnosis, criticality and confidence to appear here.

* * *

# 13. Then Recommended Actions

Below it:

```
┌─────────────────────────────────────┐
│ RECOMMENDED ACTIONS                 │
│                                     │
│ ⚠ CMD_SAFE_MODE                    │
│   Enter spacecraft safe mode        │
│                                     │
│ ⚡ CMD_REDUCE_POWER                │
│   Reduce non-essential consumption  │
│                                     │
│ 🛰 CMD_REORIENT                    │
│   Reorient spacecraft               │
│                                     │
│       [ APPROVE ]  [ REJECT ]       │
└─────────────────────────────────────┘
```

**Important:** these are recommendations, not real commands.

The operator approves/rejects them.
