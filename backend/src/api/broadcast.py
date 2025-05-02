from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from src.services.broadcast import broadcast_service
from datetime import datetime

router = APIRouter()


class NotificationPayload(BaseModel):
    id: str
    title: str
    message: str
    type: str = "info"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    read: bool = False
    data: Optional[dict] = None


class BroadcastMessage(BaseModel):
    id: str = Field(default_factory=lambda: f"notif_{datetime.now().timestamp()}")
    type: str = "notification"
    payload: NotificationPayload


@router.post("/broadcast/company/{company}")
async def broadcast_to_company(company: str, message: BroadcastMessage):
    success = await broadcast_service.broadcast_to_company(
        company=company, message=message.dict()
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to broadcast message")
    return {"status": "success", "message": "Message broadcasted to company"}


@router.post("/broadcast/role/{role}")
async def broadcast_to_role(role: str, message: BroadcastMessage):
    success = await broadcast_service.broadcast_to_role(
        role=role, message=message.dict()
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to broadcast message")
    return {"status": "success", "message": "Message broadcasted to role"}


@router.post("/broadcast/company/{company}/role/{role}")
async def broadcast_to_company_role(company: str, role: str, message: BroadcastMessage):
    success = await broadcast_service.broadcast_to_company_role(
        company=company, role=role, message=message.dict()
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to broadcast message")
    return {"status": "success", "message": "Message broadcasted to company and role"}
