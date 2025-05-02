import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.websocket.manager import WebSocketManager
from app.core.logging_config import setup_logging

# Setup logging first
setup_logging()
logger = logging.getLogger(__name__)


# Initialize FastAPI app
app = FastAPI()
ws_manager = WebSocketManager()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
