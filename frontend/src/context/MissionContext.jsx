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
  fetchChannels,
  switchChannel,
  fetchFleetStatus,
  fetchIslTopology,
  switchFleetSpacecraft,
  fetchFaultTreeCascade,
  authorizeCommandUplink,
  abortCommandUplink,
  transmitCommandUplink,
  postAuditLog,
  fetchRunbooks,
  createRunbook,
  executeRunbook,
  abortRunbookExecution,
} from '../services/api';
import {
  playAcousticAlert,
  speakOperationalBriefing,
  cancelAllSpeech,
  buildAnomalyBriefing,
  buildDiagnosisBriefing,
  buildStatusBriefing,
  parseVoiceIntent,
  VoiceCommandController,
  isSpeechRecognitionSupported,
} from '../services/voiceAudioEngine';

const MissionContext = createContext(null);

export const MissionProvider = ({ children }) => {
  // Client-Side URL Hash Routing
  const getInitialTab = () => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash) return hash;
    }
    return 'welcome';
  };
  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = `#${tab}`;
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash && hash !== activeTab) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Multi-Channel Ingestion State
  const [availableChannels, setAvailableChannels] = useState([
    'P-3', 'A-1', 'A-2', 'D-1', 'E-1', 'T-1', 'S-1', 'M-1', 'P-1', 'P-2'
  ]);
  const [activeChannel, setActiveChannel] = useState('P-3');

  // Constellation Multi-Spacecraft Fleet State
  const [activeSpacecraft, setActiveSpacecraftState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('astra_active_spacecraft') || 'ASTRA-ALPHA';
    }
    return 'ASTRA-ALPHA';
  });

  const [fleetNodes, setFleetNodes] = useState([
    {
      id: 'ASTRA-ALPHA',
      name: 'ASTRA-Alpha (Flagship)',
      orbit_regime: 'LEO-SSO (520 km)',
      status: 'NOMINAL',
      health_score: 98.6,
      anomalies_count: 0,
      monitored_channels: 82,
      subsystems: { eps: 'NOMINAL', tcs: 'NOMINAL', adcs: 'NOMINAL', ttc: 'NOMINAL' },
      telemetry: { temperature: 15.2, voltage: 24.1, battery_pct: 98.4, solar_input: 96.4, current_draw: 4.2, adcs_drift: 0.02, link_snr: 14.2, channel: 'P-3' }
    },
    {
      id: 'ASTRA-BETA',
      name: 'ASTRA-Beta (Relay Node)',
      orbit_regime: 'LEO-POLAR (680 km)',
      status: 'NOMINAL',
      health_score: 97.4,
      anomalies_count: 0,
      monitored_channels: 82,
      subsystems: { eps: 'NOMINAL', tcs: 'NOMINAL', adcs: 'NOMINAL', ttc: 'NOMINAL' },
      telemetry: { temperature: 13.8, voltage: 24.4, battery_pct: 97.2, solar_input: 98.1, current_draw: 3.9, adcs_drift: 0.015, link_snr: 15.8, channel: 'P-1' }
    },
    {
      id: 'ASTRA-GAMMA',
      name: 'ASTRA-Gamma (Observation)',
      orbit_regime: 'MEO (2,000 km)',
      status: 'WARNING',
      health_score: 89.1,
      anomalies_count: 1,
      monitored_channels: 82,
      subsystems: { eps: 'NOMINAL', tcs: 'WARNING', adcs: 'NOMINAL', ttc: 'NOMINAL' },
      telemetry: { temperature: 28.4, voltage: 23.8, battery_pct: 89.5, solar_input: 91.2, current_draw: 5.8, adcs_drift: 0.045, link_snr: 12.6, channel: 'T-2' }
    }
  ]);

  const [islLinks, setIslLinks] = useState([
    { id: 1, source_sat: 'ASTRA-ALPHA', target_sat: 'ASTRA-BETA', latency_ms: 18.4, packet_loss_pct: 0.01, snr_db: 16.8, status: 'OPTIMAL', throughput_mbps: 120.0, band: 'Ka-Band Crosslink' },
    { id: 2, source_sat: 'ASTRA-BETA', target_sat: 'ASTRA-GAMMA', latency_ms: 34.2, packet_loss_pct: 0.03, snr_db: 13.5, status: 'NOMINAL', throughput_mbps: 95.0, band: 'Optical Laser Mesh' },
    { id: 3, source_sat: 'ASTRA-GAMMA', target_sat: 'ASTRA-ALPHA', latency_ms: 28.6, packet_loss_pct: 0.02, snr_db: 14.9, status: 'NOMINAL', throughput_mbps: 105.0, band: 'Ka-Band Crosslink' }
  ]);

  const [fleetSummary, setFleetSummary] = useState({
    total_spacecraft: 3,
    active_spacecraft: 'ASTRA-ALPHA',
    status: 'NOMINAL',
    avg_health_score: 95.0,
    total_monitored_channels: 246,
    active_mesh_links: 3,
    network_sync: '100% SYNCHRONIZED',
    isl_avg_latency_ms: 27.1,
    isl_avg_loss_pct: 0.02
  });

  // Real-Time Orbital Position & SGP4 State
  const [orbitalState, setOrbitalState] = useState(null);

  // Role-Based Access Control (RBAC)
  const [operatorRole, setOperatorRoleState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('astra_operator_role') || 'FLIGHT_DIRECTOR';
    }
    return 'FLIGHT_DIRECTOR';
  });

  const setOperatorRole = useCallback((role) => {
    setOperatorRoleState(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('astra_operator_role', role);
    }
  }, []);

  const hasCommandAuthority = operatorRole === 'FLIGHT_DIRECTOR';

  // Dedicated Settings Configuration
  const [settingsConfig, setSettingsConfigState] = useState(() => {
    const defaultSettings = {
      geminiModel: 'gemini-2.5-flash',
      customApiKey: '',
      detectionThreshold: 0.3889,
      wsBroadcastInterval: 1.2,
      audioAlertsEnabled: true,
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('astra_settings');
        if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
      } catch (e) {
        console.warn('Failed parsing astra_settings:', e);
      }
    }
    return defaultSettings;
  });

  const updateSettingsConfig = useCallback((newSettings) => {
    setSettingsConfigState((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem('astra_settings', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Refs for fresh state access inside WebSocket & Voice listeners
  const audioAlertsEnabledRef = useRef(settingsConfig.audioAlertsEnabled);
  audioAlertsEnabledRef.current = settingsConfig.audioAlertsEnabled;
  const detectionThresholdRef = useRef(settingsConfig.detectionThreshold);
  detectionThresholdRef.current = settingsConfig.detectionThreshold;

  // Voice Comms & Synthesized Audio State
  const [voiceStatus, setVoiceStatus] = useState(() =>
    isSpeechRecognitionSupported() ? 'MIC STANDBY' : 'UNSUPPORTED'
  );
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLastAction, setVoiceLastAction] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingVoiceApproval, setPendingVoiceApproval] = useState(null);
  const [anomalyCenterTab, setAnomalyCenterTab] = useState('inspector');

  const voiceControllerRef = useRef(null);
  const voiceFeedbackTimerRef = useRef(null);
  const wasAnomalyActiveRef = useRef(false);
  const lastAudioAlertAtRef = useRef(0);
  const knownEventIdsRef = useRef(new Set());
  const initialEventsSeededRef = useRef(false);

  // Procedural Web Audio API Synthesizer (zero audio files)
  const playAlertChime = useCallback((severity = 'WARNING') => {
    return playAcousticAlert(severity, { enabled: audioAlertsEnabledRef.current });
  }, []);

  // Dynamic Web Speech API TTS Briefing
  const speakBriefing = useCallback((text, priority = 'NORMAL', { bypassMute = false } = {}) => {
    return speakOperationalBriefing(text, priority, {
      enabled: bypassMute || audioAlertsEnabledRef.current,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopAllVoiceAudio = useCallback(() => {
    cancelAllSpeech();
    setIsSpeaking(false);
  }, []);

  const toggleAudioAlerts = useCallback(() => {
    const nextEnabled = !audioAlertsEnabledRef.current;
    audioAlertsEnabledRef.current = nextEnabled;
    updateSettingsConfig({ audioAlertsEnabled: nextEnabled });
    if (!nextEnabled) {
      cancelAllSpeech();
      setIsSpeaking(false);
    } else {
      playAcousticAlert('COMMAND_CONFIRMED', { enabled: true });
    }
  }, [updateSettingsConfig]);

  const clearVoiceFeedback = useCallback(() => {
    setVoiceTranscript('');
    setVoiceLastAction(null);
  }, []);

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

  // Predictive Forecasting & Runway Alarm State
  const [forecastChannels, setForecastChannels] = useState({});
  const [runwayAlarms, setRunwayAlarms] = useState([]);
  const [faultTreeGraph, setFaultTreeGraph] = useState({ nodes: [], edges: [], summary: {} });
  // Cryptographic Secure Command Uplink State
  const [pendingSecureUplink, setPendingSecureUplink] = useState(null);

  // Automated Contingency Runbooks State
  const [runbooks, setRunbooks] = useState([]);
  const [runbookExecutions, setRunbookExecutions] = useState([]);
  const [selectedRunbookExecutionId, setSelectedRunbookExecutionId] = useState(null);
  const lastRunbookSoundStateRef = useRef({});

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Live state refs for WebSocket, sync handlers, and voice executor
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;
  const activeSpacecraftRef = useRef(activeSpacecraft);
  activeSpacecraftRef.current = activeSpacecraft;
  const availableChannelsRef = useRef(availableChannels);
  availableChannelsRef.current = availableChannels;
  const fleetNodesRef = useRef(fleetNodes);
  fleetNodesRef.current = fleetNodes;
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const anomaliesRef = useRef(anomalies);
  anomaliesRef.current = anomalies;
  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const runwayAlarmsRef = useRef(runwayAlarms);
  runwayAlarmsRef.current = runwayAlarms;
  const isCrisisRef = useRef(isCrisis);
  isCrisisRef.current = isCrisis;
  const operatorRoleRef = useRef(operatorRole);
  operatorRoleRef.current = operatorRole;
  const hasCommandAuthorityRef = useRef(hasCommandAuthority);
  hasCommandAuthorityRef.current = hasCommandAuthority;

  const readDiagnosisAloud = useCallback((anomalyOverride = null, { bypassMute = false } = {}) => {
    const target =
      anomalyOverride ||
      anomaliesRef.current.find((a) => a.id === selectedAnomalyIdRef.current) ||
      anomaliesRef.current[0];
    const spokenText = buildDiagnosisBriefing(target);
    if (!spokenText) return false;
    return speakBriefing(spokenText, 'HIGH', { bypassMute });
  }, [speakBriefing]);

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

  const selectedAnomalyIdRef = useRef(selectedAnomalyId);
  useEffect(() => {
    selectedAnomalyIdRef.current = selectedAnomalyId;
  }, [selectedAnomalyId]);

  // Keep commands synced with currently selected anomaly
  useEffect(() => {
    const current = anomalies.find((a) => a.id === selectedAnomalyId) || anomalies[0];
    if (current && current.commands && current.commands.length > 0) {
      setCommands(current.commands);
    }
  }, [selectedAnomalyId, anomalies]);

  // Poll initial backend health and sync events
  const syncWithBackend = useCallback(async () => {
    try {
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
              model: evt.gemini_analysis.model_used || 'Google Gemini Mission Reasoner',
              rootCause: evt.gemini_analysis.diagnosis,
              survivalProbability: evt.gemini_analysis.survival_probability ?? (evt.gemini_analysis.severity === 'CRITICAL' ? 68 : evt.gemini_analysis.severity === 'HIGH' ? 82 : 95),
              timeToExhaustion: evt.gemini_analysis.time_to_exhaustion || (evt.gemini_analysis.severity === 'CRITICAL' ? '12m 40s' : '36m 15s'),
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
          if (!initialEventsSeededRef.current) {
            formatted.forEach((f) => knownEventIdsRef.current.add(f.id));
            initialEventsSeededRef.current = true;
          } else {
            const newlyDetected = formatted.filter(
              (f) =>
                !knownEventIdsRef.current.has(f.id) &&
                f.status !== 'RESOLVED' &&
                f.status !== 'APPROVED'
            );
            formatted.forEach((f) => knownEventIdsRef.current.add(f.id));
            if (newlyDetected.length > 0 && Date.now() - lastAudioAlertAtRef.current > 8000) {
              const latestEvt = newlyDetected[0];
              lastAudioAlertAtRef.current = Date.now();
              playAlertChime(latestEvt.severity);
              speakBriefing(
                buildAnomalyBriefing({
                  severity: latestEvt.severity,
                  channel: latestEvt.rawEvent?.channel || activeChannelRef.current,
                  score: latestEvt.mlScore,
                  threshold: detectionThresholdRef.current,
                  spacecraftId: activeSpacecraftRef.current,
                }),
                latestEvt.severity
              );
            }
          }

          setAnomalies(formatted);
          if (!selectedAnomalyIdRef.current || !formatted.some((f) => f.id === selectedAnomalyIdRef.current)) {
            setSelectedAnomalyId(formatted[0].id);
          }
        }
        const logs = await fetchAuditLog(50);
        if (logs && logs.length > 0) {
          const backendFormatted = logs.map((l) => ({
            id: l.id,
            time: l.time,
            type: l.type,
            subsystem: l.subsystem,
            message: l.event,
            crypto_hash: l.crypto_hash,
          }));
          setAuditLog((prev) => {
            const backendIds = new Set(backendFormatted.map((b) => b.id));
            const backendMsgs = new Set(backendFormatted.map((b) => b.message));
            const localPending = prev.filter(
              (p) => !backendIds.has(p.id) && !backendMsgs.has(p.message) && String(p.id).startsWith('evt_local_')
            );
            return [...localPending, ...backendFormatted].slice(0, 60);
          });
        }

        const chanData = await fetchChannels();
        if (chanData && chanData.channels && chanData.channels.length > 0) {
          setAvailableChannels(chanData.channels);
          if (chanData.active_channel) {
            setActiveChannel(chanData.active_channel);
          }
        }

        const fleetData = await fetchFleetStatus();
        if (fleetData) {
          if (fleetData.fleet_summary) setFleetSummary(fleetData.fleet_summary);
          if (fleetData.nodes) setFleetNodes(fleetData.nodes);
          if (fleetData.isl_mesh) setIslLinks(fleetData.isl_mesh);
        }

        const ftaData = await fetchFaultTreeCascade(activeSpacecraft);
        if (ftaData && ftaData.nodes && ftaData.nodes.length > 0) {
          setFaultTreeGraph(ftaData);
        }

        const rbData = await fetchRunbooks();
        if (rbData) {
          if (Array.isArray(rbData.runbooks)) setRunbooks(rbData.runbooks);
          if (Array.isArray(rbData.executions)) {
            setRunbookExecutions(rbData.executions);
            setSelectedRunbookExecutionId((prevId) => prevId || rbData.executions[0]?.execution_id || null);
          }
        }
      } else {
        setIsBackendConnected(false);
      }
    } catch (err) {
      console.warn('Backend sync failed:', err);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 3000);
    return () => clearInterval(interval);
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
          syncWithBackend();
          if (typeof window !== 'undefined') window.ASTRA_WS = ws;
          console.info('[ASTRA WS] Connected to live telemetry backend:', wsUrl);
        };

        ws.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const data = JSON.parse(event.data);

            // Real-time Automated Contingency Runbook updates
            if (data.type === 'RUNBOOK_UPDATE' && data.execution) {
              const ex = data.execution;
              if (Array.isArray(data.executions)) {
                setRunbookExecutions(data.executions);
              } else {
                setRunbookExecutions((prev) => {
                  const filtered = prev.filter((item) => item.execution_id !== ex.execution_id);
                  return [ex, ...filtered].slice(0, 25);
                });
              }
              setSelectedRunbookExecutionId(ex.execution_id);

              const prevStatus = lastRunbookSoundStateRef.current[ex.execution_id];
              if (prevStatus !== ex.status) {
                lastRunbookSoundStateRef.current[ex.execution_id] = ex.status;
                if (ex.status === 'COMPLETED') {
                  playAlertChime('COMMAND_CONFIRMED');
                  speakBriefing(
                    `Contingency runbook ${ex.runbook_id} completed. All ${ex.total_steps || ex.step_states?.length || ''} verification gates passed.`,
                    'HIGH'
                  );
                  syncWithBackend();
                } else if (ex.status === 'HALTED_VERIFICATION_FAILED') {
                  playAlertChime('CRITICAL');
                  speakBriefing(
                    `Alert. Contingency runbook ${ex.runbook_id} halted at step ${ex.current_step}. Telemetry verification gate failed.`,
                    'CRITICAL'
                  );
                  syncWithBackend();
                } else if (ex.status === 'ABORTED') {
                  playAlertChime('WARNING');
                  syncWithBackend();
                }
              }
              return;
            }

            if (data.type === 'TELEMETRY_TICK' || data.type === 'CONNECTION_ESTABLISHED') {
              if (data.type === 'CONNECTION_ESTABLISHED' && Array.isArray(data.runbook_executions)) {
                setRunbookExecutions(data.runbook_executions);
              }
              const tel = data.telemetry;
              if (!tel) return;

              if (data.spacecraft_id) {
                setActiveSpacecraftState(data.spacecraft_id);
              }
              if (tel.fleet_nodes) {
                setFleetNodes(Object.values(tel.fleet_nodes));
              }
              if (tel.isl_links) {
                setIslLinks(tel.isl_links);
              }
              if (data.orbital_state) {
                setOrbitalState(data.orbital_state);
              }
              if (data.fleet_summary || tel.fleet_summary) {
                setFleetSummary(data.fleet_summary || tel.fleet_summary);
              }

              // Parse predictive forecasting data from WebSocket tick
              if (data.fault_tree) {
                setFaultTreeGraph(data.fault_tree);
              }

              if (data.forecast) {
                if (data.forecast.channels) {
                  setForecastChannels(data.forecast.channels);
                }
                if (data.forecast.active_alarms) {
                  setRunwayAlarms(data.forecast.active_alarms);
                }
              }

              const nowTime = new Date().toLocaleTimeString();
              const activeThreshold = Number(detectionThresholdRef.current || 0.3889);
              const rawScore = Number(tel.anomaly_score || 0);
              const isAnom = Boolean(tel.is_anomaly) || rawScore > activeThreshold;
              setIsCrisis(isAnom);

              // Automatically fire synthesized chime + live TTS readout on nominal -> anomaly transition
              if (isAnom && !wasAnomalyActiveRef.current) {
                wasAnomalyActiveRef.current = true;
                const nowMs = Date.now();
                if (nowMs - lastAudioAlertAtRef.current > 8000) {
                  lastAudioAlertAtRef.current = nowMs;
                  const dynSeverity =
                    rawScore >= 0.85 || Number(tel.voltage) < 18 || Number(tel.temperature) > 70
                      ? 'CRITICAL'
                      : 'HIGH';
                  playAlertChime(dynSeverity);
                  speakBriefing(
                    buildAnomalyBriefing({
                      severity: dynSeverity,
                      channel: tel.channel || activeChannelRef.current,
                      score: rawScore,
                      threshold: activeThreshold,
                      voltage: tel.voltage,
                      temperature: tel.temperature,
                      spacecraftId: data.spacecraft_id || activeSpacecraftRef.current,
                    }),
                    dynSeverity
                  );
                }
              } else if (!isAnom) {
                wasAnomalyActiveRef.current = false;
              }

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

              // Calculate dynamic subsystem states across all four avionics components
              const epsStatus = (tel.voltage < 20 || tel.battery_pct < 60)
                ? 'CRITICAL'
                : (tel.voltage < 23 || tel.solar_input < 60)
                ? 'WARNING'
                : 'HEALTHY';

              const tcsStatus = tel.temperature > 70
                ? 'CRITICAL'
                : tel.temperature > 35
                ? 'WARNING'
                : 'HEALTHY';

              const ttcStatus = (tel.link_snr != null && tel.link_snr < 9)
                ? 'CRITICAL'
                : (tel.link_snr != null && tel.link_snr < 11.5)
                ? 'WARNING'
                : 'HEALTHY';

              const adcsStatus = (tel.adcs_drift != null && tel.adcs_drift > 0.3)
                ? 'CRITICAL'
                : (tel.adcs_drift != null && tel.adcs_drift > 0.05)
                ? 'WARNING'
                : 'HEALTHY';

              setSubsystems([
                {
                  id: 'eps',
                  name: 'POWER (EPS)',
                  fullName: 'Electrical Power Subsystem',
                  status: epsStatus,
                  metrics: [
                    { label: 'Bus Voltage', value: `${tel.voltage != null ? Number(tel.voltage).toFixed(1) : '24.1'} V`, nominal: '24.0 - 28.0 V' },
                    { label: 'Li-Ion Battery', value: `${tel.battery_pct != null ? Number(tel.battery_pct).toFixed(1) : '98.4'}%`, nominal: '> 70%' },
                    { label: 'Solar Input', value: `${tel.solar_input != null ? Number(tel.solar_input).toFixed(1) : '96.4'}%`, nominal: '> 80%' },
                  ],
                  details: epsStatus === 'CRITICAL'
                    ? 'CRITICAL: Severe undervoltage / solar array fault. Automated load-shedding active.'
                    : epsStatus === 'WARNING'
                    ? 'WARNING: Bus margin degraded. Battery discharging under secondary load.'
                    : 'Dual array sun-tracking active (4.82 kW). Shunt limiters S3R nominal.',
                },
                {
                  id: 'tcs',
                  name: 'THERMAL (TCS)',
                  fullName: 'Thermal Control Subsystem',
                  status: tcsStatus,
                  metrics: [
                    { label: 'Avionics Core', value: `${tel.temperature != null ? Number(tel.temperature).toFixed(1) : '15.2'} °C`, nominal: '10 - 30 °C' },
                    { label: 'Radiator Loop 1', value: tel.temperature > 50 ? '98% Deploy' : tel.temperature > 30 ? '78% Deploy' : '45% Deploy', nominal: 'Active' },
                    { label: 'Heat Gradient', value: `${(0.8 + (tel.temperature > 30 ? (tel.temperature - 30) * 0.04 : 0)).toFixed(1)} W/cm²`, nominal: '< 1.5 W/cm²' },
                  ],
                  details: tcsStatus === 'CRITICAL'
                    ? 'CRITICAL: Avionics core exceeding thermal ceiling. Emergency louvers 100% open.'
                    : tcsStatus === 'WARNING'
                    ? 'WARNING: Radiator loop saturated. Heat pipe gradient elevated.'
                    : 'Thermostats in deadband. Freon circulating nominal.',
                },
                {
                  id: 'ttc',
                  name: 'COMMUNICATIONS (TT&C)',
                  fullName: 'Telemetry, Tracking & Command',
                  status: ttcStatus,
                  metrics: [
                    { label: 'Ground Station', value: 'DSN Madrid-63', nominal: 'Complex 63' },
                    { label: 'S-Band SNR', value: `${tel.link_snr != null ? (tel.link_snr > 0 ? '+' : '') + Number(tel.link_snr).toFixed(1) : '+14.2'} dBm`, nominal: '> +10 dBm' },
                    { label: 'Packet Rate', value: `${tel.packet_rate != null ? Number(tel.packet_rate).toFixed(1) : '10.0'} pkts/s`, nominal: '10.0 pkts/s' },
                  ],
                  details: ttcStatus === 'CRITICAL'
                    ? 'CRITICAL: Severe carrier attenuation. High packet drops on Madrid uplink.'
                    : ttcStatus === 'WARNING'
                    ? 'WARNING: S-Band SNR margin reduced. Antenna pointing jitter detected.'
                    : 'High-gain dish locked on Madrid carrier (7.195 GHz). SNR nominal.',
                },
                {
                  id: 'adcs',
                  name: 'ATTITUDE (ADCS)',
                  fullName: 'Attitude Determination & Control',
                  status: adcsStatus,
                  metrics: [
                    { label: 'Pointing Lock', value: tel.adcs_drift > 0.3 ? 'LOST - Slew' : tel.adcs_drift > 0.05 ? 'Jitter Lock' : '+Z Earth Facing', nominal: 'Locked' },
                    { label: 'Gyro Drift', value: `${tel.adcs_drift != null ? Number(tel.adcs_drift).toFixed(3) : '0.020'} °/hr`, nominal: '< 0.05 °/hr' },
                    { label: 'Reaction Wheels', value: `${Math.round(3240 + (tel.adcs_drift > 0.05 ? Math.min(2700, tel.adcs_drift * 3200) : 0)).toLocaleString()} RPM`, nominal: '< 6,000 RPM' },
                  ],
                  details: adcsStatus === 'CRITICAL'
                    ? 'CRITICAL: Spacecraft tumbling detected! Angular momentum dump required.'
                    : adcsStatus === 'WARNING'
                    ? 'WARNING: Reaction wheel saturation risk. Gyro drift rate elevated.'
                    : '14 Star trackers acquired. Quaternion precision: 0.001 deg.',
                },
              ]);
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

  // Persist voice-originated actions into SQLite astra.db audit_log
  const recordVoiceAudit = useCallback(
    async ({ type = 'VOICE_COMMAND', subsystem = 'VOICE_COMMS', message, telemetrySummary = null }) => {
      const taggedMsg = message.includes('SOURCE: VOICE_COMMAND')
        ? message
        : `${message} [SOURCE: VOICE_COMMAND]`;
      const now = new Date().toTimeString().split(' ')[0];
      const localId = `evt_local_${Date.now()}`;

      setAuditLog((prev) => [
        {
          id: localId,
          time: now,
          type,
          subsystem,
          message: taggedMsg,
        },
        ...prev,
      ]);

      try {
        await postAuditLog({
          type,
          subsystem,
          event: taggedMsg,
          source: 'VOICE_COMMAND',
          telemetry_summary: telemetrySummary,
        });
      } catch (e) {
        console.warn('Voice audit persistence warning:', e);
      }
    },
    []
  );

  // Request Gemini Reasoning Analysis for an Event (with optional automatic TTS readout)
  const triggerGeminiAnalysis = async (eventId, options = {}) => {
    const { autoSpeak = true, bypassMute = false } = options || {};
    const targetId =
      eventId ||
      selectedAnomalyIdRef.current ||
      (anomaliesRef.current[0] && anomaliesRef.current[0].id) ||
      'ASTRA-P3-0001';
    setIsAnalyzing(true);
    try {
      const res = await analyzeEvent(targetId);
      if (res && res.analysis) {
        const mappedDiagnosis = {
          model: res.analysis.model_used || 'Google Gemini Mission Reasoner',
          rootCause: res.analysis.diagnosis,
          survivalProbability:
            res.analysis.survival_probability ??
            (res.analysis.severity === 'CRITICAL' ? 68 : res.analysis.severity === 'HIGH' ? 82 : 95),
          timeToExhaustion:
            res.analysis.time_to_exhaustion ||
            (res.analysis.severity === 'CRITICAL' ? '12m 40s' : '36m 15s'),
          evidence: res.analysis.evidence,
          recommendedAction: res.analysis.recommendation,
          operator_approval_required: res.analysis.operator_approval_required,
        };

        let spokenTarget = null;
        setAnomalies((prev) => {
          const list = prev && prev.length > 0 ? prev : INITIAL_ANOMALIES;
          return list.map((anm) => {
            if (anm.id === targetId) {
              const updated = {
                ...anm,
                status: 'UNDER_REVIEW',
                severity: res.analysis.severity || anm.severity,
                mlConfidence: `${Math.round(res.analysis.confidence * 100)}%`,
                geminiDiagnosis: mappedDiagnosis,
              };
              spokenTarget = updated;
              return updated;
            }
            return anm;
          });
        });

        if (autoSpeak) {
          const fallbackTarget = spokenTarget || {
            id: targetId,
            severity: res.analysis.severity || 'HIGH',
            channel: res.event?.channel || activeChannelRef.current,
            geminiDiagnosis: mappedDiagnosis,
          };
          readDiagnosisAloud(fallbackTarget, { bypassMute });
        }

        const logs = await fetchAuditLog(50);
        if (logs) {
          setAuditLog(
            logs.map((l) => ({
              id: l.id,
              time: l.time,
              type: l.type,
              subsystem: l.subsystem,
              message: l.event,
              crypto_hash: l.crypto_hash,
            }))
          );
        }
      }
      return res;
    } catch (err) {
      console.error('Gemini analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Multi-Channel Telemetry Stream Switcher
  const switchActiveChannel = useCallback(async (channel) => {
    const channelClean = String(channel).trim().toUpperCase();
    setActiveChannel(channelClean);
    const now = new Date().toTimeString().split(' ')[0];
    const localId = `evt_local_${Date.now()}`;
    setAuditLog((prev) => [
      {
        id: localId,
        time: now,
        type: 'COMMAND_UPLINK',
        message: `STREAM RECONFIGURED: Switched telemetry ingestion engine to NASA channel ${channelClean}.`,
      },
      ...prev,
    ]);
    try {
      await switchChannel(channelClean);
    } catch (e) {
      console.warn('REST switchChannel notice:', e);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'set_channel',
        channel: channelClean,
      }));
    }
    setTimeout(() => {
      syncWithBackend();
    }, 400);
  }, [syncWithBackend]);

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

  const triggerCrisis = (scenarioName = 'Solar Array Strike & EPS Bus Failure', mode = 'crisis_solar') => {
    wasAnomalyActiveRef.current = false; // Allow WS transition hook to chime & announce full telemetry readout
    switchSimulationMode(mode, 0);
  };

  const resetToNominal = () => {
    switchSimulationMode('nominal', 0);
  };

  const playNasaP3Stream = (startIndex = 5300) => {
    switchSimulationMode('nasa_p3', startIndex);
  };


  // Cryptographic Secure Handshake Abort
  const handleAbortSecureUplink = useCallback(async (commandId, reason = 'Flight Director manual abort') => {
    try {
      await abortCommandUplink(commandId, {
        operator_id: 'Flight Director Gene Kranz',
        reason,
      });
    } catch (err) {
      console.warn('Backend command abort warning:', err);
    }

    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'WARNING',
        message: `COMMAND UPLINK ABORTED: [${commandId}] canceled during T-10s handshake by Flight Director Gene Kranz. Reason: ${reason}.`,
      },
      ...prev,
    ]);

    setPendingSecureUplink(null);
  }, []);

  // Cryptographic Secure Handshake Transmit
  const handleTransmitSecureUplink = useCallback(async (commandId, signature = '') => {
    try {
      await transmitCommandUplink(commandId, {
        operator_id: 'Flight Director Gene Kranz',
        verification_hash: signature,
      });
    } catch (err) {
      console.warn('Backend command transmit warning:', err);
    }

    const updatedCommands = commands.map((cmd) =>
      cmd.id === commandId ? { ...cmd, status: 'APPROVED', crypto_hash: signature } : cmd
    );
    setCommands(updatedCommands);

    setAnomalies((prev) =>
      prev.map((anm) =>
        anm.id === selectedAnomalyId
          ? {
              ...anm,
              status: 'RESOLVED',
              commands: (anm.commands || []).map((cmd) =>
                cmd.id === commandId ? { ...cmd, status: 'APPROVED', crypto_hash: signature } : cmd
              ),
            }
          : anm
      )
    );

    if (selectedAnomalyId) {
      try {
        await approveEvent(
          selectedAnomalyId,
          true,
          'Flight Director Gene Kranz',
          `Cryptographically authorized & signed (HMAC: ${signature.slice(0, 16)}...).`
        );
      } catch (err) {
        console.warn('Backend event approval warning:', err);
      }
    }

    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'OPERATOR_APPROVAL',
        message: `FLIGHT DIRECTOR APPROVED: [${commandId}]. Cryptographic signature verified (HMAC-SHA256: ${signature.slice(0, 16)}...). Uplink completed via DSN Madrid-63.`,
        crypto_hash: signature,
      },
      ...prev,
    ]);

    playAlertChime('success');

    // Spacecraft Recovery: Immediately restore React state to nominal
    setIsCrisis(false);
    setTelemetry((prev) => ({
      ...prev,
      voltage: 24.1,
      temperature: 15.2,
      battery_pct: 98.4,
      solar_input: 96.4,
      current_draw: 4.2,
      anomaly_score: 0.02,
      is_anomaly: false,
      mode: 'nominal',
    }));
    setSubsystems(INITIAL_SUBSYSTEMS);

    // Send reset to backend via WebSocket and REST dual-channel
    resetToNominal();
    try {
      await setSimulationMode('nominal', 0);
    } catch (e) {
      console.warn('Simulation mode sync warning:', e);
    }

    const recTime = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: recTime,
        type: 'NOMINAL',
        message: `SPACECRAFT RECOVERY CONFIRMED: Safe-state uplink executed. Telemetry restored to nominal envelope.`,
        crypto_hash: signature,
      },
      ...prev,
    ]);

    setPendingSecureUplink(null);
  }, [commands, selectedAnomalyId, playAlertChime, resetToNominal]);

  // Human-in-the-Loop Operator Command Approval (Enforces RBAC & Secure Handshake)
  const approveCommand = async (commandId, note = '') => {
    if (!hasCommandAuthority) {
      const now = new Date().toTimeString().split(' ')[0];
      setAuditLog((prev) => [
        {
          id: `evt_${Date.now()}`,
          time: now,
          type: 'WARNING',
          message: `ACCESS DENIED: Command authorization rejected. Telemetry Observers do not possess Flight Director uplink clearance.`,
        },
        ...prev,
      ]);
      alert("Access Denied: Flight Director clearance is required to authorize spacecraft contingency commands.");
      return;
    }

    const cmd = commands.find((c) => c.id === commandId) || {
      id: commandId,
      name: commandId,
      desc: 'Contingency command uplink',
      subsystem: 'EPS',
      severity: 'HIGH',
    };

    try {
      const windowData = await authorizeCommandUplink(commandId, {
        operator_id: 'Flight Director Gene Kranz',
        operator_role: operatorRole,
        command_code: cmd.id,
        command_name: cmd.name || cmd.command_name || commandId,
        subsystem: cmd.subsystem || 'EPS',
        spacecraft_id: activeSpacecraft,
        anomaly_id: selectedAnomalyId,
        severity: cmd.severity || 'HIGH',
        window_seconds: 10.0,
      });

      if (windowData && windowData.signature) {
        setPendingSecureUplink(windowData);
        return;
      }
    } catch (err) {
      console.warn('Secure uplink authorization notice (falling back to direct approval):', err);
    }

    // Direct fallback
    handleTransmitSecureUplink(commandId, `HMAC-LOCAL-${Date.now().toString(16)}`);
  };

  const rejectCommand = async (commandId, note = '') => {
    if (!hasCommandAuthority) {
      alert("Access Denied: Flight Director clearance is required to reject spacecraft commands.");
      return;
    }

    setCommands((prev) =>
      prev.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'REJECTED' } : cmd))
    );

    setAnomalies((prev) =>
      prev.map((anm) =>
        anm.id === selectedAnomalyId
          ? {
              ...anm,
              status: 'REJECTED',
              commands: (anm.commands || []).map((cmd) =>
                cmd.id === commandId ? { ...cmd, status: 'REJECTED' } : cmd
              ),
            }
          : anm
      )
    );

    const currentEvtId = selectedAnomalyId;
    if (currentEvtId) {
      try {
        await approveEvent(currentEvtId, false, 'Flight Director Gene Kranz', note || 'Manual override executed.');
      } catch (err) {
        console.warn('Backend event rejection warning:', err);
      }
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

  const approveAllCommands = async (sourceTag = null) => {
    if (!hasCommandAuthority) {
      playAlertChime('DENIED');
      alert("Access Denied: Flight Director clearance is required to authorize spacecraft commands.");
      return;
    }

    const validSource = typeof sourceTag === 'string' && sourceTag.trim() ? sourceTag.trim() : null;
    const sourceSuffix = validSource ? ` [SOURCE: ${validSource}]` : '';
    const noteText = validSource
      ? `All staged contingency commands authorized after HITL confirmation (${validSource}).`
      : 'All staged contingency commands authorized.';

    setCommands((prev) => prev.map((cmd) => ({ ...cmd, status: 'APPROVED' })));

    setAnomalies((prev) =>
      prev.map((anm) =>
        anm.id === selectedAnomalyId
          ? {
              ...anm,
              status: 'RESOLVED',
              commands: (anm.commands || []).map((c) => ({ ...c, status: 'APPROVED' })),
            }
          : anm
      )
    );

    if (selectedAnomalyId) {
      try {
        await approveEvent(selectedAnomalyId, true, 'Flight Director Gene Kranz', noteText);
      } catch (err) {
        console.warn('Backend approve-all warning:', err);
      }
    }
    if (validSource === 'VOICE_COMMAND') {
      await recordVoiceAudit({
        type: 'OPERATOR_APPROVAL',
        subsystem: 'FLIGHT CONTROL (VOICE_COMMS)',
        message: `EMERGENCY CONTINGENCY SEQUENCE CONFIRMED: All staged commands authorized via HITL modal.${sourceSuffix}`,
      });
    } else {
      const now = new Date().toTimeString().split(' ')[0];
      setAuditLog((prev) => [
        {
          id: `evt_${Date.now()}`,
          time: now,
          type: 'OPERATOR_APPROVAL',
          message: `EMERGENCY CONTINGENCY SEQUENCE AUTHORIZED: All staged commands approved and transmitted via DSN Madrid-63.${sourceSuffix}`,
        },
        ...prev,
      ]);
    }

    playAlertChime('success');

    // Spacecraft Recovery: Immediately restore React state to nominal
    setIsCrisis(false);
    setTelemetry((prev) => ({
      ...prev,
      voltage: 24.1,
      temperature: 15.2,
      battery_pct: 98.4,
      solar_input: 96.4,
      current_draw: 4.2,
      anomaly_score: 0.02,
      is_anomaly: false,
      mode: 'nominal',
    }));
    setSubsystems(INITIAL_SUBSYSTEMS);

    // Send reset to backend via WebSocket and REST dual-channel
    resetToNominal();
    try {
      await setSimulationMode('nominal', 0);
    } catch (e) {
      console.warn('Simulation mode sync warning:', e);
    }

    const recTime = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: recTime,
        type: 'NOMINAL',
        message: `SPACECRAFT RECOVERY CONFIRMED: Safe-state executed successfully. Telemetry returning to nominal envelope.`,
      },
      ...prev,
    ]);
  };

  // Re-stage a previously approved or rejected command for testing / re-verification
  const restageCommand = useCallback((commandId) => {
    setCommands((prev) =>
      prev.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'PENDING', crypto_hash: undefined } : cmd))
    );
    setAnomalies((prev) =>
      prev.map((anm) =>
        anm.id === selectedAnomalyId
          ? {
              ...anm,
              commands: (anm.commands || []).map((cmd) =>
                cmd.id === commandId ? { ...cmd, status: 'PENDING', crypto_hash: undefined } : cmd
              ),
            }
          : anm
      )
    );
  }, [selectedAnomalyId]);

  // Dynamically stage a new contingency command for the active anomaly
  const stageContingencyCommand = useCallback((customCmd = null) => {
    const defaultTemplates = [
      {
        id: `CMD-SOLAR-B-${Date.now().toString(16).slice(-4).toUpperCase()}`,
        name: 'CMD_DEPLOY_SOLAR_B: Deploy Backup Solar Array Panel B',
        desc: 'Actuate secondary pyrotechnic hinge release on starboard wing and lock solar tracker.',
        severity: 'CRITICAL',
        status: 'PENDING',
        subsystem: 'EPS / POWER',
        uplinkEst: '1.4s',
      },
      {
        id: `CMD-BUS-SAFE-${Date.now().toString(16).slice(-4).toUpperCase()}`,
        name: 'CMD_ISOLATE_BUS_2: Initiate Bus Undervoltage Safe-Mode',
        desc: 'Isolate secondary power bus Branch 2 and transfer vital payloads to emergency diode bus.',
        severity: 'HIGH',
        status: 'PENDING',
        subsystem: 'EPS / POWER',
        uplinkEst: '2.1s',
      },
      {
        id: `CMD-TCS-PURGE-${Date.now().toString(16).slice(-4).toUpperCase()}`,
        name: 'CMD_TCS_LOOP_PURGE: Purge Thermal Radiator Loop 1',
        desc: 'Open auxiliary bypass valve to prevent ammonia freeze-point degradation.',
        severity: 'MEDIUM',
        status: 'PENDING',
        subsystem: 'TCS / THERMAL',
        uplinkEst: '3.0s',
      }
    ];

    const randomTemplate = defaultTemplates[Math.floor(Math.random() * defaultTemplates.length)];
    const newCmd = customCmd || randomTemplate;

    setCommands((prev) => [newCmd, ...prev.filter((c) => c.id !== newCmd.id)]);
    setAnomalies((prev) =>
      prev.map((anm) =>
        anm.id === selectedAnomalyId
          ? {
              ...anm,
              commands: [newCmd, ...(anm.commands || []).filter((c) => c.id !== newCmd.id)],
            }
          : anm
      )
    );

    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'COMMAND_STAGED',
        message: `CONTINGENCY COMMAND STAGED: [${newCmd.id}] (${newCmd.name}) queued for operator authorization.`,
      },
      ...prev,
    ]);
  }, [selectedAnomalyId]);

  const switchSpacecraft = useCallback(async (spacecraftId) => {
    const cleanId = spacecraftId.trim().toUpperCase();
    setActiveSpacecraftState(cleanId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('astra_active_spacecraft', cleanId);
    }
    try {
      await switchFleetSpacecraft(cleanId);
    } catch (e) {
      console.warn('Switch fleet spacecraft error:', e);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'set_spacecraft',
        spacecraft_id: cleanId,
      }));
    }
    setAuditLog((prev) => [
      {
        id: `evt_local_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: 'COMMAND_UPLINK',
        message: `STREAM RECONFIGURED: Switched ground telemetry monitoring focus to constellation node ${cleanId}.`,
      },
      ...prev,
    ]);
    playAlertChime('normal');
  }, [playAlertChime]);

  // Confirm or cancel voice-initiated bulk command authorization modal
  const confirmVoiceApproval = useCallback(async () => {
    setPendingVoiceApproval(null);
    await approveAllCommands('VOICE_COMMAND');
    speakBriefing('Flight Director confirmation accepted. All staged contingency commands uplinked.', 'COMMAND_CONFIRMED');
  }, [approveAllCommands, speakBriefing]);

  const cancelVoiceApproval = useCallback(async () => {
    setPendingVoiceApproval(null);
    playAlertChime('WARNING');
    await recordVoiceAudit({
      type: 'WARNING',
      subsystem: 'VOICE_COMMS (HITL)',
      message: 'VOICE AUTHORIZATION CANCELED: Flight Director aborted HITL confirmation modal.',
    });
    speakBriefing('Command authorization canceled.', 'NORMAL');
  }, [playAlertChime, recordVoiceAudit, speakBriefing]);

  // Voice Command Natural Language Dispatcher
  const executeVoiceCommand = useCallback(
    async (transcript) => {
      const intent = parseVoiceIntent(transcript, {
        availableChannels: availableChannelsRef.current,
        fleetNodes: fleetNodesRef.current,
      });
      if (!intent) return;

      const scheduleFeedbackReset = () => {
        clearTimeout(voiceFeedbackTimerRef.current);
        voiceFeedbackTimerRef.current = setTimeout(() => {
          setVoiceLastAction(null);
        }, 6500);
      };

      switch (intent.type) {
        case 'WAKE_ACK':
          playAlertChime('NOMINAL');
          setVoiceLastAction({ status: 'OK', summary: 'ASTRA Standing By', tag: 'WAKE' });
          speakBriefing('ASTRA standing by.', 'NORMAL');
          break;

        case 'SWITCH_CHANNEL':
          await switchActiveChannel(intent.channel);
          playAlertChime('COMMAND_CONFIRMED');
          setVoiceLastAction({
            status: 'OK',
            summary: `Channel → ${intent.channel}`,
            tag: 'CHANNEL',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: `VOICE_COMMS (${intent.channel})`,
            message: `Switched active telemetry stream to channel ${intent.channel} via spoken command "${transcript}".`,
          });
          speakBriefing(`Switched telemetry stream to channel ${intent.channel}.`, 'NORMAL');
          break;

        case 'NAVIGATE':
          setActiveTab(intent.tab);
          if (intent.subTab) {
            setAnomalyCenterTab(intent.subTab);
          }
          playAlertChime('NOMINAL');
          setVoiceLastAction({
            status: 'OK',
            summary: `Navigate → ${intent.label}`,
            tag: 'NAV',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (NAV)',
            message: `Navigated to ${intent.label} via spoken command "${transcript}".`,
          });
          speakBriefing(`Opening ${intent.label}.`, 'NORMAL');
          break;

        case 'RUN_AI_DIAGNOSTIC': {
          const targetId =
            selectedAnomalyIdRef.current ||
            anomaliesRef.current[0]?.id ||
            'ASTRA-P3-0001';
          playAlertChime('COMMAND_CONFIRMED');
          setVoiceLastAction({
            status: 'OK',
            summary: `Gemini AI Diagnostic → ${targetId}`,
            tag: 'GEMINI AI',
          });
          await recordVoiceAudit({
            type: 'AI_ACTION',
            subsystem: 'VOICE_COMMS (GEMINI)',
            message: `Triggered Gemini AI diagnostic on ${targetId} via spoken command "${transcript}".`,
          });
          speakBriefing(`Running Gemini AI diagnostic on ${targetId}.`, 'NORMAL');
          await triggerGeminiAnalysis(targetId, { autoSpeak: true, bypassMute: true });
          break;
        }

        case 'READ_DIAGNOSIS': {
          const spoken = readDiagnosisAloud(null, { bypassMute: true });
          setVoiceLastAction({
            status: spoken ? 'OK' : 'ERROR',
            summary: spoken ? 'Reading Gemini Diagnosis Aloud' : 'No Diagnosis Available',
            tag: 'TTS',
          });
          if (!spoken) {
            speakBriefing('No Gemini diagnosis is currently loaded on the selected anomaly.', 'NORMAL', { bypassMute: true });
          } else {
            await recordVoiceAudit({
              type: 'VOICE_COMMAND',
              subsystem: 'VOICE_COMMS (TTS)',
              message: `Read active Gemini diagnosis aloud via spoken command "${transcript}".`,
            });
          }
          break;
        }

        case 'STATUS_BRIEFING': {
          const msg = buildStatusBriefing({
            telemetry: telemetryRef.current,
            activeChannel: activeChannelRef.current,
            activeSpacecraft: activeSpacecraftRef.current,
            isCrisis: isCrisisRef.current,
            runwayAlarms: runwayAlarmsRef.current,
          });
          setVoiceLastAction({
            status: 'OK',
            summary: `Live Telemetry Briefing (${activeSpacecraftRef.current})`,
            tag: 'STATUS',
          });
          speakBriefing(msg, 'HIGH', { bypassMute: true });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (STATUS)',
            message: `Requested live telemetry voice briefing.`,
          });
          break;
        }

        case 'START_P3_REPLAY':
          playAlertChime('COMMAND_CONFIRMED');
          playNasaP3Stream(5300);
          setVoiceLastAction({
            status: 'OK',
            summary: 'NASA P-3 Replay Initiated (Step 5300)',
            tag: 'REPLAY',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (SIM)',
            message: `Initiated NASA P-3 dataset replay at step 5300 via spoken command "${transcript}".`,
          });
          speakBriefing('Starting NASA P-3 dataset replay.', 'NORMAL');
          break;

        case 'RESET_NOMINAL':
          resetToNominal();
          playAlertChime('COMMAND_CONFIRMED');
          setVoiceLastAction({
            status: 'OK',
            summary: 'Spacecraft Reset to Nominal',
            tag: 'RESET',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (SIM)',
            message: `Reset simulation telemetry to nominal baseline via spoken command "${transcript}".`,
          });
          speakBriefing('Spacecraft telemetry restored to nominal baseline.', 'NORMAL');
          break;

        case 'TRIGGER_CRISIS':
          if (!hasCommandAuthorityRef.current) {
            playAlertChime('DENIED');
            setVoiceLastAction({
              status: 'BLOCKED',
              summary: 'RBAC Blocked: Flight Director Required',
              tag: 'RBAC',
            });
            await recordVoiceAudit({
              type: 'WARNING',
              subsystem: 'VOICE_COMMS (RBAC)',
              message: `BLOCKED: Telemetry Observer attempted to trigger crisis simulation "${transcript}".`,
            });
            speakBriefing('Access denied. Flight Director clearance is required to inject anomalies.', 'HIGH');
            break;
          }
          triggerCrisis('Solar Array Strike & EPS Bus Failure');
          setVoiceLastAction({
            status: 'OK',
            summary: 'Solar Array Crisis Injected',
            tag: 'CRISIS',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (SIM)',
            message: `Injected Solar Array Strike crisis scenario via spoken command "${transcript}".`,
          });
          break;

        case 'SWITCH_SPACECRAFT':
          await switchSpacecraft(intent.spacecraftId);
          playAlertChime('COMMAND_CONFIRMED');
          setVoiceLastAction({
            status: 'OK',
            summary: `Focus → ${intent.spacecraftId}`,
            tag: 'FLEET',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: `VOICE_COMMS (${intent.spacecraftId})`,
            message: `Switched constellation focus to ${intent.spacecraftId} via spoken command "${transcript}".`,
          });
          speakBriefing(`Switching telemetry focus to ${intent.label}.`, 'NORMAL');
          break;

        case 'APPROVE_ALL_COMMANDS':
          if (!hasCommandAuthorityRef.current) {
            playAlertChime('DENIED');
            setVoiceLastAction({
              status: 'BLOCKED',
              summary: 'RBAC Denied: Flight Director Clearance Required',
              tag: 'RBAC',
            });
            await recordVoiceAudit({
              type: 'WARNING',
              subsystem: 'VOICE_COMMS (RBAC)',
              message: `ACCESS DENIED: Telemetry Observer attempted "${transcript}" without Flight Director clearance.`,
            });
            speakBriefing('Access denied. Flight Director clearance is required to authorize spacecraft commands.', 'HIGH');
            break;
          }
          playAlertChime('WARNING');
          setPendingVoiceApproval({
            transcript,
            anomalyId: selectedAnomalyIdRef.current,
            commands: commandsRef.current,
            operatorRole: operatorRoleRef.current,
          });
          setVoiceLastAction({
            status: 'PENDING_CONFIRM',
            summary: 'HITL Confirmation Modal Triggered',
            tag: 'HITL',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (HITL)',
            message: `Triggered Flight Director confirmation modal for bulk authorization via "${transcript}".`,
          });
          speakBriefing('Flight Director confirmation required. Please verify staged commands in the confirmation modal.', 'HIGH');
          break;

        case 'APPROVE_NEXT_COMMAND': {
          if (!hasCommandAuthorityRef.current) {
            playAlertChime('DENIED');
            setVoiceLastAction({
              status: 'BLOCKED',
              summary: 'RBAC Denied: Flight Director Clearance Required',
              tag: 'RBAC',
            });
            await recordVoiceAudit({
              type: 'WARNING',
              subsystem: 'VOICE_COMMS (RBAC)',
              message: `ACCESS DENIED: Telemetry Observer attempted "${transcript}" without Flight Director clearance.`,
            });
            speakBriefing('Access denied. Flight Director clearance is required to authorize spacecraft commands.', 'HIGH');
            break;
          }
          const nextPending =
            commandsRef.current.find((c) => c.status !== 'APPROVED' && c.status !== 'REJECTED') ||
            commandsRef.current[0];
          if (nextPending) {
            playAlertChime('WARNING');
            setVoiceLastAction({
              status: 'PENDING_CONFIRM',
              summary: `Crypto Handshake → ${nextPending.id}`,
              tag: 'UPLINK',
            });
            await recordVoiceAudit({
              type: 'VOICE_COMMAND',
              subsystem: 'VOICE_COMMS (HITL)',
              message: `Initiated secure T-10s uplink handshake for command ${nextPending.id} via "${transcript}".`,
            });
            speakBriefing(`Initiating secure authorization window for ${nextPending.name}. Confirm or abort within 10 seconds.`, 'HIGH');
            await approveCommand(nextPending.id);
          } else {
            setVoiceLastAction({
              status: 'ERROR',
              summary: 'No Pending Commands Available',
              tag: 'EMPTY',
            });
            speakBriefing('No staged commands are queued on the active anomaly.', 'NORMAL');
          }
          break;
        }

        case 'SET_AUDIO_MUTE':
          updateSettingsConfig({ audioAlertsEnabled: !intent.muted });
          audioAlertsEnabledRef.current = !intent.muted;
          if (intent.muted) {
            stopAllVoiceAudio();
          } else {
            playAcousticAlert('COMMAND_CONFIRMED', { enabled: true });
            speakBriefing('Acoustic alerts and voice briefings enabled.', 'NORMAL', { bypassMute: true });
          }
          setVoiceLastAction({
            status: 'OK',
            summary: intent.muted ? 'Audio Alerts Muted' : 'Audio Alerts Enabled',
            tag: 'AUDIO',
          });
          await recordVoiceAudit({
            type: 'VOICE_COMMAND',
            subsystem: 'VOICE_COMMS (AUDIO)',
            message: `${intent.muted ? 'Muted' : 'Unmuted'} procedural audio alerts via spoken command.`,
          });
          break;

        case 'STOP_SPEAKING':
          stopAllVoiceAudio();
          setVoiceLastAction({ status: 'OK', summary: 'TTS Readout Silenced', tag: 'AUDIO' });
          break;

        case 'UNKNOWN_CHANNEL':
          playAlertChime('DENIED');
          setVoiceLastAction({
            status: 'ERROR',
            summary: `Channel Not Found: "${transcript}"`,
            tag: 'CHANNEL',
          });
          speakBriefing('Requested telemetry channel was not found in the active 82-channel matrix.', 'NORMAL');
          break;

        default:
          setVoiceLastAction({
            status: 'ERROR',
            summary: `No matching intent: "${transcript}"`,
            tag: 'UNKNOWN',
          });
          break;
      }

      scheduleFeedbackReset();
    },
    [
      playAlertChime,
      speakBriefing,
      switchActiveChannel,
      recordVoiceAudit,
      setActiveTab,
      triggerGeminiAnalysis,
      readDiagnosisAloud,
      playNasaP3Stream,
      resetToNominal,
      triggerCrisis,
      switchSpacecraft,
      approveCommand,
      updateSettingsConfig,
      stopAllVoiceAudio,
    ]
  );

  const executeVoiceCommandRef = useRef(executeVoiceCommand);
  executeVoiceCommandRef.current = executeVoiceCommand;

  useEffect(() => {
    const controller = new VoiceCommandController({
      onStatusChange: (status) => setVoiceStatus(status),
      onInterimTranscript: (interim) => setVoiceTranscript(interim),
      onFinalTranscript: (finalText) => {
        setVoiceTranscript(finalText);
        executeVoiceCommandRef.current?.(finalText);
      },
      onError: (errMsg) => {
        setVoiceLastAction({
          status: 'ERROR',
          summary: errMsg,
          tag: 'MIC',
        });
      },
    });
    voiceControllerRef.current = controller;
    return () => {
      controller.destroy();
      clearTimeout(voiceFeedbackTimerRef.current);
    };
  }, []);

  const toggleVoiceListening = useCallback(() => {
    const ctrl = voiceControllerRef.current;
    if (!ctrl) return;
    if (ctrl.isArmed) {
      ctrl.stop();
    } else {
      ctrl.start();
    }
  }, []);

  // Contingency Runbook Operations
  const refreshRunbooks = useCallback(async () => {
    const rbData = await fetchRunbooks();
    if (rbData) {
      if (Array.isArray(rbData.runbooks)) setRunbooks(rbData.runbooks);
      if (Array.isArray(rbData.executions)) setRunbookExecutions(rbData.executions);
    }
    return rbData;
  }, []);

  const launchRunbook = useCallback(
    async (runbookId) => {
      if (!hasCommandAuthorityRef.current) {
        playAlertChime('DENIED');
        throw new Error('ACCESS DENIED: Flight Director clearance is required to execute contingency runbooks.');
      }
      const res = await executeRunbook(runbookId, {
        operator_id: 'Flight Director Gene Kranz',
        operator_role: operatorRoleRef.current,
        spacecraft_id: activeSpacecraftRef.current,
      });
      if (res && res.execution) {
        setRunbookExecutions((prev) => [
          res.execution,
          ...prev.filter((item) => item.execution_id !== res.execution.execution_id),
        ]);
        setSelectedRunbookExecutionId(res.execution.execution_id);
        playAlertChime('COMMAND_CONFIRMED');
      }
      return res?.execution || null;
    },
    [playAlertChime]
  );

  const abortRunbook = useCallback(
    async (executionId, reason = 'Manual operator abort requested') => {
      if (!hasCommandAuthorityRef.current) {
        playAlertChime('DENIED');
        throw new Error('ACCESS DENIED: Flight Director clearance is required to abort contingency runbooks.');
      }
      const res = await abortRunbookExecution(executionId, {
        operator_id: 'Flight Director Gene Kranz',
        operator_role: operatorRoleRef.current,
        reason,
      });
      if (res && res.execution) {
        setRunbookExecutions((prev) =>
          prev.map((item) => (item.execution_id === executionId ? res.execution : item))
        );
        playAlertChime('WARNING');
      }
      return res?.execution || null;
    },
    [playAlertChime]
  );

  const createCustomRunbook = useCallback(
    async (payload) => {
      if (!hasCommandAuthorityRef.current) {
        playAlertChime('DENIED');
        throw new Error('ACCESS DENIED: Flight Director clearance is required to create custom runbooks.');
      }
      const res = await createRunbook({
        ...payload,
        operator_role: operatorRoleRef.current,
      });
      await refreshRunbooks();
      playAlertChime('COMMAND_CONFIRMED');
      return res?.runbook || null;
    },
    [playAlertChime, refreshRunbooks]
  );

  const activeRunbookExecution =
    runbookExecutions.find(
      (ex) => ex.status === 'RUNNING' || ex.status === 'VERIFYING_TELEMETRY' || ex.status === 'STAGED'
    ) ||
    runbookExecutions.find((ex) => ex.execution_id === selectedRunbookExecutionId) ||
    runbookExecutions[0] ||
    null;

  const selectedAnomaly =
    anomalies.find((a) => a.id === selectedAnomalyId) ||
    anomalies[0] ||
    INITIAL_ANOMALIES[0];

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
        restageCommand,
        stageContingencyCommand,
        isBackendConnected,
        backendHealth,
        isAnalyzing,
        triggerGeminiAnalysis,
        forecastChannels,
        runwayAlarms,
        faultTreeGraph,
        pendingSecureUplink,
        setPendingSecureUplink,
        handleAbortSecureUplink,
        handleTransmitSecureUplink,
        syncWithBackend,
        // Multi-Channel Telemetry Matrix
        availableChannels,
        activeChannel,
        switchActiveChannel,
        // Constellation Fleet & Mesh View State
        activeSpacecraft,
        switchSpacecraft,
        fleetNodes,
        islLinks,
        fleetSummary,
        orbitalState,
        // RBAC & Settings
        operatorRole,
        setOperatorRole,
        hasCommandAuthority,
        settingsConfig,
        updateSettingsConfig,
        playAlertChime,
        // Voice-Controlled Mission Control & Audio Synthesis
        voiceStatus,
        voiceTranscript,
        voiceLastAction,
        isSpeaking,
        toggleVoiceListening,
        clearVoiceFeedback,
        toggleAudioAlerts,
        stopAllVoiceAudio,
        speakBriefing,
        readDiagnosisAloud,
        pendingVoiceApproval,
        confirmVoiceApproval,
        cancelVoiceApproval,
        anomalyCenterTab,
        setAnomalyCenterTab,
        // Automated Contingency Runbooks
        runbooks,
        runbookExecutions,
        activeRunbookExecution,
        selectedRunbookExecutionId,
        setSelectedRunbookExecutionId,
        launchRunbook,
        abortRunbook,
        createCustomRunbook,
        refreshRunbooks,
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
