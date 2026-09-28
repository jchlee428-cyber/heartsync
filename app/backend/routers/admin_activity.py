import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_admin_user
from models.auth import User
from models.diagnoses import Diagnoses
from models.orders import Orders
from models.chat_sessions import Chat_sessions
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/activity", tags=["admin-activity"])


class ActivityLogItem(BaseModel):
    id: str
    type: str  # login, diagnosis, payment, chat
    title: str
    description: str
    created_at: Optional[str] = None
    metadata: Optional[dict] = None


class UserActivityResponse(BaseModel):
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    user_role: str
    user_created_at: Optional[str] = None
    activities: List[ActivityLogItem]
    total: int
    stats: dict


@router.get("/{user_id}", response_model=UserActivityResponse)
async def get_user_activity(
    user_id: str,
    activity_type: str = Query(None, description="Filter by type: login, diagnosis, payment, chat"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity logs for a specific user (admin only)."""
    # Get user info
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    activities: List[ActivityLogItem] = []

    # 1. Login history (from user record)
    if not activity_type or activity_type == "login":
        if user.last_login:
            activities.append(
                ActivityLogItem(
                    id=f"login-last",
                    type="login",
                    title="최근 로그인",
                    description=f"마지막 로그인 시간",
                    created_at=user.last_login.isoformat() if user.last_login else None,
                    metadata={"email": user.email},
                )
            )
        if user.created_at:
            activities.append(
                ActivityLogItem(
                    id=f"login-signup",
                    type="login",
                    title="회원가입",
                    description=f"계정 생성됨 ({user.email})",
                    created_at=user.created_at.isoformat() if user.created_at else None,
                    metadata={"email": user.email},
                )
            )

    # 2. Diagnosis history
    if not activity_type or activity_type == "diagnosis":
        diag_result = await db.execute(
            select(Diagnoses)
            .where(Diagnoses.user_id == user_id)
            .order_by(desc(Diagnoses.created_at))
        )
        diagnoses = diag_result.scalars().all()
        for d in diagnoses:
            score_text = f"총점: {d.total_score}점" if d.total_score is not None else "점수 미산출"
            has_report = "AI 리포트 생성됨" if d.ai_report else "리포트 없음"
            activities.append(
                ActivityLogItem(
                    id=f"diagnosis-{d.id}",
                    type="diagnosis",
                    title=f"관계 진단 #{d.id}",
                    description=f"{score_text} | {has_report}",
                    created_at=d.created_at.isoformat() if d.created_at else None,
                    metadata={
                        "diagnosis_id": d.id,
                        "total_score": d.total_score,
                        "has_report": bool(d.ai_report),
                    },
                )
            )

    # 3. Payment/Order history
    if not activity_type or activity_type == "payment":
        order_result = await db.execute(
            select(Orders)
            .where(Orders.user_id == user_id)
            .order_by(desc(Orders.created_at))
        )
        orders = order_result.scalars().all()
        for o in orders:
            amount_text = f"{o.amount:,}원" if o.amount else "금액 미정"
            status_map = {
                "completed": "결제 완료",
                "pending": "결제 대기",
                "failed": "결제 실패",
                "cancelled": "결제 취소",
                "DONE": "결제 완료",
            }
            status_text = status_map.get(o.status or "", o.status or "알 수 없음")
            activities.append(
                ActivityLogItem(
                    id=f"payment-{o.id}",
                    type="payment",
                    title=f"결제: {o.plan_name or o.plan_type}",
                    description=f"{amount_text} | {status_text}",
                    created_at=o.created_at.isoformat() if o.created_at else None,
                    metadata={
                        "order_id": o.id,
                        "plan_type": o.plan_type,
                        "plan_name": o.plan_name,
                        "amount": o.amount,
                        "status": o.status,
                        "toss_order_id": o.toss_order_id,
                    },
                )
            )

    # 4. Chat session history
    if not activity_type or activity_type == "chat":
        chat_result = await db.execute(
            select(Chat_sessions)
            .where(Chat_sessions.user_id == user_id)
            .order_by(desc(Chat_sessions.created_at))
        )
        chats = chat_result.scalars().all()
        for c in chats:
            msg_count = c.message_count or 0
            preview = c.last_message_preview or ""
            if len(preview) > 50:
                preview = preview[:50] + "..."
            activities.append(
                ActivityLogItem(
                    id=f"chat-{c.id}",
                    type="chat",
                    title=c.title or f"채팅 세션 #{c.id}",
                    description=f"메시지 {msg_count}개{' | ' + preview if preview else ''}",
                    created_at=c.created_at.isoformat() if c.created_at else None,
                    metadata={
                        "session_id": c.id,
                        "message_count": msg_count,
                        "diagnosis_id": c.diagnosis_id,
                    },
                )
            )

    # Sort all activities by created_at descending
    activities.sort(
        key=lambda a: a.created_at or "1970-01-01T00:00:00",
        reverse=True,
    )

    total = len(activities)

    # Compute stats
    diag_count_result = await db.execute(
        select(func.count()).select_from(Diagnoses).where(Diagnoses.user_id == user_id)
    )
    diag_count = diag_count_result.scalar() or 0

    order_count_result = await db.execute(
        select(func.count()).select_from(Orders).where(Orders.user_id == user_id)
    )
    order_count = order_count_result.scalar() or 0

    chat_count_result = await db.execute(
        select(func.count()).select_from(Chat_sessions).where(Chat_sessions.user_id == user_id)
    )
    chat_count = chat_count_result.scalar() or 0

    total_spent_result = await db.execute(
        select(func.sum(Orders.amount)).where(
            Orders.user_id == user_id,
            or_(Orders.status == "completed", Orders.status == "DONE"),
        )
    )
    total_spent = total_spent_result.scalar() or 0

    stats = {
        "diagnosis_count": diag_count,
        "order_count": order_count,
        "chat_count": chat_count,
        "total_spent": total_spent,
    }

    # Apply pagination
    paginated = activities[skip : skip + limit]

    return UserActivityResponse(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        user_role=user.role or "user",
        user_created_at=user.created_at.isoformat() if user.created_at else None,
        activities=paginated,
        total=total,
        stats=stats,
    )