import React, { useState, useRef, useMemo } from 'react';
import {
  Download,
  Maximize2,
  Minimize2,
  Check,
  ChevronDown,
} from 'lucide-react';

/**
 * SynchronizedWaveformChart:
 * Industry-standard multi-channel synchronized waveform visualizer matching user reference.
 * Features:
 * - 4 synchronized telemetry channels: Temperature, Regulated Bus, Li-Ion, Photovoltaic
 * - Multi-Y-Axis system: Left for Temperature, 3 Stacked Right Axes for Voltage, Battery, and PV
 * - Smooth Bezier spline curves with layered translucent gradient area fills
 * - Interactive hover scrubber with crosshair, curve intersection dots, and floating dark HUD tooltip
 * - Channel toggle checkboxes
 * - Time window selector (10s, 30s, 1m, 5m, 10m)
 * - Auto-scroll toggle
 * - Bottom timeline minimap scrubber track
 * - CSV export
 */
export const SynchronizedWaveformChart = ({
  history = [],
  isCrisis = false,
}) => {
  // Channel visibility toggles
  const [channels, setChannels] = useState({
    temp: true,
    voltage: true,
    battery: true,
    solar: true,
  });

  // Controls state
  const [timeWindow, setTimeWindow] = useState('30s');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('Overlay');

  // Interactive Hover Scrubber State
  const [hoverData, setHoverData] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Toggle individual channel
  const toggleChannel = (key) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Determine window sample count
  const windowCount = useMemo(() => {
    switch (timeWindow) {
      case '10s': return 10;
      case '30s': return 30;
      case '1m': return 45;
      case '5m': return 60;
      case '10m': return 60;
      default: return 30;
    }
  }, [timeWindow]);

  // Active slice of data
  const activeData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.slice(-windowCount);
  }, [history, windowCount]);

  // SVG Chart Dimensions & Margins
  const width = 1000;
  const height = 340;
  const paddingLeft = 55;   // Left Temperature axis
  const paddingRight = 175;  // 3 Right axes: Voltage (45px) + Battery (45px) + PV (45px) + labels
  const paddingTop = 25;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Scales configuration:
  // Temperature: 0 to 100 °C
  // Voltage: 0 to 30 V
  // Battery: 0 to 100 %
  // PV: 0 to 100 %
  const scales = {
    temp: { min: 0, max: 100, color: '#ef4444', unit: '°C' },
    voltage: { min: 0, max: 30, color: '#3b82f6', unit: 'V' },
    battery: { min: 0, max: 100, color: '#10b981', unit: '%' },
    solar: { min: 0, max: 100, color: '#f97316', unit: '%' },
  };

  // Convert data value to Y pixel
  const getY = (val, scaleKey) => {
    const scale = scales[scaleKey];
    const clamped = Math.max(scale.min, Math.min(scale.max, val ?? scale.min));
    const ratio = (clamped - scale.min) / (scale.max - scale.min);
    return paddingTop + (1 - ratio) * plotHeight;
  };

  // Convert index to X pixel
  const getX = (idx, total) => {
    if (total <= 1) return paddingLeft;
    return paddingLeft + (idx / (total - 1)) * plotWidth;
  };

  // Helper to build smooth cubic Bezier path
  const buildSmoothPath = (points) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      path += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  // Pre-calculate spline paths for each active channel
  const chartPaths = useMemo(() => {
    const total = activeData.length;
    if (total < 2) return {};

    const res = {};
    ['temp', 'voltage', 'battery', 'solar'].forEach((key) => {
      const pts = activeData.map((d, i) => ({
        x: getX(i, total),
        y: getY(d[key], key),
        val: d[key],
      }));
      const lineD = buildSmoothPath(pts);
      const areaD = `${lineD} L ${pts[pts.length - 1].x} ${paddingTop + plotHeight} L ${pts[0].x} ${paddingTop + plotHeight} Z`;
      res[key] = { pts, lineD, areaD };
    });

    return res;
  }, [activeData]);

  // Handle Mouse Move for Interactive Scrubber Crosshair
  const handleMouseMove = (e) => {
    if (!svgRef.current || activeData.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    // Check if within plot area
    if (mouseX < paddingLeft || mouseX > paddingLeft + plotWidth) {
      setHoverData(null);
      return;
    }

    // Find closest index
    const ratio = (mouseX - paddingLeft) / plotWidth;
    const idx = Math.min(
      activeData.length - 1,
      Math.max(0, Math.round(ratio * (activeData.length - 1)))
    );

    const datum = activeData[idx];
    const snapX = getX(idx, activeData.length);

    // Calculate time offset relative to latest (e.g. -18.4s)
    const offsetSeconds = -((activeData.length - 1 - idx) * (30 / Math.max(1, activeData.length - 1))).toFixed(1);

    setHoverData({
      x: snapX,
      idx,
      datum,
      offset: offsetSeconds === '0.0' ? 'T-0 Live' : `T ${offsetSeconds}s`,
      screenX: e.clientX,
      screenY: e.clientY,
      dots: {
        temp: { y: getY(datum.temp, 'temp'), val: datum.temp?.toFixed(1) },
        voltage: { y: getY(datum.voltage, 'voltage'), val: datum.voltage?.toFixed(1) },
        battery: { y: getY(datum.battery, 'battery'), val: datum.battery?.toFixed(1) },
        solar: { y: getY(datum.solar, 'solar'), val: datum.solar?.toFixed(1) },
      },
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (!activeData || activeData.length === 0) return;
    const headers = 'Time,Temperature(°C),Regulated(V),Battery(%),Photovoltaic(%)\n';
    const rows = activeData
      .map(
        (d) =>
          `${d.time || ''},${d.temp || ''},${d.voltage || ''},${d.battery || ''},${d.solar || ''}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astra-telemetry-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-4 select-none relative transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 overflow-auto bg-white shadow-2xl' : ''
      }`}
    >
      {/* 1. Top Header Controls Bar (exact reference) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-sans font-bold text-lg text-[#161514] tracking-tight">
            Synchronized Multi-Channel Waveform
          </h2>
          <p className="text-xs font-sans text-[#736f68] mt-0.5">
            Real-time telemetry data ({timeWindow === '30s' ? '30 seconds' : timeWindow} sliding window)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Window Segmented Control */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-mono">
            {['10s', '30s', '1m', '5m', '10m'].map((win) => (
              <button
                key={win}
                onClick={() => setTimeWindow(win)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeWindow === win
                    ? 'bg-[#1e293b] text-white font-semibold shadow-xs'
                    : 'text-[#64748b] hover:text-[#161514]'
                }`}
              >
                {win}
              </button>
            ))}
          </div>

          {/* Auto-scroll Switch */}
          <div className="flex items-center gap-2 text-xs font-sans text-[#64748b] pl-2 border-l border-slate-200">
            <span>Auto-scroll</span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer flex items-center ${
                autoScroll ? 'bg-[#1e293b]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                  autoScroll ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-sans font-semibold text-[#1e293b] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
          </button>
        </div>
      </div>

      {/* 2. Channel Checkboxes & View Bar (exact reference) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b border-slate-100">
        {/* Checkbox Pills on Left */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Temperature */}
          <button
            onClick={() => toggleChannel('temp')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold transition-all cursor-pointer ${
              channels.temp
                ? 'bg-rose-50/90 border-rose-200 text-[#ef4444] shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                channels.temp ? 'bg-[#ef4444] text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {channels.temp && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Temperature (°C)</span>
          </button>

          {/* Regulated Voltage */}
          <button
            onClick={() => toggleChannel('voltage')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold transition-all cursor-pointer ${
              channels.voltage
                ? 'bg-blue-50/90 border-blue-200 text-[#3b82f6] shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                channels.voltage ? 'bg-[#3b82f6] text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {channels.voltage && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Regulated (V)</span>
          </button>

          {/* Li-Ion Battery */}
          <button
            onClick={() => toggleChannel('battery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold transition-all cursor-pointer ${
              channels.battery
                ? 'bg-emerald-50/90 border-emerald-200 text-[#10b981] shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                channels.battery ? 'bg-[#10b981] text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {channels.battery && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Li-Ion (%)</span>
          </button>

          {/* Photovoltaic */}
          <button
            onClick={() => toggleChannel('solar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold transition-all cursor-pointer ${
              channels.solar
                ? 'bg-amber-50/90 border-amber-200 text-[#f97316] shadow-2xs'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                channels.solar ? 'bg-[#f97316] text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {channels.solar && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Photovoltaic (%)</span>
          </button>
        </div>

        {/* View mode & Fullscreen Controls on Right */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#736f68] font-sans">
            <span>View</span>
            <div className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-[#161514] flex items-center gap-1.5 cursor-pointer">
              <span>{viewMode}</span>
              <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[#736f68] hover:text-[#161514] transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Main Multi-Y-Axis SVG Canvas */}
      <div className="relative w-full h-[360px] bg-white rounded-xl overflow-visible">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Temperature Rose Layered Gradient Area Fill */}
            <linearGradient id="temp-wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
            </linearGradient>

            {/* Regulated Blue Gradient */}
            <linearGradient id="volt-wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Dashed Grid Lines across chart area */}
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

          {/* --- LEFT Y-AXIS: TEMPERATURE (°C) in RED --- */}
          {channels.temp && (
            <g className="font-mono text-[10px] select-none">
              {/* Vertical axis line */}
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={paddingLeft}
                y2={paddingTop + plotHeight}
                stroke="#fecdd3"
                strokeWidth="1.2"
              />
              {/* Ticks: 100, 80, 60, 40, 20, 0 */}
              {[100, 80, 60, 40, 20, 0].map((t) => {
                const y = getY(t, 'temp');
                return (
                  <g key={t}>
                    <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="#fecdd3" />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#ef4444"
                      className="font-bold"
                    >
                      {t}
                    </text>
                  </g>
                );
              })}
              {/* Axis Label */}
              <text
                x={14}
                y={paddingTop + plotHeight / 2}
                fill="#ef4444"
                textAnchor="middle"
                transform={`rotate(-90 14 ${paddingTop + plotHeight / 2})`}
                className="font-sans text-[11px] font-bold"
              >
                Temperature (°C)
              </text>
            </g>
          )}

          {/* --- RIGHT Y-AXIS 1: VOLTAGE (V) in BLUE --- */}
          {channels.voltage && (
            <g className="font-mono text-[10px] select-none">
              <line
                x1={paddingLeft + plotWidth + 12}
                y1={paddingTop}
                x2={paddingLeft + plotWidth + 12}
                y2={paddingTop + plotHeight}
                stroke="#bfdbfe"
                strokeWidth="1.2"
              />
              {[30, 20, 10, 0].map((t) => {
                const y = getY(t, 'voltage');
                return (
                  <g key={t}>
                    <line
                      x1={paddingLeft + plotWidth + 12}
                      y1={y}
                      x2={paddingLeft + plotWidth + 16}
                      y2={y}
                      stroke="#bfdbfe"
                    />
                    <text
                      x={paddingLeft + plotWidth + 20}
                      y={y + 3.5}
                      textAnchor="start"
                      fill="#3b82f6"
                      className="font-bold"
                    >
                      {t}
                    </text>
                  </g>
                );
              })}
              <text
                x={paddingLeft + plotWidth + 42}
                y={paddingTop + plotHeight / 2}
                fill="#3b82f6"
                textAnchor="middle"
                transform={`rotate(-90 ${paddingLeft + plotWidth + 42} ${paddingTop + plotHeight / 2})`}
                className="font-sans text-[10px] font-bold"
              >
                Voltage (V)
              </text>
            </g>
          )}

          {/* --- RIGHT Y-AXIS 2: BATTERY (%) in GREEN --- */}
          {channels.battery && (
            <g className="font-mono text-[10px] select-none">
              <line
                x1={paddingLeft + plotWidth + 66}
                y1={paddingTop}
                x2={paddingLeft + plotWidth + 66}
                y2={paddingTop + plotHeight}
                stroke="#a7f3d0"
                strokeWidth="1.2"
              />
              {[100, 75, 50, 25, 0].map((t) => {
                const y = getY(t, 'battery');
                return (
                  <g key={t}>
                    <line
                      x1={paddingLeft + plotWidth + 66}
                      y1={y}
                      x2={paddingLeft + plotWidth + 70}
                      y2={y}
                      stroke="#a7f3d0"
                    />
                    <text
                      x={paddingLeft + plotWidth + 74}
                      y={y + 3.5}
                      textAnchor="start"
                      fill="#10b981"
                      className="font-bold"
                    >
                      {t}
                    </text>
                  </g>
                );
              })}
              <text
                x={paddingLeft + plotWidth + 102}
                y={paddingTop + plotHeight / 2}
                fill="#10b981"
                textAnchor="middle"
                transform={`rotate(-90 ${paddingLeft + plotWidth + 102} ${paddingTop + plotHeight / 2})`}
                className="font-sans text-[10px] font-bold"
              >
                Battery (%)
              </text>
            </g>
          )}

          {/* --- RIGHT Y-AXIS 3: PV (%) in ORANGE --- */}
          {channels.solar && (
            <g className="font-mono text-[10px] select-none">
              <line
                x1={paddingLeft + plotWidth + 125}
                y1={paddingTop}
                x2={paddingLeft + plotWidth + 125}
                y2={paddingTop + plotHeight}
                stroke="#fed7aa"
                strokeWidth="1.2"
              />
              {[100, 75, 50, 25, 0].map((t) => {
                const y = getY(t, 'solar');
                return (
                  <g key={t}>
                    <line
                      x1={paddingLeft + plotWidth + 125}
                      y1={y}
                      x2={paddingLeft + plotWidth + 129}
                      y2={y}
                      stroke="#fed7aa"
                    />
                    <text
                      x={paddingLeft + plotWidth + 133}
                      y={y + 3.5}
                      textAnchor="start"
                      fill="#f97316"
                      className="font-bold"
                    >
                      {t}
                    </text>
                  </g>
                );
              })}
              <text
                x={paddingLeft + plotWidth + 162}
                y={paddingTop + plotHeight / 2}
                fill="#f97316"
                textAnchor="middle"
                transform={`rotate(-90 ${paddingLeft + plotWidth + 162} ${paddingTop + plotHeight / 2})`}
                className="font-sans text-[10px] font-bold"
              >
                PV (%)
              </text>
            </g>
          )}

          {/* --- THE TELEMETRY SPLINE CURVES --- */}
          {/* 1. Temperature Area Fill + Line */}
          {channels.temp && chartPaths.temp && (
            <g>
              <path d={chartPaths.temp.areaD} fill="url(#temp-wave-fill)" />
              <path
                d={chartPaths.temp.lineD}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 2. Regulated Bus Voltage Line */}
          {channels.voltage && chartPaths.voltage && (
            <g>
              <path d={chartPaths.voltage.areaD} fill="url(#volt-wave-fill)" />
              <path
                d={chartPaths.voltage.lineD}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 3. Li-Ion Battery Line */}
          {channels.battery && chartPaths.battery && (
            <path
              d={chartPaths.battery.lineD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* 4. Photovoltaic Solar Line */}
          {channels.solar && chartPaths.solar && (
            <path
              d={chartPaths.solar.lineD}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* --- INTERACTIVE SCRUBBER CROSSHAIR & INTERSECTION DOTS --- */}
          {hoverData && (
            <g className="pointer-events-none transition-all">
              {/* Vertical Dashed Scrubber Line */}
              <line
                x1={hoverData.x}
                y1={paddingTop}
                x2={hoverData.x}
                y2={paddingTop + plotHeight}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />

              {/* Curve Intersection Dots */}
              {channels.temp && (
                <g>
                  <circle cx={hoverData.x} cy={hoverData.dots.temp.y} r="5" fill="#ef4444" />
                  <circle cx={hoverData.x} cy={hoverData.dots.temp.y} r="8" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.4" />
                </g>
              )}

              {channels.voltage && (
                <g>
                  <circle cx={hoverData.x} cy={hoverData.dots.voltage.y} r="5" fill="#3b82f6" />
                  <circle cx={hoverData.x} cy={hoverData.dots.voltage.y} r="8" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" />
                </g>
              )}

              {channels.battery && (
                <g>
                  <circle cx={hoverData.x} cy={hoverData.dots.battery.y} r="5" fill="#10b981" />
                  <circle cx={hoverData.x} cy={hoverData.dots.battery.y} r="8" fill="none" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
                </g>
              )}

              {channels.solar && (
                <g>
                  <circle cx={hoverData.x} cy={hoverData.dots.solar.y} r="5" fill="#f97316" />
                  <circle cx={hoverData.x} cy={hoverData.dots.solar.y} r="8" fill="none" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.4" />
                </g>
              )}
            </g>
          )}

          {/* --- BOTTOM X-AXIS TICKS & LIVE MARKER --- */}
          <g className="font-mono text-[11px] text-[#94a3b8] select-none">
            <line
              x1={paddingLeft}
              y1={paddingTop + plotHeight}
              x2={paddingLeft + plotWidth}
              y2={paddingTop + plotHeight}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            {['-30s', '-25s', '-20s', '-15s', '-10s', '-5s'].map((label, idx) => {
              const x = paddingLeft + (idx / 6) * plotWidth;
              return (
                <text key={label} x={x} y={paddingTop + plotHeight + 18} textAnchor="middle">
                  {label}
                </text>
              );
            })}
            {/* T-0 Live Marker in bold red text */}
            <text
              x={paddingLeft + plotWidth}
              y={paddingTop + plotHeight + 18}
              textAnchor="end"
              fill="#ef4444"
              className="font-bold"
            >
              T-0 <tspan fill="#161514">Live</tspan>
            </text>
          </g>
        </svg>

        {/* Floating Dark HUD Scrubber Tooltip */}
        {hoverData && (
          <div
            className="absolute bg-[#111827] text-white border border-slate-700/80 rounded-xl p-3 shadow-2xl z-30 pointer-events-none transition-all duration-75 text-xs font-mono"
            style={{
              left: Math.min(width - 200, Math.max(paddingLeft, hoverData.x - 70)),
              top: 15,
            }}
          >
            <div className="text-[11px] font-bold text-slate-300 pb-1.5 border-b border-slate-700/60 flex items-center justify-between gap-4">
              <span>{hoverData.offset}</span>
              <span className="text-[9px] text-slate-400 font-normal">
                {hoverData.datum.time || '10Hz'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 pt-2">
              {channels.temp && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-slate-300">Temperature</span>
                  </div>
                  <strong className="text-white font-bold">{hoverData.dots.temp.val} °C</strong>
                </div>
              )}

              {channels.voltage && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                    <span className="text-slate-300">Regulated</span>
                  </div>
                  <strong className="text-white font-bold">{hoverData.dots.voltage.val} V</strong>
                </div>
              )}

              {channels.battery && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <span className="text-slate-300">Li-Ion</span>
                  </div>
                  <strong className="text-white font-bold">{hoverData.dots.battery.val} %</strong>
                </div>
              )}

              {channels.solar && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                    <span className="text-slate-300">Photovoltaic</span>
                  </div>
                  <strong className="text-white font-bold">{hoverData.dots.solar.val} %</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Range Minimap / Timeline Scrubber Track (exact reference) */}
      <div className="pt-2">
        <div className="h-9 w-full rounded-xl bg-slate-50 border border-slate-200/80 relative overflow-hidden flex items-center px-1 shadow-inner">
          {/* Background overview sparkline */}
          <div className="absolute inset-0 opacity-25 flex items-center">
            <svg className="w-full h-6" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path
                d="M 0 10 Q 15 3, 30 12 T 60 8 T 85 14 L 100 9"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Active Range Viewport Lens with Handles */}
          <div
            className="absolute h-7 rounded-lg border-2 border-[#3b82f6] bg-[#3b82f6]/10 backdrop-blur-xs flex items-center justify-between px-1 shadow-xs cursor-ew-resize"
            style={{ left: '60%', width: '38%' }}
          >
            {/* Left handle */}
            <div className="w-1.5 h-4 rounded-xs bg-[#3b82f6] opacity-80" />
            {/* Right handle */}
            <div className="w-1.5 h-4 rounded-xs bg-[#3b82f6] opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};
