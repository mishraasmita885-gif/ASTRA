# 4. What is telemetry?

This is probably the first concept you need to understand.

Telemetry = **measurements being sent by the spacecraft.**

For your MVP, the report explicitly mentions:

```
Temperature
Voltage
Battery %
Solar Input
Communication parameters
Other subsystem parameters
```

Imagine the backend generates this every second:

```JSON
{
  "timestamp": "2026-09-17T10:30:01",
  "temperature": 15.2,
  "voltage": 24.1,
  "battery_pct": 98,
  "solar_input": 96
}
```

Then:

1 second later:

```JSON
{
  "timestamp": "2026-09-17T10:30:02",
  "temperature": 15.4,
  "voltage": 24.0,
  "battery_pct": 98,
  "solar_input": 95
}
```

Then:

```JSON
{
  "timestamp": "2026-09-17T10:30:03",
  "temperature": 15.1,
  "voltage": 24.2,
  "battery_pct": 98,
  "solar_input": 97
}
```

Your frontend plots these.

That's your **live telemetry graph**.