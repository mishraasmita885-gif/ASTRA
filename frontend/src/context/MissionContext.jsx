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
} from '../services/api';

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

  // Web Audio Alert Synthesizer
  const playAlertChime = useCallback((type = 'warning') => {
    if (!settingsConfig.audioAlertsEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  }, [settingsConfig.audioAlertsEnabled]);

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
            message: l.event,
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
            if (data.type === 'TELEMETRY_TICK' || data.type === 'CONNECTION_ESTABLISHED') {
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
              if (data.fleet_summary || tel.fleet_summary) {
                setFleetSummary(data.fleet_summary || tel.fleet_summary);
              }

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

  // Request Gemini Reasoning Analysis for an Event
  const triggerGeminiAnalysis = async (eventId) => {
    const targetId = eventId || selectedAnomalyId || (anomalies[0] && anomalies[0].id) || 'ASTRA-P3-0001';
    setIsAnalyzing(true);
    try {
      const res = await analyzeEvent(targetId);
      if (res && res.analysis) {
        setAnomalies((prev) => {
          const list = prev && prev.length > 0 ? prev : INITIAL_ANOMALIES;
          return list.map((anm) =>
            anm.id === targetId
              ? {
                  ...anm,
                  status: 'UNDER_REVIEW',
                  mlConfidence: `${Math.round(res.analysis.confidence * 100)}%`,
                  geminiDiagnosis: {
                    model: res.analysis.model_used || 'Google Gemini Mission Reasoner',
                    rootCause: res.analysis.diagnosis,
                    survivalProbability: res.analysis.survival_probability ?? (res.analysis.severity === 'CRITICAL' ? 68 : res.analysis.severity === 'HIGH' ? 82 : 95),
                    timeToExhaustion: res.analysis.time_to_exhaustion || (res.analysis.severity === 'CRITICAL' ? '12m 40s' : '36m 15s'),
                    evidence: res.analysis.evidence,
                    recommendedAction: res.analysis.recommendation,
                    operator_approval_required: res.analysis.operator_approval_required,
                  },
                }
              : anm
          );
        });
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

  // Human-in-the-Loop Operator Command Approval (Enforces RBAC)
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

    const updatedCommands = commands.map((cmd) => (cmd.id === commandId ? { ...cmd, status: 'APPROVED' } : cmd));
    setCommands(updatedCommands);

    setAnomalies((prev) =>
      prev.map((anm) =>
        anm.id === selectedAnomalyId
          ? {
              ...anm,
              status: 'RESOLVED',
              commands: (anm.commands || []).map((cmd) =>
                cmd.id === commandId ? { ...cmd, status: 'APPROVED' } : cmd
              ),
            }
          : anm
      )
    );

    // If attached to an anomaly event, record approval in backend
    const currentEvtId = selectedAnomalyId;
    if (currentEvtId) {
      try {
        await approveEvent(currentEvtId, true, 'Flight Director Gene Kranz', note || 'Procedure verified nominal.');
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
        message: `FLIGHT DIRECTOR APPROVED: [${commandId}]. Cryptographic signature verified. Uplink completed via DSN Madrid-63.`,
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
      },
      ...prev,
    ]);
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

  const approveAllCommands = async () => {
    if (!hasCommandAuthority) {
      alert("Access Denied: Flight Director clearance is required to authorize spacecraft commands.");
      return;
    }

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
        await approveEvent(selectedAnomalyId, true, 'Flight Director Gene Kranz', 'All staged contingency commands authorized.');
      } catch (err) {
        console.warn('Backend approve-all warning:', err);
      }
    }
    const now = new Date().toTimeString().split(' ')[0];
    setAuditLog((prev) => [
      {
        id: `evt_${Date.now()}`,
        time: now,
        type: 'OPERATOR_APPROVAL',
        message: `EMERGENCY CONTINGENCY SEQUENCE AUTHORIZED: All staged commands approved and transmitted via DSN Madrid-63.`,
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
        message: `SPACECRAFT RECOVERY CONFIRMED: Safe-state executed successfully. Telemetry returning to nominal envelope.`,
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

  const triggerCrisis = (scenarioName = 'Solar Array Strike & EPS Bus Failure', mode = 'crisis_solar') => {
    playAlertChime('critical');
    switchSimulationMode(mode, 0);
  };

  const resetToNominal = () => {
    switchSimulationMode('nominal', 0);
  };

  const playNasaP3Stream = (startIndex = 5300) => {
    switchSimulationMode('nasa_p3', startIndex);
  };

  const switchActiveChannel = useCallback(async (channel) => {
    const cleanCh = channel.trim().toUpperCase();
    setActiveChannel(cleanCh);
    try {
      await switchChannel(cleanCh);
    } catch (e) {
      console.warn('Switch channel API warning:', e);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'set_channel',
        channel: cleanCh,
      }));
    }
    setAuditLog((prev) => [
      {
        id: `evt_local_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: 'COMMAND_UPLINK',
        message: `STREAM RECONFIGURED: Switched telemetry ingestion engine to NASA channel ${cleanCh}.`,
      },
      ...prev,
    ]);
  }, []);

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
        isBackendConnected,
        backendHealth,
        isAnalyzing,
        triggerGeminiAnalysis,
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
        // RBAC & Settings
        operatorRole,
        setOperatorRole,
        hasCommandAuthority,
        settingsConfig,
        updateSettingsConfig,
        playAlertChime,
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
