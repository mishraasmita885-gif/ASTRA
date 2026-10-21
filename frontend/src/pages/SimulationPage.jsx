import React, { useState, useEffect } from 'react';
import { useMission } from '../context/MissionContext';
import { fetchP3SimulationData } from '../services/api';
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
  Play,
  Pause,
  Layers,
  Search,
} from 'lucide-react';

export const SimulationPage = () => {
  const {
    isCrisis,
    telemetry,
    telemetryHistory,
    subsystems,
    triggerCrisis,
    resetToNominal,
    playNasaP3Stream,
    commands,
    approveCommand,
    rejectCommand,
    availableChannels,
    activeChannel,
    switchActiveChannel,
  } = useMission();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('nasa_p3');
  const [p3Data, setP3Data] = useState(null);
  const [p3StartIndex, setP3StartIndex] = useState(5200);
  const [channelFilter, setChannelFilter] = useState('');
  const [channelPrefix, setChannelPrefix] = useState('ALL');

  useEffect(() => {
    async function loadP3Window() {
      const data = await fetchP3SimulationData(5200, 1600);
      if (data) {
        setP3Data(data);
      }
    }
    loadP3Window();
  }, []);

  const scenarios = [
    {
      id: 'nasa_p3',
      name: 'NASA P-3 Dataset Replay (Event 5400 → 6656)',
      desc: 'Streams the actual NASA P-3 telemetry data from step 5200 into the change detector, demonstrating the exact 100% caught anomaly event with real step change (> 0.3889).',
      badge: 'OFFICIAL NASA VERIFICATION STREAM',
      isNasaReal: true,
    },
    {
      id: 'solar_strike',
      name: 'Solar Array Strike & EPS Bus Failure',
      desc: 'Simulates micro-meteoroid strike causing photovoltaic collapse to 0%, bus undervoltage to 11V, and core temperature spike to 85°C.',
      badge: 'SYNTHETIC CRISIS PROFILE',
      isNasaReal: false,
    },
    {
      id: 'battery_runaway',
      name: 'Li-Ion Battery Cell #3 Thermal Runaway',
      desc: 'Simulates internal cell short-circuit, rapid temperature elevation above 92°C, and accelerated voltage decay.',
      badge: 'CRITICAL',
      isNasaReal: false,
    },
  ];

  const handleStartSimulation = () => {
    setConfirmModalOpen(false);
    if (selectedScenario === 'nasa_p3') {
      playNasaP3Stream(p3StartIndex);
    } else if (selectedScenario === 'battery_runaway') {
      triggerCrisis('Li-Ion Battery Cell #3 Thermal Runaway', 'crisis_battery');
    } else {
      triggerCrisis('Solar Array Strike & EPS Bus Failure', 'crisis_solar');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#233446]" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              Flight Readiness & Telemetry Simulation Testbed
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Stream actual NASA P-3 telemetry or inject controlled hardware failure vectors into the backend pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCrisis || telemetry.mode === 'nasa_p3' ? (
            <button
              onClick={resetToNominal}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] border border-[#4a2e1b] font-mono text-xs font-bold uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#4a2e1b] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
              <span>Reset Nominal Stream</span>
            </button>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full bg-[#ebdccb] text-[#24140b] border border-[#4a2e1b] shadow-[1.5px_1.5px_0px_0px_#4a2e1b] text-xs font-mono font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              TESTBED ARMED & READY
            </span>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl p-6 bg-white border border-[#e6e1d7] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#161514]">
                  Confirm Telemetry Stream Injection
                </h3>
                <span className="font-mono text-xs text-[#736f68]">
                  Scenario: {scenarios.find((s) => s.id === selectedScenario)?.name}
                </span>
              </div>
            </div>

            <p className="text-xs font-mono text-[#161514] bg-amber-50 p-3.5 rounded-xl border border-amber-200 leading-relaxed">
              {selectedScenario === 'nasa_p3'
                ? `This will instruct the backend to begin streaming actual NASA P-3 test telemetry starting at step ${p3StartIndex}. When the stream reaches index 5400, the change detector will trigger (change > 0.3889) and maintain the anomaly event until 6656.`
                : `This will inject synthetic emergency telemetry (Solar: 0.0%, Bus: 11.0V, Temp: 85.0°C) into the live WebSocket pipeline and trigger safety interlocks.`}
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
                CONFIRM & START STREAM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SIMULATION CONTROL DECK */}
      <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-6">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#736f68] block mb-2">
            Select Telemetry Source / Failure Scenario
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario === sc.id;

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
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
                    <span className={sc.isNasaReal ? 'text-sky-700 font-bold' : 'text-amber-700 font-bold'}>
                      {sc.badge}
                    </span>
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

        {/* Selected Scenario Controls & Parameter Matrix */}
        {selectedScenario === 'nasa_p3' ? (
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-sky-950 uppercase flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-sky-700" />
                NASA P-3 Replay Parameters (Channel P-3, Feature 0)
              </span>
              <span className="text-sky-800 font-semibold">Event Target: 5400 → 6656</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white border border-sky-200">
                <span className="text-[10px] text-[#736f68] block">Starting Telemetry Index</span>
                <input
                  type="number"
                  value={p3StartIndex}
                  onChange={(e) => setP3StartIndex(Number(e.target.value))}
                  min={0}
                  max={8400}
                  className="text-lg font-bold text-sky-900 w-full outline-none"
                />
                <span className="text-[9px] text-sky-600 block">5200 is recommended</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-sky-200">
                <span className="text-[10px] text-[#736f68] block">Detector Threshold</span>
                <span className="text-lg font-bold text-sky-900">0.3889</span>
                <span className="text-[9px] text-[#94a3b8] block">99th Percentile Change</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-sky-200">
                <span className="text-[10px] text-[#736f68] block">Event Buffering</span>
                <span className="text-lg font-bold text-sky-900">±15 pts</span>
                <span className="text-[9px] text-[#94a3b8] block">Merge gap: 250 pts</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-sky-200">
                <span className="text-[10px] text-[#736f68] block">Human Sign-off</span>
                <span className="text-lg font-bold text-emerald-600">ENFORCED</span>
                <span className="text-[9px] text-[#94a3b8] block">No Auto-Execution</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[#161514] uppercase">
                Synthetic Telemetry Parameters (Preview)
              </span>
              <span className="text-[#736f68]">Standard Crisis Profile</span>
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
                <span className="text-[9px] text-[#94a3b8] block">Nominal: 10-30°C</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-[#736f68] block">ML Anomaly Score</span>
                <span className="text-lg font-bold text-purple-700">0.94</span>
                <span className="text-[9px] text-purple-600 block">Critical Breach</span>
              </div>
            </div>
          </div>
        )}

        {/* Arm and Inject Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 font-mono text-xs text-[#736f68]">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Active Mode: <strong className="text-[#161514]">{telemetry.mode || 'nominal'}</strong></span>
            {telemetry.step > 0 && <span>(Step: {telemetry.step})</span>}
          </div>

          <button
            onClick={() => setConfirmModalOpen(true)}
            className="px-6 py-2.5 rounded-full bg-[#fea619] hover:bg-[#fea619]/90 text-[#233446] font-display text-xs font-bold uppercase shadow-sm cursor-pointer transition-colors"
          >
            {selectedScenario === 'nasa_p3' ? 'Launch NASA P-3 Replay' : 'Arm & Inject Fault Scenario'}
          </button>
        </div>
      </div>

      {/* Feature 1: NASA Multi-Channel Telemetry Stream Ingestion Rack */}
      {(() => {
        const allChannels = availableChannels && availableChannels.length > 0
          ? availableChannels
          : ['P-3', 'A-1', 'A-2', 'B-1', 'C-1', 'C-2', 'D-1', 'E-1', 'T-1', 'S-1', 'M-1', 'P-1', 'P-2'];

        const sortedChannels = [
          'P-3',
          ...allChannels.filter((c) => c !== 'P-3').sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        ];

        const prefixes = ['ALL', 'P-3', ...Array.from(new Set(allChannels.map((c) => c.split('-')[0]))).filter((p) => p !== 'P').sort()];

        const filteredChannels = sortedChannels.filter((ch) => {
          const matchesQuery = ch.toLowerCase().includes(channelFilter.toLowerCase().trim());
          if (!matchesQuery) return false;
          if (channelPrefix === 'ALL') return true;
          if (channelPrefix === 'P-3') return ch === 'P-3';
          return ch.startsWith(`${channelPrefix}-`);
        });

        return (
          <div className="rounded-3xl p-6 bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[4px_4px_0px_0px_#4a2e1b] flex flex-col gap-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#4a2e1b]/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_#4a2e1b]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-[#24140b] uppercase">
                      NASA {availableChannels.length}-Channel Telemetry Ingestion Rack
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                      {availableChannels.length} CHANNELS ONLINE
                    </span>
                  </div>
                  <span className="text-xs text-[#73533e]">
                    Select any NASA SMAP/MSL channel stem from the test repository to stream telemetry into the change detector.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#24140b] font-bold">Active Stream:</span>
                <span className="px-3 py-1 rounded-xl bg-[#452a19] text-[#fbf7f0] font-bold text-xs border border-[#24140b] shadow-[2px_2px_0px_0px_#24140b]">
                  CHANNEL {activeChannel}
                </span>
              </div>
            </div>

            {/* Filter controls & family switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-[#73533e] font-bold uppercase tracking-wider pr-1">
                  Prefix:
                </span>
                {prefixes.map((pref) => {
                  const isPrefActive = channelPrefix === pref;
                  return (
                    <button
                      key={pref}
                      onClick={() => setChannelPrefix(pref)}
                      style={
                        isPrefActive
                          ? { backgroundColor: '#452a19', color: '#fbf7f0', borderColor: '#24140b' }
                          : { backgroundColor: '#fbf7f0', color: '#24140b', borderColor: '#4a2e1b' }
                      }
                      className={`channel-item channel-pill px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        isPrefActive ? 'channel-item-active shadow-xs' : 'channel-item-inactive hover:bg-[#dfcdb7]'
                      }`}
                    >
                      <span style={{ color: isPrefActive ? '#fbf7f0' : '#24140b' }}>
                        {pref === 'P-3' ? 'P-3 (BENCHMARK)' : pref}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#73533e]" />
                <input
                  type="text"
                  placeholder="Filter channel (e.g. P-3, T-1)..."
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs font-mono rounded-xl border border-[#4a2e1b] bg-white text-[#24140b] placeholder:text-[#8c827a] focus:outline-none focus:ring-1 focus:ring-[#452a19]"
                />
              </div>
            </div>

            {/* Channel Selection Grid */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-[#73533e] font-bold uppercase tracking-wider">
                <span>Showing {filteredChannels.length} of {sortedChannels.length} Channels:</span>
                {(channelFilter || channelPrefix !== 'ALL') && (
                  <button
                    onClick={() => { setChannelFilter(''); setChannelPrefix('ALL'); }}
                    className="underline hover:text-[#24140b] cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1 custom-scrollbar">
                {filteredChannels.length === 0 ? (
                  <div className="w-full py-6 text-center text-xs text-[#73533e]">
                    No channels match the filter "{channelFilter}".
                  </div>
                ) : (
                  filteredChannels.map((ch) => {
                    const isActive = ch === activeChannel;
                    return (
                      <button
                        key={ch}
                        onClick={() => switchActiveChannel(ch)}
                        style={
                          isActive
                            ? { backgroundColor: '#452a19', color: '#fbf7f0', borderColor: '#24140b' }
                            : { backgroundColor: '#fbf7f0', color: '#24140b', borderColor: '#4a2e1b' }
                        }
                        className={`channel-item channel-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 border-2 shadow-[2px_2px_0px_0px_#24140b] ${
                          isActive
                            ? 'channel-item-active'
                            : 'channel-item-inactive hover:bg-[#dfcdb7]'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full border border-[#24140b] ${
                            isActive ? 'bg-emerald-400 animate-pulse' : 'bg-[#73533e]'
                          }`}
                        />
                        <span
                          style={{ color: isActive ? '#fbf7f0' : '#24140b' }}
                          className="font-mono font-bold"
                        >
                          Channel {ch}
                        </span>
                        {ch === 'P-3' && (
                          <span
                            style={
                              isActive
                                ? { backgroundColor: '#fea619', color: '#1a0f07' }
                                : { backgroundColor: '#ebdccb', color: '#73533e' }
                            }
                            className="text-[9px] px-1 py-0.2 rounded font-bold border border-[#24140b]/30"
                          >
                            BENCHMARK
                          </span>
                        )}
                        {isActive && (
                          <span
                            style={{ color: '#fcd34d' }}
                            className="text-[9px] font-bold tracking-wider"
                          >
                            ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live P-3 Dataset Waveform Map */}
      {p3Data && p3Data.samples && (
        <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm text-[#161514] uppercase">
              NASA P-3 Benchmark Stream (Index 5200 → 6800)
            </span>
            <span className="text-xs text-sky-800 font-semibold">
              Ground Truth Labeled Event: [5400, 6656]
            </span>
          </div>

          <div className="h-28 w-full bg-slate-900 rounded-xl p-3 flex items-end gap-0.5 overflow-hidden relative">
            {/* Event region backdrop */}
            <div
              className="absolute top-0 bottom-0 bg-red-500/20 border-x border-red-500/50 pointer-events-none"
              style={{
                left: `${((5400 - 5200) / 1600) * 100}%`,
                width: `${((6656 - 5400) / 1600) * 100}%`,
              }}
            >
              <span className="text-[10px] text-red-400 font-mono px-1">NASA Anomaly [5400-6656]</span>
            </div>

            {/* Current playback cursor */}
            {telemetry.step >= 5200 && telemetry.step <= 6800 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                style={{
                  left: `${((telemetry.step - 5200) / 1600) * 100}%`,
                }}
              >
                <div className="text-[9px] bg-yellow-400 text-black px-1 rounded-xs -translate-x-1/2">
                  Step {telemetry.step}
                </div>
              </div>
            )}

            {p3Data.samples.filter((_, idx) => idx % 4 === 0).map((pt) => {
              const heightPct = Math.min(100, Math.max(5, (pt.value + 1.0) * 45));
              const isEvent = pt.is_event_range;
              return (
                <div
                  key={pt.index}
                  className={`flex-1 transition-all rounded-t-xs ${
                    isEvent ? 'bg-red-400' : 'bg-sky-500/60'
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`Step ${pt.index}: ${pt.value.toFixed(4)}`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#736f68] pt-1">
            <span>Step 5200</span>
            <span className="text-red-600 font-bold">5400 (Step Change Threshold Breached)</span>
            <span className="text-emerald-600 font-bold">6656 (Event Merge Window Resolved)</span>
            <span>Step 6800</span>
          </div>
        </div>
      )}
    </div>
  );
};
