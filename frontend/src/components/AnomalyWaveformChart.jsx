import React, { useState, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';

/**
 * AnomalyWaveformChart:
 * Professional aerospace anomaly detection chart matching the new visual reference standard.
 * Features:
 * - Dual-curve comparison: Actual Observed Telemetry vs LSTM Nominal Prediction
 * - Shaded hazard residual gap between actual and predicted curves
 * - 3-Sigma threshold boundary line with warning zones
 * - Critical fault injection event marker & milestone pins
 * - Interactive crosshair scrubber with floating dark HUD tooltip
 * - Channel selector (Bus Voltage, Temperature, Solar Array, Anomaly Score)
 * - Bottom range timeline scrubber
 */
export const AnomalyWaveformChart = ({
  history = [],
  isCrisis = false,
  selectedAnomaly,
}) => {
  const [selectedChannel, setSelectedChannel] = useState('voltage');
  const [timeWindow, setTimeWindow] = useState('30s');
  const [hoverData, setHoverData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef(null);

  // Available anomaly channels
  const channelConfigs = {
    voltage: {
      name: 'Regulated Main Bus',
      unit: 'VDC',
      actualKey: 'voltage',
      actualColor: '#ef4444',
      nominalVal: 24.2,
      thresholdVal: 20.0,
      thresholdLabel: 'Under-Voltage Threshold (20.0 V)',
      min: 0,
      max: 30,
      ticks: [30, 25, 20, 15, 10, 5, 0],
    },
    temp: {
      name: 'TCS Core Temperature',
      unit: '°C',
      actualKey: 'temp',
      actualColor: '#f97316',
      nominalVal: 15.2,
      thresholdVal: 60.0,
      thresholdLabel: 'Thermal Boundary Limit (60.0 °C)',
      min: 0,
      max: 100,
      ticks: [100, 80, 60, 40, 20, 0],
    },
    solar: {
      name: 'Photovoltaic Solar Generation',
      unit: '%',
      actualKey: 'solar',
      actualColor: '#eab308',
      nominalVal: 96.4,
      thresholdVal: 30.0,
      thresholdLabel: 'Minimum Generation Floor (30.0%)',
      min: 0,
      max: 100,
      ticks: [100, 75, 50, 25, 0],
    },
    score: {
      name: 'LSTM Autoencoder Reconstruction Loss',
      unit: 'MSE',
      actualKey: 'anomaly_score',
      actualColor: '#ec4899',
      nominalVal: 0.05,
      thresholdVal: 0.70,
      thresholdLabel: '3-Sigma Anomaly Trigger (0.70 MSE)',
      min: 0,
      max: 1.0,
      ticks: [1.0, 0.8, 0.6, 0.4, 0.2, 0],
    },
  };

  const cfg = channelConfigs[selectedChannel];

  // Generate synthetic observed vs predicted nominal points
  const chartPoints = useMemo(() => {
    const count = 30;
    const baseHistory = history && history.length >= count ? history.slice(-count) : [];

    return Array.from({ length: count }, (_, i) => {
      const histItem = baseHistory[i] || {};
      const tSec = -((count - 1 - i) * 1.5).toFixed(1);

      let actual;
      let predicted;

      if (selectedChannel === 'voltage') {
        predicted = +(24.1 + Math.sin(i * 0.2) * 0.15).toFixed(2);
        actual = isCrisis && i >= 12
          ? +(11.0 + Math.random() * 0.3).toFixed(2)
          : histItem.voltage ?? predicted;
      } else if (selectedChannel === 'temp') {
        predicted = +(15.2 + Math.cos(i * 0.3) * 0.4).toFixed(1);
        actual = isCrisis && i >= 12
          ? +(85.0 + Math.random() * 0.8).toFixed(1)
          : histItem.temp ?? predicted;
      } else if (selectedChannel === 'solar') {
        predicted = +(96.4 + Math.sin(i * 0.4) * 0.5).toFixed(1);
        actual = isCrisis && i >= 12 ? 0.0 : histItem.solar ?? predicted;
      } else {
        // Anomaly score
        predicted = 0.04;
        actual = isCrisis && i >= 12 ? +(0.92 + Math.random() * 0.04).toFixed(2) : 0.06;
      }

      return {
        idx: i,
        time: histItem.time || `T ${tSec}s`,
        offset: tSec === '0.0' ? 'T-0 Live' : `T ${tSec}s`,
        actual,
        predicted,
        isFaultRegion: isCrisis && i >= 12,
      };
    });
  }, [history, isCrisis, selectedChannel]);

  // Chart dimensions
  const width = 850;
  const height = 260;
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 40;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Coordinate transforms
  const getY = (val) => {
    const clamped = Math.max(cfg.min, Math.min(cfg.max, val ?? cfg.min));
    const ratio = (clamped - cfg.min) / (cfg.max - cfg.min);
    return paddingTop + (1 - ratio) * plotHeight;
  };

  const getX = (idx) => {
    return paddingLeft + (idx / (chartPoints.length - 1)) * plotWidth;
  };

  // Build SVG Paths
  const buildSmoothPath = (pts) => {
    if (!pts || pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const midX = (curr.x + next.x) / 2;
      d += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const actualPts = chartPoints.map((p) => ({ x: getX(p.idx), y: getY(p.actual), ...p }));
  const predPts = chartPoints.map((p) => ({ x: getX(p.idx), y: getY(p.predicted), ...p }));

  const actualLineD = buildSmoothPath(actualPts);
  const predLineD = buildSmoothPath(predPts);

  // Area under actual curve
  const actualAreaD = `${actualLineD} L ${actualPts[actualPts.length - 1].x} ${paddingTop + plotHeight} L ${actualPts[0].x} ${paddingTop + plotHeight} Z`;

  // Fault injection X position
  const faultX = getX(12);
  const thresholdY = getY(cfg.thresholdVal);

  // Mouse move scrubber
  const handleMouseMove = (e) => {
    if (!svgRef.current || chartPoints.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    if (mouseX < paddingLeft || mouseX > paddingLeft + plotWidth) {
      setHoverData(null);
      return;
    }

    const ratio = (mouseX - paddingLeft) / plotWidth;
    const idx = Math.min(
      chartPoints.length - 1,
      Math.max(0, Math.round(ratio * (chartPoints.length - 1)))
    );

    const pt = chartPoints[idx];
    setHoverData({
      x: getX(idx),
      idx,
      pt,
      actualY: getY(pt.actual),
      predY: getY(pt.predicted),
      residual: Math.abs(pt.actual - pt.predicted).toFixed(2),
    });
  };

  return (
    <div
      className={`rounded-2xl p-5 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-4 select-none relative ${
        isFullscreen ? 'fixed inset-4 z-50 overflow-auto bg-white shadow-2xl' : ''
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-sans font-bold text-base text-[#161514]">
              LSTM Reconstruction & Error Residual Waveform
            </h3>
          </div>
          <span className="text-xs font-mono text-[#736f68]">
            Observed telemetry vs nominal baseline • 3-Sigma threshold envelope
          </span>
        </div>

        {/* Channel Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(channelConfigs).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setSelectedChannel(key)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                selectedChannel === key
                  ? 'bg-[#1e293b] text-white shadow-xs'
                  : 'bg-slate-100 text-[#64748b] hover:bg-slate-200'
              }`}
            >
              {key === 'voltage' ? 'Bus (V)' : key === 'temp' ? 'Temp (°C)' : key === 'solar' ? 'Solar (%)' : 'Error (MSE)'}
            </button>
          ))}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[#736f68] transition-colors ml-1 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Telemetry Delta KPI Cards (Matching reference snapshot strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80 flex flex-col justify-between">
          <span className="text-[10px] text-[#736f68] uppercase font-semibold">Δ Solar Input</span>
          <span className="text-base font-bold text-red-700 mt-1">-96.4%</span>
        </div>

        <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80 flex flex-col justify-between">
          <span className="text-[10px] text-[#736f68] uppercase font-semibold">Δ Main Bus</span>
          <span className="text-base font-bold text-red-700 mt-1">-13.1 V</span>
        </div>

        <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80 flex flex-col justify-between">
          <span className="text-[10px] text-[#736f68] uppercase font-semibold">Δ Core Temp</span>
          <span className="text-base font-bold text-red-700 mt-1">+69.8 °C</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between">
          <span className="text-[10px] text-[#736f68] uppercase font-semibold">Discharge Rate</span>
          <span className="text-base font-bold text-amber-700 mt-1">-18.4 A</span>
        </div>
      </div>

      {/* 3. The Dual-Curve SVG Graph */}
      <div className="relative w-full h-[260px] bg-white rounded-xl overflow-visible">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
        >
          <defs>
            <linearGradient id="anomaly-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.actualColor} stopOpacity="0.28" />
              <stop offset="60%" stopColor={cfg.actualColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={cfg.actualColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
            const y = paddingTop + ratio * plotHeight;
            return (
              <line
                key={i}
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + plotWidth}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Left Y-Axis */}
          <g className="font-mono text-[10px] text-[#94a3b8] select-none">
            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={paddingTop + plotHeight}
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            {cfg.ticks.map((t) => {
              const y = getY(t);
              return (
                <g key={t}>
                  <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="#cbd5e1" />
                  <text x={paddingLeft - 8} y={y + 3.5} textAnchor="end" fill="#64748b">
                    {t}
                  </text>
                </g>
              );
            })}
            <text
              x={14}
              y={paddingTop + plotHeight / 2}
              fill="#64748b"
              textAnchor="middle"
              transform={`rotate(-90 14 ${paddingTop + plotHeight / 2})`}
              className="font-sans text-[10px] font-bold"
            >
              {cfg.name} ({cfg.unit})
            </text>
          </g>

          {/* Critical Threshold Boundary Line (Red Dashed Line) */}
          <g>
            <line
              x1={paddingLeft}
              y1={thresholdY}
              x2={paddingLeft + plotWidth}
              y2={thresholdY}
              stroke="#dc2626"
              strokeDasharray="6 4"
              strokeWidth="1.5"
            />
            <rect
              x={paddingLeft + plotWidth - 180}
              y={thresholdY - 18}
              width="175"
              height="16"
              rx="4"
              fill="#fef2f2"
              stroke="#fecaca"
            />
            <text
              x={paddingLeft + plotWidth - 92}
              y={thresholdY - 6}
              textAnchor="middle"
              fill="#dc2626"
              className="font-mono text-[9.5px] font-bold"
            >
              {cfg.thresholdLabel}
            </text>
          </g>

          {/* Fault Injection Marker (Vertical line at T - 42s) */}
          {isCrisis && (
            <g>
              <line
                x1={faultX}
                y1={paddingTop}
                x2={faultX}
                y2={paddingTop + plotHeight}
                stroke="#b91c1c"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <rect
                x={faultX - 55}
                y={paddingTop + 5}
                width="110"
                height="20"
                rx="6"
                fill="#991b1b"
              />
              <text
                x={faultX}
                y={paddingTop + 18}
                textAnchor="middle"
                fill="#ffffff"
                className="font-mono text-[9px] font-bold"
              >
                ⚡ FAULT INJECTED
              </text>
            </g>
          )}

          {/* 1. Area Fill under Actual Curve */}
          <path d={actualAreaD} fill="url(#anomaly-area-grad)" />

          {/* 2. Predicted Nominal Baseline (Dashed Emerald Line) */}
          <path
            d={predLineD}
            fill="none"
            stroke="#10b981"
            strokeDasharray="5 4"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* 3. Observed Telemetry Curve (Solid Line in Channel Color) */}
          <path
            d={actualLineD}
            fill="none"
            stroke={cfg.actualColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Interactive Scrubber Crosshair */}
          {hoverData && (
            <g className="pointer-events-none">
              <line
                x1={hoverData.x}
                y1={paddingTop}
                x2={hoverData.x}
                y2={paddingTop + plotHeight}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              {/* Actual dot */}
              <circle cx={hoverData.x} cy={hoverData.actualY} r="5" fill={cfg.actualColor} />
              <circle cx={hoverData.x} cy={hoverData.actualY} r="8" fill="none" stroke={cfg.actualColor} strokeWidth="1.5" strokeOpacity="0.4" />
              {/* Predicted dot */}
              <circle cx={hoverData.x} cy={hoverData.predY} r="4" fill="#10b981" />
            </g>
          )}

          {/* Bottom X-Axis */}
          <g className="font-mono text-[10px] text-[#94a3b8] select-none">
            <line
              x1={paddingLeft}
              y1={paddingTop + plotHeight}
              x2={paddingLeft + plotWidth}
              y2={paddingTop + plotHeight}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            {['-45s', '-35s', '-25s', '-15s', '-5s'].map((lbl, idx) => {
              const x = paddingLeft + ((idx + 1) / 6) * plotWidth;
              return (
                <text key={lbl} x={x} y={paddingTop + plotHeight + 16} textAnchor="middle">
                  {lbl}
                </text>
              );
            })}
            <text
              x={paddingLeft + plotWidth}
              y={paddingTop + plotHeight + 16}
              textAnchor="end"
              fill="#ef4444"
              className="font-bold"
            >
              T-0 Live
            </text>
          </g>
        </svg>

        {/* Floating Dark HUD Tooltip */}
        {hoverData && (
          <div
            className="absolute bg-[#0f172a] text-white border border-slate-700/80 rounded-xl p-3 shadow-2xl z-30 pointer-events-none transition-all duration-75 text-xs font-mono"
            style={{
              left: Math.min(width - 210, Math.max(paddingLeft, hoverData.x - 70)),
              top: 15,
            }}
          >
            <div className="text-[11px] font-bold text-slate-300 pb-1.5 border-b border-slate-700/60 flex items-center justify-between gap-4">
              <span>{hoverData.pt.offset}</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                hoverData.pt.isFaultRegion ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {hoverData.pt.isFaultRegion ? 'CRITICAL FAULT' : 'NOMINAL'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.actualColor }} />
                  <span className="text-slate-300">Observed</span>
                </div>
                <strong className="text-white">{hoverData.pt.actual} {cfg.unit}</strong>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-slate-300">LSTM Nominal</span>
                </div>
                <strong className="text-emerald-400">{hoverData.pt.predicted} {cfg.unit}</strong>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                <span className="text-slate-400 text-[10px]">Reconstruction Error</span>
                <strong className="text-red-400 text-[11px]">Δ {hoverData.residual} {cfg.unit}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Legend Bar */}
      <div className="flex items-center justify-between pt-1 text-xs font-mono text-[#736f68] border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ backgroundColor: cfg.actualColor }} />
            <span>Observed Stream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 border-b border-dashed" />
            <span>Predicted Nominal Baseline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-600 border-b border-dashed" />
            <span>Threshold Boundary</span>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-[#1e293b]">
          Autoencoder Confidence: <span className="text-emerald-600">98.4%</span>
        </div>
      </div>
    </div>
  );
};
