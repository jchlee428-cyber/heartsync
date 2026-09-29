import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, RotateCcw, TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, ShieldCheck, CheckCircle, CheckCircle2, Sparkles, BookOpen, Target, Lightbulb, RefreshCw, Download, Loader2, Share2, Mail, Link2, X as XIcon, Lock, Crown, Zap, Star, ChevronRight, Users } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import BlurPaywallSection from "@/components/BlurPaywallSection";
import PartnerInviteModal from "@/components/PartnerInviteModal";
import DailyRoutineCard from "@/components/DailyRoutineCard";
import RelationshipTrendTracker from "@/components/RelationshipTrendTracker";
import Footer from "@/components/Footer";

const client = createClient();

const categoryInfo: Record<string, { label: string; subtitle: string; emoji: string; key: string }> = {
  conflict: { label: "갈등 관리", subtitle: "소통 패턴", emoji: "⚡", key: "conflict" },
  intimacy: { label: "정서적 친밀감", subtitle: "우정", emoji: "💕", key: "intimacy" },
  trust: { label: "신뢰/애착", subtitle: "안정감", emoji: "🤝", key: "trust" },
  values: { label: "가치관", subtitle: "공유 의미", emoji: "🌟", key: "values" },
  physical: { label: "신체적 만족", subtitle: "성적 친밀감", emoji: "🔥", key: "physical" },
};

function getScoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.7) return "text-green-600 bg-green-50";
  if (pct >= 0.55) return "text-blue-600 bg-blue-50";
  if (pct >= 0.45) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function getScoreIcon(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.7) return <TrendingUp className="w-4 h-4" />;
  if (pct >= 0.4) return <Minus className="w-4 h-4" />;
  return <TrendingDown className="w-4 h-4" />;
}

function getOverallGrade(total: number) {
  if (total >= 210) return { grade: "매우 건강", label: "Green Flag 🟢", color: "text-green-600", bg: "bg-green-50", borderColor: "border-green-200", icon: <CheckCircle2 className="w-5 h-5" /> };
  if (total >= 175) return { grade: "양호", label: "Blue Flag 🔵", color: "text-blue-600", bg: "bg-blue-50", borderColor: "border-blue-200", icon: <Shield className="w-5 h-5" /> };
  if (total >= 140) return { grade: "주의 필요", label: "Yellow Flag 🟡", color: "text-amber-600", bg: "bg-amber-50", borderColor: "border-amber-200", icon: <Shield className="w-5 h-5" /> };
  return { grade: "위험", label: "Red Flag 🔴", color: "text-red-600", bg: "bg-red-50", borderColor: "border-red-200", icon: <AlertTriangle className="w-5 h-5" /> };
}

function getOverallMessage(total: number, conflictScore: number) {
  if (total < 140 || conflictScore < 25) {
    return "관계에 심각한 위험 신호가 감지되었습니다. 전문적인 분석이 필요합니다.";
  }
  if (total < 175) {
    return "관계에 개선이 필요한 영역이 있습니다. 구체적인 솔루션을 확인해보세요.";
  }
  if (total < 210) {
    return "전반적으로 건강한 관계입니다. 더 나은 관계를 위한 맞춤 조언을 확인해보세요.";
  }
  return "매우 건강하고 안정적인 관계입니다. 관계를 더욱 풍요롭게 만드는 팁을 확인해보세요.";
}

/** Brief category interpretation (free version - shorter) */
function getBriefCategoryInterpretation(cat: string, score: number): string {
  const pct = score / 50;
  const brief: Record<string, Record<string, string>> = {
    conflict: {
      high: "건설적인 소통이 이루어지고 있습니다.",
      mid: "갈등 시 감정적 반응이 나타나지만, 회복력은 있습니다.",
      low: "갈등 관리에 시급한 개선이 필요합니다.",
    },
    intimacy: {
      high: "정서적 유대감이 매우 강합니다.",
      mid: "더 깊은 정서적 연결이 필요합니다.",
      low: "정서적 거리감이 느껴집니다.",
    },
    trust: {
      high: "안정적인 애착이 형성되어 있습니다.",
      mid: "신뢰의 기반은 있지만, 불안 요소가 존재합니다.",
      low: "불안정 애착 패턴이 관찰됩니다.",
    },
    values: {
      high: "핵심 가치관이 잘 일치합니다.",
      mid: "일부 가치관 차이가 있지만 조율 가능합니다.",
      low: "가치관 차이가 크며, 조율이 필요합니다.",
    },
    physical: {
      high: "신체적 친밀감이 건강하게 유지되고 있습니다.",
      mid: "스킨십이나 성적 만족도에 개선 여지가 있습니다.",
      low: "신체적 친밀감이 크게 감소했습니다.",
    },
  };
  const catData = brief[cat];
  if (!catData) return "";
  if (pct >= 0.7) return catData.high;
  if (pct >= 0.45) return catData.mid;
  return catData.low;
}

/** Per-category interpretation based on score (full version) */
function getCategoryInterpretation(cat: string, score: number): string {
  const pct = score / 50;
  const interpretations: Record<string, Record<string, string>> = {
    conflict: {
      high: "갈등 상황에서도 건설적인 소통이 이루어지고 있습니다. 화해 시도가 잘 받아들여지고 있어요.",
      mid: "갈등 시 감정적 반응이 나타나지만, 회복력은 있습니다. '비난 대신 요청하기' 연습이 도움됩니다.",
      low: "갈등이 인격 비난으로 확대되거나, 회피 패턴이 반복되고 있습니다. 가트맨의 '부드러운 시작(Soft Start-up)' 기법이 시급합니다.",
    },
    intimacy: {
      high: "정서적 유대감이 매우 강합니다. 서로의 내면을 깊이 이해하고 있어요.",
      mid: "기본적인 친밀감은 있지만, 더 깊은 정서적 연결이 필요합니다. '사랑의 지도(Love Map)' 업데이트를 추천합니다.",
      low: "정서적 거리감이 느껴집니다. 일상적인 대화와 관심 표현을 의식적으로 늘려보세요.",
    },
    trust: {
      high: "안정적인 애착이 형성되어 있으며, 서로에 대한 신뢰가 깊습니다.",
      mid: "신뢰의 기반은 있지만, 불안 요소가 존재합니다. 일관된 행동과 약속 이행이 신뢰를 강화합니다.",
      low: "불안정 애착 패턴이 관찰됩니다. 과거 상처나 배신 경험이 현재 관계에 영향을 미치고 있을 수 있습니다.",
    },
    values: {
      high: "핵심 가치관이 잘 일치하며, 미래에 대한 공유된 비전이 있습니다.",
      mid: "일부 가치관 차이가 있지만 조율 가능한 수준입니다. '해결 가능한 문제'와 '영원한 문제'를 구분하는 것이 중요합니다.",
      low: "가치관 차이가 크며, 이로 인한 갈등이 반복되고 있습니다. 서로의 차이를 존중하는 대화가 필요합니다.",
    },
    physical: {
      high: "신체적·성적 친밀감이 건강하게 유지되고 있습니다. 정서적 연결과 잘 조화되어 있어요.",
      mid: "스킨십이나 성적 만족도에 개선 여지가 있습니다. 솔직한 대화로 서로의 니즈를 확인해보세요.",
      low: "신체적 친밀감이 크게 감소했습니다. 이는 정서적 거리감의 반영일 수 있으며, 근본 원인을 함께 탐색해보세요.",
    },
  };

  const catData = interpretations[cat];
  if (!catData) return "";
  if (pct >= 0.7) return catData.high;
  if (pct >= 0.45) return catData.mid;
  return catData.low;
}

/** Build the detailed AI prompt */
function buildAIPrompt(scores: Record<string, number>, totalScore: number) {
  const conflictScore = scores.conflict || 0;
  const intimacyScore = scores.intimacy || 0;
  const trustScore = scores.trust || 0;
  const valuesScore = scores.values || 0;
  const physicalScore = scores.physical || 0;

  const scoresSummary = Object.entries(scores)
    .map(([cat, score]) => `${categoryInfo[cat]?.label || cat}: ${score}/50`)
    .join(", ");

  const sortedCats = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const strongest = sortedCats[0];
  const weakest = sortedCats[sortedCats.length - 1];

  const riskLevel = totalScore < 140 || conflictScore < 25
    ? "위험 (Red Flag)"
    : totalScore < 175
    ? "주의 필요 (Yellow Flag)"
    : totalScore < 210
    ? "양호 (Blue Flag)"
    : "매우 건강 (Green Flag)";

  return `당신은 존 가트맨(John Gottman) 이론, 애착 이론(Bowlby & Ainsworth), 스턴버그의 사랑의 삼각형 이론, EFT(감정중심치료), 인지행동치료(CBT)에 정통한 15년 경력의 커플 관계 전문 상담사입니다.

## 진단 결과 데이터
- 총점: ${totalScore}/250
- 위험 등급: ${riskLevel}
- 카테고리별 점수 (각 50점 만점): ${scoresSummary}
- 가장 강한 영역: ${categoryInfo[strongest[0]]?.label} (${strongest[1]}/50)
- 가장 약한 영역: ${categoryInfo[weakest[0]]?.label} (${weakest[1]}/50)

## 세부 점수 분석 기준
- 갈등 관리 ${conflictScore}/50: ${conflictScore < 25 ? "⚠️ 위험 수준 — 가트맨의 4가지 독소가 활성화되었을 가능성 높음" : conflictScore < 35 ? "주의 필요 — 갈등 확대 패턴 존재" : "양호 이상"}
- 정서적 친밀감 ${intimacyScore}/50: ${intimacyScore < 25 ? "⚠️ 위험 수준 — 정서적 단절 상태" : intimacyScore < 35 ? "주의 필요 — 사랑의 지도 업데이트 필요" : "양호 이상"}
- 신뢰/애착 ${trustScore}/50: ${trustScore < 25 ? "⚠️ 위험 수준 — 불안정 애착 패턴 강함" : trustScore < 35 ? "주의 필요 — 신뢰 침식 진행 중" : "양호 이상"}
- 가치관 ${valuesScore}/50: ${valuesScore < 25 ? "⚠️ 위험 수준 — 핵심 가치관 충돌" : valuesScore < 35 ? "주의 필요 — 일부 영원한 문제 존재" : "양호 이상"}
- 신체적 만족 ${physicalScore}/50: ${physicalScore < 25 ? "⚠️ 위험 수준 — 신체적 친밀감 심각하게 감소" : physicalScore < 35 ? "주의 필요 — 성적 소통 개선 필요" : "양호 이상"}

## 리포트 작성 가이드
아래 형식을 **정확히** 따라 한국어 맞춤형 심층 분석 리포트를 작성해주세요. 각 섹션의 제목은 반드시 아래와 동일하게 사용하세요.

### 📊 종합 진단 결과
위험 등급에 맞는 핵심 메시지와 전반적인 관계 상태 분석. 총점과 각 영역의 균형을 고려한 종합 평가. (4-5문장)

### ⚡ 갈등 관리 분석 (${conflictScore}/50)
**강점:** 이 점수에서 발견되는 긍정적 측면 (1-2문장)
**개선점:** 구체적 문제점과 심리학적 원인 (2-3문장)
**실천 전략:** 가트맨의 '부드러운 시작(Soft Start-up)' 기법, '회복 시도(Repair Attempt)' 방법, '비난 대신 요청하기' 등 구체적 기법 제시 (2-3개)

### 💕 정서적 친밀감 분석 (${intimacyScore}/50)
**강점:** 긍정적 측면 (1-2문장)
**개선점:** 구체적 문제점 (2-3문장)
**실천 전략:** '사랑의 지도(Love Map)' 업데이트 방법, '감정 은행 계좌' 입금 전략, 브레네 브라운의 '취약성 공유' 실천법 등 (2-3개)

### 🤝 신뢰/애착 분석 (${trustScore}/50)
**강점:** 긍정적 측면 (1-2문장)
**개선점:** 애착 유형(안정형/불안형/회피형)과 연관된 구체적 분석 (2-3문장)
**실천 전략:** 애착 안정화 전략, 볼비의 '안전 기지(Secure Base)' 구축법, 신뢰 회복을 위한 일관성 있는 행동 패턴 등 (2-3개)

### 🌟 가치관 분석 (${valuesScore}/50)
**강점:** 긍정적 측면 (1-2문장)
**개선점:** '영원한 문제(Perpetual Problems)'와 '해결 가능한 문제(Solvable Problems)' 구분 (2-3문장)
**실천 전략:** 가트맨의 '꿈 속의 꿈(Dreams Within Conflict)' 대화법, 공유 의미 체계 구축 방법 등 (2-3개)

### 🔥 신체적 만족도 분석 (${physicalScore}/50)
**강점:** 긍정적 측면 (1-2문장)
**개선점:** 성적 소통, 비성적 스킨십, 정서-신체 연결 관점에서의 분석 (2-3문장)
**실천 전략:** 성적 소통 향상법, 일상적 스킨십 증가 전략, 정서적 연결 강화 방법 등 (2-3개)

### 🎯 핵심 위험 요소 TOP 3
가장 시급하게 개선이 필요한 3가지 문제를 우선순위별로 나열. 각 항목에 심리학적 근거와 방치 시 예상되는 결과를 포함. (번호 매기기)

### 💡 30일 맞춤 개선 플랜
4주간 실천할 수 있는 구체적인 주간 계획:
- **1주차:** 가장 시급한 문제에 대한 첫 번째 실천 과제
- **2주차:** 두 번째 핵심 영역 개선 과제
- **3주차:** 세 번째 영역 + 복합적 실천
- **4주차:** 전체 점검 및 지속 가능한 습관 형성

### 🌈 전문가 코멘트
따뜻하면서도 전문적인 마무리 메시지. 변화의 가능성에 대한 희망적 메시지와 함께, 필요 시 전문 상담 권유. (3-4문장)

## 작성 원칙
1. 점수가 높은 영역도 반드시 강점으로 인정하고 격려하세요.
2. 점수가 낮은 영역은 비판이 아닌 '성장 가능성'의 관점에서 서술하세요.
3. 모든 실천 전략은 구체적이고 즉시 실행 가능해야 합니다 (예: "오늘 저녁 상대방에게 '오늘 하루 어땠어?'라고 물어보세요").
4. 심리학 이론명을 자연스럽게 포함하되, 일반인이 이해할 수 있도록 쉽게 설명하세요.
5. 사용자가 "내 상황을 정확히 알고 있다"고 느끼도록 점수 데이터에 기반한 구체적 분석을 하세요.
6. 전체 분량은 충분히 상세하게 (약 1500-2000자) 작성하세요.`;
}

/** Parse AI report sections for structured display */
function parseReportSections(report: string): { title: string; icon: string; content: string }[] {
  const sections: { title: string; icon: string; content: string }[] = [];
  const sectionRegex = /###\s*([^\n]+)\n([\s\S]*?)(?=###|$)/g;
  let match;

  const iconMap: Record<string, string> = {
    "📊": "📊", "⚡": "⚡", "💕": "💕", "🤝": "🤝", "🌟": "🌟",
    "🔥": "🔥", "🎯": "🎯", "💡": "💡", "🌈": "🌈", "⚠️": "⚠️",
  };

  while ((match = sectionRegex.exec(report)) !== null) {
    const rawTitle = match[1].trim();
    const content = match[2].trim();
    const firstChar = [...rawTitle][0];
    const hasEmoji = firstChar && /\p{Emoji}/u.test(firstChar) && !/\d/.test(firstChar);
    const icon = hasEmoji ? (iconMap[firstChar] || firstChar) : "📋";
    const title = hasEmoji ? rawTitle.replace(firstChar, "").trim() : rawTitle;

    if (content.length > 0) {
      sections.push({ title, icon, content });
    }
  }

  return sections;
}

/** Free trial preview content generator */
function getFreeTrialPreview(scores: Record<string, number>, totalScore: number) {
  const sortedCats = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const strongest = sortedCats[0];
  const weakest = sortedCats[sortedCats.length - 1];
  const strongestInfo = categoryInfo[strongest[0]];
  const weakestInfo = categoryInfo[weakest[0]];

  const overallAnalysis = totalScore >= 210
    ? `종합 점수 ${totalScore}점으로, 관계가 매우 건강한 상태입니다. 특히 ${strongestInfo?.label || ""}(${strongest[1]}/50) 영역이 가장 우수하며, 가트맨 이론에서 말하는 '감정 은행 계좌'가 풍부하게 채워져 있습니다.`
    : totalScore >= 175
    ? `종합 점수 ${totalScore}점으로, 전반적으로 양호한 관계입니다. ${strongestInfo?.label || ""}(${strongest[1]}/50)이 강점이지만, ${weakestInfo?.label || ""}(${weakest[1]}/50) 영역에서 개선 여지가 있습니다.`
    : totalScore >= 140
    ? `종합 점수 ${totalScore}점으로, 관계에 주의가 필요한 신호가 감지됩니다. ${weakestInfo?.label || ""}(${weakest[1]}/50) 영역이 가장 취약하며, 가트맨의 '4가지 독소' 패턴이 나타날 수 있습니다.`
    : `종합 점수 ${totalScore}점으로, 관계에 심각한 위험 신호가 감지됩니다. 특히 ${weakestInfo?.label || ""}(${weakest[1]}/50) 영역이 위험 수준이며, 즉각적인 개선이 필요합니다.`;

  const strengthTip = strongest[1] >= 35
    ? `${strongestInfo?.emoji || ""} ${strongestInfo?.label || ""} 영역이 ${strongest[1]}/50으로 가장 높습니다. 이 강점을 활용하여 다른 영역도 함께 개선할 수 있습니다.`
    : `${strongestInfo?.emoji || ""} ${strongestInfo?.label || ""} 영역이 상대적으로 가장 높지만(${strongest[1]}/50), 전반적인 향상이 필요합니다.`;

  const weaknessTip = `${weakestInfo?.emoji || ""} ${weakestInfo?.label || ""} 영역(${weakest[1]}/50)이 가장 낮습니다. 이 영역의 구체적인 개선 전략은 프리미엄 리포트에서 확인할 수 있습니다.`;

  return { overallAnalysis, strengthTip, weaknessTip };
}

/** Paywall Upsell Card Component */
function PaywallCard({ totalScore, navigate, weakestArea, scores }: { totalScore: number; navigate: (path: string) => void; weakestArea: string; scores: Record<string, number> }) {
  const grade = getOverallGrade(totalScore);
  const isHighRisk = totalScore < 175;
  const preview = getFreeTrialPreview(scores, totalScore);

  return (
    <div className="mt-8 space-y-4">
      {/* Free Trial Preview Section */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-5 border border-purple-100 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">무료 체험 미리보기</h3>
            <p className="text-[10px] text-gray-500">AI 심층 분석의 일부를 미리 확인하세요</p>
          </div>
        </div>

        {/* Overall Analysis Preview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-3 border border-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📊</span>
            <span className="text-xs font-bold text-gray-800">종합 진단 요약</span>
            <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[9px] font-bold rounded-full">무료</span>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {preview.overallAnalysis}
          </p>
        </div>

        {/* Strength & Weakness Preview */}
        <div className="grid grid-cols-1 gap-2 mb-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[11px] font-bold text-green-700">강점 영역</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[9px] font-bold rounded-full">무료</span>
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed">{preview.strengthTip}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[11px] font-bold text-red-700">개선 필요 영역</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[9px] font-bold rounded-full">무료</span>
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed">{preview.weaknessTip}</p>
          </div>
        </div>

        {/* Divider with "premium content below" indicator */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
          <span className="text-[10px] text-purple-500 font-bold flex items-center gap-1">
            <Lock className="w-3 h-3" />
            프리미엄 콘텐츠
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
        </div>

        {/* Locked Premium Sections Preview */}
        <div className="space-y-2 opacity-60">
          {[
            { icon: "⚡", title: "갈등 관리 심층 분석", desc: "가트맨의 부드러운 시작 기법, 회복 시도 전략..." },
            { icon: "🎯", title: "핵심 위험 요소 TOP 3", desc: "가장 시급한 개선 포인트와 방치 시 예상 결과..." },
            { icon: "💡", title: "30일 맞춤 개선 플랜", desc: "주간별 실천 과제와 구체적 행동 가이드..." },
          ].map((item, idx) => (
            <div key={idx} className="bg-white/50 rounded-lg p-3 flex items-center gap-3 border border-white/80">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-700">{item.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
              </div>
              <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Value Proposition Card */}
      <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 rounded-2xl p-5 border border-pink-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-pink-500" />
          <h3 className="text-base font-extrabold text-gray-900">프리미엄 리포트에 포함된 내용</h3>
        </div>

        <div className="space-y-3">
          {[
            { icon: "📊", title: "5대 영역 심층 분석", desc: "가트맨 이론 기반 상세 해석" },
            { icon: "🎯", title: "핵심 위험 요소 TOP 3", desc: "가장 시급한 개선 포인트" },
            { icon: "💡", title: "30일 맞춤 개선 플랜", desc: "주간별 실천 과제 제공" },
            { icon: "🤖", title: "AI 코치 심층 상담", desc: "1:1 맞춤 관계 코칭" },
            { icon: "📄", title: "PDF 리포트 다운로드", desc: "전문가 수준의 분석 보고서" },
            { icon: "📈", title: "진단 결과 비교 분석", desc: "시간에 따른 관계 변화 추적" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Urgency / Risk-based messaging */}
      {isHighRisk && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">⚠️ 관계 위험 신호 감지</p>
            <p className="text-xs text-red-600 leading-relaxed">
              현재 점수({totalScore}/250)는 주의가 필요한 수준입니다. 
              방치할 경우 관계 악화로 이어질 수 있습니다. 
              상세 분석을 통해 구체적인 개선 방법을 확인하세요.
            </p>
          </div>
        </div>
      )}

      {/* Social Proof */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {["bg-pink-400", "bg-purple-400", "bg-blue-400", "bg-green-400"].map((color, i) => (
              <div key={i} className={`w-7 h-7 rounded-full ${color} border-2 border-white flex items-center justify-center`}>
                <span className="text-[10px] text-white font-bold">{["김", "이", "박", "최"][i]}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            <span className="font-bold text-gray-700">2,847명</span>이 이번 달 상세 분석을 받았습니다
          </p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          ))}
          <span className="text-xs text-gray-500 ml-1">"구체적인 솔루션이 정말 도움이 됐어요" - 이**님</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-3 pt-2">
        {/* Primary CTA - Pricing */}
        <button
          onClick={() => {
            // Store diagnosis ID so pricing page can pass it to payment session
            if (window.location.pathname.includes("/result/")) {
              const diagId = window.location.pathname.split("/result/")[1];
              if (diagId) localStorage.setItem("heartsync_pending_diagnosis_id", diagId);
            }
            navigate("/pricing");
          }}
          className="w-full relative overflow-hidden bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-bold text-base py-5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all group min-h-[56px]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          <div className="flex items-center justify-center gap-2">
            <Crown className="w-5 h-5" />
            <span>상세 분석 리포트 받기</span>
            <ChevronRight className="w-5 h-5" />
          </div>
          <p className="text-xs text-white/80 mt-1">₩19,900부터 · 즉시 확인 가능</p>
        </button>

        {/* Limited Time Offer */}
        <div className="text-center">
          <p className="text-xs text-pink-500 font-semibold flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4" />
            지금 구매 시 AI 코치 상담 1회 무료 포함
          </p>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="space-y-3 pt-2">
        <button
          onClick={() => navigate("/diagnosis")}
          className="w-full flex items-center justify-center gap-2 bg-white text-pink-600 font-bold text-[15px] py-4 rounded-xl border-2 border-pink-200 hover:bg-pink-50 active:bg-pink-100 transition-all min-h-[52px]"
        >
          <RotateCcw className="w-5 h-5" />
          다시 진단하기
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-600 font-medium text-[15px] py-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all min-h-[52px]"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [aiReport, setAiReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportSaved, setReportSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [hasPaidPlan, setHasPaidPlan] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const fullReportRef = useRef("");

  useEffect(() => {
    loadDiagnosis();
    checkUserPlan();
  }, []);

  // Auto-expand all sections once report is complete
  useEffect(() => {
    if (aiReport && !isGenerating) {
      const sections = parseReportSections(aiReport);
      setExpandedSections(new Set(sections.map((_, i) => i)));
    }
  }, [aiReport, isGenerating]);

  const checkUserPlan = async () => {
    // Check local test activation first for instant simulation
    const localTestPlan = localStorage.getItem("heartsync_active_test_plan");
    if (localTestPlan || localStorage.getItem("heartsync_test_paid") === "true") {
      setHasPaidPlan(true);
      setCheckingPlan(false);
      return;
    }

    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/my-plan",
        method: "GET",
        data: {},
      });
      if (res.data?.is_active && res.data?.plan_type !== "free") {
        setHasPaidPlan(true);
      }
    } catch {
      // Default to free
    } finally {
      setCheckingPlan(false);
    }
  };

  const handleSimulatedUnlock = async () => {
    setIsSimulating(true);
    localStorage.setItem("heartsync_active_test_plan", "single_analysis");
    localStorage.setItem("heartsync_test_paid", "true");

    const simOrderNum = `SIM-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      id: Date.now(),
      plan_type: "single_analysis",
      plan_name: "1회 정밀 분석 리포트",
      amount: 19900,
      currency: "KRW",
      status: "paid",
      payment_method: "가상 테스트 결제 (1초 잠금해제)",
      created_at: new Date().toISOString(),
      order_id: simOrderNum,
    };

    try {
      const existing = JSON.parse(localStorage.getItem("heartsync_orders") || "[]");
      localStorage.setItem("heartsync_orders", JSON.stringify([newOrder, ...existing.filter((o: any) => o.order_id !== newOrder.order_id)]));
      localStorage.setItem("heartsync_active_plan", JSON.stringify({
        plan_type: "single_analysis",
        plan_name: "1회 정밀 분석 리포트",
        analyses_remaining: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: "paid",
        payment_method: "가상 테스트 결제 (1초 잠금해제)",
        paid_at: new Date().toISOString(),
      }));
    } catch {}

    try {
      await client.apiCall.invoke({
        url: "/api/v1/payment/simulate_payment",
        method: "POST",
        data: {
          plan_type: "single_analysis",
          diagnosis_id: id,
          payment_method: "가상 테스트 결제 (1초 잠금해제)",
        },
      });
    } catch (e: any) {
      console.warn("Backend simulate endpoint notice:", e);
    }

    setHasPaidPlan(true);
    toast.success("가상 결제가 승인되어 전체 리포트와 PDF 다운로드가 잠금 해제되었습니다! (과금 0원)");
    if (diagnosis && !aiReport) {
      generateReport(diagnosis);
    }
    setIsSimulating(false);
  };

  const loadDiagnosis = async () => {
    try {
      let currentUser: any = null;
      try {
        const userRes = await client.auth.me();
        currentUser = userRes?.data;
      } catch {
        // Backend offline
      }

      if (!currentUser) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            currentUser = JSON.parse(storedUser);
          } catch {
            currentUser = { name: "회원", role: "user" };
          }
        } else if (localStorage.getItem("token")) {
          currentUser = { name: "회원", role: "user" };
        }
      }

      if (!currentUser) {
        toast.error("로그인이 필요합니다.");
        navigate("/");
        return;
      }

      let data: any = null;
      try {
        const response = await client.entities.diagnoses.get({ id: id! });
        data = response?.data;
      } catch {
        // Fallback to local storage
      }

      if (!data) {
        const local = localStorage.getItem(`heartsync_diagnosis_${id}`) || localStorage.getItem("heartsync_last_diagnosis");
        if (local) {
          try {
            data = JSON.parse(local);
          } catch {}
        }
      }

      if (!data) {
        toast.error("진단 결과를 찾을 수 없습니다.");
        navigate("/");
        return;
      }
      setDiagnosis(data);

      if (data.ai_report) {
        setAiReport(data.ai_report);
        setReportSaved(true);
      }
      // Don't auto-generate report anymore - only generate for paid users
    } catch {
      toast.error("데이터를 불러올 수 없습니다.");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Generate report only when user has paid plan and no existing report
  useEffect(() => {
    if (!checkingPlan && hasPaidPlan && diagnosis && !aiReport && !isGenerating) {
      // Clean up localStorage pending diagnosis ID
      localStorage.removeItem("heartsync_pending_diagnosis_id");
      generateReport(diagnosis);
    }
  }, [checkingPlan, hasPaidPlan, diagnosis]);

  const generateStandardReport = (scores: any, totalScore: number) => {
    const sc = scores || {};
    const conflict = sc.conflict || 35;
    const intimacy = sc.intimacy || 38;
    const trust = sc.trust || 36;
    const values = sc.values || 34;
    const physical = sc.physical || 32;
    const total = totalScore || (conflict + intimacy + trust + values + physical);

    return `### 📊 종합 진단 결과
이번 심층 관계 진단 결과, 두 분의 관계 종합 점수는 ${total}/250점입니다.
전반적으로 서로를 향한 정서적 유대감과 애착의 토대가 든든하게 유지되고 있으나, 갈등 상황에서 무의식적으로 방어적인 대화 패턴이 나타나며 심리적 에너지가 소모되는 경향이 있습니다. 존 가트맨(John Gottman) 연구에 따르면 관계의 성패는 갈등의 유무가 아니라 '갈등을 회복하는 속도와 태도'에 달려 있습니다. 현재 두 분은 상호 보완적인 소통 훈련을 통해 신뢰와 친밀감을 크게 도약시킬 수 있는 중요한 전환점에 있습니다.

### ⚡ 갈등 관리 분석 (${conflict}/50)
**강점:** 갈등이 극단적인 대립으로 치닫기 전에 서로를 배려하려는 내면의 의지가 여전히 확고합니다.
**개선점:** 서운함이 발생했을 때 즉각적이고 건강한 방식으로 표현하기보다는, 혼자 감정을 삭이다가 한꺼번에 표출되거나 침묵(담쌓기)으로 이어지는 패턴이 관찰됩니다.
**실천 전략:**
1. **부드러운 시작(Soft Start-up):** 비난이 아닌 "나는 ~할 때 ~한 감정을 느껴"라는 '나-전달법(I-Message)'으로 대화를 시작하세요.
2. **20분 브레이크 타임:** 대화 중 심박수가 상승하거나 감정이 격해지면 "잠깐 20분만 쉬었다가 다시 이야기하자"고 약속하고 감정을 가라앉히세요.
3. **즉각적인 회복 시도:** 갈등 중 상대방의 손을 잡거나 "내 말이 상처가 됐다면 미안해"라는 작은 회복 신호를 적극적으로 보내세요.

### 💕 정서적 친밀감 분석 (${intimacy}/50)
**강점:** 일상 속에서 서로에 대한 호감과 존중의 기본기가 튼튼하게 자리잡고 있습니다.
**개선점:** 바쁜 일상과 익숙함으로 인해 서로의 최신 고민이나 감정 상태를 세심하게 업데이트하는 '사랑의 지도(Love Map)'가 다소 정체되어 있습니다.
**실천 전략:**
1. **매일 10분 온전한 집중 대화:** 스마트폰을 내려놓고 퇴근 후 서로의 하루와 감정을 묻는 10분의 집중 시간을 확보하세요.
2. **감정 은행 계좌 매일 입금:** 칭찬, 고마움의 표현, 따뜻한 눈맞춤을 하루 최소 5번 이상 실천하세요 (가트맨 5:1 황금비율).
3. **취약성 공유(Vulnerability):** 완벽한 모습만 보이려 하지 말고, 내면의 불안이나 고민을 솔직하게 털어놓아 정서적 연결을 강화하세요.

### 🤝 신뢰/애착 분석 (${trust}/50)
**강점:** 오랜 시간 함께 쌓아온 관계적 연속성과 상대방에 대한 근본적인 믿음이 존재합니다.
**개선점:** 불안형-회피형 애착 역동이 미세하게 감지되며, 상대방의 침묵을 거절로 오해하거나 독립성을 침해로 받아들이는 악순환이 발생할 수 있습니다.
**실천 전략:**
1. **안전 기지(Secure Base) 구축:** 상대방이 감정적으로 지쳐 있을 때 재촉하지 않고 편안한 안식처가 되어주세요.
2. **예측 가능한 투명성:** 사소한 일정이나 감정 변화도 미리 공유하여 불안감을 사전에 차단하세요.
3. **약속의 일관된 이행:** 작은 약속이라도 반드시 지켜 상호 신뢰의 안정감을 단단하게 만드세요.

### 🌟 가치관 분석 (${values}/50)
**강점:** 미래에 대한 큰 틀의 지향점과 관계를 발전시키고자 하는 의지가 서로 일치합니다.
**개선점:** 재정 관리, 여가 시간 배분, 가족과의 관계 등 세부적인 생활 방식에서 오는 우선순위 차이를 조율할 필요가 있습니다.
**실천 전략:**
1. **'꿈 속의 꿈(Dreams Within Conflict)' 대화:** 특정 고집 뒤에 숨겨진 상대방의 어린 시절 경험이나 핵심 가치를 경청하세요.
2. **공동의 의식(Ritual) 만들기:** 매주 주말 함께하는 산책이나 기념일 축하 방식 등 둘만의 고유한 문화를 만드세요.
3. **영원한 문제 인정하기:** 69%의 갈등은 해결하는 것이 아니라 평생 관리하는 것임을 인정하고 타협점을 찾으세요.

### 🔥 신체적 만족도 분석 (${physical}/50)
**강점:** 서로를 향한 자연스러운 매력과 스킨십에 대한 잠재적 친밀감이 살아있습니다.
**개선점:** 정서적 피로도가 신체적 소통으로 이어지는 것을 방해하며, 스킨십에 대한 솔직한 대화가 줄어들 수 있습니다.
**실천 전략:**
1. **비성적 일상 스킨십 증가:** 손잡기, 가벼운 포옹, 어깨 토닥이기 등 일상 속 애정 표현을 자연스럽게 늘리세요.
2. **6초 키스 루틴:** 매일 아침 출근길과 저녁 귀가 시 최소 6초간의 깊은 키스로 유대 옥시토신을 분비시키세요.
3. **편안한 감정 교류 우선:** 신체적 친밀감 이전에 충분한 정서적 안정감이 먼저 조성되도록 배려하세요.

### 🎯 핵심 위험 요소 TOP 3
1. **비난에 이은 방어적 태도:** 대화가 공격으로 느껴질 때 변명하거나 역공하는 패턴 (방치 시 심리적 거리 확대)
2. **해결되지 않은 서운함의 누적:** 즉시 풀지 못한 작은 감정들이 체념으로 변질될 위험
3. **소통 시간의 절대적 부족:** 서로의 일상에 대한 공감 결여로 인한 정서적 고립감

### 💡 30일 맞춤 개선 플랜
- **1주차 (감정 정화):** 비난하지 않고 '나-전달법'으로만 대화하기 & 매일 1가지 고마운 점 말하기
- **2주차 (친밀감 회복):** 사랑의 지도 업데이트 (파트너의 최근 스트레스 3가지 경청하기) & 6초 키스 루틴
- **3주차 (갈등 조율):** 갈등 발생 시 20분 브레이크 규칙 실천 & 작은 회복 시도 3회 시도하기
- **4주차 (지속적 습관):** 둘만의 주간 리뷰 데이트 진행 & 30일간의 변화 축하하기

### 🌈 전문가 코멘트
두 분은 서로를 깊이 사랑하고 아끼는 마음이 여전히 살아있는 소중한 관계입니다. 지금 마주하고 있는 소통의 어려움은 두 사람의 사랑이 식어서가 아니라, 단지 효과적인 대화법과 감정 조율 기술을 연습해보지 않았기 때문입니다. 위의 실천 가이드를 하루에 하나씩 가볍게 시도해보세요. 작은 대화 습관의 변화만으로도 두 사람의 관계는 놀라울 정도로 따뜻해질 것입니다.`;
  };

  const generateReport = async (data: any) => {
    setIsGenerating(true);
    setAiReport("");
    setReportSaved(false);
    fullReportRef.current = "";

    const scores = typeof data.scores === "string" ? JSON.parse(data.scores) : data.scores;
    const totalScore = data.total_score || 0;
    const prompt = buildAIPrompt(scores, totalScore);

    const finalizeAndSave = async (reportText: string) => {
      fullReportRef.current = reportText;
      setAiReport(reportText);
      setIsGenerating(false);

      // Always update localStorage record
      const local = localStorage.getItem(`heartsync_diagnosis_${id}`) || localStorage.getItem("heartsync_last_diagnosis");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          parsed.ai_report = reportText;
          localStorage.setItem(`heartsync_diagnosis_${id}`, JSON.stringify(parsed));
          localStorage.setItem("heartsync_last_diagnosis", JSON.stringify(parsed));
        } catch {}
      }

      try {
        await client.entities.diagnoses.update({
          id: id!,
          data: { ai_report: reportText },
        });
      } catch (err) {
        console.warn("Server entity update notice:", err);
      }

      setReportSaved(true);
      toast.success("AI 심층 리포트가 완성되었습니다.");

      try {
        await client.apiCall.invoke({
          url: "/api/v1/notifications/create-report-notification",
          method: "POST",
          data: {
            diagnosis_id: id!,
            total_score: totalScore,
          },
        });
      } catch {
        // Non-critical
      }
    };

    try {
      await client.ai.gentxt({
        messages: [
          {
            role: "system",
            content: "당신은 존 가트맨 이론, 애착 이론, 스턴버그의 사랑의 삼각형 이론, EFT(감정중심치료), 인지행동치료(CBT)에 정통한 15년 경력의 커플 관계 전문 상담사입니다. 항상 따뜻하면서도 전문적인 톤을 유지하고, 구체적인 심리학 이론에 기반한 분석을 제공합니다.",
          },
          { role: "user", content: prompt },
        ],
        model: "deepseek-v3.2",
        stream: true,
        onChunk: (chunk: any) => {
          if (chunk.content) {
            // Filter out any raw API error messages from stream
            if (chunk.content.includes("[ERROR]") || chunk.content.includes("Incorrect API key")) {
              return;
            }
            fullReportRef.current += chunk.content;
            setAiReport(fullReportRef.current);
          }
        },
        onComplete: async () => {
          const content = fullReportRef.current.trim();
          if (!content || content.includes("[ERROR]") || content.length < 50) {
            const fallback = generateStandardReport(scores, totalScore);
            await finalizeAndSave(fallback);
          } else {
            await finalizeAndSave(content);
          }
        },
        onError: async () => {
          const fallback = generateStandardReport(scores, totalScore);
          await finalizeAndSave(fallback);
        },
      });
    } catch {
      const fallback = generateStandardReport(scores, totalScore);
      await finalizeAndSave(fallback);
    }
  };

  const handleRegenerate = () => {
    if (diagnosis) {
      generateReport(diagnosis);
    }
  };

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!pdfContentRef.current || !aiReport || isGenerating) return;
    setIsDownloading(true);
    toast.info("PDF를 생성하고 있습니다...");

    try {
      const el = pdfContentRef.current;
      el.style.display = "block";
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.top = "0";

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      el.style.display = "none";

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (imgHeight * contentWidth) / imgWidth;

      const pdf = new jsPDF("p", "mm", "a4");
      let yOffset = 0;
      let pageNum = 1;
      const pageContentHeight = pdfHeight - margin * 2;

      while (yOffset < contentHeight) {
        if (pageNum > 1) {
          pdf.addPage();
        }

        const srcY = (yOffset / contentHeight) * imgHeight;
        const srcH = Math.min(
          (pageContentHeight / contentHeight) * imgHeight,
          imgHeight - srcY
        );
        const remainingContent = contentHeight - yOffset;
        const drawHeight = Math.min(pageContentHeight, remainingContent);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidth;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);
        }
        const pageImgData = pageCanvas.toDataURL("image/png");

        pdf.addImage(pageImgData, "PNG", margin, margin, contentWidth, drawHeight);

        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        pdf.text(
          `HeartSync AI Report  |  Page ${pageNum}`,
          pdfWidth / 2,
          pdfHeight - 5,
          { align: "center" }
        );

        yOffset += pageContentHeight;
        pageNum++;
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      pdf.save(`HeartSync_Report_${dateStr}.pdf`);
      toast.success("PDF가 다운로드되었습니다!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      if (pdfContentRef.current) {
        pdfContentRef.current.style.display = "none";
      }
      setIsDownloading(false);
    }
  }, [aiReport, isGenerating]);

  const getShareText = useCallback(() => {
    const grade = getOverallGrade(diagnosis?.total_score || 0);
    return `💕 HeartSync 커플 관계 진단 결과\n\n종합 점수: ${diagnosis?.total_score || 0}/250 (${grade.grade})\n\nAI 심리학 기반 심층 분석 리포트를 확인해보세요!`;
  }, [diagnosis]);

  const getShareUrl = useCallback(() => {
    return window.location.href;
  }, []);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      toast.error("이 브라우저에서는 네이티브 공유를 지원하지 않습니다.");
      return;
    }
    try {
      await navigator.share({
        title: "HeartSync 커플 관계 진단 리포트",
        text: getShareText(),
        url: getShareUrl(),
      });
      setShowShareMenu(false);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("공유에 실패했습니다.");
      }
    }
  }, [getShareText, getShareUrl]);

  const handleKakaoShare = useCallback(() => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(getShareUrl());
    const kakaoUrl = `https://story.kakao.com/share?url=${url}&text=${text}`;
    window.open(kakaoUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    setShowShareMenu(false);
    toast.success("카카오 공유 창이 열렸습니다.");
  }, [getShareText, getShareUrl]);

  const handleEmailShare = useCallback(() => {
    const subject = encodeURIComponent("💕 HeartSync 커플 관계 진단 리포트");
    const body = encodeURIComponent(`${getShareText()}\n\n리포트 확인하기: ${getShareUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
  }, [getShareText, getShareUrl]);

  const handleTwitterShare = useCallback(() => {
    const text = encodeURIComponent(`${getShareText()}\n\n`);
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer,width=600,height=500");
    setShowShareMenu(false);
  }, [getShareText, getShareUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success("링크가 클립보드에 복사되었습니다!");
      setShowShareMenu(false);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = getShareUrl();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("링크가 클립보드에 복사되었습니다!");
      setShowShareMenu(false);
    }
  }, [getShareUrl]);

  if (loading || checkingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-pink-50/30 to-white">
        <div className="text-center">
          <Heart className="w-10 h-10 text-pink-500 animate-pulse mx-auto mb-3" />
          <p className="text-gray-500 text-sm">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!diagnosis) return null;

  const scores = typeof diagnosis.scores === "string" ? JSON.parse(diagnosis.scores) : diagnosis.scores;
  const totalScore = diagnosis.total_score || 0;
  const conflictScore = scores.conflict || 0;
  const overall = getOverallGrade(totalScore);
  const overallMessage = getOverallMessage(totalScore, conflictScore);

  // Find weakest area for paywall messaging
  const sortedCats = Object.entries(scores).sort(([, a], [, b]) => (a as number) - (b as number));
  const weakestArea = categoryInfo[sortedCats[0][0]]?.label || "갈등 관리";

  // Parse report into sections for structured display
  const reportSections = parseReportSections(aiReport);
  const hasStructuredReport = reportSections.length > 0;

  // Determine if user can see full report — only paid users
  const canSeeFullReport = hasPaidPlan;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate("/")} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-pink-50 active:bg-pink-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-base font-bold text-gray-900">분석 리포트</span>
          <div className="w-11" />
        </div>
      </header>

      <main className="pt-16 pb-36 px-4 sm:px-5 max-w-lg mx-auto">
        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-6 text-white mt-4 shadow-xl">
          <p className="text-white/80 text-xs font-medium mb-1">종합 관계 점수</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-5xl font-extrabold">{totalScore}</span>
            <span className="text-white/70 text-lg mb-1">/ 250</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${overall.bg} ${overall.color}`}>
            {overall.icon}
            {overall.grade} · {overall.label}
          </div>
          {/* Score bar */}
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(totalScore / 250) * 100}%` }}
            />
          </div>
        </div>

        {/* Risk Message */}
        <div className={`mt-4 p-4 rounded-xl border-2 ${overall.borderColor} ${overall.bg}`}>
          <p className={`text-sm font-medium leading-relaxed ${overall.color}`}>
            {overallMessage}
          </p>
        </div>

        {/* Temporary Storage Reassurance Indicator */}
        <div className="mt-3 px-3.5 py-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-emerald-900 font-bold text-xs truncate">
              진단 내역과 분석 리포트가 임시 저장되었습니다
            </span>
          </div>
          <button
            onClick={() => navigate("/mypage")}
            className="text-[11px] text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg font-bold transition-colors flex-shrink-0 flex items-center gap-1"
          >
            <span>보관함 보기</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* ── Payment & Report Access Status Card ── */}
        {hasPaidPlan ? (
          <div className="mt-3 px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200/90 rounded-xl flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-emerald-950 font-bold text-xs">
                  결제 상태: <span className="text-emerald-700 font-extrabold">결제 완료 (AI 심층 솔루션 잠금 해제됨)</span>
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
              VIP 열람 중
            </span>
          </div>
        ) : (
          <div className="mt-3 px-3.5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-amber-950 font-bold text-xs truncate">
                  결제 상태: <span className="text-amber-700 font-extrabold">무료 미니 진단 (핵심 솔루션 잠김)</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                if (id) localStorage.setItem("heartsync_pending_diagnosis_id", id);
                navigate("/pricing");
              }}
              className="text-[11px] text-amber-800 bg-amber-200/80 hover:bg-amber-300/80 px-2.5 py-1 rounded-lg font-bold transition-colors flex-shrink-0 flex items-center gap-1 shadow-2xs"
            >
              <span>잠금 해제</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── Viral Loop: 연인 1초 초대장 배너 (K-factor > 1) ── */}
        <div className="mt-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 rounded-2xl p-4 border border-pink-200/90 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-gray-900">연인과 함께 비교해보세요!</span>
                <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[9px] font-black rounded-full">
                  1+1 매칭
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                상대방도 진단하면 둘만의 시선 차이 리포트가 열립니다
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>초대장</span>
          </button>
        </div>

        {/* Category Scores - Always visible (brief version for free users) */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900">5대 영역별 점수</h3>
          {Object.entries(scores).map(([cat, score]) => {
            const info = categoryInfo[cat];
            if (!info) return null;
            const numScore = Number(score);
            const colorClass = getScoreColor(numScore, 50);
            const isWarning = cat === "conflict" && numScore < 30;
            return (
              <div key={cat} className={`bg-white rounded-xl p-4 shadow-sm border ${isWarning ? "border-red-200" : "border-gray-50"} flex items-center gap-3`}>
                <span className="text-2xl">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0">
                      <span className="text-[15px] font-semibold text-gray-800">{info.label}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{info.subtitle}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold flex-shrink-0 ${colorClass}`}>
                      {getScoreIcon(numScore, 50)}
                      {numScore}/50
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-rose-400 rounded-full transition-all duration-700"
                      style={{ width: `${(numScore / 50) * 100}%` }}
                    />
                  </div>
                  {/* Brief interpretation for free, detailed for paid */}
                  <p className={`text-[13px] mt-2 leading-relaxed ${isWarning ? "text-red-500" : "text-gray-500"}`}>
                    {isWarning && (
                      <span className="flex items-center gap-1 mb-0.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        갈등 관리 위험 수준 감지
                      </span>
                    )}
                    {canSeeFullReport
                      ? getCategoryInterpretation(cat, numScore)
                      : getBriefCategoryInterpretation(cat, numScore)
                    }
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Daily Routine & Kakao Alimtalk Retention (D+1, D+7, D+30) ── */}
        <div className="mt-6">
          <DailyRoutineCard latestScore={totalScore} />
        </div>

        {/* ============================================ */}
        {/* PAYWALL GATE: Free vs Paid content below here */}
        {/* ============================================ */}

        {!canSeeFullReport ? (
          <>
            {/* ── Test Simulation Header Banner ── */}
            <div className="mt-8 bg-gradient-to-r from-amber-50 via-pink-50 to-purple-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                    🧪
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">
                        사전 점검 및 피드백용 테스트 모드
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">
                        과금 0원
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      토스 심사 중 실제 과금 없이 1초만에 리포트 잠금 해제와 <strong>PDF 다운로드</strong>를 테스트해보세요.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSimulatedUnlock}
                  disabled={isSimulating}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-md shadow-pink-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>잠금 해제 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>1초 가상 결제로 즉시 체험</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* FREE USER: Show Blur Paywall (Conversion Booster) */}
            <BlurPaywallSection
              totalScore={totalScore}
              scores={scores}
              weakestArea={weakestArea}
              diagnosisId={id || ""}
              onUnlock={() => {
                if (id) localStorage.setItem("heartsync_pending_diagnosis_id", id);
                navigate("/pricing");
              }}
              onSimulatedUnlock={handleSimulatedUnlock}
              onInvitePartner={() => setIsInviteModalOpen(true)}
            />
          </>
        ) : (
          /* PAID USER: Show full AI report and actions */
          <>
            {/* AI Report Section */}
            <div className="mt-8" ref={reportRef}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  AI 맞춤 심층 분석 리포트
                </h3>
                <div className="flex items-center gap-2">
                  {reportSaved && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      저장됨
                    </span>
                  )}
                  {!isGenerating && aiReport && (
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1 text-[10px] text-pink-500 font-medium hover:text-pink-600 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      재생성
                    </button>
                  )}
                </div>
              </div>

              {/* Generating indicator */}
              {isGenerating && !aiReport && (
                <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-50 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 animate-spin opacity-30" />
                    <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">AI가 심리학 기반 분석 리포트를 작성하고 있습니다</p>
                  <p className="text-xs text-gray-400">가트맨 이론, 애착 이론, EFT 등 5개 심리학 프레임워크를 적용 중...</p>
                </div>
              )}

              {/* Structured Report Display */}
              {hasStructuredReport && !isGenerating ? (
                <div className="space-y-3">
                  {reportSections.map((section, idx) => {
                    const isExpanded = expandedSections.has(idx);
                    const isStrength = section.title.includes("강점") || section.title.includes("종합");
                    const isWarningSection = section.title.includes("위험") || section.title.includes("개선");
                    const isAction = section.title.includes("플랜") || section.title.includes("전략") || section.title.includes("실천");

                    let sectionBg = "bg-white";
                    let sectionBorder = "border-gray-50";
                    let iconBg = "bg-pink-50";

                    if (isWarningSection) {
                      sectionBg = "bg-amber-50/30";
                      sectionBorder = "border-amber-100";
                      iconBg = "bg-amber-50";
                    } else if (isAction) {
                      sectionBg = "bg-blue-50/30";
                      sectionBorder = "border-blue-100";
                      iconBg = "bg-blue-50";
                    } else if (isStrength) {
                      sectionBg = "bg-green-50/30";
                      sectionBorder = "border-green-100";
                      iconBg = "bg-green-50";
                    }

                    return (
                      <div key={idx} className={`${sectionBg} rounded-xl border ${sectionBorder} overflow-hidden shadow-sm`}>
                        <button
                          onClick={() => toggleSection(idx)}
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-base">{section.icon}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-800 flex-1">{section.title}</span>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <div className="prose prose-sm prose-pink max-w-none text-gray-700 leading-relaxed text-[13px] whitespace-pre-wrap">
                              {section.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : aiReport ? (
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-50">
                  <div className="prose prose-sm prose-pink max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                    {aiReport}
                    {isGenerating && <span className="inline-block w-1.5 h-4 bg-pink-500 animate-pulse ml-0.5 align-middle" />}
                  </div>
                </div>
              ) : null}

              {/* Report info badges */}
              {aiReport && !isGenerating && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-600 text-[10px] font-medium rounded-full">
                    <BookOpen className="w-3 h-3" />
                    가트맨 이론
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full">
                    <Target className="w-3 h-3" />
                    애착 이론
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-medium rounded-full">
                    <Lightbulb className="w-3 h-3" />
                    EFT · CBT
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-medium rounded-full">
                    <Sparkles className="w-3 h-3" />
                    deepseek-v3.2
                  </span>
                </div>
              )}
            </div>

            {/* ── Relationship Time-series Trend Tracker ── */}
            <div className="mt-8">
              <RelationshipTrendTracker />
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              {/* PDF Download Button */}
              {aiReport && !isGenerating && (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-[15px] py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[52px]"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        PDF 생성 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        PDF 다운로드
                      </>
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu((prev) => !prev)}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-[15px] py-4 px-5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all min-h-[52px]"
                    >
                      <Share2 className="w-4 h-4" />
                      공유
                    </button>

                    {/* Share Menu Dropdown */}
                    {showShareMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                        <div className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">리포트 공유하기</span>
                            <button onClick={() => setShowShareMenu(false)} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                              <XIcon className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          </div>
                          <div className="p-2">
                            {typeof navigator !== "undefined" && "share" in navigator && (
                              <button
                                onClick={handleNativeShare}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                                  <Share2 className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">네이티브 공유</p>
                                  <p className="text-[10px] text-gray-400">카카오톡, 메시지 등</p>
                                </div>
                              </button>
                            )}
                            <button
                              onClick={handleKakaoShare}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#3C1E1E">
                                  <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.56-.96 3.6-.99 3.83 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.56.08 1.14.12 1.72.12 5.52 0 10-3.58 10-7.94C22 6.58 17.52 3 12 3z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">카카오톡</p>
                                <p className="text-[10px] text-gray-400">카카오스토리로 공유</p>
                              </div>
                            </button>
                            <button
                              onClick={handleEmailShare}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                                <Mail className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">이메일</p>
                                <p className="text-[10px] text-gray-400">이메일로 리포트 전송</p>
                              </div>
                            </button>
                            <button
                              onClick={handleTwitterShare}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                                <XIcon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">X (Twitter)</p>
                                <p className="text-[10px] text-gray-400">트위터에 공유</p>
                              </div>
                            </button>
                            <button
                              onClick={handleCopyLink}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center flex-shrink-0">
                                <Link2 className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">링크 복사</p>
                                <p className="text-[10px] text-gray-400">클립보드에 복사</p>
                              </div>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate(`/chatbot?diagnosisId=${id}`)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-[15px] py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all min-h-[52px]"
              >
                <MessageCircle className="w-5 h-5" />
                AI 코치와 심층 상담하기
              </button>
              <button
                onClick={() => navigate("/my")}
                className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 font-bold text-[15px] py-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all min-h-[52px]"
              >
                <BookOpen className="w-5 h-5" />
                마이페이지에서 리포트 확인
              </button>
              <button
                onClick={() => navigate("/diagnosis")}
                className="w-full flex items-center justify-center gap-2 bg-white text-pink-600 font-bold text-[15px] py-4 rounded-xl border-2 border-pink-200 hover:bg-pink-50 active:bg-pink-100 transition-all min-h-[52px]"
              >
                <RotateCcw className="w-5 h-5" />
                다시 진단하기
              </button>
            </div>
          </>
        )}

        {/* Hidden PDF Content for html2canvas capture */}
        <div ref={pdfContentRef} style={{ display: "none", width: "800px", fontFamily: "sans-serif" }}>
          <div style={{ padding: "40px", backgroundColor: "#ffffff" }}>
            {/* PDF Header / Branding */}
            <div style={{ textAlign: "center", marginBottom: "32px", borderBottom: "3px solid #ec4899", paddingBottom: "24px" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#ec4899", marginBottom: "4px" }}>💕 HeartSync</div>
              <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "16px" }}>AI 기반 커플 관계 심층 분석 리포트</div>
              <div style={{ fontSize: "11px", color: "#d1d5db" }}>
                생성일: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            {/* Overall Score */}
            <div style={{ background: "linear-gradient(135deg, #ec4899, #f43f5e)", borderRadius: "16px", padding: "28px", color: "#ffffff", marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", opacity: 0.8, marginBottom: "4px" }}>종합 관계 점수</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "48px", fontWeight: 800 }}>{totalScore}</span>
                <span style={{ fontSize: "18px", opacity: 0.7, marginBottom: "6px" }}>/ 250</span>
              </div>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.9)", color: overall.color.replace("text-", "").includes("green") ? "#16a34a" : overall.color.includes("blue") ? "#2563eb" : overall.color.includes("amber") ? "#d97706" : "#dc2626", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>
                {overall.grade} · {overall.label}
              </div>
              <div style={{ marginTop: "16px", height: "8px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(totalScore / 250) * 100}%`, backgroundColor: "#ffffff", borderRadius: "999px" }} />
              </div>
            </div>

            {/* Risk Message */}
            <div style={{ padding: "16px", borderRadius: "12px", border: "2px solid #fecdd3", backgroundColor: "#fff1f2", marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, lineHeight: 1.7, color: "#9f1239", margin: 0 }}>
                {overallMessage}
              </p>
            </div>

            {/* Category Scores */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>5대 영역별 점수</h3>
              {Object.entries(scores).map(([cat, score]) => {
                const info = categoryInfo[cat];
                if (!info) return null;
                const numScore = Number(score);
                const pct = numScore / 50;
                const barColor = pct >= 0.7 ? "#22c55e" : pct >= 0.55 ? "#3b82f6" : pct >= 0.45 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", backgroundColor: "#f9fafb", borderRadius: "12px", marginBottom: "8px", border: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: "20px" }}>{info.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{info.label}</span>
                          <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "4px" }}>{info.subtitle}</span>
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: barColor }}>{numScore}/50</span>
                      </div>
                      <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: barColor, borderRadius: "999px" }} />
                      </div>
                      <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px", lineHeight: 1.5, margin: "6px 0 0 0" }}>
                        {getCategoryInterpretation(cat, numScore)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Report Sections */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                ✨ AI 맞춤 심층 분석 리포트
              </h3>
              {parseReportSections(aiReport).map((section, idx) => (
                <div key={idx} style={{ backgroundColor: "#fafafa", borderRadius: "12px", border: "1px solid #f0f0f0", padding: "16px 20px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{section.icon}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>{section.title}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* PDF Footer with Legal & Business Compliance */}
            <div style={{ textAlign: "center", borderTop: "2px solid #e5e7eb", paddingTop: "20px", marginTop: "24px" }}>
              <div style={{ fontSize: "13px", color: "#ec4899", fontWeight: 700, marginBottom: "6px" }}>💕 HeartSync 관계 심층 진단 솔루션</div>
              
              {/* Medical / Psychological Counseling Legal Disclaimer */}
              <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", margin: "10px 0", fontSize: "10px", color: "#4b5563", lineHeight: 1.6 }}>
                <strong>[법적 고지 및 의료 면책 조항]</strong><br />
                본 진단 및 AI 코칭은 임상 심리학적 치료나 정신건강의학과 전문의의 의료 진단 행위를 대체하지 않으며, 관계 개선을 돕기 위한 코칭 가이드 목적의 콘텐츠입니다.
              </div>

              <div style={{ fontSize: "9px", color: "#9ca3af", lineHeight: 1.6, marginTop: "8px" }}>
                주식회사 레드뱅크 | 대표: 이종철 | 사업자등록번호: 132-86-23186 | 통신판매업신고: 제2016-서울송파-0856호<br />
                사업장 주소: 서울특별시 송파구 문정로 246, 2호 (마천동, 사회적경제센터 1-1) | 고객센터: 1599-9573 | vikin@hanmail.net
              </div>
              <div style={{ fontSize: "9px", color: "#d1d5db", marginTop: "6px" }}>
                가트맨 이론 · 애착 이론 · EFT · CBT · deepseek-v3.2 기반 AI 심리 분석 리포트
              </div>
            </div>
          </div>
        </div>

        {/* ── Partner Invite Modal (Viral Loop) ── */}
        <PartnerInviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          myDiagnosisId={id}
          myScore={totalScore}
        />

        {/* ── Website Footer for PG Compliance ── */}
        <Footer className="pb-28 mt-12" />
      </main>
    </div>
  );
}