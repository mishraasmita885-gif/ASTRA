import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Settings,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Key,
  Shield,
  RotateCcw,
  Save,
  CheckCircle2,
  Radio,
  Cpu,
  Layers,
  AlertTriangle,
  Play,
} from 'lucide-react';

export const SettingsPage = () => {
  const {
    settingsConfig,
    updateSettingsConfig,
    playAlertChime,
    operatorRole,
    setOperatorRole,
    hasCommandAuthority,
    availableChannels,
    activeChannel,
    switchActiveChannel,
  } = useMission();

  const [formState, setFormState] = useState({ ...settingsConfig });
  const [apiKeyInput, setApiKeyInput] = useState(settingsConfig.customApiKey || '');
  const [saveBanner, setSaveBanner] = useState(false);

  const modelOptions = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      tag: 'RECOMMENDED (LOWEST LATENCY)',
      desc: 'Sub-second structured telemetry extraction & aerospace flight rule synthesis.',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      tag: 'DEEP LOGICAL REASONING',
      desc: 'Extensive multi-orbit temporal horizon reasoning and cross-subsystem root cause inference.',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      tag: 'NEXT-GEN MULTI-MODAL',
      desc: 'High-throughput stream processing with synchronized telemetry spectrogram analysis.',
    },
  ];

  const handleSave = (e) => {
    e?.preventDefault();
    updateSettingsConfig({
      ...formState,
      customApiKey: apiKeyInput.trim(),
    });
    setSaveBanner(true);
    playAlertChime('success');
    setTimeout(() => setSaveBanner(false), 3500);
  };

  const handleResetDefaults = () => {
    const defaults = {
      geminiModel: 'gemini-2.5-flash',
      customApiKey: '',
      detectionThreshold: 0.3889,
      wsBroadcastInterval: 1.2,
      audioAlertsEnabled: true,
    };
    setFormState(defaults);
    setApiKeyInput('');
    updateSettingsConfig(defaults);
    setSaveBanner(true);
    playAlertChime('warning');
    setTimeout(() => setSaveBanner(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#452a19] text-[#fbf7f0] flex items-center justify-center font-bold border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b]">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="font-display font-bold text-2xl text-[#24140b]">
              Flight Controller Settings & Avionics Configuration
            </h1>
          </div>
          <p className="text-xs font-mono text-[#73533e] mt-1">
            Tune neural reasoner models, change-detection thresholds, real-time broadcast intervals, and audio alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#ebdccb] text-[#4a2e1b] border-2 border-[#4a2e1b] shadow-[2px_2px_0px_0px_#4a2e1b] font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#452a19] hover:bg-[#5c3822] text-[#fbf7f0] border-2 border-[#24140b] shadow-[3px_3px_0px_0px_#24140b] font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-600 shadow-sm flex items-center gap-3 text-xs font-mono text-emerald-950 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold uppercase tracking-wide">Configuration Persisted</span>
            <span className="text-emerald-800 text-[11px]">
              Settings synced to local mission storage and propagated to live telemetry streams.
            </span>
          </div>
        </div>
      )}

      {/* Grid: 2-Column Setting Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Gemini Reasoning Engine Selection */}
        <div className="p-6 rounded-3xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[4px_4px_0px_0px_#4a2e1b] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-[#4a2e1b]/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <h2 className="font-display font-bold text-base text-[#24140b]">
                Google Gemini Model Selection
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold">
              AI ENGINE
            </span>
          </div>

          <p className="text-xs font-mono text-[#73533e]">
            Select the LLM instance utilized by ASTRA Copilot and the structured anomaly diagnosis engine.
          </p>

          <div className="flex flex-col gap-2.5">
            {modelOptions.map((opt) => {
              const isSelected = formState.geminiModel === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setFormState((prev) => ({ ...prev, geminiModel: opt.id }))}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#452a19] text-[#fbf7f0] border-[#24140b] shadow-[2px_2px_0px_0px_#24140b]'
                      : 'bg-white text-[#24140b] border-[#4a2e1b]/30 hover:border-[#4a2e1b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{opt.name}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.2 rounded-full font-bold ${
                          isSelected
                            ? 'bg-amber-400 text-black'
                            : 'bg-[#ebdccb] text-[#24140b]'
                        }`}
                      >
                        {opt.tag}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-[11px] font-sans mt-1 leading-snug ${
                      isSelected ? 'text-[#d5bfae]' : 'text-[#73533e]'
                    }`}
                  >
                    {opt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Custom API Key Override */}
          <div className="mt-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-[#4a2e1b] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#73533e]" />
              <span>Gemini API Key Override (Optional)</span>
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Leave empty to use backend environment GEMINI_API_KEY"
              className="px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#4a2e1b] text-xs font-mono text-[#24140b] placeholder:text-[#8c827a] outline-none focus:ring-2 focus:ring-purple-600"
            />
            <span className="text-[10px] font-mono text-[#73533e]">
              Keys are stored securely in local browser session context.
            </span>
          </div>
        </div>

        {/* Card 2: ML Detector Threshold & Telemetry Calibration */}
        <div className="p-6 rounded-3xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[4px_4px_0px_0px_#4a2e1b] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-[#4a2e1b]/20 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#c25e2e]" />
              <h2 className="font-display font-bold text-base text-[#24140b]">
                P-3 ML Threshold & Calibration
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
              DETECTOR TUNING
            </span>
          </div>

          <p className="text-xs font-mono text-[#73533e]">
            Fine-tune the mathematical change detection sensitivity for NASA channel {activeChannel}. Lower values increase trigger sensitivity; higher values suppress noise.
          </p>

          {/* Threshold Slider */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-[#4a2e1b]/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#24140b]">
                Change Detection Threshold:
              </span>
              <span className="text-sm font-mono font-extrabold text-[#c25e2e] bg-[#ebdccb] px-2 py-0.5 rounded border border-[#24140b]">
                {Number(formState.detectionThreshold).toFixed(4)}
              </span>
            </div>

            <input
              type="range"
              min="0.1000"
              max="0.8000"
              step="0.0050"
              value={formState.detectionThreshold}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  detectionThreshold: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-[#c25e2e] cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-[#73533e]">
              <span>0.1000 (Sensitive)</span>
              <span>NASA Benchmark (0.3889)</span>
              <span>0.8000 (Conservative)</span>
            </div>
          </div>

          {/* WebSocket Broadcast Interval */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-[#4a2e1b]/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#24140b]">
                WebSocket Streaming Cadence:
              </span>
              <span className="text-sm font-mono font-extrabold text-purple-700 bg-[#ebdccb] px-2 py-0.5 rounded border border-[#24140b]">
                {Number(formState.wsBroadcastInterval).toFixed(1)}s / frame
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={formState.wsBroadcastInterval}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  wsBroadcastInterval: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-purple-700 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-[#73533e]">
              <span>0.5s (High-Frequency)</span>
              <span>Default (1.2s)</span>
              <span>3.0s (Bandwidth Saver)</span>
            </div>
          </div>

          {/* Audio Alert Toggle */}
          <div className="p-4 rounded-2xl bg-white border border-[#4a2e1b]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ebdccb] text-[#24140b] flex items-center justify-center font-bold">
                {formState.audioAlertsEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-700" />
                ) : (
                  <VolumeX className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div>
                <span className="font-bold text-xs text-[#24140b] block">
                  Acoustic Flight Warnings
                </span>
                <span className="text-[11px] font-mono text-[#73533e]">
                  Web Audio synthesizers chime on anomaly breaches and command uplinks.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playAlertChime('warning')}
                className="px-2.5 py-1 rounded-lg bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] font-mono text-[10px] font-bold border border-[#24140b] flex items-center gap-1 cursor-pointer"
                title="Test Alert Chime"
              >
                <Play className="w-3 h-3" />
                <span>Test</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormState((prev) => ({
                    ...prev,
                    audioAlertsEnabled: !prev.audioAlertsEnabled,
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border border-[#24140b] ${
                  formState.audioAlertsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    formState.audioAlertsEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: RBAC Clearance Status & Channel Switcher */}
      <div className="p-6 rounded-3xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[4px_4px_0px_0px_#4a2e1b] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-2 border-[#4a2e1b]/20 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <h2 className="font-display font-bold text-base text-[#24140b]">
              Access Control & Active NASA Channel Configuration
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
            SECURITY ENFORCEMENT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#4a2e1b]/20 flex flex-col gap-2">
            <span className="font-bold text-xs text-[#24140b]">
              Current Operator Role:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-[#452a19] text-[#fbf7f0] border border-[#24140b]">
                {operatorRole === 'FLIGHT_DIRECTOR' ? 'Flight Director (Full Authority)' : 'Telemetry Observer (Read-Only)'}
              </span>
              <button
                onClick={() =>
                  setOperatorRole(
                    operatorRole === 'FLIGHT_DIRECTOR' ? 'TELEMETRY_OBSERVER' : 'FLIGHT_DIRECTOR'
                  )
                }
                className="px-3 py-1 rounded-xl bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] font-mono text-xs font-bold border border-[#24140b] cursor-pointer"
              >
                Switch Role
              </button>
            </div>
            <span className="text-[11px] font-mono text-[#73533e] mt-1">
              Flight Director clearance allows authorizing contingency uplinks and injecting simulations. Observers operate strictly read-only.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#4a2e1b]/20 flex flex-col gap-2">
            <span className="font-bold text-xs text-[#24140b]">
              Ingestion Stream Channel:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={activeChannel}
                onChange={(e) => switchActiveChannel(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#ebdccb] border border-[#24140b] font-mono text-xs font-bold text-[#24140b] outline-none cursor-pointer"
              >
                {availableChannels.map((ch) => (
                  <option key={ch} value={ch}>
                    NASA Channel {ch}
                  </option>
                ))}
              </select>
              <span className="text-[11px] font-mono text-purple-800 font-bold">
                Live streaming active
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#73533e] mt-1">
              Currently ingesting live samples from NASA MSL/SMAP test archive.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
