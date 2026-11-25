"""
ASTRA Automated Contingency Runbooks & Multi-Step Playbooks Engine
Asynchronous telemetry-gated state machine executing recovery procedures and
evaluating live TelemetryService frames before advancing steps.
"""
import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.telemetry_service import telemetry_service
from app.storage.db import (
    db_get_runbook,
    db_get_runbook_execution,
    db_list_runbook_executions,
    db_list_runbooks,
    db_save_runbook,
    db_save_runbook_execution,
)
from app.storage.event_store import event_store

logger = logging.getLogger("astra.runbooks")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_threshold_label(step: Dict[str, Any]) -> str:
    op = str(step.get("verification_operator", "BETWEEN")).upper()
    unit = step.get("unit", "")
    t_min = step.get("threshold_min")
    t_max = step.get("threshold_max")
    if op == ">":
        val = t_min if t_min is not None else t_max
        return f"> {val} {unit}".strip()
    if op == "<":
        val = t_max if t_max is not None else t_min
        return f"< {val} {unit}".strip()
    return f"{t_min} – {t_max} {unit}".strip()


def evaluate_threshold(
    value: float,
    operator: str,
    threshold_min: Optional[float],
    threshold_max: Optional[float],
) -> bool:
    op = str(operator or "BETWEEN").strip().upper()
    if op == ">":
        bound = threshold_min if threshold_min is not None else threshold_max
        if bound is None:
            return False
        return float(value) > float(bound)
    if op == "<":
        bound = threshold_max if threshold_max is not None else threshold_min
        if bound is None:
            return False
        return float(value) < float(bound)
    if threshold_min is None or threshold_max is None:
        return False
    low = min(float(threshold_min), float(threshold_max))
    high = max(float(threshold_min), float(threshold_max))
    return low <= float(value) <= high


class RunbookEngine:
    def __init__(self):
        self._executions: Dict[str, Dict[str, Any]] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._abort_flags: Dict[str, asyncio.Event] = {}

    async def _broadcast(self, execution: Dict[str, Any]):
        try:
            from app.routers.websocket import manager

            await manager.broadcast({
                "type": "RUNBOOK_UPDATE",
                "execution": execution,
                "executions": self.list_executions(limit=15),
            })
        except Exception as err:
            logger.debug(f"Runbook WS broadcast notice: {err}")

    def list_runbooks(self) -> List[Dict[str, Any]]:
        return db_list_runbooks()

    def get_runbook(self, runbook_id: str) -> Optional[Dict[str, Any]]:
        return db_get_runbook(runbook_id)

    def create_runbook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = _utc_now()
        rb_id = (payload.get("id") or f"RB-CUSTOM-{uuid.uuid4().hex[:6]}").strip().upper()
        steps = []
        for idx, st in enumerate(payload.get("steps", []), start=1):
            ch = str(st.get("target_channel", "P-3")).strip().upper()
            unit = st.get("unit")
            if not unit:
                meas = telemetry_service.get_channel_measurement(ch, st.get("metric_key"))
                unit = meas.get("unit", "")
            steps.append({
                "step_number": int(st.get("step_number") or idx),
                "command_code": str(st.get("command_code") or f"CMD_STEP_{idx:02d}").strip().upper(),
                "action_title": str(st.get("action_title") or f"Execute Recovery Step {idx}").strip(),
                "description": str(st.get("description") or "").strip(),
                "target_channel": ch,
                "metric_key": st.get("metric_key"),
                "unit": unit,
                "verification_operator": str(st.get("verification_operator", "BETWEEN")).strip().upper(),
                "threshold_min": float(st["threshold_min"]) if st.get("threshold_min") is not None else None,
                "threshold_max": float(st["threshold_max"]) if st.get("threshold_max") is not None else None,
                "required_ticks": max(1, int(st.get("required_ticks", 3))),
                "timeout_seconds": max(4.0, float(st.get("timeout_seconds", 18.0))),
            })

        runbook = {
            "id": rb_id,
            "title": str(payload["title"]).strip(),
            "subsystem": str(payload.get("subsystem", "EPS")).strip().upper(),
            "description": str(payload.get("description", "")).strip(),
            "steps": steps,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        db_save_runbook(runbook)

        event_store.add_audit_entry(
            type_="INFO",
            subsystem=f"RUNBOOKS ({runbook['subsystem']})",
            event=f"CONTINGENCY PLAYBOOK REGISTERED: [{rb_id}] {runbook['title']} ({len(steps)} gated steps).",
        )
        return runbook

    def list_executions(self, limit: int = 25) -> List[Dict[str, Any]]:
        persisted = db_list_runbook_executions(limit=limit)
        by_id: Dict[str, Dict[str, Any]] = {ex["execution_id"]: ex for ex in persisted}
        for ex_id, mem_ex in self._executions.items():
            by_id[ex_id] = mem_ex
        merged = sorted(by_id.values(), key=lambda x: x.get("started_at", ""), reverse=True)
        return merged[:limit]

    def get_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        return self._executions.get(execution_id) or db_get_runbook_execution(execution_id)

    async def start_execution(
        self,
        runbook_id: str,
        authorized_by: str = "Flight Director Gene Kranz",
        spacecraft_id: str = "ASTRA-ALPHA",
    ) -> Dict[str, Any]:
        runbook = self.get_runbook(runbook_id)
        if not runbook:
            raise ValueError(f"Contingency runbook '{runbook_id}' not found.")

        steps = runbook.get("steps", [])
        if not steps:
            raise ValueError(f"Contingency runbook '{runbook_id}' contains no steps.")

        now_iso = _utc_now()
        execution_id = f"RBEXEC-{datetime.now(timezone.utc).strftime('%H%M%S')}-{uuid.uuid4().hex[:5].upper()}"
        sc_id = str(spacecraft_id or telemetry_service.active_spacecraft or "ASTRA-ALPHA").strip().upper()

        step_states = [
            {
                "step_number": st["step_number"],
                "command_code": st["command_code"],
                "action_title": st["action_title"],
                "description": st.get("description", ""),
                "target_channel": st["target_channel"],
                "metric_key": st.get("metric_key"),
                "unit": st.get("unit", ""),
                "verification_operator": st["verification_operator"],
                "threshold_min": st.get("threshold_min"),
                "threshold_max": st.get("threshold_max"),
                "threshold_label": _format_threshold_label(st),
                "required_ticks": int(st.get("required_ticks", 3)),
                "timeout_seconds": float(st.get("timeout_seconds", 18.0)),
                "status": "PENDING",
                "confirmed_ticks": 0,
                "latest_reading": None,
                "verified_value": None,
                "elapsed_seconds": 0.0,
                "executed_at": None,
                "verified_at": None,
                "effect_summary": None,
                "failure_reason": None,
            }
            for st in steps
        ]

        execution = {
            "execution_id": execution_id,
            "runbook_id": runbook["id"],
            "runbook_title": runbook["title"],
            "subsystem": runbook["subsystem"],
            "spacecraft_id": sc_id,
            "status": "STAGED",
            "current_step": 1,
            "total_steps": len(steps),
            "authorized_by": authorized_by,
            "started_at": now_iso,
            "completed_at": None,
            "step_states": step_states,
            "failure_reason": None,
        }

        self._executions[execution_id] = execution
        self._abort_flags[execution_id] = asyncio.Event()
        db_save_runbook_execution(execution)

        event_store.add_audit_entry(
            type_="RUNBOOK_STARTED",
            subsystem=f"RUNBOOKS ({runbook['subsystem']})",
            event=(
                f"RUNBOOK LAUNCHED: [{execution_id}] {runbook['id']} ({runbook['title']}) "
                f"authorized by {authorized_by} for {sc_id}."
            ),
        )

        await self._broadcast(execution)
        task = asyncio.create_task(self._execute_playbook_loop(execution_id))
        self._tasks[execution_id] = task
        return execution

    async def abort_execution(
        self,
        execution_id: str,
        operator_id: str = "Flight Director Gene Kranz",
        reason: str = "Operator manual abort",
    ) -> Dict[str, Any]:
        execution = self.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution '{execution_id}' not found.")

        if execution["status"] in ("COMPLETED", "HALTED_VERIFICATION_FAILED", "ABORTED"):
            return execution

        abort_ev = self._abort_flags.get(execution_id)
        if abort_ev:
            abort_ev.set()

        now_iso = _utc_now()
        execution["status"] = "ABORTED"
        execution["completed_at"] = now_iso
        execution["failure_reason"] = f"Aborted by {operator_id}: {reason}"

        for st in execution.get("step_states", []):
            if st["status"] in ("TRANSMITTING", "VERIFYING_TELEMETRY"):
                st["status"] = "ABORTED"
                st["failure_reason"] = execution["failure_reason"]

        self._executions[execution_id] = execution
        db_save_runbook_execution(execution)

        event_store.add_audit_entry(
            type_="RUNBOOK_ABORTED",
            subsystem=f"RUNBOOKS ({execution.get('subsystem', 'OPS')})",
            event=(
                f"RUNBOOK ABORTED: [{execution_id}] halted at Step {execution.get('current_step')} "
                f"by {operator_id}. Reason: {reason}"
            ),
        )

        await self._broadcast(execution)
        return execution

    async def _execute_playbook_loop(self, execution_id: str):
        execution = self._executions[execution_id]
        abort_ev = self._abort_flags[execution_id]
        tick_queue = telemetry_service.subscribe_ticks()

        try:
            execution["status"] = "RUNNING"
            db_save_runbook_execution(execution)
            await self._broadcast(execution)

            for idx, step_state in enumerate(execution["step_states"]):
                if abort_ev.is_set():
                    return

                step_num = step_state["step_number"]
                execution["current_step"] = step_num
                execution["status"] = "RUNNING"
                step_state["status"] = "TRANSMITTING"
                step_state["executed_at"] = _utc_now()
                db_save_runbook_execution(execution)
                await self._broadcast(execution)

                # Dispatch physical recovery command effect to TelemetryService
                effect = telemetry_service.apply_recovery_command(
                    command_code=step_state["command_code"],
                    spacecraft_id=execution["spacecraft_id"],
                )
                step_state["effect_summary"] = effect["effect_summary"]

                event_store.add_audit_entry(
                    type_="RUNBOOK_STEP_EXECUTED",
                    subsystem=f"RUNBOOKS ({execution.get('subsystem', 'OPS')})",
                    event=(
                        f"RUNBOOK_STEP_EXECUTED [{execution_id}] Step {step_num}/{execution['total_steps']}: "
                        f"{step_state['command_code']} — {effect['effect_summary']}"
                    ),
                )

                # Transition to live WebSocket telemetry verification gate
                execution["status"] = "VERIFYING_TELEMETRY"
                step_state["status"] = "VERIFYING_TELEMETRY"
                step_state["confirmed_ticks"] = 0
                db_save_runbook_execution(execution)
                await self._broadcast(execution)

                verified = await self._await_telemetry_verification_gate(
                    execution=execution,
                    step_state=step_state,
                    tick_queue=tick_queue,
                    abort_ev=abort_ev,
                )

                if abort_ev.is_set() or execution["status"] == "ABORTED":
                    return

                if not verified:
                    now_iso = _utc_now()
                    latest_val = step_state.get("latest_reading")
                    unit = step_state.get("unit", "")
                    fail_msg = (
                        f"Verification timeout ({step_state['timeout_seconds']}s) on channel "
                        f"{step_state['target_channel']}: live reading {latest_val} {unit} failed "
                        f"target {step_state['threshold_label']} "
                        f"({step_state['confirmed_ticks']}/{step_state['required_ticks']} ticks)."
                    )
                    step_state["status"] = "FAILED"
                    step_state["failure_reason"] = fail_msg
                    execution["status"] = "HALTED_VERIFICATION_FAILED"
                    execution["completed_at"] = now_iso
                    execution["failure_reason"] = fail_msg

                    db_save_runbook_execution(execution)
                    event_store.add_audit_entry(
                        type_="CRITICAL",
                        subsystem=f"RUNBOOKS ({step_state['target_channel']})",
                        event=(
                            f"RUNBOOK_HALTED_VERIFICATION_FAILED [{execution_id}] at Step {step_num}: "
                            f"{fail_msg} Downstream steps blocked."
                        ),
                        telemetry_summary={
                            "execution_id": execution_id,
                            "step": step_num,
                            "channel": step_state["target_channel"],
                            "measured_value": latest_val,
                            "target": step_state["threshold_label"],
                        },
                    )
                    await self._broadcast(execution)
                    return

                # Step gate verified -> log exact sensor telemetry and advance
                step_state["status"] = "VERIFIED_PASSED"
                step_state["verified_at"] = _utc_now()
                db_save_runbook_execution(execution)
                event_store.add_audit_entry(
                    type_="RUNBOOK_GATE_VERIFIED",
                    subsystem=f"RUNBOOKS ({step_state['target_channel']})",
                    event=(
                        f"RUNBOOK_GATE_VERIFIED [{execution_id}] Step {step_num}: "
                        f"Channel {step_state['target_channel']} stabilized at {step_state['verified_value']} "
                        f"{step_state.get('unit', '')} (Target {step_state['threshold_label']}, "
                        f"{step_state['required_ticks']}/{step_state['required_ticks']} ticks confirmed)."
                    ),
                    telemetry_summary={
                        "execution_id": execution_id,
                        "step": step_num,
                        "channel": step_state["target_channel"],
                        "verified_value": step_state["verified_value"],
                        "target": step_state["threshold_label"],
                    },
                )
                await self._broadcast(execution)

            # All steps verified -> finalize nominal recovery and mark playbook COMPLETED
            telemetry_service.finalize_runbook_nominal_recovery(
                reason=f"Contingency runbook {execution['runbook_id']} ({execution_id}) verified nominal recovery."
            )
            execution["status"] = "COMPLETED"
            execution["completed_at"] = _utc_now()
            db_save_runbook_execution(execution)

            event_store.add_audit_entry(
                type_="RUNBOOK_COMPLETED",
                subsystem=f"RUNBOOKS ({execution.get('subsystem', 'OPS')})",
                event=(
                    f"RUNBOOK COMPLETED [{execution_id}] {execution['runbook_id']} ({execution['runbook_title']}): "
                    f"All {execution['total_steps']} telemetry verification gates passed. Spacecraft restored to nominal envelope."
                ),
            )
            await self._broadcast(execution)
        except Exception as exc:
            logger.exception(f"Unexpected error in runbook execution {execution_id}: {exc}")
            execution["status"] = "HALTED_VERIFICATION_FAILED"
            execution["completed_at"] = _utc_now()
            execution["failure_reason"] = f"Engine execution exception: {exc}"
            db_save_runbook_execution(execution)
            await self._broadcast(execution)
        finally:
            telemetry_service.unsubscribe_ticks(tick_queue)
            self._tasks.pop(execution_id, None)

    async def _await_telemetry_verification_gate(
        self,
        execution: Dict[str, Any],
        step_state: Dict[str, Any],
        tick_queue: asyncio.Queue,
        abort_ev: asyncio.Event,
    ) -> bool:
        """
        Subscribes to live TelemetryService frames and requires consecutive readings
        to satisfy the target channel threshold before timeout_seconds expires.
        """
        # Flush stale buffered ticks emitted prior to this step's command dispatch
        while not tick_queue.empty():
            try:
                tick_queue.get_nowait()
            except Exception:
                break

        timeout_sec = float(step_state.get("timeout_seconds", 18.0))
        required_ticks = int(step_state.get("required_ticks", 3))
        target_ch = step_state["target_channel"]
        metric_key = step_state.get("metric_key")
        op = step_state["verification_operator"]
        t_min = step_state.get("threshold_min")
        t_max = step_state.get("threshold_max")

        gate_start = time.monotonic()
        consecutive_ok = 0

        while not abort_ev.is_set():
            elapsed = time.monotonic() - gate_start
            remaining = timeout_sec - elapsed
            if remaining <= 0:
                step_state["elapsed_seconds"] = round(timeout_sec, 1)
                return False

            # Wait for next live telemetry tick from WebSocket loop;
            # if no WS client is active for >1.6s, advance TelemetryService directly so REST-only execution works cleanly.
            wait_window = min(1.6, remaining)
            try:
                await asyncio.wait_for(tick_queue.get(), timeout=wait_window)
            except asyncio.TimeoutError:
                if abort_ev.is_set():
                    return False
                if (timeout_sec - (time.monotonic() - gate_start)) <= 0:
                    step_state["elapsed_seconds"] = round(timeout_sec, 1)
                    return False
                telemetry_service.generate_next_tick()
                while not tick_queue.empty():
                    try:
                        tick_queue.get_nowait()
                    except Exception:
                        break

            if abort_ev.is_set():
                return False

            measurement = telemetry_service.get_channel_measurement(target_ch, metric_key)
            val = float(measurement["value"])
            step_state["latest_reading"] = val
            step_state["unit"] = measurement.get("unit", step_state.get("unit", ""))
            step_state["elapsed_seconds"] = round(time.monotonic() - gate_start, 1)

            passed = evaluate_threshold(val, op, t_min, t_max)
            if passed:
                consecutive_ok += 1
            else:
                consecutive_ok = 0

            step_state["confirmed_ticks"] = consecutive_ok
            db_save_runbook_execution(execution)
            await self._broadcast(execution)

            if consecutive_ok >= required_ticks:
                step_state["verified_value"] = val
                return True

        return False


runbook_engine = RunbookEngine()
