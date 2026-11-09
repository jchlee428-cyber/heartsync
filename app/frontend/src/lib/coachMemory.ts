/**
 * STEP 5. AI Coach Memory & Personalization System
 * - Summarizes and remembers relationship context so users don't repeat themselves
 * - Integrates:
 *   1) 최근 진단 결과
 *   2) 사용자가 설명한 관계 상황
 *   3) 이전 질문과 답변의 핵심 요약
 *   4) 이전 개선 계획 (7일/30일)
 *   5) 개선 계획의 실행 여부
 *   6) 사용자의 새로운 고민
 * - Enforces:
 *   - User consent check (동의 기반 최소 정보만 저장)
 *   - Sensitive content filtering (폭력·학대·자해·개인식별번호 저장 금지)
 *   - Strict per-user storage isolation & ownership verification (타 사용자 정보 혼입 방지)
 */

import { detectSafetyCrisis } from "./safetyGuardrails";
import {
  loadOrCreateProgramPlan,
  getProgramProgressSummary,
} from "./improvementProgram";

export interface QaSummaryItem {
  intentType: string;
  questionSummary: string;
  answerKeyPoint: string;
  timestamp: string;
}

export interface CoachMemoryProfile {
  userId: string;
  consentEnabled: boolean;
  relationshipSituations: string[]; // 예: "부부 관계", "연락 빈도 갈등", "파트너 회피 성향"
  recentQaSummaries: QaSummaryItem[]; // 최근 질문·답변 핵심 요약 (최대 5건)
  latestConcern: string; // 사용자의 새로운 고민 요약
  updatedAt: string;
}

function getScopedMemoryKey(userId: string): string {
  const safeId = (userId || "guest").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return `heartsync_coach_memory_v1_${safeId}`;
}

function getScopedConsentKey(userId: string): string {
  const safeId = (userId || "guest").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return `heartsync_memory_consent_v1_${safeId}`;
}

/**
 * Masks PII (phone numbers, RRN, account numbers) and strips overly long raw text.
 */
export function sanitizeSensitiveText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b01[016789]-?\d{3,4}-?\d{4}\b/g, "[연락처비공개]")
    .replace(/\b\d{6}-?[1-4]\d{6}\b/g, "[주민번호비공개]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[이메일비공개]")
    .replace(/\b\d{3,6}-\d{2,6}-\d{3,6}\b/g, "[계좌비공개]")
    .trim();
}

export function getMemoryConsent(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(getScopedConsentKey(userId));
    if (val === null) return true; // 기본 활성화하되 UI에서 언제든 OFF 및 삭제 가능
    return val === "true";
  } catch {
    return true;
  }
}

export function setMemoryConsent(userId: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getScopedConsentKey(userId), String(enabled));
    if (!enabled) {
      clearCoachMemory(userId);
    }
  } catch {
    // Ignore
  }
}

export function clearCoachMemory(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getScopedMemoryKey(userId));
  } catch {
    // Ignore
  }
}

export function loadCoachMemory(userId: string): CoachMemoryProfile | null {
  if (typeof window === "undefined" || !userId) return null;
  if (!getMemoryConsent(userId)) return null;

  try {
    const raw = localStorage.getItem(getScopedMemoryKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachMemoryProfile;

    // Strict user access ownership verification
    if (!parsed || parsed.userId !== userId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Extracts non-sensitive relationship situation tags from user messages
 * so the user doesn't have to re-explain their situation every turn.
 */
function extractRelationshipSituationTags(message: string, existing: string[]): string[] {
  const tags = new Set<string>(existing);
  const clean = message.trim();

  if (/남편|아내|와이프|신랑|결혼\s*\d+년|부부|시댁|처가|육아/.test(clean)) {
    tags.add("기혼/부부 관계");
  } else if (/남자친구|여자친구|남친|여친|연애\s*\d+년|연인|커플/.test(clean)) {
    tags.add("연인/교제 관계");
  }

  const yearMatch = clean.match(/(\d+)\s*(년|개월)\s*(차|째|만나|연애|결혼)/);
  if (yearMatch) {
    tags.add(`관계 기간 약 ${yearMatch[1]}${yearMatch[2]}`);
  }

  if (/장거리|롱디/.test(clean)) tags.add("장거리 연애(롱디)");
  if (/동거/.test(clean)) tags.add("동거 중");
  if (/결혼\s*준비|예비\s*부부|파혼/.test(clean)) tags.add("결혼 준비 과정");
  if (/연락|읽씹|답장/.test(clean)) tags.add("연락 빈도·온도 차이 고민");
  if (/말투|짜증|화내|비난/.test(clean)) tags.add("대화 말투·감정적 다툼 고민");
  if (/회피|동굴|입을\s*다물|침묵/.test(clean)) tags.add("갈등 시 회피·침묵 패턴");
  if (/권태기|설렘|소원/.test(clean)) tags.add("권태기·정서적 거리감 고민");
  if (/신뢰|거짓말|이성\s*문제|불안/.test(clean)) tags.add("신뢰 회복·불안감 고민");

  return Array.from(tags).slice(-8);
}

/**
 * Updates the user's personalized coach memory after a conversation turn,
 * respecting user consent and filtering out any sensitive/crisis content.
 */
export function updateCoachMemoryFromTurn(params: {
  userId: string;
  userMessage: string;
  assistantReply: string;
  intentType: string;
}): CoachMemoryProfile | null {
  const { userId, userMessage, assistantReply, intentType } = params;
  if (!userId || !getMemoryConsent(userId)) return null;

  // Never store crisis/abuse/self-harm messages in persistent memory
  const crisisCheck = detectSafetyCrisis(userMessage);
  if (crisisCheck.isCrisis) {
    return loadCoachMemory(userId);
  }

  const safeUserMsg = sanitizeSensitiveText(userMessage);
  const safeAssistantMsg = sanitizeSensitiveText(assistantReply);
  if (safeUserMsg.length < 2) return loadCoachMemory(userId);

  const current = loadCoachMemory(userId) || {
    userId,
    consentEnabled: true,
    relationshipSituations: [],
    recentQaSummaries: [],
    latestConcern: "",
    updatedAt: new Date().toISOString(),
  };

  const updatedSituations = extractRelationshipSituationTags(
    safeUserMsg,
    current.relationshipSituations
  );

  const qShort = safeUserMsg.length > 70 ? `${safeUserMsg.slice(0, 70)}...` : safeUserMsg;
  const firstSentenceOfAnswer =
    safeAssistantMsg
      .replace(/> 💬/g, "")
      .split(/[\n.!?]/)[0]
      ?.trim()
      .slice(0, 80) || "맞춤 대화법 및 실천 행동 제안";

  const newSummary: QaSummaryItem = {
    intentType,
    questionSummary: qShort,
    answerKeyPoint: firstSentenceOfAnswer,
    timestamp: new Date().toISOString(),
  };

  const recentQaSummaries = [
    newSummary,
    ...current.recentQaSummaries.filter((item) => item.questionSummary !== qShort),
  ].slice(0, 5);

  const updatedProfile: CoachMemoryProfile = {
    userId,
    consentEnabled: true,
    relationshipSituations: updatedSituations,
    recentQaSummaries,
    latestConcern: qShort,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(getScopedMemoryKey(userId), JSON.stringify(updatedProfile));
  } catch {
    // Ignore storage error
  }

  return updatedProfile;
}

/**
 * Builds a concise, structured personalization & memory block for the AI system prompt
 * and fallback counseling engine.
 */
export function buildPersonalizationPromptContext(
  userId: string,
  scores?: Record<string, number> | null
): string {
  if (!userId || !getMemoryConsent(userId)) {
    return "\n## [STEP 5] 개인화 메모리 상태\n- 사용자가 대화 기억 저장을 비활성화했습니다. 현재 세션의 대화 내용만 참고하세요.";
  }

  const memory = loadCoachMemory(userId);
  const plan = loadOrCreateProgramPlan(userId, scores);
  const progress = getProgramProgressSummary(plan);

  const sections: string[] = [];
  sections.push("## [STEP 5] 사용자 관계 기억 및 개인화 요약 (재설명 요구 금지)");
  sections.push(
    "- 사용자가 이미 설명한 아래 관계 상황과 이전 상담 맥락을 숙지하고, 똑같은 배경 설명을 다시 요구하지 마세요."
  );

  if (memory && memory.relationshipSituations.length > 0) {
    sections.push(`- 파악된 관계 상황: ${memory.relationshipSituations.join(", ")}`);
  }

  if (memory && memory.latestConcern) {
    sections.push(`- 최근 핵심 고민: "${memory.latestConcern}"`);
  }

  if (memory && memory.recentQaSummaries.length > 0) {
    const qaLines = memory.recentQaSummaries
      .slice(0, 3)
      .map(
        (qa, idx) =>
          `  ${idx + 1}. [유형: ${qa.intentType}] 질문: "${qa.questionSummary}" → 코칭 핵심: "${qa.answerKeyPoint}"`
      )
      .join("\n");
    sections.push(`- 이전 질문·답변 핵심 요약:\n${qaLines}`);
  }

  // Improvement Plan & Practice status
  sections.push(
    `- 맞춤형 관계 개선 계획(${plan.activeDuration === "7d" ? "7일 집중 플랜" : "30일 체질 개선 플랜"}): 목표 영역 [${plan.focusLabel}], 현재 실천 달성률 ${progress.completionRate}% (완료 ${progress.completedCount}/${progress.totalSteps}단계)`
  );

  if (progress.strugglingSteps.length > 0) {
    const struggledTitles = progress.strugglingSteps.map((s) => s.title).join(", ");
    sections.push(
      `- ⚠️ 실천 중 어려움을 겪은 과제: [${struggledTitles}] → 사용자가 부담을 느끼지 않도록 난이도를 낮춘 대안 행동으로 격려하고 계획을 유연하게 조정해주세요.`
    );
  } else if (progress.nextPendingStep) {
    sections.push(
      `- 다음 추천 실천 과제: [${progress.nextPendingStep.dayOrPhaseLabel} - ${progress.nextPendingStep.title}] (${progress.nextPendingStep.action})`
    );
  }

  return "\n" + sections.join("\n");
}
