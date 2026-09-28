from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str  # Now a string UUID (platform sub)
    email: str
    name: Optional[str] = None
    role: str = "user"  # user/admin
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlatformTokenExchangeRequest(BaseModel):
    """Request body for exchanging Platform token for app token."""

    platform_token: str


class TokenExchangeResponse(BaseModel):
    """Response body for issued application token."""

    token: str


class SocialLoginRequest(BaseModel):
    """Request body for social login (Kakao, Naver, Google, Email, Demo)."""

    provider: str  # "kakao" | "naver" | "google" | "email" | "demo"
    email: Optional[str] = None
    name: Optional[str] = None
    provider_id: Optional[str] = None


class SocialLoginResponse(BaseModel):
    """Response body for social login."""

    token: str
    token_type: str = "Bearer"
    expires_at: int
    user: UserResponse
