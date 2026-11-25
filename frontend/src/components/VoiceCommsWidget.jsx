import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

/**
 * VoiceCommsWidget:
 * Swiss Neo-Brutalist Voice Comms Transceiver HUD positioned inside Header.jsx.
 * Displays live microphone status (MIC STANDBY, LISTENING..., UNSUPPORTED),
 * live interim speech transcript ticker pill, and quick mute/unmute toggle.
 */
export const VoiceCommsWidget = () => {
  const {
    voiceStatus,
    voiceTranscript,
    voiceLastAction,
    toggleVoiceListening,
    clearVoiceFeedback,
    settingsConfig,
    toggleAudioAlerts,
    isSpeaking,
    stopAllVoiceAudio,
  } = useMission();

  const [showHelper, setShowHelper] = useState(false);

  const isListening = voiceStatus === 'LISTENING...';
  const isUnsupported = voiceStatus === 'UNSUPPORTED';
  const isMuted = !settingsConfig?.audioAlertsEnabled;

  const hasTickerContent = Boolean(voiceTranscript || voiceLastAction || showHelper);

  return (
    <div className="relative flex items-center gap-1.5 shrink-0">
      {/* Main Push-to-Toggle Voice Transceiver Button */}
      <button
        type="button"
        onClick={() => {
          if (isUnsupported) {
            setShowHelper((prev) => !prev);
            return;
          }
          toggleVoiceListening();
        }}
        title={
          isUnsupported
            ? 'SpeechRecognition unavailable in this browser (use Chromium / Edge / Chrome)'
            : isListening
            ? 'Click to stop listening (Voice Comms Active)'
            : 'Click to activate ASTRA Voice Command Comms (e.g., "ASTRA, switch channel to P-3")'
        }
        style={
          isListening
            ? { backgroundColor: '#fea619', color: '#24140b' }
            : isUnsupported
            ? { backgroundColor: '#ebdccb', color: '#452a19' }
            : { backgroundColor: '#ffffff', color: '#452a19' }
        }
        className={`voice-mic-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-[11px] font-bold transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 select-none ${
          isListening ? 'ring-2 ring-[#dc2626]/40' : ''
        }`}
      >
        {isUnsupported ? (
          <MicOff className="w-3.5 h-3.5 text-[#73533e] shrink-0" />
        ) : isListening ? (
          <span className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] animate-ping absolute opacity-75" />
            <Mic className="w-3.5 h-3.5 text-[#24140b] relative z-10 shrink-0" />
          </span>
        ) : (
          <Mic className="w-3.5 h-3.5 text-[#452a19] shrink-0" />
        )}

        <span className="hidden sm:inline tracking-tight whitespace-nowrap">
          {voiceStatus}
        </span>

        {isSpeaking && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              stopAllVoiceAudio();
            }}
            title="Speaking briefing — click to silence TTS"
            className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-[#452a19] text-[#fea619] rounded text-[9px] font-bold"
          >
            TTS
          </span>
        )}
      </button>

      {/* Quick Audio Alerts & TTS Mute/Unmute Toggle */}
      <button
        type="button"
        onClick={toggleAudioAlerts}
        title={
          isMuted
            ? 'Acoustic Alerts & Voice Briefings MUTED (Click to Unmute)'
            : 'Acoustic Alerts & Voice Briefings ACTIVE (Click to Mute)'
        }
        style={
          isMuted
            ? { backgroundColor: '#f7f4ee', color: '#dc2626' }
            : { backgroundColor: '#ebdccb', color: '#452a19' }
        }
        className="voice-mute-btn flex items-center justify-center w-8 h-8 rounded-xl border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
        aria-label={isMuted ? 'Unmute acoustic alerts and voice briefings' : 'Mute acoustic alerts and voice briefings'}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-[#dc2626]" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-[#452a19]" />
        )}
      </button>

      {/* Live Interim Speech Transcript Ticker Pill (Zero layout shift dropdown ticker) */}
      {(isListening || hasTickerContent) && (
        <div
          className="absolute left-0 top-full mt-2 z-50 min-w-[300px] max-w-[440px] p-2.5 bg-[#f7f4ee] border-2 border-[#452a19] shadow-[3px_3px_0px_#452a19] rounded-xl font-mono text-xs text-[#161514] flex flex-col gap-1.5"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#452a19]/20">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isListening ? 'bg-[#dc2626] animate-pulse' : 'bg-[#fea619]'
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#452a19]">
                {isListening
                  ? 'VOICE COMMS ACTIVE — INTERIM TRANSCRIPT'
                  : isUnsupported
                  ? 'SPEECH ENGINE NOTICE'
                  : 'LAST VOICE COMMAND'}
              </span>
            </div>

            {!isListening && (
              <button
                type="button"
                onClick={() => {
                  setShowHelper(false);
                  clearVoiceFeedback?.();
                }}
                className="voice-mute-btn p-0.5 rounded bg-[#ebdccb] text-[#452a19] border border-[#452a19] cursor-pointer"
                aria-label="Close transcript ticker"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {isUnsupported && showHelper ? (
            <div className="text-[11px] text-[#452a19] leading-snug">
              Web Speech API (`SpeechRecognition`) is not available in this browser engine. Telemetry audio chimes &amp; TTS remain supported where available.
            </div>
          ) : voiceTranscript ? (
            <div className="px-2 py-1.5 bg-[#ffffff] border border-[#452a19] text-[#161514] font-mono text-[11px] font-semibold break-words flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#d97706] shrink-0 animate-pulse" />
              <span>&ldquo;{voiceTranscript}&rdquo;</span>
            </div>
          ) : isListening ? (
            <div className="px-2 py-1 bg-[#ebdccb] border border-[#452a19]/40 text-[#452a19] text-[11px]">
              Listening... Try: &ldquo;ASTRA, switch channel to P-3&rdquo;, &ldquo;Run AI diagnostic&rdquo;, or &ldquo;Open Anomaly Center&rdquo;
            </div>
          ) : null}

          {voiceLastAction && (
            <div
              className={`px-2 py-1 border border-[#452a19] text-[11px] font-bold flex items-center justify-between gap-2 ${
                voiceLastAction.status === 'BLOCKED' || voiceLastAction.status === 'ERROR'
                  ? 'bg-[#dc2626] text-white'
                  : voiceLastAction.status === 'PENDING_CONFIRM'
                  ? 'bg-[#fea619] text-[#24140b]'
                  : 'bg-[#ebdccb] text-[#24140b]'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {voiceLastAction.status === 'BLOCKED' || voiceLastAction.status === 'ERROR' ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                )}
                <span className="truncate">{voiceLastAction.summary}</span>
              </span>
              {voiceLastAction.tag && (
                <span className="text-[9px] px-1.5 py-0.2 bg-[#f7f4ee] text-[#24140b] border border-[#452a19] shrink-0">
                  {voiceLastAction.tag}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
