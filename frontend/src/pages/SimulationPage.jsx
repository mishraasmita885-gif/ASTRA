import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import { TelemetrySparkline } from '../components/TelemetrySparkline';
import {
  FlaskConical,
  Zap,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  Send,
  XCircle,
  HelpCircle,
  Radio,
} from 'lucide-react';

export const SimulationPage = () => {
  const {
    isCrisis,
    telemetry,
    telemetryHistory,
    subsystems,
    triggerCrisis,
    resetToNominal,
    commands,
    approveCommand,
    rejectCommand,
  } = useMission();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('solar_strike');

  const scenarios = [
    {
      id: 'solar_strike',
      name: 'Solar Array Strike & EPS Bus Failure',
      desc: 'Simulates micro-meteoroid strike causing photovoltaic collapse to 0%, bus undervoltage to 11V, and core temperature spike to 85°C.',
      badge: 'RECOMMENDED FOR HACKATHON DEMO',
    },
    {
      id: 'battery_runaway',
      name: 'Li-Ion Battery Cell #3 Thermal Runaway',
      desc: 'Simulates internal cell short-circuit, rapid temperature elevation above 92°C, and accelerated voltage decay.',
      badge: 'CRITICAL',
    },
    {
      id: 'adcs_loss',
      name: 'ADCS Reaction Wheel #2 Gyro Desaturation',
      desc: 'Simulates flywheel bearing drag, attitude drift exceeding 0.45°/hr, and loss of fine Sun-pointing lock.',
      badge: 'HIGH',
    },
  ];

  const handleStartSimulation = () => {
    setConfirmModalOpen(false);
    triggerCrisis(scenarios.find((s) => s.id === selectedScenario)?.name);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#233446]" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              Flight Readiness & Crisis Simulation Testbed
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Inject controlled hardware anomaly vectors into the live WebSocket telemetry pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCrisis ? (
            <button
              onClick={resetToNominal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nominal Baseline</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              TESTBED ARMED & STANDBY
            </span>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL (Page 8 Specification) */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl p-6 bg-white border border-[#e6e1d7] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#161514]">
                  ⚠ Confirm Crisis Simulation Injection
                </h3>
                <span className="font-mono text-xs text-[#736f68]">
                  Scenario: {scenarios.find((s) => s.id === selectedScenario)?.name}
                </span>
              </div>
            </div>

            <p className="text-xs font-mono text-[#161514] bg-amber-50 p-3.5 rounded-xl border border-amber-200 leading-relaxed">
              This action will inject abnormal telemetry (Solar: 0.0%, Bus: 11.0V, Temp: 85.0°C) into the
              live WebSocket pipeline, trip 3 automated safety interlocks, and invoke Gemini Copilot
              emergency reasoning.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-semibold text-[#736f68] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleStartSimulation}
                className="px-5 py-2 rounded-xl bg-[#fea619] hover:bg-[#fea619]/90 text-[#233446] font-display text-xs font-bold uppercase shadow-sm cursor-pointer"
              >
                CONFIRM & INJECT CRISIS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SIMULATION CONTROL DECK (Page 8) */}
      <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-6">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#736f68] block mb-1">
            Step 1: Select Failure Scenario
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario === sc.id;

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#233446] bg-slate-50 ring-2 ring-[#233446]/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-display font-bold text-sm text-[#161514]">{sc.name}</span>
                    </div>
                    <p className="text-[11px] font-mono text-[#736f68] leading-relaxed">{sc.desc}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-amber-700 font-bold">{sc.badge}</span>
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => setSelectedScenario(sc.id)}
                      className="accent-[#233446]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Fault Injection Parameter Matrix */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#161514] uppercase">
              Injected Telemetry Channels (Preview)
            </span>
            <span className="text-[#736f68]">Standard Demo Crisis Profile</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-[#736f68] block">Injected Solar Input</span>
              <span className="text-lg font-bold text-red-600">0.0 %</span>
              <span className="text-[9px] text-[#94a3b8] block">Baseline: 96.4%</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-[#736f68] block">Injected Bus Voltage</span>
              <span className="text-lg font-bold text-red-600">11.0 V</span>
              <span className="text-[9px] text-[#94a3b8] block">Cutoff: &lt;18.0V</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-[#736f68] block">Injected Core Temp</span>
              <span className="text-lg font-bold text-red-600">85.0 °C</span>
              <span className="text-[9px] text-[#94a3b8] block">Limit: &gt;60.0°C</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-[#736f68] block">Injected Battery SoC</span>
              <span className="text-lg font-bold text-amber-600">82.0 %</span>
              <span className="text-[9px] text-[#94a3b8] block">Discharge: -18.4A</span>
            </div>
          </div>
        </div>

        {/* Step 3: Big Trigger Button */}
        <div>
          {!isCrisis ? (
            <button
              onClick={() => setConfirmModalOpen(true)}
              className="w-full py-4 rounded-xl bg-linear-to-r from-[#fea619] to-amber-500 hover:brightness-105 text-[#233446] font-display font-bold text-sm uppercase tracking-wider shadow-md transition-all transform active:scale-99 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-[#233446]" />
              <span>⚡ INITIATE CRISIS SCENARIO (SIMULATE STRIKE)</span>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-red-600 animate-pulse" />
                <span className="font-display font-bold text-sm text-red-900">
                  CRISIS SIMULATION CURRENTLY RUNNING ON LIVE TELEMETRY BUS
                </span>
              </div>
              <button
                onClick={resetToNominal}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold cursor-pointer"
              >
                Reset Nominal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BEFORE VS AFTER LIVE COCKPIT COMPARISON (Section 11 Guide) */}
      <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="font-display font-bold text-lg text-[#161514]">
            Live Operational State (Nominal vs Crisis)
          </h2>
          <span className="text-xs font-mono text-[#736f68]">
            Demonstrates immediate UI responsiveness when telemetry anomalies occur
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Pre-Crisis Nominal Baseline */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-sm text-[#161514]">
                  Normal Flight Baseline
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  🟢 NOMINAL
                </span>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs text-[#736f68]">
                <div className="flex justify-between">
                  <span>Core Temperature:</span>
                  <strong className="text-[#161514]">15.2 °C</strong>
                </div>
                <div className="flex justify-between">
                  <span>Main Bus Voltage:</span>
                  <strong className="text-[#161514]">24.1 V</strong>
                </div>
                <div className="flex justify-between">
                  <span>Li-Ion Battery:</span>
                  <strong className="text-[#161514]">98.4 %</strong>
                </div>
                <div className="flex justify-between">
                  <span>Solar Array Input:</span>
                  <strong className="text-[#161514]">96.4 %</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs font-mono text-emerald-800 mt-4">
              ✓ All 4 subsystems verified nominal
            </div>
          </div>

          {/* Box 2: Injected Crisis Active State */}
          <div
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isCrisis ? 'bg-red-50/50 border-red-300' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-sm text-[#161514]">
                  Post-Injection Crisis Cockpit
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isCrisis
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCrisis ? '🔴 CRITICAL EVENT' : 'STANDBY'}
                </span>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-[#736f68]">Core Temperature:</span>
                  <strong className={isCrisis ? 'text-red-600' : 'text-[#161514]'}>
                    {isCrisis ? '85.0 °C ▲ (+69.8°C)' : '85.0 °C (Standby)'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#736f68]">Main Bus Voltage:</span>
                  <strong className={isCrisis ? 'text-red-600' : 'text-[#161514]'}>
                    {isCrisis ? '11.0 V ▼ (-13.1V)' : '11.0 V (Standby)'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#736f68]">Li-Ion Battery:</span>
                  <strong className={isCrisis ? 'text-amber-600' : 'text-[#161514]'}>
                    {isCrisis ? '82.0 % (Discharge)' : '82.0 %'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#736f68]">Solar Array Input:</span>
                  <strong className={isCrisis ? 'text-red-600' : 'text-[#161514]'}>
                    {isCrisis ? '0.0 % ▼ (Collapsed)' : '0.0 %'}
                  </strong>
                </div>
              </div>
            </div>

            <div
              className={`pt-3 border-t text-xs font-mono mt-4 ${
                isCrisis ? 'border-red-200 text-red-800 font-bold' : 'border-slate-200 text-slate-500'
              }`}
            >
              {isCrisis
                ? '⚠ POWER: CRITICAL • THERMAL: WARNING • 3 RULES TRIPPED'
                : 'Awaiting scenario initiation'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
