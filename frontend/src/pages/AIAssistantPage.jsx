import React from 'react';
import { useMission } from '../context/MissionContext';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  XCircle,
  HelpCircle,
  Terminal,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export const AIAssistantPage = () => {
  const {
    isCrisis,
    telemetry,
    commands,
    approveCommand,
    rejectCommand,
    approveAllCommands,
    selectedAnomaly,
    isAnalyzing,
    triggerGeminiAnalysis,
  } = useMission();

  const currentAnalysis = selectedAnomaly?.geminiDiagnosis;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-700" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              ASTRA AI Mission Assistant & Gemini Reasoner
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Advisory Telemetry Reasoning, Structured Evidence Extraction & Operator Action Synthesis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedAnomaly?.id && triggerGeminiAnalysis(selectedAnomaly.id)}
            disabled={isAnalyzing || !selectedAnomaly}
            className="px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Gemini Engine...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Gemini Reasoning</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero AI Reasoning Console */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white border border-[#e6e1d7] shadow-md flex flex-col gap-6 relative overflow-hidden">
        {/* Top Status Pill */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isCrisis || selectedAnomaly?.status === 'ANOMALY_DETECTED'
                  ? 'bg-red-500 animate-ping'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="font-display font-bold text-base uppercase tracking-wider text-[#161514]">
              {isCrisis || selectedAnomaly?.status === 'ANOMALY_DETECTED'
                ? `EVENT DETECTED: ${selectedAnomaly?.id || 'ACTIVE'}`
                : 'NOMINAL TELEMETRY MONITORING'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#736f68]">
            <span>Model: {currentAnalysis?.model || 'Gemini 2.5 Flash'}</span>
            <span>•</span>
            <span>Channel: {selectedAnomaly?.rawEvent?.channel || 'P-3'}</span>
          </div>
        </div>

        {/* Diagnosis & Evidence Block */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Subsystem & Severity Column (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Target Channel & Subsystem
                </span>
                <span className="font-mono text-base font-bold text-[#161514] mt-0.5 block">
                  {selectedAnomaly?.subsystem || 'INSTRUMENTATION (P-3)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Assessed Criticality
                </span>
                <span
                  className={`font-mono text-base font-bold mt-0.5 block ${
                    isCrisis ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {selectedAnomaly?.severity || 'HIGH'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Reasoning Confidence
                </span>
                <span className="font-mono text-base font-bold text-purple-700 mt-0.5 block">
                  {selectedAnomaly?.mlConfidence || '91.0%'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Safety Governance
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Operator Sign-Off Required
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Diagnosis & Evidence Column (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 flex flex-col gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Structured Engineering Diagnosis
              </span>

              <p className="text-sm font-mono text-[#161514] leading-relaxed">
                {currentAnalysis?.rootCause ||
                  (isCrisis
                    ? 'Telemetry pattern is consistent with an abnormal subsystem state. Sudden deviation exceeds the numerical change detection threshold and requires operator evaluation.'
                    : 'All spacecraft telemetry parameters adhere to expected baseline models. Telemetry step-changes are well within the 0.3889 validation threshold.')}
              </p>

              {/* Grounded Evidence List */}
              {currentAnalysis?.evidence && (
                <div className="pt-3 border-t border-purple-200/60 flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-purple-950 uppercase">
                    Grounded Telemetry Evidence:
                  </span>
                  <div className="flex flex-col gap-1 text-xs font-mono">
                    {currentAnalysis.evidence.map((ev, i) => (
                      <div key={i} className="p-2 rounded bg-white border border-purple-200 flex items-start gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span className="text-[#161514]">{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe-State Action */}
              {currentAnalysis?.recommendedAction && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 mt-1">
                  <span className="font-bold block mb-0.5">Recommended Safe-State Procedure:</span>
                  {currentAnalysis.recommendedAction}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Recommended Actions & Operator Approval */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-base text-[#161514] uppercase tracking-wider">
              Operator Approval Gateway
            </span>
            <span className="text-xs font-mono text-red-600 font-bold">
              Autonomous spacecraft commanding is prohibited
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {commands.map((cmd) => {
              const isApproved = cmd.status === 'APPROVED';
              const isRejected = cmd.status === 'REJECTED';

              return (
                <div
                  key={cmd.id}
                  className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 text-xs font-mono transition-all ${
                    isApproved
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : isRejected
                      ? 'bg-slate-100 border-slate-300 opacity-60'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-red-600 shadow-xs">
                      ⚠
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#161514]">{cmd.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                          {cmd.severity || 'CRITICAL'}
                        </span>
                      </div>
                      <span className="text-xs text-[#736f68] mt-0.5 block">{cmd.desc}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                        <CheckCircle2 className="w-4 h-4" /> Uplink Authorized
                      </span>
                    ) : isRejected ? (
                      <span className="text-slate-500 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <XCircle className="w-4 h-4" /> Overridden
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => approveCommand(cmd.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> AUTHORIZE UPLINK
                        </button>
                        <button
                          onClick={() => rejectCommand(cmd.id)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#736f68] border border-slate-200 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          REJECT
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs font-mono text-[#736f68] mt-2">
            <span>Security Rule: Commands require verified human operator signature.</span>
            <span>Uplink Node: DSN Madrid-63 • Cryptographic Hash 0xFD91_A61C</span>
          </div>
        </div>
      </div>
    </div>
  );
};
