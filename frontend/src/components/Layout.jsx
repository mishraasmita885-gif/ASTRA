import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useMission } from '../context/MissionContext';
import { SilkWaves } from './ui/silk-waves';

const SILK_WAVE_COLORS = [
  '#ffffff', // Radiant pure white crest
  '#fcfaf6', // Luminous off-white
  '#f2e5d5', // Warm light-tan transition
  '#e4ceb7', // Rich light brown fold (intensified warmth)
  '#fffdfa', // Brilliant white-silk crest
  '#e9d7c3', // Defined café-au-lait fold
  '#fbf8f2', // Luminous cream
  '#ffffff', // Pure white loop
];

/**
 * Layout: The master architectural container for all ASTRA pages.
 * Features an aesthetic warm off-white canvas with the Silk Waves animation,
 * delicate Swiss-style vertical grid columns, responsive sidebar docking, and frosted glass header.
 */
export const Layout = ({ children }) => {
  const { isSidebarCollapsed } = useMission();

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#161514] flex font-sans relative antialiased selection:bg-[#4a2e1b] selection:text-[#fbf7f0] transition-colors duration-300 overflow-x-hidden print:bg-white print:overflow-visible">
      {/* Silk Waves Animated Background - suppressed in print */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden print:hidden">
        <SilkWaves
          colors={SILK_WAVE_COLORS}
          speed={0.55}
          scale={1.8}
          distortion={0.8}
          curve={1.15}
          contrast={1.08}
          brightness={1.02}
          opacity={0.96}
          complexity={1.1}
          frequency={0.95}
          className="w-full h-full"
        />
      </div>

      {/* Precision Editorial Column Grid Lines - suppressed in print */}
      <div 
        className={`fixed inset-0 pointer-events-none z-1 grid grid-cols-4 px-8 max-w-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] print:hidden ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
        aria-hidden="true"
      >
        <div className="border-r border-[#4a2e1b]/8 h-full" />
        <div className="border-r border-[#4a2e1b]/8 h-full" />
        <div className="border-r border-[#4a2e1b]/8 h-full" />
        <div className="border-r border-[#4a2e1b]/5 h-full" />
      </div>

      {/* Persistent Left Dock Navigation */}
      <Sidebar />

      {/* Main Mission Console Area with smooth padding transitions */}
      <div
        className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] print:pl-0 print:m-0 ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        <Header />
        <main className="pt-20 px-8 py-8 flex-1 overflow-y-auto print:p-0 print:pt-0 print:overflow-visible print:w-full">
          <div className="max-w-360 mx-auto w-full print:max-w-full print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
