from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    read: bool = False
    data: Optional[Dict[str, Any]] = None

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}


class NotificationService:
    def __init__(self):
        self.notifications: Dict[str, Notification] = {}

    def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        type: str = "info",
        data: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        notification = Notification(
            id=f"notif_{datetime.now().timestamp()}",
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            data=data,
        )
        self.notifications[notification.id] = notification
        logger.info(f"Created notification {notification.id} for user {user_id}")
        return notification

    def get_user_notifications(self, user_id: str) -> list[Notification]:
        return [
            notification
            for notification in self.notifications.values()
            if notification.user_id == user_id
        ]

    def mark_as_read(self, notification_id: str) -> Optional[Notification]:
        if notification_id in self.notifications:
            notification = self.notifications[notification_id]
            notification.read = True
            logger.info(f"Marked notification {notification_id} as read")
            return notification
        return None

    def delete_notification(self, notification_id: str) -> bool:
        if notification_id in self.notifications:
            del self.notifications[notification_id]
            logger.info(f"Deleted notification {notification_id}")
            return True
        return False


# Create a global instance
notification_service = NotificationService()
