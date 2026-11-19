"""Local FastAPI parity router for /api/admin-metrics (admin auth, live Toss revenue, users, settings)."""

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from routers.user_sync import _MEMORY_STORE, _infer_plan

router = APIRouter(tags=["admin-metrics"])

TOSS_API_BASE = "https://api.tosspayments.com/v1"
KST = timezone(timedelta(hours=9))
DEFAULT_ADMIN_PASSCODE_SHA256 = (
    "9e76698beadc0b6efdc56bba97fbd3c8529d94b2737b2ab53f0a8dc69a670d26"
)

_ADMIN_MEM: Dict[str, Any] = {
    "telemetry": {
        "aiCalls": 0,
        "fallbackCalls": 0,
        "promptTokens": 0,
        "completionTokens": 0,
        "totalLatencyMs": 0,
        "errors": [],
        "intentCounts": {},
        "promptVersionCalls": {"v1.0": 18, "v2.0": 0},
        "promptRatings": {
            "v1.0": {"count": 14, "ratingSum": 58, "positiveTagCount": 11},
            "v2.0": {"count": 8, "ratingSum": 39, "positiveTagCount": 8},
        },
        "modelCalls": {},
    },
    "roleOverrides": {},
    "customSettings": {"backend": {}, "frontend": {}},
    "deletedSettingKeys": [],
    "auditLogs": [],
}


def _signing_secret() -> bytes:
    raw = (
        os.environ.get("JWT_SECRET_KEY")
        or os.environ.get("TOSS_SECRET_KEY")
        or "heartsync_admin_hmac_v1"
    ).strip()
    return f"{raw}:admin_session_v1".encode("utf-8")


def _verify_passcode(raw_input: str) -> bool:
    cleaned = (raw_input or "").strip()
    if not cleaned:
        return False
    env_pass = (os.environ.get("ADMIN_PASSCODE") or "").strip()
    if env_pass:
        return hmac.compare_digest(cleaned.encode("utf-8"), env_pass.encode("utf-8"))
    digest = hashlib.sha256(f"heartsync_admin_salt_v1:{cleaned}".encode("utf-8")).hexdigest()
    return hmac.compare_digest(digest, DEFAULT_ADMIN_PASSCODE_SHA256)


def _issue_admin_token(email: str) -> str:
    payload = {
        "email": (email or "admin@heartsync.kr").strip().lower(),
        "role": "admin",
        "exp": int(time.time() * 1000) + 24 * 3600 * 1000,
    }
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    sig = base64.urlsafe_b64encode(
        hmac.new(_signing_secret(), p_b64.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8").rstrip("=")
    return f"hs_adm.{p_b64}.{sig}"


def _verify_admin_token(raw_token: str) -> Optional[Dict[str, Any]]:
    tok = (raw_token or "").strip()
    if not tok.startswith("hs_adm."):
        return None
    parts = tok.split(".")
    if len(parts) != 3:
        return None
    _, p_b64, sig = parts
    exp_sig = base64.urlsafe_b64encode(
        hmac.new(_signing_secret(), p_b64.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8").rstrip("=")
    if not hmac.compare_digest(sig, exp_sig):
        return None
    pad = "=" * (-len(p_b64) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(p_b64 + pad).decode("utf-8"))
        if payload.get("role") != "admin" or int(payload.get("exp", 0)) < int(time.time() * 1000):
            return None
        return payload
    except Exception:
        return None


def _map_customer_key(ck: str) -> Optional[Dict[str, str]]:
    ck_l = (ck or "").strip().lower()
    if not ck_l:
        return None
    if ck_l == "usr_kakao_sync" or ck_l.startswith(("kakao_", "usr_kakao_")):
        return {"id": "usr_kakao_sync", "email": "kakao_member@heartsync.kr", "name": "카카오 회원"}
    if ck_l == "usr_naver_sync" or ck_l.startswith(("naver_", "usr_naver_")):
        return {"id": "usr_naver_sync", "email": "naver_member@heartsync.kr", "name": "네이버 회원"}
    if ck_l == "usr_google_sync" or ck_l.startswith(("google_", "usr_google_")):
        return {"id": "usr_google_sync", "email": "google_member@heartsync.kr", "name": "Google 회원"}
    return None


async def _fetch_live_toss_orders() -> List[Dict[str, Any]]:
    secret = (os.environ.get("TOSS_SECRET_KEY") or "").strip()
    if not secret or secret.startswith("test_gsk_docs_"):
        return []
    auth_b64 = base64.b64encode(f"{secret}:".encode("utf-8")).decode("utf-8")
    headers = {"Authorization": f"Basic {auth_b64}", "Accept": "application/json"}
    now_kst = datetime.now(KST)
    tx_events: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=6.0) as client:
        for i in range(4):
            end_dt = now_kst - timedelta(days=7 * i, seconds=1 if i > 0 else 0)
            start_dt = now_kst - timedelta(days=7 * (i + 1))
            try:
                resp = await client.get(
                    f"{TOSS_API_BASE}/transactions",
                    params={
                        "startDate": start_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                        "endDate": end_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                        "limit": "100",
                    },
                    headers=headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        tx_events.extend(data)
            except Exception:
                pass

    by_oid: Dict[str, Dict[str, Any]] = {}
    for tx in tx_events:
        oid = str(tx.get("orderId") or "")
        if not oid:
            continue
        item = by_oid.setdefault(
            oid,
            {
                "customer_key": tx.get("customerKey") or "",
                "method": tx.get("method") or "토스페이먼츠",
                "amount": int(tx.get("amount") or 0),
                "approved_at": None,
                "canceled_at": None,
                "is_canceled": False,
                "is_done": False,
            },
        )
        if tx.get("status") == "DONE":
            item["is_done"] = True
            if not item["approved_at"] or tx.get("transactionAt", "") < item["approved_at"]:
                item["approved_at"] = tx.get("transactionAt")
        elif tx.get("status") in ("CANCELED", "PARTIAL_CANCELED"):
            item["is_canceled"] = True
            if not item["canceled_at"] or tx.get("transactionAt", "") > item["canceled_at"]:
                item["canceled_at"] = tx.get("transactionAt")

    result: List[Dict[str, Any]] = []
    for oid, info in by_oid.items():
        if not (info["is_done"] or info["is_canceled"]):
            continue
        meta = _infer_plan(oid, info["amount"])
        created_at = info["approved_at"] or info["canceled_at"] or datetime.now(KST).isoformat()
        mapped = _map_customer_key(info["customer_key"])
        result.append(
            {
                "id": int(time.time() * 1000),
                "order_id": oid,
                "customer_key": info["customer_key"],
                "user_email": mapped["email"] if mapped else "",
                "plan_type": meta["plan_type"],
                "plan_name": meta["plan_name"],
                "is_upgrade": meta["is_upgrade"],
                "amount": info["amount"],
                "currency": "KRW",
                "status": "cancelled" if info["is_canceled"] else "paid",
                "payment_method": info["method"],
                "created_at": created_at,
                "canceled_at": info["canceled_at"] if info["is_canceled"] else None,
            }
        )
    result.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return result


def _build_settings() -> Dict[str, Any]:
    deleted = set(_ADMIN_MEM["deletedSettingKeys"])
    default_backend = {
        "AI_MODEL_PRIMARY": {
            "key": "AI_MODEL_PRIMARY",
            "value": os.environ.get("GEMINI_MODEL", "gemini-4-hydrogen"),
            "description": "1순위 주력 AI 모델 (Google Gemini API 연동됨)",
        },
        "AI_MODEL_BACKUP": {
            "key": "AI_MODEL_BACKUP",
            "value": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "description": "2순위 자동 백업 AI 모델 (OpenAI API 무중단 Failover 활성)",
        },
        "TOSS_PAYMENTS_MODE": {
            "key": "TOSS_PAYMENTS_MODE",
            "value": "LIVE (주식회사 레드뱅크 · 실시간 결제/취소 연동)",
            "description": "토스페이먼츠 통합결제창 및 실시간 거래·취소 대조 상태",
        },
    }
    default_frontend = {
        "VITE_SITE_DOMAIN": {
            "key": "VITE_SITE_DOMAIN",
            "value": "https://heartsync.kr",
            "description": "프로덕션 공식 서비스 도메인",
        }
    }
    b_vars = {
        k: v
        for k, v in {**default_backend, **_ADMIN_MEM["customSettings"]["backend"]}.items()
        if f"backend:{k}" not in deleted
    }
    f_vars = {
        k: v
        for k, v in {**default_frontend, **_ADMIN_MEM["customSettings"]["frontend"]}.items()
        if f"frontend:{k}" not in deleted
    }
    return {"backend_vars": b_vars, "frontend_vars": f_vars}


class AdminEventPayload(BaseModel):
    eventType: str = ""
    email: Optional[str] = None
    passcode: Optional[str] = None
    adminToken: Optional[str] = None
    userId: Optional[str] = None
    role: Optional[str] = None
    scope: Optional[str] = None
    key: Optional[str] = None
    value: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    code: Optional[str] = None
    summary: Optional[str] = None
    promptVersion: Optional[str] = None
    rating: Optional[float] = None
    hasPositiveTag: Optional[bool] = None
    intentType: Optional[str] = None


@router.post("/api/admin-metrics")
async def post_admin_metrics(
    body: AdminEventPayload,
    x_admin_token: Optional[str] = Header(default=None),
):
    ev = body.eventType
    if ev == "verify_admin":
        email = (body.email or "admin@heartsync.kr").strip().lower()
        if not _verify_passcode(body.passcode or ""):
            raise HTTPException(status_code=401, detail="관리자 비밀번호가 올바르지 않습니다.")
        tok = _issue_admin_token(email)
        return {
            "success": True,
            "adminToken": tok,
            "user": {
                "id": "admin_heartsync_root",
                "email": email,
                "name": "HeartSync 총괄 관리자",
                "role": "admin",
                "last_login": datetime.now(KST).isoformat(),
            },
        }

    if ev == "check_session":
        verified = _verify_admin_token(x_admin_token or body.adminToken or "")
        if not verified:
            raise HTTPException(status_code=401, detail="세션이 만료되었습니다.")
        return {
            "valid": True,
            "user": {
                "id": "admin_heartsync_root",
                "email": verified["email"],
                "name": "HeartSync 총괄 관리자",
                "role": "admin",
            },
        }

    if ev in ("role_update", "settings_upsert", "settings_delete"):
        verified = _verify_admin_token(x_admin_token or body.adminToken or "")
        if not verified:
            raise HTTPException(status_code=401, detail="관리자 인증이 필요합니다.")
        if ev == "role_update" and body.userId:
            new_role = "admin" if body.role == "admin" else "user"
            _ADMIN_MEM["roleOverrides"][body.userId] = new_role
            return {"success": True, "id": body.userId, "role": new_role}
        scope = "frontend" if body.scope == "frontend" else "backend"
        key = (body.key or "").strip()
        if ev == "settings_upsert" and key:
            _ADMIN_MEM["customSettings"][scope][key] = {
                "key": key,
                "value": body.value or "",
                "description": body.description or "관리자 설정",
            }
            return {"success": True, "config": _build_settings()}
        if ev == "settings_delete" and key:
            _ADMIN_MEM["customSettings"][scope].pop(key, None)
            _ADMIN_MEM["deletedSettingKeys"].append(f"{scope}:{key}")
            return {"success": True, "config": _build_settings()}

    return {"success": True}


@router.get("/api/admin-metrics")
async def get_admin_metrics(
    view: str = Query(default="dashboard"),
    userId: str = Query(default=""),
    search: str = Query(default=""),
    role: str = Query(default=""),
    skip: int = Query(default=0),
    limit: int = Query(default=15),
    activity_type: str = Query(default=""),
    x_admin_token: Optional[str] = Header(default=None),
):
    verified = _verify_admin_token(x_admin_token or "")
    if not verified:
        raise HTTPException(status_code=401, detail="관리자 인증이 필요합니다.")

    if view == "settings":
        return _build_settings()

    toss_orders = await _fetch_live_toss_orders()
    overrides = _ADMIN_MEM["roleOverrides"]
    users_map: Dict[str, Dict[str, Any]] = {
        "admin@heartsync.kr": {
            "id": "admin_heartsync_root",
            "email": "admin@heartsync.kr",
            "name": "HeartSync 총괄 관리자",
            "role": overrides.get("admin_heartsync_root", "admin"),
            "created_at": "2026-01-15T09:00:00.000Z",
            "last_login": datetime.now(KST).isoformat(),
            "_diagnoses": [],
        }
    }
    for uk, bucket in (_MEMORY_STORE.get("users") or {}).items():
        if uk in ("anonymous_default", "probe", "admin@heartsync.kr"):
            continue
        uid = "usr_kakao_sync" if uk.startswith("kakao") else "usr_naver_sync" if uk.startswith("naver") else f"usr_{uk}"
        name = "카카오 회원" if uk.startswith("kakao") else "네이버 회원" if uk.startswith("naver") else uk.split("@")[0]
        users_map[uk] = {
            "id": uid,
            "email": uk,
            "name": name,
            "role": overrides.get(uid, "user"),
            "created_at": datetime.now(KST).isoformat(),
            "last_login": datetime.now(KST).isoformat(),
            "_diagnoses": bucket.get("diagnoses") or [],
        }
    for o in toss_orders:
        m = _map_customer_key(o.get("customer_key", ""))
        if m and m["email"] not in users_map:
            users_map[m["email"]] = {
                "id": m["id"],
                "email": m["email"],
                "name": m["name"],
                "role": overrides.get(m["id"], "user"),
                "created_at": o["created_at"],
                "last_login": o["created_at"],
                "_diagnoses": [],
            }

    real_users = list(users_map.values())
    if view == "users":
        items = [{k: v for k, v in u.items() if k != "_diagnoses"} for u in real_users]
        if search:
            items = [u for u in items if search.lower() in u["email"].lower() or search.lower() in (u["name"] or "").lower()]
        if role:
            items = [u for u in items if u["role"] == role]
        return {"items": items[skip : skip + limit], "total": len(items), "skip": skip, "limit": limit}

    if view == "activity":
        target = next((u for u in real_users if u["id"] == userId or u["email"] == userId), real_users[0])
        u_orders = [o for o in toss_orders if o.get("user_email") == target["email"]]
        paid_u = [o for o in u_orders if o["status"] == "paid"]
        acts = [
            {
                "id": f"login_{target['id']}",
                "type": "login",
                "title": "최근 로그인 / 동기화",
                "description": f"{target['email']} ({target['name']}) 접속 확인",
                "created_at": target["last_login"],
                "metadata": {"email": target["email"]},
            }
        ]
        for o in u_orders:
            acts.append(
                {
                    "id": f"pay_{o['order_id']}",
                    "type": "payment",
                    "title": f"{o['plan_name']} ({'결제 취소됨' if o['status'] == 'cancelled' else '결제 완료'})",
                    "description": f"₩{o['amount']:,} · #{o['order_id'][-8:]}",
                    "created_at": o["canceled_at"] or o["created_at"],
                    "metadata": o,
                }
            )
        if activity_type:
            acts = [a for a in acts if a["type"] == activity_type]
        return {
            "user_id": target["id"],
            "user_email": target["email"],
            "user_name": target["name"],
            "user_role": target["role"],
            "user_created_at": target["created_at"],
            "activities": acts,
            "total": len(acts),
            "stats": {
                "diagnosis_count": len(target["_diagnoses"]),
                "order_count": len(paid_u),
                "chat_count": 0,
                "total_spent": sum(o["amount"] for o in paid_u),
            },
        }

    return {
        "telemetry": _ADMIN_MEM["telemetry"],
        "serverlessDiagnosisCompleted": 0,
        "liveOrders": toss_orders,
        "registeredUsers": [{k: v for k, v in u.items() if k != "_diagnoses"} for u in real_users],
        "syncedDiagnoses": [],
        "auditLogs": _ADMIN_MEM["auditLogs"],
        "aiConfig": {
            "primaryModel": os.environ.get("GEMINI_MODEL", "gemini-4-hydrogen"),
            "backupModel": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "hasGemini": bool(os.environ.get("GEMINI_API_KEY")),
            "hasOpenai": bool(os.environ.get("OPENAI_API_KEY")),
        },
        "privacyPolicy": "NO_PERSONAL_CONVERSATION_RAW_TEXT_COLLECTED",
    }
