from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    Query,
    status,
)
from src.core.websocket import websocket_manager
import json
import logging
from jose import JWTError, jwt
from src.core.config import settings
from typing import Dict
from datetime import datetime
from urllib.parse import urlparse

logger = logging.getLogger(__name__)
router = APIRouter()

# Store active connections
active_connections: Dict[str, WebSocket] = {}


def validate_origin(origin: str) -> bool:
    """
    Validate if the origin is allowed to connect to WebSocket
    """
    if not origin:
        return False

    try:
        parsed_origin = urlparse(origin)
        origin_host = parsed_origin.netloc

        for allowed_origin in settings.ALLOWED_WS_ORIGINS:
            parsed_allowed = urlparse(allowed_origin)
            allowed_host = parsed_allowed.netloc

            # Check if the host matches (including subdomains)
            if origin_host == allowed_host or origin_host.endswith(f".{allowed_host}"):
                return True

        return False
    except Exception as e:
        logger.error(f"Error validating origin: {e}")
        return False


async def get_current_user(token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.info(f"Validating token with SECRET_KEY: {settings.SECRET_KEY}")
        logger.info(f"Using ALGORITHM: {settings.ALGORITHM}")

        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        logger.info(f"Token decoded successfully. Payload: {payload}")

        username: str = payload.get("sub")
        if username is None:
            logger.error("No username found in token payload")
            raise credentials_exception

        logger.info(f"Token validated for user: {username}")
        return username
    except JWTError as e:
        logger.error(f"JWT Error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error in token validation: {str(e)}")
        raise credentials_exception


@router.websocket("/ws/notification")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        # Validate origin
        origin = websocket.headers.get("origin")
        if not validate_origin(origin):
            logger.warning(
                f"Rejected WebSocket connection from unauthorized origin: {origin}"
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        logger.info(f"WebSocket connection attempt with token: {token}")

        # Authenticate user
        username = await get_current_user(token)
        logger.info(f"User {username} authenticated successfully")

        # Accept the connection
        await websocket.accept()
        logger.info(f"WebSocket connection accepted for user {username}")

        # Connect to the manager
        await websocket_manager.connect(websocket, username)
        logger.info(f"User {username} connected to WebSocketManager")

        try:
            while True:
                data = await websocket.receive_text()
                logger.debug(f"Received message from {username}: {data}")

                try:
                    message = json.loads(data)
                    logger.debug(f"Parsed message: {message}")

                    # Handle different message types
                    if message.get("type") == "ping":
                        logger.debug(f"Sending pong to {username}")
                        await websocket.send_json(
                            {"type": "pong", "timestamp": datetime.now().isoformat()}
                        )
                    elif message.get("type") == "auth":
                        logger.debug(f"Sending auth success to {username}")
                        await websocket.send_json(
                            {"type": "auth_success", "payload": {"user_id": username}}
                        )
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received from {username}: {e}")
                except Exception as e:
                    logger.error(f"Error processing message from {username}: {e}")

        except WebSocketDisconnect:
            logger.info(f"User {username} disconnected")
            websocket_manager.disconnect(websocket, username)
        except Exception as e:
            logger.error(f"Error in websocket connection for {username}: {str(e)}")
            websocket_manager.disconnect(websocket, username)
            await websocket.close()

    except HTTPException as e:
        logger.error(f"Authentication failed: {str(e)}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
