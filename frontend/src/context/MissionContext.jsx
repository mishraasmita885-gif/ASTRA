import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_TELEMETRY,
  CRISIS_TELEMETRY,
  INITIAL_SUBSYSTEMS,
  INITIAL_ANOMALIES,
  INITIAL_AUDIT_LOG,
} from '../data/mockData';

const MissionContext = createContext(null);

export const MissionProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [isCrisis, setIsCrisis] = useState(false);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState('INC-2026-088');
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);
  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    // Generate 30 initial nominal points
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => ({
      time: new Date(now - (30 - i) * 2000).toLocaleTimeString(),
      temp: 15.1 + Math.sin(i * 0.3) * 0.3,
      voltage: 24.1 + Math.cos(i * 0.4) * 0.08,
      battery: 98.4 - (30 - i) * 0.01,
      solar: 96.4 + Math.sin(i * 0.2) * 0.4,
    }));
  });

  const [subsystems, setSubsystems] = useState(INITIAL_SUBSYSTEMS);
  const [anomalies, setAnomalies] = useState(INITIAL_ANOMALIES);
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG);
  const [commands, setCommands] = useState(INITIAL_ANOMALIES[0].commands);
  const [commandModal, setCommandModal] = useState({ open: false, command: null });
  const [activeScenario, setActiveScenario] = useState('solar_strike');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Global keyboard shortcut: Ctrl+\ or Cmd+\ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live telemetry ticker loop
  useEffect(() => {
    const interval = setInterval(() => {
      const nowTime = new Date().toLocaleTimeString();
      setTelemetry((prev) => {
        if (!isCrisis) {
          // Subtle realistic nominal float
          const noise = (Math.random() - 0.5) * 0.1;
          const nextTemp = +(prev.temperature + noise * 0.2).toFixed(1);
          const nextVolt = +(prev.voltage + noise * 0.05).toFixed(2);
          const nextSolar = +(prev.solar_input + noise * 0.3).toFixed(1);
          const nextBatt = +(prev.battery_pct - 0.002).toFixed(1);

          setTelemetryHistory((hist) => [
            ...hist.slice(1),
            { time: nowTime, temp: nextTemp, voltage: nextVolt, battery: nextBatt, solar: nextSolar },
          ]);

          return {
            ...prev,
            temperature: Math.max(14.8, Math.min(15.6, nextTemp)),
            voltage: Math.max(24.0, Math.min(24.3, nextVolt)),
            solar_input: Math.max(95.0, Math.min(97.5, nextSolar)),
            battery_pct: nextBatt,
            timestamp: new Date().toISOString(),
          };
        } else {
          // In crisis state: keep at failure point with minor jitter
          const noise = (Math.random() - 0.5) * 0.4;
          const crisisTemp = +(CRISIS_TELEMETRY.temperature + noise).toFixed(1);
          const crisisVolt = +(CRISIS_TELEMETRY.voltage + noise * 0.1).toFixed(2);
          const crisisBatt = +(prev.battery_pct - 0.04).toFixed(1);

          setTelemetryHistory((hist) => [
            ...hist.slice(1),
            { time: nowTime, temp: crisisTemp, voltage: crisisVolt, battery: crisisBatt, solar: 0.0 },
          ]);

          return {
            ...prev,
            temperature: crisisTemp,
            voltage: crisisVolt,
            solar_input: 0.0,
            battery_pct: crisisBatt,
            current_draw: 18.4,
            anomaly_score: 0.94,
            timestamp: new Date().toISOString(),
          };
        }
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isCrisis]);

  // Trigger crisis fault injection
  const triggerCrisis = (scenarioName = 'Solar Array Strike & EPS Bus Failure') => {
    setIsCrisis(true);
    setTelemetry({
      ...CRISIS_TELEMETRY,
      timestamp: new Date().toISOString(),
    });

    // Update Subsystems to failure state
    setSubsystems([
      {
        id: 'eps',
        name: 'POWER (EPS)',
        fullName: 'Electrical Power Subsystem',
        status: 'CRITICAL',
        metrics: [
          { label: 'Bus Voltage', value: '11.0 V', nominal: '24.0 - 28.0 V' },
          { label: 'Li-Ion Battery', value: '82.0%', nominal: '> 70%' },
          { label: 'Solar Input', value: '0.0%', nominal: '> 80%' },
        ],
        details: 'Photovoltaic generation collapsed to zero. Shunt regulator tripped under overload.',
      },
      {
        id: 'tcs',
        name: 'THERMAL (TCS)',
        fullName: 'Thermal Control Subsystem',
        status: 'WARNING',
        metrics: [
          { label: 'Avionics Core', value: '85.0 °C', nominal: '10 - 30 °C' },
          { label: 'Radiator Loop 1', value: '98% Deploy', nominal: 'Active' },
          { label: 'Heat Gradient', value: '3.4 W/cm²', nominal: '< 1.5 W/cm²' },
        ],
        details: 'Thermal boundary breached. Secondary radiators fully deployed to shed heat.',
      },
      INITIAL_SUBSYSTEMS[2],
      INITIAL_SUBSYSTEMS[3],
    ]);

    // Append crisis event to audit log
    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'CRITICAL',
        message: `EMERGENCY: ${scenarioName} injected. Main Bus undervolt (11.0V), Solar 0%, Temp 85°C. 3 safety interlocks tripped.`,
      },
      ...prev,
    ]);
  };

  // Reset to nominal baseline
  const resetToNominal = () => {
    setIsCrisis(false);
    setTelemetry(INITIAL_TELEMETRY);
    setSubsystems(INITIAL_SUBSYSTEMS);
    setCommands(INITIAL_ANOMALIES[0].commands.map((c) => ({ ...c, status: 'PENDING' })));

    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'OK',
        message: 'Simulation reset. All telemetry streams returned to verified nominal state.',
      },
      ...prev,
    ]);
  };

  // Command approval handler
  const approveCommand = (commandId) => {
    setCommands((prev) =>
      prev.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'APPROVED' } : cmd))
    );
    const cmd = commands.find((c) => c.id === commandId);
    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'COMMAND_UPLINK',
        message: `FLIGHT DIRECTOR APPROVED: Uplinked [${cmd?.name || commandId}] via DSN Madrid-63. Cryptographic signature verified.`,
      },
      ...prev,
    ]);
  };

  const rejectCommand = (commandId) => {
    setCommands((prev) =>
      prev.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'REJECTED' } : cmd))
    );
    const cmd = commands.find((c) => c.id === commandId);
    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'WARNING',
        message: `FLIGHT DIRECTOR REJECTED: Command [${cmd?.name || commandId}] rejected / manual override executed.`,
      },
      ...prev,
    ]);
  };

  const approveAllCommands = () => {
    setCommands((prev) => prev.map((cmd) => ({ ...cmd, status: 'APPROVED' })));
    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'COMMAND_UPLINK',
        message: `EMERGENCY UPLINK SEQUENCE EXECUTED: All 3 contingency commands approved and transmitted to spacecraft.`,
      },
      ...prev,
    ]);
  };

  const selectedAnomaly = anomalies.find((a) => a.id === selectedAnomalyId) || anomalies[0];

  return (
    <MissionContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isCrisis,
        telemetry,
        telemetryHistory,
        subsystems,
        anomalies,
        selectedAnomaly,
        selectedAnomalyId,
        setSelectedAnomalyId,
        auditLog,
        commands,
        commandModal,
        setCommandModal,
        activeScenario,
        setActiveScenario,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        triggerCrisis,
        resetToNominal,
        approveCommand,
        rejectCommand,
        approveAllCommands,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
};

export const useMission = () => {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
};
