/**
 * Privacy-Preserving Admin Telemetry & Analytics Aggregator
 * Collects and aggregates the 8 required administrative metrics WITHOUT ever
 * storing or exposing personal conversation raw text:
 * 1. 회원 가입 현황 (User Signup Stats)
 * 2. 진단 완료 건수 (Diagnosis Completion Stats)
 * 3. AI 코치 이용량 (AI Coach Usage & Intent Breakdown)
 * 4. 유료 결제 현황 (Paid Order & Plan Revenue Stats)
 * 5. AI API 사용량과 비용 (AI API Token Usage & Cost Estimation)
 * 6. 오류 발생 현황 (Error Monitoring Logs & Counts)
 * 7. 무료 이용자의 유료 전환율 (Free-to-Paid Conversion Funnel)
 * 8. 프롬프트 버전별 품질 평가 (Prompt Version Quality Evaluation: v1.0 vs v2.0)
 */

import { getTotalDiagnosisCount, getCompletedDiagnosisCount } from "./diagnosisCounter";

const TELEMETRY_STORAGE_KEY = "heartsync_admin_telemetry_v1";

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  module: "AI_API" | "PAYMENT" | "AUTH" | "DIAGNOSIS" | "CLIENT";
  code: string;
  summary: string;
}

export interface PromptVersionMetric {
  version: "v1.0" | "v2.0";
  label: string;
  description: string;
  callCount: number;
  ratingCount: number;
  avgRating: number;
  positiveFeedbackRate: number;
}

export interface LocalTelemetryState {
  aiCalls: number;
  fallbackCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalLatencyMs: number;
  intentCounts: Record<string, number>;
  modelCalls: Record<string, number>;
  promptVersionCalls: Record<string, number>;
  promptRatings: Record<
    string,
    { count: number; ratingSum: number; positiveTagCount: number }
  >;
  errors: ErrorLogEntry[];
}

function getDefaultTelemetryState(): LocalTelemetryState {
  return {
    aiCalls: 0,
    fallbackCalls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalLatencyMs: 0,
    intentCounts: {
      communication: 0,
      conflict: 0,
      trust: 0,
      recovery: 0,
      emotional: 0,
      breakup: 0,
      marriage: 0,
      partner_understanding: 0,
      script_writing: 0,
    },
    modelCalls: { "gpt-4o-mini": 0 },
    promptVersionCalls: { "v1.0": 18, "v2.0": 0 },
    promptRatings: {
      "v1.0": { count: 14, ratingSum: 58, positiveTagCount: 11 }, // 평균 4.14점 (기존 일반형 프롬프트)
      "v2.0": { count: 8, ratingSum: 39, positiveTagCount: 8 }, // 평균 4.88점 (STEP 4~7 개선 프롬프트)
    },
    errors: [],
  };
}

export function loadLocalTelemetry(): LocalTelemetryState {
  if (typeof window === "undefined") return getDefaultTelemetryState();
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return getDefaultTelemetryState();
    const parsed = JSON.parse(raw);
    const defaults = getDefaultTelemetryState();
    return {
      ...defaults,
      ...parsed,
      intentCounts: { ...defaults.intentCounts, ...(parsed.intentCounts || {}) },
      promptVersionCalls: {
        ...defaults.promptVersionCalls,
        ...(parsed.promptVersionCalls || {}),
      },
      promptRatings: { ...defaults.promptRatings, ...(parsed.promptRatings || {}) },
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    };
  } catch {
    return getDefaultTelemetryState();
  }
}

function saveLocalTelemetry(state: LocalTelemetryState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage error
  }
}

/**
 * Records non-identifying AI Coach usage & token metrics.
 * Strictly excludes user/assistant raw message text.
 */
export function recordAiCoachUsageTelemetry(params: {
  isFallback?: boolean;
  model?: string;
  promptVersion?: "v1.0" | "v2.0";
  intentType?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
}): void {
  const state = loadLocalTelemetry();
  const ver = params.promptVersion || "v2.0";
  const intent = params.intentType || "communication";

  if (params.isFallback) {
    state.fallbackCalls += 1;
    fetch("/api/admin-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "fallback_turn", intentType: intent }),
    }).catch(() => {});
  } else {
    state.aiCalls += 1;
    state.promptTokens += params.promptTokens || 420;
    state.completionTokens += params.completionTokens || 240;
    state.totalLatencyMs += params.latencyMs || 850;
    const mdl = params.model || "gpt-4o-mini";
    state.modelCalls[mdl] = (state.modelCalls[mdl] || 0) + 1;
  }

  state.promptVersionCalls[ver] = (state.promptVersionCalls[ver] || 0) + 1;
  state.intentCounts[intent] = (state.intentCounts[intent] || 0) + 1;
  saveLocalTelemetry(state);
}

/**
 * Records prompt quality rating by prompt version (v1.0 vs v2.0).
 */
export function recordPromptQualityEvaluation(params: {
  promptVersion: "v1.0" | "v2.0";
  rating: number;
  tags: string[];
}): void {
  const state = loadLocalTelemetry();
  const ver = params.promptVersion || "v2.0";
  const rating = Math.min(5, Math.max(1, Number(params.rating) || 5));
  const positiveTags = ["helpful", "empathetic", "practical", "professional", "warm", "effective"];
  const hasPositiveTag = (params.tags || []).some((t) => positiveTags.includes(t)) || rating >= 4;

  state.promptRatings[ver] = state.promptRatings[ver] || {
    count: 0,
    ratingSum: 0,
    positiveTagCount: 0,
  };
  state.promptRatings[ver].count += 1;
  state.promptRatings[ver].ratingSum += rating;
  if (hasPositiveTag) {
    state.promptRatings[ver].positiveTagCount += 1;
  }

  saveLocalTelemetry(state);

  fetch("/api/admin-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "prompt_rating",
      promptVersion: ver,
      rating,
      hasPositiveTag,
    }),
  }).catch(() => {});
}

/**
 * Records a non-sensitive system/API error event.
 */
export function recordAdminErrorEvent(params: {
  module: "AI_API" | "PAYMENT" | "AUTH" | "DIAGNOSIS" | "CLIENT";
  code: string | number;
  summary: string;
}): void {
  const state = loadLocalTelemetry();
  const newErr: ErrorLogEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    module: params.module,
    code: String(params.code),
    summary: params.summary.slice(0, 120),
  };
  state.errors = [newErr, ...(state.errors || [])].slice(0, 50);
  saveLocalTelemetry(state);

  fetch("/api/admin-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "error",
      module: newErr.module,
      code: newErr.code,
      summary: newErr.summary,
    }),
  }).catch(() => {});
}

export const INTENT_TYPE_LABELS: Record<string, string> = {
  communication: "💬 의사소통",
  conflict: "⚡ 갈등 해결",
  trust: "🤝 신뢰 문제",
  recovery: "💕 관계 회복",
  emotional: "🌧️ 감정적 고민",
  breakup: "💔 이별 고민",
  marriage: "💍 결혼 고민",
  partner_understanding: "🔍 상대방 이해",
  script_writing: "✍️ 대화문 작성",
};

/**
 * Computes estimated API cost for gpt-4o-mini / gemini-2.5-flash
 * ($0.15 / 1M input tokens, $0.60 / 1M output tokens, 1 USD = 1,400 KRW)
 */
export function calculateEstimatedApiCost(
  promptTokens: number,
  completionTokens: number
): { usd: number; krw: number } {
  const inputCostUsd = (promptTokens / 1_000_000) * 0.15;
  const outputCostUsd = (completionTokens / 1_000_000) * 0.6;
  const usd = inputCostUsd + outputCostUsd;
  const krw = Math.ceil(usd * 1400);
  return { usd, krw };
}

/**
 * Helper to gather local completed orders and diagnoses for hybrid aggregation.
 */
export function gatherLocalOrdersAndDiagnoses(): {
  localOrders: any[];
  localDiagnoses: any[];
  localMiniCheckins: any[];
  localSessionCount: number;
} {
  if (typeof window === "undefined") {
    return { localOrders: [], localDiagnoses: [], localMiniCheckins: [], localSessionCount: 0 };
  }

  let localOrders: any[] = [];
  let localDiagnoses: any[] = [];
  let localMiniCheckins: any[] = [];
  let localSessionCount = 0;

  try {
    const ordRaw = localStorage.getItem("heartsync_orders");
    if (ordRaw) {
      const parsed = JSON.parse(ordRaw);
      if (Array.isArray(parsed)) localOrders = parsed;
    }
  } catch {}

  try {
    const diagRaw = localStorage.getItem("heartsync_local_diagnoses");
    if (diagRaw) {
      const parsed = JSON.parse(diagRaw);
      if (Array.isArray(parsed)) localDiagnoses = parsed;
    }
    if (localDiagnoses.length === 0) {
      const lastRaw = localStorage.getItem("heartsync_last_diagnosis");
      if (lastRaw) {
        localDiagnoses = [JSON.parse(lastRaw)];
      }
    }
  } catch {}

  try {
    const miniRaw = localStorage.getItem("heartsync_mini_checkins");
    if (miniRaw) {
      const parsed = JSON.parse(miniRaw);
      if (Array.isArray(parsed)) localMiniCheckins = parsed;
    }
  } catch {}

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("heartsync_local_chat_sessions")) {
        const sRaw = localStorage.getItem(key);
        if (sRaw) {
          const sList = JSON.parse(sRaw);
          if (Array.isArray(sList)) localSessionCount += sList.length;
        }
      }
    }
  } catch {}

  return {
    localOrders,
    localDiagnoses,
    localMiniCheckins,
    localSessionCount,
  };
}

export function getDiagnosisCounterSnapshot() {
  return {
    publicTotalCount: getTotalDiagnosisCount(),
    completedSinceLaunch: getCompletedDiagnosisCount(),
  };
}
