/**
 * ASTRA Voice-Controlled Mission Control & Synthesized Audio Alert Engine
 * Zero external audio assets: uses native Web Audio API oscillators,
 * Web Speech API SpeechSynthesis, and Web Speech API SpeechRecognition.
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function scheduleTone(ctx, { freq, endFreq, type = 'sine', startOffset = 0, duration = 0.2, peakGain = 0.14 }) {
  const startTime = ctx.currentTime + startOffset;
  const stopTime = startTime + duration;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (endFreq && endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, stopTime);
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(stopTime + 0.015);
}

/**
 * Procedural Web Audio API alarm synthesizer (Zero static audio assets).
 * Severity modes: CRITICAL, HIGH, WARNING, COMMAND_CONFIRMED, SUCCESS, DENIED, NOMINAL
 */
export function playAcousticAlert(severity = 'WARNING', { enabled = true } = {}) {
  if (!enabled || typeof window === 'undefined') return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const key = String(severity || 'WARNING').trim().toUpperCase();

    if (key === 'CRITICAL') {
      // Dual-tone staggered square/sine master alarm pulse: 880 Hz -> 1046.5 Hz
      scheduleTone(ctx, { freq: 880, type: 'square', startOffset: 0.0, duration: 0.13, peakGain: 0.08 });
      scheduleTone(ctx, { freq: 880, type: 'sine', startOffset: 0.0, duration: 0.13, peakGain: 0.12 });
      scheduleTone(ctx, { freq: 1046.5, type: 'square', startOffset: 0.16, duration: 0.22, peakGain: 0.09 });
      scheduleTone(ctx, { freq: 1046.5, type: 'sine', startOffset: 0.16, duration: 0.22, peakGain: 0.13 });
      return true;
    }

    if (key === 'HIGH' || key === 'WARNING') {
      // Crisp 660 Hz telemetry attention chime
      scheduleTone(ctx, { freq: 660, type: 'triangle', startOffset: 0.0, duration: 0.26, peakGain: 0.14 });
      scheduleTone(ctx, { freq: 660, type: 'sine', startOffset: 0.0, duration: 0.26, peakGain: 0.08 });
      return true;
    }

    if (key === 'COMMAND_CONFIRMED' || key === 'SUCCESS') {
      // Ascending two-note harmonic confirmation: C5 (523.25 Hz) -> G5 (783.99 Hz)
      scheduleTone(ctx, { freq: 523.25, type: 'sine', startOffset: 0.0, duration: 0.14, peakGain: 0.13 });
      scheduleTone(ctx, { freq: 783.99, type: 'sine', startOffset: 0.13, duration: 0.24, peakGain: 0.14 });
      return true;
    }

    if (key === 'DENIED' || key === 'ERROR') {
      // Low descending two-note caution for RBAC blocks or invalid requests
      scheduleTone(ctx, { freq: 330, type: 'sawtooth', startOffset: 0.0, duration: 0.14, peakGain: 0.08 });
      scheduleTone(ctx, { freq: 220, type: 'sawtooth', startOffset: 0.15, duration: 0.22, peakGain: 0.09 });
      return true;
    }

    // Default / NOMINAL / NORMAL subtle crisp confirmation blip
    scheduleTone(ctx, { freq: 587.33, type: 'sine', startOffset: 0.0, duration: 0.16, peakGain: 0.09 });
    return true;
  } catch (err) {
    console.warn('[ASTRA Audio] Web Audio synthesis error:', err);
    return false;
  }
}

// ============================================================================
// Dynamic Text-to-Speech Operational Briefings (window.speechSynthesis)
// ============================================================================

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

function selectAuthoritativeEnglishVoice() {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const preferredNames = [
    'google us english',
    'microsoft david',
    'microsoft mark',
    'microsoft aria',
    'daniel',
    'samantha',
    'alex',
    'google uk english male',
    'google uk english female',
  ];

  const englishVoices = voices.filter((v) => String(v.lang || '').toLowerCase().startsWith('en'));
  for (const pref of preferredNames) {
    const match = englishVoices.find((v) => v.name.toLowerCase().includes(pref));
    if (match) return match;
  }

  return englishVoices.find((v) => v.localService) || englishVoices[0] || voices[0];
}

export function cancelAllSpeech() {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn('[ASTRA TTS] Cancel error:', e);
  }
}

/**
 * Speak operational briefing dynamically using Web Speech Synthesis.
 * High/Critical priority cancels lower-priority queued utterances immediately.
 */
export function speakOperationalBriefing(
  text,
  priority = 'NORMAL',
  { enabled = true, rate = 1.04, pitch = 0.98, onStart, onEnd, onError } = {}
) {
  if (!enabled || !text || !isSpeechSynthesisSupported()) {
    onEnd?.();
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    const upperPriority = String(priority || 'NORMAL').toUpperCase();

    // Critical/High priority or explicit immediate readouts interrupt queued chatter
    if (upperPriority === 'CRITICAL' || upperPriority === 'HIGH' || upperPriority === 'IMMEDIATE') {
      synth.cancel();
    }

    const utterance = new window.SpeechSynthesisUtterance(String(text));
    const voice = selectAuthoritativeEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = (err) => {
      onError?.(err);
      onEnd?.();
    };

    synth.speak(utterance);
    return true;
  } catch (err) {
    console.warn('[ASTRA TTS] SpeechSynthesis notice:', err);
    onEnd?.();
    return false;
  }
}

/**
 * Dynamically compose an anomaly readout from live telemetry & event metrics.
 */
export function buildAnomalyBriefing({
  severity = 'HIGH',
  channel = 'P-3',
  score,
  threshold,
  voltage,
  temperature,
  spacecraftId,
} = {}) {
  const parts = [];
  const cleanSev = String(severity || 'HIGH').toLowerCase();
  const craft = spacecraftId ? spacecraftId.replace('ASTRA-', 'ASTRA ') : 'ASTRA';

  parts.push(`Alert on ${craft}. ${cleanSev} severity anomaly detected on channel ${channel}.`);

  if (score !== undefined && score !== null && !Number.isNaN(Number(score))) {
    const scoreStr = Number(score).toFixed(3);
    if (threshold !== undefined && threshold !== null) {
      parts.push(`Peak deviation score ${scoreStr}, exceeding threshold ${Number(threshold).toFixed(3)}.`);
    } else {
      parts.push(`Peak deviation score ${scoreStr}.`);
    }
  }

  if (voltage !== undefined && temperature !== undefined) {
    parts.push(`Bus voltage ${Number(voltage).toFixed(1)} volts. Core temperature ${Number(temperature).toFixed(1)} degrees Celsius.`);
  }

  parts.push('Operator review required.');
  return parts.join(' ');
}

/**
 * Dynamically compose a spoken readout from a live Gemini structured diagnosis.
 */
export function buildDiagnosisBriefing(anomaly) {
  if (!anomaly) return '';
  const diag = anomaly.geminiDiagnosis || anomaly.gemini_analysis || {};
  const rootCause = diag.rootCause || diag.diagnosis;
  const recommendation = diag.recommendedAction || diag.recommendation;
  const channel = anomaly.rawEvent?.channel || anomaly.channel || 'P-3';
  const severity = anomaly.severity || diag.severity || 'HIGH';

  const segments = [
    `AI diagnostic summary for ${anomaly.id || 'active anomaly'} on channel ${channel}.`,
    `Assessed severity: ${String(severity).toLowerCase()}.`,
  ];

  if (rootCause) {
    segments.push(`Root cause: ${rootCause}`);
  }
  if (diag.survivalProbability !== undefined && diag.survivalProbability !== null) {
    segments.push(`Estimated margin probability ${diag.survivalProbability} percent.`);
  }
  if (recommendation) {
    segments.push(`Recommended action: ${recommendation}`);
  }

  return segments.join(' ');
}

export function buildStatusBriefing({ telemetry, activeChannel, activeSpacecraft, isCrisis, runwayAlarms = [] } = {}) {
  const craft = (activeSpacecraft || 'ASTRA-ALPHA').replace('ASTRA-', 'ASTRA ');
  const stateLabel = isCrisis ? 'Active anomaly alert' : 'All systems nominal';
  const v = telemetry?.voltage != null ? Number(telemetry.voltage).toFixed(1) : 'unknown';
  const t = telemetry?.temperature != null ? Number(telemetry.temperature).toFixed(1) : 'unknown';
  const bat = telemetry?.battery_pct != null ? Number(telemetry.battery_pct).toFixed(1) : 'unknown';
  const solar = telemetry?.solar_input != null ? Number(telemetry.solar_input).toFixed(1) : 'unknown';

  const msg = [
    `${craft} telemetry briefing. ${stateLabel} on channel ${activeChannel || 'P-3'}.`,
    `Bus voltage ${v} volts. Core temperature ${t} degrees Celsius. Battery state of charge ${bat} percent. Solar output ${solar} percent.`,
  ];

  if (runwayAlarms && runwayAlarms.length > 0) {
    const top = runwayAlarms[0];
    const ttb = Math.max(0, Math.round(top.time_to_breach_sec || 0));
    msg.push(`Predictive runway alarm active on ${top.channel}, ${ttb} seconds until threshold breach.`);
  }

  return msg.join(' ');
}

// ============================================================================
// Natural Language Intent Parser (Dynamic against live 82-channel matrix)
// ============================================================================

const NUMBER_WORDS = {
  zero: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3,
  four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24,
  'twenty five': 25, 'twenty six': 26, 'twenty seven': 27, 'twenty eight': 28,
  'twenty nine': 29, thirty: 30, 'thirty one': 31, 'thirty two': 32,
  'thirty three': 33, 'thirty four': 34,
};

const CHANNEL_PREFIX_ALIASES = {
  power: 'P', pea: 'P', pee: 'P', p: 'P',
  thermal: 'T', temperature: 'T', temp: 'T', tea: 'T', tee: 'T', t: 'T',
  attitude: 'A', adcs: 'A', a: 'A',
  avionics: 'D', data: 'D', dee: 'D', d: 'D',
  comms: 'C', communication: 'C', communications: 'C', see: 'C', sea: 'C', c: 'C',
  environmental: 'E', environment: 'E', env: 'E', e: 'E',
  s: 'S', m: 'M', f: 'F', g: 'G', b: 'B', r: 'R',
};

function normalizeNumberWords(input) {
  let out = input;
  // Replace multi-word numbers first ("twenty one" -> "21")
  const sortedKeys = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);
  for (const word of sortedKeys) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(regex, String(NUMBER_WORDS[word]));
  }
  return out;
}

/**
 * Dynamically resolve spoken channel strings (e.g. "P-3", "thermal 2", "see 14")
 * against the live 82-channel matrix supplied by backend telemetry_service.
 */
export function resolveSpokenChannel(rawText, availableChannels = []) {
  if (!rawText || !Array.isArray(availableChannels) || availableChannels.length === 0) {
    return null;
  }

  const normalized = normalizeNumberWords(
    rawText.toLowerCase().replace(/[-–—]/g, ' ').replace(/[^\w\s]/g, ' ')
  ).replace(/\s+/g, ' ').trim();

  // Direct exact code check in utterance (e.g. "p3", "p 3", "c 14", "t 2")
  const tokens = normalized.split(' ');

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // Combined token like "p3", "c14", "t2"
    const combined = tok.match(/^([a-z]+)(\d{1,2})$/);
    if (combined) {
      const prefix = CHANNEL_PREFIX_ALIASES[combined[1]];
      if (prefix) {
        const candidate = `${prefix}-${Number(combined[2])}`;
        const exact = availableChannels.find((c) => c.toUpperCase() === candidate);
        if (exact) return exact;
      }
    }

    // Separate tokens like "thermal 2", "p 3", "channel c 14", "see 14"
    const nextTok = tokens[i + 1];
    if (nextTok && /^\d{1,2}$/.test(nextTok)) {
      const prefix = CHANNEL_PREFIX_ALIASES[tok];
      if (prefix) {
        const candidate = `${prefix}-${Number(nextTok)}`;
        const exact = availableChannels.find((c) => c.toUpperCase() === candidate);
        if (exact) return exact;
      }
    }
  }

  return null;
}

const NAVIGATION_INTENTS = [
  { tab: 'anomalies', subTab: 'fault-tree', label: 'Fault Tree Analysis', phrases: ['fault tree', 'cascading graph', 'failure tree', 'failure graph'] },
  { tab: 'anomalies', subTab: 'inspector', label: 'Anomaly Center', phrases: ['anomaly center', 'anomalies', 'anomaly page', 'anomaly detection'] },
  { tab: 'telemetry', label: 'Live Telemetry', phrases: ['live telemetry', 'telemetry page', 'telemetry console', 'waveforms'] },
  { tab: 'subsystems', label: 'Subsystems', phrases: ['subsystems', 'subsystem monitor', 'avionics'] },
  { tab: 'events', label: 'Event Log', phrases: ['event log', 'audit log', 'audit trail', 'mission log'] },
  { tab: 'reports', label: 'Mission Reports', phrases: ['mission reports', 'flight reports', 'reports', 'debrief', 'pdf report'] },
  { tab: 'ai_assistant', label: 'AI Copilot', phrases: ['ai assistant', 'ai copilot', 'copilot', 'assistant'] },
  { tab: 'fleet', label: 'Fleet Mesh', phrases: ['fleet overview', 'fleet mesh', 'constellation', 'fleet page'] },
  { tab: 'orbital', label: 'Orbital Track', phrases: ['orbital mechanics', 'orbital track', 'ground track', 'orbit map', 'orbital'] },
  { tab: 'simulation', label: 'Simulation', phrases: ['simulation page', 'simulation', 'simulator', 'crisis injector'] },
  { tab: 'settings', label: 'Settings', phrases: ['settings', 'preferences', 'configuration'] },
  { tab: 'overview', label: 'Mission Overview', phrases: ['mission overview', 'overview', 'dashboard', 'home'] },
  { tab: 'welcome', label: 'Welcome Deck', phrases: ['welcome page', 'welcome'] },
];

/**
 * Parse a spoken operator phrase into an executable mission intent.
 * Uses only dynamic app state (availableChannels, fleetNodes).
 */
export function parseVoiceIntent(rawTranscript, { availableChannels = [], fleetNodes = [] } = {}) {
  const original = String(rawTranscript || '').trim();
  if (!original) return null;

  const lower = original.toLowerCase().trim();
  const wakeRegex = /^(?:hey\s+|ok\s+|okay\s+)?(?:astra|flight\s+control|computer)[\s,.:;-]*/i;
  const hasWakeWord = wakeRegex.test(lower);
  const cleaned = lower.replace(wakeRegex, '').trim();

  if (!cleaned) {
    return { type: 'WAKE_ACK', raw: original, hasWakeWord };
  }

  // 1. RBAC / Human-in-the-Loop Command Approval (NEVER bypasses confirmation modal!)
  if (/\b(approve|authorize|execute|uplink)\s+(all|staged|every)\b/.test(cleaned) || /\bapprove all\b/.test(cleaned)) {
    return {
      type: 'APPROVE_ALL_COMMANDS',
      requireConfirmation: true,
      raw: original,
      hasWakeWord,
    };
  }

  if (/\b(approve|authorize)\s+(command|next command|first command|recovery)\b/.test(cleaned)) {
    return {
      type: 'APPROVE_NEXT_COMMAND',
      requireConfirmation: true,
      raw: original,
      hasWakeWord,
    };
  }

  // 2. Stop / Mute / Unmute Audio
  if (/\b(stop talking|stop speaking|silence|shut up|stop audio|stop readout)\b/.test(cleaned)) {
    return { type: 'STOP_SPEAKING', raw: original, hasWakeWord };
  }

  if (/\b(unmute|enable|turn on)\s+(audio|alerts|voice|sound|chimes)\b/.test(cleaned)) {
    return { type: 'SET_AUDIO_MUTE', muted: false, raw: original, hasWakeWord };
  }

  if (/\b(mute|disable|turn off)\s+(audio|alerts|voice|sound|chimes)\b/.test(cleaned)) {
    return { type: 'SET_AUDIO_MUTE', muted: true, raw: original, hasWakeWord };
  }

  // 3. AI Diagnostic Execution & Diagnosis Readout
  if (
    /\b(read|speak)\b.*\b(diagnosis|diagnostic|analysis|root cause|recommendation)\b/.test(cleaned)
  ) {
    return { type: 'READ_DIAGNOSIS', raw: original, hasWakeWord };
  }

  if (
    /\b(run|execute|start|trigger|perform)\b.*\b(ai|gemini|diagnostic|diagnosis|reasoning|analysis)\b/.test(cleaned) ||
    /\b(analyze|diagnose)\b.*\b(anomaly|incident|active|event|telemetry|p3|p-3)\b/.test(cleaned) ||
    cleaned === 'run diagnostic' ||
    cleaned === 'analyze'
  ) {
    return { type: 'RUN_AI_DIAGNOSTIC', raw: original, hasWakeWord };
  }

  // 4. Replay & Simulation Controls
  if (
    /\b(start|run|play|trigger|begin)\b.*\b(p\s*-?\s*3|p three|replay|dataset)\b/.test(normalizeNumberWords(cleaned)) ||
    /\bp\s*-?\s*3\s+replay\b/.test(normalizeNumberWords(cleaned))
  ) {
    return { type: 'START_P3_REPLAY', raw: original, hasWakeWord };
  }

  if (/\b(reset|restore)\b.*\b(nominal|normal|baseline|spacecraft)\b/.test(cleaned) || cleaned === 'reset nominal') {
    return { type: 'RESET_NOMINAL', raw: original, hasWakeWord };
  }

  if (/\b(simulate|trigger|inject)\b.*\b(crisis|strike|anomaly|solar|failure)\b/.test(cleaned)) {
    return { type: 'TRIGGER_CRISIS', raw: original, hasWakeWord };
  }

  // 5. Telemetry Status Briefing
  if (/\b(status report|telemetry briefing|read telemetry|system status|spacecraft status)\b/.test(cleaned)) {
    return { type: 'STATUS_BRIEFING', raw: original, hasWakeWord };
  }

  // 6. Constellation Spacecraft Switching (resolved against live fleetNodes)
  if (/\b(switch|focus|select)\b.*\b(spacecraft|satellite|craft|node)\b/.test(cleaned) || /\bfocus\s+(alpha|beta|gamma)\b/.test(cleaned)) {
    const matchedNode = (fleetNodes || []).find((node) => {
      const shortName = node.id.replace('ASTRA-', '').toLowerCase();
      return cleaned.includes(shortName) || cleaned.includes(node.id.toLowerCase());
    });
    if (matchedNode) {
      return { type: 'SWITCH_SPACECRAFT', spacecraftId: matchedNode.id, label: matchedNode.name, raw: original, hasWakeWord };
    }
  }

  // 7. Dynamic Channel Switching against live 82-channel matrix
  const resolvedChannel = resolveSpokenChannel(cleaned, availableChannels);
  if (
    resolvedChannel &&
    (/\b(channel|switch|select|monitor|ingest|tune|change|focus|show)\b/.test(cleaned) || tokensAreShortChannel(cleaned))
  ) {
    return { type: 'SWITCH_CHANNEL', channel: resolvedChannel, raw: original, hasWakeWord };
  }

  // Fallback if they clearly asked to switch channel to something not in the 82-channel list
  if (/\b(switch|change|select|monitor)\s+channel\b/.test(cleaned)) {
    return { type: 'UNKNOWN_CHANNEL', raw: original, hasWakeWord };
  }

  // 8. Page Navigation
  for (const nav of NAVIGATION_INTENTS) {
    for (const phrase of nav.phrases) {
      if (cleaned.includes(phrase)) {
        return {
          type: 'NAVIGATE',
          tab: nav.tab,
          subTab: nav.subTab || null,
          label: nav.label,
          raw: original,
          hasWakeWord,
        };
      }
    }
  }

  return { type: 'UNRECOGNIZED', raw: original, cleaned, hasWakeWord };
}

function tokensAreShortChannel(cleaned) {
  return cleaned.split(/\s+/).length <= 3;
}

// ============================================================================
// Web Speech API SpeechRecognition Wrapper
// ============================================================================

export function isSpeechRecognitionSupported() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export class VoiceCommandController {
  constructor({ onStatusChange, onInterimTranscript, onFinalTranscript, onError } = {}) {
    this.onStatusChange = onStatusChange;
    this.onInterimTranscript = onInterimTranscript;
    this.onFinalTranscript = onFinalTranscript;
    this.onError = onError;

    this.recognition = null;
    this.isArmed = false;
    this.restartTimer = null;
  }

  isSupported() {
    return isSpeechRecognitionSupported();
  }

  start() {
    if (!this.isSupported()) {
      this.isArmed = false;
      this.onStatusChange?.('UNSUPPORTED');
      return false;
    }

    if (this.isArmed && this.recognition) {
      return true;
    }

    // Unlock/resume AudioContext cleanly inside the user click gesture!
    getAudioContext();

    this.isArmed = true;
    this._createAndStartRecognition();
    return true;
  }

  _createAndStartRecognition() {
    if (!this.isArmed) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.onStatusChange?.('UNSUPPORTED');
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (_) {}
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 2;

    rec.onstart = () => {
      if (this.isArmed) {
        this.onStatusChange?.('LISTENING...');
      }
    };

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) {
          this.onInterimTranscript?.('');
          if (transcript.trim()) {
            this.onFinalTranscript?.(transcript.trim());
          }
        } else {
          interim += transcript;
        }
      }
      if (interim.trim()) {
        this.onInterimTranscript?.(interim.trim());
      }
    };

    rec.onerror = (event) => {
      const errCode = event?.error || 'unknown';
      if (errCode === 'no-speech' || errCode === 'aborted') {
        return; // Normal idle cycle; onend will gracefully restart if still armed
      }
      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        this.isArmed = false;
        this.onStatusChange?.('MIC STANDBY');
        this.onError?.('Microphone permission denied by browser.');
        return;
      }
      this.onError?.(`Speech engine notice: ${errCode}`);
    };

    rec.onend = () => {
      if (this.isArmed) {
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (this.isArmed) {
            try {
              this._createAndStartRecognition();
            } catch (_) {
              this.isArmed = false;
              this.onStatusChange?.('MIC STANDBY');
            }
          }
        }, 250);
      } else {
        this.onStatusChange?.('MIC STANDBY');
      }
    };

    this.recognition = rec;
    try {
      rec.start();
      this.onStatusChange?.('LISTENING...');
    } catch (err) {
      this.onError?.(err?.message || 'Unable to start speech recognition');
      this.isArmed = false;
      this.onStatusChange?.('MIC STANDBY');
    }
  }

  stop() {
    this.isArmed = false;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (_) {}
      this.recognition = null;
    }
    this.onInterimTranscript?.('');
    this.onStatusChange?.(this.isSupported() ? 'MIC STANDBY' : 'UNSUPPORTED');
  }

  destroy() {
    this.stop();
  }
}
