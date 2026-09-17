// ASTRA Mission Control - Core Data Definitions and Baseline Models

export const INITIAL_TELEMETRY = {
  timestamp: new Date().toISOString(),
  temperature: 15.2, // °C
  minTemp: 13.8,
  maxTemp: 16.4,
  voltage: 24.1, // VDC
  minVoltage: 24.0,
  maxVoltage: 28.0,
  battery_pct: 98.4, // %
  solar_input: 96.4, // %
  current_draw: 4.2, // A
  adcs_drift: 0.02, // deg/hr
  packet_rate: 10.0, // pkts/s
  link_snr: 14.2, // dBm
  uplink_quality: 99.8, // %
  anomaly_score: 0.02,
};

export const CRISIS_TELEMETRY = {
  temperature: 85.0, // °C - Thermal runaway
  minTemp: 13.8,
  maxTemp: 86.5,
  voltage: 11.0, // V - Bus undervoltage
  minVoltage: 10.8,
  maxVoltage: 28.0,
  battery_pct: 82.0, // % - Accelerated discharge
  solar_input: 0.0, // % - Complete collapse
  current_draw: 18.4, // A - High discharge
  adcs_drift: 0.18, // deg/hr
  packet_rate: 9.8,
  link_snr: 12.1,
  uplink_quality: 98.2,
  anomaly_score: 0.94,
};

export const INITIAL_SUBSYSTEMS = [
  {
    id: 'eps',
    name: 'POWER (EPS)',
    fullName: 'Electrical Power Subsystem',
    status: 'HEALTHY',
    metrics: [
      { label: 'Bus Voltage', value: '24.1 V', nominal: '24.0 - 28.0 V' },
      { label: 'Li-Ion Battery', value: '98.4%', nominal: '> 70%' },
      { label: 'Solar Input', value: '96.4%', nominal: '> 80%' },
    ],
    details: 'Dual array sun-tracking active (4.82 kW). Shunt limiters S3R nominal.',
  },
  {
    id: 'tcs',
    name: 'THERMAL (TCS)',
    fullName: 'Thermal Control Subsystem',
    status: 'HEALTHY',
    metrics: [
      { label: 'Avionics Core', value: '15.2 °C', nominal: '10 - 30 °C' },
      { label: 'Radiator Loop 1', value: '45% Deploy', nominal: 'Active' },
      { label: 'Heat Gradient', value: '0.8 W/cm²', nominal: '< 1.5 W/cm²' },
    ],
    details: 'Thermostats in deadband. Freon circulating nominal.',
  },
  {
    id: 'ttc',
    name: 'COMMUNICATIONS (TT&C)',
    fullName: 'Telemetry, Tracking & Command',
    status: 'HEALTHY',
    metrics: [
      { label: 'Ground Station', value: 'DSN Madrid-63', nominal: 'Complex 63' },
      { label: 'S-Band SNR', value: '+14.2 dBm', nominal: '> +10 dBm' },
      { label: 'Bit Error Rate', value: '< 1.0e-9', nominal: '< 1.0e-6' },
    ],
    details: 'High-gain dish locked on Madrid carrier (7.195 GHz).',
  },
  {
    id: 'adcs',
    name: 'ATTITUDE (ADCS)',
    fullName: 'Attitude Determination & Control',
    status: 'HEALTHY',
    metrics: [
      { label: 'Pointing Lock', value: '+Z Earth Facing', nominal: 'Locked' },
      { label: 'Gyro Drift', value: '0.02 °/hr', nominal: '< 0.05 °/hr' },
      { label: 'Reaction Wheels', value: '3,240 RPM', nominal: '< 6,000 RPM' },
    ],
    details: '14 Star trackers acquired. Quaternion precision: 0.001 deg.',
  },
];

export const INITIAL_ANOMALIES = [
  {
    id: 'INC-2026-088',
    number: 'ANOMALY #001',
    title: 'Solar Input Collapse & EPS Bus Drop',
    subsystem: 'POWER / THERMAL',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    timestamp: '18:32:24 UTC',
    detectedAt: '18:32:20 UTC',
    mlScore: 0.94,
    mlConfidence: '91%',
    detectionMethod: 'Hybrid ML (LSTM Reconstruction) + Safety Rules',
    summary: 'Sudden total loss of photovoltaic generation accompanied by main 24V bus collapse and battery cell thermal escalation.',
    delta: {
      solar: '-96.4%',
      voltage: '-13.1 V',
      temp: '+69.8 °C',
      discharge: '-18.4 A',
    },
    rulesTripped: [
      { rule: 'RULE_SOLAR_MIN_THRESHOLD (< 20%)', actual: '0.0%', tripped: true },
      { rule: 'RULE_BUS_UNDERVOLTAGE (< 18.0V)', actual: '11.0 V', tripped: true },
      { rule: 'RULE_CORE_OVERTEMP (> 60.0°C)', actual: '85.0 °C', tripped: true },
    ],
    geminiDiagnosis: {
      model: 'Gemini 1.5 Diagnostic Engine',
      rootCause: 'Telemetry indicates an instantaneous loss of photovoltaic array output accompanied by a catastrophic main bus voltage collapse and subsequent battery cell overheating. Likely cause: Micro-meteoroid impact on Solar Array Wing #1 or Primary Shunt Regulator short-circuit.',
      survivalProbability: 72,
      timeToExhaustion: '18m 42s',
      evidence: [
        'Solar input dropped to 0% in single telemetry cycle (< 100ms)',
        'Bus voltage collapsed from 24.1V to 11.0V under steady load',
        'Core thermal sensor surged past 85°C safety interlock',
      ],
    },
    commands: [
      { id: 'cmd_1', name: 'CMD_SAFE_MODE', desc: 'Enter spacecraft protective safe hold, isolate non-critical buses', priority: 'CRITICAL', status: 'PENDING' },
      { id: 'cmd_2', name: 'CMD_REDUCE_POWER', desc: 'Shed scientific payloads and transmitter power to emergency floor', priority: 'HIGH', status: 'PENDING' },
      { id: 'cmd_3', name: 'CMD_REORIENT', desc: 'Rotate ADCS reaction wheels to sun-facing orientation', priority: 'MEDIUM', status: 'PENDING' },
    ],
  },
  {
    id: 'INC-2026-087',
    number: 'ANOMALY #002',
    title: 'Main Regulated Bus Voltage Drawdown',
    subsystem: 'EPS (Li-Ion Bank A)',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    timestamp: '18:31:40 UTC',
    detectedAt: '18:31:38 UTC',
    mlScore: 0.82,
    mlConfidence: '86%',
    detectionMethod: 'LSTM Anomaly Engine',
    summary: 'Secondary distribution rail experienced transient voltage dip under high transmitter amplification.',
  },
  {
    id: 'INC-2026-085',
    number: 'ANOMALY #003',
    title: 'TCS Radiator Loop #1 Thermal Drift',
    subsystem: 'THERMAL CONTROL',
    severity: 'MEDIUM',
    status: 'WARNING',
    timestamp: '18:30:12 UTC',
    detectedAt: '18:30:08 UTC',
    mlScore: 0.64,
    mlConfidence: '78%',
    detectionMethod: 'Threshold Boundary Monitor',
    summary: 'Radiator loop return temperature +4.2°C above orbital daylight model.',
  },
  {
    id: 'INC-2026-082',
    number: 'ANOMALY #004',
    title: 'S-Band Transponder Packet Jitter',
    subsystem: 'TT&C COMMS',
    severity: 'RESOLVED',
    status: 'RESOLVED',
    timestamp: '18:29:03 UTC',
    detectedAt: '18:28:55 UTC',
    mlScore: 0.31,
    mlConfidence: '94%',
    detectionMethod: 'Packet Integrity Parser',
    summary: 'Carrier handoff jitter resolved. Re-locked on DSN Madrid-63 carrier at +14.2 dBm.',
  },
];

export const INITIAL_AUDIT_LOG = [
  { id: 'evt_1', time: '18:31:04', type: 'OK', message: 'Telemetry stream connected (DSN Madrid-63 carrier locked)' },
  { id: 'evt_2', time: '18:31:12', type: 'OK', message: 'System nominal verified across all 4 operational subsystems' },
  { id: 'evt_3', time: '18:31:45', type: 'INFO', message: 'Orbital day transition complete, solar arrays tracking Sun-vector' },
  { id: 'evt_4', time: '18:32:00', type: 'AI_SYNC', message: 'Gemini Copilot baseline synchronized (0.02 anomaly score)' },
];
