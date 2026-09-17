import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Compass,
  Box,
  Activity,
  Boxes,
  ShieldAlert,
  Sparkles,
  ScrollText,
  FlaskConical,
  FileText,
  Settings,
  ExternalLink,
  ChevronsLeft,
  ChevronsRight,
  FileCode2,
} from 'lucide-react';

export const Sidebar = () => {
  const { activeTab, setActiveTab, isCrisis, isSidebarCollapsed, toggleSidebar } = useMission();
  const [hoveredToggle, setHoveredToggle] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const missionNav = [
    { id: 'welcome', label: 'Overview', icon: Box },
    { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
    { id: 'subsystems', label: 'Subsystems', icon: Boxes },
    {
      id: 'anomalies',
      label: 'Anomaly Center',
      icon: ShieldAlert,
      badge: isCrisis ? 'CRITICAL' : '3',
      badgeColor: isCrisis ? 'bg-red-500 text-white' : 'bg-[#e28c38] text-white',
    },
    { id: 'ai_assistant', label: 'Gemini AI', icon: Sparkles },
    { id: 'events', label: 'Event Log', icon: ScrollText },
    { id: 'simulation', label: 'Simulation', icon: FlaskConical },
    { id: 'overview', label: 'Reports', icon: FileText },
  ];

  const systemNav = [
    { id: 'settings', label: 'Settings', icon: Settings, action: () => setActiveTab('simulation') },
    { id: 'docs', label: 'Documentation', icon: FileCode2, isExternal: true },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#131417] text-white flex flex-col justify-between shadow-2xl z-40 select-none border-r border-[#202227] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header & Toggle */}
      <div className="flex flex-col">
        <div
          className={`h-16 flex items-center border-b border-[#202227] transition-all duration-300 ${
            isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {/* Logo & Brand text */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#fbb973]/20 border border-[#fbb973]/60 cursor-pointer group"
              onClick={() => setActiveTab('welcome')}
              title="ASTRA Mission Deck"
            >
              <Compass className="w-4 h-4 text-[#fbb973] group-hover:rotate-45 transition-transform duration-300" />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col whitespace-nowrap transition-opacity duration-200">
                <span className="font-display font-extrabold text-sm tracking-widest uppercase text-white leading-none">
                  ASTRA
                </span>
                <span className="font-mono text-[9px] tracking-widest uppercase text-[#737887] mt-1 font-medium">
                  AI MISSION CONTROL
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button with Feature Tooltip */}
          <div className="relative">
            <button
              onClick={toggleSidebar}
              onMouseEnter={() => setHoveredToggle(true)}
              onMouseLeave={() => setHoveredToggle(false)}
              className="p-1.5 rounded-lg text-[#737887] hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer flex items-center justify-center"
              aria-label={isSidebarCollapsed ? 'Lock sidebar open (Ctrl+\\)' : 'Collapse sidebar (Ctrl+\\)'}
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="w-4 h-4 text-[#fbb973] transition-transform duration-200" />
              ) : (
                <ChevronsLeft className="w-4 h-4 transition-transform duration-200" />
              )}
            </button>

            {/* Aesthetic Tooltip matching reference */}
            {hoveredToggle && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#1b1d22] text-white border border-[#2a2c33] shadow-2xl rounded-lg px-3 py-2 whitespace-nowrap z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
                <div className="text-xs font-semibold text-slate-100">
                  {isSidebarCollapsed ? 'Lock sidebar open' : 'Collapse sidebar'}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Ctrl+\
                </div>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1b1d22] border-l border-b border-[#2a2c33] rotate-45" />
              </div>
            )}
          </div>
        </div>

        {/* Section: MISSION */}
        {!isSidebarCollapsed && (
          <div className="px-5 mt-4 mb-2">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#5a5f6e]">
              MISSION
            </span>
          </div>
        )}

        {/* Mission Navigation Items */}
        <nav className={`flex flex-col gap-1 transition-all duration-300 ${isSidebarCollapsed ? 'px-2 mt-4' : 'px-3'}`}>
          {missionNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full group flex items-center rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                    isSidebarCollapsed
                      ? 'justify-center p-3'
                      : 'justify-between px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#22242a] text-white shadow-sm font-semibold'
                      : 'text-[#858a98] hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`transition-colors ${
                        isSidebarCollapsed ? 'w-4 h-4' : 'w-4 h-4'
                      } ${
                        isActive
                          ? 'text-[#fbb973]'
                          : 'text-[#858a98] group-hover:text-white'
                      }`}
                    />
                    {!isSidebarCollapsed && (
                      <span className="tracking-wide">{item.label}</span>
                    )}
                  </div>

                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-white/10 text-[#858a98]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {isSidebarCollapsed && hoveredItem === item.id && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#1b1d22] text-white border border-[#2a2c33] shadow-2xl rounded-lg px-3 py-1.5 whitespace-nowrap z-50 pointer-events-none transition-all duration-150 flex items-center gap-2">
                    <span className="text-xs font-semibold">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1b1d22] border-l border-b border-[#2a2c33] rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Section: SYSTEM */}
        {!isSidebarCollapsed && (
          <div className="px-5 mt-5 mb-2">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#5a5f6e]">
              SYSTEM
            </span>
          </div>
        )}

        <nav className={`flex flex-col gap-1 transition-all duration-300 ${isSidebarCollapsed ? 'px-2 mt-2' : 'px-3'}`}>
          {systemNav.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={item.action}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full group flex items-center rounded-xl text-xs text-[#858a98] hover:text-white hover:bg-white/5 font-medium transition-all duration-150 cursor-pointer ${
                    isSidebarCollapsed
                      ? 'justify-center p-3'
                      : 'justify-between px-3.5 py-2.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#858a98] group-hover:text-white transition-colors" />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isSidebarCollapsed && item.isExternal && (
                    <ExternalLink className="w-3.5 h-3.5 text-[#5a5f6e] group-hover:text-white transition-colors" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Spacecraft SC-ASTRA-01 Profile Card (exact reference) */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
        {!isSidebarCollapsed ? (
          <div className="p-3 rounded-2xl bg-[#181a20] border border-white/5 flex items-center gap-3 shadow-inner">
            {/* Earth / Spacecraft Thumbnail */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10">
              <img
                src="/earth_thumb.jpg"
                alt="Earth Orbit"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Spacecraft details */}
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-xs text-white leading-tight truncate">
                SC-ASTRA-01
              </span>
              <span className="font-mono text-[10px] text-[#737887] leading-tight mt-0.5">
                LEO 542.8 km
              </span>
              <span className="font-mono text-[10px] text-[#737887] leading-tight">
                REV 4,821
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                <span className="font-mono text-[10px] text-[#10b981] font-semibold">
                  Mission Active
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="p-1.5 rounded-xl bg-[#181a20] border border-white/5 flex flex-col items-center gap-1 cursor-pointer"
            title="SC-ASTRA-01 • Mission Active"
          >
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10">
              <img
                src="/earth_thumb.jpg"
                alt="Earth Orbit"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
