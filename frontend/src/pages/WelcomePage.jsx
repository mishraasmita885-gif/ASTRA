import React, { useState, useEffect } from 'react';
import CosmicDust from '../components/lightswind/cosmic-dust';
import { useMission } from '../context/MissionContext';
import {
  ArrowRight,
  Play,
  Activity,
  Layers,
  Clock,
  Zap,
  Radio,
  Box,
  ShieldAlert,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const WelcomePage = () => {
  const { setActiveTab, triggerCrisis, isCrisis } = useMission();
  const [currentTimestamp, setCurrentTimestamp] = useState('');

  // Live formatted timestamp matching reference (e.g. SEP 15, 2026 16:42:17 IST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const day = now.getDate();
      const year = now.getFullYear();
      const time = now.toTimeString().split(' ')[0];
      setCurrentTimestamp(`${month} ${day}, ${year} ${time} IST`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-6.5rem)] flex flex-col justify-between overflow-hidden rounded-4xl p-6 sm:p-8 lg:p-10 border border-[#e8e2d7] bg-[#faf8f5] shadow-xs select-none">
      {/* Interactive Cosmic Dust Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-auto z-0 opacity-70">
        <CosmicDust
          particleCount={130}
          particleSize={1.6}
          speedMultiplier={0.85}
          theme="light"
        />
      </div>

      {/* Top Status & Timestamp Row (exact reference) */}
      <div className="relative z-10 flex items-center justify-end gap-3 pb-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isCrisis ? 'CRITICAL ALERT' : 'FLIGHT READY'}</span>
        </div>
        <span className="font-mono text-xs text-[#8c827a] font-medium tracking-wider">
          {currentTimestamp}
        </span>
      </div>

      {/* Main 3-Column Hero Section */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4 my-auto">
        {/* Left Column: Headline, Copy, Action Buttons, and Quote */}
        <div className="lg:col-span-5 flex flex-col justify-center items-start text-left relative">
          {/* Subtle Organic Warm Blob behind headline (matching reference) */}
          <div className="absolute -top-10 -left-10 w-72 h-64 rounded-full bg-[#f3ece0]/70 blur-3xl -z-10 pointer-events-none" />

          {/* Eyebrow */}
          <div className="flex items-center gap-2 text-[#a89c90] text-[11px] font-mono font-bold tracking-widest uppercase mb-3">
            <span className="w-4 h-px bg-[#a89c90]" />
            <span>AUTONOMOUS SPACECRAFT INTELLIGENCE</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-[68px] font-bold text-[#1a1816] tracking-tight leading-[1.04]">
            From data <br />
            to <span className="text-[#c25e2e]">decisions.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[#6f675e] font-sans leading-relaxed mt-4 max-w-md">
            Real-time telemetry, anomaly detection and AI-assisted mission intelligence for a safer tomorrow.
          </p>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center gap-3.5 mt-7">
            <button
              onClick={() => setActiveTab('overview')}
              className="px-6 py-3 rounded-xl bg-[#1a1816] hover:bg-black text-white font-sans text-sm font-semibold tracking-wide shadow-sm hover:shadow-md transition-all flex items-center gap-2.5 cursor-pointer group active:scale-95"
            >
              <span>Open Console</span>
              <ArrowRight className="w-4 h-4 text-[#fbb973] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                triggerCrisis('Solar Array Strike & EPS Bus Failure');
                setActiveTab('simulation');
              }}
              className="px-5 py-3 rounded-xl bg-white hover:bg-[#f6f2eb] border border-[#e5dfd5] text-[#2a2725] font-sans text-sm font-semibold shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-[#2a2725] text-[#2a2725]" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Quote Section */}
          <div className="mt-8 pt-2">
            <div className="flex items-center gap-2 text-xs font-serif italic text-[#6f675e]">
              <span className="w-4 h-px bg-[#d8cebe]" />
              <span>“Intelligence beyond orbit.”</span>
            </div>
            <div className="font-mono text-[10px] tracking-widest text-[#a89c90] uppercase mt-1 pl-6">
              ASTRA • AI FOR A SAFER TOMORROW
            </div>
          </div>
        </div>

        {/* Center Column: Cathedral Arch Window Satellite */}
        <div className="lg:col-span-4 flex items-center justify-center relative px-2">
          <div className="relative w-full max-w-85 sm:max-w-92.5">
            {/* Ambient accent dots along perimeter (matching reference) */}
            <div className="absolute -top-2 left-6 w-2 h-2 rounded-full bg-[#c25e2e]/50" />
            <div className="absolute top-1/2 -right-3 w-2 h-2 rounded-full bg-[#c25e2e]/60" />

            {/* Arched Architectural Window */}
            <div className="w-full aspect-3/4 rounded-t-full rounded-b-2xl overflow-hidden shadow-2xl relative bg-[#0b1018] group border border-[#e5dfd5]">
              <img
                src="/spacecraft_arch.jpg"
                alt="ASTRA Spacecraft in Orbit"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Gentle ambient lighting blend */}
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right Column: Vertical Metrics with Curated Icons (exact reference) */}
        <div className="lg:col-span-3 flex flex-col justify-center items-start lg:items-end text-left lg:text-right gap-6 lg:pl-6">
          {/* Metric 1 */}
          <div className="flex items-center lg:flex-row-reverse gap-3.5 group">
            <div className="w-10 h-10 rounded-full bg-white border border-[#e5dfd5] flex items-center justify-center text-[#2a2725] shadow-2xs group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5 text-[#2a2725]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-3xl sm:text-4xl text-[#1a1816] tracking-tight leading-none">
                100%
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#8c827a] uppercase mt-1 font-semibold">
                TELEMETRY INTEGRITY
              </span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="flex items-center lg:flex-row-reverse gap-3.5 group">
            <div className="w-10 h-10 rounded-full bg-white border border-[#e5dfd5] flex items-center justify-center text-[#2a2725] shadow-2xs group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5 text-[#2a2725]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-3xl sm:text-4xl text-[#1a1816] tracking-tight leading-none">
                4,821+
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#8c827a] uppercase mt-1 font-semibold">
                ORBITAL REVOLUTIONS
              </span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="flex items-center lg:flex-row-reverse gap-3.5 group">
            <div className="w-10 h-10 rounded-full bg-white border border-[#e5dfd5] flex items-center justify-center text-[#2a2725] shadow-2xs group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-[#2a2725]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-3xl sm:text-4xl text-[#1a1816] tracking-tight leading-none">
                10 Hz
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#8c827a] uppercase mt-1 font-semibold">
                REAL-TIME BUS STREAM
              </span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="flex items-center lg:flex-row-reverse gap-3.5 group">
            <div className="w-10 h-10 rounded-full bg-white border border-[#e5dfd5] flex items-center justify-center text-[#2a2725] shadow-2xs group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-[#2a2725]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-3xl sm:text-4xl text-[#1a1816] tracking-tight leading-none">
                &lt; 1.2s
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#8c827a] uppercase mt-1 font-semibold">
                GEMINI REASONING
              </span>
            </div>
          </div>

          {/* Metric 5 */}
          <div className="flex items-center lg:flex-row-reverse gap-3.5 group">
            <div className="w-10 h-10 rounded-full bg-white border border-[#e5dfd5] flex items-center justify-center text-[#2a2725] shadow-2xs group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5 text-[#2a2725]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-3xl sm:text-4xl text-[#1a1816] tracking-tight leading-none">
                99.8%
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[#8c827a] uppercase mt-1 font-semibold">
                DSN S-BAND LOCK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CORE CAPABILITIES Section (exact reference) */}
      <div className="relative z-10 pt-4 mt-2">
        {/* Capability Header Bar */}
        <div className="flex items-center justify-between pb-3 text-xs">
          <div className="flex items-center gap-2 text-[#a89c90] font-mono font-bold tracking-widest uppercase text-[11px]">
            <span className="w-4 h-px bg-[#a89c90]" />
            <span>CORE CAPABILITIES</span>
          </div>
          <div className="font-mono text-[11px] text-[#8c827a] tracking-wider">
            Monitor • Analyse • Predict • Act
          </div>
        </div>

        {/* 4 Capability Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Real-time Telemetry */}
          <div
            onClick={() => setActiveTab('telemetry')}
            className="p-5 rounded-2xl bg-[#fdfaf5] border border-[#efe7dc] hover:border-[#c25e2e] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
          >
            <div>
              <div className="w-8 h-8 rounded-lg text-[#c25e2e] mb-3 flex items-center justify-start">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-sans font-bold text-sm text-[#1a1816] group-hover:text-[#c25e2e] transition-colors">
                Real-time Telemetry
              </h3>
              <p className="text-xs text-[#736a60] font-sans mt-1 leading-relaxed">
                10Hz streaming with end-to-end validation.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-7 h-7 rounded-full bg-white border border-[#e5dfd5] flex items-center justify-center text-[#1a1816] group-hover:bg-[#c25e2e] group-hover:text-white group-hover:border-[#c25e2e] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 2: Subsystem Monitoring */}
          <div
            onClick={() => setActiveTab('subsystems')}
            className="p-5 rounded-2xl bg-[#f4f7fa] border border-[#e3ebf2] hover:border-[#2563eb] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
          >
            <div>
              <div className="w-8 h-8 rounded-lg text-[#2563eb] mb-3 flex items-center justify-start">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="font-sans font-bold text-sm text-[#1a1816] group-hover:text-[#2563eb] transition-colors">
                Subsystem Monitoring
              </h3>
              <p className="text-xs text-[#736a60] font-sans mt-1 leading-relaxed">
                Power, thermal, ADCS, comms and more.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-7 h-7 rounded-full bg-white border border-[#e3ebf2] flex items-center justify-center text-[#1a1816] group-hover:bg-[#2563eb] group-hover:text-white group-hover:border-[#2563eb] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 3: Anomaly Detection */}
          <div
            onClick={() => setActiveTab('anomalies')}
            className="p-5 rounded-2xl bg-[#fcf5f4] border border-[#f5e6e4] hover:border-[#dc2626] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
          >
            <div>
              <div className="w-8 h-8 rounded-lg text-[#dc2626] mb-3 flex items-center justify-start">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-sans font-bold text-sm text-[#1a1816] group-hover:text-[#dc2626] transition-colors">
                Anomaly Detection
              </h3>
              <p className="text-xs text-[#736a60] font-sans mt-1 leading-relaxed">
                AI-powered zero-shot anomaly identification.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-7 h-7 rounded-full bg-white border border-[#f5e6e4] flex items-center justify-center text-[#1a1816] group-hover:bg-[#dc2626] group-hover:text-white group-hover:border-[#dc2626] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 4: Gemini AI Assistant */}
          <div
            onClick={() => setActiveTab('ai_assistant')}
            className="p-5 rounded-2xl bg-[#f8f5fc] border border-[#eee7f7] hover:border-[#7c3aed] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
          >
            <div>
              <div className="w-8 h-8 rounded-lg text-[#7c3aed] mb-3 flex items-center justify-start">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-sans font-bold text-sm text-[#1a1816] group-hover:text-[#7c3aed] transition-colors">
                Gemini AI Assistant
              </h3>
              <p className="text-xs text-[#736a60] font-sans mt-1 leading-relaxed">
                Natural language mission intelligence.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-7 h-7 rounded-full bg-white border border-[#eee7f7] flex items-center justify-center text-[#1a1816] group-hover:bg-[#7c3aed] group-hover:text-white group-hover:border-[#7c3aed] transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar (exact reference) */}
        <div className="flex items-center justify-between pt-5 mt-3 text-[11px] font-mono text-[#8c827a]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1a1816]">ASTRA</span>
            <span>v1.0.0</span>
          </div>
          <div>
            ISRO HACKATHON • BUILDING A SAFER TOMORROW
          </div>
        </div>
      </div>
    </div>
  );
};
