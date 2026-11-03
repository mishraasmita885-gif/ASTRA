import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingDown, TrendingUp, X } from 'lucide-react';

const CHANNEL_LABELS = {
  temperature: 'Thermal Core',
  voltage:     'Bus Voltage',
  battery:     'Battery SoC',
  solar:       'Solar Array',
  p3:          'P-3 Signal',
  current_draw:'Current Draw',
  link_snr:    'Link SNR',
  adcs_drift:  'ADCS Drift',
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
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset dismissed list when alarms change (new alarm appeared)
  useEffect(() => {
    setDismissed(prev => {
      const activeKeys = new Set(alarms.map(a => `${a.spacecraft_id}:${a.channel}`));
      const cleaned = new Set([...prev].filter(k => activeKeys.has(k)));
      return cleaned;
    });
  }, [alarms]);

  const visibleAlarms = alarms.filter(a => !dismissed.has(`${a.spacecraft_id}:${a.channel}`));

  if (visibleAlarms.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2 mb-4">
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
            className={`flex items-center justify-between gap-4 px-4 py-3 border-2 rounded-2xl font-mono text-xs
              ${isCritical
                ? 'bg-red-950 border-[#ef4444] shadow-[3px_3px_0px_0px_#ef4444] text-[#fbf7f0]'
                : 'bg-[#452a19] border-[#fea619] shadow-[3px_3px_0px_0px_#fea619] text-[#fbf7f0]'
              }`}
          >
            {/* Left: Icon + label */}
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${isCritical ? 'text-[#ef4444]' : 'text-[#fea619]'} animate-pulse`} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-widest uppercase text-[10px] text-white/70">
                  {isCritical ? '⚠ CRITICAL PREDICTIVE ALARM' : '⚡ PREDICTIVE WARNING'}
                </span>
                <span className="text-white font-bold text-xs truncate">
                  {label} ({alarm.spacecraft_id}) projected to breach{' '}
                  <span className={isCritical ? 'text-[#f87171]' : 'text-[#fea619]'}>
                    {alarm.threshold_value}{alarm.unit}
                  </span>{' '}
                  threshold
                </span>
              </div>
            </div>

            {/* Center: Slope indicator */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <TrendIcon className="w-3.5 h-3.5 text-white/60" />
              <span className="text-white/70 text-[10px]">
                {alarm.slope_per_sec > 0 ? '+' : ''}{Number(alarm.slope_per_sec).toFixed(4)}/s
              </span>
            </div>

            {/* Right: Countdown + dismiss */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/20">
                <Clock className="w-3.5 h-3.5 text-white/60" />
                <span className={`font-bold tabular-nums text-sm ${isCritical ? 'text-[#f87171]' : 'text-[#fea619]'}`}>
                  {formatCountdown(displaySec)}
                </span>
              </div>
              <button
                onClick={() => {
                  setDismissed(prev => new Set([...prev, key]));
                  if (onDismiss) onDismiss(key);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Dismiss alarm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
