import hashlib
import logging
import os
import uuid
from typing import Optional
from urllib.parse import urlencode

import httpx
from core.auth import (
    IDTokenValidationError,
    build_authorization_url,
    build_logout_url,
    generate_code_challenge,
    generate_code_verifier,
    generate_nonce,
    generate_state,
    validate_id_token,
)
from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from models.auth import User
from schemas.auth import (
    PlatformTokenExchangeRequest,
    SocialLoginRequest,
    SocialLoginResponse,
    TokenExchangeResponse,
    UserResponse,
)
from services.auth import AuthService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


def _local_patch(url: str) -> str:
    """Patch URL for local development."""
    if os.getenv("LOCAL_PATCH", "").lower() not in ("true", "1"):
        return url

    patched_url = url.replace("https://", "http://").replace(":8000", ":3000")
    logger.debug("[get_dynamic_backend_url] patching URL from %s to %s", url, patched_url)
    return patched_url


def get_dynamic_backend_url(request: Request) -> str:
    """Get backend URL dynamically from request headers.

    Priority: mgx-external-domain > x-forwarded-host > host > settings.backend_url
    """
    mgx_external_domain = request.headers.get("mgx-external-domain")
    x_forwarded_host = request.headers.get("x-forwarded-host")
    host = request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto", "https")

    effective_host = mgx_external_domain or x_forwarded_host or host
    if not effective_host:
        logger.warning("[get_dynamic_backend_url] No host found, fallback to %s", settings.backend_url)
        return settings.backend_url

    dynamic_url = _local_patch(f"{scheme}://{effective_host}")
    logger.debug(
        "[get_dynamic_backend_url] mgx-external-domain=%s, x-forwarded-host=%s, host=%s, scheme=%s, dynamic_url=%s",
        mgx_external_domain,
        x_forwarded_host,
        host,
        scheme,
        dynamic_url,
    )
    return dynamic_url


def derive_name_from_email(email: str) -> str:
    return email.split("@", 1)[0] if email else ""


@router.get("/login")
async def login(request: Request, from_url: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Start OIDC login flow or bypass in development mode."""
    backend_url = get_dynamic_backend_url(request)
    
    is_dev = os.getenv("ENVIRONMENT", "prod").lower() == "dev"
    if is_dev:
        logger.info("[login] Dev mode detected, bypassing OIDC with mock user")
        auth_service = AuthService(db)
        
        mock_sub = "mock_local_user_123"
        mock_email = "test@example.com"
        mock_name = "테스트 유저"
        user = await auth_service.get_or_create_user(platform_sub=mock_sub, email=mock_email, name=mock_name)
        
        app_token, expires_at, _ = await auth_service.issue_app_token(user=user)
        
        callback_params = {
            "token": app_token,
            "expires_at": int(expires_at.timestamp()),
            "token_type": "Bearer",
        }
        if from_url:
            callback_params["from_url"] = from_url
            
        fragment = urlencode(callback_params)
        redirect_url = f"{backend_url}/auth/callback?{fragment}"
        logger.info("[login] Dev mode OIDC callback successful, redirecting to %s", redirect_url)
        return RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_302_FOUND,
        )


@router.post("/social-login", response_model=SocialLoginResponse)
async def social_login(payload: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate or register user via Kakao, Naver, Google, Email, or Demo account."""
    auth_service = AuthService(db)
    provider = (payload.provider or "kakao").lower()

    if provider == "kakao":
        provider_id = payload.provider_id or uuid.uuid4().hex[:10]
        sub = f"kakao_{provider_id}"
        email = payload.email or f"kakao_{provider_id[:8]}@kakao.com"
        name = payload.name or "카카오 회원"
    elif provider == "naver":
        provider_id = payload.provider_id or uuid.uuid4().hex[:10]
        sub = f"naver_{provider_id}"
        email = payload.email or f"naver_{provider_id[:8]}@naver.com"
        name = payload.name or "네이버 회원"
    elif provider == "google":
        provider_id = payload.provider_id or uuid.uuid4().hex[:10]
        sub = f"google_{provider_id}"
        email = payload.email or f"google_{provider_id[:8]}@gmail.com"
        name = payload.name or "구글 회원"
    elif provider == "demo":
        demo_name = payload.name or "테스트 유저"
        sub = f"demo_{uuid.uuid4().hex[:8]}" if not payload.email else f"user_{hashlib.md5(payload.email.encode()).hexdigest()[:12]}"
        email = payload.email or "demo@heartsync.co.kr"
        name = demo_name
    elif provider == "email":
        if not payload.email or "@" not in payload.email:
            raise HTTPException(status_code=400, detail="올바른 이메일 주소를 입력해주세요.")
        email = payload.email.strip().lower()
        sub = f"email_{hashlib.md5(email.encode()).hexdigest()[:16]}"
        name = payload.name.strip() if payload.name else derive_name_from_email(email)
    else:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 로그인 방식입니다: {provider}")

    user = await auth_service.get_or_create_user(platform_sub=sub, email=email, name=name)
    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)

    logger.info(f"[social_login] User logged in: provider={provider}, sub={sub}, email={email}")

    return SocialLoginResponse(
        token=app_token,
        token_type="Bearer",
        expires_at=int(expires_at.timestamp()),
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            last_login=user.last_login,
        ),
    )


@router.get("/kakao/login")
async def kakao_login_redirect(request: Request, from_url: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Start Kakao OAuth flow or fast-track login."""
    backend_url = get_dynamic_backend_url(request)
    kakao_client_id = os.getenv("KAKAO_CLIENT_ID")
    if kakao_client_id:
        redirect_uri = f"{backend_url}/api/v1/auth/kakao/callback"
        auth_url = f"https://kauth.kakao.com/oauth/authorize?client_id={kakao_client_id}&redirect_uri={redirect_uri}&response_type=code"
        if from_url:
            auth_url += f"&state={urlencode({'from_url': from_url})}"
        return RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)

    # Fast-track for dev / preview
    auth_service = AuthService(db)
    user = await auth_service.get_or_create_user(platform_sub="kakao_user_demo", email="kakao_user@kakao.com", name="카카오 회원")
    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)
    params = {"token": app_token, "expires_at": int(expires_at.timestamp()), "token_type": "Bearer"}
    if from_url:
        params["from_url"] = from_url
    return RedirectResponse(url=f"{backend_url}/auth/callback?{urlencode(params)}", status_code=status.HTTP_302_FOUND)


@router.get("/naver/login")
async def naver_login_redirect(request: Request, from_url: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Start Naver OAuth flow or fast-track login."""
    backend_url = get_dynamic_backend_url(request)
    naver_client_id = os.getenv("NAVER_CLIENT_ID")
    if naver_client_id:
        redirect_uri = f"{backend_url}/api/v1/auth/naver/callback"
        state = generate_state()
        auth_url = f"https://nid.naver.com/oauth2.0/authorize?client_id={naver_client_id}&redirect_uri={redirect_uri}&response_type=code&state={state}"
        return RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)

    # Fast-track for dev / preview
    auth_service = AuthService(db)
    user = await auth_service.get_or_create_user(platform_sub="naver_user_demo", email="naver_user@naver.com", name="네이버 회원")
    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)
    params = {"token": app_token, "expires_at": int(expires_at.timestamp()), "token_type": "Bearer"}
    if from_url:
        params["from_url"] = from_url
    return RedirectResponse(url=f"{backend_url}/auth/callback?{urlencode(params)}", status_code=status.HTTP_302_FOUND)

    state = generate_state()
    nonce = generate_nonce()
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    # Store state, nonce, and code verifier in database
    auth_service = AuthService(db)
    await auth_service.store_oidc_state(state, nonce, code_verifier)

    # Build redirect_uri dynamically from request
    redirect_uri = f"{backend_url}/api/v1/auth/callback"
    logger.info("[login] Starting OIDC flow with redirect_uri=%s", redirect_uri)

    auth_url = build_authorization_url(state, nonce, code_challenge, redirect_uri=redirect_uri)
    return RedirectResponse(
        url=auth_url,
        status_code=status.HTTP_302_FOUND,
        headers={"X-Request-ID": state},
    )


@router.get("/callback")
async def callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle OIDC callback."""
    backend_url = get_dynamic_backend_url(request)

    def redirect_with_error(message: str) -> RedirectResponse:
        fragment = urlencode({"msg": message})
        return RedirectResponse(
            url=f"{backend_url}/auth/error?{fragment}",
            status_code=status.HTTP_302_FOUND,
        )

    if error:
        return redirect_with_error(f"OIDC error: {error}")

    if not code or not state:
        return redirect_with_error("Missing code or state parameter")

    # Validate state using database
    auth_service = AuthService(db)
    temp_data = await auth_service.get_and_delete_oidc_state(state)
    if not temp_data:
        return redirect_with_error("Invalid or expired state parameter")

    nonce = temp_data["nonce"]
    code_verifier = temp_data.get("code_verifier")

    try:
        # Build redirect_uri dynamically from request
        redirect_uri = f"{backend_url}/api/v1/auth/callback"
        logger.info("[callback] Exchanging code for tokens with redirect_uri=%s", redirect_uri)

        # Exchange authorization code for tokens with PKCE
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.oidc_client_id,
            "client_secret": settings.oidc_client_secret,
        }

        # Add PKCE code verifier if available
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        token_url = f"{settings.oidc_issuer_url}/token"
        try:
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    token_url,
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded", "X-Request-ID": state},
                )
        except httpx.HTTPError as e:
            logger.error(
                "[callback] Token exchange HTTP error: url=%s, error=%s",
                token_url,
                str(e),
                exc_info=True,
            )
            return redirect_with_error(f"Token exchange failed: {e}")

        if token_response.status_code != 200:
            logger.error(
                "[callback] Token exchange failed: url=%s, status_code=%s, response=%s",
                token_url,
                token_response.status_code,
                token_response.text,
            )
            return redirect_with_error(f"Token exchange failed: {token_response.text}")

        tokens = token_response.json()

        # Validate ID token
        id_token = tokens.get("id_token")
        if not id_token:
            return redirect_with_error("No ID token received")

        id_claims = await validate_id_token(id_token)

        # Validate nonce
        if id_claims.get("nonce") != nonce:
            return redirect_with_error("Invalid nonce")

        # Get or create user
        email = id_claims.get("email", "")
        name = id_claims.get("name") or derive_name_from_email(email)
        user = await auth_service.get_or_create_user(platform_sub=id_claims["sub"], email=email, name=name)

        # Issue application JWT token encapsulating user information
        app_token, expires_at, _ = await auth_service.issue_app_token(user=user)

        fragment = urlencode(
            {
                "token": app_token,
                "expires_at": int(expires_at.timestamp()),
                "token_type": "Bearer",
            }
        )

        redirect_url = f"{backend_url}/auth/callback?{fragment}"
        logger.info("[callback] OIDC callback successful, redirecting to %s", redirect_url)
        redirect_response = RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_302_FOUND,
        )
        return redirect_response

    except IDTokenValidationError as e:
        # Redirect to error page with validation details
        return redirect_with_error(f"Authentication failed: {e.message}")
    except HTTPException as e:
        # Redirect to error page with the original detail message
        return redirect_with_error(str(e.detail))
    except Exception as e:
        logger.exception(f"Unexpected error in OIDC callback: {e}")
        return redirect_with_error(
            "Authentication processing failed. Please try again or contact support if the issue persists."
        )


@router.post("/token/exchange", response_model=TokenExchangeResponse)
async def exchange_platform_token(
    payload: PlatformTokenExchangeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange Platform token for app token, restricted to admin user."""
    logger.info("[token/exchange] Received platform token exchange request")

    verify_url = f"{settings.oidc_issuer_url}/platform/tokens/verify"
    logger.debug(f"[token/exchange] Verifying token with issuer: {verify_url}")

    try:
        async with httpx.AsyncClient() as client:
            verify_response = await client.post(
                verify_url,
                json={"platform_token": payload.platform_token},
                headers={"Content-Type": "application/json"},
            )
        logger.debug(f"[token/exchange] Issuer response status: {verify_response.status_code}")
    except httpx.HTTPError as exc:
        logger.error(f"[token/exchange] HTTP error verifying platform token: {exc}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to verify platform token") from exc

    try:
        verify_body = verify_response.json()
        logger.debug(f"[token/exchange] Issuer response body: {verify_body}")
    except ValueError:
        logger.error(f"[token/exchange] Failed to parse issuer response as JSON: {verify_response.text}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from platform token verification service",
        )

    if not isinstance(verify_body, dict):
        logger.error(f"[token/exchange] Unexpected response type: {type(verify_body)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected response from platform token verification service",
        )

    if verify_response.status_code != status.HTTP_200_OK or not verify_body.get("success"):
        message = verify_body.get("message", "") if isinstance(verify_body, dict) else ""
        logger.warning(
            f"[token/exchange] Token verification failed: status={verify_response.status_code}, message={message}"
        )
        raise HTTPException(
            status_code=verify_response.status_code,
            detail=message or "Platform token verification failed",
        )

    payload_data = verify_body.get("data") or {}
    raw_user_id = payload_data.get("user_id")
    logger.info(f"[token/exchange] Token verified, platform_user_id={raw_user_id}, email={payload_data.get('email')}")

    if not raw_user_id:
        logger.error("[token/exchange] Platform token payload missing user_id")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Platform token payload missing user_id")

    platform_user_id = str(raw_user_id)
    if platform_user_id != str(settings.admin_user_id):
        logger.warning(
            f"[token/exchange] Denied: platform_user_id={platform_user_id}, admin_user_id={settings.admin_user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin user can exchange a platform token"
        )

    logger.info("[token/exchange] Admin user verified, issuing admin token without DB persistence")
    auth_service = AuthService(db)

    admin_email = payload_data.get("email", "") or getattr(settings, "admin_user_email", "")
    admin_name = payload_data.get("name") or payload_data.get("username")
    if not admin_name:
        admin_name = derive_name_from_email(admin_email)

    user = User(id=platform_user_id, email=admin_email, name=admin_name, role="admin")
    logger.debug(
        f"[token/exchange] Admin user object for token issuance: id={user.id}, email={user.email}, role={user.role}"
    )

    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)
    logger.info(f"[token/exchange] Token issued successfully for user_id={user.id}, expires_at={expires_at}")

    return TokenExchangeResponse(
        token=app_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.get("/logout")
async def logout():
    """Logout user."""
    logout_url = build_logout_url()
    return {"redirect_url": logout_url}
