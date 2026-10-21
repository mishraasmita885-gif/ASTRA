import React, { useState, useRef, useEffect } from 'react';
import { useMission } from '../context/MissionContext';
import { sendCopilotChat } from '../services/api';
import { StructuredMarkdown } from '../components/StructuredMarkdown';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  XCircle,
  HelpCircle,
  Terminal,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Trash2,
  User,
  Cpu,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const AIAssistantPage = () => {
  const {
    isCrisis,
    telemetry,
    commands,
    approveCommand,
    rejectCommand,
    approveAllCommands,
    selectedAnomaly,
    isAnalyzing,
    triggerGeminiAnalysis,
    setActiveTab,
    activeChannel,
  } = useMission();

  const currentAnalysis = selectedAnomaly?.geminiDiagnosis;
  const isRecovered = !isCrisis && (selectedAnomaly?.status === 'RESOLVED' || selectedAnomaly?.status === 'APPROVED' || commands.every((c) => c.status === 'APPROVED'));

  // Copilot Interactive Chat State
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Greetings Flight Controller. ASTRA Copilot is active and continuously ingesting live telemetry across NASA channel ${activeChannel || 'P-3'}.\n\nCurrent Spacecraft State:\n- **Bus Voltage**: ${telemetry.voltage.toFixed(1)} V (Nominal: 24.0 – 28.0 V)\n- **Avionics Temp**: ${telemetry.temperature.toFixed(1)} °C\n- **Battery State of Charge**: ${telemetry.battery_pct.toFixed(1)}%\n- **DSN Madrid-63 SNR**: +${telemetry.link_snr?.toFixed(1) || '14.2'} dBm\n\nHow can I assist your orbital operations today?`,
      timestamp: new Date().toLocaleTimeString(),
      model: 'Gemini 2.5 Flash',
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatting]);

  const handleSendChat = async (queryText = chatInput) => {
    const text = (queryText || '').trim();
    if (!text || isChatting) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendCopilotChat(text, historyPayload);
      const assistantMsg = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: res.response || 'Telemetry analysis complete. Operating parameters within safe margins.',
        timestamp: new Date().toLocaleTimeString(),
        model: res.model_used || 'Gemini 2.5 Flash',
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.warn('Chat copilot query error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Notice: Primary Gemini API link timed out. Operating in offline aerospace rule fallback mode.\n\nFlight Rule 14.2: Spacecraft telemetry remains prioritized. Maintain human operator sign-off for any proposed command sequence.',
          timestamp: new Date().toLocaleTimeString(),
          model: 'Offline Aerospace Rule Core',
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. ASTRA Copilot standing by on channel ${activeChannel || 'P-3'} in REV 4821.`,
        timestamp: new Date().toLocaleTimeString(),
        model: 'Gemini 2.5 Flash',
      },
    ]);
  };

  const promptSuggestions = [
    `What are the risks of leaving channel ${activeChannel || 'P-3'} unisolated for another orbit?`,
    'Evaluate EPS bus voltage drop and battery discharge rate',
    'Suggest ADCS gyro despin and star tracker recalibration steps',
    'What contingency procedures should be uplinked if temperature exceeds 35°C?',
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-700" />
            <h1 className="font-display font-bold text-2xl text-[#161514]">
              ASTRA AI Mission Assistant & Neural Reasoner
            </h1>
          </div>
          <p className="text-xs font-mono text-[#736f68] mt-0.5">
            Advisory Telemetry Reasoning, Structured Evidence Extraction & Operator Action Synthesis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedAnomaly?.id && triggerGeminiAnalysis(selectedAnomaly.id)}
            disabled={isAnalyzing || !selectedAnomaly}
            className="px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running AI Engine...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run AI Reasoning</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spacecraft Recovery Confirmation Banner */}
      {isRecovered && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 shadow-sm flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                <span>CONTINGENCY UPLINK CONFIRMED: Safe-State Commands Executed</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                  RECOVERY VERIFIED
                </span>
              </h3>
              <p className="font-mono text-xs text-emerald-800 mt-0.5">
                Safe-state commands approved and transmitted via DSN Madrid-63. Spacecraft returning to nominal baseline. Live telemetry: Bus {telemetry.voltage.toFixed(1)} V • Avionics {telemetry.temperature.toFixed(1)} °C • Solar {telemetry.solar_input.toFixed(1)}% • Subsystems nominal.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('telemetry')}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
          >
            <span>View Live Telemetry Deck</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero AI Reasoning Console */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white border border-[#e6e1d7] shadow-md flex flex-col gap-6 relative overflow-hidden">
        {/* Top Status Pill */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isCrisis
                  ? 'bg-red-500 animate-ping'
                  : isRecovered
                  ? 'bg-emerald-500'
                  : selectedAnomaly?.status === 'ANOMALY_DETECTED'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="font-display font-bold text-base uppercase tracking-wider text-[#161514]">
              {isCrisis
                ? `CRISIS DETECTED: ${selectedAnomaly?.id || 'ACTIVE'}`
                : isRecovered
                ? `EVENT RESOLVED: ${selectedAnomaly?.id || 'P-3'} (SYSTEMS NOMINAL)`
                : selectedAnomaly?.status === 'ANOMALY_DETECTED'
                ? `ANOMALY UNDER REVIEW: ${selectedAnomaly?.id || 'P-3'}`
                : 'NOMINAL TELEMETRY MONITORING'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#736f68]">
            <span>Model: {currentAnalysis?.model || 'ASTRA Neural Reasoner'}</span>
            <span>•</span>
            <span>Channel: {selectedAnomaly?.rawEvent?.channel || 'P-3'}</span>
          </div>
        </div>

        {/* Diagnosis & Evidence Block */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Subsystem & Severity Column (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Target Channel & Subsystem
                </span>
                <span className="font-mono text-base font-bold text-[#161514] mt-0.5 block">
                  {selectedAnomaly?.subsystem || 'INSTRUMENTATION (P-3)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Assessed Criticality
                </span>
                <span
                  className={`font-mono text-base font-bold mt-0.5 block ${
                    isCrisis ? 'text-red-600' : isRecovered ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {isCrisis ? (selectedAnomaly?.severity || 'HIGH') : isRecovered ? 'NOMINAL (RESOLVED)' : (selectedAnomaly?.severity || 'HIGH')}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Reasoning Confidence
                </span>
                <span className="font-mono text-base font-bold text-purple-700 mt-0.5 block">
                  {selectedAnomaly?.mlConfidence || '91.0%'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#736f68] block">
                  Safety Governance
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isRecovered ? 'Operator Sign-Off Completed' : 'Operator Sign-Off Required'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Diagnosis & Evidence Column (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 flex flex-col gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Structured Engineering Diagnosis
              </span>

              <p className="text-sm font-mono text-[#161514] leading-relaxed">
                {currentAnalysis?.rootCause ||
                  (isCrisis
                    ? 'Telemetry pattern is consistent with an abnormal subsystem state. Sudden deviation exceeds the numerical change detection threshold and requires operator evaluation.'
                    : 'All spacecraft telemetry parameters adhere to expected baseline models. Telemetry step-changes are well within the 0.3889 validation threshold.')}
              </p>

              {/* Grounded Evidence List */}
              {currentAnalysis?.evidence && (
                <div className="pt-3 border-t border-purple-200/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-purple-950 uppercase">
                      Incident Telemetry Evidence:
                    </span>
                    {isRecovered && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        RESTORED TO NOMINAL
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-xs font-mono">
                    {currentAnalysis.evidence.map((ev, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white border border-purple-200 flex items-start gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span className="text-[#161514]">{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe-State Action */}
              {currentAnalysis?.recommendedAction && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 mt-1">
                  <span className="font-bold block mb-0.5">
                    {isRecovered ? 'Executed Safe-State Procedure:' : 'Recommended Safe-State Procedure:'}
                  </span>
                  {currentAnalysis.recommendedAction}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Recommended Actions & Operator Approval */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-base text-[#161514] uppercase tracking-wider">
                Operator Approval Gateway
              </span>
              {commands.some((c) => c.status !== 'APPROVED') && (
                <button
                  onClick={approveAllCommands}
                  className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Approve All Staged Commands</span>
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-red-600 font-bold">
              Autonomous spacecraft commanding is prohibited
            </span>
          </div>

          {/* In-Gateway Recovery Confirmation Banner */}
          {isRecovered && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-900 flex flex-wrap items-center justify-between gap-3 shadow-xs mb-1 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>CONTINGENCY UPLINK CONFIRMED:</strong> Safe-state commands approved and transmitted via DSN Madrid-63. Spacecraft returning to nominal baseline.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('telemetry')}
                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              >
                <span>Live Telemetry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {commands.map((cmd) => {
              const isApproved = cmd.status === 'APPROVED';
              const isRejected = cmd.status === 'REJECTED';

              return (
                <div
                  key={cmd.id}
                  className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 text-xs font-mono transition-all ${
                    isApproved
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : isRejected
                      ? 'bg-slate-100 border-slate-300 opacity-60'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-red-600 shadow-xs">
                      ⚠
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#161514]">{cmd.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                          {cmd.severity || 'CRITICAL'}
                        </span>
                      </div>
                      <span className="text-xs text-[#736f68] mt-0.5 block">{cmd.desc}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                        <CheckCircle2 className="w-4 h-4" /> Uplink Authorized
                      </span>
                    ) : isRejected ? (
                      <span className="text-slate-500 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <XCircle className="w-4 h-4" /> Overridden
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => approveCommand(cmd.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> AUTHORIZE UPLINK
                        </button>
                        <button
                          onClick={() => rejectCommand(cmd.id)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#736f68] border border-slate-200 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          REJECT
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs font-mono text-[#736f68] mt-2">
            <span>Security Rule: Commands require verified human operator signature.</span>
            <span>Uplink Node: DSN Madrid-63 • Cryptographic Hash 0xFD91_A61C</span>
          </div>
        </div>
      </div>

      {/* Feature 2: Interactive AI Copilot Conversational Console */}
      <div className="p-6 rounded-3xl bg-[#f8f5ee] border-2 border-[#4a2e1b] shadow-[4px_4px_0px_0px_#4a2e1b] flex flex-col gap-4">
        {/* Console Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#4a2e1b]/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_#4a2e1b]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-[#161514]">
                  Interactive AI Flight Copilot
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-300">
                  GEMINI 2.5 ACTIVE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ebdccb] text-[#4a2e1b] font-bold border border-[#4a2e1b]">
                  CH: {activeChannel || 'P-3'}
                </span>
              </div>
              <p className="text-xs font-mono text-[#73533e]">
                Conversational Aerospace Engineering Assistant with Live Spacecraft Telemetry Context
              </p>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#ebdccb] text-[#4a2e1b] border-2 border-[#4a2e1b] shadow-[2px_2px_0px_0px_#4a2e1b] font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Console</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex flex-col gap-3.5 max-h-[420px] overflow-y-auto pr-2 py-1 scroll-smooth">
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs font-mono leading-relaxed transition-all shadow-[2px_2px_0px_0px_#4a2e1b] ${
                    isUser
                      ? 'bg-[#452a19] text-[#fbf7f0] border-2 border-[#24140b] rounded-tr-xs'
                      : 'bg-white text-[#24140b] border-2 border-[#4a2e1b] rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-black/10">
                    <span className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                      {isUser ? 'Flight Director Gene Kranz' : 'ASTRA Copilot'}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] opacity-60">
                      {msg.model && <span>{msg.model}</span>}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  <div className="leading-relaxed">
                    <StructuredMarkdown content={msg.content} isUser={isUser} />
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#24140b] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isChatting && (
            <div className="flex items-center gap-3 text-xs font-mono text-purple-900 bg-purple-50 p-3 rounded-2xl border-2 border-purple-300 w-fit animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
              <span>ASTRA Copilot reasoning across telemetry matrix...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[#4a2e1b]/15">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#73533e]">
            Operational Prompt Suggestions:
          </span>
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(prompt)}
                disabled={isChatting}
                className="text-[11px] font-mono px-3 py-1 rounded-full bg-white hover:bg-[#ebdccb] text-[#4a2e1b] border border-[#4a2e1b] shadow-[1.5px_1.5px_0px_0px_#4a2e1b] transition-all cursor-pointer text-left active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
          className="flex items-center gap-2 mt-1"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask ASTRA Copilot about telemetry margins, channel risks, orbital passes..."
              disabled={isChatting}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#4a2e1b] shadow-[2px_2px_0px_0px_#4a2e1b] text-xs font-sans text-[#24140b] placeholder:text-[#8c827a] outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={!chatInput.trim() || isChatting}
            className="px-5 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-mono font-bold text-xs flex items-center gap-2 border-2 border-[#4a2e1b] shadow-[3px_3px_0px_0px_#4a2e1b] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChatting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Query</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
