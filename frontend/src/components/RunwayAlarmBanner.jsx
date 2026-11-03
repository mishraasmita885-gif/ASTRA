import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingDown, TrendingUp, X } from 'lucide-react';

const CHANNEL_LABELS = {
  temperature: 'Thermal Core',
  voltage: 'Bus Voltage',
  battery: 'Battery SoC',
  solar: 'Solar Array',
  p3: 'P-3 Signal',
  current_draw: 'Current Draw',
  link_snr: 'Link SNR',
  adcs_drift: 'ADCS Drift',
};

function formatCountdown(seconds) {
  if (seconds == null || !isFinite(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m > 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${String(rem).padStart(2, '0')}s`;
}

export const RunwayAlarmBanner = ({ alarms = [], onDismiss }) => {
  const [dismissed, setDismissed] = useState(new Set());
  const [tick, setTick] = useState(0);

  // Live countdown ticker — decrements displayed seconds every second
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset dismissed list when alarms change (new alarm appeared)
  useEffect(() => {
    setDismissed((prev) => {
      const activeKeys = new Set(alarms.map((a) => `${a.spacecraft_id}:${a.channel}`));
      const cleaned = new Set([...prev].filter((k) => activeKeys.has(k)));
      return cleaned;
    });
  }, [alarms]);

  const visibleAlarms = alarms.filter((a) => !dismissed.has(`${a.spacecraft_id}:${a.channel}`));

  if (visibleAlarms.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2.5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {visibleAlarms.length > 1 && (
        <div className="flex items-center justify-between px-2 pt-0.5 pb-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#fea619] animate-ping" />
            <span className="text-[11px] font-mono font-bold text-[#452a19] uppercase tracking-wider">
              {visibleAlarms.length} Active Predictive Runway Alarms
            </span>
          </div>
          <button
            onClick={() => {
              const allKeys = visibleAlarms.map((a) => `${a.spacecraft_id}:${a.channel}`);
              setDismissed((prev) => new Set([...prev, ...allKeys]));
              if (onDismiss) onDismiss('ALL');
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            title="Dismiss all active alarms"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Dismiss All ({visibleAlarms.length})</span>
          </button>
        </div>
      )}

      {visibleAlarms.map((alarm) => {
        const key = `${alarm.spacecraft_id}:${alarm.channel}`;
        const isCritical = alarm.severity === 'CRITICAL';
        const label = CHANNEL_LABELS[alarm.channel] || alarm.channel.toUpperCase();
        const TrendIcon = alarm.direction === 'HIGH' ? TrendingUp : TrendingDown;
        // Subtract elapsed ticks for live countdown feel
        const displaySec = Math.max(0, (alarm.time_to_breach_sec || 0) - tick);

        return (
          <div
            key={key}
            className={`flex items-center justify-between flex-wrap sm:flex-nowrap gap-3 px-4 py-3 border-2 rounded-2xl font-mono text-xs transition-all ${
              isCritical
                ? 'bg-[#2b0808] border-[#ef4444] shadow-[3px_3px_0px_0px_#ef4444] text-[#fbf7f0]'
                : 'bg-[#452a19] border-[#fea619] shadow-[3px_3px_0px_0px_#fea619] text-[#fbf7f0]'
            }`}
          >
            {/* Left: Icon + label */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                  isCritical
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[#fea619]/20 border-[#fea619] text-[#fea619]'
                }`}
              >
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-widest uppercase text-[10px] text-white/70">
                  {isCritical ? '⚠ CRITICAL PREDICTIVE ALARM' : '⚡ PREDICTIVE WARNING'}
                </span>
                <span className="text-white font-bold text-xs truncate">
                  {label} ({alarm.spacecraft_id}) projected to breach{' '}
                  <span className={isCritical ? 'text-[#fca5a5] underline' : 'text-[#fea619] underline'}>
                    {alarm.threshold_value}{alarm.unit}
                  </span>{' '}
                  threshold
                </span>
              </div>
            </div>

            {/* Center: Slope indicator */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-black/30 border border-white/10">
              <TrendIcon className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white/80 text-[10px] font-bold">
                {alarm.slope_per_sec > 0 ? '+' : ''}{Number(alarm.slope_per_sec).toFixed(4)}/s
              </span>
            </div>

            {/* Right: Countdown + Prominent Dismiss Button */}
            <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
              <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/20">
                <Clock className="w-3.5 h-3.5 text-white/70" />
                <span className={`font-bold tabular-nums text-sm ${isCritical ? 'text-[#fca5a5]' : 'text-[#fea619]'}`}>
                  {formatCountdown(displaySec)}
                </span>
              </div>

              {/* Prominent High-Contrast Dismiss Button */}
              <button
                onClick={() => {
                  setDismissed((prev) => new Set([...prev, key]));
                  if (onDismiss) onDismiss(key);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-mono text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                  isCritical
                    ? 'bg-[#fee2e2] hover:bg-white text-[#991b1b] border-white shadow-[2px_2px_0px_0px_#000000]'
                    : 'bg-[#fea619] hover:bg-[#ffb738] text-[#24140b] border-[#24140b] shadow-[2px_2px_0px_0px_#24140b]'
                }`}
                title="Dismiss this predictive alarm"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
