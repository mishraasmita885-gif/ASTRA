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

export const INITIAL_ANOMALIES = [];

export const INITIAL_AUDIT_LOG = [];
