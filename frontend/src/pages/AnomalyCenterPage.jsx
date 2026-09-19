import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
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
  Loader2,
  BarChart3,
  Info,
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
    isAnalyzing,
    triggerGeminiAnalysis,
  } = useMission();

  const [activeTab, setActiveTab] = useState('inspector'); // 'inspector' | 'benchmarks'

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'RESOLVED':
      case 'APPROVED':
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
            P-3 Telemetry Change Detector (Threshold: 0.3889) + Event Logic & Gemini Structured Reasoner
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-slate-100 p-0.5 border border-slate-200 text-xs font-mono">
            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                activeTab === 'inspector' ? 'bg-white shadow-xs text-[#161514]' : 'text-[#736f68]'
              }`}
            >
              Incident Inspector
            </button>
            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                activeTab === 'benchmarks' ? 'bg-white shadow-xs text-[#161514]' : 'text-[#736f68]'
              }`}
            >
              Model Benchmarks
            </button>
          </div>

          <button
            onClick={approveAllCommands}
            className="px-3 py-1 rounded-full bg-[#fea619] hover:bg-[#fea619]/90 text-[#233446] font-display text-xs font-bold uppercase shadow-xs transition-colors cursor-pointer"
          >
            Approve All Staged Commands
          </button>
        </div>
      </div>

      {activeTab === 'benchmarks' ? (
        /* BENCHMARK COMPARISON VIEW (Mandated by TL Handoff Section 4) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* P-3 Demonstration Results */}
          <div className="rounded-3xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-mono text-xs font-bold">
                P-3 Channel Demo
              </span>
              <span className="text-xs font-mono text-[#736f68]">Change Detection + Event Logic</span>
            </div>
            <h2 className="font-display font-bold text-xl text-[#161514]">
              P-3 Demonstration Performance
            </h2>
            <p className="text-xs font-mono text-[#736f68]">
              Evaluated specifically on channel P-3 test stream reproducing event 5400 → 6656.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-2 font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">Accuracy</span>
                <span className="text-xl font-bold text-emerald-600">96.70%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">Precision</span>
                <span className="text-xl font-bold text-emerald-600">99.91%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">Recall</span>
                <span className="text-xl font-bold text-[#161514]">79.12%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">F1 Score</span>
                <span className="text-xl font-bold text-purple-700">88.30%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center justify-between">
              <span>Event Detection Rate:</span>
              <span className="font-bold text-sm">100% (Event 5400→6656 caught)</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-mono text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> 96.70% is the P-3 demonstration result, not the overall system accuracy across all spacecraft channels.
              </span>
            </div>
          </div>

          {/* Overall 68-Channel NASA Benchmark */}
          <div className="rounded-3xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-mono text-xs font-bold">
                NASA Benchmark
              </span>
              <span className="text-xs font-mono text-[#736f68]">68 Channels / 87 Anomaly Events</span>
            </div>
            <h2 className="font-display font-bold text-xl text-[#161514]">
              Overall 68-Channel Benchmark
            </h2>
            <p className="text-xs font-mono text-[#736f68]">
              Comprehensive aerospace evaluation across diverse multi-channel telemetry streams.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-2 font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">Accuracy</span>
                <span className="text-xl font-bold text-[#161514]">80.39%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">Precision</span>
                <span className="text-xl font-bold text-[#161514]">24.11%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">Recall</span>
                <span className="text-xl font-bold text-[#161514]">33.80%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-[#736f68] uppercase block">F1 Score</span>
                <span className="text-xl font-bold text-purple-700">28.14%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs font-mono text-purple-900 flex items-center justify-between">
              <span>Event Detection Rate:</span>
              <span className="font-bold text-sm">81.61% (71 / 87 Events Detected)</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-[#736f68]">
              Evaluated against ground truth labels from the NASA telemetry anomaly benchmark (SMAP/MSL dataset).
            </div>
          </div>
        </div>
      ) : (
        /* 2-Column Main Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Anomaly Events Queue (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-sm text-[#161514] uppercase tracking-wider">
                Active Incident Queue ({anomalies.length})
              </span>
              <span className="text-xs font-mono text-[#736f68]">ML Event Log</span>
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
                        <span className="font-mono text-xs text-[#736f68]">{anm.id}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#736f68]">{anm.timestamp}</span>
                    </div>

                    <h3 className="font-display font-bold text-sm text-[#161514] leading-snug">
                      {anm.title}
                    </h3>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-mono">
                      <span className="text-[#736f68]">{anm.subsystem}</span>
                      <span className="font-semibold text-purple-700">Score: {anm.mlScore}</span>
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
                        selectedAnomaly?.severity
                      )}`}
                    >
                      {selectedAnomaly?.severity || 'HIGH'}
                    </span>
                    <span className="font-mono text-xs text-[#736f68]">{selectedAnomaly?.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#736f68]">
                      Detected: {selectedAnomaly?.detectedAt}
                    </span>
                    <button
                      onClick={() => triggerGeminiAnalysis(selectedAnomaly.id)}
                      disabled={isAnalyzing}
                      className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Gemini Reasoning...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Analyze with Gemini</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h2 className="font-display font-bold text-xl text-[#161514]">
                  {selectedAnomaly?.title}
                </h2>
                <p className="text-xs font-mono text-[#736f68] mt-1">{selectedAnomaly?.summary}</p>
              </div>

              {/* Dual-Curve Anomaly Waveform Visualizer */}
              <AnomalyWaveformChart
                history={telemetryHistory}
                isCrisis={isCrisis}
                selectedAnomaly={selectedAnomaly}
              />

              {/* Numerical Detector Evidence Matrix */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#736f68]">
                  Detector Evidence & Interlocks
                </span>
                <div className="flex flex-col gap-1.5">
                  {selectedAnomaly?.rulesTripped ? (
                    selectedAnomaly.rulesTripped.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50/60 border border-red-200 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="text-[#161514] font-medium">{rule.rule}</span>
                        </div>
                        <span className="font-bold text-red-700">TRIGGERED ({rule.actual})</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800">
                      No safety interlocks tripped for this event.
                    </div>
                  )}
                </div>
              </div>

              {/* Gemini Structured AI Reasoning */}
              {selectedAnomaly?.geminiDiagnosis && (
                <div className="rounded-xl p-4 bg-purple-50/60 border border-purple-200/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-display font-bold text-purple-900">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>{selectedAnomaly.geminiDiagnosis.model}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">
                      Confidence: {selectedAnomaly.mlConfidence}
                    </span>
                  </div>

                  <p className="text-xs text-[#161514] font-mono leading-relaxed bg-white/70 p-3 rounded-lg border border-purple-100">
                    {selectedAnomaly.geminiDiagnosis.rootCause}
                  </p>

                  {/* Empirical Evidence List */}
                  {selectedAnomaly.geminiDiagnosis.evidence && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-purple-800 font-bold">
                        Grounded Telemetry Evidence:
                      </span>
                      {selectedAnomaly.geminiDiagnosis.evidence.map((ev, i) => (
                        <div key={i} className="text-xs font-mono text-[#161514] flex items-start gap-1.5 pl-1">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safe-State Recommendation */}
                  {selectedAnomaly.geminiDiagnosis.recommendedAction && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900">
                      <span className="font-bold block mb-0.5">Recommended Procedure:</span>
                      {selectedAnomaly.geminiDiagnosis.recommendedAction}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-purple-200/60 text-[#736f68]">
                    <span>
                      Operator Sign-off Enforced:{' '}
                      <strong className="text-purple-900 font-bold">YES (Safety Rule 1.1)</strong>
                    </span>
                    <span>
                      Autonomous Execution:{' '}
                      <strong className="text-red-600 font-bold">PROHIBITED</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Recommended Operator Commands (Human-in-the-Loop) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#736f68]">
                    Human-in-the-Loop Operator Commands
                  </span>
                  <span className="text-[10px] font-mono text-red-600 font-bold">
                    * Autonomous command execution is prohibited
                  </span>
                </div>

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
                              {cmd.severity || 'CRITICAL'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#736f68] mt-0.5">{cmd.desc}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Approved & Uplinked
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
                                <Send className="w-3 h-3" /> Authorize Command
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
      )}
    </div>
  );
};
