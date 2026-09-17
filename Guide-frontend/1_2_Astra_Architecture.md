# 1. First: What the hell is ASTRA?

Think of ASTRA as:

> **"An AI doctor + monitoring dashboard for a spacecraft."**

A spacecraft constantly sends numbers:

* Temperature
* Voltage
* Battery %
* Solar power/input
* Communication status
* Attitude-related data
* etc.

Those numbers are called **telemetry**.

Your application watches those numbers continuously.

If everything is normal:

```
Temperature: 15°C
Voltage:     24V
Battery:     98%
Solar:       96%

             ↓

        🟢 NORMAL
```

But suppose something happens:

```
Temperature: 85°C
Voltage:     11V
Battery:     82%
Solar:       0%

             ↓

        🔴 ANOMALY
```

ASTRA then tries to answer:

> **What is happening?**

> **Which subsystem is affected?**

> **How serious is it?**

> **Why does the system think that?**

> **What should the operator do?**

That's the entire project.

The report describes this as:

```
TELEMETRY
    ↓
DETECT
    ↓
DIAGNOSE
    ↓
ASSESS
    ↓
RECOMMEND
    ↓
OPERATOR APPROVAL
```


# 2. The most important thing: understand the architecture

This is what you should keep in your head:

```
                 SPACECRAFT DATA
                       │
                       ▼
              ┌─────────────────┐
              │ Telemetry Engine│
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Anomaly Detector│
              │  ML + Rules     │
              └────────┬────────┘
                       │
                anomaly detected?
                    /        \
                  NO          YES
                  │            │
                  │            ▼
                  │     Recent telemetry
                  │          window
                  │            │
                  │            ▼
                  │     ┌─────────────┐
                  │     │   Gemini    │
                  │     │ AI Reasoning│
                  │     └──────┬──────┘
                  │            │
                  │            ▼
                  │     Diagnosis
                  │     Severity
                  │     Confidence
                  │     Risk
                  │     Commands
                  │            │
                  └──────┬─────┘
                         │
                         ▼
                  ┌─────────────┐
                  │   FastAPI   │
                  └──────┬──────┘
                         │
               ┌─────────┴─────────┐
               │                   │
          WebSocket              REST
               │                   │
               ▼                   ▼
         LIVE DASHBOARD      Historical data
```

The report's final architecture follows essentially this flow.

