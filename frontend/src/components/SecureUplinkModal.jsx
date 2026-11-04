import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Lock,
  Copy,
  Check,
  Radio,
  Send,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const SecureUplinkModal = ({
  isOpen,
  uplinkData,
  onAbort,
  onTransmit,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [isAborted, setIsAborted] = useState(false);
  const [isTransmitted, setIsTransmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const timerRef = useRef(null);
  const hasTransmittedRef = useRef(false);

  // Initialize or reset timer whenever modal opens with new uplinkData
  useEffect(() => {
    if (!isOpen || !uplinkData) {
      setTimeLeft(10.0);
      setIsAborted(false);
      setIsTransmitted(false);
      hasTransmittedRef.current = false;
      return;
    }

    const windowSec = uplinkData.window_seconds || 10.0;
    const expiresEpoch = uplinkData.expires_at_epoch || (Date.now() / 1000 + windowSec);
    hasTransmittedRef.current = false;
    setIsAborted(false);
    setIsTransmitted(false);

    const updateTimer = () => {
      const remaining = Math.max(0, expiresEpoch - Date.now() / 1000);
      setTimeLeft(parseFloat(remaining.toFixed(1)));

      if (remaining <= 0.05 && !hasTransmittedRef.current) {
        hasTransmittedRef.current = true;
        clearInterval(timerRef.current);
        handleAutoTransmit();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, uplinkData]);

  // Handle ESC key to immediately trigger abort
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isTransmitted && !isAborted) {
        handleManualAbort();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTransmitted, isAborted]);

  if (!isOpen || !uplinkData) return null;

  const totalTime = uplinkData.window_seconds || 10.0;
  const progressRatio = Math.max(0, Math.min(1, timeLeft / totalTime));
  // SVG circular perimeter for r = 42: 2 * PI * 42 ≈ 263.89
  const circumference = 263.89;
  const strokeDashoffset = circumference * (1 - progressRatio);

  function handleManualAbort() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAborted(true);
    if (onAbort) {
      onAbort(uplinkData.command_id, 'Flight Director pressed ABORT TRANSMISSION');
    }
    setTimeout(() => {
      if (onClose) onClose();
    }, 1200);
  };

  function handleAutoTransmit() {
    setIsTransmitted(true);
    if (onTransmit) {
      onTransmit(uplinkData.command_id, uplinkData.signature);
    }
    setTimeout(() => {
      if (onClose) onClose();
    }, 1500);
  };

  const handleCopyHash = () => {
    if (uplinkData?.signature) {
      navigator.clipboard.writeText(uplinkData.signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-xl rounded-none flex flex-col overflow-hidden"
        style={{
          background: '#f7f4ee',
          border: '3px solid #452a19',
          boxShadow: '6px 6px 0px #452a19',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* Top Emergency Warning Banner */}
        <div
          className="p-3.5 border-b-2 flex items-center justify-between"
          style={{
            background: isAborted ? '#3b0000' : isTransmitted ? '#064e3b' : '#451a03',
            borderColor: '#452a19',
            color: isAborted ? '#ef4444' : isTransmitted ? '#34d399' : '#fea619',
          }}
        >
          <div className="flex items-center gap-2.5">
            {isAborted ? (
              <XCircle className="w-5 h-5 text-red-500 animate-bounce" />
            ) : isTransmitted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-amber-500 animate-pulse" />
            )}
            <span className="text-xs font-black uppercase tracking-wider">
              {isAborted
                ? 'TRANSMISSION ABORTED · COMMAND PURGED'
                : isTransmitted
                ? 'UPLINK TRANSMITTED · CRYPTOGRAPHICALLY SIGNED'
                : 'T-MINUS SECURE COMMAND UPLINK HANDSHAKE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 bg-black/40 border border-current">
            <Radio className="w-3 h-3" />
            <span>{uplinkData.spacecraft_id || 'ASTRA-ALPHA'}</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 space-y-6">
          {/* Circular Countdown Progress & Command Label */}
          <div className="flex items-center gap-6 bg-[#ebdccb] p-4 border-2 border-[#452a19] shadow-[3px_3px_0_#452a19]">
            {/* SVG Countdown Ring */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#7c5d42"
                  strokeWidth="8"
                  opacity="0.3"
                />
                {/* Active Depleting Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke={isAborted ? '#ef4444' : isTransmitted ? '#10b981' : timeLeft < 3.5 ? '#ef4444' : '#fea619'}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                />
              </svg>

              {/* Center Digital Clock */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span
                  className="text-2xl font-black leading-none"
                  style={{
                    color: isAborted ? '#ef4444' : isTransmitted ? '#059669' : timeLeft < 3.5 ? '#dc2626' : '#452a19',
                  }}
                >
                  {isAborted ? 'ABORT' : isTransmitted ? 'SENT' : `${timeLeft.toFixed(1)}s`}
                </span>
                <span className="text-[8px] font-bold uppercase text-[#7c5d42] mt-0.5">
                  {isAborted ? 'REVOKED' : isTransmitted ? 'COMPLETE' : 'ABORT TIMER'}
                </span>
              </div>
            </div>

            {/* Command Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 font-bold uppercase bg-[#452a19] text-[#f7f4ee]">
                  {uplinkData.subsystem || 'SUBSYSTEM'}
                </span>
                <span className="text-[10px] text-[#7c5d42] font-bold">
                  {uplinkData.command_id}
                </span>
              </div>

              <h3 className="text-base font-black text-[#452a19] uppercase leading-tight truncate">
                {uplinkData.command_name || 'Contingency Command Uplink'}
              </h3>

              <p className="text-xs text-[#7c5d42] mt-1 line-clamp-2">
                Flight Director clearance verified. Command queued for autonomous uplink via DSN Madrid-63 crosslink upon T-0.
              </p>
            </div>
          </div>

          {/* Cryptographic SHA-256 HMAC Fingerprint Box */}
          <div className="bg-[#1a0e08] border-2 border-[#452a19] p-3.5 shadow-[2px_2px_0_#452a19] text-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#fea619] mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-[#fea619]" />
                HMAC-SHA256 AUTHORIZATION FINGERPRINT
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#452a19] text-[#ebdccb] hover:bg-[#fea619] hover:text-black border border-[#fea619] transition-all cursor-pointer font-bold"
                title="Copy Full Cryptographic Signature"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>

            <div className="p-2 bg-black/60 border border-[#452a19] font-mono text-[11px] text-[#ebdccb] break-all select-all leading-relaxed">
              {uplinkData.signature || '7f4a2b91c83d6e5a0f2b4c8e1a3d5f7b9c1e3a5d7f9b1c3e5a7d9f1b3c5e7a9d'}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-[#a88a6d]">
              <span>ALGORITHM: <strong className="text-[#ebdccb]">HMAC-SHA256</strong></span>
              <span>SIGNER: <strong className="text-[#ebdccb]">{uplinkData.operator_id || 'Flight Director'}</strong></span>
            </div>
          </div>

          {/* State Feedback Banners */}
          {isAborted && (
            <div className="p-3 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>COMMAND ABORTED: Security token revoked. No uplink transmission was dispatched.</span>
            </div>
          )}

          {isTransmitted && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>TRANSMISSION COMPLETE: Cryptographic token permanently recorded in SQLite astra.db ledger.</span>
            </div>
          )}

          {/* Action Buttons */}
          {!isAborted && !isTransmitted && (
            <div className="flex items-center gap-3 pt-2">
              {/* Prominent High-Urgency Abort Button */}
              <button
                onClick={handleManualAbort}
                className="flex-1 py-3 px-4 border-2 border-[#452a19] bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-sm uppercase shadow-[3px_3px_0_#452a19] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4" />
                ABORT TRANSMISSION (ESC)
              </button>

              {/* Transmit Immediately Shortcut Button */}
              <button
                onClick={handleAutoTransmit}
                className="py-3 px-4 border-2 border-[#452a19] bg-[#ebdccb] hover:bg-[#fea619] text-[#452a19] font-bold text-xs uppercase shadow-[2px_2px_0_#452a19] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Bypass Remaining Seconds & Transmit Immediately"
              >
                <Send className="w-3.5 h-3.5" />
                TRANSMIT NOW
              </button>
            </div>
          )}
        </div>

        {/* Tactical Footer */}
        <div
          className="p-3 border-t-2 flex items-center justify-between text-[10px] text-[#7c5d42]"
          style={{ background: '#ebdccb', borderColor: '#452a19' }}
        >
          <span>ASTRA AEROSPACE SECURITY · PROTOCOL RFC-2104</span>
          <span>AUTONOMOUS UPLINK IN: <strong>{timeLeft.toFixed(1)}s</strong></span>
        </div>
      </div>
    </div>
  );
};

