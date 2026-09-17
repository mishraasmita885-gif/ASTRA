import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useMission } from '../context/MissionContext';

/**
 * Layout: The master architectural container for all ASTRA pages.
 * Features an aesthetic warm off-white canvas, delicate Swiss-style vertical grid columns,
 * responsive sidebar docking, and frosted glass header.
 */
export const Layout = ({ children }) => {
  const { isSidebarCollapsed } = useMission();

  return (
    <div className="min-h-screen bg-[#f6f4ee] text-[#161514] flex font-sans relative antialiased selection:bg-[#233446] selection:text-white transition-colors duration-300">
      {/* Precision Editorial Column Grid Lines (PROJ-E / Awwwards Swiss Architecture style) */}
      <div 
        className={`fixed inset-0 pointer-events-none z-0 grid grid-cols-4 px-8 max-w-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
        aria-hidden="true"
      >
        <div className="border-r border-[#e5e0d4]/60 h-full" />
        <div className="border-r border-[#e5e0d4]/60 h-full" />
        <div className="border-r border-[#e5e0d4]/60 h-full" />
        <div className="border-r border-[#e5e0d4]/30 h-full" />
      </div>

      {/* Persistent Left Dock Navigation */}
      <Sidebar />

      {/* Main Mission Console Area with smooth padding transitions */}
      <div
        className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        <Header />
        <main className="pt-20 px-8 py-8 flex-1 overflow-y-auto">
          <div className="max-w-360 mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
