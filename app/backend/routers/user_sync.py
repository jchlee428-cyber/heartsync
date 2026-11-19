"""FastAPI /api/user-sync endpoint with live Toss Payments order & cancellation reconciliation."""

import base64
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["user-sync"])

TOSS_API_BASE = "https://api.tosspayments.com/v1"
KST = timezone(timedelta(hours=9))

PLAN_META = {
    "single_analysis": {"name": "개인 정밀 분석 (1회권)", "base_price": 19900, "days": 30, "analyses": 1, "tier": 1},
    "monthly_subscription": {"name": "커플 듀얼 매칭 패키지 (2인)", "base_price": 29000, "days": 60, "analyses": 2, "tier": 2},
    "couple_dual": {"name": "커플 듀얼 매칭 패키지 (2인)", "base_price": 29000, "days": 60, "analyses": 2, "tier": 2},
    "couple_premium": {"name": "30일 관계 개선 올케어 패스", "base_price": 49000, "days": 30, "analyses": 999, "tier": 3},
    "all_care_pass": {"name": "30일 관계 개선 올케어 패스", "base_price": 49000, "days": 30, "analyses": 999, "tier": 3},
}

_MEMORY_STORE: Dict[str, Any] = {"users": {}, "diagnoses_by_id": {}}


def _is_terminal_cancel(status_val: Optional[str]) -> bool:
    return status_val in ("cancelled", "refunded")


def _simple_hash_hex(text: str) -> str:
    h = 5381
    for ch in text:
        h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return format(h, "x")


def _matches_user(customer_key: str, user_key: str, user_id: str) -> bool:
    ck = (customer_key or "").strip().lower()
    if not ck:
        return False
    uk = (user_key or "").strip().lower()
    uid = (user_id or "").strip().lower()
    if ck in (uk, uid):
        return True
    for prov in ("kakao", "naver", "google"):
        if uk == f"{prov}_member@heartsync.kr" or uk.startswith(f"usr_{prov}") or uid.startswith(f"usr_{prov}") or uid.startswith(f"{prov}_"):
            if ck == f"usr_{prov}_sync" or ck.startswith(f"{prov}_") or ck.startswith(f"usr_{prov}_"):
                return True
    if "@" in uk and ck.endswith(f"_{_simple_hash_hex(uk)}"):
        return True
    return False


def _infer_plan(order_id: str, amount: int) -> Dict[str, Any]:
    plan_type = "single_analysis"
    if "couple_premium" in order_id or "all_care_pass" in order_id:
        plan_type = "couple_premium"
    elif "monthly_subscription" in order_id or "couple_dual" in order_id:
        plan_type = "monthly_subscription"
    elif amount in (49000, 29100, 20000):
        plan_type = "couple_premium"
    elif amount in (29000, 9100):
        plan_type = "monthly_subscription"

    meta = PLAN_META[plan_type]
    is_gift = order_id.startswith("order_gift_") or order_id.startswith("GIFT")
    is_upgrade = (not is_gift) and (0 < amount < meta["base_price"])
    plan_name = (
        f"[선물] HeartSync {meta['name']}"
        if is_gift
        else f"[업그레이드] {meta['name']} (차액 결제)"
        if is_upgrade
        else meta["name"]
    )
    return {"plan_type": plan_type, "plan_name": plan_name, "base_price": meta["base_price"], "is_upgrade": is_upgrade}


async def _reconcile_with_toss(orders: List[Dict[str, Any]], user_key: str, user_id: str) -> List[Dict[str, Any]]:
    secret_key = os.environ.get("TOSS_SECRET_KEY", "").strip()
    if not secret_key or secret_key.startswith("test_gsk_docs_"):
        return orders

    creds = base64.b64encode(f"{secret_key}:".encode()).decode()
    headers = {"Authorization": f"Basic {creds}", "Accept": "application/json"}

    now_kst = datetime.now(KST)
    seven_ago = now_kst - timedelta(days=7)
    fourteen_ago = now_kst - timedelta(days=14)
    windows = [
        (seven_ago, now_kst),
        (fourteen_ago, seven_ago - timedelta(seconds=1)),
    ]

    tx_events: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=5.0) as client:
        for w_start, w_end in windows:
            try:
                resp = await client.get(
                    f"{TOSS_API_BASE}/transactions",
                    params={
                        "startDate": w_start.strftime("%Y-%m-%dT%H:%M:%S"),
                        "endDate": w_end.strftime("%Y-%m-%dT%H:%M:%S"),
                        "limit": 100,
                    },
                    headers=headers,
                )
                if resp.status_code == 200:
                    arr = resp.json()
                    if isinstance(arr, list):
                        tx_events.extend(arr)
            except Exception as e:
                logger.debug(f"Toss transactions sync notice: {e}")

        toss_map: Dict[str, Dict[str, Any]] = {}
        for tx in tx_events:
            oid = str(tx.get("orderId") or "")
            if not oid:
                continue
            item = toss_map.setdefault(
                oid,
                {
                    "order_id": oid,
                    "customer_key": tx.get("customerKey") or "",
                    "method": tx.get("method") or "토스페이먼츠",
                    "amount": int(tx.get("amount") or 0),
                    "receipt_url": tx.get("receiptUrl"),
                    "approved_at": None,
                    "canceled_at": None,
                    "is_canceled": False,
                    "is_done": False,
                },
            )
            if tx.get("customerKey") and not item["customer_key"]:
                item["customer_key"] = tx["customerKey"]
            if tx.get("status") == "DONE":
                item["is_done"] = True
                if not item["approved_at"] or tx.get("transactionAt", "") < item["approved_at"]:
                    item["approved_at"] = tx.get("transactionAt")
            elif tx.get("status") in ("CANCELED", "PARTIAL_CANCELED"):
                item["is_canceled"] = True
                if not item["canceled_at"] or tx.get("transactionAt", "") > item["canceled_at"]:
                    item["canceled_at"] = tx.get("transactionAt")

        order_map: Dict[str, Dict[str, Any]] = {}
        for o in orders:
            key = str(o.get("order_id") or o.get("toss_order_id") or o.get("id") or "")
            if key:
                copy_o = dict(o)
                copy_o["order_id"] = key
                order_map[key] = copy_o

        effective_uk = (user_key or "").strip()
        effective_uid = (user_id or "").strip()
        if (not effective_uk or effective_uk == "anonymous_default") and not effective_uid:
            for oid in order_map.keys():
                matched_tx = toss_map.get(oid)
                if matched_tx and matched_tx.get("customer_key"):
                    effective_uid = matched_tx["customer_key"]
                    break

        for oid, ord_obj in list(order_map.items()):
            t_info = toss_map.get(oid)
            if t_info:
                if t_info["is_canceled"]:
                    ord_obj["status"] = "cancelled"
                    ord_obj["canceled_at"] = t_info["canceled_at"]
                elif t_info["is_done"] and not _is_terminal_cancel(ord_obj.get("status")):
                    ord_obj["status"] = "paid"

        for oid, t_info in toss_map.items():
            if oid in order_map:
                continue
            if not (t_info["is_done"] or t_info["is_canceled"]):
                continue
            if not _matches_user(t_info["customer_key"], effective_uk, effective_uid):
                continue
            info = _infer_plan(oid, t_info["amount"])
            created_at = t_info["approved_at"] or t_info["canceled_at"] or datetime.now(KST).isoformat()
            order_map[oid] = {
                "id": int(datetime.fromisoformat(created_at).timestamp() * 1000) if created_at else int(datetime.now().timestamp() * 1000),
                "order_id": oid,
                "plan_type": info["plan_type"],
                "plan_name": info["plan_name"],
                "amount": t_info["amount"],
                "original_amount": info["base_price"] if info["is_upgrade"] else None,
                "upgrade_credit": (info["base_price"] - t_info["amount"]) if info["is_upgrade"] else 0,
                "is_upgrade": info["is_upgrade"],
                "currency": "KRW",
                "status": "cancelled" if t_info["is_canceled"] else "paid",
                "canceled_at": t_info["canceled_at"] if t_info["is_canceled"] else None,
                "payment_method": t_info["method"],
                "receipt_url": t_info["receipt_url"],
                "created_at": created_at,
            }

    return sorted(order_map.values(), key=lambda x: str(x.get("created_at") or ""), reverse=True)[:100]


def _derive_active_plan(orders: List[Dict[str, Any]], fallback_plan: Any) -> Any:
    now_ts = datetime.now(timezone.utc).timestamp()
    best = None
    best_tier = 0
    for o in orders:
        if o.get("status") != "paid":
            continue
        oid = str(o.get("order_id") or "")
        if oid.startswith("order_gift_") or oid.startswith("GIFT") or "선물" in str(o.get("plan_name") or ""):
            continue
        meta = PLAN_META.get(str(o.get("plan_type") or ""), PLAN_META["single_analysis"])
        try:
            c_ts = datetime.fromisoformat(str(o.get("created_at")).replace("Z", "+00:00")).timestamp()
        except Exception:
            c_ts = now_ts
        exp_ts = c_ts + meta["days"] * 86400
        if exp_ts < now_ts:
            continue
        if meta["tier"] > best_tier or (meta["tier"] == best_tier and best is None):
            best_tier = meta["tier"]
            best = (o, meta, exp_ts)

    if not best:
        return None if orders else fallback_plan

    ord_obj, meta, exp_ts = best
    return {
        "plan_type": ord_obj.get("plan_type"),
        "plan_name": meta["name"],
        "analyses_remaining": meta["analyses"],
        "is_active": True,
        "expires_at": datetime.fromtimestamp(exp_ts, tz=KST).strftime("%Y-%m-%d"),
        "status": "paid",
        "payment_method": ord_obj.get("payment_method") or "토스페이먼츠",
        "paid_at": ord_obj.get("created_at"),
    }


class UserSyncPayload(BaseModel):
    userKey: Optional[str] = ""
    userId: Optional[str] = ""
    reconcileOnly: Optional[bool] = False
    diagnoses: Optional[List[Dict[str, Any]]] = None
    orders: Optional[List[Dict[str, Any]]] = None
    activePlan: Optional[Dict[str, Any]] = None
    deletedDiagnosisIds: Optional[List[str]] = None
    deleteDiagnosisId: Optional[str] = None


@router.get("/api/user-sync")
async def get_user_sync(
    diagnosisId: Optional[str] = Query(default=None),
    userKey: Optional[str] = Query(default=""),
    userId: Optional[str] = Query(default=""),
):
    if diagnosisId:
        return {"diagnosis": _MEMORY_STORE["diagnoses_by_id"].get(str(diagnosisId))}
    uk = (userKey or "anonymous_default").strip().lower()
    bucket = _MEMORY_STORE["users"].setdefault(
        uk, {"diagnoses": [], "orders": [], "activePlan": None, "deletedDiagnosisIds": []}
    )
    bucket["orders"] = await _reconcile_with_toss(bucket["orders"], uk, userId or "")
    bucket["activePlan"] = _derive_active_plan(bucket["orders"], bucket["activePlan"])
    return {
        "userKey": uk,
        "diagnoses": bucket["diagnoses"],
        "orders": bucket["orders"],
        "activePlan": bucket["activePlan"],
        "deletedDiagnosisIds": bucket["deletedDiagnosisIds"],
    }


@router.post("/api/user-sync")
async def post_user_sync(body: UserSyncPayload):
    if body.reconcileOnly or not (body.userKey or "").strip():
        reconciled_orders = await _reconcile_with_toss(body.orders or [], "", (body.userId or "").strip())
        reconciled_plan = _derive_active_plan(reconciled_orders, body.activePlan)
        return {
            "success": True,
            "reconcileOnly": True,
            "orders": reconciled_orders,
            "activePlan": reconciled_plan,
        }

    uk = (body.userKey or "anonymous_default").strip().lower()
    uid = (body.userId or "").strip()
    bucket = _MEMORY_STORE["users"].setdefault(
        uk, {"diagnoses": [], "orders": [], "activePlan": None, "deletedDiagnosisIds": []}
    )

    deleted_set = set(str(x) for x in (bucket["deletedDiagnosisIds"] or []))
    for x in body.deletedDiagnosisIds or []:
        deleted_set.add(str(x))
    if body.deleteDiagnosisId:
        deleted_set.add(str(body.deleteDiagnosisId))
        _MEMORY_STORE["diagnoses_by_id"].pop(str(body.deleteDiagnosisId), None)
    bucket["deletedDiagnosisIds"] = list(deleted_set)[-200:]

    diag_map: Dict[str, Dict[str, Any]] = {}
    for item in [*(bucket["diagnoses"] or []), *(body.diagnoses or [])]:
        if not item or not item.get("id"):
            continue
        did = str(item["id"])
        if did in deleted_set:
            continue
        prev = diag_map.get(did, {})
        merged = {**prev, **item, "ai_report": item.get("ai_report") or prev.get("ai_report") or ""}
        diag_map[did] = merged
        _MEMORY_STORE["diagnoses_by_id"][did] = merged
    bucket["diagnoses"] = sorted(diag_map.values(), key=lambda x: str(x.get("created_at") or ""), reverse=True)[:100]

    ord_map: Dict[str, Dict[str, Any]] = {}
    for ord_item in [*(bucket["orders"] or []), *(body.orders or [])]:
        if not ord_item:
            continue
        okey = str(ord_item.get("order_id") or ord_item.get("id") or "")
        if not okey:
            continue
        prev_o = ord_map.get(okey)
        if not prev_o:
            ord_map[okey] = dict(ord_item)
        else:
            res_status = (
                prev_o.get("status")
                if _is_terminal_cancel(prev_o.get("status"))
                else ord_item.get("status")
                if _is_terminal_cancel(ord_item.get("status"))
                else ord_item.get("status") or prev_o.get("status")
            )
            ord_map[okey] = {**prev_o, **ord_item, "status": res_status}

    bucket["orders"] = await _reconcile_with_toss(list(ord_map.values()), uk, uid)
    bucket["activePlan"] = _derive_active_plan(bucket["orders"], body.activePlan or bucket["activePlan"])

    return {
        "success": True,
        "userKey": uk,
        "diagnoses": bucket["diagnoses"],
        "orders": bucket["orders"],
        "activePlan": bucket["activePlan"],
        "deletedDiagnosisIds": bucket["deletedDiagnosisIds"],
    }
