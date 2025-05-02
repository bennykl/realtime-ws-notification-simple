from fastapi import WebSocket
from typing import Dict, Set
import json
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        # Topic-based connection management
        self.topics: Dict[str, Set[WebSocket]] = {
            "global": set(),  # All connected clients
            "company": {},  # company_id -> Set[WebSocket]
            "user": {},  # (company_id, user_id) -> Set[WebSocket]
        }

        # Connection tracking
        self.connections: Dict[str, Dict] = {}  # client_id -> connection info

        # Heartbeat tracking
        self.last_heartbeat: Dict[str, datetime] = {}

        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_dead_connections())

    async def connect(
        self, websocket: WebSocket, client_id: str, token: str, topics: list[str]
    ):
        """Handle new WebSocket connection with topic subscription"""
        try:
            # Validate topics
            for topic in topics:
                if not self._validate_topic_format(topic):
                    raise ValueError(f"Invalid topic format: {topic}")

            # Store connection info
            self.connections[client_id] = {
                "websocket": websocket,
                "topics": set(topics),
                "token": token,
                "last_activity": datetime.now(),
            }

            # Subscribe to topics
            for topic in topics:
                await self._subscribe_to_topic(websocket, topic)

            # Add to global connections
            self.topics["global"].add(websocket)

            logger.info(
                f"Client {client_id} connected and subscribed to topics: {topics}"
            )

        except Exception as e:
            logger.error(f"Error in connect: {str(e)}")
            raise

    async def disconnect(self, client_id: str):
        """Handle WebSocket disconnection"""
        if client_id in self.connections:
            connection = self.connections[client_id]

            # Unsubscribe from all topics
            for topic in connection["topics"]:
                await self._unsubscribe_from_topic(connection["websocket"], topic)

            # Remove from global connections
            self.topics["global"].discard(connection["websocket"])

            # Cleanup connection info
            del self.connections[client_id]
            if client_id in self.last_heartbeat:
                del self.last_heartbeat[client_id]

            logger.info(f"Client {client_id} disconnected")

    async def broadcast(self, message: dict, topic: str = "global"):
        """Broadcast message to all clients in a topic"""
        try:
            if topic not in self.topics:
                logger.warning(f"Topic {topic} not found")
                return

            message_json = json.dumps(message)
            websockets = self.topics[topic]

            for websocket in websockets:
                try:
                    await websocket.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error sending message to client: {str(e)}")
                    # Remove dead connection
                    await self._remove_dead_connection(websocket)

        except Exception as e:
            logger.error(f"Error in broadcast: {str(e)}")

    async def send_to_client(self, client_id: str, message: dict):
        """Send message to specific client"""
        if client_id in self.connections:
            try:
                message_json = json.dumps(message)
                await self.connections[client_id]["websocket"].send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending message to client {client_id}: {str(e)}")
                await self._remove_dead_connection(
                    self.connections[client_id]["websocket"]
                )

    async def handle_heartbeat(self, client_id: str):
        """Handle client heartbeat"""
        self.last_heartbeat[client_id] = datetime.now()
        if client_id in self.connections:
            self.connections[client_id]["last_activity"] = datetime.now()

    def _validate_topic_format(self, topic: str) -> bool:
        """Validate topic format"""
        if topic == "global":
            return True

        parts = topic.split("/")
        if len(parts) < 2 or parts[0] != "company":
            return False

        if len(parts) == 2:  # company/{company_id}
            return True

        if (
            len(parts) == 4 and parts[2] == "user"
        ):  # company/{company_id}/user/{user_id}
            return True

        return False

    async def _subscribe_to_topic(self, websocket: WebSocket, topic: str):
        """Subscribe websocket to a topic"""
        if topic == "global":
            self.topics["global"].add(websocket)
            return

        parts = topic.split("/")
        if len(parts) == 2:  # company/{company_id}
            company_id = parts[1]
            if company_id not in self.topics["company"]:
                self.topics["company"][company_id] = set()
            self.topics["company"][company_id].add(websocket)
        elif len(parts) == 4:  # company/{company_id}/user/{user_id}
            company_id = parts[1]
            user_id = parts[3]
            key = f"{company_id}:{user_id}"
            if key not in self.topics["user"]:
                self.topics["user"][key] = set()
            self.topics["user"][key].add(websocket)

    async def _unsubscribe_from_topic(self, websocket: WebSocket, topic: str):
        """Unsubscribe websocket from a topic"""
        if topic == "global":
            self.topics["global"].discard(websocket)
            return

        parts = topic.split("/")
        if len(parts) == 2:  # company/{company_id}
            company_id = parts[1]
            if company_id in self.topics["company"]:
                self.topics["company"][company_id].discard(websocket)
        elif len(parts) == 4:  # company/{company_id}/user/{user_id}
            company_id = parts[1]
            user_id = parts[3]
            key = f"{company_id}:{user_id}"
            if key in self.topics["user"]:
                self.topics["user"][key].discard(websocket)

    async def _remove_dead_connection(self, websocket: WebSocket):
        """Remove dead connection from all topics"""
        # Find client_id for this websocket
        client_id = None
        for cid, conn in self.connections.items():
            if conn["websocket"] == websocket:
                client_id = cid
                break

        if client_id:
            await self.disconnect(client_id)

    async def _cleanup_dead_connections(self):
        """Periodically cleanup dead connections"""
        while True:
            try:
                current_time = datetime.now()
                dead_clients = []

                # Check for clients without heartbeat in last 60 seconds
                for client_id, last_heartbeat in self.last_heartbeat.items():
                    if (current_time - last_heartbeat).total_seconds() > 60:
                        dead_clients.append(client_id)

                # Remove dead clients
                for client_id in dead_clients:
                    await self.disconnect(client_id)

                # Sleep for 30 seconds
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Error in cleanup task: {str(e)}")
                await asyncio.sleep(30)  # Sleep before retrying

    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self.connections),
            "global_subscribers": len(self.topics["global"]),
            "company_subscribers": sum(
                len(ws_set) for ws_set in self.topics["company"].values()
            ),
            "user_subscribers": sum(
                len(ws_set) for ws_set in self.topics["user"].values()
            ),
        }
