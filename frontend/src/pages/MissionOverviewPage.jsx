import React from 'react';
import { useMission } from '../context/MissionContext';
import { TelemetrySparkline } from '../components/TelemetrySparkline';
import { TelemetryMetricCard } from '../components/TelemetryMetricCard';
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Thermometer,
  Zap,
  BatteryCharging,
  Sun,
  Boxes,
  Sparkles,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';

export const MissionOverviewPage = () => {
  const {
    isCrisis,
    telemetry,
    telemetryHistory,
    subsystems,
    auditLog,
    triggerCrisis,
    resetToNominal,
    setActiveTab,
  } = useMission();

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* CRISIS ALERT BANNER (Only visible when Solar Strike is simulated) */}
      {isCrisis && (
        <div className="rounded-xl p-4 bg-red-600 text-white shadow-lg flex flex-wrap items-center justify-between gap-4 border border-red-700 animate-alert-ring">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm uppercase tracking-wider">
                  CRITICAL INCIDENT DETECTED
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/30">
                  INC-2026-088
                </span>
              </div>
              <p className="text-xs opacity-90 font-mono mt-0.5">
                Solar Array Strike: Photovoltaic collapse (0.0%), Bus undervoltage (11.0V), Core temp spike (85.0°C).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('anomalies')}
              className="px-3.5 py-1.5 rounded-lg bg-white text-red-700 hover:bg-white/90 text-xs font-bold uppercase tracking-wider font-display shadow-sm cursor-pointer"
            >
              Inspect Anomaly
            </button>
            <button
              onClick={resetToNominal}
              className="px-3.5 py-1.5 rounded-lg bg-red-800 hover:bg-red-900 text-white text-xs font-mono cursor-pointer"
            >
              Clear Fault
            </button>
          </div>
        </div>
      )}

      {/* TOP 3 MAIN CARDS (Direct from Page 1 Guide) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: SYSTEM */}
        <div className="rounded-2xl p-5 bg-white border border-[#e6e1d7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#736f68]">
              Primary System Status
            </span>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                isCrisis
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isCrisis ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  CRITICAL
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  NOMINAL
                </>
              )}
            </span>
          </div>

          <div className="my-3">
            <div className="font-display font-bold text-2xl text-[#161514] tracking-tight">
              {isCrisis ? 'Interlocks Tripped' : '100% Operational'}
            </div>
            <p className="text-xs text-[#736f68] mt-1 font-mono">
              {isCrisis
                ? '3 threshold limits breached (EPS & TCS)'
                : 'All 4 primary flight computers responding'}
            </p>
          </div>

          <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-xs font-mono text-[#736f68]">
            <span>Bus: {telemetry.voltage.toFixed(1)}V</span>
            <span>Drift: {telemetry.adcs_drift}°/hr</span>
          </div>
        </div>

        {/* Card 2: TELEMETRY */}
        <div className="rounded-2xl p-5 bg-white border border-[#e6e1d7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#736f68]">
              WebSocket Stream
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              LIVE 10Hz
            </span>
          </div>

          <div className="my-3">
            <div className="font-display font-bold text-2xl text-[#161514] tracking-tight flex items-baseline gap-2">
              <span>{telemetry.packet_rate}</span>
              <span className="text-sm font-normal text-[#736f68]">packets / sec</span>
            </div>
            <p className="text-xs text-[#736f68] mt-1 font-mono">
              DSN Madrid Complex 63 • 0.0% packet drop
            </p>
          </div>

          <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-xs font-mono text-[#736f68]">
            <span>Link SNR: +{telemetry.link_snr} dBm</span>
            <span>Uplink: {telemetry.uplink_quality}%</span>
          </div>
        </div>

        {/* Card 3: AI ENGINE */}
        <div className="rounded-2xl p-5 bg-white border border-[#e6e1d7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#736f68]">
              Diagnostic Copilot
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              ONLINE
            </span>
          </div>

          <div className="my-3">
            <div className="font-display font-bold text-2xl text-[#161514] tracking-tight">
              Gemini 1.5 Diagnostic
            </div>
            <p className="text-xs text-[#736f68] mt-1 font-mono">
              {isCrisis ? 'Emergency fault isolation active' : 'Zero-shot anomaly detector running'}
            </p>
          </div>

          <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-xs font-mono text-[#736f68]">
            <span>Anomaly Score: {telemetry.anomaly_score.toFixed(2)}</span>
            <span className="text-purple-600 font-semibold">Latency: 182ms</span>
          </div>
        </div>
      </div>

      {/* LIVE TELEMETRY: 4 CHANNELS (Direct from Page 1 Guide) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#233446]" />
            <h2 className="font-display font-bold text-lg text-[#161514]">Live Telemetry Matrix</h2>
            <span className="font-mono text-xs text-[#736f68] bg-slate-100 px-2 py-0.5 rounded-full">
              4 Real-time Channels
            </span>
          </div>
          <button
            onClick={() => setActiveTab('telemetry')}
            className="text-xs font-mono font-semibold text-[#233446] hover:text-[#fea619] flex items-center gap-1 transition-colors cursor-pointer"
          >
            Full Visualizer <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Temperature */}
          <TelemetryMetricCard
            title="Temperature"
            value={telemetry.temperature.toFixed(1)}
            unit="°C"
            status={isCrisis || telemetry.temperature > 40 ? 'Critical' : 'Nominal'}
            statusType={isCrisis || telemetry.temperature > 40 ? 'critical' : 'nominal'}
            delta="-2.1%"
            deltaPositive={false}
            minVal={`${telemetry.minTemp} °C`}
            maxVal={`${telemetry.maxTemp} °C`}
            nominalRange="10–30 °C"
            history={telemetryHistory}
            dataKey="temp"
            color="#ef4444"
            icon={Thermometer}
            onClick={() => setActiveTab('telemetry')}
          />

          {/* Card 2: Regulated Bus */}
          <TelemetryMetricCard
            title="Regulated"
            value={telemetry.voltage.toFixed(1)}
            unit="VDC"
            status={isCrisis || telemetry.voltage < 20 ? 'Critical' : 'Stable'}
            statusType={isCrisis || telemetry.voltage < 20 ? 'critical' : 'stable'}
            delta="+0.3%"
            deltaPositive={true}
            minVal="11.0 V"
            maxVal="24.3 V"
            nominalRange="24–28 V"
            history={telemetryHistory}
            dataKey="voltage"
            color="#3b82f6"
            icon={Zap}
            onClick={() => setActiveTab('telemetry')}
          />

          {/* Card 3: Li-Ion Battery */}
          <TelemetryMetricCard
            title="Li-Ion"
            value={telemetry.battery_pct.toFixed(1)}
            unit="%"
            status="Healthy"
            statusType="healthy"
            delta="+1.2%"
            deltaPositive={true}
            minVal="82.0 %"
            maxVal="98.6 %"
            nominalRange="> 70 %"
            history={telemetryHistory}
            dataKey="battery"
            color="#10b981"
            icon={BatteryCharging}
            onClick={() => setActiveTab('telemetry')}
          />

          {/* Card 4: Photovoltaic (Solar) */}
          <TelemetryMetricCard
            title="Photovoltaic"
            value={telemetry.solar_input.toFixed(1)}
            unit="%"
            status={telemetry.solar_input < 20 ? 'Low Input' : 'Nominal'}
            statusType={telemetry.solar_input < 20 ? 'low' : 'nominal'}
            delta="-12.4%"
            deltaPositive={false}
            minVal="0.0 %"
            maxVal="97.2 %"
            nominalRange="> 80 %"
            history={telemetryHistory}
            dataKey="solar"
            color="#f97316"
            icon={Sun}
            onClick={() => setActiveTab('telemetry')}
          />
        </div>
      </div>

      {/* SUBSYSTEM HEALTH & LATEST AI ASSESSMENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Subsystems Health Matrix (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#233446]" />
              <h2 className="font-display font-bold text-lg text-[#161514]">Subsystem Health</h2>
            </div>
            <button
              onClick={() => setActiveTab('subsystems')}
              className="text-xs font-mono font-semibold text-[#233446] hover:text-[#fea619] flex items-center gap-1 transition-colors cursor-pointer"
            >
              All Subsystems <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subsystems.map((sub) => {
              const isCrit = sub.status === 'CRITICAL';
              const isWarn = sub.status === 'WARNING';

              return (
                <div
                  key={sub.id}
                  className={`rounded-2xl p-4 bg-white border shadow-xs transition-all ${
                    isCrit
                      ? 'border-red-300 bg-red-50/20'
                      : isWarn
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-[#e6e1d7]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#161514]">{sub.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        isCrit
                          ? 'bg-red-100 text-red-700'
                          : isWarn
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCrit ? 'bg-red-500 animate-ping' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 my-2">
                    {sub.metrics.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#736f68]">{m.label}</span>
                        <span className="font-semibold text-[#161514]">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-[#736f68] font-mono border-t border-slate-100 pt-2 mt-1">
                    {sub.details}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Latest AI Assessment & Recent Events (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* AI Assessment Card (Gemini Copilot) */}
          <div className="rounded-2xl p-5 bg-linear-to-br from-white to-purple-50/40 border border-purple-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-[#161514] block">
                    Latest AI Assessment
                  </span>
                  <span className="font-mono text-[10px] text-purple-700">Gemini 1.5 Diagnostic Engine</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                {isCrisis ? 'CRISIS MODE' : 'NOMINAL'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/80 border border-purple-100 text-xs text-[#161514] leading-relaxed my-1">
              {!isCrisis ? (
                <p>
                  All telemetry streams remain within strict operational tolerances. Electrical power
                  balance is positive (+42W net). Zero thermal drift detected across all four orbital
                  quadrants.
                </p>
              ) : (
                <p className="text-red-900 font-medium">
                  CRITICAL EVENT: Telemetry confirms catastrophic loss of photovoltaic output accompanied
                  by electrical bus drawdown to 11.0V and battery core thermal runaway (85.0°C).
                  Recommended action: Immediate Protective Safe Mode.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-purple-100/80">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase text-[#736f68]">Decision Confidence</span>
                <span className="font-mono text-base font-bold text-[#161514]">
                  {isCrisis ? '91.4%' : '99.4%'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase text-[#736f68]">Survival Probability</span>
                <span
                  className={`font-mono text-base font-bold ${
                    isCrisis ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {isCrisis ? '72% (Degrading)' : '100% Nominal'}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setActiveTab('ai_assistant')}
                className="w-full py-2 rounded-lg bg-[#233446] hover:bg-[#1e293b] text-white text-xs font-display font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open AI Reasoning Console</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Mission Events Feed */}
          <div className="rounded-2xl p-4 bg-white border border-[#e6e1d7] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-bold text-sm text-[#161514]">Recent Mission Events</span>
              <button
                onClick={() => setActiveTab('events')}
                className="text-[11px] font-mono text-[#233446] hover:underline cursor-pointer"
              >
                View Log
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {auditLog.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-mono"
                >
                  <span className="text-[#736f68] text-[10px] shrink-0">{evt.time}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      evt.type === 'CRITICAL'
                        ? 'bg-red-100 text-red-700'
                        : evt.type === 'COMMAND_UPLINK'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {evt.type}
                  </span>
                  <span className="text-[#161514] text-[11px] line-clamp-1">{evt.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
