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
} from 'lucide-react';

export const AIAssistantPage = () => {
  const { isCrisis, telemetry, commands, approveCommand, rejectCommand, approveAllCommands } =
    useMission();

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-700" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              ASTRA AI Mission Assistant & Gemini Copilot
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Autonomous Multimodal Telemetry Reasoning, Diagnostics & Ground Command Synthesis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Gemini 1.5 Diagnostic Active
          </span>
        </div>
      </div>

      {/* Hero AI Reasoning Console (Page 5 & 12_13_ai_mission_assistant.md) */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white border border-[#e6e1d7] shadow-md flex flex-col gap-6 relative overflow-hidden">
        {/* Top Status Pill */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isCrisis ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span className="font-display font-bold text-base uppercase tracking-wider text-[#161514]">
              {isCrisis ? 'CRITICAL EVENT DETECTED' : 'NOMINAL FLIGHT MONITORING'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#736f68]">
            <span>Inference Latency: 182ms</span>
            <span>•</span>
            <span>Reasoning Depth: Level 6</span>
          </div>
        </div>

        {/* Diagnosis & Evidence Block */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Subsystem & Severity Column (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Affected Subsystem
                </span>
                <span className="font-mono text-base font-bold text-[#161514] mt-0.5 block">
                  {isCrisis ? 'POWER / THERMAL' : 'ALL NOMINAL'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Criticality Level
                </span>
                <span
                  className={`font-mono text-base font-bold mt-0.5 block ${
                    isCrisis ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {isCrisis ? 'CRITICAL (Tier 1)' : 'NOMINAL'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Decision Confidence
                </span>
                <span className="font-mono text-base font-bold text-purple-700 mt-0.5 block">
                  {isCrisis ? '91.4%' : '99.4%'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Survival Probability
                </span>
                <span
                  className={`font-mono text-xl font-bold mt-0.5 block ${
                    isCrisis ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {isCrisis ? '72% (Degrading)' : '100%'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Diagnosis & Evidence Column (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 flex flex-col gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Autonomous Diagnosis
              </span>

              <p className="text-sm font-mono text-[#161514] leading-relaxed">
                {!isCrisis ? (
                  'All spacecraft telemetry parameters adhere to expected solar orbit models. Secondary power generation is operating in balanced float mode. Thermal radiance is uniform.'
                ) : (
                  'Telemetry indicates a simultaneous reduction in solar input and spacecraft bus voltage accompanied by abnormal core temperature increase. High correlation with physical impact on Photovoltaic Array Wing #1 or Primary Shunt Limiter catastrophic short.'
                )}
              </p>

              {/* Evidence Points (from Guide Section 12) */}
              {isCrisis && (
                <div className="pt-3 border-t border-purple-200/60 flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-purple-950 uppercase">
                    Empirical Telemetry Evidence:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-white border border-purple-200 flex items-center justify-between">
                      <span>Solar Input:</span>
                      <strong className="text-red-600">→ 0%</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-purple-200 flex items-center justify-between">
                      <span>Voltage:</span>
                      <strong className="text-red-600">→ 11V</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-purple-200 flex items-center justify-between">
                      <span>Core Temp:</span>
                      <strong className="text-red-600">→ 85°C</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 13: Recommended Actions & Operator Approval */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-base text-[#161514] uppercase tracking-wider">
              Recommended Recovery Actions
            </span>
            <span className="text-xs font-mono text-[#736f68]">
              Human-in-the-Loop Governance Active
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
                          {cmd.priority}
                        </span>
                      </div>
                      <span className="text-xs text-[#736f68] mt-0.5 block">{cmd.desc}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                        <CheckCircle2 className="w-4 h-4" /> Uplink Executed
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
                          <Send className="w-3.5 h-3.5" /> APPROVE COMMAND
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
            <span>Security Interlock: HMAC Cryptographic Key 0xFD91_A61C</span>
            <span>DSN Station Madrid • Two-Stage Uplink Handshake</span>
          </div>
        </div>
      </div>
    </div>
  );
};
