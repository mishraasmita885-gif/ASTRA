import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Search,
  Sun,
  Bell,
  ChevronDown,
  Zap,
  RotateCcw,
  Radio,
  Server,
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
  } = useMission();
  const [searchValue, setSearchValue] = useState('');

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-[#faf8f5]/85 backdrop-blur-md z-30 px-8 flex items-center justify-between border-b border-[#e5e0d4] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Center/Left: Universal Mission Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/90 border border-[#e5e0d4] text-[#161514] w-full shadow-xs focus-within:border-[#2a1810] focus-within:ring-1 focus-within:ring-[#2a1810] transition-all">
          <Search className="w-4 h-4 text-[#8c827a] shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search telemetry, P-3 detector events, or commands..."
            className="bg-transparent border-none text-xs w-full outline-none placeholder:text-[#8c827a] font-sans"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[#8c827a] px-1.5 py-0.5 rounded border border-[#e5e0d4] bg-[#faf8f5] shadow-2xs whitespace-nowrap">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Backend Status, Emergency Action, Bell, Flight Director Profile */}
      <div className="flex items-center gap-3 sm:gap-4 pl-4">
        {/* Backend Online Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono bg-white shadow-2xs">
          <div
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="font-semibold text-[#181a20]">
            {isBackendConnected ? 'API :8000 (WS Live)' : 'Backend Reconnecting...'}
          </span>
          {backendHealth?.detector && (
            <span className="text-[#8c827a] text-[10px]">
              • {backendHealth.detector.channel} (Thresh {backendHealth.detector.threshold.toFixed(2)})
            </span>
          )}
        </div>

        {/* Quick NASA P-3 Replay Trigger */}
        <button
          onClick={() => playNasaP3Stream(5300)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-mono text-[11px] font-semibold transition-all cursor-pointer"
          title="Replay NASA P-3 stream leading to event 5400->6656"
        >
          <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
          <span>NASA P-3 Replay</span>
        </button>

        {/* Quick Crisis Simulation Trigger */}
        {!isCrisis ? (
          <button
            onClick={() => triggerCrisis('Solar Array Strike & EPS Bus Failure')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbb973]/20 hover:bg-[#fbb973]/35 text-[#a35e38] border border-[#fbb973]/50 font-mono text-[11px] font-semibold transition-all cursor-pointer"
            title="Simulate Solar Array Strike Scenario"
          >
            <Zap className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Simulate Strike</span>
          </button>
        ) : (
          <button
            onClick={resetToNominal}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Nominal</span>
          </button>
        )}

        {/* Sun / Theme Mode Toggle */}
        <button
          className="p-2 rounded-xl text-[#7a6458] hover:text-[#2a1810] hover:bg-white/80 transition-colors cursor-pointer"
          title="Theme Toggle"
          aria-label="Toggle Theme"
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Bell Notifications */}
        <button
          className="relative p-2 rounded-xl text-[#7a6458] hover:text-[#2a1810] hover:bg-white/80 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#fbb973] text-[#2a1810] font-mono text-[9px] font-bold flex items-center justify-center border border-white">
            1
          </span>
        </button>

        {/* Flight Director Profile Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#e5e0d4] cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#181a20] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            GK
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#181a20] leading-tight">
              Gene Kranz
            </span>
            <span className="font-mono text-[10px] text-[#8c827a] leading-tight">
              Flight Director
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8c827a] group-hover:text-[#181a20] transition-colors" />
        </div>
      </div>
    </header>
  );
};
