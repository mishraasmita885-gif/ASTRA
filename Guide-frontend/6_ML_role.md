# 6. Then what is the ML guy doing?

This is the part you **don't need to implement yourself**, but you absolutely need to understand.

The ML model looks at a sequence of telemetry.

For example:

```
t1
t2
t3
t4
...
t30
```

Each timestamp might contain:

```
temperature
voltage
battery
solar input
```

The proposed model is an **LSTM Autoencoder**.

The report explains that it learns normal telemetry behaviour and reconstructs it. Abnormal behaviour produces a larger reconstruction error.

Basically:

### Normal

```
Actual:

15 24 98 96
15 24 98 95
16 24 97 96

       ↓ ML

Looks normal
```

### Weird

```
15 24 98 96
18 22 94 70
85 11 82  0

       ↓ ML

🚨 ANOMALY
```

The model produces something like:

```JSON
{
    "anomaly": true,
    "anomaly_score": 0.94
}
```

Your backend takes that result.
