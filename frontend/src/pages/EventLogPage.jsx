import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  ScrollText,
  Clock,
  Download,
  Filter,
  Milestone,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
} from 'lucide-react';

export const EventLogPage = () => {
  const { auditLog, isCrisis } = useMission();
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const timelinePhases = [
    { name: 'Launch & Insertion', time: 'T-00:45:00', status: 'COMPLETED' },
    { name: 'Deploy Solar Arrays', time: 'T+00:12:30', status: 'COMPLETED' },
    { name: 'Nominal Orbit Ops', time: 'T+01:30:00', status: isCrisis ? 'COMPLETED' : 'ACTIVE' },
    { name: 'Anomaly Injected', time: 'T+02:15:20', status: isCrisis ? 'ACTIVE' : 'STANDBY' },
    { name: 'Gemini Recovery', time: 'T+02:18:00', status: isCrisis ? 'STAGED' : 'STANDBY' },
  ];

  const filteredLog = auditLog.filter((evt) => {
    if (filterType !== 'ALL' && evt.type !== filterType) return false;
    if (searchQuery && !evt.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.download = `astra_audit_log_${Date.now()}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#233446]" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              Flight Director Audit Trail & Mission Timeline
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Cryptographically signed mission event ledger and orbital timeline progression
          </p>
        </div>

        <button
          onClick={exportJSON}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#e6e1d7] hover:bg-slate-50 text-xs font-mono text-[#161514] shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit JSON</span>
        </button>
      </div>

      {/* PAGE 7: Mission Timeline (Visual milestones) */}
      <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Milestone className="w-4 h-4 text-[#233446]" />
            <h2 className="font-display font-bold text-base text-[#161514]">Mission Timeline Phases</h2>
          </div>
          <span className="text-xs font-mono text-[#736f68]">Orbit Revision 4,821</span>
        </div>

        {/* Timeline Horizontal Line & Steps */}
        <div className="relative pt-4 pb-2">
          <div className="absolute top-8 left-6 right-6 h-0.5 bg-slate-200 z-0" />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
            {timelinePhases.map((phase, idx) => {
              const isDone = phase.status === 'COMPLETED';
              const isActive = phase.status === 'ACTIVE';

              return (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shadow-xs ${
                      isActive
                        ? 'bg-[#fea619] text-[#233446] ring-4 ring-[#fea619]/20 scale-110'
                        : isDone
                        ? 'bg-[#233446] text-white'
                        : 'bg-white text-slate-400 border-2 border-slate-200'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>

                  <span className="font-display font-semibold text-xs text-[#161514] mt-2">
                    {phase.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#736f68]">{phase.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PAGE 6: Mission Event Log Table */}
      <div className="rounded-2xl p-6 bg-white border border-[#e6e1d7] shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event messages..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono outline-none focus:border-[#233446]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'CRITICAL', 'COMMAND_UPLINK', 'INFO', 'OK'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-[#233446] text-white font-bold'
                    : 'bg-slate-100 text-[#736f68] hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex flex-col gap-2">
          {filteredLog.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#94a3b8]">
              No events found matching your search criteria.
            </div>
          ) : (
            filteredLog.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-3 text-xs font-mono hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-[#736f68] shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{evt.time}</span>
                </div>

                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                    evt.type === 'CRITICAL'
                      ? 'bg-red-100 text-red-700'
                      : evt.type === 'COMMAND_UPLINK'
                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                      : evt.type === 'WARNING'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {evt.type}
                </span>

                <span className="text-[#161514] font-medium leading-snug flex-1">{evt.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
