from fastapi import APIRouter, HTTPException, Depends
from src.services.notification import notification_service, Notification
from src.core.websocket import websocket_manager
from typing import List
import json
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class NotificationRequest(BaseModel):
    title: str
    message: str
    priority: str
    category: str


@router.post("/notifications", response_model=Notification)
async def create_notification(
    user_id: str, title: str, message: str, type: str = "info", data: dict = None
):
    try:
        notification = notification_service.create_notification(
            user_id=user_id, title=title, message=message, type=type, data=data
        )

        # Send notification through WebSocket
        await websocket_manager.send_personal_message(
            json.dumps({"type": "new_notification", "data": notification.dict()}),
            user_id,
        )

        return notification
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification")


@router.get("/notifications/{user_id}", response_model=List[Notification])
async def get_notifications(user_id: str):
    try:
        return notification_service.get_user_notifications(user_id)
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notifications")


@router.put("/notifications/{notification_id}/read", response_model=Notification)
async def mark_notification_as_read(notification_id: str):
    try:
        notification = notification_service.mark_as_read(notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        return notification
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to mark notification as read"
        )


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    try:
        if not notification_service.delete_notification(notification_id):
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")


@router.post("/notifications/send")
async def send_notification(notification: NotificationRequest):
    try:
        logger.info(f"Creating notification: {notification.dict()}")

        # Create notification
        new_notification = notification_service.create_notification(
            user_id="all",  # Send to all users
            title=notification.title,
            message=notification.message,
            type=notification.priority,
            data={"category": notification.category},
        )

        logger.info(f"Notification created: {new_notification.dict()}")

        # Broadcast to all connected clients
        message = {
            "id": str(new_notification.id),
            "type": "notification",
            "payload": {
                "id": str(new_notification.id),
                "title": new_notification.title,
                "message": new_notification.message,
                "type": new_notification.type,
                "created_at": new_notification.created_at,
                "read": new_notification.read,
                "data": new_notification.data,
            },
        }
        logger.info(f"Broadcasting message: {message}")

        # Convert message to JSON string
        message_str = json.dumps(message)
        logger.debug(f"Broadcasting message string: {message_str}")

        # Use the WebSocketManager to broadcast the message
        await websocket_manager.broadcast(message_str)
        logger.info("Message broadcasted successfully")

        return {"message": "Notification sent successfully"}
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to send notification: {str(e)}"
        )
