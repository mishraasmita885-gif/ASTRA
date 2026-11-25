import React, { useEffect } from 'react';
import {
  ShieldAlert,
  Mic,
  CheckCircle2,
  XCircle,
  Lock,
  Radio,
  AlertTriangle,
} from 'lucide-react';

/**
 * VoiceApprovalConfirmModal:
 * Enforces explicit Human-in-the-Loop (HITL) and RBAC confirmation when a voice
 * command requests authorizing staged spacecraft commands ("approve all commands").
 */
export const VoiceApprovalConfirmModal = ({
  isOpen,
  approvalRequest,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !approvalRequest) return null;

  const { transcript, anomalyId, commands = [], operatorRole } = approvalRequest;
  const pendingCommands = commands.filter((c) => c.status !== 'APPROVED' && c.status !== 'REJECTED');
  const displayCommands = pendingCommands.length > 0 ? pendingCommands : commands;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg flex flex-col overflow-hidden bg-[#f7f4ee] border-2 border-[#452a19] shadow-[6px_6px_0px_#452a19]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-hitl-confirm-title"
      >
        {/* Top Tactical Amber/Brown Strip */}
        <div className="px-5 py-3 bg-[#fea619] border-b-2 border-[#452a19] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-extrabold uppercase tracking-wider text-[#24140b]">
            <ShieldAlert className="w-4 h-4 text-[#24140b]" />
            <span id="voice-hitl-confirm-title">HITL Voice Authorization Interlock</span>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#452a19] text-[#f7f4ee] border border-[#24140b]">
            {operatorRole || 'FLIGHT_DIRECTOR'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 text-[#161514]">
          {/* Spoken Transcript Verification Box */}
          <div className="p-3 bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-[#452a19]">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#dc2626]" /> Intercepted Voice Intent
              </span>
              <span className="px-1.5 py-0.5 bg-[#f7f4ee] border border-[#452a19] text-[#452a19]">
                SOURCE: VOICE_COMMAND
              </span>
            </div>
            <p className="font-mono text-xs font-bold text-[#161514] mt-1">
              &ldquo;{transcript}&rdquo;
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-xs font-mono text-[#452a19] bg-white p-3 border-2 border-[#452a19]">
            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
            <span>
              <strong>Safety Rule 1.1:</strong> Voice commands cannot bypass Human-in-the-Loop (HITL) authorization. Verify the staged contingency uplinks below for{' '}
              <strong>{anomalyId || 'active incident'}</strong> before confirming transmission.
            </span>
          </div>

          {/* Commands Preview */}
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#452a19]">
              Staged Commands Queued for Uplink ({displayCommands.length})
            </span>
            {displayCommands.length === 0 ? (
              <div className="p-3 bg-white border border-[#452a19] font-mono text-xs text-[#452a19]">
                No pending staged commands found for this incident.
              </div>
            ) : (
              displayCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="p-2.5 bg-white border-2 border-[#452a19] flex items-center justify-between gap-2 font-mono text-xs"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[#161514] truncate">{cmd.name || cmd.id}</span>
                    <span className="text-[10px] text-[#73533e] truncate">
                      {cmd.subsystem || 'EPS / INSTRUMENTATION'} • {cmd.desc || 'Safe-state procedure'}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-[#fea619] text-[#24140b] border border-[#452a19] font-bold shrink-0">
                    {cmd.status || 'PENDING'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t-2 border-[#452a19]/20">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <XCircle className="w-4 h-4 text-[#dc2626]" />
              <span>Cancel (ESC)</span>
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <Radio className="w-4 h-4" />
              <span>Confirm & Authorize Uplink</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
