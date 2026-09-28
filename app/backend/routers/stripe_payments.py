"""Stripe Payment router for international customers and subscriptions.

Flow:
1. Frontend calls /create_payment_session → Backend creates Stripe session, returns url
2. Frontend redirects to Stripe checkout
3. Stripe redirects to successUrl with session_id
4. Frontend calls /verify_payment → Backend verifies with Stripe → activates plan
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.stripe_payment import (
    StripePaymentError,
    StripePaymentService,
    is_stripe_configured,
)
from services.orders import OrdersService
from services.user_plans import User_plansService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stripe", tags=["stripe-payment"])

PLANS = {
    "single_analysis": {
        "name": "1회 정밀 분석 (Single Analysis)",
        "amount": 19900,
        "amount_usd": 1499,  # $14.99 USD
        "currency_kr": "krw",
        "currency_intl": "usd",
        "analyses": 1,
        "days": 30,
    },
    "monthly_subscription": {
        "name": "월 구독 (Monthly Subscription)",
        "amount": 29000,
        "amount_usd": 2199,  # $21.99 USD
        "currency_kr": "krw",
        "currency_intl": "usd",
        "analyses": 999,
        "days": 30,
    },
    "couple_premium": {
        "name": "커플 프리미엄 (Couple Premium)",
        "amount": 79000,
        "amount_usd": 5999,  # $59.99 USD
        "currency_kr": "krw",
        "currency_intl": "usd",
        "analyses": 999,
        "days": 90,
    },
}


# --- Request/Response Models ---


class StripeCreateSessionRequest(BaseModel):
    plan_type: str
    currency: str = "usd"  # usd or krw
    mode: str = "payment"  # payment or subscription


class StripeCreateSessionResponse(BaseModel):
    session_id: str
    url: str


class StripeVerifyRequest(BaseModel):
    session_id: str


class StripeVerifyResponse(BaseModel):
    status: str
    db_order_id: Optional[int] = None
    plan_type: Optional[str] = None
    payment_status: str = "unpaid"
    subscription_id: Optional[str] = None


class StripeStatusResponse(BaseModel):
    configured: bool
    message: str


# --- Endpoints ---


@router.get("/status", response_model=StripeStatusResponse)
async def check_stripe_status():
    """Check if Stripe is configured."""
    if is_stripe_configured():
        return StripeStatusResponse(
            configured=True,
            message="Stripe가 설정되어 있습니다. 해외 결제가 가능합니다.",
        )
    return StripeStatusResponse(
        configured=False,
        message="Stripe가 설정되지 않았습니다. 해외 결제를 사용하려면 STRIPE_SECRET_KEY를 설정해주세요.",
    )


@router.post("/create_payment_session", response_model=StripeCreateSessionResponse)
async def create_payment_session(
    data: StripeCreateSessionRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe checkout session for international payment or subscription."""
    if not is_stripe_configured():
        raise HTTPException(status_code=503, detail="Stripe가 설정되지 않았습니다")

    if data.plan_type not in PLANS:
        raise HTTPException(status_code=400, detail=f"잘못된 플랜 타입입니다: {data.plan_type}")

    plan = PLANS[data.plan_type]

    try:
        # Get frontend host
        frontend_host = request.headers.get("App-Host")
        if frontend_host and not frontend_host.startswith(("http://", "https://")):
            frontend_host = f"https://{frontend_host}"

        # Determine amount and currency
        if data.currency == "usd":
            amount = plan["amount_usd"]
            currency = "usd"
        else:
            amount = plan["amount"]
            currency = "krw"

        # Determine mode
        mode = "subscription" if data.mode == "subscription" and data.plan_type == "monthly_subscription" else "payment"

        now = datetime.now()
        stripe_order_id = f"HS-STRIPE-{data.plan_type}-{uuid.uuid4().hex[:12]}"

        # Create order in database
        orders_service = OrdersService(db)
        order = await orders_service.create(
            data={
                "plan_type": data.plan_type,
                "plan_name": plan["name"],
                "amount": amount,
                "currency": currency,
                "status": "pending",
                "toss_order_id": stripe_order_id,  # Reuse field for Stripe order tracking
                "created_at": now,
                "updated_at": now,
            },
            user_id=current_user.id,
        )

        # Create Stripe checkout session
        stripe_service = StripePaymentService()
        success_url = f"{frontend_host}/payment-success"
        cancel_url = f"{frontend_host}/pricing?payment=failed"

        session_response = await stripe_service.create_checkout_session(
            plan_type=data.plan_type,
            plan_name=plan["name"],
            amount=amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            order_id=order.id,
            user_id=current_user.id,
            mode=mode,
        )

        # Save session_id to order
        await orders_service.update(
            obj_id=order.id,
            update_data={
                "toss_payment_key": session_response.session_id,  # Reuse field for Stripe session
                "updated_at": datetime.now(),
            },
            user_id=current_user.id,
        )

        logger.info(f"Stripe session created: order_id={order.id}, session={session_response.session_id}")

        return StripeCreateSessionResponse(
            session_id=session_response.session_id,
            url=session_response.url,
        )

    except StripePaymentError as e:
        logger.error(f"Stripe payment error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating Stripe session: {e}")
        raise HTTPException(status_code=500, detail=f"결제 세션 생성 중 오류: {str(e)}")


@router.post("/verify_payment", response_model=StripeVerifyResponse)
async def verify_payment(
    data: StripeVerifyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify Stripe payment and activate user plan."""
    if not is_stripe_configured():
        raise HTTPException(status_code=503, detail="Stripe가 설정되지 않았습니다")

    try:
        # Verify with Stripe
        stripe_service = StripePaymentService()
        result = await stripe_service.verify_payment(data.session_id)

        order_id = result.get("order_id")
        if not order_id:
            raise HTTPException(status_code=400, detail="주문 정보를 찾을 수 없습니다")

        # Update order status
        orders_service = OrdersService(db)
        order = await orders_service.get(int(order_id))
        if not order:
            raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")

        now = datetime.now()
        new_status = result["status"]

        await orders_service.update(
            obj_id=order.id,
            update_data={
                "status": new_status,
                "updated_at": now,
            },
            user_id=current_user.id,
        )

        # If paid, activate user plan
        if new_status == "paid":
            plan_config = PLANS.get(order.plan_type, {})
            days = plan_config.get("days", 30)
            analyses = plan_config.get("analyses", 1)
            expires_at = now + timedelta(days=days)

            plans_service = User_plansService(db)
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

        return StripeVerifyResponse(
            status=new_status,
            db_order_id=order.id,
            plan_type=order.plan_type,
            payment_status=result.get("payment_status", "unpaid"),
            subscription_id=result.get("subscription_id"),
        )

    except HTTPException:
        raise
    except StripePaymentError as e:
        logger.error(f"Stripe verification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error verifying Stripe payment: {e}")
        raise HTTPException(status_code=500, detail=f"결제 확인 중 오류: {str(e)}")