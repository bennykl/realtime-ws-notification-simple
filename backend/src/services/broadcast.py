import json
import logging
from src.core.websocket import websocket_manager
from src.config.users import get_users_by_company, get_users_by_role

logger = logging.getLogger(__name__)


class BroadcastService:
    async def broadcast_to_company(self, company: str, message: dict):
        """Broadcast message to all users in a specific company"""
        try:
            users = get_users_by_company(company)

            # Convert message to JSON string
            message_str = json.dumps(message)

            for user in users:
                await websocket_manager.send_personal_message(
                    message_str, user.username
                )

            logger.info(f"Broadcasted message to company {company}: {message}")
            return True
        except Exception as e:
            logger.error(f"Error broadcasting to company {company}: {str(e)}")
            return False

    async def broadcast_to_role(self, role: str, message: dict):
        """Broadcast message to all users with a specific role"""
        try:
            users = get_users_by_role(role)

            # Convert message to JSON string
            message_str = json.dumps(message)

            for user in users:
                await websocket_manager.send_personal_message(
                    message_str, user.username
                )

            logger.info(f"Broadcasted message to role {role}: {message}")
            return True
        except Exception as e:
            logger.error(f"Error broadcasting to role {role}: {str(e)}")
            return False

    async def broadcast_to_company_role(self, company: str, role: str, message: dict):
        """Broadcast message to all users in a specific company with a specific role"""
        try:
            company_users = get_users_by_company(company)

            # Convert message to JSON string
            message_str = json.dumps(message)

            for user in company_users:
                if user.role == role:
                    await websocket_manager.send_personal_message(
                        message_str, user.username
                    )

            logger.info(
                f"Broadcasted message to company {company} role {role}: {message}"
            )
            return True
        except Exception as e:
            logger.error(
                f"Error broadcasting to company {company} role {role}: {str(e)}"
            )
            return False


# Create a global instance
broadcast_service = BroadcastService()
