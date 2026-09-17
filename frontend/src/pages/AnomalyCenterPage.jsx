import React from 'react';
import { useMission } from '../context/MissionContext';
import { TelemetrySparkline } from '../components/TelemetrySparkline';
import { AnomalyWaveformChart } from '../components/AnomalyWaveformChart';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Zap,
  Sparkles,
  ArrowRight,
  Send,
  XCircle,
  FileSearch,
} from 'lucide-react';

export const AnomalyCenterPage = () => {
  const {
    anomalies,
    selectedAnomaly,
    selectedAnomalyId,
    setSelectedAnomalyId,
    commands,
    approveCommand,
    rejectCommand,
    approveAllCommands,
    telemetryHistory,
    isCrisis,
  } = useMission();

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#233446]" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              Anomaly Detection & Incident Matrix
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Real-time LSTM Autoencoder + Rule-Engine threshold monitoring and Gemini reasoning
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 text-xs font-mono font-bold">
            1 CRITICAL INCIDENT ACTIVE
          </span>
          <button
            onClick={approveAllCommands}
            className="px-3 py-1 rounded-full bg-[#fea619] hover:bg-[#fea619]/90 text-[#233446] font-display text-xs font-bold uppercase shadow-xs transition-colors cursor-pointer"
          >
            Approve All Staged Commands
          </button>
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Anomaly Events Queue (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm text-[#161514] uppercase tracking-wider">
              Incident Queue ({anomalies.length})
            </span>
            <span className="text-xs font-mono text-[#736f68]">Ranked by Severity</span>
          </div>

          <div className="flex flex-col gap-3">
            {anomalies.map((anm) => {
              const isSelected = selectedAnomalyId === anm.id;
              const isCrit = anm.severity === 'CRITICAL';

              return (
                <div
                  key={anm.id}
                  onClick={() => setSelectedAnomalyId(anm.id)}
                  className={`rounded-2xl p-4 bg-white border shadow-xs transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-[#233446] ring-2 ring-[#233446]/10'
                      : isCrit
                      ? 'border-red-300 hover:border-red-400'
                      : 'border-[#e6e1d7] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${getSeverityBadge(
                          anm.severity
                        )}`}
                      >
                        {anm.severity}
                      </span>
                      <span className="font-mono text-xs text-[#736f68]">{anm.number}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#736f68]">{anm.timestamp}</span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-[#161514] leading-snug">
                    {anm.title}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-mono">
                    <span className="text-[#736f68]">Subsystem: {anm.subsystem}</span>
                    <span className="font-semibold text-purple-700">ML: {anm.mlScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Anomaly Deep Inspector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-5">
            {/* Inspector Header */}
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold border ${getSeverityBadge(
                      selectedAnomaly.severity
                    )}`}
                  >
                    {selectedAnomaly.severity}
                  </span>
                  <span className="font-mono text-xs text-[#736f68]">{selectedAnomaly.id}</span>
                </div>
                <span className="font-mono text-xs text-[#736f68]">
                  Detected: {selectedAnomaly.detectedAt}
                </span>
              </div>

              <h2 className="font-display font-bold text-xl text-[#161514]">
                {selectedAnomaly.title}
              </h2>
              <p className="text-xs font-mono text-[#736f68] mt-1">{selectedAnomaly.summary}</p>
            </div>

            {/* Dual-Curve Anomaly Waveform Visualizer */}
            <AnomalyWaveformChart
              history={telemetryHistory}
              isCrisis={isCrisis}
              selectedAnomaly={selectedAnomaly}
            />

            {/* Hard Safety Rules Matrix */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#736f68]">
                Tripped Safety Interlocks
              </span>
              <div className="flex flex-col gap-1.5">
                {selectedAnomaly.rulesTripped ? (
                  selectedAnomaly.rulesTripped.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-red-50/60 border border-red-200 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="text-[#161514] font-medium">{rule.rule}</span>
                      </div>
                      <span className="font-bold text-red-700">TRIPPED ({rule.actual})</span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800">
                    No safety interlocks tripped for this event.
                  </div>
                )}
              </div>
            </div>

            {/* Gemini Root Cause Diagnosis */}
            {selectedAnomaly.geminiDiagnosis && (
              <div className="rounded-xl p-4 bg-purple-50/60 border border-purple-200/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-display font-bold text-purple-900">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Gemini AI Root Cause Assessment</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">
                    Confidence: {selectedAnomaly.mlConfidence}
                  </span>
                </div>

                <p className="text-xs text-[#161514] font-mono leading-relaxed">
                  {selectedAnomaly.geminiDiagnosis.rootCause}
                </p>

                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-purple-200/60 text-[#736f68]">
                  <span>
                    Survival Probability:{' '}
                    <strong className="text-red-600">
                      {selectedAnomaly.geminiDiagnosis.survivalProbability}%
                    </strong>
                  </span>
                  <span>
                    Time to Battery Exhaustion:{' '}
                    <strong className="text-red-600">
                      {selectedAnomaly.geminiDiagnosis.timeToExhaustion}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Recommended Operator Commands (Human-in-the-Loop) */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#736f68]">
                Recommended Actions (Operator Approval Required)
              </span>

              <div className="flex flex-col gap-2">
                {commands.map((cmd) => {
                  const isApproved = cmd.status === 'APPROVED';
                  const isRejected = cmd.status === 'REJECTED';

                  return (
                    <div
                      key={cmd.id}
                      className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-all ${
                        isApproved
                          ? 'bg-emerald-50/80 border-emerald-300'
                          : isRejected
                          ? 'bg-slate-100 border-slate-300 opacity-60'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#161514]">{cmd.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold">
                            {cmd.priority}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#736f68] mt-0.5">{cmd.desc}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isApproved ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Uplinked
                          </span>
                        ) : isRejected ? (
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Overridden
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => approveCommand(cmd.id)}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Send className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => rejectCommand(cmd.id)}
                              className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#736f68] font-medium text-xs cursor-pointer transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
