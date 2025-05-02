from typing import Dict, Set
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        # use redis to store active connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        try:
            # Don't accept the connection here as it's already accepted in the endpoint
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
            logger.info(
                f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}"
            )
        except Exception as e:
            logger.error(f"Error adding WebSocket connection: {e}")
            raise

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(
                f"User {user_id} disconnected. Remaining connections: {len(self.active_connections.get(user_id, set()))}"
            )

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    self.disconnect(connection, user_id)

    async def broadcast(self, message: str):
        logger.info(f"Broadcasting message to all connected clients")
        logger.debug(f"Message to broadcast: {message}")
        logger.debug(f"Active connections: {self.active_connections}")

        if not self.active_connections:
            logger.warning("No active connections to broadcast to")
            return

        for user_connections in self.active_connections.values():
            for connection in user_connections:
                try:
                    logger.debug(f"Sending message to connection: {connection}")
                    await connection.send_text(message)
                    logger.debug(
                        f"Message sent successfully to connection: {connection}"
                    )
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
                    # Note: We don't disconnect here as we don't have the user_id


# Create a global instance
websocket_manager = WebSocketManager()
