"""Stripe Payments integration service.

Handles payment session creation and verification via Stripe API.
Used for international customers and subscription payments.
"""

import logging
import os
from typing import Optional

import stripe
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class StripePaymentError(Exception):
    """Exception raised for errors in the Stripe Payments process."""

    def __init__(self, message: str, error_code: str = "UNKNOWN"):
        super().__init__(message)
        self.error_code = error_code


class StripeSessionRequest(BaseModel):
    """Request model for creating a Stripe checkout session."""

    plan_type: str = Field(..., description="Plan type identifier")
    success_url: str = Field(..., description="URL to redirect on success")
    cancel_url: str = Field(..., description="URL to redirect on cancel")
    mode: str = Field(default="payment", description="payment or subscription")


class StripeSessionResponse(BaseModel):
    """Response model for Stripe checkout session creation."""

    session_id: str
    url: str


class StripeVerifyRequest(BaseModel):
    """Request model for verifying a Stripe payment."""

    session_id: str = Field(..., description="Stripe checkout session ID")


class StripeVerifyResponse(BaseModel):
    """Response model for Stripe payment verification."""

    status: str
    order_id: Optional[int] = None
    payment_status: str
    subscription_id: Optional[str] = None


def _get_stripe_key() -> str:
    """Get Stripe secret key from environment."""
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not key:
        logger.warning("STRIPE_SECRET_KEY not set")
    return key


def is_stripe_configured() -> bool:
    """Check if Stripe is configured."""
    return bool(os.environ.get("STRIPE_SECRET_KEY", "").strip())


class StripePaymentService:
    """Payment service for Stripe integration."""

    def __init__(self):
        stripe.api_key = _get_stripe_key()

    async def create_checkout_session(
        self,
        plan_type: str,
        plan_name: str,
        amount: int,
        currency: str,
        success_url: str,
        cancel_url: str,
        order_id: int,
        user_id: str,
        mode: str = "payment",
    ) -> StripeSessionResponse:
        """Create a Stripe checkout session."""
        try:
            # Convert KRW amount (Stripe uses smallest currency unit)
            # KRW doesn't have decimal places, so amount is used as-is
            line_items = [
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {
                            "name": plan_name,
                            "description": f"HeartSync - {plan_name}",
                        },
                        "unit_amount": amount,
                    },
                    "quantity": 1,
                }
            ]

            # For subscription mode, add recurring
            if mode == "subscription":
                line_items[0]["price_data"]["recurring"] = {"interval": "month"}

            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode=mode,
                success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}&provider=stripe",
                cancel_url=cancel_url,
                metadata={
                    "order_id": str(order_id),
                    "user_id": user_id,
                    "plan_type": plan_type,
                },
            )

            return StripeSessionResponse(
                session_id=session.id,
                url=session.url,
            )

        except stripe.error.StripeError as e:
            logger.error(f"Stripe session creation error: {e}")
            raise StripePaymentError(
                message=f"Stripe 결제 세션 생성 실패: {str(e)}",
                error_code=getattr(e, "code", "STRIPE_ERROR"),
            )
        except Exception as e:
            logger.error(f"Unexpected error creating Stripe session: {e}")
            raise StripePaymentError(
                message=f"결제 세션 생성 중 오류: {str(e)}",
                error_code="UNEXPECTED",
            )

    async def verify_payment(self, session_id: str) -> dict:
        """Verify a Stripe payment session."""
        try:
            session = stripe.checkout.Session.retrieve(session_id)

            status_mapping = {
                "complete": "paid",
                "open": "pending",
                "expired": "cancelled",
            }

            return {
                "status": status_mapping.get(session.status, "pending"),
                "order_id": session.metadata.get("order_id"),
                "payment_status": session.payment_status or "unpaid",
                "subscription_id": session.subscription if session.mode == "subscription" else None,
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe verification error: {e}")
            raise StripePaymentError(
                message=f"Stripe 결제 확인 실패: {str(e)}",
                error_code=getattr(e, "code", "STRIPE_ERROR"),
            )
        except Exception as e:
            logger.error(f"Unexpected error verifying Stripe payment: {e}")
            raise StripePaymentError(
                message=f"결제 확인 중 오류: {str(e)}",
                error_code="UNEXPECTED",
            )