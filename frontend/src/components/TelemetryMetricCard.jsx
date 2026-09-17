import React from 'react';
import { TelemetrySparkline } from './TelemetrySparkline';
import { ArrowDown, ArrowUp } from 'lucide-react';

/**
 * TelemetryMetricCard: Matches the top KPI cards from the user's reference.
 * Features:
 * - Rounded square icon in soft colored container
 * - Status pill (Nominal / Stable / Healthy / Low Input / Critical)
 * - Large bold value (32px)
 * - Delta percentage badge (vs last 5 min)
 * - Embedded smooth gradient area sparkline curve on the right
 * - Min | Max | Nominal telemetry range footer
 */
export const TelemetryMetricCard = ({
  title,
  value,
  unit = '',
  status = 'Nominal',
  statusType = 'nominal', // 'nominal' | 'stable' | 'healthy' | 'warning' | 'critical'
  delta = '-2.1%',
  deltaPositive = false,
  minVal,
  maxVal,
  nominalRange,
  history = [],
  dataKey = 'temp',
  color = '#ef4444',
  icon: Icon,
  isSelected = false,
  onClick,
}) => {
  // Determine status color styling
  const getStatusBadge = () => {
    switch (statusType) {
      case 'critical':
      case 'warning':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'low':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'stable':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'healthy':
      case 'nominal':
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  const getStatusDot = () => {
    switch (statusType) {
      case 'critical':
      case 'warning':
        return 'bg-red-500 animate-ping';
      case 'low':
        return 'bg-amber-500';
      case 'stable':
        return 'bg-blue-500';
      case 'healthy':
      case 'nominal':
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 bg-white border text-left shadow-xs transition-all flex flex-col justify-between cursor-pointer ${
        isSelected
          ? 'border-[#1e293b] ring-2 ring-[#1e293b]/10'
          : 'border-[#e6e1d7] hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Top Header: Icon + Title on left, Status Pill on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: `${color}14`,
              borderColor: `${color}25`,
              color: color,
            }}
          >
            {Icon && <Icon className="w-4 h-4" />}
          </div>
          <span className="font-sans font-bold text-sm text-[#161514]">{title}</span>
        </div>

        <div className={`px-2 py-0.5 rounded-full border text-[11px] font-mono font-semibold flex items-center gap-1.5 ${getStatusBadge()}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot()}`} />
          <span>{status}</span>
        </div>
      </div>

      {/* Middle Row: Big Bold Value + Delta on left, Area Sparkline on right */}
      <div className="grid grid-cols-12 items-center gap-2 my-3">
        <div className="col-span-6 flex flex-col">
          <div className="font-sans font-extrabold text-2xl sm:text-[28px] text-[#161514] tracking-tight leading-none">
            {value} <span className="text-base font-normal text-[#736f68]">{unit}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono mt-2 font-medium">
            <span
              className={`flex items-center font-bold ${
                deltaPositive ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {deltaPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {delta}
            </span>
            <span className="text-[#94a3b8]">(vs last 5 min)</span>
          </div>
        </div>

        <div className="col-span-6 pl-2">
          <TelemetrySparkline
            data={history}
            dataKey={dataKey}
            strokeColor={color}
            fillGradientId={`grad-spark-${dataKey}`}
            height={48}
          />
        </div>
      </div>

      {/* Bottom Footer: Min | Max | Nominal telemetry limits */}
      <div className="pt-2.5 border-t border-[#f1ede6] flex items-center justify-between text-[10.5px] font-mono text-[#8c827a]">
        <span>Min {minVal}</span>
        <span className="text-[#d8d3c7]">|</span>
        <span>Max {maxVal}</span>
        <span className="text-[#d8d3c7]">|</span>
        <span>Nominal {nominalRange}</span>
      </div>
    </div>
  );
};
