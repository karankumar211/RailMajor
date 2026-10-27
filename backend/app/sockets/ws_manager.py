"""RailOpt AI - WebSocket Connection Manager
Maintains active client connections and broadcasts real-time operational events:
- conflict.created
- recommendation.ready
- decision.recorded
"""
import asyncio
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("railopt.ws")

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, event: Dict[str, Any]):
        """Broadcasts a JSON-serializable event dictionary to all active clients."""
        disconnected = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(event)
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)

    def broadcast_sync(self, event: Dict[str, Any]):
        """Synchronous wrapper to schedule broadcast if called from sync context."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(event))
        except RuntimeError:
            pass

ws_manager = WebSocketManager()
