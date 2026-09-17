import React from 'react';

export const TelemetrySparkline = ({
  data = [],
  dataKey = 'temp',
  strokeColor = '#fea619',
  fillGradientId = 'grad-spark',
  height = 56,
  minVal,
  maxVal,
}) => {
  if (!data || data.length < 2) {
    return <div className="h-14 w-full bg-slate-50 rounded" />;
  }

  const values = data.map((d) => d[dataKey] ?? 0);
  const min = minVal !== undefined ? minVal : Math.min(...values);
  const max = maxVal !== undefined ? maxVal : Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const width = 300;
  const padding = 6;
  const effectiveHeight = height - padding * 2;

  // Build SVG path points
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const normalized = (val - min) / range;
    const y = height - padding - normalized * effectiveHeight;
    return { x, y };
  });

  // Create smooth Bezier curve path string
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    pathD += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <div className="w-full relative overflow-hidden" style={{ height }}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <path d={areaD} fill={`url(#${fillGradientId})`} />

        {/* Foreground Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current Value Head Pip */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3.5"
          fill="#233446"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};
