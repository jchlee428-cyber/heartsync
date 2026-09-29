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


# ── Kakao Alimtalk & Daily Routine Retention System ──

class AlimtalkSubscribeRequest(BaseModel):
    phone: str
    partner_name: Optional[str] = "파트너"
    preferred_time: Optional[str] = "20:00"
    diagnosis_id: Optional[str] = None
    latest_score: Optional[int] = 160


class AlimtalkSendTestRequest(BaseModel):
    phone: str
    template_type: str = "d1"  # "d1", "d7", "d30"
    partner_name: Optional[str] = "파트너"
    latest_score: Optional[int] = 160


GOTTMAN_DAILY_QUESTIONS = [
    {"day": 1, "topic": "소소한 기쁨", "question": "오늘 하루 중 당신을 가장 미소 짓게 했던 순간은 언제였어?", "tip": "가트맨의 '사랑의 지도(Love Map)' 업데이트"},
    {"day": 2, "topic": "스트레스 완화", "question": "요즘 당신을 가장 지치게 하거나 신경 쓰이게 하는 일은 뭐야?", "tip": "해결책 대신 따뜻한 경청과 공감 먼저"},
    {"day": 3, "topic": "감사 표현", "question": "최근 내가 했던 사소한 말이나 행동 중에 고마웠던 게 있다면?", "tip": "감정 은행 계좌에 사랑 입금하기"},
    {"day": 4, "topic": "설렘 소환", "question": "우리가 연애 초반에 함께 갔던 곳 중 다시 가고 싶은 장소는?", "tip": "존중과 애정(Fondness & Admiration) 활성화"},
    {"day": 5, "topic": "주말 힐링", "question": "이번 주말에 둘이서 꼭 해보고 싶은 단 하나의 소소한 힐링은?", "tip": "의도적 친밀감(Intentional Intimacy) 시간 확보"},
    {"day": 6, "topic": "인생의 꿈", "question": "올해 안에 당신이 개인적으로 꼭 성취하고 싶은 작은 목표가 있어?", "tip": "상대방의 내면 꿈 지지하기"},
    {"day": 7, "topic": "관계 점검", "question": "요즘 우리 사이에서 '이 부분은 참 든든하다'고 느끼는 게 있어?", "tip": "관계의 안전 기지(Secure Base) 확인"},
]


@router.post("/subscribe-alimtalk")
async def subscribe_alimtalk(
    data: AlimtalkSubscribeRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Subscribe user to Kakao Alimtalk Daily Routine (D+1, D+7, D+30).
    Schedules routine notifications and registers Alimtalk dispatch queue.
    """
    try:
        service = NotificationsService(db)
        now = datetime.now()
        partner = data.partner_name or "파트너"
        score = data.latest_score or 160

        # D+1: 퇴근길 대화 질문 알림
        d1_time = now + timedelta(days=1)
        await service.create(
            data={
                "type": "alimtalk_routine_d1",
                "title": "💌 [퇴근길 대화 질문] 파트너에게 건네는 1가지 질문",
                "message": f"오늘 퇴근길, {partner}님에게 건네면 좋은 1가지 질문: '오늘 하루 중 당신을 가장 미소 짓게 했던 순간은 언제였어?' (가트맨 사랑의 지도 질문)",
                "is_read": False,
                "related_id": data.diagnosis_id or "d1",
                "related_type": "alimtalk",
                "scheduled_at": d1_time,
                "created_at": now,
            },
            user_id=current_user.id,
        )

        # D+7: 주간 갈등 지수 점검 & 3분 미니 재진단 알림
        d7_time = now + timedelta(days=7)
        await service.create(
            data={
                "type": "alimtalk_routine_d7",
                "title": "📈 [D+7 체크] 지난주 갈등 지수 변화 확인",
                "message": f"지난주 진단 점수 {score}점이었던 두 분, 이번 주 변화를 체크해보세요 (3분 미니 진단 링크가 준비되었습니다).",
                "is_read": False,
                "related_id": data.diagnosis_id or "d7",
                "related_type": "alimtalk",
                "scheduled_at": d7_time,
                "created_at": now,
            },
            user_id=current_user.id,
        )

        # D+30: 한 달 차 재진단 & 30일 올케어(49,000원) 업셀링 알림
        d30_time = now + timedelta(days=30)
        await service.create(
            data={
                "type": "alimtalk_routine_d30",
                "title": "👑 [D+30 리포트] 한 달 기념 시계열 변화 분석",
                "message": "진단 한 달 차! 우리 커플의 갈등 지수는 지난달 대비 얼마나 개선되었을까요? '30일 올케어 패스(49,000원)'로 전문 시계열 그래프와 AI 집중 코칭을 시작해보세요.",
                "is_read": False,
                "related_id": data.diagnosis_id or "d30",
                "related_type": "alimtalk",
                "scheduled_at": d30_time,
                "created_at": now,
            },
            user_id=current_user.id,
        )

        logger.info(f"Kakao Alimtalk routine scheduled for user={current_user.id}, phone={data.phone}")
        return {
            "success": True,
            "message": "카카오 알림톡 데일리 루틴(D+1, D+7, D+30)이 성공적으로 등록되었습니다!",
            "phone": data.phone,
            "scheduled_count": 3,
        }
    except Exception as e:
        logger.error(f"Error subscribing alimtalk: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/send-alimtalk")
async def send_alimtalk_test(
    data: AlimtalkSendTestRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dispatch or simulate Bizppurio / Aligo Kakao Alimtalk message.
    Compatible with Kakao Bizmessage template specifications.
    """
    partner = data.partner_name or "파트너"
    score = data.latest_score or 160

    templates = {
        "d1": {
            "template_code": "HEARTSYNC_ROUTINE_D1",
            "title": "💌 [HeartSync] 오늘의 퇴근길 1가지 질문",
            "content": f"[HeartSync 데일리 루틴]\n\n오늘 퇴근길, {partner}님에게 건네면 좋은 1가지 질문이 도착했습니다.\n\n💬 \"오늘 하루 중 당신을 가장 미소 짓게 했던 순간은 언제였어?\"\n\n💡 존 가트맨 박사의 '사랑의 지도(Love Map)' 업데이트 팁: 작은 호기심이 관계의 친밀감을 3배 높여줍니다.",
            "button_name": "오늘의 질문 확인하기",
            "button_url": "https://heartsync.co.kr/my",
        },
        "d7": {
            "template_code": "HEARTSYNC_ROUTINE_D7",
            "title": "📈 [HeartSync] D+7 관계 변화 체크 타임",
            "content": f"[HeartSync 주간 리포트]\n\n지난주 관계 진단(종합 {score}점) 이후 7일이 흘렀습니다.\n\n이번 주 두 분의 갈등 지수와 소통 패턴에 어떤 변화가 있었을까요?\n\n⏱️ 3분 미니 체크인으로 관계의 긍정적 변화를 기록해보세요!",
            "button_name": "3분 미니 진단 시작",
            "button_url": "https://heartsync.co.kr/diagnosis?type=mini",
        },
        "d30": {
            "template_code": "HEARTSYNC_ROUTINE_D30",
            "title": "👑 [HeartSync] 30일 기념 관계 성장 리포트",
            "content": f"[HeartSync 월간 성장 리포트]\n\n첫 진단 후 어느덧 30일이 지났습니다! 🎉\n\n두 사람의 갈등 지수는 지난달 대비 얼마나 개선되었을까요?\n\n'30일 관계 개선 올케어 패스(49,000원)'로 전문 시계열 그래프와 AI 1:1 심층 코칭을 무제한으로 누려보세요.",
            "button_name": "30일 올케어 패스 확인",
            "button_url": "https://heartsync.co.kr/pricing",
        },
    }

    selected_tmpl = templates.get(data.template_type, templates["d1"])

    # Log Bizppurio/Aligo compatible dispatch payload
    biz_payload = {
        "service": "KakaoBizMessage",
        "provider": "Bizppurio/Aligo",
        "recipient_phone": data.phone,
        "template_id": selected_tmpl["template_code"],
        "message": selected_tmpl["content"],
        "buttons": [
            {
                "name": selected_tmpl["button_name"],
                "type": "WL",
                "url_mobile": selected_tmpl["button_url"],
                "url_pc": selected_tmpl["button_url"],
            }
        ],
        "dispatched_at": datetime.now().isoformat(),
    }
    logger.info(f"Kakao Alimtalk dispatched: {biz_payload}")

    return {
        "success": True,
        "message": "카카오 알림톡이 정상적으로 발송(시뮬레이션)되었습니다.",
        "payload": biz_payload,
        "preview": selected_tmpl,
    }


@router.get("/daily-routine")
async def get_daily_routine(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Get today's conversation question and daily routine questions pool.
    """
    today_index = datetime.now().day % len(GOTTMAN_DAILY_QUESTIONS)
    today_question = GOTTMAN_DAILY_QUESTIONS[today_index]

    return {
        "today_question": today_question,
        "all_questions": GOTTMAN_DAILY_QUESTIONS,
        "total_count": len(GOTTMAN_DAILY_QUESTIONS),
    }