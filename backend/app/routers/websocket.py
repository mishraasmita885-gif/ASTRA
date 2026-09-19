import asyncio
import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.telemetry_service import telemetry_service
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


@router.websocket("/ws/telemetry")
async def telemetry_stream_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial connection confirmation and state
        initial_state = telemetry_service.generate_next_tick()
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "telemetry": initial_state,
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
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except asyncio.TimeoutError:
                pass
            except json.JSONDecodeError:
                pass

            # Push telemetry tick
            tick = telemetry_service.generate_next_tick()
            events = event_store.list_events()
            
            await websocket.send_text(json.dumps({
                "type": "TELEMETRY_TICK",
                "telemetry": tick,
                "active_events_count": len([e for e in events if e.status in ["ANOMALY_DETECTED", "UNDER_REVIEW"]]),
                "latest_event": events[0].model_dump() if events else None
            }))

            await asyncio.sleep(1.2)  # Tick interval

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
