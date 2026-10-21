import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Search,
  Activity,
  Boxes,
  ShieldAlert,
  Sparkles,
  ScrollText,
  FlaskConical,
  FileText,
  Settings,
  Radio,
  Zap,
  RotateCcw,
  CheckCircle2,
  X,
  CornerDownLeft,
  ArrowRight,
  Sliders,
  Layers,
} from 'lucide-react';

export const CommandPaletteModal = ({ isOpen, onClose }) => {
  const {
    setActiveTab,
    telemetry,
    anomalies,
    commands,
    approveAllCommands,
    triggerCrisis,
    resetToNominal,
    playNasaP3Stream,
    availableChannels,
    activeChannel,
    switchActiveChannel,
    operatorRole,
    setOperatorRole,
  } = useMission();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const isKeyboardNavRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      itemRefs.current = [];
      setTimeout(() => {
        inputRef.current?.focus();
        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const list = [
      // Navigation
      {
        id: 'nav-overview',
        category: 'NAVIGATION',
        title: 'Mission Overview Deck',
        subtitle: 'Telemetry timeline, orbit parameters, and spacecraft architecture',
        icon: Boxes,
        action: () => {
          setActiveTab('overview');
          onClose();
        },
      },
      {
        id: 'nav-telemetry',
        category: 'NAVIGATION',
        title: 'Live Telemetry & Waveforms',
        subtitle: 'NASA P-3 streaming curves and synchronized 4-axis charts',
        icon: Activity,
        action: () => {
          setActiveTab('telemetry');
          onClose();
        },
      },
      {
        id: 'nav-subsystems',
        category: 'NAVIGATION',
        title: 'Spacecraft Avionics Subsystems',
        subtitle: 'EPS, TCS, TT&C, and ADCS telemetry diagnostic matrix',
        icon: Boxes,
        action: () => {
          setActiveTab('subsystems');
          onClose();
        },
      },
      {
        id: 'nav-anomalies',
        category: 'NAVIGATION',
        title: 'Anomaly Center & ML Evaluation',
        subtitle: 'NASA benchmark metrics, P-3 incidents, and change detectors',
        icon: ShieldAlert,
        action: () => {
          setActiveTab('anomalies');
          onClose();
        },
      },
      {
        id: 'nav-copilot',
        category: 'NAVIGATION',
        title: 'AI Copilot & Mission Reasoner',
        subtitle: 'Conversational engineering assistant and Gemini diagnostics',
        icon: Sparkles,
        action: () => {
          setActiveTab('ai_assistant');
          onClose();
        },
      },
      {
        id: 'nav-events',
        category: 'NAVIGATION',
        title: 'Mission Event Log & Chronology',
        subtitle: 'Cryptographic audit ledger and MET phase tracking',
        icon: ScrollText,
        action: () => {
          setActiveTab('events');
          onClose();
        },
      },
      {
        id: 'nav-simulation',
        category: 'NAVIGATION',
        title: 'Orbital Simulation & Crisis Injector',
        subtitle: 'NASA P-3 step replays and synthetic fault testbeds',
        icon: FlaskConical,
        action: () => {
          setActiveTab('simulation');
          onClose();
        },
      },
      {
        id: 'nav-reports',
        category: 'NAVIGATION',
        title: 'Automated Mission Reports & PDF Export',
        subtitle: 'Generate post-flight debrief and cryptographic audit certification',
        icon: FileText,
        action: () => {
          setActiveTab('reports');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        category: 'NAVIGATION',
        title: 'Flight Controller Settings',
        subtitle: 'Gemini model override, P-3 threshold, and audio chimes',
        icon: Settings,
        action: () => {
          setActiveTab('settings');
          onClose();
        },
      },

      // Channels
      ...availableChannels.map((ch) => ({
        id: `chan-${ch}`,
        category: 'NASA CHANNELS',
        title: `Ingest Channel ${ch} ${ch === activeChannel ? '(ACTIVE)' : ''}`,
        subtitle: `Switch telemetry pipeline to stream NASA channel ${ch}`,
        icon: Layers,
        badge: ch === activeChannel ? 'ACTIVE' : 'SWITCH',
        action: () => {
          switchActiveChannel(ch);
          onClose();
        },
      })),

      // Procedures
      {
        id: 'act-approve-all',
        category: 'PROCEDURES',
        title: 'Authorize All Staged Contingency Commands',
        subtitle: 'Uplink safe-state protocol via DSN Madrid-63 (Human-in-the-Loop)',
        icon: CheckCircle2,
        badge: 'COMMAND',
        action: () => {
          approveAllCommands();
          onClose();
        },
      },
      {
        id: 'act-replay-p3',
        category: 'PROCEDURES',
        title: 'Replay NASA P-3 Stream (Step 5300)',
        subtitle: 'Inject pre-anomaly dataset leading to 1257-cycle step-change',
        icon: Radio,
        badge: 'STREAM',
        action: () => {
          playNasaP3Stream(5300);
          onClose();
        },
      },
      {
        id: 'act-strike-crisis',
        category: 'PROCEDURES',
        title: 'Inject Solar Array Strike & EPS Crisis Profile',
        subtitle: 'Simulate micro-meteoroid impact: Bus 11.0V, Temp 85°C, Solar 0%',
        icon: Zap,
        badge: 'CRISIS',
        action: () => {
          triggerCrisis('Solar Array Strike & EPS Bus Failure', 'crisis_solar');
          onClose();
        },
      },
      {
        id: 'act-reset-nominal',
        category: 'PROCEDURES',
        title: 'Reset Telemetry to Nominal Spacecraft State',
        subtitle: 'Restore nominal electrical, thermal, and attitude telemetry baseline',
        icon: RotateCcw,
        badge: 'RESET',
        action: () => {
          resetToNominal();
          onClose();
        },
      },
      {
        id: 'act-toggle-role',
        category: 'SECURITY / RBAC',
        title: `Switch Role: ${operatorRole === 'FLIGHT_DIRECTOR' ? 'Demote to Telemetry Observer' : 'Promote to Flight Director'}`,
        subtitle: `Current: ${operatorRole === 'FLIGHT_DIRECTOR' ? 'Flight Director (Full Uplink Clearance)' : 'Telemetry Observer (Read-Only)'}`,
        icon: Sliders,
        badge: 'RBAC',
        action: () => {
          setOperatorRole(operatorRole === 'FLIGHT_DIRECTOR' ? 'TELEMETRY_OBSERVER' : 'FLIGHT_DIRECTOR');
          onClose();
        },
      },
    ];

    if (!query.trim()) return list;

    const q = query.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [
    query,
    setActiveTab,
    availableChannels,
    activeChannel,
    switchActiveChannel,
    approveAllCommands,
    playNasaP3Stream,
    triggerCrisis,
    resetToNominal,
    operatorRole,
    setOperatorRole,
    onClose,
  ]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSelectedIndex((prev) => Math.min(items.length - 1, prev + 5));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSelectedIndex((prev) => Math.max(0, prev - 5));
      } else if (e.key === 'Home') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSelectedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSelectedIndex(items.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  // Synchronize scroll position with selected item
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    if (selectedIndex === 0 && listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedIndex === items.length - 1 && listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      return;
    }

    const activeEl = itemRefs.current[selectedIndex];
    if (activeEl) {
      activeEl.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen, items.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#ebdccb] border-2 border-[#24140b] shadow-[8px_8px_0px_0px_#24140b] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b-2 border-[#24140b] bg-[#fbf7f0]">
          <Search className="w-5 h-5 text-[#73533e] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a mission command, telemetry channel, or flight view..."
            className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-[#24140b] placeholder:text-[#8c827a]"
          />
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#ebdccb] border border-[#24140b] text-[#24140b] font-bold shadow-[1px_1px_0px_0px_#24140b]">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#ebdccb] text-[#73533e] hover:text-[#24140b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Stream */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1 command-palette-scroll"
        >
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#73533e]">
              No operational matches found for "{query}".
            </div>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onClick={() => item.action()}
                  onMouseMove={() => {
                    if (isKeyboardNavRef.current) {
                      isKeyboardNavRef.current = false;
                      return;
                    }
                    if (selectedIndex !== idx) {
                      setSelectedIndex(idx);
                    }
                  }}
                  className={`palette-card flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'palette-card-active bg-white text-[#24140b] border-2 border-[#24140b] shadow-[3px_3px_0px_0px_#24140b]'
                      : 'hover:bg-white/60 text-[#24140b] border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`palette-icon-box w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#ebdccb] border-[#24140b] text-[#24140b]'
                          : 'bg-white border-[#24140b]/20 text-[#452a19]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#24140b]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="palette-title font-bold text-xs truncate text-[#24140b]">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                              isSelected
                                ? 'bg-amber-400 text-black border-black'
                                : 'bg-[#ebdccb] text-[#24140b] border-[#24140b]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="palette-subtitle text-[11px] font-mono truncate mt-0.5 text-[#5c3d28]">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-3">
                    <span className="palette-category text-[9px] font-mono uppercase tracking-wider font-semibold text-[#73533e]">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="palette-arrow w-3.5 h-3.5 text-[#24140b]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer HUD */}
        <div className="p-3 bg-[#452a19] border-t-2 border-[#24140b] text-[#fbf7f0] text-[10px] font-mono flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-2">
            <span>ROLE: <strong>{operatorRole}</strong></span>
            <span>•</span>
            <span>ACTIVE: <strong>{activeChannel}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
