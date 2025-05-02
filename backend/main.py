from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api import websocket, notifications, auth, broadcast
from src.core.config import settings
import logging

# Setup logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(websocket.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(broadcast.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting FastAPI application on port {settings.PORT}")
    logger.info(f"CORS configured with allow_origins: {settings.CORS_ORIGINS}")
    logger.info(
        f"WebSocket endpoint available at: ws://0.0.0.0:{settings.PORT}/api/ws/notification"
    )
    logger.info(f"Using SECRET_KEY: {settings.SECRET_KEY}")
    logger.info(f"Using ALGORITHM: {settings.ALGORITHM}")


@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down FastAPI application")
