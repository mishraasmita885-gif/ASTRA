# 9. The demo scenario

THIS is what your frontend needs to make look fucking good.

Your demo begins:

## 🟢 NORMAL

Dashboard:

```
ASTRA — AI MISSION CONTROL

MISSION       ACTIVE
SYSTEM        NOMINAL
TELEMETRY     LIVE
AI ENGINE     ONLINE
```

Telemetry:

```
Temperature       15°C
Voltage            24V
Battery            98%
Solar Input        96%
```

Charts are moving.

Subsystems:

```
POWER              🟢 HEALTHY
THERMAL            🟢 HEALTHY
COMMUNICATION      🟢 HEALTHY
ATTITUDE CONTROL   🟢 HEALTHY
```

Everything looks good.

* * *

# 10. Then you press the big button

### `SIMULATE SOLAR ARRAY STRIKE`

The backend injects:

```
Temperature = 85°C
Voltage = 11V
Battery = 82%
Solar Input = 0%
```

Now your UI should dramatically change.

* * *

# 11. What the user should SEE

### Telemetry

The graphs suddenly spike/drop.

```
TEMPERATURE
100 ┤                    ╭──
 80 ┤                  ╭─╯
 60 ┤                ╭─╯
 40 ┤───────────────╯
 20 ┤
    └──────────────────────
```

Voltage falls.

Solar input falls to zero.

* * *

### System status

Before:

```
SYSTEM
🟢 NOMINAL
```

After:

```
SYSTEM
🔴 CRITICAL
```

* * *

### Subsystem health

Before:

```
POWER             🟢 HEALTHY
THERMAL           🟢 HEALTHY
COMMUNICATION     🟢 HEALTHY
ATTITUDE          🟢 HEALTHY
```

After:

```
POWER             🔴 CRITICAL
THERMAL           🟠 WARNING
COMMUNICATION     🟢 HEALTHY
ATTITUDE          🟢 HEALTHY
```
