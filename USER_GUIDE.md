# ASTRA Mission Control - User Simulation Guide

Welcome to the ASTRA Mission Control demo! This guide will walk you through how to use the web application to simulate spacecraft telemetry, trigger an anomaly, and view the AI-driven diagnostics in real-time.

## 1. Start a Simulation

To begin testing the anomaly detection system, you need to launch a telemetry stream.

1. Navigate to the **Simulation** tab on the left sidebar.
2. Under "Select Telemetry Source / Failure Scenario", choose a scenario. 
   - **Recommended:** Select **NASA P-3 Dataset Replay**. This streams a real, historically labeled anomaly dataset from NASA spacecraft telemetry.
   - You can also choose synthetic crises like "Solar Array Strike" or "Battery Runaway" for instant alerts.
3. Leave the starting index at the default (e.g., `5200`). The known NASA P-3 anomaly occurs between steps `5400` and `6656`.
4. Click the yellow **Arm & Inject Fault Scenario** (or Launch NASA P-3 Replay) button.
5. Confirm the injection in the modal.

## 2. Monitor Live Telemetry

Once the simulation starts, the backend will begin streaming data to the frontend via WebSockets.

1. Navigate to the **Live Telemetry** or **Overview** tab.
2. Watch the live channels (like Channel P-3, Temperature, Regulated Bus, etc.) updating in real time.
3. If you selected the NASA P-3 dataset, you will see the system operating nominally at first. 
4. As the internal step counter approaches **5400**, the P-3 channel will experience a sudden step change. 
5. The **Numerical Change Detector** will trigger, immediately flagging the system into a **CRITICAL** state. The interface will flash red, and a Crisis Alert Banner will appear.

## 3. Inspect the Anomaly

When an anomaly is detected, it is bundled into an "Event" and sent to the Anomaly Center for review.

1. Click on **Inspect Anomaly** in the red crisis banner, or navigate to the **Anomaly Center** in the sidebar.
2. On the left side of the Anomaly Center, you will see your **Active Incident Queue**. Click on the newly generated anomaly.
3. The Inspector will show you exactly what numerical safety rules were tripped (e.g., *P3_CHANGE_DETECTION_THRESHOLD > 0.3889*).
4. Scroll down to see the **Dual-Curve Anomaly Waveform**, visualizing the exact moment the data breached the learned thresholds.

## 4. Trigger Gemini AI Reasoning

ASTRA uses Google's Gemini AI to translate raw numerical alerts into human-readable engineering diagnostics.

1. In the Anomaly Center, click the purple **Analyze with Gemini** button at the top right of the Inspector.
2. The backend will package the telemetry evidence, event duration, and thresholds, and send them to the Gemini Reasoner.
3. Wait a few seconds for the AI to return its structured assessment.
4. Review the **Gemini Structured AI Reasoning** card. It will provide:
   - A factual root cause / diagnosis.
   - Grounded empirical evidence from the telemetry stream.
   - Specific safe-state recommendations for the spacecraft.

## 5. Operator Command Sign-off

ASTRA operates under strict "Human-in-the-loop" constraints. It will never autonomously execute commands on a spacecraft.

1. Scroll to the bottom of the Anomaly Inspector to find the **Human-in-the-Loop Operator Commands**.
2. Review the contingency commands staged by the system based on the AI's recommendation (e.g., `CMD_SAFE_MODE` or `CMD_DIAG_ISOLATE`).
3. Act as the Flight Director: click **Authorize Command** to approve the execution, or **Reject** to override it manually.
4. Your decisions are securely recorded in the **Mission Audit Ledger**, which you can view in the **Event Log** tab.

---

### Resetting the System
If you want to run a different scenario or return the dashboard to a healthy state, click the **Reset Nominal Stream** button located on either the Overview or Simulation pages. This resets the numerical detector and returns the telemetry stream to baseline noise.
