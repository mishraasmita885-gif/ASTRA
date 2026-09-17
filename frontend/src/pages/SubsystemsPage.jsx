import React from 'react';
import { useMission } from '../context/MissionContext';
import { TelemetrySparkline } from '../components/TelemetrySparkline';
import {
  Boxes,
  Zap,
  Thermometer,
  Radio,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Cpu,
  Layers,
} from 'lucide-react';

export const SubsystemsPage = () => {
  const { subsystems, isCrisis, telemetry, telemetryHistory } = useMission();

  const getSubsystemIcon = (id) => {
    switch (id) {
      case 'eps':
        return Zap;
      case 'tcs':
        return Thermometer;
      case 'ttc':
        return Radio;
      case 'adcs':
        return Compass;
      default:
        return Boxes;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#233446]" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              Spacecraft Avionics & Subsystems Matrix
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Component-level diagnostic health telemetry and primary payload states
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#736f68] bg-white border border-[#e6e1d7] px-3 py-1.5 rounded-full">
            Status: {isCrisis ? '1 CRITICAL • 1 WARNING • 2 NOMINAL' : '4/4 ALL SUBSYSTEMS NOMINAL'}
          </span>
        </div>
      </div>

      {/* 4 Large Subsystem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subsystems.map((sub) => {
          const Icon = getSubsystemIcon(sub.id);
          const isCrit = sub.status === 'CRITICAL';
          const isWarn = sub.status === 'WARNING';

          return (
            <div
              key={sub.id}
              className={`rounded-2xl p-6 bg-white border shadow-xs flex flex-col justify-between transition-all ${
                isCrit
                  ? 'border-red-300 bg-red-50/20'
                  : isWarn
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-[#e6e1d7]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isCrit
                          ? 'bg-red-100 text-red-700'
                          : isWarn
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#233446]/10 text-[#233446]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-[#161514]">{sub.name}</h3>
                      <span className="font-mono text-xs text-[#736f68]">{sub.fullName}</span>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                      isCrit
                        ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                        : isWarn
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isCrit ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {sub.status}
                  </span>
                </div>

                {/* Metrics Table */}
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 my-4">
                  {sub.metrics.map((m, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[10px] font-mono uppercase text-[#736f68]">{m.label}</span>
                      <span className="font-mono text-lg font-bold text-[#161514] mt-0.5">
                        {m.value}
                      </span>
                      <span className="text-[9px] font-mono text-[#94a3b8]">Limit: {m.nominal}</span>
                    </div>
                  ))}
                </div>

                {/* Live Trend Sparkline for Subsystem */}
                <div className="my-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#736f68] mb-1">
                    <span>Live Channel Trend (30s Window)</span>
                    <span className="font-semibold text-[#161514]">Sampling 10Hz</span>
                  </div>
                  <TelemetrySparkline
                    data={telemetryHistory}
                    dataKey={sub.id === 'eps' ? 'voltage' : sub.id === 'tcs' ? 'temp' : sub.id === 'comms' ? 'solar' : 'battery'}
                    strokeColor={isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6'}
                    fillGradientId={`grad-sub-${sub.id}`}
                    height={44}
                  />
                </div>

                <div className="text-xs font-mono text-[#736f68] leading-relaxed my-2">
                  <span className="font-bold text-[#161514]">Diagnostic Summary: </span>
                  {sub.details}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-[#94a3b8] mt-2">
                <span>Bus Protocol: CAN / SpaceWire</span>
                <span>Self-Test: OK</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
