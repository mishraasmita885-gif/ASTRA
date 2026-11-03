import React, { useEffect, useMemo } from 'react';
import { useMission } from '../context/MissionContext';
import {
  X,
  Zap,
  Thermometer,
  Radio,
  Cpu,
  Wind,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Activity,
  Sliders,
  Send,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

const SUBSYSTEM_ICONS = {
  EPS: Zap,
  TCS: Thermometer,
  ADCS: Wind,
  'TT&C': Radio,
  AVIONICS: Cpu,
};

const STATUS_BADGES = {
  CRITICAL: {
    bg: '#3b0000',
    border: '#ef4444',
    text: '#ef4444',
    label: 'CRITICAL THRESHOLD BREACH',
  },
  PROPAGATING: {
    bg: '#451a03',
    border: '#fea619',
    text: '#fea619',
    label: 'CASCADING FAILURE VECTOR',
  },
  WARNING: {
    bg: '#422006',
    border: '#fbbf24',
    text: '#fbbf24',
    label: 'DEGRADATION WARNING',
  },
  NOMINAL: {
    bg: '#064e3b',
    border: '#10b981',
    text: '#34d399',
    label: 'NOMINAL ENVELOPE',
  },
};

export const NodeInspectionModal = ({ node, onClose }) => {
  const {
    anomalies,
    telemetry,
    commands,
    approveCommand,
    triggerGeminiAnalysis,
    isAnalyzing,
    switchActiveChannel,
    setActiveTab,
    operatorRole,
  } = useMission();

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const SubIcon = SUBSYSTEM_ICONS[node.subsystem] || Cpu;
  const statusConfig = STATUS_BADGES[node.status] || STATUS_BADGES.NOMINAL;

  // Find relevant anomalies matching this node's channel or subsystem
  const relatedAnomalies = useMemo(() => {
    if (!anomalies || !anomalies.length) return [];
    return anomalies.filter((anom) => {
      const chMatch = anom.channel && node.channel && anom.channel.toLowerCase() === node.channel.toLowerCase();
      const subMatch = anom.subsystem && anom.subsystem.toLowerCase() === node.subsystem.toLowerCase();
      const p3Match = node.channel === 'p3' && anom.channel === 'P-3';
      return chMatch || subMatch || p3Match;
    });
  }, [anomalies, node]);

  // Find the primary anomaly (or most critical)
  const primaryAnomaly = relatedAnomalies[0] || null;

  // Staged commands applicable to this anomaly or subsystem
  const stagedCommands = useMemo(() => {
    if (!commands || !commands.length) return [];
    if (!primaryAnomaly) return [];
    return commands.filter((cmd) => cmd.anomaly_id === primaryAnomaly.id || cmd.subsystem === node.subsystem);
  }, [commands, primaryAnomaly, node]);

  const handleSwitchChannel = () => {
    if (node.channel) {
      const channelParam = node.channel === 'p3' ? 'P-3' : node.channel.toUpperCase();
      switchActiveChannel(channelParam);
      setActiveTab('telemetry');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Drawer */}
      <div
        className="relative w-full max-w-lg h-full overflow-y-auto flex flex-col z-10 transition-transform duration-300 ease-out"
        style={{
          background: '#ebdccb',
          borderLeft: '3px solid #452a19',
          boxShadow: '-6px 0 0px #452a19',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* Header Bar */}
        <div
          className="p-4 flex items-center justify-between border-b-2"
          style={{ background: '#f7f4ee', borderColor: '#452a19' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 border-2 shadow-[2px_2px_0_#452a19]"
              style={{ background: '#ebdccb', borderColor: '#452a19', color: '#452a19' }}
            >
              <SubIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7c5d42]">
                  SUBSYSTEM INSPECTION · {node.subsystem}
                </span>
              </div>
              <h2 className="text-base font-black text-[#452a19] uppercase tracking-tight">
                {node.label}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[#452a19] bg-[#ebdccb] hover:bg-[#fea619] text-[#452a19] shadow-[2px_2px_0_#452a19] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Close Drawer (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* Status Alert Banner */}
          <div
            className="p-3 border-2 flex items-center justify-between shadow-[2px_2px_0_#452a19]"
            style={{
              background: statusConfig.bg,
              borderColor: statusConfig.border,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block animate-ping"
                style={{ background: statusConfig.border }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: statusConfig.text }}
              >
                {statusConfig.label}
              </span>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 font-bold uppercase border"
              style={{
                color: statusConfig.text,
                borderColor: statusConfig.border,
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              STATUS: {node.status}
            </span>
          </div>

          {/* Telemetry Metric Spotlight */}
          <div
            className="p-4 border-2 bg-[#f7f4ee] border-[#452a19] shadow-[3px_3px_0_#452a19]"
          >
            <div className="text-[10px] font-bold text-[#7c5d42] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>LIVE SENSOR TELEMETRY</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Activity className="w-3 h-3" /> STREAM ACTIVE
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div className="text-3xl font-black text-[#452a19]">
                {node.live_value}
              </div>
              <div className="text-xs text-[#7c5d42] font-semibold">
                CHANNEL: <span className="text-[#452a19] font-bold">{node.channel?.toUpperCase()}</span>
              </div>
            </div>

            {/* Threshold limits bar */}
            {node.threshold && (
              <div className="mt-4 pt-3 border-t border-[#452a19]/30 text-xs space-y-1">
                <div className="text-[10px] font-bold text-[#7c5d42] uppercase mb-1">
                  ENGINEERING THRESHOLDS
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#ebdccb] p-1.5 border border-[#452a19]">
                    <span className="text-[#7c5d42] block text-[9px] uppercase">CRITICAL LIMIT</span>
                    <span className="font-bold text-red-700">
                      {node.threshold.critical_high !== null && node.threshold.critical_high !== undefined
                        ? `>${node.threshold.critical_high}${node.threshold.unit}`
                        : node.threshold.critical_low !== null && node.threshold.critical_low !== undefined
                        ? `<${node.threshold.critical_low}${node.threshold.unit}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-[#ebdccb] p-1.5 border border-[#452a19]">
                    <span className="text-[#7c5d42] block text-[9px] uppercase">WARNING LIMIT</span>
                    <span className="font-bold text-amber-700">
                      {node.threshold.warning_high !== null && node.threshold.warning_high !== undefined
                        ? `>${node.threshold.warning_high}${node.threshold.unit}`
                        : node.threshold.warning_low !== null && node.threshold.warning_low !== undefined
                        ? `<${node.threshold.warning_low}${node.threshold.unit}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Node Description & Architecture */}
          <div className="p-4 border-2 bg-[#f7f4ee] border-[#452a19] shadow-[2px_2px_0_#452a19]">
            <div className="text-[10px] font-bold text-[#7c5d42] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> SUBSYSTEM ARCHITECTURE & SPEC
            </div>
            <p className="text-xs text-[#452a19] leading-relaxed">
              {node.description}
            </p>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-[#7c5d42]">
              <span>LAYER: <strong className="text-[#452a19]">L{node.layer}</strong></span>
              <span>·</span>
              <span>TOPOLOGY ID: <strong className="text-[#452a19]">{node.id}</strong></span>
            </div>
          </div>

          {/* Gemini AI Diagnostic Findings */}
          <div className="p-4 border-2 bg-[#f7f4ee] border-[#452a19] shadow-[2px_2px_0_#452a19]">
            <div className="text-[10px] font-bold text-[#7c5d42] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-900 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-purple-700" /> GEMINI AI DIAGNOSTICS
              </span>
              {primaryAnomaly?.gemini_analysis && (
                <span className="text-[9px] px-1.5 py-0.2 bg-purple-200 border border-purple-800 text-purple-900 font-bold">
                  DIAGNOSED
                </span>
              )}
            </div>

            {primaryAnomaly?.gemini_analysis ? (
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-purple-50 border border-purple-300 text-[#452a19]">
                  <p className="font-semibold text-purple-950">
                    {primaryAnomaly.gemini_analysis.diagnosis || primaryAnomaly.gemini_analysis.root_cause || 'Subsystem anomaly detected with downstream cascading vectors.'}
                  </p>
                  {primaryAnomaly.gemini_analysis.recommended_action && (
                    <div className="mt-2 text-[11px] text-purple-900">
                      <strong>Recommended Countermeasure:</strong> {primaryAnomaly.gemini_analysis.recommended_action}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#7c5d42] space-y-2">
                <p>No active Gemini reasoning diagnostic attached to this subsystem node yet.</p>
                {primaryAnomaly && (
                  <button
                    onClick={() => triggerGeminiAnalysis(primaryAnomaly.id)}
                    disabled={isAnalyzing}
                    className="w-full py-2 px-3 border-2 border-[#452a19] bg-[#fea619] hover:bg-[#e59414] text-[#452a19] font-bold text-xs uppercase shadow-[2px_2px_0_#452a19] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAnalyzing ? 'REASONING ACROSS TELEMETRY...' : 'TRIGGER GEMINI REASONER'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Staged Uplink Procedures & Emergency Actions */}
          <div className="p-4 border-2 bg-[#f7f4ee] border-[#452a19] shadow-[2px_2px_0_#452a19]">
            <div className="text-[10px] font-bold text-[#7c5d42] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> STAGED COMMAND UPLINKS & ACTIONS
            </div>

            {stagedCommands.length > 0 ? (
              <div className="space-y-2">
                {stagedCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-2 border border-[#452a19] bg-[#ebdccb] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#452a19] block">{cmd.command_name || cmd.action}</span>
                      <span className="text-[10px] text-[#7c5d42]">{cmd.status || 'STAGED FOR TRANSMISSION'}</span>
                    </div>
                    {cmd.status !== 'APPROVED' && (
                      <button
                        onClick={() => approveCommand(cmd.id)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] border border-[#452a19] shadow-[1px_1px_0_#452a19] cursor-pointer"
                      >
                        AUTHORIZE
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#7c5d42]">
                <p>No staged command actions pending for {node.label}.</p>
              </div>
            )}

            {/* Quick Channel Jump Button */}
            <div className="mt-3 pt-3 border-t border-[#452a19]/20 flex gap-2">
              <button
                onClick={handleSwitchChannel}
                className="flex-1 py-1.5 px-2 border-2 border-[#452a19] bg-[#ebdccb] hover:bg-[#fea619] text-[#452a19] font-bold text-xs uppercase shadow-[2px_2px_0_#452a19] flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <Activity className="w-3.5 h-3.5" />
                Inspect Live Waveforms
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 border-t-2 flex items-center justify-between text-[10px] text-[#7c5d42]"
          style={{ background: '#f7f4ee', borderColor: '#452a19' }}
        >
          <span>ASTRA FAULT TREE DIAGNOSTIC ENGINE</span>
          <span className="font-bold text-[#452a19]">ROLE: {operatorRole}</span>
        </div>
      </div>
    </div>
  );
};
