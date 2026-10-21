import React, { useState, useEffect } from 'react';
import { useMission } from '../context/MissionContext';
import { CommandPaletteModal } from './CommandPaletteModal';
import {
  Search,
  Sun,
  Bell,
  ChevronDown,
  Zap,
  RotateCcw,
  Radio,
  Server,
  Layers,
  Shield,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export const Header = () => {
  const {
    isCrisis,
    triggerCrisis,
    resetToNominal,
    isSidebarCollapsed,
    isBackendConnected,
    backendHealth,
    playNasaP3Stream,
    availableChannels,
    activeChannel,
    switchActiveChannel,
    activeSpacecraft,
    switchSpacecraft,
    fleetNodes,
    fleetSummary,
    operatorRole,
    setOperatorRole,
    hasCommandAuthority,
  } = useMission();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const [isConstellationDropdownOpen, setIsConstellationDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');

  // Prepare full sorted channel list with P-3 pinned at top
  const rawChannels = availableChannels && availableChannels.length > 0
    ? availableChannels
    : ['P-3', 'A-1', 'A-2', 'B-1', 'C-1', 'C-2', 'D-1', 'E-1', 'T-1', 'S-1', 'M-1', 'P-1', 'P-2'];

  const sortedChannels = [
    'P-3',
    ...rawChannels.filter((c) => c !== 'P-3').sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  ];

  const filteredChannels = sortedChannels.filter((ch) =>
    ch.toLowerCase().includes(channelSearch.toLowerCase().trim())
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-16 bg-[#ebdccb]/90 backdrop-blur-md z-30 px-6 sm:px-8 flex items-center justify-between border-b border-[#24140b] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] print:hidden ${
          isSidebarCollapsed ? 'left-20' : 'left-64'
        }`}
      >
        {/* Center/Left: Universal Mission Search Bar (Feature 5) */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div
            onClick={() => setIsPaletteOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/95 border-2 border-[#24140b] text-[#161514] w-full shadow-[2px_2px_0px_0px_#24140b] cursor-pointer hover:bg-white transition-all select-none"
          >
            <Search className="w-4 h-4 text-[#73533e] shrink-0" />
            <span className="text-xs text-[#8c827a] font-sans flex-1 truncate">
              Search telemetry, P-3 detector, channels, procedures...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[#24140b] px-1.5 py-0.5 rounded border border-[#24140b] bg-[#ebdccb] font-bold shadow-[1px_1px_0px_0px_#24140b] whitespace-nowrap">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right Controls: Constellation Switcher, Channel Ingestion, Backend Status, Crisis, RBAC Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2">
          {/* Constellation Multi-Spacecraft Fleet Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsConstellationDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f8f5ee] hover:bg-white text-[#24140b] border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b] font-mono text-xs font-bold transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              title="Select Active Constellation Spacecraft"
            >
              <span className="text-sm">🛰️</span>
              <span className="hidden sm:inline font-bold">
                {activeSpacecraft === 'ASTRA-ALPHA'
                  ? 'Alpha'
                  : activeSpacecraft === 'ASTRA-BETA'
                  ? 'Beta'
                  : 'Gamma'}
              </span>
              <span className="sm:hidden font-bold">{activeSpacecraft ? activeSpacecraft.replace('ASTRA-', '') : 'Alpha'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  activeSpacecraft === 'ASTRA-GAMMA' ? 'bg-amber-500' : 'bg-emerald-500'
                } animate-pulse`}
              />
              <ChevronDown className="w-3 h-3 text-[#73533e]" />
            </button>

            {isConstellationDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#f8f5ee] border-2 border-[#24140b] shadow-[4px_4px_0px_0px_#24140b] p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setIsConstellationDropdownOpen(false)}
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-[#24140b]/20">
                  <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">
                    Constellation Fleet Nodes
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#ebdccb] text-[#24140b] border border-[#24140b]/30">
                    3 ACTIVE NODES
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-0.5">
                  {(fleetNodes || []).map((node) => {
                    const isSelected = node.id === activeSpacecraft;
                    return (
                      <button
                        key={node.id}
                        onClick={() => {
                          switchSpacecraft(node.id);
                          setIsConstellationDropdownOpen(false);
                        }}
                        style={
                          isSelected
                            ? { backgroundColor: '#452a19', color: '#fbf7f0' }
                            : { backgroundColor: '#fbf7f0', color: '#24140b' }
                        }
                        className={`px-2.5 py-2 rounded-xl text-xs font-mono text-left flex items-center justify-between transition-colors cursor-pointer border ${
                          isSelected
                            ? 'border-[#24140b] shadow-[1px_1px_0px_0px_#24140b]'
                            : 'border-[#4a2e1b]/20 hover:border-[#24140b]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🛰️</span>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs">{node.name}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-[#ebdccb]' : 'text-[#73533e]'}`}>
                              {node.orbit_regime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              node.status === 'CRITICAL'
                                ? 'bg-red-500 text-white'
                                : node.status === 'WARNING'
                                ? 'bg-amber-400 text-[#24140b]'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {node.status}
                          </span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-[#fea619]' : 'text-[#24140b]'}`}>
                            {node.health_score}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Feature 1: Multi-Channel Ingestion Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsChannelDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f8f5ee] hover:bg-white text-[#24140b] border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b] font-mono text-xs font-bold transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              title="Select NASA Telemetry Channel"
            >
              <Layers className="w-3.5 h-3.5 text-purple-700" />
              <span>CH: {activeChannel}</span>
              <ChevronDown className="w-3 h-3 text-[#73533e]" />
            </button>

            {isChannelDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#f8f5ee] border-2 border-[#24140b] shadow-[4px_4px_0px_0px_#24140b] p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95"
                onMouseLeave={() => {
                  setIsChannelDropdownOpen(false);
                  setChannelSearch('');
                }}
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-[#24140b]/20">
                  <span className="text-[10px] font-mono font-bold text-[#73533e] uppercase">
                    NASA Telemetry Channels
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#ebdccb] text-[#24140b] border border-[#24140b]/30">
                    {filteredChannels.length} / {sortedChannels.length}
                  </span>
                </div>

                {/* Instant Channel Filter Input */}
                <div className="relative px-0.5">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#73533e]" />
                  <input
                    type="text"
                    placeholder="Filter channel (e.g. P-3, T-1, D-13)..."
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-7 pr-2 py-1 text-xs font-mono rounded-lg border border-[#24140b] bg-white text-[#24140b] placeholder:text-[#8c827a] focus:outline-none focus:ring-1 focus:ring-[#452a19]"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto flex flex-col gap-1 p-0.5 custom-scrollbar">
                  {filteredChannels.length === 0 ? (
                    <div className="px-3 py-4 text-center font-mono text-xs text-[#73533e]">
                      No channels match "{channelSearch}"
                    </div>
                  ) : (
                    filteredChannels.map((ch) => {
                      const isSelected = ch === activeChannel;
                      return (
                        <button
                          key={ch}
                          onClick={() => {
                            switchActiveChannel(ch);
                            setIsChannelDropdownOpen(false);
                            setChannelSearch('');
                          }}
                          style={
                            isSelected
                              ? { backgroundColor: '#452a19', color: '#fbf7f0' }
                              : { backgroundColor: '#fbf7f0', color: '#24140b' }
                          }
                          className={`channel-item px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-left flex items-center justify-between transition-colors cursor-pointer border ${
                            isSelected
                              ? 'channel-item-active border-[#24140b]'
                              : 'channel-item-inactive border-[#4a2e1b]/20 hover:border-[#24140b]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">Channel {ch}</span>
                            {ch === 'P-3' && (
                              <span
                                style={
                                  isSelected
                                    ? { backgroundColor: '#f59e0b', color: '#1a0f07' }
                                    : { backgroundColor: '#ebdccb', color: '#73533e' }
                                }
                                className="text-[9px] px-1 py-0.2 rounded font-mono font-bold border border-[#24140b]/30"
                              >
                                BENCHMARK
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 border border-[#24140b] animate-pulse" />
                              ACTIVE
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Backend Online Pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl border border-[#24140b] text-[11px] font-mono font-bold bg-[#ebdccb] text-[#24140b] shadow-[1.5px_1.5px_0px_0px_#24140b]">
            <div
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span>
              {isBackendConnected ? 'API :8000 (Live)' : 'Reconnecting...'}
            </span>
          </div>

          {/* Quick NASA P-3 Replay Trigger */}
          <button
            onClick={() => playNasaP3Stream(5300)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b] font-mono text-[11px] font-bold transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            title="Replay NASA P-3 stream leading to event 5400->6656"
          >
            <Radio className="w-3.5 h-3.5 text-[#24140b] animate-pulse" />
            <span>P-3 Replay</span>
          </button>

          {/* Quick Crisis Simulation Trigger */}
          {!isCrisis ? (
            <button
              onClick={() => triggerCrisis('Solar Array Strike & EPS Bus Failure')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#fbb973]/25 hover:bg-[#fbb973]/40 text-[#a35e38] border border-[#fbb973] font-mono text-[11px] font-bold transition-all cursor-pointer shadow-xs"
              title="Simulate Solar Array Strike Scenario"
            >
              <Zap className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Simulate Strike</span>
            </button>
          ) : (
            <button
              onClick={resetToNominal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nominal</span>
            </button>
          )}

          {/* Feature 8: RBAC Flight Director vs Telemetry Observer Selector */}
          <div className="relative">
            <div
              onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 pl-2 border-l border-[#24140b]/30 cursor-pointer group"
              title="Click to toggle Operator Authorization Role (RBAC)"
            >
              <div
                className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs border border-[#24140b] shadow-[1.5px_1.5px_0px_0px_#24140b] transition-transform group-hover:scale-105 ${
                  hasCommandAuthority ? 'bg-[#24140b]' : 'bg-[#73533e]'
                }`}
              >
                {hasCommandAuthority ? 'FD' : 'TO'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#24140b] leading-tight flex items-center gap-1">
                  {hasCommandAuthority ? 'Gene Kranz' : 'Observer'}
                  {hasCommandAuthority && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </span>
                <span className="font-mono text-[9px] text-[#73533e] font-semibold leading-tight">
                  {hasCommandAuthority ? 'Flight Director' : 'Telemetry Observer'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#73533e] group-hover:text-[#24140b] transition-colors" />
            </div>

            {isRoleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#f8f5ee] border-2 border-[#24140b] shadow-[4px_4px_0px_0px_#24140b] p-2.5 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setIsRoleDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] font-mono font-bold text-[#73533e] uppercase border-b border-[#24140b]/20">
                  Role-Based Access Control (RBAC)
                </div>

                <button
                  onClick={() => {
                    setOperatorRole('FLIGHT_DIRECTOR');
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`rbac-btn p-3 rounded-2xl text-left text-xs font-mono transition-all cursor-pointer flex flex-col ${
                    hasCommandAuthority
                      ? 'rbac-btn-active'
                      : 'rbac-btn-inactive'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-sm">Flight Director</span>
                    {hasCommandAuthority && (
                      <span className="rbac-badge text-[9px] font-bold px-2 py-0.5 rounded shadow-xs">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="rbac-subtext text-[11px] mt-1 leading-snug">
                    Full Command Clearance • DSN Madrid Authorization
                  </span>
                </button>

                <button
                  onClick={() => {
                    setOperatorRole('TELEMETRY_OBSERVER');
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`rbac-btn p-3 rounded-2xl text-left text-xs font-mono transition-all cursor-pointer flex flex-col ${
                    !hasCommandAuthority
                      ? 'rbac-btn-active'
                      : 'rbac-btn-inactive'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-sm">Telemetry Observer</span>
                    {!hasCommandAuthority && (
                      <span className="rbac-badge text-[9px] font-bold px-2 py-0.5 rounded shadow-xs">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="rbac-subtext text-[11px] mt-1 leading-snug">
                    Read-Only Telemetry • Uplink Commands Locked
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Universal Search Palette Modal */}
      <CommandPaletteModal
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />
    </>
  );
};

