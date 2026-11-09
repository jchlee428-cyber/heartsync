"""Payment router for Toss Payments integration.

Flow:
1. Frontend calls /prepare_order → Backend creates order, returns orderId + clientKey
2. Frontend uses Toss SDK to request payment with orderId
3. Toss redirects to successUrl with paymentKey, orderId, amount
4. Frontend calls /confirm_payment → Backend confirms with Toss API → activates plan
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.payment import (
    PaymentConfirmRequest,
    PaymentConfirmResponse,
    TossPaymentError,
    TossPaymentService,
    get_toss_client_key,
)
from services.orders import OrdersService
from services.user_plans import User_plansService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payment", tags=["payment"])

PLANS = {
    "single_analysis": {
        "name": "개인 정밀 분석 (1회권)",
        "amount": 19900,
        "currency": "krw",
        "analyses": 1,
        "days": 30,
        "tier": 1,
    },
    "couple_dual": {
        "name": "커플 듀얼 매칭 패키지 (2인)",
        "amount": 29000,
        "currency": "krw",
        "analyses": 2,
        "days": 60,
        "tier": 2,
    },
    "monthly_subscription": {
        "name": "커플 듀얼 매칭 패키지 (2인)",
        "amount": 29000,
        "currency": "krw",
        "analyses": 2,
        "days": 60,
        "tier": 2,
    },
    "all_care_pass": {
        "name": "30일 관계 개선 올케어 패스",
        "amount": 49000,
        "currency": "krw",
        "analyses": 999,
        "days": 30,
        "tier": 3,
    },
    "couple_premium": {
        "name": "30일 관계 개선 올케어 패스",
        "amount": 49000,
        "currency": "krw",
        "analyses": 999,
        "days": 30,
        "tier": 3,
    },
}

PLAN_TIER_BASE_AMOUNT = {
    1: 19900,
    2: 29000,
    3: 49000,
}


async def _get_user_active_tier(
    db: AsyncSession,
    user_id: str,
    client_previous_plan: Optional[str] = None,
) -> int:
    """Return the user's current highest active plan tier (0 if none/free)."""
    highest_tier = 0
    if client_previous_plan and client_previous_plan in PLANS:
        highest_tier = max(highest_tier, PLANS[client_previous_plan]["tier"])

    try:
        plans_service = User_plansService(db)
        result = await plans_service.get_list(
            user_id=user_id,
            query_dict={"is_active": True},
            sort="-created_at",
            limit=10,
        )
        now = datetime.now()
        for item in result.get("items", []):
            if item.expires_at and item.expires_at < now:
                continue
            p_cfg = PLANS.get(item.plan_type)
            if p_cfg:
                highest_tier = max(highest_tier, p_cfg["tier"])
    except Exception as e:
        logger.warning(f"Failed to query active tier for user {user_id}: {e}")

    return highest_tier


def _compute_order_pricing(plan_type: str, active_tier: int) -> tuple[int, str, int]:
    """Compute (final_amount, order_name, credit_amount) considering differential upgrade."""
    plan = PLANS[plan_type]
    target_tier = plan["tier"]
    base_amount = plan["amount"]

    if active_tier > 0 and target_tier > active_tier:
        credit = PLAN_TIER_BASE_AMOUNT.get(active_tier, 0)
        final_amount = max(0, base_amount - credit)
        order_name = f"[업그레이드] {plan['name']} (차액 결제)"
        return final_amount, order_name, credit

    return base_amount, plan["name"], 0


# --- Request/Response Models ---


class PrepareOrderRequest(BaseModel):
    plan_type: str
    diagnosis_id: Optional[str] = None
    previous_plan_type: Optional[str] = None


class PrepareOrderResponse(BaseModel):
    order_id: str
    order_name: str
    amount: int
    original_amount: Optional[int] = None
    upgrade_credit: Optional[int] = 0
    is_upgrade: Optional[bool] = False
    client_key: str
    customer_email: Optional[str] = None


class ConfirmPaymentRequest(BaseModel):
    payment_key: str
    order_id: str
    amount: int


class SimulatePaymentRequest(BaseModel):
    plan_type: str = "single_analysis"
    diagnosis_id: Optional[str] = None
    previous_plan_type: Optional[str] = None
    payment_method: Optional[str] = "가상 테스트 결제 (시뮬레이션)"


class ConfirmPaymentResponse(BaseModel):
    status: str
    db_order_id: Optional[int] = None
    plan_type: Optional[str] = None
    payment_method: Optional[str] = None
    receipt_url: Optional[str] = None
    diagnosis_id: Optional[str] = None


class UserPlanResponse(BaseModel):
    plan_type: str
    plan_name: str
    analyses_remaining: int
    is_active: bool
    expires_at: Optional[str] = None


class TossStatusResponse(BaseModel):
    key_configured: bool
    client_key: Optional[str] = None
    message: str


# --- Endpoints ---


@router.get("/toss-status", response_model=TossStatusResponse)
async def check_toss_status():
    """Check if Toss Payments keys are configured (no auth required for debugging)."""
    import os

    secret_key = os.environ.get("TOSS_SECRET_KEY", "").strip()
    client_key = get_toss_client_key()

    if secret_key:
        return TossStatusResponse(
            key_configured=True,
            client_key=client_key,
            message="토스페이먼츠 API 키가 설정되어 있습니다",
        )
    return TossStatusResponse(
        key_configured=False,
        client_key=client_key,
        message="토스페이먼츠 테스트 키를 사용 중입니다. 실제 결제를 위해 TOSS_SECRET_KEY를 설정해주세요.",
    )


@router.post("/prepare_order", response_model=PrepareOrderResponse)
async def prepare_order(
    data: PrepareOrderRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create an order and return info needed for Toss Payments SDK on frontend.

    The frontend will use the returned orderId, amount, orderName, and clientKey
    to call tossPayments.requestPayment().
    """
    if data.plan_type not in PLANS:
        raise HTTPException(status_code=400, detail=f"잘못된 플랜 타입입니다: {data.plan_type}")

    plan = PLANS[data.plan_type]
    target_tier = plan["tier"]
    active_tier = await _get_user_active_tier(db, current_user.id, data.previous_plan_type)

    if active_tier >= target_tier and active_tier > 0:
        raise HTTPException(
            status_code=400,
            detail="이미 동일하거나 더 높은 등급의 플랜을 이용 중입니다.",
        )

    final_amount, order_name, credit_amount = _compute_order_pricing(data.plan_type, active_tier)

    try:
        now = datetime.now()
        # Generate a unique order ID for Toss (must be unique per payment attempt)
        toss_order_id = f"HS-{data.plan_type}-{uuid.uuid4().hex[:12]}"

        orders_service = OrdersService(db)
        order = await orders_service.create(
            data={
                "plan_type": data.plan_type,
                "plan_name": order_name,
                "amount": final_amount,
                "currency": plan["currency"],
                "status": "pending",
                "toss_order_id": toss_order_id,
                "created_at": now,
                "updated_at": now,
            },
            user_id=current_user.id,
        )

        # Store diagnosis_id in localStorage on frontend side (already done)
        logger.info(
            f"Order prepared: db_id={order.id}, toss_order_id={toss_order_id}, amount={final_amount}, credit={credit_amount}"
        )

        return PrepareOrderResponse(
            order_id=toss_order_id,
            order_name=order_name,
            amount=final_amount,
            original_amount=plan["amount"],
            upgrade_credit=credit_amount,
            is_upgrade=credit_amount > 0,
            client_key=get_toss_client_key(),
            customer_email=getattr(current_user, "email", None),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order preparation error: {e}")
        raise HTTPException(status_code=400, detail=f"주문 생성 중 오류가 발생했습니다: {str(e)}")


@router.post("/confirm_payment", response_model=ConfirmPaymentResponse)
async def confirm_payment(
    data: ConfirmPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm payment with Toss Payments API and activate user plan.

    Called by frontend after Toss redirects to successUrl with paymentKey, orderId, amount.
    """
    try:
        # 1. Find the order by toss_order_id
        orders_service = OrdersService(db)
        order = await orders_service.get_by_field("toss_order_id", data.order_id)

        if not order:
            raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")

        # 2. Verify amount matches
        if order.amount != data.amount:
            logger.error(f"Amount mismatch: order={order.amount}, request={data.amount}")
            raise HTTPException(status_code=400, detail="결제 금액이 일치하지 않습니다")

        # 3. Confirm payment (handle simulated test payment vs Toss API)
        is_simulated = (
            data.payment_key.startswith("sim_")
            or data.order_id.startswith("TEST-SIM-")
            or data.order_id.startswith("SIM-")
        )

        if is_simulated:
            logger.info(f"Processing simulated test payment: order_id={data.order_id}")
            result = PaymentConfirmResponse(
                payment_key=data.payment_key,
                order_id=data.order_id,
                status="DONE",
                total_amount=data.amount,
                method="가상 테스트 결제 (시뮬레이션)",
                approved_at=datetime.now().isoformat(),
                receipt_url="/payment-history",
            )
        else:
            payment_service = TossPaymentService()
            confirm_request = PaymentConfirmRequest(
                payment_key=data.payment_key,
                order_id=data.order_id,
                amount=data.amount,
            )
            result = await payment_service.confirm_payment(confirm_request)

        # 4. Update order status
        now = datetime.now()
        new_status = "paid" if result.status == "DONE" else "failed"

        await orders_service.update(
            obj_id=order.id,
            update_data={
                "status": new_status,
                "toss_payment_key": data.payment_key,
                "updated_at": now,
            },
            user_id=current_user.id,
        )

        # 5. If paid, deactivate previous lower-tier plans and activate new user plan
        diagnosis_id = None
        if new_status == "paid":
            plan_config = PLANS.get(order.plan_type, {})
            days = plan_config.get("days", 30)
            analyses = plan_config.get("analyses", 1)
            expires_at = now + timedelta(days=days)

            plans_service = User_plansService(db)
            try:
                existing_active = await plans_service.get_list(
                    user_id=current_user.id,
                    query_dict={"is_active": True},
                    sort="-created_at",
                    limit=20,
                )
                for prev_plan in existing_active.get("items", []):
                    await plans_service.update(
                        obj_id=prev_plan.id,
                        update_data={"is_active": False, "updated_at": now},
                        user_id=current_user.id,
                    )
            except Exception as deact_err:
                logger.warning(f"Failed to deactivate previous plans: {deact_err}")

            await plans_service.create(
                data={
                    "plan_type": order.plan_type,
                    "analyses_remaining": analyses,
                    "expires_at": expires_at,
                    "is_active": True,
                    "order_id": order.id,
                    "created_at": now,
                    "updated_at": now,
                },
                user_id=current_user.id,
            )

        return ConfirmPaymentResponse(
            status=new_status,
            db_order_id=order.id,
            plan_type=order.plan_type,
            payment_method=result.method,
            receipt_url=result.receipt_url,
            diagnosis_id=diagnosis_id,
        )

    except HTTPException:
        raise
    except TossPaymentError as e:
        logger.error(f"Toss payment confirmation error: {e}")
        raise HTTPException(status_code=400, detail=f"결제 승인 실패: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected payment confirmation error: {e}")
        raise HTTPException(status_code=400, detail=f"결제 확인 중 오류가 발생했습니다: {str(e)}")


@router.post("/simulate_payment", response_model=ConfirmPaymentResponse)
async def simulate_payment(
    data: SimulatePaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Simulate a test payment for demonstration / review testing without charging real money.
    
    Creates a paid order and activates the requested plan immediately.
    """
    try:
        plan_type = data.plan_type
        if plan_type not in PLANS:
            plan_type = "single_analysis"

        plan = PLANS[plan_type]
        target_tier = plan["tier"]
        active_tier = await _get_user_active_tier(db, current_user.id, data.previous_plan_type)

        if active_tier >= target_tier and active_tier > 0:
            raise HTTPException(
                status_code=400,
                detail="이미 동일하거나 더 높은 등급의 플랜을 이용 중입니다.",
            )

        final_amount, order_name, _credit_amount = _compute_order_pricing(plan_type, active_tier)

        now = datetime.now()
        sim_order_id = f"SIM-{plan_type}-{uuid.uuid4().hex[:10]}"
        sim_payment_key = f"sim_pk_{uuid.uuid4().hex[:16]}"

        orders_service = OrdersService(db)
        order = await orders_service.create(
            data={
                "plan_type": plan_type,
                "plan_name": order_name,
                "amount": final_amount,
                "currency": plan["currency"],
                "status": "paid",
                "toss_order_id": sim_order_id,
                "toss_payment_key": sim_payment_key,
                "created_at": now,
                "updated_at": now,
            },
            user_id=current_user.id,
        )

        # Deactivate previous plans & activate new plan
        days = plan.get("days", 30)
        analyses = plan.get("analyses", 1)
        expires_at = now + timedelta(days=days)

        plans_service = User_plansService(db)
        try:
            existing_active = await plans_service.get_list(
                user_id=current_user.id,
                query_dict={"is_active": True},
                sort="-created_at",
                limit=20,
            )
            for prev_plan in existing_active.get("items", []):
                await plans_service.update(
                    obj_id=prev_plan.id,
                    update_data={"is_active": False, "updated_at": now},
                    user_id=current_user.id,
                )
        except Exception as deact_err:
            logger.warning(f"Failed to deactivate previous plans: {deact_err}")

        await plans_service.create(
            data={
                "plan_type": plan_type,
                "analyses_remaining": analyses,
                "expires_at": expires_at,
                "is_active": True,
                "order_id": order.id,
                "created_at": now,
                "updated_at": now,
            },
            user_id=current_user.id,
        )

        logger.info(f"Simulated payment success: user={current_user.id}, plan={plan_type}, order={order.id}")

        return ConfirmPaymentResponse(
            status="paid",
            db_order_id=order.id,
            plan_type=plan_type,
            payment_method=data.payment_method or "가상 테스트 결제 (시뮬레이션)",
            receipt_url="/payment-history",
            diagnosis_id=data.diagnosis_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Simulated payment error: {e}")
        raise HTTPException(status_code=400, detail=f"가상 결제 처리 중 오류가 발생했습니다: {str(e)}")


@router.get("/my-plan", response_model=UserPlanResponse)
async def get_my_plan(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's active plan."""
    try:
        plans_service = User_plansService(db)
        result = await plans_service.get_list(
            user_id=current_user.id,
            query_dict={"is_active": True},
            sort="-created_at",
            limit=1,
        )

        items = result.get("items", [])
        if items:
            plan = items[0]
            plan_config = PLANS.get(plan.plan_type, {})
            # Check if expired
            if plan.expires_at and plan.expires_at < datetime.now():
                await plans_service.update(
                    obj_id=plan.id,
                    update_data={"is_active": False, "updated_at": datetime.now()},
                    user_id=current_user.id,
                )
                return UserPlanResponse(
                    plan_type="free",
                    plan_name="무료 체험",
                    analyses_remaining=0,
                    is_active=False,
                )

            return UserPlanResponse(
                plan_type=plan.plan_type,
                plan_name=plan_config.get("name", plan.plan_type),
                analyses_remaining=plan.analyses_remaining or 0,
                is_active=True,
                expires_at=plan.expires_at.strftime("%Y-%m-%d") if plan.expires_at else None,
            )

        return UserPlanResponse(
            plan_type="free",
            plan_name="무료 체험",
            analyses_remaining=0,
            is_active=False,
        )

    except Exception as e:
        logger.error(f"Error fetching user plan: {e}")
        return UserPlanResponse(
            plan_type="free",
            plan_name="무료 체험",
            analyses_remaining=0,
            is_active=False,
        )