import fs from "fs";

const TMP_SYNC_FILE = "/tmp/heartsync_user_sync.json";
const TOSS_API_BASE = "https://api.tosspayments.com/v1";

const PLAN_META = {
  single_analysis: { name: "개인 정밀 분석 (1회권)", basePrice: 19900, days: 30, analyses: 1, tier: 1 },
  monthly_subscription: { name: "커플 듀얼 매칭 패키지 (2인)", basePrice: 29000, days: 60, analyses: 2, tier: 2 },
  couple_dual: { name: "커플 듀얼 매칭 패키지 (2인)", basePrice: 29000, days: 60, analyses: 2, tier: 2 },
  couple_premium: { name: "30일 관계 개선 올케어 패스", basePrice: 49000, days: 30, analyses: 999, tier: 3 },
  all_care_pass: { name: "30일 관계 개선 올케어 패스", basePrice: 49000, days: 30, analyses: 999, tier: 3 },
};

let memoryStore = {
  users: {},
  diagnosesById: {},
};

function loadStore() {
  try {
    if (fs.existsSync(TMP_SYNC_FILE)) {
      const raw = fs.readFileSync(TMP_SYNC_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryStore.users = { ...(parsed.users || {}), ...memoryStore.users };
        memoryStore.diagnosesById = {
          ...(parsed.diagnosesById || {}),
          ...memoryStore.diagnosesById,
        };
      }
    }
  } catch {
    // Ignore /tmp read error
  }
}

function saveStore() {
  try {
    fs.writeFileSync(TMP_SYNC_FILE, JSON.stringify(memoryStore), "utf8");
  } catch {
    // Ignore /tmp write error
  }
}

function normalizeUserKey(rawKey) {
  const cleaned = String(rawKey || "")
    .trim()
    .toLowerCase();
  return cleaned || "anonymous_default";
}

function ensureUserBucket(userKey) {
  if (!memoryStore.users[userKey]) {
    memoryStore.users[userKey] = {
      diagnoses: [],
      orders: [],
      activePlan: null,
      deletedDiagnosisIds: [],
      updatedAt: new Date().toISOString(),
    };
  }
  return memoryStore.users[userKey];
}

function mergeDiagnoses(existingList, incomingList, deletedIdsSet) {
  const map = new Map();
  const combined = [...(existingList || []), ...(incomingList || [])];

  for (const item of combined) {
    if (!item || !item.id) continue;
    const idStr = String(item.id);
    if (deletedIdsSet.has(idStr)) continue;

    const prev = map.get(idStr);
    if (!prev) {
      map.set(idStr, item);
    } else {
      const mergedItem = {
        ...prev,
        ...item,
        ai_report: item.ai_report || prev.ai_report || "",
        answers: item.answers || prev.answers,
        scores: item.scores || prev.scores,
      };
      map.set(idStr, mergedItem);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    })
    .slice(0, 100);
}

function isTerminalCancelStatus(status) {
  return status === "cancelled" || status === "refunded";
}

function mergeOrders(existingList, incomingList) {
  const map = new Map();
  const combined = [...(existingList || []), ...(incomingList || [])];

  for (const ord of combined) {
    if (!ord) continue;
    const key = String(ord.order_id || ord.id || "");
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, ord);
    } else {
      // Never let a stale "paid" record overwrite a "cancelled" / "refunded" status
      const resolvedStatus = isTerminalCancelStatus(prev.status)
        ? prev.status
        : isTerminalCancelStatus(ord.status)
          ? ord.status
          : ord.status || prev.status;
      map.set(key, {
        ...prev,
        ...ord,
        status: resolvedStatus,
        canceled_at: ord.canceled_at || prev.canceled_at || undefined,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    })
    .slice(0, 100);
}

function inferPlanFromOrder(orderId = "", amount = 0) {
  const idStr = String(orderId);
  let planType = "single_analysis";
  if (idStr.includes("couple_premium") || idStr.includes("all_care_pass")) {
    planType = "couple_premium";
  } else if (idStr.includes("monthly_subscription") || idStr.includes("couple_dual")) {
    planType = "monthly_subscription";
  } else if ([49000, 29100, 20000].includes(Number(amount))) {
    planType = "couple_premium";
  } else if ([29000, 9100].includes(Number(amount))) {
    planType = "monthly_subscription";
  }

  const meta = PLAN_META[planType] || PLAN_META.single_analysis;
  const isGift = idStr.startsWith("order_gift_") || idStr.startsWith("GIFT");
  const numAmt = Number(amount) || meta.basePrice;
  const isUpgrade = !isGift && numAmt > 0 && numAmt < meta.basePrice;

  const planName = isGift
    ? `[선물] HeartSync ${meta.name}`
    : isUpgrade
      ? `[업그레이드] ${meta.name} (차액 결제)`
      : meta.name;

  return {
    planType,
    planName,
    basePrice: meta.basePrice,
    isUpgrade,
    isGift,
  };
}

function formatKstIsoNoOffset(dateObj) {
  const kstMs = dateObj.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 19);
}

function simpleHashHex(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0).toString(16);
}

function doesCustomerKeyMatchUser(customerKey, userKey, userId) {
  const ck = String(customerKey || "").trim().toLowerCase();
  if (!ck) return false;

  const uk = String(userKey || "").trim().toLowerCase();
  const uid = String(userId || "").trim().toLowerCase();
  const sanitizedUk = uk.replace(/[^a-z0-9\-_=.@]/g, "_").slice(0, 45);

  if (ck === uk || ck === uid || (sanitizedUk && ck === sanitizedUk)) {
    return true;
  }

  // Match deterministic social provider identities (e.g. kakao_member@heartsync.kr <-> usr_kakao_sync / kakao_*)
  for (const prov of ["kakao", "naver", "google"]) {
    if (
      uk === `${prov}_member@heartsync.kr` ||
      uk.startsWith(`usr_${prov}`) ||
      uid.startsWith(`usr_${prov}`) ||
      uid.startsWith(`${prov}_`)
    ) {
      if (ck === `usr_${prov}_sync` || ck.startsWith(`${prov}_`) || ck.startsWith(`usr_${prov}_`)) {
        return true;
      }
    }
  }

  // Match deterministic email hash customerKey
  if (uk.includes("@")) {
    const h = simpleHashHex(uk);
    if (ck.endsWith(`_${h}`)) return true;
  }

  return false;
}

function resolveTossSecretKey() {
  const raw =
    process.env.TOSS_SECRET_KEY ||
    process.env.VITE_TOSS_SECRET_KEY ||
    process.env.TOSS_LIVE_SECRET_KEY ||
    "";
  return String(raw)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

/**
 * Reconciles user orders directly against Toss Payments REST API:
 * 1. Marks canceled orders (`CANCELED`) as `status: "cancelled"`
 * 2. Imports missing live orders (`DONE`) belonging to the same user across devices/environments
 */
async function reconcileOrdersWithToss(orders, userKey, userId) {
  const secretKey = resolveTossSecretKey();
  const syncDiag = {
    hasSecret: Boolean(secretKey && !secretKey.startsWith("test_gsk_docs_")),
    secretPrefix: secretKey ? secretKey.slice(0, 8) : "none",
    txCount: 0,
    txStatus: [],
    orderChecks: 0,
    errors: [],
  };

  if (!syncDiag.hasSecret) {
    return { orders, syncDiag };
  }

  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  const headers = { Authorization: authHeader, Accept: "application/json" };

  // Fetch recent 14 days of Toss transactions in two 7-day windows (plain fetch for Vercel runtime compatibility)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const windows = [
    { start: sevenDaysAgo, end: now },
    { start: fourteenDaysAgo, end: new Date(sevenDaysAgo.getTime() - 1000) },
  ];

  const txEvents = [];
  await Promise.all(
    windows.map(async (w) => {
      try {
        const qs = new URLSearchParams({
          startDate: formatKstIsoNoOffset(w.start),
          endDate: formatKstIsoNoOffset(w.end),
          limit: "100",
        });
        const resp = await fetch(`${TOSS_API_BASE}/transactions?${qs.toString()}`, {
          method: "GET",
          headers,
        });
        syncDiag.txStatus.push(resp.status);
        if (resp.ok) {
          const arr = await resp.json();
          if (Array.isArray(arr)) txEvents.push(...arr);
        } else {
          const errTxt = await resp.text().catch(() => "");
          syncDiag.errors.push(`tx_${resp.status}:${errTxt.slice(0, 160)}`);
        }
      } catch (err) {
        syncDiag.errors.push(`tx_exc:${String(err?.message || err).slice(0, 120)}`);
      }
    })
  );

  syncDiag.txCount = txEvents.length;

  // Aggregate transaction events by orderId
  const tossByOrderId = new Map();
  for (const tx of txEvents) {
    if (!tx || !tx.orderId) continue;
    const oid = String(tx.orderId);
    const prev = tossByOrderId.get(oid) || {
      orderId: oid,
      customerKey: tx.customerKey || "",
      method: tx.method || "토스페이먼츠",
      amount: Number(tx.amount) || 0,
      receiptUrl: tx.receiptUrl || null,
      approvedAt: null,
      canceledAt: null,
      isCanceled: false,
      isDone: false,
    };

    if (tx.customerKey && !prev.customerKey) prev.customerKey = tx.customerKey;
    if (tx.receiptUrl) prev.receiptUrl = tx.receiptUrl;
    if (tx.method) prev.method = tx.method;
    if (tx.amount) prev.amount = Number(tx.amount);

    if (tx.status === "DONE") {
      prev.isDone = true;
      if (!prev.approvedAt || new Date(tx.transactionAt) < new Date(prev.approvedAt)) {
        prev.approvedAt = tx.transactionAt;
      }
    } else if (tx.status === "CANCELED" || tx.status === "PARTIAL_CANCELED") {
      prev.isCanceled = true;
      if (!prev.canceledAt || new Date(tx.transactionAt) > new Date(prev.canceledAt)) {
        prev.canceledAt = tx.transactionAt;
      }
    }

    tossByOrderId.set(oid, prev);
  }

  const orderMap = new Map();
  for (const o of orders || []) {
    if (!o) continue;
    const key = String(o.order_id || o.toss_order_id || o.id || "");
    if (key) orderMap.set(key, { ...o, order_id: o.order_id || o.toss_order_id || key });
  }

  // Infer userId/userKey from existing local orders' Toss customerKey when browser is logged out
  let effectiveUserKey = String(userKey || "").trim();
  let effectiveUserId = String(userId || "").trim();
  if ((!effectiveUserKey || effectiveUserKey === "anonymous_default") && !effectiveUserId) {
    for (const oid of orderMap.keys()) {
      const matchedTx = tossByOrderId.get(oid);
      if (matchedTx?.customerKey) {
        effectiveUserId = matchedTx.customerKey;
        break;
      }
    }
  }

  // 1) Update existing orders & check older non-simulated Toss orders via /v1/payments/orders/{orderId}
  const olderChecks = [];
  for (const [oid, ord] of orderMap.entries()) {
    const tossInfo = tossByOrderId.get(oid);
    if (tossInfo) {
      if (tossInfo.isCanceled) {
        ord.status = "cancelled";
        ord.canceled_at = tossInfo.canceledAt || ord.canceled_at || new Date().toISOString();
      } else if (tossInfo.isDone && !isTerminalCancelStatus(ord.status)) {
        ord.status = "paid";
      }
      if (tossInfo.receiptUrl && !ord.receipt_url) {
        ord.receipt_url = tossInfo.receiptUrl;
      }
    } else {
      const isRealTossId =
        (oid.startsWith("HS-") || oid.startsWith("order_")) &&
        !oid.startsWith("SIM-") &&
        !oid.startsWith("TEST-") &&
        !String(ord.payment_method || "").includes("시뮬레이션");
      if (isRealTossId && ord.status === "paid") {
        olderChecks.push(oid);
      }
    }
  }

  syncDiag.orderChecks = olderChecks.length;

  await Promise.all(
    olderChecks.slice(0, 10).map(async (oid) => {
      try {
        const resp = await fetch(`${TOSS_API_BASE}/payments/orders/${encodeURIComponent(oid)}`, {
          method: "GET",
          headers,
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const target = orderMap.get(oid);
        if (!target) return;
        if (!effectiveUserId && data?.customerKey) {
          effectiveUserId = String(data.customerKey);
        }
        if (data?.status === "CANCELED" || data?.status === "ABORTED" || data?.status === "EXPIRED") {
          target.status = "cancelled";
          const lastCancel = Array.isArray(data.cancels) && data.cancels.length > 0
            ? data.cancels[data.cancels.length - 1]?.canceledAt
            : null;
          target.canceled_at = lastCancel || target.canceled_at || new Date().toISOString();
        }
      } catch (err) {
        syncDiag.errors.push(`ord_exc:${String(err?.message || err).slice(0, 60)}`);
      }
    })
  );

  // 2) Import any missing live Toss orders belonging to this user
  for (const [oid, tossInfo] of tossByOrderId.entries()) {
    if (orderMap.has(oid)) continue;
    if (!tossInfo.isDone && !tossInfo.isCanceled) continue;
    if (!doesCustomerKeyMatchUser(tossInfo.customerKey, effectiveUserKey, effectiveUserId)) continue;

    const meta = inferPlanFromOrder(oid, tossInfo.amount);
    const createdAt = tossInfo.approvedAt || tossInfo.canceledAt || new Date().toISOString();

    orderMap.set(oid, {
      id: new Date(createdAt).getTime() || Date.now(),
      order_id: oid,
      plan_type: meta.planType,
      plan_name: meta.planName,
      amount: tossInfo.amount,
      original_amount: meta.isUpgrade ? meta.basePrice : undefined,
      upgrade_credit: meta.isUpgrade ? meta.basePrice - tossInfo.amount : 0,
      is_upgrade: meta.isUpgrade,
      currency: "KRW",
      status: tossInfo.isCanceled ? "cancelled" : "paid",
      canceled_at: tossInfo.isCanceled ? tossInfo.canceledAt : undefined,
      payment_method: tossInfo.method || "토스페이먼츠",
      receipt_url: tossInfo.receiptUrl || null,
      created_at: createdAt,
    });
  }

  const finalOrders = Array.from(orderMap.values())
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 100);

  return { orders: finalOrders, syncDiag };
}

function deriveActivePlanFromOrders(orders, fallbackActivePlan) {
  const now = Date.now();
  let bestOrder = null;
  let bestTier = 0;

  for (const o of orders || []) {
    if (!o || o.status !== "paid") continue;
    const oid = String(o.order_id || "");
    const isGift =
      oid.startsWith("order_gift_") ||
      oid.startsWith("GIFT") ||
      String(o.payment_method || "").includes("선물") ||
      String(o.plan_name || "").includes("[선물]");
    if (isGift) continue;

    const meta = PLAN_META[o.plan_type] || PLAN_META.single_analysis;
    const createdMs = new Date(o.created_at || 0).getTime() || now;
    const expiresMs = createdMs + meta.days * 24 * 60 * 60 * 1000;
    if (expiresMs < now) continue;

    if (meta.tier > bestTier || (meta.tier === bestTier && !bestOrder)) {
      bestTier = meta.tier;
      bestOrder = { order: o, meta, expiresMs };
    }
  }

  if (!bestOrder) {
    // If all orders were cancelled or expired, clear activePlan
    if (Array.isArray(orders) && orders.length > 0) {
      return null;
    }
    return fallbackActivePlan || null;
  }

  const { order, meta, expiresMs } = bestOrder;
  return {
    plan_type: order.plan_type,
    plan_name: meta.name,
    analyses_remaining: meta.analyses,
    is_active: true,
    expires_at: new Date(expiresMs).toISOString().slice(0, 10),
    status: "paid",
    payment_method: order.payment_method || "토스페이먼츠",
    paid_at: order.created_at,
  };
}

export default async function handler(req, res) {
  loadStore();
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "GET") {
    const diagnosisId = req.query?.diagnosisId
      ? String(req.query.diagnosisId)
      : "";
    if (diagnosisId) {
      const found = memoryStore.diagnosesById[diagnosisId] || null;
      return res.status(200).json({ diagnosis: found });
    }

    const userKey = normalizeUserKey(req.query?.userKey);
    const bucket = ensureUserBucket(userKey);
    const { orders: reconciledOrders, syncDiag } = await reconcileOrdersWithToss(
      bucket.orders,
      userKey,
      req.query?.userId || ""
    );
    bucket.orders = reconciledOrders;
    bucket.activePlan = deriveActivePlanFromOrders(bucket.orders, bucket.activePlan);
    saveStore();

    return res.status(200).json({
      userKey,
      diagnoses: bucket.diagnoses || [],
      orders: bucket.orders || [],
      activePlan: bucket.activePlan,
      deletedDiagnosisIds: bucket.deletedDiagnosisIds || [],
      syncDiag,
      updatedAt: bucket.updatedAt,
    });
  }

  if (req.method === "POST") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

      // Logged-out localStorage order reconciliation (does not pollute shared anonymous bucket)
      if (body.reconcileOnly === true || !String(body.userKey || "").trim()) {
        const incomingOrders = Array.isArray(body.orders) ? body.orders : [];
        const { orders: reconciledOrders, syncDiag } = await reconcileOrdersWithToss(
          incomingOrders,
          "",
          String(body.userId || "").trim()
        );
        const reconciledPlan = deriveActivePlanFromOrders(
          reconciledOrders,
          body.activePlan || null
        );
        return res.status(200).json({
          success: true,
          reconcileOnly: true,
          orders: reconciledOrders,
          activePlan: reconciledPlan,
          syncDiag,
          updatedAt: new Date().toISOString(),
        });
      }

      const userKey = normalizeUserKey(body.userKey);
      const userId = String(body.userId || "").trim();
      const bucket = ensureUserBucket(userKey);

      const deletedSet = new Set(
        (bucket.deletedDiagnosisIds || []).map(String)
      );
      if (Array.isArray(body.deletedDiagnosisIds)) {
        body.deletedDiagnosisIds.forEach((id) => deletedSet.add(String(id)));
      }
      if (body.deleteDiagnosisId) {
        deletedSet.add(String(body.deleteDiagnosisId));
        delete memoryStore.diagnosesById[String(body.deleteDiagnosisId)];
      }

      bucket.deletedDiagnosisIds = Array.from(deletedSet).slice(-200);

      const incomingDiagnoses = Array.isArray(body.diagnoses)
        ? body.diagnoses
        : [];
      bucket.diagnoses = mergeDiagnoses(
        bucket.diagnoses,
        incomingDiagnoses,
        deletedSet
      );

      for (const d of bucket.diagnoses) {
        if (d && d.id) {
          memoryStore.diagnosesById[String(d.id)] = d;
        }
      }

      const incomingOrders = Array.isArray(body.orders) ? body.orders : [];
      const mergedOrders = mergeOrders(bucket.orders, incomingOrders);

      // Reconcile against live Toss Payments API (marks cancellations + imports missing live payments)
      const { orders: reconciledOrders, syncDiag } = await reconcileOrdersWithToss(
        mergedOrders,
        userKey,
        userId
      );
      bucket.orders = reconciledOrders;

      // Recompute activePlan from verified paid orders so canceled plans immediately deactivate
      bucket.activePlan = deriveActivePlanFromOrders(
        bucket.orders,
        body.activePlan || bucket.activePlan
      );

      bucket.updatedAt = new Date().toISOString();
      saveStore();

      return res.status(200).json({
        success: true,
        userKey,
        diagnoses: bucket.diagnoses,
        orders: bucket.orders,
        activePlan: bucket.activePlan,
        deletedDiagnosisIds: bucket.deletedDiagnosisIds,
        syncDiag,
        updatedAt: bucket.updatedAt,
      });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
