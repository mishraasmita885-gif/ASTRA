# PAGE 6 — Event Log

Very simple.

```
MISSION EVENT LOG

18:31:04
Telemetry stream connected

18:31:12
System nominal

18:32:20
Solar input anomaly detected

18:32:21
Voltage anomaly detected

18:32:22
AI diagnosis initiated

18:32:24
Critical event identified

18:32:25
Recovery recommendations generated
```

These events are explicitly described in the report.

* * *

# PAGE 7 — Mission Timeline

This can be more visual.

```
MISSION TIMELINE

────────●────────●────────●────────●────────
       │         │        │
     Launch    Nominal   Anomaly   Recovery
```

And event markers.

This isn't as technically important as telemetry/anomaly pages, but it makes the application feel like an actual mission-control system.

* * *

# PAGE 8 — Simulation

This is **VERY important for your hackathon demo.**

You need a dedicated simulation control.

```
SIMULATION CONTROL

Scenario

[ Solar Array Failure ▼ ]

Current State
🟢 NORMAL

────────────────────────

SIMULATION

[ INITIATE SCENARIO ]
```

Then:

```
⚠ CONFIRM SIMULATION

Solar-array failure scenario

This will inject abnormal telemetry.

[ CANCEL ] [ START ]
```

Then everything changes.

The report explicitly specifies this crisis simulation.
