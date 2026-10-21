import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Radio,
  Activity,
  Layers,
  Zap,
  Thermometer,
  Compass,
  ArrowRight,
  RefreshCw,
  Cpu,
  Globe,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const FleetOverviewPage = () => {
  const {
    activeSpacecraft,
    switchSpacecraft,
    fleetNodes,
    islLinks,
    fleetSummary,
    setActiveTab,
    playAlertChime,
  } = useMission();

  const [pingActive, setPingActive] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);

  const handleDiagnosticPing = () => {
    setPingActive(true);
    playAlertChime('normal');
    setTimeout(() => {
      setPingActive(false);
      playAlertChime('success');
    }, 1200);
  };

  const handleExportFleetReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      fleet_summary: fleetSummary,
      spacecraft_nodes: fleetNodes,
      isl_links: islLinks,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASTRA_CONSTELLATION_FLEET_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playAlertChime('success');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#452a19] text-[#fea619] flex items-center justify-center border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b]">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl text-[#24140b] tracking-tight">
                Constellation Fleet & Mesh View
              </h1>
              <p className="text-xs font-mono text-[#73533e] mt-0.5">
                Multi-Spacecraft Telemetry Ingestion • Inter-Satellite Links (ISL) • Orbital Mesh Topology
              </p>
            </div>
          </div>
        </div>

        {/* Global Constellation Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDiagnosticPing}
            disabled={pingActive}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#ebdccb] hover:bg-white text-[#24140b] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] font-mono text-xs font-bold transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#452a19] ${pingActive ? 'animate-spin' : ''}`} />
            <span>{pingActive ? 'PINGING MESH...' : 'PING ISL MESH'}</span>
          </button>

          <button
            onClick={handleExportFleetReport}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#fea619] hover:bg-[#ffb43a] text-[#24140b] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] font-mono text-xs font-extrabold transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>EXPORT FLEET JSON</span>
          </button>
        </div>
      </div>

      {/* Fleet-Wide Aggregated Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#ffffff] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">Active Fleet</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-black text-[#24140b]">{fleetSummary?.total_spacecraft || 3}</span>
            <span className="text-xs font-mono text-[#73533e]">Nodes</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold mt-1">● 100% Orbiting</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#ffffff] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">Total Channels</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-black text-[#24140b]">
              {fleetSummary?.total_monitored_channels || 246}
            </span>
            <span className="text-xs font-mono text-[#73533e]">Sensors</span>
          </div>
          <span className="text-[10px] font-mono text-[#73533e] font-semibold mt-1">82 Channels × 3</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#ffffff] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">Avg Fleet Health</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-black text-[#24140b]">
              {fleetSummary?.avg_health_score || 95.0}%
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold mt-1">● Nominal Envelope</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#ffffff] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">ISL Crosslinks</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-black text-[#24140b]">
              {fleetSummary?.active_mesh_links || 3} / 3
            </span>
            <span className="text-xs font-mono text-[#73533e]">Mesh</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold mt-1">● Full Topology</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#ffffff] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">ISL Avg Latency</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-xl font-black text-[#24140b]">
              {fleetSummary?.isl_avg_latency_ms || 27.1}
            </span>
            <span className="text-xs font-mono text-[#73533e]">ms</span>
          </div>
          <span className="text-[10px] font-mono text-[#73533e] font-semibold mt-1">Cross-Orbital</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#ffffff] border-2 border-[#452a19] shadow-[2px_2px_0px_0px_#452a19] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">Active Focus</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm">🛰️</span>
            <span className="font-mono text-sm font-black text-[#24140b] truncate">
              {activeSpacecraft?.replace('ASTRA-', '') || 'ALPHA'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-700 font-bold mt-1">Ground Uplink Lock</span>
        </div>
      </div>

      {/* Section 1: Constellation Spacecraft Grid (3 Prominent Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display font-extrabold text-lg text-[#24140b] tracking-tight flex items-center gap-2">
            <span>Constellation Node Telemetry Deck</span>
            <span className="text-xs font-mono font-normal text-[#73533e]">(3 Active Spacecraft)</span>
          </h2>
          <span className="text-xs font-mono text-[#73533e]">Click card to switch ground monitoring focus</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(fleetNodes || []).map((node) => {
            const isSelected = node.id === activeSpacecraft;
            const t = node.telemetry || {};

            return (
              <div
                key={node.id}
                onClick={() => switchSpacecraft(node.id)}
                className={`rounded-3xl p-5 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#ebdccb] border-[#452a19] shadow-[4px_4px_0px_0px_#452a19] translate-y-[-2px]'
                    : 'bg-white border-[#452a19]/40 hover:border-[#452a19] shadow-[2px_2px_0px_0px_#452a19]/30 hover:shadow-[3px_3px_0px_0px_#452a19]'
                }`}
              >
                {/* Top Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[#452a19]/20 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 border-[#452a19] ${
                          isSelected ? 'bg-[#fea619]' : 'bg-[#ebdccb]'
                        }`}
                      >
                        <span className="text-lg">🛰️</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-black text-base text-[#24140b] leading-tight">
                            {node.name}
                          </h3>
                        </div>
                        <span className="font-mono text-[11px] text-[#73533e] font-semibold block mt-0.5">
                          {node.orbit_regime}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                          node.status === 'CRITICAL'
                            ? 'bg-red-500 text-white'
                            : node.status === 'WARNING'
                            ? 'bg-amber-400 text-[#24140b]'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {node.status}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-mono font-bold uppercase text-[#452a19] bg-[#fea619] px-1.5 py-0.5 rounded border border-[#452a19]">
                          ACTIVE FOCUS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Health Score Gauge */}
                  <div className="my-3.5 p-3 rounded-2xl bg-[#f7f4ee] border border-[#452a19]/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-[#73533e]">Overall Health</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono text-2xl font-black text-[#24140b]">{node.health_score}%</span>
                        <span className="text-xs font-mono text-[#73533e]">Nominal Rating</span>
                      </div>
                    </div>

                    <div className="w-16 h-2 rounded-full bg-[#ebdccb] overflow-hidden border border-[#452a19]/40">
                      <div
                        className={`h-full ${
                          node.health_score > 90
                            ? 'bg-emerald-600'
                            : node.health_score > 75
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${node.health_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Real-time Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 my-2 font-mono">
                    <div className="p-2 rounded-xl bg-[#f7f4ee] border border-[#452a19]/20">
                      <span className="text-[9px] font-semibold uppercase text-[#73533e] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-700" /> Bus Voltage
                      </span>
                      <span className="text-xs font-bold text-[#24140b] block mt-0.5">
                        {t.voltage ? `${t.voltage} V` : '24.10 V'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#f7f4ee] border border-[#452a19]/20">
                      <span className="text-[9px] font-semibold uppercase text-[#73533e] flex items-center gap-1">
                        <Thermometer className="w-2.5 h-2.5 text-red-600" /> Thermal Core
                      </span>
                      <span className="text-xs font-bold text-[#24140b] block mt-0.5">
                        {t.temperature ? `${t.temperature} °C` : '15.20 °C'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#f7f4ee] border border-[#452a19]/20">
                      <span className="text-[9px] font-semibold uppercase text-[#73533e] flex items-center gap-1">
                        <Activity className="w-2.5 h-2.5 text-emerald-700" /> Battery SOC
                      </span>
                      <span className="text-xs font-bold text-[#24140b] block mt-0.5">
                        {t.battery_pct ? `${t.battery_pct} %` : '98.40 %'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#f7f4ee] border border-[#452a19]/20">
                      <span className="text-[9px] font-semibold uppercase text-[#73533e] flex items-center gap-1">
                        <Compass className="w-2.5 h-2.5 text-blue-700" /> ADCS Drift
                      </span>
                      <span className="text-xs font-bold text-[#24140b] block mt-0.5">
                        {t.adcs_drift ? `${t.adcs_drift} °/hr` : '0.020 °/hr'}
                      </span>
                    </div>
                  </div>

                  {/* Subsystem Health Indicators */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#452a19]/20 text-[10px] font-mono">
                    <span className="text-[#73533e] font-semibold">Subsystems:</span>
                    <div className="flex items-center gap-1.5">
                      {Object.entries(node.subsystems || { eps: 'NOMINAL', tcs: 'NOMINAL', adcs: 'NOMINAL', ttc: 'NOMINAL' }).map(
                        ([sub, stat]) => (
                          <span
                            key={sub}
                            title={`${sub.toUpperCase()}: ${stat}`}
                            className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              stat === 'CRITICAL'
                                ? 'bg-red-500 text-white'
                                : stat === 'WARNING'
                                ? 'bg-amber-400 text-[#24140b]'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                            }`}
                          >
                            {sub}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-[#452a19]/20 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      switchSpacecraft(node.id);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl border-2 border-[#452a19] text-xs font-mono font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                      isSelected
                        ? 'bg-[#452a19] text-[#fbf7f0] cursor-default'
                        : 'bg-[#ebdccb] hover:bg-white text-[#24140b] shadow-[1.5px_1.5px_0px_0px_#452a19]'
                    }`}
                  >
                    {isSelected ? '✓ ACTIVE FOCUS' : 'FOCUS THIS SATELLITE'}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      switchSpacecraft(node.id);
                      setActiveTab('telemetry');
                    }}
                    title="Inspect Live Waveforms"
                    className="p-1.5 rounded-xl border-2 border-[#452a19] bg-[#f7f4ee] hover:bg-white text-[#24140b] shadow-[1.5px_1.5px_0px_0px_#452a19] transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Inter-Satellite Link (ISL) Mesh Topology Panel */}
      <div className="rounded-3xl bg-white border-2 border-[#452a19] shadow-[3px_3px_0px_0px_#452a19] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#452a19]/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#452a19]" />
              <h2 className="font-display font-extrabold text-lg text-[#24140b] tracking-tight">
                Inter-Satellite Link (ISL) Mesh Topology
              </h2>
            </div>
            <p className="text-xs font-mono text-[#73533e] mt-0.5">
              Real-time cross-orbital packet routing, latency tracking, and link SNR monitoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Full Mesh Active (3 / 3 Links)</span>
            </span>
          </div>
        </div>

        {/* Graphical Mesh Topology Visualization */}
        <div className="my-6 p-6 rounded-2xl bg-[#f7f4ee] border-2 border-[#452a19] relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {/* Visual Crosslink 1: Alpha <-> Beta */}
            <div
              onClick={() => setSelectedLink(islLinks[0])}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedLink?.id === 1
                  ? 'bg-[#ebdccb] border-[#452a19] shadow-[3px_3px_0px_0px_#452a19]'
                  : 'bg-white border-[#452a19]/30 hover:border-[#452a19]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                <span className="text-[#24140b]">🛰️ ALPHA ↔ 🛰️ BETA</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  {islLinks[0]?.status || 'OPTIMAL'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-[#24140b]">
                  {islLinks[0]?.latency_ms || 18.4} ms
                </span>
                <span className="text-xs font-mono text-[#73533e]">Crosslink Latency</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#73533e] mt-2 pt-2 border-t border-[#452a19]/10">
                <span>Loss: {islLinks[0]?.packet_loss_pct || 0.01}%</span>
                <span>SNR: {islLinks[0]?.snr_db || 16.8} dB</span>
                <span>{islLinks[0]?.throughput_mbps || 120} Mbps</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-[#452a19] block mt-1.5">
                Band: {islLinks[0]?.band || 'Ka-Band Crosslink'}
              </span>
            </div>

            {/* Visual Crosslink 2: Beta <-> Gamma */}
            <div
              onClick={() => setSelectedLink(islLinks[1])}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedLink?.id === 2
                  ? 'bg-[#ebdccb] border-[#452a19] shadow-[3px_3px_0px_0px_#452a19]'
                  : 'bg-white border-[#452a19]/30 hover:border-[#452a19]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                <span className="text-[#24140b]">🛰️ BETA ↔ 🛰️ GAMMA</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  {islLinks[1]?.status || 'NOMINAL'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-[#24140b]">
                  {islLinks[1]?.latency_ms || 34.2} ms
                </span>
                <span className="text-xs font-mono text-[#73533e]">Crosslink Latency</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#73533e] mt-2 pt-2 border-t border-[#452a19]/10">
                <span>Loss: {islLinks[1]?.packet_loss_pct || 0.03}%</span>
                <span>SNR: {islLinks[1]?.snr_db || 13.5} dB</span>
                <span>{islLinks[1]?.throughput_mbps || 95} Mbps</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-[#452a19] block mt-1.5">
                Band: {islLinks[1]?.band || 'Optical Laser Mesh'}
              </span>
            </div>

            {/* Visual Crosslink 3: Gamma <-> Alpha */}
            <div
              onClick={() => setSelectedLink(islLinks[2])}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedLink?.id === 3
                  ? 'bg-[#ebdccb] border-[#452a19] shadow-[3px_3px_0px_0px_#452a19]'
                  : 'bg-white border-[#452a19]/30 hover:border-[#452a19]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                <span className="text-[#24140b]">🛰️ GAMMA ↔ 🛰️ ALPHA</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  {islLinks[2]?.status || 'NOMINAL'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-[#24140b]">
                  {islLinks[2]?.latency_ms || 28.6} ms
                </span>
                <span className="text-xs font-mono text-[#73533e]">Crosslink Latency</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#73533e] mt-2 pt-2 border-t border-[#452a19]/10">
                <span>Loss: {islLinks[2]?.packet_loss_pct || 0.02}%</span>
                <span>SNR: {islLinks[2]?.snr_db || 14.9} dB</span>
                <span>{islLinks[2]?.throughput_mbps || 105} Mbps</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-[#452a19] block mt-1.5">
                Band: {islLinks[2]?.band || 'Ka-Band Crosslink'}
              </span>
            </div>
          </div>
        </div>

        {/* ISL Technical Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse border border-[#452a19]/30">
            <thead>
              <tr className="bg-[#ebdccb] text-[#24140b] font-bold border-b border-[#452a19]">
                <th className="p-2.5">Link Identifier</th>
                <th className="p-2.5">Source ↔ Target</th>
                <th className="p-2.5">Transmission Medium</th>
                <th className="p-2.5">Live Latency</th>
                <th className="p-2.5">Packet Loss</th>
                <th className="p-2.5">Throughput</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {(islLinks || []).map((link, idx) => (
                <tr
                  key={link.id || idx}
                  className="border-b border-[#452a19]/20 hover:bg-[#f7f4ee] transition-colors"
                >
                  <td className="p-2.5 font-bold text-[#452a19]">ISL-MESH-00{link.id || idx + 1}</td>
                  <td className="p-2.5 font-semibold text-[#24140b]">
                    {link.source_sat} ↔ {link.target_sat}
                  </td>
                  <td className="p-2.5 text-[#73533e]">{link.band || 'Crosslink RF'}</td>
                  <td className="p-2.5 font-bold text-[#24140b]">{link.latency_ms} ms</td>
                  <td className="p-2.5 text-emerald-800">{link.packet_loss_pct}%</td>
                  <td className="p-2.5 text-[#24140b]">{link.throughput_mbps || 100} Mbps</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {link.status || 'NOMINAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
