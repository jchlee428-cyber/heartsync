import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.notifications import NotificationsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


class UnreadCountResponse(BaseModel):
    count: int


class MarkReadRequest(BaseModel):
    notification_id: int


class CreateReportNotificationRequest(BaseModel):
    diagnosis_id: str
    total_score: int


class NotificationItem(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    related_id: Optional[str] = None
    related_type: Optional[str] = None
    week_number: Optional[int] = None
    scheduled_at: Optional[str] = None
    created_at: Optional[str] = None


class NotificationListResponse(BaseModel):
    items: List[NotificationItem]
    unread_count: int


WEEKLY_CHECKPOINTS = [
    {
        "week": 1,
        "title": "🎯 1주차 체크포인트",
        "message": "첫 번째 주가 지났어요! 가장 시급한 영역의 실천 과제를 점검해보세요. 작은 변화도 큰 의미가 있어요 💪",
    },
    {
        "week": 2,
        "title": "💕 2주차 체크포인트",
        "message": "2주차 실천 과제를 확인해보세요. 두 번째 핵심 영역 개선에 집중할 시간이에요. 파트너와 함께 대화해보세요 🗣️",
    },
    {
        "week": 3,
        "title": "🌟 3주차 체크포인트",
        "message": "벌써 3주차! 복합적 실천 과제를 시작할 때예요. 지금까지의 변화를 파트너와 함께 돌아보세요 ✨",
    },
    {
        "week": 4,
        "title": "🏆 4주차 최종 점검",
        "message": "30일 개선 플랜의 마지막 주입니다! 전체 점검 후 새로운 진단으로 변화를 확인해보세요. 수고하셨어요! 🎉",
    },
]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the count of unread notifications for current user"""
    try:
        service = NotificationsService(db)
        result = await service.get_list(
            user_id=current_user.id,
            query_dict={"is_read": False},
            limit=200,
        )
        # Filter only notifications that are scheduled at or before now
        now = datetime.now()
        items = result.get("items", [])
        visible_count = 0
        for item in items:
            scheduled = getattr(item, "scheduled_at", None)
            if scheduled is None or scheduled <= now:
                visible_count += 1
        return UnreadCountResponse(count=visible_count)
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        return UnreadCountResponse(count=0)


@router.get("/list", response_model=NotificationListResponse)
async def get_notification_list(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all visible notifications for current user"""
    try:
        service = NotificationsService(db)
        result = await service.get_list(
            user_id=current_user.id,
            query_dict={},
            sort="-created_at",
            limit=50,
        )
        now = datetime.now()
        items = result.get("items", [])
        visible_items = []
        unread_count = 0
        for item in items:
            scheduled = getattr(item, "scheduled_at", None)
            if scheduled is not None and scheduled > now:
                continue
            is_read = getattr(item, "is_read", False) or False
            if not is_read:
                unread_count += 1
            visible_items.append(
                NotificationItem(
                    id=item.id,
                    type=getattr(item, "type", "system") or "system",
                    title=getattr(item, "title", "") or "",
                    message=getattr(item, "message", "") or "",
                    is_read=is_read,
                    related_id=getattr(item, "related_id", None),
                    related_type=getattr(item, "related_type", None),
                    week_number=getattr(item, "week_number", None),
                    scheduled_at=item.scheduled_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(item, "scheduled_at", None) else None,
                    created_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(item, "created_at", None) else None,
                )
            )
        return NotificationListResponse(items=visible_items, unread_count=unread_count)
    except Exception as e:
        logger.error(f"Error getting notification list: {e}")
        return NotificationListResponse(items=[], unread_count=0)


@router.post("/mark-read")
async def mark_notification_read(
    data: MarkReadRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read"""
    try:
        service = NotificationsService(db)
        await service.update(
            obj_id=data.notification_id,
            update_data={"is_read": True},
            user_id=current_user.id,
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for current user"""
    try:
        service = NotificationsService(db)
        result = await service.get_list(
            user_id=current_user.id,
            query_dict={"is_read": False},
            limit=200,
        )
        items = result.get("items", [])
        count = 0
        for item in items:
            await service.update(
                obj_id=item.id,
                update_data={"is_read": True},
                user_id=current_user.id,
            )
            count += 1
        return {"success": True, "updated_count": count}
    except Exception as e:
        logger.error(f"Error marking all as read: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-report-notification")
async def create_report_notification(
    data: CreateReportNotificationRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create notification for AI report completion + 30-day weekly checkpoint notifications"""
    try:
        service = NotificationsService(db)
        now = datetime.now()

        # 1. Create "report ready" notification
        await service.create(
            data={
                "type": "report_ready",
                "title": "📊 AI 분석 리포트 완성!",
                "message": f"종합 점수 {data.total_score}/250 기반의 심층 분석 리포트가 준비되었습니다. 지금 확인해보세요!",
                "is_read": False,
                "related_id": data.diagnosis_id,
                "related_type": "diagnosis",
                "scheduled_at": now,
                "created_at": now,
            },
            user_id=current_user.id,
        )

        # 2. Create 4 weekly checkpoint notifications (scheduled for future)
        for checkpoint in WEEKLY_CHECKPOINTS:
            week_num = checkpoint["week"]
            scheduled_at = now + timedelta(days=7 * week_num)
            await service.create(
                data={
                    "type": "weekly_checkpoint",
                    "title": checkpoint["title"],
                    "message": checkpoint["message"],
                    "is_read": False,
                    "related_id": data.diagnosis_id,
                    "related_type": "diagnosis",
                    "week_number": week_num,
                    "scheduled_at": scheduled_at,
                    "created_at": now,
                },
                user_id=current_user.id,
            )

        return {"success": True, "notifications_created": 5}
    except Exception as e:
        logger.error(f"Error creating report notifications: {e}")
        raise HTTPException(status_code=400, detail=str(e))