"""Toss Payments integration service.

Handles payment confirmation and status retrieval via Toss Payments REST API.
API Docs: https://docs.tosspayments.com/reference
"""

import base64
import logging
import os
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

TOSS_API_BASE = "https://api.tosspayments.com/v1"

# Public test keys (safe to use for development/testing)
TOSS_TEST_SECRET_KEY = "test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R"
TOSS_TEST_CLIENT_KEY = "test_ck_D5GePWvyJnrK0W0k6q8gmeYBlNkw"


class TossPaymentError(Exception):
    """Exception raised for errors in the Toss Payments process."""

    def __init__(
        self,
        message: str,
        error_code: str = "UNKNOWN",
        is_retryable: bool = False,
        original_error: Optional[Exception] = None,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.is_retryable = is_retryable
        self.original_error = original_error

    def __str__(self):
        return f"{super().__str__()} [Code: {self.error_code}]"


class PaymentConfirmRequest(BaseModel):
    """Request model for confirming a payment."""

    payment_key: str = Field(..., description="Toss payment key from redirect")
    order_id: str = Field(..., description="Order ID used when requesting payment")
    amount: int = Field(..., description="Payment amount in KRW")


class PaymentConfirmResponse(BaseModel):
    """Response model for payment confirmation."""

    payment_key: str
    order_id: str
    status: str  # DONE, CANCELED, etc.
    total_amount: int
    method: Optional[str] = None  # 카드, 가상계좌, 간편결제 등
    approved_at: Optional[str] = None
    receipt_url: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    """Response model for payment status retrieval."""

    payment_key: str
    order_id: str
    status: str
    total_amount: int
    method: Optional[str] = None
    approved_at: Optional[str] = None


def _get_secret_key() -> str:
    """Get Toss Payments secret key from environment or fallback to test key."""
    key = os.environ.get("TOSS_SECRET_KEY", "").strip()
    if not key:
        logger.warning("TOSS_SECRET_KEY not set, using test key")
        key = TOSS_TEST_SECRET_KEY
    return key


def _get_client_key() -> str:
    """Get Toss Payments client key from environment or fallback to test key."""
    key = os.environ.get("TOSS_CLIENT_KEY", "").strip()
    if not key:
        logger.warning("TOSS_CLIENT_KEY not set, using test key")
        key = TOSS_TEST_CLIENT_KEY
    return key


def _build_auth_header() -> Dict[str, str]:
    """Build Basic Auth header for Toss Payments API.

    Toss requires: Base64(secretKey + ":")
    """
    secret_key = _get_secret_key()
    credentials = base64.b64encode(f"{secret_key}:".encode()).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }


class TossPaymentService:
    """Payment service for Toss Payments integration."""

    async def confirm_payment(self, request: PaymentConfirmRequest) -> PaymentConfirmResponse:
        """Confirm a payment with Toss Payments API.

        This must be called from the server after the user completes payment on the frontend.
        Toss redirects to successUrl with paymentKey, orderId, amount parameters.
        The server then confirms the payment by calling this API.
        """
        try:
            headers = _build_auth_header()
            payload = {
                "paymentKey": request.payment_key,
                "orderId": request.order_id,
                "amount": request.amount,
            }

            logger.info(f"Confirming payment: orderId={request.order_id}, amount={request.amount}")

            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.post(
                    f"{TOSS_API_BASE}/payments/confirm",
                    json=payload,
                    headers=headers,
                )

            if response.status_code == 200:
                data = response.json()
                logger.info(f"Payment confirmed: {data.get('status')}")
                return PaymentConfirmResponse(
                    payment_key=data["paymentKey"],
                    order_id=data["orderId"],
                    status=data["status"],
                    total_amount=data["totalAmount"],
                    method=data.get("method"),
                    approved_at=data.get("approvedAt"),
                    receipt_url=data.get("receipt", {}).get("url") if data.get("receipt") else None,
                )
            else:
                error_data = response.json()
                error_code = error_data.get("code", "UNKNOWN")
                error_msg = error_data.get("message", "결제 승인에 실패했습니다")
                logger.error(f"Toss payment confirm failed: {error_code} - {error_msg}")
                raise TossPaymentError(
                    message=error_msg,
                    error_code=error_code,
                    is_retryable=error_code in ("PROVIDER_ERROR", "FAILED_INTERNAL_SYSTEM_PROCESSING"),
                )

        except TossPaymentError:
            raise
        except httpx.TimeoutException:
            raise TossPaymentError(
                message="결제 승인 요청 시간이 초과되었습니다. 다시 시도해주세요.",
                error_code="TIMEOUT",
                is_retryable=True,
            )
        except Exception as e:
            logger.error(f"Unexpected error confirming payment: {e}")
            raise TossPaymentError(
                message=f"결제 승인 중 오류가 발생했습니다: {str(e)}",
                error_code="UNEXPECTED",
                original_error=e,
            )

    async def get_payment_status(self, payment_key: str) -> PaymentStatusResponse:
        """Retrieve payment status from Toss Payments API."""
        try:
            headers = _build_auth_header()

            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.get(
                    f"{TOSS_API_BASE}/payments/{payment_key}",
                    headers=headers,
                )

            if response.status_code == 200:
                data = response.json()
                return PaymentStatusResponse(
                    payment_key=data["paymentKey"],
                    order_id=data["orderId"],
                    status=data["status"],
                    total_amount=data["totalAmount"],
                    method=data.get("method"),
                    approved_at=data.get("approvedAt"),
                )
            else:
                error_data = response.json()
                error_code = error_data.get("code", "UNKNOWN")
                error_msg = error_data.get("message", "결제 조회에 실패했습니다")
                raise TossPaymentError(
                    message=error_msg,
                    error_code=error_code,
                )

        except TossPaymentError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting payment status: {e}")
            raise TossPaymentError(
                message=f"결제 조회 중 오류가 발생했습니다: {str(e)}",
                error_code="UNEXPECTED",
                original_error=e,
            )


def get_toss_client_key() -> str:
    """Public helper to get client key for frontend configuration endpoint."""
    return _get_client_key()