import asyncio
import json
import logging
import time
from typing import Set, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.telemetry_service import telemetry_service
from app.services.orbital_service import orbital_service
from app.services.forecasting_service import forecasting_service
from app.services.fta_service import fta_service
from app.storage.event_store import event_store

logger = logging.getLogger("astra.websocket")
router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        payload = json.dumps(message)
        to_remove = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                to_remove.add(connection)
        for dead_conn in to_remove:
            self.disconnect(dead_conn)


manager = ConnectionManager()
_last_alarm_logged: Dict[str, float] = {}


@router.websocket("/ws/telemetry")
async def telemetry_stream_endpoint(websocket: WebSocket, spacecraft_id: str = None):
    await manager.connect(websocket)
    try:
        if spacecraft_id:
            telemetry_service.set_spacecraft(spacecraft_id.strip().upper())

        # Send initial connection confirmation and state
        initial_state = telemetry_service.generate_next_tick()
        initial_orbital = await orbital_service.get_current_state(telemetry_service.active_spacecraft)
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "telemetry": initial_state,
            "orbital_state": initial_orbital,
            "spacecraft_id": telemetry_service.active_spacecraft,
            "fleet_summary": telemetry_service.get_fleet_summary(),
            "events_count": len(event_store.list_events())
        }))

        while True:
            # Handle incoming client commands (non-blocking with timeout)
            try:
                data_text = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                data = json.loads(data_text)
                action = data.get("action")
                
                if action == "set_mode":
                    mode = data.get("mode", "nominal")
                    start_index = data.get("start_index", 5200)
                    telemetry_service.set_mode(mode, start_index)
                    await websocket.send_text(json.dumps({
                        "type": "MODE_CHANGED",
                        "mode": mode,
                        "start_index": start_index
                    }))
                elif action == "set_channel":
                    ch = data.get("channel", "P-3").strip().upper()
                    telemetry_service.set_channel(ch)
                    event_store.add_audit_entry(
                        type_="COMMAND_UPLINK",
                        subsystem=f"INGESTION ({ch})",
                        event=f"STREAM RECONFIGURED: Switched telemetry ingestion engine to NASA channel {ch}."
                    )
                    await websocket.send_text(json.dumps({
                        "type": "CHANNEL_CHANGED",
                        "channel": ch
                    }))
                elif action == "set_spacecraft":
                    sc_id = data.get("spacecraft_id", "ASTRA-ALPHA").strip().upper()
                    telemetry_service.set_spacecraft(sc_id)
                    event_store.add_audit_entry(
                        type_="COMMAND_UPLINK",
                        subsystem=f"FLEET ({sc_id})",
                        event=f"STREAM RECONFIGURED: Switched ground telemetry monitoring focus to constellation node {sc_id}."
                    )
                    await websocket.send_text(json.dumps({
                        "type": "SPACECRAFT_CHANGED",
                        "spacecraft_id": sc_id
                    }))
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except asyncio.TimeoutError:
                pass
            except json.JSONDecodeError:
                pass

            # Push telemetry tick with real-time SGP4 orbital positioning + forecasting
            tick = telemetry_service.generate_next_tick()
            orbital_state = await orbital_service.get_current_state(telemetry_service.active_spacecraft)
            
            # Cross-correlate SAA radiation crossing with live telemetry spikes
            saa_perturbations = orbital_service.get_saa_perturbations()
            if saa_perturbations.get("radiation_spike"):
                tick["temperature"] = round(tick.get("temperature", 15.0) + saa_perturbations["temperature_delta"], 2)
                tick["voltage"] = round(tick.get("voltage", 24.0) + saa_perturbations["voltage_delta"], 2)
                tick["saa_active"] = True

            # Ingest live tick into the rolling forecasting buffer
            active_sc = telemetry_service.active_spacecraft
            forecasting_service.ingest_tick(active_sc, tick)

            # Get lightweight forecast summary (projected points + runway alarms)
            fc_summary = forecasting_service.get_forecast_summary(active_sc)
            active_alarms = fc_summary.get("active_alarms", [])

            # Emit PREDICTIVE_WARNING audit entries (throttled to max 1 per 60s per channel to prevent log flood)
            now_epoch = time.time()
            for alarm in active_alarms:
                alarm_key = f"{active_sc}:{alarm['channel']}"
                if now_epoch - _last_alarm_logged.get(alarm_key, 0.0) >= 60.0:
                    _last_alarm_logged[alarm_key] = now_epoch
                    ttb = alarm["time_to_breach_sec"]
                    ch_label = alarm["channel"].upper()
                    event_store.add_audit_entry(
                        type_="PREDICTIVE_WARNING",
                        subsystem=f"FORECAST ({ch_label})",
                        event=(
                            f"RUNWAY ALARM: {ch_label} projected to breach "
                            f"{alarm['threshold_value']}{alarm['unit']} threshold in "
                            f"{int(ttb // 60)}m {int(ttb % 60)}s "
                            f"(slope: {alarm['slope_per_sec']:+.4f}/s, severity: {alarm['severity']})"
                        )
                    )

            events = event_store.list_events()

            # Build live fault tree cascade graph
            fault_tree = fta_service.build_cascade(
                spacecraft_id=active_sc,
                telemetry=tick,
                active_events=events,
            )

            await websocket.send_text(json.dumps({
                "type": "TELEMETRY_TICK",
                "telemetry": tick,
                "orbital_state": orbital_state,
                "spacecraft_id": active_sc,
                "fleet_summary": telemetry_service.get_fleet_summary(),
                "active_events_count": len([e for e in events if e.status in ["ANOMALY_DETECTED", "UNDER_REVIEW"]]),
                "latest_event": events[0].model_dump() if events else None,
                "forecast": {
                    "active_alarms": active_alarms,
                    "channels": {
                        ch: {
                            "slope_per_sec": fc_summary["channels"][ch]["slope_per_sec"],
                            "current_value": fc_summary["channels"][ch]["current_value"],
                            "projected": fc_summary["channels"][ch]["projected"][:30],
                            "runway": fc_summary["channels"][ch]["runway"],
                            "window_size": fc_summary["channels"][ch]["window_size"],
                        }
                        for ch in fc_summary["channels"]
                    }
                },
                "fault_tree": {
                    "nodes": fault_tree["nodes"],
                    "edges": fault_tree["edges"],
                    "summary": fault_tree["summary"],
                },
            }))

            await asyncio.sleep(1.2)  # Tick interval

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
