ASTRA — AUTONOMOUS SPACECRAFT TELEMETRY & RESPONSE ASSISTANT

PROJECT DEVELOPMENT AND IMPLEMENTATION REPORT

1. PROJECT OVERVIEW

ASTRA is an AI-powered mission-control platform designed to monitor spacecraft telemetry continuously, detect abnormal behaviour, identify the likely affected subsystem, explain the evidence behind the anomaly, assess mission risk, and generate recommended recovery actions for operator approval.

The main objective of ASTRA is not simply to detect that a spacecraft parameter has crossed a threshold. The system is designed to convert raw telemetry into an understandable and actionable mission decision.

The core workflow of ASTRA is:

TELEMETRY → DETECT → DIAGNOSE → ASSESS → RECOMMEND → OPERATOR APPROVAL

ASTRA will initially operate as a decision-support system rather than directly controlling a real spacecraft. The AI-generated commands will therefore be recommendations that require human/operator approval before execution.

The system will combine machine-learning-based telemetry anomaly detection with Google's Gemini API as an AI reasoning and explanation layer. The ML component will identify abnormal numerical behaviour, while Gemini will analyse the detected event together with relevant telemetry context and generate a structured diagnosis, severity assessment, explanation, confidence score, and recommended recovery actions.

2. PROBLEM STATEMENT

Modern spacecraft continuously generate large volumes of telemetry from different subsystems such as power, thermal management, communication, attitude control, propulsion, and onboard computing.

Monitoring these parameters manually is difficult because:

• Large numbers of telemetry channels must be monitored simultaneously.
• Abnormal behaviour may involve multiple parameters rather than one parameter.
• A simple threshold violation does not necessarily explain the actual problem.
• Operators may need to manually investigate several telemetry signals before identifying the affected subsystem.
• Existing anomaly detection approaches may identify unusual behaviour without providing an understandable explanation or recommended response.
• Mission-control workflows can become fragmented between monitoring, anomaly detection, diagnosis, and response.

ASTRA addresses this problem by creating one unified AI-assisted mission-control platform that connects telemetry monitoring, anomaly detection, diagnosis, explanation, risk assessment, and response recommendation.

3. PROJECT OBJECTIVES

The major objectives of ASTRA are:

1. Continuously receive and monitor spacecraft telemetry.

2. Detect abnormal telemetry behaviour automatically.

3. Identify which spacecraft subsystem is most likely affected.

4. Analyse relationships between multiple telemetry parameters.

5. Explain why an anomaly has been detected.

6. Estimate the criticality and confidence of the detected event.

7. Generate recommended recovery commands.

8. Present all information through a real-time mission-control dashboard.

9. Maintain a record of important anomaly events and AI decisions.

10. Validate the anomaly-detection approach using publicly available spacecraft telemetry data.

11. Demonstrate the complete system using realistic simulated spacecraft failures.

12. Keep the operator in control of any recovery action.

13. KEY INNOVATION OF ASTRA

The major innovation of ASTRA is the combination of telemetry anomaly detection with an explainable AI reasoning layer.

Traditional workflow:

Telemetry → Fixed Rules/Thresholds → Alert → Human Investigation → Manual Diagnosis → Manual Response

ASTRA workflow:

Telemetry → ML Anomaly Detection → Gemini Reasoning → Diagnosis → Explanation → Risk Assessment → Recommended Response

The system therefore attempts to reduce the gap between detecting an anomaly and understanding what should be done about it.

Gemini is not responsible for replacing the numerical anomaly detector. Instead, the machine-learning/anomaly-detection layer identifies unusual telemetry behaviour, and Gemini acts as the reasoning layer that interprets the detected event using multiple telemetry signals and mission context.

5. COMPLETE SYSTEM WORKFLOW

The complete ASTRA workflow will be implemented as follows.

Step 1: Telemetry Generation or Data Input

Telemetry will enter the system from either:

• A real/public spacecraft telemetry dataset.
• A simulated real-time telemetry generator for the live demonstration.

The telemetry will contain parameters such as:

• Temperature
• Voltage
• Battery percentage
• Solar input
• Current
• Communication parameters
• Additional subsystem-specific parameters when available

Step 2: Telemetry Preprocessing

The backend will receive telemetry and perform:

• Data validation
• Missing-value handling
• Timestamp validation
• Normalization/scaling
• Noise handling
• Window creation for ML analysis

Step 3: Anomaly Detection

The processed telemetry will be passed to the anomaly-detection component.

The model will determine whether the current telemetry behaviour is normal or anomalous.

Step 4: Anomaly Context Collection

When an anomaly is detected, ASTRA will collect a recent telemetry window, such as the previous 15 seconds of live telemetry.

This gives the AI system temporal context instead of analysing only one isolated measurement.

Step 5: AI Diagnosis

The telemetry window and anomaly information will be sent to Gemini.

Gemini will analyse:

• Abnormal telemetry values
• Relationships between telemetry parameters
• Recent changes
• Affected subsystem indicators
• Severity
• Possible cause
• Mission context

Step 6: Risk Assessment

The system will classify the event into:

LOW
MEDIUM
HIGH
CRITICAL

The AI will also provide a confidence score.

Step 7: Response Recommendation

ASTRA will generate recommended recovery actions such as:

• Enter safe mode
• Reduce non-essential power consumption
• Reorient spacecraft
• Prioritize battery charging
• Disable affected subsystem
• Continue monitoring

These are recommendations and are not automatically executed on a real spacecraft.

Step 8: Mission Dashboard

The frontend will display:

• Live telemetry
• System health
• Detected anomaly
• Affected subsystem
• AI explanation
• Criticality
• Confidence
• Recommended commands
• Recent events
• Mission timeline

Step 9: Operator Approval

The operator can review the AI recommendation before any command is considered for execution.

For the hackathon prototype, command execution will be simulated rather than connected to a real spacecraft.

6. FRONTEND DEVELOPMENT

The frontend will be developed as a modern mission-control dashboard.

Technology stack:

• Next.js
• React
• Tailwind CSS
• Recharts
• Framer Motion
• WebSocket client

The interface will follow a professional aerospace mission-control design.

The visual style will use:

• Dark background
• Glass-style panels
• Thin borders
• Minimal neon accents
• Orange
• Green
• Purple
• Blue
• Yellow

The objective is to keep the interface visually impressive but not overloaded with unnecessary controls.

The main dashboard will contain the following sections.

6.1 HEADER

The header will display:

ASTRA

AI Mission Control

It can also contain high-level mission status such as:

• Mission: ACTIVE
• System: NOMINAL
• AI Status: ONLINE
• Telemetry: LIVE

6.2 SYSTEM STATUS

A system-status section will show the current health of the spacecraft.

Example:

SYSTEM STATUS
NOMINAL

MISSION
ACTIVE

TELEMETRY
LIVE

AI ENGINE
ONLINE

6.3 LIVE TELEMETRY

The frontend will receive telemetry through WebSockets.

Charts will display parameters such as:

• Temperature
• Voltage
• Battery
• Solar input

The charts will update automatically without requiring the user to refresh the page.

Recharts will be used to visualize the time-series telemetry.

6.4 SUBSYSTEM HEALTH

The dashboard will display the estimated health of major spacecraft subsystems.

Example:

POWER SYSTEM — HEALTHY
THERMAL SYSTEM — HEALTHY
COMMUNICATION — HEALTHY
ATTITUDE CONTROL — HEALTHY

During a simulated failure, the affected subsystem will change state.

Example:

POWER SYSTEM — CRITICAL
THERMAL SYSTEM — WARNING

6.5 AI MISSION ASSISTANT

This section will display Gemini's analysis.

Example:

ANOMALY DETECTED

Likely affected subsystem:
POWER / THERMAL

Diagnosis:
Telemetry indicates a simultaneous reduction in solar input and spacecraft voltage accompanied by an abnormal temperature increase.

Criticality:
CRITICAL

Confidence:
91%

6.6 COMMAND RECOMMENDATIONS

The AI-generated recommendations will appear as a structured command list.

Example:

RECOMMENDED ACTIONS

CMD_SAFE_MODE
CMD_REDUCE_POWER
CMD_REORIENT

The interface will clearly indicate that these are recommended actions requiring operator approval.

6.7 RECENT EVENTS

The dashboard will maintain a timeline of important events.

Example:

18:31:04 — Telemetry stream connected
18:31:12 — System nominal
18:32:20 — Solar input anomaly detected
18:32:21 — Voltage anomaly detected
18:32:22 — AI diagnosis initiated
18:32:24 — Critical event identified
18:32:25 — Recovery recommendations generated

6.8 SIMULATION CONTROL

A primary button will allow the team to demonstrate the system.

Button:

SIMULATE SOLAR ARRAY STRIKE

When pressed, the backend will inject abnormal telemetry into the simulator.

Example:

Normal:

Temperature = 15°C
Voltage = 24 V
Battery = 98%
Solar Input = 96%

Crisis:

Temperature = 85°C
Voltage = 11 V
Battery = 82%
Solar Input = 0%

The dashboard will immediately show the anomaly and trigger the AI analysis pipeline.

7. BACKEND DEVELOPMENT

The backend will be developed using Python and FastAPI.

Main technologies:

• Python
• FastAPI
• WebSockets
• asyncio
• Pydantic
• NumPy
• Pandas
• Google GenAI SDK

The backend will act as the central communication layer between telemetry, machine-learning models, Gemini, database services, and the frontend.

7.1 FASTAPI SERVER

FastAPI will provide the main REST API endpoints.

Example endpoints:

GET /api/health

Returns system health.

GET /api/telemetry

Returns recent telemetry.

POST /api/trigger-crisis

Triggers the simulated spacecraft failure.

GET /api/events

Returns recent anomaly events.

GET /api/mission-status

Returns the current mission state.

7.2 WEBSOCKET TELEMETRY STREAM

A WebSocket connection will be created between the backend and frontend.

The backend will continuously generate or process telemetry and send it to connected clients.

Example message:

{
"timestamp": "2026-09-13T18:32:20",
"temperature": 15.2,
"voltage": 24.1,
"battery_pct": 98,
"solar_input": 96
}

This allows the dashboard to behave like a real-time mission-control system.

7.3 TELEMETRY SIMULATOR

For the hackathon demonstration, a telemetry simulator will generate spacecraft data every second.

Normal values will remain within realistic operating ranges.

Example:

Temperature: approximately 15°C
Voltage: approximately 24V
Battery: approximately 100%
Solar input: approximately 100%

The simulator will also support controlled anomalies.

For the solar-array failure scenario:

Temperature: 85°C
Voltage: 11V
Battery: 82%
Solar input: 0%

The simulator allows the entire ASTRA system to be demonstrated without requiring access to a real spacecraft.

8. DATABASE DESIGN

A database is not required for the real-time telemetry stream itself. The live stream can operate using in-memory data and WebSockets.

However, a database will be useful for persistent storage of mission events and historical analysis.

PostgreSQL can be used as the primary database.

The database can contain the following tables.

8.1 TELEMETRY TABLE

Fields:

• id
• timestamp
• mission_id
• temperature
• voltage
• battery_percentage
• solar_input
• communication_status
• anomaly_status

8.2 ANOMALY EVENTS TABLE

Fields:

• anomaly_id
• timestamp
• anomaly_type
• affected_subsystem
• severity
• confidence
• detection_method
• status

8.3 AI ANALYSIS TABLE

Fields:

• analysis_id
• anomaly_id
• diagnosis
• explanation
• confidence_score
• criticality_level
• survival_probability
• generated_at

8.4 COMMAND RECOMMENDATIONS TABLE

Fields:

• command_id
• anomaly_id
• command_name
• command_description
• priority
• approval_status
• created_at

8.5 MISSION TABLE

Fields:

• mission_id
• mission_name
• spacecraft_name
• mission_status
• start_time
• current_phase

For the hackathon MVP, the database can be kept simple. Real-time telemetry does not need to be stored indefinitely because this would unnecessarily increase implementation complexity.

9. DATASET

ASTRA will use publicly available spacecraft telemetry data for model development and validation.

The primary dataset will be the NASA SMAP/MSL anomaly detection dataset.

It contains telemetry from:

• NASA Soil Moisture Active Passive (SMAP) satellite
• NASA Mars Science Laboratory (MSL) rover

The dataset contains multiple telemetry channels and labelled anomalous periods.

The dataset is valuable because it is based on real mission telemetry rather than artificially generated data.

The NASA SMAP/MSL data can therefore be used to evaluate whether ASTRA's anomaly-detection methodology can identify abnormal spacecraft behaviour.

10. DATA PREPROCESSING

Before model training, the telemetry data will be cleaned and transformed.

The preprocessing pipeline will include:

Step 1: Load telemetry files.

Step 2: Identify telemetry channels.

Step 3: Convert timestamps into a consistent format.

Step 4: Handle missing values.

Step 5: Remove invalid records.

Step 6: Normalize numerical telemetry values.

Step 7: Divide telemetry into time-series windows.

For example, a sequence may contain 30 consecutive telemetry measurements.

Each training sample can therefore be represented as:

X = [t1, t2, t3, ..., t30]

where each time step contains multiple telemetry parameters.

11. TRAINING STRATEGY

ASTRA should not attempt to train Gemini.

Gemini is a pre-trained foundation model accessed through the Gemini API.

The machine-learning component is responsible for numerical anomaly detection, while Gemini performs reasoning, explanation, diagnosis, and response recommendation.

The training pipeline will therefore be:

NASA TELEMETRY DATA
↓
DATA CLEANING
↓
NORMALIZATION
↓
TIME-SERIES WINDOWS
↓
ML MODEL TRAINING
↓
ANOMALY SCORE
↓
GEMINI REASONING
↓
DIAGNOSIS + RESPONSE

12. MODEL TRAINING APPROACH

For the initial ASTRA implementation, an unsupervised or semi-supervised time-series anomaly-detection approach is practical.

The model can be trained primarily on normal telemetry behaviour.

A suitable approach is an LSTM Autoencoder.

The LSTM Autoencoder consists of:

Encoder → Latent Representation → Decoder

The encoder learns the normal temporal behaviour of telemetry.

The decoder attempts to reconstruct the original telemetry sequence.

When normal telemetry is passed through the model:

Original telemetry → Encoder → Decoder → Reconstructed telemetry

The reconstruction error should remain relatively small.

When anomalous telemetry is passed through the model, the model should produce a larger reconstruction error because the pattern differs from what it learned as normal.

Therefore:

Low reconstruction error → Normal

High reconstruction error → Potential anomaly

13. LSTM AUTOENCODER TRAINING PROCESS

Step 1: Select normal telemetry periods from the NASA dataset.

Step 2: Normalize each telemetry channel.

Step 3: Create fixed-length sequences.

For example:

Window size = 30 time steps

Step 4: Split the normal data into:

• Training set
• Validation set

Step 5: Train the LSTM Autoencoder using normal sequences.

Step 6: Calculate reconstruction error on validation data.

Step 7: Determine an anomaly threshold.

For example:

Threshold = mean reconstruction error + k × standard deviation

where k is selected using validation data.

Step 8: Evaluate the trained model on labelled anomalous sequences.

Step 9: Measure:

• Precision
• Recall
• F1-score
• False positive rate
• Detection delay

The objective is not merely to maximize accuracy but to reduce missed anomalies while keeping false alarms manageable.

14. ALTERNATIVE FAST MVP ANOMALY DETECTOR

If the LSTM Autoencoder requires too much development time during the hackathon, ASTRA can initially use a simpler anomaly detector such as Isolation Forest or a statistical/threshold-based detector.

The recommended development strategy is:

MVP:

Statistical thresholds + Isolation Forest

Advanced version:

LSTM Autoencoder

This allows the complete application to remain functional even if deep-learning training requires additional time.

The threshold-based layer can also remain in the final architecture as a fast safety check.

For example:

Temperature > safe threshold
Voltage < safe threshold
Solar input < minimum threshold

can immediately trigger an anomaly event.

The ML detector can then provide more sophisticated anomaly scoring.

15. WHY BOTH ML AND THRESHOLDS ARE USED

Thresholds and machine learning serve different purposes.

Thresholds are useful for obvious safety violations.

For example:

Voltage < 12V

can immediately trigger a warning.

Machine learning is useful for identifying patterns that may not violate one fixed threshold.

For example:

Voltage gradually decreasing
+
Solar input decreasing
+
Battery discharge increasing

may indicate an emerging power-system problem even before an individual parameter reaches a critical threshold.

ASTRA can therefore combine:

RULE-BASED SAFETY CHECKS + ML ANOMALY DETECTION + GEMINI REASONING

16. MODEL EVALUATION

The model will be evaluated using the NASA telemetry dataset.

The main evaluation metrics will be:

Precision

Precision measures how many detected anomalies were actually anomalies.

Recall

Recall measures how many actual anomalies were successfully detected.

F1-score

F1-score balances precision and recall.

False Positive Rate

This measures how often the system incorrectly identifies normal behaviour as anomalous.

Detection Delay

This measures how quickly ASTRA identifies an anomaly after it begins.

For the hackathon demonstration, these metrics can be displayed in the project documentation rather than cluttering the main dashboard.

17. GEMINI AI INTEGRATION

Google Gemini 2.5 Flash will be used as ASTRA's AI reasoning engine.

Gemini will not directly replace the anomaly-detection model.

Instead, Gemini will receive structured information such as:

• Recent telemetry window
• Anomaly score
• Violated thresholds
• Affected telemetry channels
• Current subsystem states
• Mission context
• Previous anomaly information

Gemini will then produce a structured response.

18. GEMINI STRUCTURED OUTPUT

The AI response will follow a predefined schema.

Example:

AstraUnifiedResponse

telemetry_analysis

criticality_level

root_cause_diagnosis

confidence_score

flight_director_commands

survival_probability

Example response:

Telemetry Analysis:
Solar input has dropped to zero while voltage is falling and temperature is increasing.

Criticality:
CRITICAL

Root Cause Diagnosis:
Telemetry is consistent with a power-generation failure affecting the solar-array/power subsystem.

Confidence:
91%

Recommended Commands:

CMD_SAFE_MODE
CMD_REDUCE_POWER
CMD_REORIENT

Survival Probability:
72%

19. AI PROMPT DESIGN

Gemini will be instructed to behave as a spacecraft mission-control reasoning system.

The prompt will define three logical responsibilities:

Role 1 — Telemetry Analyst

Analyse telemetry values and identify abnormal patterns.

Role 2 — Fault Diagnosis Specialist

Determine the most likely affected subsystem and explain the evidence.

Role 3 — Flight Director Assistant

Assess mission criticality and recommend appropriate operator actions.

These are three logical roles within one unified Gemini reasoning call. They do not need to be implemented as three separate AI agents.

This approach reduces unnecessary API calls and keeps the architecture simpler and faster.

20. AI VALIDATION

Structured output alone does not guarantee that the AI's conclusions are physically correct.

Therefore, ASTRA will apply application-level validation.

The backend will verify:

• Criticality is one of the allowed values.
• Confidence is between 0 and 100.
• Survival probability is between 0 and 100.
• Commands belong to an approved command vocabulary.
• Required fields are present.
• The response follows the expected Pydantic schema.

The AI output will also be presented as a recommendation rather than an automatically executed spacecraft command.

21. ANOMALY-TO-AI TRIGGER

Gemini should not be called for every telemetry message because that would create unnecessary API calls.

Instead, the backend will continuously monitor telemetry.

Normal condition:

Telemetry → Anomaly detector → No anomaly → Continue monitoring

Anomaly condition:

Telemetry → Anomaly detector → Anomaly detected → Collect recent telemetry → Gemini analysis

For example, ASTRA may collect the previous 15 seconds of telemetry whenever a significant anomaly occurs.

This makes the AI analysis more context-aware and reduces unnecessary API usage.

22. CRISIS SIMULATION

The main demonstration scenario will be a simulated solar-array/power failure.

Normal state:

Temperature = 15°C
Voltage = 24V
Battery = 98%
Solar Input = 96%

The user presses:

SIMULATE SOLAR ARRAY STRIKE

The simulator changes the telemetry:

Temperature = 85°C
Voltage = 11V
Battery = 82%
Solar Input = 0%

The anomaly detector identifies abnormal behaviour.

The backend collects recent telemetry.

Gemini analyses the event.

ASTRA produces:

Affected subsystem:
Power / Thermal

Criticality:
CRITICAL

Confidence:
91%

Recommended actions:

CMD_SAFE_MODE
CMD_REDUCE_POWER
CMD_REORIENT

The frontend then visually presents the transition from normal mission state to critical anomaly and AI-assisted response.

23. IMPORTANT LIMITATION OF THE SIMULATION

The system should not claim that the telemetry itself proves that a physical solar-array strike or micrometeoroid impact occurred.

The simulation should be described as:

“Simulated solar-array failure scenario”

or:

“Telemetry pattern consistent with a solar-array/power subsystem failure scenario.”

This is scientifically and technically more defensible.

ASTRA identifies abnormal telemetry behaviour and provides the most likely subsystem diagnosis based on available evidence. It does not physically inspect the spacecraft.

24. API AND BACKEND INTEGRATION

The communication architecture will be:

Frontend
↓
FastAPI REST APIs
↓
Telemetry Processing
↓
Anomaly Detection
↓
Gemini API
↓
Structured AI Response
↓
FastAPI
↓
Frontend

WebSockets will be used for real-time telemetry.

REST APIs will be used for:

• Triggering simulations
• Fetching historical events
• Fetching mission information
• Retrieving AI analysis
• Checking system status

25. PROJECT DIRECTORY STRUCTURE

A practical project structure can be:

ASTRA/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── charts/
│   ├── dashboard/
│   ├── services/
│   └── styles/
│
├── backend/
│   ├── main.py
│   ├── api/
│   ├── telemetry/
│   ├── anomaly_detection/
│   ├── ai/
│   ├── database/
│   ├── models/
│   └── simulator/
│
├── ml/
│   ├── data/
│   ├── preprocessing/
│   ├── training/
│   ├── models/
│   └── evaluation/
│
├── datasets/
│
├── tests/
│
├── requirements.txt
├── README.md
└── docker-compose.yml

26. FRONTEND COMPONENT STRUCTURE

The frontend can contain components such as:

DashboardHeader
SystemStatus
MissionStatus
TelemetryChart
SatelliteView
SubsystemHealth
AIMissionAssistant
CommandPanel
EventLog
MissionTimeline
SimulationControls

Each component should have a single responsibility.

The dashboard page will combine these components into the complete mission-control interface.

27. BACKEND COMPONENT STRUCTURE

The backend can be divided into:

Telemetry Service

Responsible for receiving and generating telemetry.

Anomaly Detection Service

Responsible for calculating anomaly scores.

AI Service

Responsible for communicating with Gemini.

Diagnosis Service

Responsible for processing AI diagnosis.

Database Service

Responsible for persistent event storage.

WebSocket Service

Responsible for real-time frontend communication.

Simulation Service

Responsible for injecting controlled failure scenarios.

28. DATABASE AND REAL-TIME DATA SEPARATION

ASTRA should separate real-time data from historical data.

Real-time layer:

FastAPI
+
asyncio
+
WebSockets
+
in-memory telemetry buffer

Historical layer:

PostgreSQL

This architecture prevents the database from becoming a bottleneck for high-frequency telemetry streaming.

The most recent telemetry window can be maintained in memory.

Important events and AI analyses can then be saved to PostgreSQL.

29. SECURITY AND SAFETY

Because ASTRA is related to spacecraft operations, safety should be considered in the design.

The prototype will follow these principles:

1. AI recommendations will not directly control a real spacecraft.

2. Commands will require operator approval.

3. AI output will be validated before display.

4. API keys will be stored in environment variables rather than source code.

5. The frontend will not expose the Gemini API key.

6. Backend authentication can be added for future deployment.

7. Command vocabulary will be restricted to approved simulated commands.

8. The system will maintain an event log for important AI decisions.

9. DEPLOYMENT ARCHITECTURE

The system can be deployed using:

Frontend:
Next.js

Backend:
FastAPI

Database:
PostgreSQL

AI:
Google Gemini API

ML:
Python

Communication:
WebSockets

Optional:

Docker can be used to containerize the frontend, backend, and database.

A simple deployment architecture will be:

User Browser
↓
Next.js Frontend
↓
FastAPI Backend
↓
┌───────────────┬─────────────────┐
│               │                 │
ML Detector   Gemini API       PostgreSQL
│               │                 │
└───────────────┴─────────────────┘
↓
Mission Analysis

31. TECHNOLOGY STACK

Frontend:

Next.js
React
Tailwind CSS
Recharts
Framer Motion

Backend:

Python
FastAPI
WebSockets
asyncio
Pydantic

Artificial Intelligence:

Google Gemini 2.5 Flash
Google GenAI SDK
Structured Outputs

Machine Learning:

Python
NumPy
Pandas
Scikit-learn
PyTorch/TensorFlow if an LSTM Autoencoder is implemented

Database:

PostgreSQL

Data:

NASA SMAP/MSL Telemetry Dataset

Development:

Git
GitHub
VS Code

Optional:

Docker

32. RESEARCH BASIS

ASTRA's anomaly-detection component is based on established spacecraft telemetry research rather than being developed without reference to existing work.

Important references include:

Explainable Anomaly Detection in Spacecraft Telemetry

Cuéllar et al., Engineering Applications of Artificial Intelligence, 2024.

Detecting Spacecraft Anomalies Using LSTMs and Nonparametric Dynamic Thresholding

Hundman et al., 2018.

The Telemanom project provides an implementation of spacecraft telemetry anomaly detection using LSTM-based methods.

The NASA SMAP/MSL telemetry dataset provides real spacecraft telemetry for anomaly-detection research.

Google's Gemini API documentation provides the technical basis for the structured AI reasoning layer.

33. HOW ASTRA DIFFERS FROM EXISTING APPROACHES

Existing spacecraft anomaly-detection research has demonstrated that machine-learning techniques can identify abnormal telemetry behaviour.

ASTRA builds an additional decision-support layer around this capability.

Traditional approach:

Detect anomaly
↓
Alert operator
↓
Operator investigates
↓
Operator diagnoses
↓
Operator determines response

ASTRA:

Detect anomaly
↓
Analyse telemetry context
↓
Identify likely subsystem
↓
Explain evidence
↓
Assess criticality
↓
Generate recommended response
↓
Operator approves action

The key difference is therefore the integration of detection, diagnosis, explanation, risk assessment, and response recommendation in one interface.

34. ROLE OF EACH TEAM MEMBER

Team Member 1 — AI/ML and System Integration

Responsibilities:

• Develop the anomaly-detection pipeline.
• Work with NASA telemetry data.
• Perform preprocessing and model training.
• Integrate Gemini API.
• Design structured AI responses.
• Implement anomaly diagnosis logic.
• Integrate frontend and backend.
• Perform system testing.
• Prepare and demonstrate the AI pipeline.

Team Member 2 — Frontend Developer

Responsibilities:

• Develop the ASTRA mission-control dashboard.
• Build telemetry visualizations.
• Implement system-status panels.
• Implement subsystem-health visualization.
• Develop AI Mission Assistant interface.
• Implement event and command logs.
• Connect frontend with WebSocket APIs.
• Create the final responsive UI.

Team Member 3 — Backend and System Engineer

Responsibilities:

• Develop FastAPI backend.
• Implement WebSocket telemetry streaming.
• Build telemetry simulator.
• Implement crisis simulation.
• Implement telemetry processing.
• Integrate anomaly-detection services.
• Connect backend with Gemini API.
• Implement database integration.
• Handle API integration, testing and deployment.

35. DEVELOPMENT PHASES

Phase 1 — Project Setup

Set up:

• Git repository
• Frontend
• Backend
• Environment variables
• Project directory structure

Phase 2 — Dashboard Skeleton

Build:

• Header
• Navigation
• Status cards
• Telemetry charts
• Subsystem panels
• AI assistant panel
• Event log

Phase 3 — Telemetry Engine

Implement:

• Telemetry simulator
• WebSocket server
• Live telemetry stream
• Normal operating state

Phase 4 — Crisis Simulation

Implement:

• Solar-array failure scenario
• Abnormal telemetry injection
• Crisis trigger button
• Automatic anomaly detection trigger

Phase 5 — ML Pipeline

Implement:

• Dataset preprocessing
• Normalization
• Time-series window generation
• Model training
• Anomaly scoring
• Threshold selection
• Model evaluation

Phase 6 — Gemini Integration

Implement:

• Gemini API connection
• Telemetry context construction
• Structured output
• Pydantic validation
• Diagnosis
• Criticality
• Confidence
• Recommended commands

Phase 7 — Full Integration

Connect:

Telemetry
+
ML
+
Gemini
+
Database
+
Dashboard

Phase 8 — Testing

Test:

• Normal telemetry
• Individual parameter anomaly
• Multi-parameter anomaly
• Crisis simulation
• Gemini response
• Invalid AI response
• WebSocket disconnection
• Database logging

Phase 9 — Final Demonstration

Prepare:

• Live dashboard
• Crisis simulation
• AI diagnosis
• Recommended commands
• Research explanation
• Architecture explanation

36. TESTING PLAN

Unit Testing

Test individual functions such as:

• Telemetry generation
• Anomaly scoring
• Data preprocessing
• AI response validation

Integration Testing

Test:

Frontend ↔ Backend

Backend ↔ ML model

Backend ↔ Gemini

Backend ↔ Database

WebSocket ↔ Frontend

System Testing

Run the complete application and verify the full workflow.

Scenario Testing

Scenario 1:
Normal spacecraft operation.

Expected:
System remains nominal.

Scenario 2:
Voltage drops.

Expected:
Power anomaly detected.

Scenario 3:
Solar input drops to zero.

Expected:
Power anomaly detected and AI diagnosis triggered.

Scenario 4:
Multiple telemetry parameters become abnormal.

Expected:
Critical anomaly and AI-generated response recommendation.

Scenario 5:
AI returns malformed output.

Expected:
Backend rejects invalid response and prevents unsafe command handling.

37. EXPECTED OUTPUT

When ASTRA is operating normally:

SYSTEM STATUS: NOMINAL

Telemetry is continuously displayed.

When an anomaly occurs:

ANOMALY DETECTED

The system will then display:

• Anomaly type
• Affected subsystem
• Severity
• Confidence
• AI diagnosis
• Explanation
• Recommended commands

The operator can then review the recommendation.

This creates a complete:

MONITOR → DETECT → DIAGNOSE → DECIDE

mission-control workflow.

38. FUTURE ENHANCEMENTS

Future versions of ASTRA can include:

• More spacecraft subsystems.
• More NASA telemetry datasets.
• Advanced transformer-based time-series models.
• Predictive maintenance.
• Remaining Useful Life estimation.
• Multi-spacecraft monitoring.
• Digital twin simulation.
• More sophisticated fault-propagation graphs.
• Historical mission analytics.
• Automated report generation.
• Operator feedback learning.
• Role-based access control.
• Real spacecraft telemetry integration through appropriate authorized interfaces.
• Hardware-in-the-loop simulation.
• More advanced command verification.

39. IMPORTANT PROJECT SCOPE

The hackathon version of ASTRA will focus on a practical and demonstrable MVP.

The minimum viable system will contain:

1. Real-time telemetry simulator.
2. WebSocket telemetry streaming.
3. Telemetry visualization.
4. Anomaly detection.
5. NASA telemetry-based model validation.
6. Gemini AI reasoning.
7. Subsystem diagnosis.
8. Criticality assessment.
9. Recommended recovery actions.
10. Mission-control dashboard.
11. Crisis simulation.
12. Event logging.

The project will not attempt to build a complete spacecraft flight-control system.

The prototype will demonstrate an AI-assisted mission-control decision-support workflow.

40. FINAL ARCHITECTURE

The complete ASTRA architecture will be:

NASA SMAP/MSL DATA
+
SIMULATED TELEMETRY
↓
DATA PREPROCESSING
↓
TELEMETRY ENGINE
↓
┌─────────────────────┐
│ ANOMALY DETECTION   │
│ ML + SAFETY RULES   │
└─────────────────────┘
↓
ANOMALY DETECTED
↓
RECENT TELEMETRY WINDOW
↓
┌─────────────────────┐
│ GEMINI 2.5 FLASH    │
│ AI REASONING LAYER  │
└─────────────────────┘
↓
┌───────────────────────────────┐
│ TELEMETRY ANALYSIS            │
│ SUBSYSTEM DIAGNOSIS           │
│ CRITICALITY                   │
│ CONFIDENCE                    │
│ RISK ASSESSMENT               │
│ RESPONSE RECOMMENDATIONS      │
└───────────────────────────────┘
↓
FASTAPI BACKEND
↓
┌───────────────────────────────┐
│ REAL-TIME MISSION DASHBOARD   │
│                               │
│ Live Telemetry                │
│ System Status                 │
│ Subsystem Health              │
│ AI Mission Assistant          │
│ Event Log                     │
│ Command Recommendations       │
│ Simulation Controls           │
└───────────────────────────────┘
↓
HUMAN OPERATOR
↓
APPROVE / REJECT
↓
SIMULATED COMMAND EXECUTION

41. FINAL PROJECT SUMMARY

ASTRA is an AI-powered spacecraft mission-control assistant that transforms raw spacecraft telemetry into explainable and actionable mission intelligence.

The system continuously monitors telemetry, uses machine-learning techniques and safety rules to identify abnormal behaviour, collects the relevant telemetry context, and sends the detected event to Gemini for higher-level reasoning.

Gemini analyses the telemetry context, identifies the likely affected subsystem, explains the evidence, determines mission criticality, estimates confidence, and generates recommended recovery actions.

The recommendations are presented to a human operator through a real-time mission-control dashboard. The operator remains responsible for approving any action.

ASTRA therefore follows the principle:

FROM TELEMETRY TO ACTION

DETECT → DIAGNOSE → ASSESS → RECOMMEND

The project combines real NASA spacecraft telemetry research, machine-learning-based anomaly detection, real-time WebSocket telemetry streaming, FastAPI backend services, PostgreSQL-based event storage, and Gemini-powered structured reasoning into a single practical mission-control prototype.

The primary value of ASTRA is not claiming to replace spacecraft operators or existing anomaly-detection research. Instead, it bridges the gap between an automated anomaly alert and an understandable mission decision by combining detection, diagnosis, explanation, risk assessment, and response recommendation in one unified system.
