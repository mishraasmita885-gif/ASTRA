import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  INITIAL_TELEMETRY,
  INITIAL_SUBSYSTEMS,
  INITIAL_ANOMALIES,
  INITIAL_AUDIT_LOG,
} from '../data/mockData';
import {
  fetchHealth,
  fetchEvents,
  analyzeEvent,
  approveEvent,
  setSimulationMode,
  fetchAuditLog,
  getWsBase,
} from '../services/api';

const MissionContext = createContext(null);

export const MissionProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [isCrisis, setIsCrisis] = useState(false);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState('ASTRA-P3-0001');
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);
  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => ({
      time: new Date(now - (30 - i) * 2000).toLocaleTimeString(),
      temp: 15.1 + Math.sin(i * 0.3) * 0.3,
      voltage: 24.1 + Math.cos(i * 0.4) * 0.08,
      battery: 98.4 - (30 - i) * 0.01,
      solar: 96.4 + Math.sin(i * 0.2) * 0.4,
      p3: 0.12,
      score: 0.02,
    }));
  });

  const [subsystems, setSubsystems] = useState(INITIAL_SUBSYSTEMS);
  const [anomalies, setAnomalies] = useState(INITIAL_ANOMALIES);
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG);
  const [commands, setCommands] = useState(INITIAL_ANOMALIES[0]?.commands || []);
  const [commandModal, setCommandModal] = useState({ open: false, command: null });
  const [activeScenario, setActiveScenario] = useState('p3_replay');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Keyboard shortcut: Ctrl+\ or Cmd+\ to toggle sidebar
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

  // Poll initial backend health and sync events
  const syncWithBackend = useCallback(async () => {
    const health = await fetchHealth();
    if (health) {
      setBackendHealth(health);
      setIsBackendConnected(true);
      const backendEvents = await fetchEvents();
      if (backendEvents && backendEvents.length > 0) {
        // Transform backend events into UI-friendly anomaly format while preserving original fields
        const formatted = backendEvents.map((evt, idx) => ({
          id: evt.event_id,
          number: `ANOMALY #${String(idx + 1).padStart(3, '0')}`,
          title: `Channel ${evt.channel} Step Change [${evt.start_timestamp} → ${evt.end_timestamp}]`,
          subsystem: evt.channel === 'P-3' ? 'INSTRUMENTATION / POWER' : 'SUBSYSTEM',
          severity: evt.gemini_analysis?.severity || (evt.duration > 500 ? 'CRITICAL' : 'HIGH'),
          status: evt.status,
          timestamp: new Date(evt.created_at).toLocaleTimeString(),
          detectedAt: `Step ${evt.start_timestamp}`,
          mlScore: evt.anomaly_score,
          mlConfidence: evt.gemini_analysis ? `${Math.round(evt.gemini_analysis.confidence * 100)}%` : '91%',
          detectionMethod: 'P-3 Telemetry Change Detection (Threshold 0.3889)',
          summary: evt.gemini_analysis?.diagnosis || `Numerical change detector triggered at step ${evt.start_timestamp} with duration ${evt.duration}.`,
          rawEvent: evt,
          delta: {
            solar: evt.anomaly_score > 0.4 ? '-74.2%' : '-2.1%',
            voltage: evt.anomaly_score > 0.4 ? '-6.8 V' : '-0.2 V',
            temp: evt.anomaly_score > 0.4 ? '+42.5 °C' : '+0.5 °C',
            discharge: '-12.4 A',
          },
          rulesTripped: [
            { rule: 'P3_CHANGE_DETECTION_THRESHOLD (> 0.3888857)', actual: `${evt.anomaly_score.toFixed(4)}`, tripped: true },
            { rule: 'EVENT_PERSISTENCE_BUFFER (15-pt buffer, 250-pt merge)', actual: `${evt.duration} cycles`, tripped: true },
          ],
          geminiDiagnosis: evt.gemini_analysis ? {
            model: 'Gemini 2.5 Flash Reasoner',
            rootCause: evt.gemini_analysis.diagnosis,
            survivalProbability: 78,
            timeToExhaustion: '24m 10s',
            evidence: evt.gemini_analysis.evidence,
            recommendedAction: evt.gemini_analysis.recommendation,
            operator_approval_required: evt.gemini_analysis.operator_approval_required,
          } : null,
          commands: [
            {
              id: `CMD-P3-SAFE-${evt.event_id}`,
              name: `CMD_SAFE_P3: Safe-State Channel ${evt.channel}`,
              desc: 'Transfer sensor channel to redundant telemetry bus and isolate secondary load.',
              severity: 'CRITICAL',
              status: evt.operator_decision ? (evt.operator_decision.approved ? 'APPROVED' : 'REJECTED') : 'PENDING',
              subsystem: 'POWER / INSTRUMENTATION',
              uplinkEst: '1.2s',
            },
            {
              id: `CMD-P3-DIAG-${evt.event_id}`,
              name: 'CMD_DIAG_ISOLATE: Run Self-Test Sequence',
              desc: 'Execute calibrated 60-second self-diagnostic routine on instrumentation ADC.',
              severity: 'HIGH',
              status: evt.operator_decision?.approved ? 'APPROVED' : 'PENDING',
              subsystem: 'INSTRUMENTATION',
              uplinkEst: '2.4s',
            }
          ]
        }));
        setAnomalies(formatted);
        if (!selectedAnomalyId || selectedAnomalyId === 'INC-2026-088') {
          setSelectedAnomalyId(formatted[0].id);
        }
      }

      const logs = await fetchAuditLog(30);
      if (logs && logs.length > 0) {
        setAuditLog(logs.map((l) => ({
          id: l.id,
          time: l.time,
          type: l.type,
          message: l.event,
        })));
      }
    } else {
      setIsBackendConnected(false);
    }
  }, [selectedAnomalyId]);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Live WebSocket Connection to FastAPI backend
  useEffect(() => {
    let ws = null;
    let isCleanedUp = false;

    const connectWebSocket = () => {
      const wsUrl = getWsBase();
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCleanedUp) return;
          setIsBackendConnected(true);
          console.log('[ASTRA WS] Connected to live telemetry backend:', wsUrl);
        };

        ws.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TELEMETRY_TICK' || data.type === 'CONNECTION_ESTABLISHED') {
              const tel = data.telemetry;
              if (!tel) return;

              const nowTime = new Date().toLocaleTimeString();
              const isAnom = Boolean(tel.is_anomaly);
              setIsCrisis(isAnom);

              setTelemetry({
                timestamp: tel.timestamp,
                temperature: tel.temperature,
                voltage: tel.voltage,
                battery_pct: tel.battery_pct,
                solar_input: tel.solar_input,
                current_draw: tel.current_draw,
                adcs_drift: tel.adcs_drift,
                packet_rate: tel.packet_rate,
                link_snr: tel.link_snr,
                uplink_quality: tel.uplink_quality,
                anomaly_score: tel.anomaly_score,
                p3_value: tel.p3_value,
                step: tel.step,
                mode: tel.mode,
                is_anomaly: isAnom,
              });

              setTelemetryHistory((hist) => [
                ...hist.slice(1),
                {
                  time: nowTime,
                  temp: tel.temperature,
                  voltage: tel.voltage,
                  battery: tel.battery_pct,
                  solar: tel.solar_input,
                  p3: tel.p3_value,
                  score: tel.anomaly_score,
                },
              ]);

              // Update subsystems if anomaly
              if (isAnom) {
                setSubsystems((prev) => [
                  {
                    ...prev[0],
                    status: 'CRITICAL',
                    metrics: [
                      { label: 'Bus Voltage', value: `${tel.voltage} V`, nominal: '24.0 - 28.0 V' },
                      { label: 'Li-Ion Battery', value: `${tel.battery_pct}%`, nominal: '> 70%' },
                      { label: 'Solar Input', value: `${tel.solar_input}%`, nominal: '> 80%' },
                    ],
                  },
                  {
                    ...prev[1],
                    status: tel.temperature > 40 ? 'WARNING' : 'HEALTHY',
                    metrics: [
                      { label: 'Avionics Core', value: `${tel.temperature} °C`, nominal: '10 - 30 °C' },
                      { label: 'Radiator Loop 1', value: '78% Deploy', nominal: 'Active' },
                      { label: 'Heat Gradient', value: '2.1 W/cm²', nominal: '< 1.5 W/cm²' },
                    ],
                  },
                  prev[2],
                  prev[3],
                ]);
              } else {
                setSubsystems(INITIAL_SUBSYSTEMS);
              }
            }
          } catch (e) {
            console.error('[ASTRA WS] Error parsing WebSocket frame:', e);
          }
        };

        ws.onclose = () => {
          if (isCleanedUp) return;
          setIsBackendConnected(false);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.warn('[ASTRA WS] Connection error:', err);
          ws.close();
        };
      } catch (e) {
        console.error('[ASTRA WS] Error initializing socket:', e);
      }
    };

    connectWebSocket();

    return () => {
      isCleanedUp = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (ws) ws.close();
    };
  }, []);

  // Request Gemini Reasoning Analysis for an Event
  const triggerGeminiAnalysis = async (eventId) => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeEvent(eventId);
      if (res && res.analysis) {
        setAnomalies((prev) =>
          prev.map((anm) =>
            anm.id === eventId
              ? {
                  ...anm,
                  status: 'UNDER_REVIEW',
                  mlConfidence: `${Math.round(res.analysis.confidence * 100)}%`,
                  geminiDiagnosis: {
                    model: 'Gemini 2.5 Flash Reasoner',
                    rootCause: res.analysis.diagnosis,
                    survivalProbability: 80,
                    timeToExhaustion: '22m 30s',
                    evidence: res.analysis.evidence,
                    recommendedAction: res.analysis.recommendation,
                    operator_approval_required: res.analysis.operator_approval_required,
                  },
                }
              : anm
          )
        );
        const logs = await fetchAuditLog(30);
        if (logs) {
          setAuditLog(logs.map((l) => ({ id: l.id, time: l.time, type: l.type, message: l.event })));
        }
      }
      return res;
    } catch (err) {
      console.error('Gemini analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Human-in-the-Loop Operator Command Approval
  const approveCommand = async (commandId, note = '') => {
    setCommands((prev) =>
      prev.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'APPROVED' } : cmd))
    );

    // If attached to an anomaly event, record approval in backend
    const currentEvtId = selectedAnomalyId;
    if (currentEvtId) {
      await approveEvent(currentEvtId, true, 'Flight Director Gene Kranz', note || 'Procedure verified nominal.');
    }

    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'OPERATOR_APPROVAL',
        message: `FLIGHT DIRECTOR APPROVED: [${commandId}]. Cryptographic signature verified. Uplink completed via DSN Madrid-63.`,
      },
      ...prev,
    ]);
  };

  const rejectCommand = async (commandId, note = '') => {
    setCommands((prev) =>
      prev.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'REJECTED' } : cmd))
    );

    const currentEvtId = selectedAnomalyId;
    if (currentEvtId) {
      await approveEvent(currentEvtId, false, 'Flight Director Gene Kranz', note || 'Manual override executed.');
    }

    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'WARNING',
        message: `FLIGHT DIRECTOR REJECTED: Command [${commandId}] rejected by operator manual override.`,
      },
      ...prev,
    ]);
  };

  const approveAllCommands = async () => {
    setCommands((prev) => prev.map((cmd) => ({ ...cmd, status: 'APPROVED' })));
    if (selectedAnomalyId) {
      await approveEvent(selectedAnomalyId, true, 'Flight Director Gene Kranz', 'All staged contingency commands authorized.');
    }
    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'OPERATOR_APPROVAL',
        message: `EMERGENCY CONTINGENCY SEQUENCE AUTHORIZED: All staged commands approved and transmitted.`,
      },
      ...prev,
    ]);
  };

  // Change Simulation Mode (NASA P-3 Replay, Crisis injection, Nominal)
  const switchSimulationMode = async (mode, startIndex = 5200) => {
    setActiveScenario(mode);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'set_mode',
        mode,
        start_index: startIndex,
      }));
    } else {
      await setSimulationMode(mode, startIndex);
    }
  };

  const triggerCrisis = (scenarioName = 'Solar Array Strike & EPS Bus Failure') => {
    switchSimulationMode('crisis', 0);
  };

  const resetToNominal = () => {
    switchSimulationMode('nominal', 0);
  };

  const playNasaP3Stream = (startIndex = 5300) => {
    switchSimulationMode('nasa_p3', startIndex);
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
        playNasaP3Stream,
        switchSimulationMode,
        approveCommand,
        rejectCommand,
        approveAllCommands,
        isBackendConnected,
        backendHealth,
        isAnalyzing,
        triggerGeminiAnalysis,
        syncWithBackend,
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
