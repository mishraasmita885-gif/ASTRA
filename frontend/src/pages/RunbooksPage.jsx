import React, { useState, useMemo } from 'react';
import { useMission } from '../context/MissionContext';
import {
  Play,
  Square,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Lock,
  Activity,
  GitBranch,
  Clock,
  Cpu,
  Radio,
  X,
  Trash2,
} from 'lucide-react';

const SUBSYSTEM_STYLES = {
  EPS: 'bg-[#fea619] text-[#24140b] border-[#452a19]',
  TCS: 'bg-sky-200 text-sky-950 border-[#452a19]',
  ADCS: 'bg-purple-200 text-purple-950 border-[#452a19]',
  'TT&C': 'bg-emerald-200 text-emerald-950 border-[#452a19]',
};

const EXEC_STATUS_BADGES = {
  STAGED: { bg: 'bg-[#ebdccb] text-[#24140b]', label: 'STAGED' },
  RUNNING: { bg: 'bg-[#fea619] text-[#24140b]', label: 'RUNNING' },
  VERIFYING_TELEMETRY: { bg: 'bg-[#fea619] text-[#24140b]', label: 'VERIFYING TELEMETRY GATE' },
  COMPLETED: { bg: 'bg-emerald-600 text-white', label: 'COMPLETED & VERIFIED' },
  HALTED_VERIFICATION_FAILED: { bg: 'bg-red-600 text-white', label: 'HALTED — VERIFICATION FAILED' },
  ABORTED: { bg: 'bg-red-600 text-white', label: 'ABORTED BY OPERATOR' },
};

const STEP_STATUS_META = {
  PENDING: {
    border: 'border-[#452a19]/40 bg-[#f7f4ee]',
    badge: 'bg-[#ebdccb] text-[#452a19]',
    label: 'PENDING',
  },
  TRANSMITTING: {
    border: 'border-[#452a19] bg-[#fea619]/25',
    badge: 'bg-[#fea619] text-[#24140b]',
    label: 'TRANSMITTING',
  },
  VERIFYING_TELEMETRY: {
    border: 'border-[#452a19] bg-[#fea619]/20 ring-2 ring-[#fea619]',
    badge: 'bg-[#fea619] text-[#24140b]',
    label: 'VERIFYING TELEMETRY GATE',
  },
  VERIFIED_PASSED: {
    border: 'border-[#452a19] bg-emerald-50',
    badge: 'bg-emerald-600 text-white',
    label: 'VERIFIED & PASSED',
  },
  FAILED: {
    border: 'border-[#dc2626] bg-red-50',
    badge: 'bg-red-600 text-white',
    label: 'FAILED / HALTED',
  },
  ABORTED: {
    border: 'border-[#dc2626] bg-red-50',
    badge: 'bg-red-600 text-white',
    label: 'ABORTED',
  },
};

function resolveLiveDisplayReading(telemetry, channel, metricKey) {
  if (!telemetry) return null;
  const ch = String(channel || 'P-3').toUpperCase();
  if (metricKey === 'voltage' || ch === 'P-2' || ch === 'P-3') {
    return { val: Number(telemetry.voltage ?? 24.1).toFixed(2), unit: 'V' };
  }
  if (metricKey === 'solar_input' || ch === 'P-1') {
    return { val: Number(telemetry.solar_input ?? 96.4).toFixed(1), unit: '%' };
  }
  if (metricKey === 'battery_pct' || ch.startsWith('P-')) {
    return { val: Number(telemetry.battery_pct ?? 98.4).toFixed(1), unit: '%' };
  }
  if (metricKey === 'temperature' || ch.startsWith('T-')) {
    return { val: Number(telemetry.temperature ?? 15.2).toFixed(2), unit: '°C' };
  }
  if (metricKey === 'adcs_drift' || ch.startsWith('A-')) {
    return { val: Number(telemetry.adcs_drift ?? 0.02).toFixed(3), unit: '°/hr' };
  }
  if (metricKey === 'link_snr' || ch.startsWith('C-')) {
    return { val: Number(telemetry.link_snr ?? 14.2).toFixed(2), unit: 'dBm' };
  }
  if (metricKey === 'current_draw' || ch.startsWith('D-')) {
    return { val: Number(telemetry.current_draw ?? 4.2).toFixed(2), unit: 'A' };
  }
  return { val: Number(telemetry.p3_value ?? 0.12).toFixed(4), unit: 'units' };
}

export const RunbooksPage = () => {
  const {
    runbooks,
    runbookExecutions,
    activeRunbookExecution,
    selectedRunbookExecutionId,
    setSelectedRunbookExecutionId,
    launchRunbook,
    abortRunbook,
    createCustomRunbook,
    hasCommandAuthority,
    operatorRole,
    activeSpacecraft,
    availableChannels,
    telemetry,
  } = useMission();

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busyRunbookId, setBusyRunbookId] = useState(null);
  const [isAborting, setIsAborting] = useState(false);

  // Custom Playbook Builder Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customSubsystem, setCustomSubsystem] = useState('EPS');
  const [customDesc, setCustomDesc] = useState('');
  const [builderError, setBuilderError] = useState('');
  const [isSavingPlaybook, setIsSavingPlaybook] = useState(false);
  const [customSteps, setCustomSteps] = useState([
    {
      command_code: 'CMD_SHED_NON_ESSENTIAL',
      action_title: 'Shed Non-Essential Loads',
      target_channel: 'D-1',
      verification_operator: '<',
      threshold_min: '',
      threshold_max: '12.0',
      required_ticks: 3,
      timeout_seconds: 18,
    },
    {
      command_code: 'CMD_STABILIZE_BUS_P3',
      action_title: 'Stabilize Primary Bus P-3',
      target_channel: 'P-3',
      verification_operator: 'BETWEEN',
      threshold_min: '23.5',
      threshold_max: '28.0',
      required_ticks: 3,
      timeout_seconds: 20,
    },
  ]);

  const sortedChannels = useMemo(() => {
    const raw = availableChannels?.length ? availableChannels : ['P-3', 'P-1', 'P-2', 'P-4', 'T-1', 'T-2', 'A-1', 'C-1', 'D-1'];
    return ['P-3', ...raw.filter((c) => c !== 'P-3').sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [availableChannels]);

  const displayedExecution =
    runbookExecutions.find((e) => e.execution_id === selectedRunbookExecutionId) || activeRunbookExecution;

  const isDisplayedRunning =
    displayedExecution &&
    (displayedExecution.status === 'RUNNING' ||
      displayedExecution.status === 'VERIFYING_TELEMETRY' ||
      displayedExecution.status === 'STAGED');

  const handleLaunch = async (runbookId) => {
    setActionError('');
    setBusyRunbookId(runbookId);
    try {
      await launchRunbook(runbookId);
    } catch (err) {
      setActionError(err.message || 'Failed to launch contingency runbook.');
    } finally {
      setBusyRunbookId(null);
    }
  };

  const handleAbort = async () => {
    if (!displayedExecution) return;
    setActionError('');
    setIsAborting(true);
    try {
      await abortRunbook(displayedExecution.execution_id, 'Emergency abort triggered from Runbooks Console');
    } catch (err) {
      setActionError(err.message || 'Failed to abort runbook execution.');
    } finally {
      setIsAborting(false);
    }
  };

  const addBuilderStep = () => {
    setCustomSteps((prev) => [
      ...prev,
      {
        command_code: `CMD_STEP_${String(prev.length + 1).padStart(2, '0')}`,
        action_title: `Verification Step ${prev.length + 1}`,
        target_channel: 'P-3',
        verification_operator: 'BETWEEN',
        threshold_min: '23.5',
        threshold_max: '28.0',
        required_ticks: 3,
        timeout_seconds: 18,
      },
    ]);
  };

  const updateBuilderStep = (idx, field, value) => {
    setCustomSteps((prev) => prev.map((st, i) => (i === idx ? { ...st, [field]: value } : st)));
  };

  const removeBuilderStep = (idx) => {
    setCustomSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setBuilderError('');
    if (!customTitle.trim()) {
      setBuilderError('Playbook title is required.');
      return;
    }

    const formattedSteps = customSteps.map((st, idx) => ({
      step_number: idx + 1,
      command_code: st.command_code.trim().toUpperCase(),
      action_title: st.action_title.trim(),
      target_channel: st.target_channel.trim().toUpperCase(),
      verification_operator: st.verification_operator,
      threshold_min: st.threshold_min !== '' && st.threshold_min !== null ? Number(st.threshold_min) : null,
      threshold_max: st.threshold_max !== '' && st.threshold_max !== null ? Number(st.threshold_max) : null,
      required_ticks: Number(st.required_ticks || 3),
      timeout_seconds: Number(st.timeout_seconds || 18),
    }));

    setIsSavingPlaybook(true);
    try {
      await createCustomRunbook({
        title: customTitle.trim(),
        subsystem: customSubsystem,
        description: customDesc.trim() || `Custom ${customSubsystem} telemetry-gated recovery sequence.`,
        steps: formattedSteps,
      });
      setIsBuilderOpen(false);
      setCustomTitle('');
      setCustomDesc('');
    } catch (err) {
      setBuilderError(err.message || 'Failed to save custom playbook.');
    } finally {
      setIsSavingPlaybook(false);
    }
  };

  const execBadge = EXEC_STATUS_BADGES[displayedExecution?.status] || EXEC_STATUS_BADGES.STAGED;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-14">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#452a19] text-[#fea619] flex items-center justify-center border-2 border-[#24140b] shadow-[2px_2px_0px_#24140b]">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-[#161514]">
                Automated Contingency Runbooks &amp; Multi-Step Playbooks
              </h1>
              <p className="text-xs font-mono text-[#73533e]">
                Telemetry-gated recovery state machines verifying live 82-channel bounds before advancing steps
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`px-3 py-1.5 rounded-xl border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-xs font-bold flex items-center gap-1.5 ${
              hasCommandAuthority ? 'bg-[#ebdccb] text-[#24140b]' : 'bg-red-100 text-red-900'
            }`}
          >
            {hasCommandAuthority ? <Shield className="w-3.5 h-3.5 text-emerald-700" /> : <Lock className="w-3.5 h-3.5 text-red-700" />}
            <span>{operatorRole} • {activeSpacecraft}</span>
          </span>

          <button
            type="button"
            onClick={() => setIsBuilderOpen(true)}
            disabled={!hasCommandAuthority}
            className="px-4 py-2 rounded-xl bg-[#fea619] hover:bg-[#e59414] text-[#24140b] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={hasCommandAuthority ? 'Create a new custom multi-step playbook' : 'Flight Director clearance required'}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Playbook</span>
          </button>
        </div>
      </div>

      {/* RBAC / Execution Error Alert */}
      {!hasCommandAuthority && (
        <div className="p-3.5 rounded-xl bg-[#ebdccb] border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] flex items-center gap-3 font-mono text-xs text-[#24140b]">
          <Lock className="w-4 h-4 text-[#dc2626] shrink-0" />
          <span>
            <strong>RBAC READ-ONLY LOCK:</strong> Current clearance is <code>TELEMETRY_OBSERVER</code>. Switch to <code>FLIGHT_DIRECTOR</code> in the header or Settings to execute, abort, or author contingency runbooks.
          </span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-600 text-white border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] flex items-center justify-between font-mono text-xs font-bold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button type="button" onClick={() => setActionError('')} className="px-2 py-0.5 bg-[#ebdccb] text-[#24140b] rounded border border-[#452a19]">
            Dismiss
          </button>
        </div>
      )}

      {/* LIVE STEP-BY-STEP STATE MACHINE TRACKER */}
      <div className="rounded-2xl p-6 bg-[#ebdccb] border-2 border-[#452a19] shadow-[4px_4px_0px_#452a19] flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#452a19]/20 pb-3.5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="w-4 h-4 text-[#452a19]" />
              <h2 className="font-display font-bold text-lg text-[#24140b]">
                {displayedExecution
                  ? `${displayedExecution.runbook_title || displayedExecution.runbook_id}`
                  : 'Live Playbook Execution State Machine'}
              </h2>
              {displayedExecution && (
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border border-[#452a19] ${execBadge.bg}`}>
                  {execBadge.label}
                </span>
              )}
            </div>
            {displayedExecution && (
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#5c3d28]">
                <span>EXEC ID: <strong>{displayedExecution.execution_id}</strong></span>
                <span>•</span>
                <span>CRAFT: <strong>{displayedExecution.spacecraft_id}</strong></span>
                <span>•</span>
                <span>AUTH: <strong>{displayedExecution.authorized_by}</strong></span>
                <span>•</span>
                <span>STEP: <strong>{displayedExecution.current_step} / {displayedExecution.step_states?.length || displayedExecution.total_steps}</strong></span>
              </div>
            )}
          </div>

          {isDisplayedRunning && (
            <button
              type="button"
              onClick={handleAbort}
              disabled={!hasCommandAuthority || isAborting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white border-2 border-[#452a19] shadow-[2px_2px_0px_#452a19] font-mono text-xs font-extrabold uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isAborting ? 'ABORTING...' : '[ ABORT PLAYBOOK ]'}</span>
            </button>
          )}
        </div>

        {!displayedExecution ? (
          <div className="p-8 rounded-xl bg-[#f7f4ee] border-2 border-[#452a19] text-center font-mono text-xs text-[#452a19]">
            No runbook execution selected yet. Trigger any recovery sequence from the Playbook Library below (or inject a Crisis on the Simulation page first to watch real telemetry stabilization).
          </div>
        ) : (
          <>
            {displayedExecution.failure_reason && (
              <div className="p-3 rounded-xl bg-red-50 border-2 border-[#dc2626] font-mono text-xs text-red-900 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                <span>
                  <strong>GATE HALT NOTICE:</strong> {displayedExecution.failure_reason}
                </span>
              </div>
            )}

            {/* Sequential Pipeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(displayedExecution.step_states || []).map((st) => {
                const meta = STEP_STATUS_META[st.status] || STEP_STATUS_META.PENDING;
                const liveFallback = resolveLiveDisplayReading(telemetry, st.target_channel, st.metric_key);
                const liveValueDisplay =
                  st.verified_value !== null && st.verified_value !== undefined
                    ? `${st.verified_value} ${st.unit || ''}`
                    : st.latest_reading !== null && st.latest_reading !== undefined
                    ? `${st.latest_reading} ${st.unit || ''}`
                    : liveFallback
                    ? `${liveFallback.val} ${liveFallback.unit}`
                    : '--';
                const confirmedTicks = Number(st.confirmed_ticks || 0);
                const reqTicks = Number(st.required_ticks || 3);
                const pct = Math.min(100, Math.round((confirmedTicks / reqTicks) * 100));

                return (
                  <div
                    key={st.step_number}
                    className={`p-4 rounded-xl border-2 shadow-[3px_3px_0px_#452a19] flex flex-col justify-between gap-3 ${meta.border}`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#452a19] text-[#fbf7f0] rounded">
                          STEP {st.step_number}
                        </span>
                        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#452a19] flex items-center gap-1 ${meta.badge}`}>
                          {st.status === 'VERIFYING_TELEMETRY' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {st.status === 'VERIFIED_PASSED' && <CheckCircle2 className="w-3 h-3" />}
                          {st.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      <div>
                        <div className="font-mono text-[11px] font-bold text-[#73533e]">
                          {st.command_code}
                        </div>
                        <h3 className="font-display font-bold text-sm text-[#161514] leading-snug mt-0.5">
                          {st.action_title}
                        </h3>
                        {st.effect_summary && (
                          <p className="font-mono text-[11px] text-[#452a19] mt-1 leading-snug">
                            {st.effect_summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Live Telemetry Gate Envelope Readout */}
                    <div className="p-2.5 rounded-lg bg-[#ffffff] border-2 border-[#452a19] font-mono text-[11px] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[#24140b] font-bold">
                        <span>Live {st.target_channel}: {liveValueDisplay}</span>
                        <span className="text-[#73533e]">[{confirmedTicks}/{reqTicks} Ticks]</span>
                      </div>
                      <div className="text-[10px] text-[#5c3d28] flex items-center justify-between">
                        <span>Target: <strong>{st.threshold_label}</strong></span>
                        <span>
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {Number(st.elapsed_seconds || 0).toFixed(1)}s / {Number(st.timeout_seconds || 18).toFixed(0)}s
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#ebdccb] rounded-full overflow-hidden border border-[#452a19]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            st.status === 'FAILED' || st.status === 'ABORTED'
                              ? 'bg-[#dc2626]'
                              : st.status === 'VERIFIED_PASSED'
                              ? 'bg-[#059669]'
                              : 'bg-[#fea619]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* PLAYBOOK LIBRARY + EXECUTION LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Playbook Library (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm uppercase tracking-wider text-[#161514]">
              Contingency Playbook Library ({runbooks.length})
            </span>
            <span className="font-mono text-xs text-[#73533e]">
              SQLite Persistent State Machines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {runbooks.map((rb) => {
              const subBadge = SUBSYSTEM_STYLES[rb.subsystem] || SUBSYSTEM_STYLES.EPS;
              const isLaunching = busyRunbookId === rb.id;
              const channels = [...new Set((rb.steps || []).map((s) => s.target_channel))];

              return (
                <div
                  key={rb.id}
                  className="p-5 rounded-2xl bg-[#ebdccb] border-2 border-[#452a19] shadow-[3px_3px_0px_#452a19] flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${subBadge}`}>
                        {rb.subsystem}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#5c3d28]">
                        {rb.id} • {(rb.steps || []).length} STEPS
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-[#161514]">
                      {rb.title}
                    </h3>
                    <p className="font-mono text-[11px] text-[#452a19] leading-relaxed">
                      {rb.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {channels.map((ch) => (
                        <span
                          key={ch}
                          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#f7f4ee] text-[#24140b] border border-[#452a19]"
                        >
                          CH {ch}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      {(rb.steps || []).map((st) => (
                        <div
                          key={st.step_number}
                          className="px-2.5 py-1.5 rounded-lg bg-[#f7f4ee] border border-[#452a19] font-mono text-[10px] text-[#24140b] flex items-center justify-between gap-2"
                        >
                          <span className="truncate font-semibold">
                            {st.step_number}. {st.action_title}
                          </span>
                          <span className="text-[#73533e] shrink-0 font-bold">
                            {st.target_channel} {st.verification_operator === '>' ? `>${st.threshold_min}` : st.verification_operator === '<' ? `<${st.threshold_max}` : `${st.threshold_min}-${st.threshold_max}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunch(rb.id)}
                    disabled={!hasCommandAuthority || isLaunching}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#452a19] hover:bg-[#5c3822] text-[#fbf7f0] border-2 border-[#24140b] shadow-[2px_2px_0px_#24140b] font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Staging State Machine...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-[#fea619]" />
                        <span>Execute Runbook</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Execution History Ledger (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm uppercase tracking-wider text-[#161514]">
              Recent Executions ({runbookExecutions.length})
            </span>
            <span className="font-mono text-xs text-[#73533e]">Live WS Sync</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#ebdccb] border-2 border-[#452a19] shadow-[3px_3px_0px_#452a19] flex flex-col gap-2.5 max-h-[540px] overflow-y-auto">
            {runbookExecutions.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-[#5c3d28] bg-[#f7f4ee] rounded-xl border border-[#452a19]">
                No runbook executions logged yet.
              </div>
            ) : (
              runbookExecutions.map((ex) => {
                const isSelected = displayedExecution?.execution_id === ex.execution_id;
                const badge = EXEC_STATUS_BADGES[ex.status] || EXEC_STATUS_BADGES.STAGED;
                return (
                  <div
                    key={ex.execution_id}
                    onClick={() => setSelectedRunbookExecutionId(ex.execution_id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all font-mono text-xs ${
                      isSelected
                        ? 'bg-[#dfcdb7] border-[#24140b] shadow-[3px_3px_0px_#24140b]'
                        : 'bg-[#f7f4ee] border-[#452a19] hover:bg-[#ebdccb]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[#24140b] truncate">{ex.runbook_id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#452a19] shrink-0 ${badge.bg}`}>
                        {ex.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-sans font-semibold text-[#161514] truncate">
                      {ex.runbook_title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#73533e] mt-1.5">
                      <span>{ex.execution_id}</span>
                      <span>Step {ex.current_step}/{ex.step_states?.length || ex.total_steps || 1}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CREATE NEW PLAYBOOK MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#f7f4ee] border-2 border-[#452a19] shadow-[6px_6px_0px_#452a19] rounded-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-[#fea619] border-b-2 border-[#452a19] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-extrabold uppercase text-[#24140b]">
                <Cpu className="w-4 h-4" />
                <span>Create Custom Contingency Runbook</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="p-1 rounded bg-[#ebdccb] text-[#24140b] border border-[#452a19] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-4 font-mono text-xs text-[#161514]">
              {builderError && (
                <div className="p-2.5 rounded bg-red-600 text-white border border-[#452a19] font-bold">
                  {builderError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="font-bold uppercase text-[10px] text-[#452a19]">Playbook Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g., Auxiliary EPS Recovery & Bus Isolation"
                    className="px-3 py-2 rounded-lg bg-white border-2 border-[#452a19] text-[#161514] outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase text-[10px] text-[#452a19]">Subsystem</label>
                  <select
                    value={customSubsystem}
                    onChange={(e) => setCustomSubsystem(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white border-2 border-[#452a19] text-[#161514] outline-none"
                  >
                    <option value="EPS">EPS (Power)</option>
                    <option value="TCS">TCS (Thermal)</option>
                    <option value="ADCS">ADCS (Attitude)</option>
                    <option value="TT&C">TT&C (Comms)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold uppercase text-[10px] text-[#452a19]">Operational Description</label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Describe recovery intent and verification criteria..."
                  className="px-3 py-2 rounded-lg bg-white border-2 border-[#452a19] text-[#161514] outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t-2 border-[#452a19]/20">
                <span className="font-bold uppercase text-[11px] text-[#452a19]">
                  Sequential Telemetry-Gated Steps ({customSteps.length})
                </span>
                <button
                  type="button"
                  onClick={addBuilderStep}
                  className="px-2.5 py-1 rounded-lg bg-[#ebdccb] hover:bg-[#dfcdb7] text-[#24140b] border border-[#452a19] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {customSteps.map((st, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#ebdccb] border-2 border-[#452a19] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#24140b]">Step #{idx + 1}</span>
                      {customSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBuilderStep(idx)}
                          className="p-1 rounded bg-red-600 text-white border border-[#452a19] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={st.command_code}
                        onChange={(e) => updateBuilderStep(idx, 'command_code', e.target.value)}
                        placeholder="CMD_CODE"
                        className="px-2.5 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                        required
                      />
                      <input
                        type="text"
                        value={st.action_title}
                        onChange={(e) => updateBuilderStep(idx, 'action_title', e.target.value)}
                        placeholder="Action Title"
                        className="px-2.5 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                      <select
                        value={st.target_channel}
                        onChange={(e) => updateBuilderStep(idx, 'target_channel', e.target.value)}
                        className="px-2 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                      >
                        {sortedChannels.map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>

                      <select
                        value={st.verification_operator}
                        onChange={(e) => updateBuilderStep(idx, 'verification_operator', e.target.value)}
                        className="px-2 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                      >
                        <option value="BETWEEN">BETWEEN</option>
                        <option value=">">&gt; GREATER</option>
                        <option value="<">&lt; LESS</option>
                      </select>

                      {st.verification_operator !== '<' ? (
                        <input
                          type="number"
                          step="any"
                          value={st.threshold_min}
                          onChange={(e) => updateBuilderStep(idx, 'threshold_min', e.target.value)}
                          placeholder="Min"
                          className="px-2 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                          required
                        />
                      ) : (
                        <div className="text-[10px] text-[#73533e] text-center">No Min</div>
                      )}

                      {st.verification_operator !== '>' ? (
                        <input
                          type="number"
                          step="any"
                          value={st.threshold_max}
                          onChange={(e) => updateBuilderStep(idx, 'threshold_max', e.target.value)}
                          placeholder="Max"
                          className="px-2 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                          required
                        />
                      ) : (
                        <div className="text-[10px] text-[#73533e] text-center">No Max</div>
                      )}

                      <input
                        type="number"
                        min={4}
                        max={120}
                        value={st.timeout_seconds}
                        onChange={(e) => updateBuilderStep(idx, 'timeout_seconds', e.target.value)}
                        placeholder="Timeout (s)"
                        title="Verification timeout in seconds"
                        className="px-2 py-1.5 rounded bg-white border border-[#452a19] text-[#161514]"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t-2 border-[#452a19]/20">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#ebdccb] text-[#24140b] border-2 border-[#452a19] font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlaybook}
                  className="px-5 py-2 rounded-xl bg-[#452a19] text-[#fbf7f0] border-2 border-[#24140b] shadow-[2px_2px_0px_#24140b] font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  {isSavingPlaybook ? 'Saving to SQLite...' : 'Save Contingency Runbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
