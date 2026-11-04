import React, { useState, useCallback } from 'react';
import { Zap, Thermometer, Radio, Cpu, Shield, Wind } from 'lucide-react';

// ─── Status color tokens (Swiss Neo-Brutalist palette) ───────────────────────
const STATUS_STYLES = {
  CRITICAL: {
    bg: '#3b0000',
    border: '#ef4444',
    shadow: '3px 3px 0px #ef4444',
    text: '#fca5a5',
    label: '#ef4444',
    badge: 'bg-red-600 text-white',
  },
  PROPAGATING: {
    bg: '#451a03',
    border: '#fea619',
    shadow: '3px 3px 0px #fea619',
    text: '#fcd34d',
    label: '#fea619',
    badge: 'bg-amber-500 text-black',
  },
  WARNING: {
    bg: '#422006',
    border: '#fbbf24',
    shadow: '2px 2px 0px #fbbf24',
    text: '#fde68a',
    label: '#fbbf24',
    badge: 'bg-yellow-400 text-black',
  },
  NOMINAL: {
    bg: '#ebdccb',
    border: '#452a19',
    shadow: '2px 2px 0px #452a19',
    text: '#452a19',
    label: '#452a19',
    badge: 'bg-emerald-600 text-white',
  },
};

// Subsystem icon mapping
const SUBSYSTEM_ICONS = {
  EPS: Zap,
  TCS: Thermometer,
  ADCS: Wind,
  'TT&C': Radio,
  AVIONICS: Cpu,
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_W = 176;
const NODE_H = 74;
const COL_GAP = 224;
const ROW_GAP = 142;
const CANVAS_PADDING = 36;

// Maps nodes to SVG coordinates based on layer/col
function computeLayout(nodes) {
  const positions = {};
  nodes.forEach((n, i) => {
    const col = typeof n.col === 'number' ? n.col : i;
    const layer = typeof n.layer === 'number' ? n.layer : 0;
    positions[n.id] = {
      x: CANVAS_PADDING + col * COL_GAP,
      y: CANVAS_PADDING + layer * ROW_GAP,
    };
  });

  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const width = Math.max(...allX, 0) + NODE_W + CANVAS_PADDING + 140;
  const height = Math.max(...allY, 0) + NODE_H + CANVAS_PADDING + 20;

  return { positions, width, height };
}

// Prominent, high-contrast animated edge path with directional arrow
function EdgePath({ edge, positions }) {
  const src = positions[edge.source];
  const tgt = positions[edge.target];
  if (!src || !tgt) return null;

  const x1 = src.x + NODE_W / 2;
  const y1 = src.y + NODE_H;
  const x2 = tgt.x + NODE_W / 2;
  const y2 = tgt.y; // Arrow tip docks right at the top border of target node
  const midY = (y1 + y2) / 2;

  const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  const isActive = Boolean(edge.active);
  const strokeColor = isActive ? '#fea619' : '#deb887';
  const strokeW = isActive ? 3.5 : 2.5;
  const opacity = isActive ? 1.0 : 0.85;

  return (
    <g className="fta-edge-group">
      {/* 1. Deep black shadow underlay for bold visibility against dark canvas */}
      <path
        d={pathD}
        fill="none"
        stroke="#050302"
        strokeWidth={strokeW + 4}
        strokeOpacity={0.9}
        strokeLinecap="round"
      />

      {/* 2. Main visible connector line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeOpacity={opacity}
        strokeLinecap="round"
        strokeDasharray={isActive ? '8 4' : 'none'}
        markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow-nominal)'}
        filter={isActive ? 'url(#ftaGlow)' : undefined}
      />

      {/* 3. Dual animated flowing particles for active failure propagation */}
      {isActive && (
        <>
          {/* Amber glowing lead particle */}
          <circle r="5.5" fill="#fea619" filter="url(#ftaGlow)">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD} />
          </circle>
          {/* Hot white inner spark */}
          <circle r="3" fill="#ffffff" opacity="0.95">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD} />
          </circle>
          {/* Red warning trail particle */}
          <circle r="4.5" fill="#ef4444" opacity="0.85">
            <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite" path={pathD} />
          </circle>
        </>
      )}
    </g>
  );
}

// Individual node box
function FaultNode({ node, pos, onClick, isSelected }) {
  const style = STATUS_STYLES[node.status] || STATUS_STYLES.NOMINAL;
  const Icon = SUBSYSTEM_ICONS[node.subsystem] || Cpu;

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(node)}
    >
      {/* Selection ring */}
      {isSelected && (
        <rect
          x={-4} y={-4}
          width={NODE_W + 8} height={NODE_H + 8}
          rx={6}
          fill="none"
          stroke="#0284c7"
          strokeWidth={3}
          strokeDasharray="5 3"
        />
      )}

      {/* Node background */}
      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={4}
        fill={style.bg}
        stroke={style.border}
        strokeWidth={2}
        style={{ filter: node.status !== 'NOMINAL' ? `drop-shadow(${style.shadow})` : `drop-shadow(2px 2px 0 #452a19)` }}
      />

      {/* Pulsing ring for CRITICAL */}
      {node.status === 'CRITICAL' && (
        <rect
          x={0} y={0}
          width={NODE_W} height={NODE_H}
          rx={4}
          fill="none"
          stroke="#ef4444"
          strokeWidth={3}
          opacity="0.5"
        >
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="3;6;3" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Pulsing ring for PROPAGATING */}
      {node.status === 'PROPAGATING' && (
        <rect
          x={0} y={0}
          width={NODE_W} height={NODE_H}
          rx={4}
          fill="none"
          stroke="#fea619"
          strokeWidth={2.5}
          opacity="0.4"
        >
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Icon */}
      <foreignObject x={8} y={10} width={20} height={20}>
        <Icon
          style={{ width: 16, height: 16, color: style.label }}
          xmlns="http://www.w3.org/2000/svg"
        />
      </foreignObject>

      {/* Status dot */}
      <circle cx={NODE_W - 12} cy={12} r={5} fill={style.border}>
        {node.status === 'CRITICAL' && (
          <animate attributeName="r" values="5;7;5" dur="1s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Label */}
      <text
        x={NODE_W / 2}
        y={34}
        textAnchor="middle"
        fill={style.text}
        fontSize={10.5}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
      >
        {node.label.length > 22 ? node.label.substring(0, 20) + '…' : node.label}
      </text>

      {/* Subsystem badge */}
      <text
        x={NODE_W / 2}
        y={48}
        textAnchor="middle"
        fill={style.label}
        fontSize={9}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="600"
        opacity={0.9}
      >
        [{node.subsystem}]
      </text>

      {/* Live value */}
      <text
        x={NODE_W / 2}
        y={64}
        textAnchor="middle"
        fill={style.text}
        fontSize={9.5}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="500"
        opacity={0.95}
      >
        {node.live_value}
      </text>
    </g>
  );
}

// ─── Main FaultTreeGraph component ────────────────────────────────────────────
export function FaultTreeGraph({ nodes = [], edges = [], summary = {}, onNodeClick }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const handleNodeClick = useCallback((node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    if (onNodeClick) onNodeClick(node);
  }, [selectedNodeId, onNodeClick]);

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 rounded"
        style={{ background: '#ebdccb', border: '2px solid #452a19', boxShadow: '2px 2px 0 #452a19' }}>
        <div className="text-center">
          <Shield className="mx-auto mb-2 opacity-40" style={{ color: '#452a19', width: 40, height: 40 }} />
          <p className="font-mono text-sm font-bold" style={{ color: '#452a19' }}>
            AWAITING TELEMETRY STREAM…
          </p>
          <p className="font-mono text-xs mt-1 opacity-60" style={{ color: '#452a19' }}>
            Connect WebSocket to visualize live fault cascade
          </p>
        </div>
      </div>
    );
  }

  const { positions, width, height } = computeLayout(nodes);

  // Status counts from summary
  const critical = summary.critical ?? 0;
  const propagating = summary.propagating ?? 0;
  const warning = summary.warning ?? 0;
  const nominal = summary.nominal ?? 0;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Summary status bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: 'CRITICAL', count: critical, color: '#ef4444', bg: '#3b0000' },
          { label: 'PROPAGATING', count: propagating, color: '#fea619', bg: '#451a03' },
          { label: 'WARNING', count: warning, color: '#fbbf24', bg: '#422006' },
          { label: 'NOMINAL', count: nominal, color: '#059669', bg: '#ebdccb' },
        ].map(({ label, count, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1 rounded text-xs font-bold"
            style={{
              background: bg,
              border: `2px solid ${color}`,
              boxShadow: `2px 2px 0 ${color}`,
              color: color,
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            {count} {label}
          </div>
        ))}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded text-xs font-bold ml-auto"
          style={{ background: '#ebdccb', border: '2px solid #452a19', color: '#452a19' }}
        >
          {nodes.length} NODES · {edges.length} EDGES
        </div>
      </div>

      {/* SVG Graph canvas */}
      <div
        className="overflow-x-auto rounded"
        style={{
          background: '#1a0e08',
          border: '2px solid #452a19',
          boxShadow: '2px 2px 0 #452a19',
        }}
      >
        <svg
          width={width}
          height={height}
          style={{ minWidth: '100%', display: 'block' }}
        >
          {/* SVG Definitions: Grids, Glow Filters, and Arrowheads */}
          <defs>
            {/* Grid dots background */}
            <pattern id="ftaGrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" fill="#452a19" opacity="0.35" />
            </pattern>

            {/* Glowing amber filter for active failure vectors */}
            <filter id="ftaGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Nominal Arrowhead */}
            <marker
              id="arrow-nominal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#deb887" />
            </marker>

            {/* Active / Propagating Arrowhead */}
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#fea619" />
            </marker>
          </defs>

          <rect width={width} height={height} fill="url(#ftaGrid)" />

          {/* Layer architectural labels */}
          {[
            { y: CANVAS_PADDING + NODE_H / 2 + 4, label: 'LAYER 0 · SENSORS & POWER GENERATION' },
            { y: CANVAS_PADDING + ROW_GAP + NODE_H / 2 + 4, label: 'LAYER 1 · MAIN POWER DISTRIBUTION' },
            { y: CANVAS_PADDING + 2 * ROW_GAP + NODE_H / 2 + 4, label: 'LAYER 2 · FUNCTIONAL SUBSYSTEMS' },
            { y: CANVAS_PADDING + 3 * ROW_GAP + NODE_H / 2 + 4, label: 'LAYER 3 · FLIGHT AUTONOMY & SAFE-MODE' },
          ].map(({ y, label }) => (
            <text
              key={label}
              x={width - 16}
              y={y}
              textAnchor="end"
              fill="#ebdccb"
              fontSize={10}
              fontFamily="'JetBrains Mono', monospace"
              opacity={0.4}
              fontWeight="600"
            >
              {label}
            </text>
          ))}

          {/* Render edges first (under nodes) */}
          {edges.map((edge, i) => (
            <EdgePath
              key={`${edge.source}-${edge.target}-${i}`}
              edge={edge}
              positions={positions}
            />
          ))}

          {/* Render nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            return (
              <FaultNode
                key={node.id}
                node={node}
                pos={pos}
                onClick={handleNodeClick}
                isSelected={node.id === selectedNodeId}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs" style={{ color: '#452a19', fontFamily: "'JetBrains Mono', monospace" }}>
        <p className="opacity-75">
          <span className="font-bold">Legend:</span> Cream solid lines (<span className="text-[#a16207] font-bold">#deb887</span>) = Nominal dependency · Glowing amber dashed lines (<span className="text-[#d97706] font-bold">#fea619</span>) = Active failure vector
        </p>
        <p className="opacity-60 text-[11px]">
          Click any node to inspect live sensor telemetry & thresholds
        </p>
      </div>
    </div>
  );
}
