from typing import Dict, Set
from fastapi import WebSocket
import logging
import redis
import json
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class RedisWebSocketManager:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        self.local_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        try:
            # Store in local memory
            if user_id not in self.local_connections:
                self.local_connections[user_id] = set()
            self.local_connections[user_id].add(websocket)

            # Store in Redis
            connection_id = f"{user_id}:{int(time.time())}"
            connection_data = {
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "status": "active",
            }

            # Add to user's connections set
            self.redis_client.sadd(f"user:{user_id}:connections", connection_id)
            # Store connection metadata
            self.redis_client.hmset(f"connection:{connection_id}", connection_data)

            logger.info(f"User {user_id} connected. Connection ID: {connection_id}")

        except Exception as e:
            logger.error(f"Error adding WebSocket connection: {e}")
            raise

    def disconnect(self, websocket: WebSocket, user_id: str):
        try:
            # Remove from local memory
            if user_id in self.local_connections:
                self.local_connections[user_id].discard(websocket)
                if not self.local_connections[user_id]:
                    del self.local_connections[user_id]

            # Find and remove from Redis
            connection_ids = self.redis_client.smembers(f"user:{user_id}:connections")
            for conn_id in connection_ids:
                if (
                    self.redis_client.hget(f"connection:{conn_id}", "status")
                    == "active"
                ):
                    self.redis_client.hset(
                        f"connection:{conn_id}", "status", "disconnected"
                    )
                    self.redis_client.hset(
                        f"connection:{conn_id}",
                        "disconnected_at",
                        datetime.now().isoformat(),
                    )

            logger.info(f"User {user_id} disconnected")

        except Exception as e:
            logger.error(f"Error during disconnect: {e}")

    async def send_personal_message(self, message: str, user_id: str):
        try:
            if user_id in self.local_connections:
                for connection in self.local_connections[user_id]:
                    try:
                        await connection.send_text(message)
                    except Exception as e:
                        logger.error(f"Error sending message to user {user_id}: {e}")
                        self.disconnect(connection, user_id)
        except Exception as e:
            logger.error(f"Error in send_personal_message: {e}")

    async def broadcast(self, message: str):
        try:
            logger.info("Broadcasting message to all connected clients")

            # Get all active user IDs from Redis
            user_ids = set()
            for key in self.redis_client.scan_iter("user:*:connections"):
                user_id = key.decode("utf-8").split(":")[1]
                user_ids.add(user_id)

            # Send to all local connections
            for user_id in user_ids:
                if user_id in self.local_connections:
                    for connection in self.local_connections[user_id]:
                        try:
                            await connection.send_text(message)
                        except Exception as e:
                            logger.error(f"Error broadcasting to user {user_id}: {e}")
                            self.disconnect(connection, user_id)

        except Exception as e:
            logger.error(f"Error in broadcast: {e}")

    def cleanup_inactive_connections(self, max_age_seconds: int = 3600):
        """Clean up connections that have been inactive for too long"""
        try:
            current_time = time.time()
            for key in self.redis_client.scan_iter("connection:*"):
                conn_data = self.redis_client.hgetall(key)
                if conn_data:
                    timestamp = datetime.fromisoformat(conn_data.get("timestamp", ""))
                    if (current_time - timestamp.timestamp()) > max_age_seconds:
                        self.redis_client.delete(key)
                        user_id = conn_data.get("user_id")
                        if user_id:
                            self.redis_client.srem(f"user:{user_id}:connections", key)
        except Exception as e:
            logger.error(f"Error in cleanup_inactive_connections: {e}")


# Create a global instance
redis_websocket_manager = RedisWebSocketManager()
