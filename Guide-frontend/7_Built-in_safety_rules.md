# 7. But ASTRA also has simple safety rules

This is actually a good thing.

You don't have to rely entirely on ML.

For example:

```
Voltage < 12V
```

could immediately trigger a warning.

Or:

```
Solar input < minimum
```

The project proposes combining:

```
SAFETY RULES
     +
ML ANOMALY DETECTION
     +
GEMINI REASONING
```

So your backend can eventually do:

```Python
if voltage < 12:
    anomaly = True
```

while the ML model might detect more subtle patterns.
