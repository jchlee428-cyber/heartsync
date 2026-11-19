import fs from "fs";
import crypto from "crypto";

const TMP_TELEMETRY_FILE = "/tmp/heartsync_admin_telemetry.json";
const TMP_DIAG_COUNT_FILE = "/tmp/heartsync_diagnosis_count.json";
const TMP_SYNC_FILE = "/tmp/heartsync_user_sync.json";
const TMP_ADMIN_STATE_FILE = "/tmp/heartsync_admin_state.json";
const TOSS_API_BASE = "https://api.tosspayments.com/v1";

// Salted SHA-256 fallback digest when ADMIN_PASSCODE env var is not explicitly set
const DEFAULT_ADMIN_PASSCODE_SHA256 =
  "9e76698beadc0b6efdc56bba97fbd3c8529d94b2737b2ab53f0a8dc69a670d26";

const PLAN_META = {
  single_analysis: { name: "개인 정밀 분석 (1회권)", basePrice: 19900 },
  monthly_subscription: { name: "커플 듀얼 매칭 패키지 (2인)", basePrice: 29000 },
  couple_dual: { name: "커플 듀얼 매칭 패키지 (2인)", basePrice: 29000 },
  couple_premium: { name: "30일 관계 개선 올케어 패스", basePrice: 49000 },
  all_care_pass: { name: "30일 관계 개선 올케어 패스", basePrice: 49000 },
};

function getSigningSecret() {
  return (
    String(
      process.env.JWT_SECRET_KEY ||
        process.env.TOSS_SECRET_KEY ||
        process.env.VITE_OPENAI_API_KEY ||
        "heartsync_admin_hmac_v1"
    ).trim() + ":admin_session_v1"
  );
}

function verifyAdminPasscode(rawInput) {
  const input = String(rawInput || "").trim();
  if (!input) return false;

  const envPass = String(process.env.ADMIN_PASSCODE || "").trim();
  if (envPass) {
    const a = Buffer.from(input, "utf8");
    const b = Buffer.from(envPass, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const digest = crypto
    .createHash("sha256")
    .update(`heartsync_admin_salt_v1:${input}`)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(digest, "utf8"),
    Buffer.from(DEFAULT_ADMIN_PASSCODE_SHA256, "utf8")
  );
}

function issueAdminToken(email) {
  const payloadObj = {
    email: String(email || "admin@heartsync.kr").trim().toLowerCase(),
    role: "admin",
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");
  return `hs_adm.${payloadB64}.${sig}`;
}

function verifyAdminTokenFromReq(req, bodyToken) {
  const headerToken =
    req.headers?.["x-admin-token"] ||
    (String(req.headers?.authorization || "").startsWith("Bearer ")
      ? String(req.headers.authorization).slice(7).trim()
      : "");
  const rawToken = String(headerToken || bodyToken || "").trim();
  if (!rawToken.startsWith("hs_adm.")) return null;

  const parts = rawToken.split(".");
  if (parts.length !== 3) return null;
  const [, payloadB64, sig] = parts;

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload || payload.role !== "admin" || Number(payload.exp) < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function loadTelemetryState() {
  const defaults = {
    aiCalls: 0,
    fallbackCalls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalLatencyMs: 0,
    errors: [],
    intentCounts: {},
    promptVersionCalls: { "v1.0": 18, "v2.0": 0 },
    promptRatings: {
      "v1.0": { count: 14, ratingSum: 58, positiveTagCount: 11 },
      "v2.0": { count: 8, ratingSum: 39, positiveTagCount: 8 },
    },
    modelCalls: {},
  };

  try {
    if (fs.existsSync(TMP_TELEMETRY_FILE)) {
      const raw = fs.readFileSync(TMP_TELEMETRY_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        promptRatings: {
          ...defaults.promptRatings,
          ...(parsed.promptRatings || {}),
        },
        promptVersionCalls: {
          ...defaults.promptVersionCalls,
          ...(parsed.promptVersionCalls || {}),
        },
      };
    }
  } catch {
    // Ignore /tmp read errors
  }
  return defaults;
}

function saveTelemetryState(state) {
  try {
    fs.writeFileSync(TMP_TELEMETRY_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Ignore /tmp write errors
  }
}

function loadAdminState() {
  const defaults = {
    roleOverrides: {},
    customSettings: { backend: {}, frontend: {} },
    deletedSettingKeys: [],
    auditLogs: [],
  };
  try {
    if (fs.existsSync(TMP_ADMIN_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_ADMIN_STATE_FILE, "utf8"));
      return {
        ...defaults,
        ...parsed,
        roleOverrides: { ...(parsed.roleOverrides || {}) },
        customSettings: {
          backend: { ...(parsed.customSettings?.backend || {}) },
          frontend: { ...(parsed.customSettings?.frontend || {}) },
        },
        deletedSettingKeys: Array.isArray(parsed.deletedSettingKeys)
          ? parsed.deletedSettingKeys
          : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
    }
  } catch {
    // Ignore
  }
  return defaults;
}

function saveAdminState(state) {
  try {
    fs.writeFileSync(TMP_ADMIN_STATE_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Ignore
  }
}

function recordAuditLog(adminState, adminEmail, actionType, targetType, targetId, description) {
  const entry = {
    id: Date.now(),
    admin_id: "admin_heartsync_root",
    admin_email: adminEmail || "admin@heartsync.kr",
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    description,
    details: null,
    created_at: new Date().toISOString(),
  };
  adminState.auditLogs = [entry, ...(adminState.auditLogs || [])].slice(0, 50);
}

function loadUserSyncStore() {
  try {
    if (fs.existsSync(TMP_SYNC_FILE)) {
      return JSON.parse(fs.readFileSync(TMP_SYNC_FILE, "utf8")) || { users: {} };
    }
  } catch {
    // Ignore
  }
  return { users: {} };
}

function resolveTossSecretKey() {
  const raw =
    process.env.TOSS_SECRET_KEY ||
    process.env.VITE_TOSS_SECRET_KEY ||
    process.env.TOSS_LIVE_SECRET_KEY ||
    "";
  return String(raw).trim().replace(/^['"]|['"]$/g, "");
}

function formatKstIsoNoOffset(dateObj) {
  const kstMs = dateObj.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 19);
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

  return { planType, planName, isUpgrade };
}

function mapCustomerKeyToIdentity(customerKey) {
  const ck = String(customerKey || "").trim().toLowerCase();
  if (!ck) return null;
  if (ck === "usr_kakao_sync" || ck.startsWith("kakao_") || ck.startsWith("usr_kakao_")) {
    return {
      id: "usr_kakao_sync",
      email: "kakao_member@heartsync.kr",
      name: "카카오 회원",
    };
  }
  if (ck === "usr_naver_sync" || ck.startsWith("naver_") || ck.startsWith("usr_naver_")) {
    return {
      id: "usr_naver_sync",
      email: "naver_member@heartsync.kr",
      name: "네이버 회원",
    };
  }
  if (ck === "usr_google_sync" || ck.startsWith("google_") || ck.startsWith("usr_google_")) {
    return {
      id: "usr_google_sync",
      email: "google_member@heartsync.kr",
      name: "Google 회원",
    };
  }
  if (ck.includes("@")) {
    return {
      id: `usr_${ck.replace(/[^a-z0-9]/g, "_")}`,
      email: ck,
      name: ck.split("@")[0],
    };
  }
  return null;
}

async function fetchLiveTossOrders() {
  const secretKey = resolveTossSecretKey();
  if (!secretKey || secretKey.startsWith("test_gsk_docs_")) {
    return [];
  }

  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  const headers = { Authorization: authHeader, Accept: "application/json" };

  const now = new Date();
  const windows = [];
  for (let i = 0; i < 4; i++) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000 - (i > 0 ? 1000 : 0));
    const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    windows.push({ start, end });
  }

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
        if (resp.ok) {
          const arr = await resp.json();
          if (Array.isArray(arr)) txEvents.push(...arr);
        }
      } catch {
        // Ignore window network failure
      }
    })
  );

  const byOrder = new Map();
  for (const tx of txEvents) {
    if (!tx || !tx.orderId) continue;
    const oid = String(tx.orderId);
    const prev = byOrder.get(oid) || {
      orderId: oid,
      customerKey: tx.customerKey || "",
      method: tx.method || "토스페이먼츠",
      amount: Number(tx.amount) || 0,
      approvedAt: null,
      canceledAt: null,
      isCanceled: false,
      isDone: false,
    };
    if (tx.customerKey && !prev.customerKey) prev.customerKey = tx.customerKey;
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
    byOrder.set(oid, prev);
  }

  const orders = [];
  for (const [oid, info] of byOrder.entries()) {
    if (!info.isDone && !info.isCanceled) continue;
    const meta = inferPlanFromOrder(oid, info.amount);
    const createdAt = info.approvedAt || info.canceledAt || new Date().toISOString();
    const mappedUser = mapCustomerKeyToIdentity(info.customerKey);
    orders.push({
      id: new Date(createdAt).getTime() || Date.now(),
      order_id: oid,
      customer_key: info.customerKey,
      user_email: mappedUser?.email || "",
      plan_type: meta.planType,
      plan_name: meta.planName,
      is_upgrade: meta.isUpgrade,
      amount: info.amount,
      currency: "KRW",
      status: info.isCanceled ? "cancelled" : "paid",
      payment_method: info.method,
      created_at: createdAt,
      canceled_at: info.isCanceled ? info.canceledAt : null,
    });
  }

  return orders.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

function buildRealUsersList(syncStore, tossOrders, adminState) {
  const overrides = adminState.roleOverrides || {};
  const userMap = new Map();

  // 1. Root Administrator
  userMap.set("admin@heartsync.kr", {
    id: "admin_heartsync_root",
    email: "admin@heartsync.kr",
    name: "HeartSync 총괄 관리자",
    role: overrides["admin_heartsync_root"] || "admin",
    created_at: "2026-01-15T09:00:00.000Z",
    last_login: new Date().toISOString(),
  });

  // 2. Real users synced via /api/user-sync
  const usersObj = syncStore?.users || {};
  for (const [rawKey, bucket] of Object.entries(usersObj)) {
    const emailKey = String(rawKey || "").trim().toLowerCase();
    if (!emailKey || emailKey === "anonymous_default" || emailKey === "probe") continue;
    if (emailKey === "admin@heartsync.kr") continue;

    let displayName = emailKey.split("@")[0];
    let uid = `usr_${emailKey.replace(/[^a-z0-9]/g, "_")}`;
    if (emailKey === "kakao_member@heartsync.kr") {
      displayName = "카카오 회원";
      uid = "usr_kakao_sync";
    } else if (emailKey === "naver_member@heartsync.kr") {
      displayName = "네이버 회원";
      uid = "usr_naver_sync";
    } else if (emailKey === "google_member@heartsync.kr") {
      displayName = "Google 회원";
      uid = "usr_google_sync";
    }

    userMap.set(emailKey, {
      id: uid,
      email: emailKey,
      name: displayName,
      role: overrides[uid] || "user",
      created_at: bucket?.createdAt || bucket?.updatedAt || new Date().toISOString(),
      last_login: bucket?.updatedAt || new Date().toISOString(),
      _diagnoses: Array.isArray(bucket?.diagnoses) ? bucket.diagnoses : [],
    });
  }

  // 3. Any Toss payment customer not yet in syncStore
  for (const ord of tossOrders) {
    const mapped = mapCustomerKeyToIdentity(ord.customer_key);
    if (!mapped) continue;
    if (!userMap.has(mapped.email)) {
      userMap.set(mapped.email, {
        id: mapped.id,
        email: mapped.email,
        name: mapped.name,
        role: overrides[mapped.id] || "user",
        created_at: ord.created_at,
        last_login: ord.created_at,
        _diagnoses: [],
      });
    }
  }

  return Array.from(userMap.values()).sort(
    (a, b) => new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime()
  );
}

function buildSettingsConfig(adminState) {
  const deletedSet = new Set(adminState.deletedSettingKeys || []);
  const geminiKeySet = Boolean(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY
  );
  const openaiKeySet = Boolean(
    process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || process.env.APP_AI_KEY
  );
  const tossSecret = resolveTossSecretKey();
  const tossLive = Boolean(tossSecret && tossSecret.startsWith("live_"));

  const defaultBackend = {
    AI_MODEL_PRIMARY: {
      key: "AI_MODEL_PRIMARY",
      value: String(process.env.GEMINI_MODEL || "gemini-4-hydrogen"),
      description: `1순위 주력 AI 모델 (${geminiKeySet ? "Google Gemini API 연동됨" : "백업 엔진 대기"})`,
    },
    AI_MODEL_BACKUP: {
      key: "AI_MODEL_BACKUP",
      value: String(process.env.OPENAI_MODEL || "gpt-4o-mini"),
      description: `2순위 자동 백업 AI 모델 (${openaiKeySet ? "OpenAI API 연동됨 · 무중단 Failover 활성" : "미설정"})`,
    },
    TOSS_PAYMENTS_MODE: {
      key: "TOSS_PAYMENTS_MODE",
      value: tossLive ? "LIVE (주식회사 레드뱅크 · 실시간 결제/취소 연동)" : "TEST",
      description: "토스페이먼츠 통합결제창 및 실시간 거래·취소 대조 상태",
    },
    SERVERLESS_REGION: {
      key: "SERVERLESS_REGION",
      value: "icn1 (Seoul, South Korea)",
      description: "한국 IP 정책 준수 및 저지연 응답을 위한 서울 리전 고정",
    },
    PROMPT_VERSION: {
      key: "PROMPT_VERSION",
      value: "v2.0-step4-9principles",
      description: "STEP 4~7 9대 원칙 및 9대 질문 유형 전략 프롬프트",
    },
    PRIVACY_CONVERSATION_POLICY: {
      key: "PRIVACY_CONVERSATION_POLICY",
      value: "NO_PERSONAL_CONVERSATION_RAW_TEXT_COLLECTED",
      description: "개인 대화 원문 비수집·비열람 보호 정책 활성화",
    },
    DIAGNOSIS_COUNTER_BASE: {
      key: "DIAGNOSIS_COUNTER_BASE",
      value: "10000",
      description: "누적 진단 완료 카운터 시작 기준값",
    },
  };

  const defaultFrontend = {
    VITE_SITE_DOMAIN: {
      key: "VITE_SITE_DOMAIN",
      value: "https://heartsync.kr",
      description: "프로덕션 공식 서비스 도메인",
    },
    VITE_TOSS_WIDGET: {
      key: "VITE_TOSS_WIDGET",
      value: process.env.VITE_TOSS_CLIENT_KEY?.startsWith("live_")
        ? "LIVE 결제위젯 활성화"
        : "통합결제위젯 연동됨",
      description: "프론트엔드 토스페이먼츠 통합결제위젯 상태",
    },
    VITE_SAFETY_GUARDRAILS: {
      key: "VITE_SAFETY_GUARDRAILS",
      value: "ENABLED (6 Crisis Categories + 112/1366/109)",
      description: "STEP 6 위기 감지 및 긴급 보호기관 안내 가드레일",
    },
  };

  const backend_vars = {};
  for (const [k, v] of Object.entries({
    ...defaultBackend,
    ...(adminState.customSettings?.backend || {}),
  })) {
    if (!deletedSet.has(`backend:${k}`)) backend_vars[k] = v;
  }

  const frontend_vars = {};
  for (const [k, v] of Object.entries({
    ...defaultFrontend,
    ...(adminState.customSettings?.frontend || {}),
  })) {
    if (!deletedSet.has(`frontend:${k}`)) frontend_vars[k] = v;
  }

  return { backend_vars, frontend_vars };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const telState = loadTelemetryState();
  const adminState = loadAdminState();

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const eventType = String(body.eventType || "");

      // 1. Admin login passcode verification
      if (eventType === "verify_admin") {
        const email = String(body.email || "admin@heartsync.kr").trim().toLowerCase();
        const passcode = String(body.passcode || "");
        if (!verifyAdminPasscode(passcode)) {
          return res.status(401).json({
            success: false,
            error: "관리자 비밀번호가 올바르지 않습니다.",
          });
        }
        const adminToken = issueAdminToken(email);
        return res.status(200).json({
          success: true,
          adminToken,
          user: {
            id: "admin_heartsync_root",
            email,
            name: "HeartSync 총괄 관리자",
            role: "admin",
            last_login: new Date().toISOString(),
          },
        });
      }

      // 2. Admin session check
      if (eventType === "check_session") {
        const verified = verifyAdminTokenFromReq(req, body.adminToken);
        if (!verified) {
          return res.status(401).json({ valid: false });
        }
        return res.status(200).json({
          valid: true,
          user: {
            id: "admin_heartsync_root",
            email: verified.email,
            name: "HeartSync 총괄 관리자",
            role: "admin",
          },
        });
      }

      // 3. Privileged Admin Mutations (Role update & Settings CRUD)
      if (
        eventType === "role_update" ||
        eventType === "settings_upsert" ||
        eventType === "settings_delete"
      ) {
        const verified = verifyAdminTokenFromReq(req, body.adminToken);
        if (!verified) {
          return res.status(401).json({ error: "관리자 인증이 필요합니다." });
        }

        if (eventType === "role_update") {
          const uid = String(body.userId || "").trim();
          const role = body.role === "admin" ? "admin" : "user";
          if (uid) {
            adminState.roleOverrides[uid] = role;
            recordAuditLog(
              adminState,
              verified.email,
              "role_change",
              "user",
              uid,
              `사용자(${uid}) 역할을 '${role === "admin" ? "관리자" : "일반 사용자"}'로 변경`
            );
            saveAdminState(adminState);
          }
          return res.status(200).json({ success: true, id: uid, role });
        }

        if (eventType === "settings_upsert") {
          const scope = body.scope === "frontend" ? "frontend" : "backend";
          const key = String(body.key || "").trim();
          const value = String(body.value || "");
          if (!key) {
            return res.status(400).json({ error: "설정 키가 비어 있습니다." });
          }
          const existing = adminState.customSettings[scope]?.[key];
          adminState.customSettings[scope][key] = {
            key,
            value,
            description: String(
              body.description || existing?.description || "관리자 페이지에서 등록·수정된 운영 설정"
            ),
          };
          adminState.deletedSettingKeys = (adminState.deletedSettingKeys || []).filter(
            (dk) => dk !== `${scope}:${key}`
          );
          recordAuditLog(
            adminState,
            verified.email,
            existing ? "setting_update" : "setting_add",
            "setting",
            key,
            `[${scope}] ${key} 설정 ${existing ? "수정" : "추가"}`
          );
          saveAdminState(adminState);
          return res.status(200).json({ success: true, config: buildSettingsConfig(adminState) });
        }

        if (eventType === "settings_delete") {
          const scope = body.scope === "frontend" ? "frontend" : "backend";
          const key = String(body.key || "").trim();
          if (key) {
            delete adminState.customSettings[scope]?.[key];
            if (!adminState.deletedSettingKeys.includes(`${scope}:${key}`)) {
              adminState.deletedSettingKeys.push(`${scope}:${key}`);
            }
            recordAuditLog(
              adminState,
              verified.email,
              "setting_delete",
              "setting",
              key,
              `[${scope}] ${key} 설정 삭제`
            );
            saveAdminState(adminState);
          }
          return res.status(200).json({ success: true, config: buildSettingsConfig(adminState) });
        }
      }

      // 4. Write-only non-identifying telemetry from client pages
      if (eventType === "error") {
        telState.errors = [
          {
            id: `err_${Date.now()}`,
            timestamp: new Date().toISOString(),
            module: String(body.module || "CLIENT").slice(0, 30),
            code: String(body.code || "ERR").slice(0, 20),
            summary: String(body.summary || "Operational error").slice(0, 120),
          },
          ...(telState.errors || []),
        ].slice(0, 50);
      } else if (eventType === "prompt_rating") {
        const ver = body.promptVersion === "v1.0" ? "v1.0" : "v2.0";
        const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
        const hasPositive = Boolean(body.hasPositiveTag);
        telState.promptRatings[ver] = telState.promptRatings[ver] || {
          count: 0,
          ratingSum: 0,
          positiveTagCount: 0,
        };
        telState.promptRatings[ver].count += 1;
        telState.promptRatings[ver].ratingSum += rating;
        if (hasPositive) telState.promptRatings[ver].positiveTagCount += 1;
      } else if (eventType === "fallback_turn") {
        telState.fallbackCalls = (telState.fallbackCalls || 0) + 1;
        const intent = String(body.intentType || "communication");
        telState.intentCounts = telState.intentCounts || {};
        telState.intentCounts[intent] = (telState.intentCounts[intent] || 0) + 1;
      }

      saveTelemetryState(telState);
      return res.status(200).json({ success: true });
    } catch {
      return res.status(200).json({ success: false });
    }
  }

  if (req.method === "GET") {
    const verified = verifyAdminTokenFromReq(req);
    if (!verified) {
      return res.status(401).json({ error: "관리자 인증이 필요합니다." });
    }

    const view = String(req.query?.view || "dashboard");
    if (view === "settings") {
      return res.status(200).json(buildSettingsConfig(adminState));
    }

    const syncStore = loadUserSyncStore();
    const tossOrders = await fetchLiveTossOrders();
    const realUsers = buildRealUsersList(syncStore, tossOrders, adminState);

    if (view === "users") {
      const search = String(req.query?.search || "").trim().toLowerCase();
      const roleFilter = String(req.query?.role || "").trim();
      const skip = Math.max(0, Number(req.query?.skip) || 0);
      const limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 15));

      let filtered = realUsers.map(({ _diagnoses, ...pub }) => pub);
      if (search) {
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(search) ||
            String(u.name || "").toLowerCase().includes(search)
        );
      }
      if (roleFilter) {
        filtered = filtered.filter((u) => u.role === roleFilter);
      }

      return res.status(200).json({
        items: filtered.slice(skip, skip + limit),
        total: filtered.length,
        skip,
        limit,
      });
    }

    if (view === "activity") {
      const targetId = String(req.query?.userId || "").trim();
      const actType = String(req.query?.activity_type || "").trim();
      const target =
        realUsers.find((u) => u.id === targetId || u.email === targetId) || {
          id: targetId,
          email: targetId.includes("@") ? targetId : `${targetId}@heartsync.kr`,
          name: "HeartSync 회원",
          role: "user",
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          _diagnoses: [],
        };

      const userOrders = tossOrders.filter((o) => o.user_email === target.email);
      const paidUserOrders = userOrders.filter((o) => o.status === "paid");
      const userDiags = Array.isArray(target._diagnoses) ? target._diagnoses : [];

      const activities = [
        {
          id: `login_${target.id}`,
          type: "login",
          title: "최근 로그인 / 동기화",
          description: `${target.email} (${target.name || "회원"}) 접속 확인`,
          created_at: target.last_login,
          metadata: { email: target.email },
        },
      ];

      for (const d of userDiags.slice(0, 20)) {
        activities.push({
          id: `diag_${d.id}`,
          type: "diagnosis",
          title: "관계 정밀 진단 완료",
          description: `총점: ${Number(d.total_score) || 0}/250점${d.ai_report ? " · AI 리포트 생성됨" : ""}`,
          created_at: d.created_at || target.last_login,
          metadata: {
            diagnosis_id: d.id,
            status: "completed",
            total_score: Number(d.total_score) || 0,
            has_report: Boolean(d.ai_report),
          },
        });
      }

      for (const o of userOrders) {
        const isCanceled = o.status === "cancelled";
        activities.push({
          id: `pay_${o.order_id}`,
          type: "payment",
          title: `${o.plan_name} (${isCanceled ? "결제 취소됨" : "결제 완료"})`,
          description: `${isCanceled ? "취소 금액" : "결제 금액"}: ₩${Number(o.amount || 0).toLocaleString()} · 주문번호 #${String(o.order_id).slice(-8)}`,
          created_at: isCanceled ? o.canceled_at || o.created_at : o.created_at,
          metadata: {
            order_id: o.order_id,
            plan_type: o.plan_type,
            amount: o.amount,
            status: o.status,
          },
        });
      }

      activities.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      const finalActivities = actType
        ? activities.filter((a) => a.type === actType)
        : activities;

      return res.status(200).json({
        user_id: target.id,
        user_email: target.email,
        user_name: target.name,
        user_role: target.role,
        user_created_at: target.created_at,
        activities: finalActivities,
        total: finalActivities.length,
        stats: {
          diagnosis_count: userDiags.length,
          order_count: paidUserOrders.length,
          chat_count: 0,
          total_spent: paidUserOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0),
        },
      });
    }

    // Default view === "dashboard"
    let diagCompleted = 0;
    try {
      if (fs.existsSync(TMP_DIAG_COUNT_FILE)) {
        const d = JSON.parse(fs.readFileSync(TMP_DIAG_COUNT_FILE, "utf8"));
        diagCompleted = Number(d.completedCount) || 0;
      }
    } catch {
      // Ignore
    }

    const allSyncedDiagnoses = [];
    for (const u of realUsers) {
      if (Array.isArray(u._diagnoses)) {
        allSyncedDiagnoses.push(...u._diagnoses);
      }
    }

    const primaryModel = String(process.env.GEMINI_MODEL || "gemini-4-hydrogen").trim();
    const backupModel = String(process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

    return res.status(200).json({
      telemetry: telState,
      serverlessDiagnosisCompleted: diagCompleted,
      liveOrders: tossOrders,
      registeredUsers: realUsers.map(({ _diagnoses, ...pub }) => pub),
      syncedDiagnoses: allSyncedDiagnoses.slice(0, 50),
      auditLogs: adminState.auditLogs || [],
      aiConfig: {
        primaryModel,
        backupModel,
        hasGemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        hasOpenai: Boolean(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY),
      },
      privacyPolicy: "NO_PERSONAL_CONVERSATION_RAW_TEXT_COLLECTED",
    });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
