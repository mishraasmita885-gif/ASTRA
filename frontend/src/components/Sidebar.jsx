import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Box,
  Radio,
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
    { id: 'fleet', label: 'Fleet Mesh', icon: Radio },
    { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
    { id: 'subsystems', label: 'Subsystems', icon: Boxes },
    {
      id: 'anomalies',
      label: 'Anomaly Center',
      icon: ShieldAlert,
      badge: isCrisis ? 'CRITICAL' : '3',
      badgeColor: isCrisis ? 'bg-red-500 text-white' : 'bg-[#fea619] text-[#24140b]',
    },
    { id: 'ai_assistant', label: 'AI Copilot', icon: Sparkles },
    { id: 'events', label: 'Event Log', icon: ScrollText },
    { id: 'simulation', label: 'Simulation', icon: FlaskConical },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const systemNav = [
    { id: 'settings', label: 'Settings', icon: Settings, action: () => setActiveTab('settings') },
    {
      id: 'docs',
      label: 'Documentation',
      icon: FileCode2,
      isExternal: true,
      action: () => window.open('https://github.com/mishraasmita885-gif/ASTRA#readme', '_blank', 'noopener,noreferrer')
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#ebdccb] text-[#24140b] flex flex-col justify-between shadow-xl z-40 select-none border-r border-[#24140b] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] print:hidden ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header & Toggle */}
      <div className="flex flex-col">
        <div
          className={`h-16 flex items-center border-b border-[#24140b] transition-all duration-300 ${
            isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {/* Logo & Brand text */}
          <div
            className="flex items-center gap-3 cursor-pointer group py-1"
            onClick={() => setActiveTab('welcome')}
            title="ASTRA Mission Deck"
          >
            <div className="relative shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[3px_3px_0px_0px_#4a2e1b] p-0 transition-all group-hover:scale-105 active:translate-x-0.5 active:translate-y-0.5">
              <img
                src="/logo.png"
                alt="ASTRA Logo"
                className="w-full h-full object-contain select-none"
                style={{ transform: 'scale(1.38)' }}
                loading="eager"
                decoding="sync"
              />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col whitespace-nowrap transition-opacity duration-200">
                <span className="font-display font-extrabold text-sm tracking-widest uppercase text-[#24140b] leading-none group-hover:text-[#c25e2e] transition-colors">
                  ASTRA
                </span>
                <span className="font-mono text-[9px] tracking-widest uppercase text-[#73533e] mt-1 font-semibold">
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
              className="p-1.5 rounded-xl bg-[#452a19] text-[#fbf7f0] hover:bg-[#5c3822] border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b] transition-all duration-150 cursor-pointer flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
              aria-label={isSidebarCollapsed ? 'Lock sidebar open (Ctrl+\\)' : 'Collapse sidebar (Ctrl+\\)'}
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="w-4 h-4 text-[#fbf7f0] transition-transform duration-200" />
              ) : (
                <ChevronsLeft className="w-4 h-4 text-[#fbf7f0] transition-transform duration-200" />
              )}
            </button>

            {/* Aesthetic Tooltip */}
            {hoveredToggle && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#452a19] text-[#fbf7f0] border-2 border-[#24140b] shadow-[4px_4px_0px_0px_#24140b] rounded-xl px-3 py-2 whitespace-nowrap z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
                <div className="text-xs font-bold text-[#fbf7f0]">
                  {isSidebarCollapsed ? 'Lock sidebar open' : 'Collapse sidebar'}
                </div>
                <div className="text-[11px] font-mono text-[#d5bfae] font-semibold mt-0.5">
                  Ctrl+\
                </div>
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#452a19] border-l-2 border-b-2 border-[#24140b] rotate-45" />
              </div>
            )}
          </div>
        </div>

        {/* Section: MISSION */}
        {!isSidebarCollapsed && (
          <div className="px-5 mt-4 mb-2">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#73533e]">
              MISSION
            </span>
          </div>
        )}

        {/* Mission Navigation Items */}
        <nav className={`flex flex-col gap-1.5 transition-all duration-300 ${isSidebarCollapsed ? 'px-2 mt-4' : 'px-3'}`}>
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
                      ? 'bg-[#452a19] text-[#fbf7f0] border-2 border-[#24140b] shadow-[3px_3px_0px_0px_#24140b] font-bold'
                      : 'text-[#4a2e1b] hover:text-[#24140b] hover:bg-[#dfcdb7] border-2 border-transparent hover:border-[#24140b] hover:shadow-[2px_2px_0px_0px_#24140b] font-medium hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`transition-colors ${
                        isSidebarCollapsed ? 'w-4 h-4' : 'w-4 h-4'
                      } ${
                        isActive
                          ? 'text-[#fbf7f0]'
                          : 'text-[#73533e] group-hover:text-[#24140b]'
                      }`}
                    />
                    {!isSidebarCollapsed && (
                      <span className="tracking-wide">{item.label}</span>
                    )}
                  </div>

                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-[#24140b] shadow-[1px_1px_0px_0px_#24140b] ${
                        item.badgeColor || 'bg-[#fea619] text-[#24140b]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {isSidebarCollapsed && hoveredItem === item.id && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#452a19] text-[#fbf7f0] border-2 border-[#24140b] shadow-[3px_3px_0px_0px_#24140b] rounded-xl px-3 py-1.5 whitespace-nowrap z-50 pointer-events-none transition-all duration-150 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#fbf7f0]">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-[#24140b] shadow-[1px_1px_0px_0px_#24140b] ${
                          item.badgeColor || 'bg-[#fea619] text-[#24140b]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#452a19] border-l-2 border-b-2 border-[#24140b] rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Section: SYSTEM */}
        {!isSidebarCollapsed && (
          <div className="px-5 mt-5 mb-2">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#73533e]">
              SYSTEM
            </span>
          </div>
        )}

        <nav className={`flex flex-col gap-1.5 transition-all duration-300 ${isSidebarCollapsed ? 'px-2 mt-2' : 'px-3'}`}>
          {systemNav.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={item.action}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full group flex items-center rounded-xl text-xs text-[#4a2e1b] hover:text-[#24140b] hover:bg-[#dfcdb7] border-2 border-transparent hover:border-[#24140b] hover:shadow-[2px_2px_0px_0px_#24140b] font-medium hover:-translate-y-0.5 transition-all duration-150 cursor-pointer ${
                    isSidebarCollapsed
                      ? 'justify-center p-3'
                      : 'justify-between px-3.5 py-2.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#73533e] group-hover:text-[#24140b] transition-colors" />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isSidebarCollapsed && item.isExternal && (
                    <ExternalLink className="w-3.5 h-3.5 text-[#73533e] group-hover:text-[#24140b] transition-colors" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Spacecraft SC-ASTRA-01 Profile Card */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
        {!isSidebarCollapsed ? (
          <div className="p-3 rounded-2xl bg-[#452a19] border-2 border-[#24140b] shadow-[3px_3px_0px_0px_#24140b] flex items-center gap-3">
            {/* Earth / Spacecraft Thumbnail */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 border-[#24140b] shadow-[1.5px_1.5px_0px_0px_#24140b]">
              <img
                src="/earth_thumb.jpg"
                alt="Earth Orbit"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Spacecraft details */}
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-xs text-[#fbf7f0] leading-tight truncate">
                SC-ASTRA-01
              </span>
              <span className="font-mono text-[10px] text-[#d5bfae] font-semibold leading-tight mt-0.5">
                LEO 542.8 km
              </span>
              <span className="font-mono text-[10px] text-[#d5bfae] font-semibold leading-tight">
                REV 4,821
              </span>
              <div className="flex items-center gap-1.5 mt-1 bg-[#2b170c] px-2 py-0.5 rounded-md border border-emerald-500/40 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] text-emerald-300 font-bold">
                  Mission Active
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="p-1.5 rounded-xl bg-[#452a19] border-2 border-[#24140b] shadow-[2px_2px_0px_0px_#24140b] flex flex-col items-center gap-1 cursor-pointer"
            title="SC-ASTRA-01 • Mission Active"
          >
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#24140b]">
              <img
                src="/earth_thumb.jpg"
                alt="Earth Orbit"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
