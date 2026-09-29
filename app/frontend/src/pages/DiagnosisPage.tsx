import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Heart, CheckCircle, Save, HardDrive, Cloud, WifiOff, Wifi, RefreshCw, HelpCircle, X } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import LoginModal from "@/components/LoginModal";

const client = createClient();

interface Question {
  id: number;
  text: string;
  reversed?: boolean;
}

interface Part {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  questions: Question[];
}

/** Psychological concept tooltips for each question (keyed by question id) */
const questionTooltips: Record<number, { concept: string; theory: string; description: string }> = {
  // ── Part 1: 갈등 관리 (Gottman's Four Horsemen & Conflict Patterns) ──
  1:  { concept: "비난 (Criticism)", theory: "가트맨의 4가지 독소", description: "행동이 아닌 상대방의 인격 자체를 공격하는 패턴입니다. '너는 왜 항상…'처럼 상대를 비난하면 갈등이 확대됩니다." },
  2:  { concept: "담쌓기 (Stonewalling)", theory: "가트맨의 4가지 독소", description: "갈등 시 대화를 차단하고 회피하는 행동입니다. 감정적 과부하로 인해 발생하며, 관계 만족도를 크게 떨어뜨립니다." },
  3:  { concept: "방어 (Defensiveness)", theory: "가트맨의 4가지 독소", description: "상대의 말을 경청하지 않고 자기 입장만 변호하는 태도입니다. 공감 없는 방어는 갈등 해결을 막습니다." },
  4:  { concept: "화해 시도의 실패", theory: "가트맨 이론 - 회복 시도(Repair Attempt)", description: "갈등 중 화해를 시도하는 것은 건강한 신호이지만, 상대가 이를 받아주지 않으면 관계가 악화됩니다. 회복 시도의 성공률은 관계 예후의 핵심 지표입니다." },
  5:  { concept: "갈등 후 처리 (Aftermath Processing)", theory: "가트맨 이론", description: "싸움 후 차분하게 복기하는 대화는 같은 갈등의 반복을 막습니다. 이 과정이 없으면 미해결 감정이 쌓여 관계가 침식됩니다." },
  6:  { concept: "경멸 (Contempt)", theory: "가트맨의 4가지 독소", description: "무시, 조롱, 빈정거림 등 상대를 깔보는 태도입니다. 가트맨 연구에서 이혼의 가장 강력한 예측 인자로 밝혀졌습니다." },
  7:  { concept: "영원한 문제 (Perpetual Problems)", theory: "가트맨 이론", description: "커플 갈등의 69%는 성격·가치관 차이에서 비롯된 '영원한 문제'입니다. 해결보다는 대화를 통한 관리가 핵심입니다." },
  8:  { concept: "과잉 일반화 (Overgeneralization)", theory: "인지행동치료(CBT)", description: "'항상', '절대'와 같은 극단적 표현은 인지 왜곡의 일종입니다. 상대방을 부정적으로 고정시키며 건설적 대화를 방해합니다." },
  9:  { concept: "감정 억압 (Emotional Suppression)", theory: "감정 조절 이론", description: "갈등 회피를 위해 감정을 억누르면 단기적으로는 평화롭지만, 장기적으로 분노가 축적되어 폭발하거나 정서적 거리감이 생깁니다." },
  10: { concept: "갈등 해결 시스템", theory: "가트맨 이론 - 관계의 건전한 집(Sound Relationship House)", description: "건강한 커플은 갈등을 다루는 명확한 규칙(예: 타임아웃, 경청 규칙)을 가지고 있습니다. 이 시스템이 없으면 갈등이 혼란스럽게 확대됩니다." },

  // ── Part 2: 정서적 친밀감 (Love Map, Emotional Bank Account) ──
  11: { concept: "사랑의 지도 (Love Map)", theory: "가트맨 이론", description: "상대방의 일상, 스트레스, 기쁨을 구체적으로 아는 것입니다. 사랑의 지도가 상세할수록 정서적 연결이 깊어집니다." },
  12: { concept: "상호 전환 (Turning Toward)", theory: "가트맨 이론 - 감정 은행 계좌", description: "상대의 관심 요청(bid)에 응답하는 것입니다. 일상적 대화도 감정 은행 계좌에 '입금'하는 행위로, 관계의 기초를 다집니다." },
  13: { concept: "꿈 속의 꿈 (Dreams Within Conflict)", theory: "가트맨 이론", description: "상대방의 인생 목표와 꿈을 이해하고 지지하는 것은 깊은 친밀감의 핵심입니다. 서로의 꿈을 존중할 때 관계가 성장합니다." },
  14: { concept: "의도적 친밀감 (Intentional Intimacy)", theory: "관계 유지 이론", description: "바쁜 일상 속에서도 의도적으로 둘만의 시간을 만드는 것은 관계 만족도를 높이는 핵심 행동입니다." },
  15: { concept: "취약성 공유 (Vulnerability Sharing)", theory: "브레네 브라운(Brené Brown) 이론", description: "자신의 약점과 부끄러움을 솔직히 나누는 것은 진정한 친밀감의 기반입니다. 취약성은 용기이며, 깊은 연결을 만듭니다." },
  16: { concept: "정서적 조율 (Emotional Attunement)", theory: "EFT(감정중심치료)", description: "상대방의 감정 상태를 감지하고 적절히 반응하는 능력입니다. 정서적 조율이 잘 되면 '나를 이해해주는 사람'이라는 안정감을 줍니다." },
  17: { concept: "깊은 자기 개방 (Deep Self-Disclosure)", theory: "사회적 침투 이론", description: "어린 시절 상처나 트라우마를 나누는 것은 관계의 깊이를 결정합니다. 이 과정을 통해 서로를 더 깊이 이해하게 됩니다." },
  18: { concept: "존중과 애정 (Fondness & Admiration)", theory: "가트맨 이론 - 관계의 건전한 집", description: "상대방에 대한 존중과 애정은 관계의 기둥입니다. 이것이 무너지면 경멸이 자리잡게 됩니다." },
  19: { concept: "공유된 유머 (Shared Humor)", theory: "관계 심리학", description: "함께 웃을 수 있는 것은 정서적 유대의 강력한 지표입니다. 유머는 긴장을 완화하고 친밀감을 높이는 역할을 합니다." },
  20: { concept: "우정 기반 사랑 (Friendship-Based Love)", theory: "가트맨 이론", description: "가트맨은 행복한 관계의 핵심이 '우정'이라고 강조합니다. 상대방이 가장 친한 친구일 때 관계 만족도가 가장 높습니다." },

  // ── Part 3: 신뢰 및 애착 (Attachment Theory) ──
  21: { concept: "불안형 애착 (Anxious Attachment)", theory: "볼비(Bowlby)의 애착 이론", description: "연락이 안 될 때 극심한 불안을 느끼는 것은 불안형 애착의 특징입니다. 어린 시절 양육자의 일관성 없는 반응에서 형성될 수 있습니다." },
  22: { concept: "유기 불안 (Abandonment Anxiety)", theory: "애착 이론", description: "상대가 떠날 수 있다는 막연한 불안은 불안정 애착의 핵심 증상입니다. 이는 관계에서 과도한 집착이나 의존으로 나타날 수 있습니다." },
  23: { concept: "안전 기지 (Secure Base)", theory: "볼비의 애착 이론", description: "상대방이 항상 곁에 있을 것이라는 확신은 안정 애착의 핵심입니다. 이 안전 기지가 있을 때 개인의 성장과 탐색이 가능해집니다." },
  24: { concept: "관계 투명성 (Relational Transparency)", theory: "신뢰 구축 이론", description: "서로에게 숨기는 것이 없다는 느낌은 신뢰의 기반입니다. 투명한 소통은 건강한 경계를 유지하면서도 깊은 신뢰를 만듭니다." },
  25: { concept: "질투와 불안정 애착", theory: "애착 이론 - 불안형", description: "이성 관계에 대한 과도한 예민함은 불안형 애착에서 비롯될 수 있습니다. 건강한 신뢰는 상대의 사회적 관계를 존중하는 것을 포함합니다." },
  26: { concept: "회피형 애착 (Avoidant Attachment)", theory: "애착 이론", description: "친밀감이나 의존을 불편해하는 것은 회피형 애착의 특징입니다. 독립성을 과도하게 추구하며 정서적 거리를 유지하려 합니다." },
  27: { concept: "신뢰의 일관성 (Trust Consistency)", theory: "가트맨 이론 - 신뢰 측정", description: "말과 행동의 일치는 신뢰의 핵심 요소입니다. 가트맨은 신뢰를 '작은 순간들의 축적'이라고 정의합니다." },
  28: { concept: "과거 관계의 그림자", theory: "관계 트라우마 이론", description: "과거 연애 경험이 현재 관계에 영향을 미치는 것은 미해결된 감정 때문입니다. 이를 함께 다루지 않으면 반복적 갈등의 원인이 됩니다." },
  29: { concept: "신뢰 침식 (Trust Erosion)", theory: "가트맨 이론", description: "상대방의 솔직함을 의심하는 것은 신뢰가 침식되고 있다는 신호입니다. 작은 배신들이 쌓이면 관계의 기반이 흔들립니다." },
  30: { concept: "관계의 균형 (Relationship Equity)", theory: "사회교환이론", description: "한쪽이 더 많이 투자하는 '기울어진 관계'는 불만과 소진을 유발합니다. 건강한 관계는 주고받음의 균형이 유지됩니다." },

  // ── Part 4: 가치관 (Shared Meaning System) ──
  31: { concept: "재정적 호환성", theory: "가트맨 이론 - 공유 의미 체계", description: "돈에 대한 가치관 차이는 커플 갈등의 주요 원인 중 하나입니다. 소비 습관과 재정 관리에 대한 합의는 관계 안정의 기반입니다." },
  32: { concept: "양육 가치관 일치", theory: "가트맨 이론 - 공유 의미 체계", description: "자녀에 대한 가치관 차이는 '영원한 문제'가 될 수 있습니다. 사전에 충분한 대화를 통해 공유된 비전을 만드는 것이 중요합니다." },
  33: { concept: "확대가족 경계 설정", theory: "가족 체계 이론(Bowen)", description: "원가족과의 관계는 커플 관계에 큰 영향을 미칩니다. 건강한 경계 설정은 두 사람만의 독립적인 관계 공간을 만듭니다." },
  34: { concept: "여가 호환성", theory: "관계 만족도 연구", description: "함께 시간을 보내는 방식의 일치는 관계 만족도와 직결됩니다. 차이가 있다면 타협과 번갈아 하기 등의 전략이 필요합니다." },
  35: { concept: "핵심 가치관 갈등", theory: "가트맨 이론 - 영원한 문제(Gridlocked Problems)", description: "종교나 정치 같은 핵심 가치관 차이는 해결이 어려운 '교착 상태 문제'입니다. 해결보다는 상호 존중을 통한 공존이 목표입니다." },
  36: { concept: "가사 분담의 공정성", theory: "사회교환이론 / 형평 이론", description: "집안일 분담의 불공정함은 분노와 소진을 유발합니다. 공정하다고 '느끼는' 것이 실제 분담량보다 더 중요합니다." },
  37: { concept: "공유된 미래 비전", theory: "가트맨 이론 - 공유 의미 체계", description: "함께 미래를 구체적으로 그려보는 것은 관계에 방향성과 의미를 부여합니다. 공유된 비전이 있는 커플은 위기에 더 강합니다." },
  38: { concept: "커리어 지지", theory: "관계 지지 이론", description: "상대방의 직업에 대한 불만은 존중의 부재를 나타낼 수 있습니다. 서로의 커리어를 지지하는 것은 관계 만족도의 중요한 요소입니다." },
  39: { concept: "핵심 가치 일치", theory: "가트맨 이론 - 공유 의미 체계", description: "삶의 우선순위에 대한 가치관 일치는 장기적 관계 성공의 핵심입니다. 완전한 일치보다는 서로의 가치를 이해하고 존중하는 것이 중요합니다." },
  40: { concept: "장기적 헌신 (Long-term Commitment)", theory: "스턴버그의 사랑의 삼각형 이론", description: "함께 늙어가는 모습을 긍정적으로 그릴 수 있다면, 관계에 대한 헌신(Commitment)이 건강하다는 의미입니다." },

  // ── Part 5: 신체적/성적 만족도 ──
  41: { concept: "성적 만족도", theory: "성 치료 이론", description: "성관계의 빈도와 질에 대한 만족도는 전반적 관계 만족도와 밀접하게 연관됩니다. 불만족은 대화를 통해 개선할 수 있습니다." },
  42: { concept: "성적 소통 (Sexual Communication)", theory: "성 치료 이론", description: "성적 취향과 불만에 대해 솔직하게 대화할 수 있는 것은 성적 만족도의 가장 강력한 예측 인자입니다." },
  43: { concept: "비성적 스킨십 (Non-Sexual Touch)", theory: "애착 이론 / 옥시토신 연구", description: "일상적인 스킨십(손잡기, 포옹)은 옥시토신 분비를 촉진하여 정서적 유대를 강화합니다. 성관계 외의 스킨십이 관계의 기반입니다." },
  44: { concept: "성적 매력 인식", theory: "관계 심리학", description: "상대방이 나를 매력적으로 바라본다는 느낌은 자존감과 관계 만족도에 큰 영향을 미칩니다." },
  45: { concept: "성적 거부 패턴", theory: "성 치료 이론 - 욕구 불일치", description: "반복적인 성관계 거부는 거부당하는 쪽에게 깊은 상처를 줄 수 있습니다. 피로나 스트레스가 원인이라면 함께 해결책을 찾아야 합니다." },
  46: { concept: "스킨십 회피 (Touch Avoidance)", theory: "애착 이론 - 회피형", description: "스킨십을 피하는 것은 정서적 거리감의 신체적 표현일 수 있습니다. 회피형 애착이나 미해결된 갈등이 원인일 수 있습니다." },
  47: { concept: "성적 문제의 파급 효과 (Spillover Effect)", theory: "관계 체계 이론", description: "성적 불만족이 대화, 기분 등 관계의 다른 영역으로 번지는 현상입니다. 성적 문제는 독립적이 아닌 관계 전체의 맥락에서 이해해야 합니다." },
  48: { concept: "정서-신체 연결 (Emotional-Physical Connection)", theory: "EFT(감정중심치료)", description: "스킨십이 단순한 신체 접촉이 아닌 정서적 연결로 느껴지는 것은 건강한 친밀감의 지표입니다." },
  49: { concept: "성적 문제 인식", theory: "성 치료 이론", description: "전문가 도움이 필요하다고 느끼는 것은 문제의 심각성을 나타냅니다. 성 치료는 효과적이며, 도움을 구하는 것은 용기 있는 선택입니다." },
  50: { concept: "로맨틱 감소 (Romantic Decline)", theory: "스턴버그의 사랑의 삼각형 이론 - 열정(Passion)", description: "열정의 감소는 자연스러운 현상이지만, 과도한 감소는 관계 위기의 신호입니다. 의도적인 로맨틱 행동으로 열정을 유지할 수 있습니다." },
};

/** Intro cards for each part — shown when user enters a new section */
const partIntros: Record<string, { theory: string; theorist: string; icon: string; summary: string; keyPoints: string[] }> = {
  conflict: {
    theory: "가트맨의 4가지 독소 (The Four Horsemen)",
    theorist: "존 가트맨 박사 (Dr. John Gottman)",
    icon: "🧪",
    summary: "40년간 3,000쌍 이상의 커플을 연구한 가트맨 박사는 관계를 파괴하는 4가지 소통 패턴을 발견했습니다. 이를 '묵시록의 4기사'라 부르며, 이 패턴의 존재 여부로 이혼을 93.6% 정확도로 예측할 수 있었습니다.",
    keyPoints: [
      "비난(Criticism): 행동이 아닌 인격을 공격",
      "경멸(Contempt): 무시·조롱 — 가장 치명적인 독소",
      "방어(Defensiveness): 공감 없이 자기 변호만",
      "담쌓기(Stonewalling): 대화를 차단하고 회피",
    ],
  },
  intimacy: {
    theory: "사랑의 지도 & 감정 은행 계좌",
    theorist: "존 가트맨 박사 · 브레네 브라운 박사",
    icon: "🗺️",
    summary: "정서적 친밀감은 상대방의 내면 세계를 얼마나 잘 아는지('사랑의 지도')와 일상에서 얼마나 많은 긍정적 상호작용을 쌓는지('감정 은행 계좌')에 의해 결정됩니다. 브레네 브라운은 진정한 친밀감의 핵심이 '취약성을 나누는 용기'라고 강조합니다.",
    keyPoints: [
      "사랑의 지도: 상대의 꿈, 스트레스, 기쁨을 구체적으로 아는 것",
      "감정 은행 계좌: 일상적 관심과 응답이 '입금'이 됨",
      "취약성 공유: 약점을 나눌 수 있을 때 진정한 연결이 형성",
      "우정 기반: 행복한 커플의 핵심은 깊은 우정",
    ],
  },
  trust: {
    theory: "애착 이론 (Attachment Theory)",
    theorist: "존 볼비 (John Bowlby) · 메리 에인스워스 (Mary Ainsworth)",
    icon: "🔗",
    summary: "어린 시절 양육자와의 관계에서 형성된 애착 유형은 성인 연애 패턴에 깊은 영향을 미칩니다. 안정형, 불안형, 회피형의 3가지 주요 유형이 있으며, 자신과 상대의 애착 유형을 이해하면 관계의 역동을 더 잘 파악할 수 있습니다.",
    keyPoints: [
      "안정형: 친밀감에 편안하고 독립성도 유지",
      "불안형: 버림받을까 불안하여 과도하게 집착",
      "회피형: 친밀감이 불편하여 정서적 거리를 유지",
      "애착 유형은 인식과 노력으로 변화 가능",
    ],
  },
  values: {
    theory: "공유 의미 체계 (Shared Meaning System)",
    theorist: "존 가트맨 박사 · 로버트 스턴버그 박사",
    icon: "🏛️",
    summary: "가트맨의 '관계의 건전한 집(Sound Relationship House)' 모델에서 최상층에 위치하는 것이 '공유 의미 체계'입니다. 커플이 삶의 목적, 가치관, 미래 비전을 공유할 때 관계는 단순한 동거를 넘어 깊은 의미를 갖게 됩니다.",
    keyPoints: [
      "재정·양육·가족 관계에 대한 가치관 합의가 핵심",
      "커플 갈등의 69%는 해결 불가능한 '영원한 문제'",
      "해결보다 대화를 통한 관리와 상호 존중이 목표",
      "공유된 미래 비전이 있는 커플은 위기에 더 강함",
    ],
  },
  physical: {
    theory: "성적 친밀감 & 정서-신체 연결",
    theorist: "성 치료 이론 · EFT(감정중심치료)",
    icon: "💫",
    summary: "신체적 친밀감은 단순한 성관계를 넘어 정서적 연결의 신체적 표현입니다. 연구에 따르면 성적 만족도의 가장 강력한 예측 인자는 '성에 대해 솔직하게 대화할 수 있는 능력'이며, 일상적 스킨십(포옹, 손잡기)은 옥시토신 분비를 촉진하여 유대감을 강화합니다.",
    keyPoints: [
      "성적 소통 능력이 만족도의 가장 강력한 예측 인자",
      "비성적 스킨십이 정서적 유대의 기반",
      "성적 문제는 관계 전체의 맥락에서 이해해야 함",
      "열정의 자연스러운 변화를 이해하고 의도적으로 관리",
    ],
  },
};

const parts: Part[] = [
  {
    key: "conflict",
    title: "갈등 관리 및 소통 패턴",
    subtitle: "The Conflict Pattern",
    emoji: "⚡",
    questions: [
      { id: 1, text: "우리는 사소한 문제로 시작해 서로의 인격을 비난하는 싸움으로 번질 때가 많다.", reversed: true },
      { id: 2, text: "싸우는 도중 상대방이나 나, 둘 중 한 명은 입을 다물거나 자리를 피해버린다.", reversed: true },
      { id: 3, text: "갈등이 생겼을 때, 나는 상대방의 말에 공감하기보다 내 입장을 방어하기에 급급하다.", reversed: true },
      { id: 4, text: "화해를 시도했을 때, 상대방이 이를 받아주지 않아 상황이 더 악화된 적이 많다.", reversed: true },
      { id: 5, text: "우리는 싸움이 끝난 후, 무엇이 문제였는지 차분하게 복기하는 대화를 거의 하지 않는다.", reversed: true },
      { id: 6, text: "상대방의 말투나 표정에서 나를 무시하거나 조롱한다는 느낌(경멸)을 받을 때가 있다.", reversed: true },
      { id: 7, text: "우리는 한 가지 주제(예: 돈, 시댁/처가, 집안일)로 반복해서 똑같이 싸운다.", reversed: true },
      { id: 8, text: "싸울 때 \"너는 항상 그래\", \"너는 한 번도 안 그래\"와 같은 극단적인 표현을 쓴다.", reversed: true },
      { id: 9, text: "나는 상대방에게 불만이 있어도 갈등이 될까 봐 속으로만 참고 표현하지 않는다.", reversed: true },
      { id: 10, text: "우리 커플은 갈등을 해결하는 명확한 규칙이나 노하우가 없다.", reversed: true },
    ],
  },
  {
    key: "intimacy",
    title: "정서적 친밀감 및 우정",
    subtitle: "Emotional Intimacy",
    emoji: "💕",
    questions: [
      { id: 11, text: "나는 오늘 상대방이 겪은 구체적인 스트레스 요인이 무엇인지 알고 있다." },
      { id: 12, text: "우리는 하루 일과를 마치고 서로 대화하는 시간이 즐겁고 기다려진다." },
      { id: 13, text: "상대방은 내 인생의 꿈과 목표가 무엇인지 정확히 알고 지지해준다." },
      { id: 14, text: "우리는 최근 1개월 이내에 둘만이 즐길 수 있는 데이트나 취미 활동을 했다." },
      { id: 15, text: "나는 상대방에게 나의 부끄러운 점이나 약점을 솔직하게 털어놓을 수 있다." },
      { id: 16, text: "상대방은 내가 우울하거나 힘들 때, 나를 위로하는 방법을 잘 알고 있다." },
      { id: 17, text: "우리는 서로의 어린 시절 상처나 트라우마에 대해 깊이 대화해 본 적이 있다." },
      { id: 18, text: "나는 상대방이 나를 진심으로 존중하고 있다고 느낀다." },
      { id: 19, text: "우리는 유머 코드가 잘 맞아 함께 웃는 일이 많다." },
      { id: 20, text: "상대방은 나의 가장 친한 친구(Best Friend)라고 말할 수 있다." },
    ],
  },
  {
    key: "trust",
    title: "신뢰 및 애착 유형",
    subtitle: "Trust & Attachment",
    emoji: "🤝",
    questions: [
      { id: 21, text: "연락이 되지 않으면 상대방이 무엇을 하고 있는지 불안해서 견디기 힘들다.", reversed: true },
      { id: 22, text: "나는 상대방이 언제든 나를 떠날 수도 있다는 막연한 불안감을 느낀다.", reversed: true },
      { id: 23, text: "상대방은 내가 필요로 할 때 항상 그 자리에 있을 것이라는 확신이 있다." },
      { id: 24, text: "우리는 서로에게 숨기는 것이 없다고 느끼며, 투명하게 소통하고 있다." },
      { id: 25, text: "상대방이 이성 동료나 친구를 만나는 것에 대해 예민하게 반응하는 편이다.", reversed: true },
      { id: 26, text: "나는 상대방에게 의존하는 것이 불편하고, 혼자 해결하는 것이 편하다.", reversed: true },
      { id: 27, text: "상대방은 약속을 잘 지키며, 말과 행동이 일치하는 사람이다." },
      { id: 28, text: "우리는 과거의 연애사나 이성 문제로 인해 현재도 갈등을 빚곤 한다.", reversed: true },
      { id: 29, text: "나는 상대방이 나에게 솔직하지 않다고 느낄 때가 종종 있다.", reversed: true },
      { id: 30, text: "우리 관계는 한 쪽이 더 많이 사랑하고 매달리는 '기울어진 관계' 같다.", reversed: true },
    ],
  },
  {
    key: "values",
    title: "가치관 및 공유 의미",
    subtitle: "Values & Shared Meaning",
    emoji: "🌟",
    questions: [
      { id: 31, text: "우리는 경제권 관리와 소비 습관에 대해 합의가 잘 되어 있다." },
      { id: 32, text: "자녀 계획이나 양육 방식에 대해 우리 둘의 생각은 비슷하다." },
      { id: 33, text: "양가 부모님이나 가족을 대하는 태도에 대해 큰 갈등은 없다." },
      { id: 34, text: "우리는 주말이나 휴가를 보내는 방식(휴식 vs 활동)이 잘 맞는다." },
      { id: 35, text: "종교나 정치적 견해 차이로 인해 심각하게 다툰 적이 있다.", reversed: true },
      { id: 36, text: "집안일 분담이 공정하게 이루어지고 있다고 생각한다." },
      { id: 37, text: "우리는 5년, 10년 뒤의 미래를 함께 구체적으로 그려본 적이 있다." },
      { id: 38, text: "상대방의 직업이나 커리어에 대해 나는 불만이 있다.", reversed: true },
      { id: 39, text: "우리는 삶에서 무엇이 가장 중요한지(예: 성공, 가족, 행복)에 대한 가치관이 일치한다." },
      { id: 40, text: "상대방과 함께 늙어가는 모습이 긍정적으로 그려진다." },
    ],
  },
  {
    key: "physical",
    title: "신체적/성적 만족도",
    subtitle: "Physical & Sexual Intimacy",
    emoji: "🔥",
    questions: [
      { id: 41, text: "나는 현재 우리의 성관계 횟수와 퀄리티에 만족한다." },
      { id: 42, text: "우리는 성적인 불만이나 취향에 대해 솔직하게 대화할 수 있다." },
      { id: 43, text: "성관계 외에도 손잡기, 포옹 등 일상적인 스킨십이 자연스럽고 많다." },
      { id: 44, text: "상대방은 나를 여전히 매력적인 이성으로 바라보고 있다고 느낀다." },
      { id: 45, text: "피곤하거나 바쁘다는 이유로 성관계를 거부하는 일이 잦아졌다.", reversed: true },
      { id: 46, text: "나는 스킨십을 원하지만 상대방이 피하는 느낌을 받는다.", reversed: true },
      { id: 47, text: "우리의 잠자리 문제는 관계의 다른 부분(대화, 기분 등)에 영향을 미친다.", reversed: true },
      { id: 48, text: "나는 상대방과의 스킨십이 정서적으로 연결되어 있다는 느낌을 준다." },
      { id: 49, text: "성적인 문제로 인해 전문가의 도움을 받고 싶다는 생각을 한 적이 있다.", reversed: true },
      { id: 50, text: "전반적으로 우리 커플의 로맨틱한 분위기는 연애 초기에 비해 너무 많이 식었다.", reversed: true },
    ],
  },
];

const allQuestions = parts.flatMap((p) => p.questions);
const scoreLabels = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];

function getPartForQuestion(qId: number): Part | undefined {
  return parts.find((p) => p.questions.some((q) => q.id === qId));
}

// ── localStorage helpers ──
const LS_KEY_ANSWERS = "heartsync_draft_answers";
const LS_KEY_QUESTION = "heartsync_draft_question";

function parseAnswersObj(raw: unknown): Record<number, number> {
  const parsed: Record<number, number> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const num = Number(v);
      if (!isNaN(num) && num >= 1 && num <= 5) {
        parsed[Number(k)] = num;
      }
    }
  }
  return parsed;
}

function loadLocalDraft(): { answers: Record<number, number>; currentQ: number } {
  try {
    const rawAnswers = localStorage.getItem(LS_KEY_ANSWERS);
    const rawQ = localStorage.getItem(LS_KEY_QUESTION);
    const answers = rawAnswers ? parseAnswersObj(JSON.parse(rawAnswers)) : {};
    const currentQ = rawQ ? Math.max(0, parseInt(rawQ, 10) || 0) : 0;
    return { answers, currentQ };
  } catch {
    return { answers: {}, currentQ: 0 };
  }
}

function saveLocalDraft(answers: Record<number, number>, currentQ: number) {
  try {
    localStorage.setItem(LS_KEY_ANSWERS, JSON.stringify(answers));
    localStorage.setItem(LS_KEY_QUESTION, String(currentQ));
  } catch {
    // Storage full or unavailable
  }
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(LS_KEY_ANSWERS);
    localStorage.removeItem(LS_KEY_QUESTION);
  } catch {
    // Ignore
  }
}

/** Merge two answer sets: the one with more answers wins; if equal, prefer server */
function mergeAnswers(
  localAns: Record<number, number>,
  serverAns: Record<number, number>
): { merged: Record<number, number>; source: "local" | "server" | "merged" } {
  const localCount = Object.keys(localAns).length;
  const serverCount = Object.keys(serverAns).length;

  if (localCount === 0 && serverCount === 0) return { merged: {}, source: "local" };
  if (localCount === 0) return { merged: { ...serverAns }, source: "server" };
  if (serverCount === 0) return { merged: { ...localAns }, source: "local" };

  // Both have data — merge: take union, server values take priority for conflicts
  const merged: Record<number, number> = { ...localAns, ...serverAns };
  const mergedCount = Object.keys(merged).length;

  if (mergedCount > localCount && mergedCount > serverCount) {
    return { merged, source: "merged" };
  }
  if (serverCount >= localCount) {
    return { merged: { ...localAns, ...serverAns }, source: "server" };
  }
  return { merged: { ...serverAns, ...localAns }, source: "local" };
}

const DRAFT_SAVE_DELAY = 1500;

export default function DiagnosisPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFreshStart = searchParams.get("fresh") === "true";
  const inviteFrom = searchParams.get("invite_from");
  const partnerName = searchParams.get("partner_name");
  const diagId = searchParams.get("diag_id");
  const giftTicket = searchParams.get("gift_ticket");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [draftSource, setDraftSource] = useState<"local" | "server" | "merged" | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [wasRestored, setWasRestored] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncFailed, setSyncFailed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissedIntros, setDismissedIntros] = useState<Set<string>>(new Set());
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingResultId, setPendingResultId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  const currentQRef = useRef(currentQ);
  const draftIdRef = useRef(draftId);
  const pendingSyncRef = useRef(false);
  const isLoggedInRef = useRef(isLoggedIn);
  const retryCountRef = useRef(0);

  // ── Swipe gesture state ──
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeTransitioning, setIsSwipeTransitioning] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 50; // minimum px to trigger navigation
  const SWIPE_MAX_Y_RATIO = 1.5; // max vertical/horizontal ratio (to avoid triggering on vertical scroll)

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { currentQRef.current = currentQ; setShowTooltip(false); }, [currentQ]);
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);
  useEffect(() => { isLoggedInRef.current = isLoggedIn; }, [isLoggedIn]);

  // ── Confetti interstitial: fire confetti and navigate after 2s ──
  useEffect(() => {
    if (!showInterstitial || !pendingResultId) return;

    // Fire confetti burst
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#ec4899", "#f43f5e", "#a855f7", "#f97316", "#facc15"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#ec4899", "#f43f5e", "#a855f7", "#f97316", "#facc15"],
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      navigate(`/result/${pendingResultId}`);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showInterstitial, pendingResultId, navigate]);

  // ── Swipe gesture handlers ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setSwipeOffset(0);
    setIsSwipeTransitioning(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const absDeltaX = Math.abs(deltaX);

    // Only track horizontal swipes (ignore vertical scrolling)
    if (deltaY > absDeltaX * SWIPE_MAX_Y_RATIO) return;

    // Apply resistance: offset follows finger but with dampening beyond threshold
    const maxOffset = 120;
    const dampened = absDeltaX > maxOffset
      ? maxOffset + (absDeltaX - maxOffset) * 0.3
      : absDeltaX;
    setSwipeOffset(deltaX > 0 ? dampened : -dampened);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;

    const offset = swipeOffset;
    const absDelta = Math.abs(offset);
    touchStartRef.current = null;

    if (absDelta >= SWIPE_THRESHOLD) {
      if (offset > 0) {
        // Swipe right → go to previous question
        if (currentQRef.current > 0) {
          setIsSwipeTransitioning(true);
          setSwipeOffset(300); // slide out to right
          setTimeout(() => {
            setCurrentQ((prev) => Math.max(0, prev - 1));
            setSwipeOffset(-300); // prepare entry from left
            requestAnimationFrame(() => {
              setIsSwipeTransitioning(true);
              setSwipeOffset(0); // slide in
              setTimeout(() => setIsSwipeTransitioning(false), 300);
            });
          }, 150);
          return;
        }
      } else {
        // Swipe left → go to next question (only if current question is answered)
        const currentQuestion = allQuestions[currentQRef.current];
        if (currentQuestion && answersRef.current[currentQuestion.id] && currentQRef.current < allQuestions.length - 1) {
          setIsSwipeTransitioning(true);
          setSwipeOffset(-300); // slide out to left
          setTimeout(() => {
            setCurrentQ((prev) => Math.min(allQuestions.length - 1, prev + 1));
            setSwipeOffset(300); // prepare entry from right
            requestAnimationFrame(() => {
              setIsSwipeTransitioning(true);
              setSwipeOffset(0); // slide in
              setTimeout(() => setIsSwipeTransitioning(false), 300);
            });
          }, 150);
          return;
        }
      }
    }

    // Snap back if swipe didn't trigger navigation
    setIsSwipeTransitioning(true);
    setSwipeOffset(0);
    setTimeout(() => setIsSwipeTransitioning(false), 300);
  }, [swipeOffset]);

  // ── Log sync attempt to server ──
  const logSyncAttempt = useCallback(async (
    status: "success" | "failed",
    attemptCount: number,
    syncType: "auto" | "manual",
    errorMessage = ""
  ) => {
    try {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      await client.entities.sync_logs.create({
        data: {
          status,
          attempt_count: attemptCount,
          sync_type: syncType,
          error_message: errorMessage,
          created_at: now,
        },
      });
    } catch {
      // Logging failure should not block main flow
    }
  }, []);

  // ── Core sync attempt (single try) ──
  const attemptServerSync = useCallback(async (): Promise<boolean> => {
    if (!isLoggedInRef.current) return false;
    const currentAnswers = answersRef.current;
    if (Object.keys(currentAnswers).length === 0) return false;

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const payload = {
      answers: JSON.stringify(currentAnswers),
      current_question: currentQRef.current,
      updated_at: now,
    };

    const currentDraftId = draftIdRef.current;
    if (currentDraftId) {
      await client.entities.diagnosis_drafts.update({
        id: String(currentDraftId),
        data: payload,
      });
    } else {
      const resp = await client.entities.diagnosis_drafts.create({
        data: { ...payload, created_at: now },
      });
      if (resp?.data?.id) {
        setDraftId(resp.data.id);
      }
    }
    return true;
  }, []);

  // ── Exponential backoff sync with max 3 retries ──
  const MAX_RETRY = 3;
  const BASE_DELAY = 1000; // 1s, 2s, 4s
  // Track sync type for logging
  const syncTypeRef = useRef<"auto" | "manual">("auto");

  const syncToServerWithRetry = useCallback(async (attempt = 0) => {
    if (!isLoggedInRef.current || !pendingSyncRef.current) return;

    setIsSyncing(true);
    setSyncFailed(false);
    retryCountRef.current = attempt;

    try {
      await attemptServerSync();
      // Success — log it
      await logSyncAttempt("success", attempt, syncTypeRef.current);
      toast.success(
        attempt > 0
          ? `재시도 ${attempt}회 만에 서버 동기화 성공!`
          : "온라인 복귀! 서버에 동기화되었습니다.",
        { icon: <Wifi className="w-4 h-4 text-green-500" /> }
      );
      setDraftStatus("saved");
      pendingSyncRef.current = false;
      retryCountRef.current = 0;
      setIsSyncing(false);
      setSyncFailed(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const nextAttempt = attempt + 1;

      // Log each failed attempt
      await logSyncAttempt("failed", attempt, syncTypeRef.current, errorMsg);

      if (nextAttempt < MAX_RETRY) {
        const delay = BASE_DELAY * Math.pow(2, attempt); // 1s, 2s, 4s
        toast.warning(
          `서버 동기화 실패 (${nextAttempt}/${MAX_RETRY}). ${delay / 1000}초 후 재시도...`,
          { icon: <RefreshCw className="w-4 h-4 text-amber-500" />, duration: delay }
        );
        retryTimerRef.current = setTimeout(() => {
          syncToServerWithRetry(nextAttempt);
        }, delay);
      } else {
        // All retries exhausted
        toast.error("서버 동기화에 3회 실패했습니다. 수동으로 동기화해주세요.", {
          icon: <WifiOff className="w-4 h-4 text-red-500" />,
          duration: 8000,
        });
        setIsSyncing(false);
        setSyncFailed(true);
        retryCountRef.current = 0;
      }
    }
  }, [attemptServerSync, logSyncAttempt]);

  // ── Manual sync handler ──
  const handleManualSync = useCallback(() => {
    pendingSyncRef.current = true;
    syncTypeRef.current = "manual";
    syncToServerWithRetry(0);
  }, [syncToServerWithRetry]);

  // ── Offline / Online detection ──
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      // Cancel any pending retry timers
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      toast.warning("현재 오프라인 상태입니다. 로컬에만 저장됩니다.", {
        icon: <WifiOff className="w-4 h-4 text-amber-500" />,
        duration: 5000,
      });
      pendingSyncRef.current = true;
    };

    const handleOnline = () => {
      setIsOffline(false);
      setSyncFailed(false);
      // Auto-sync to server with retry if there's pending data
      if (pendingSyncRef.current && isLoggedInRef.current) {
        syncTypeRef.current = "auto";
        syncToServerWithRetry(0);
      } else {
        toast.success("온라인 상태로 복귀했습니다.", {
          icon: <Wifi className="w-4 h-4 text-green-500" />,
          duration: 3000,
        });
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [syncToServerWithRetry]);

  // ── Load draft on mount: localStorage + server merge ──
  useEffect(() => {
    const loadDraft = async () => {
      // If fresh=true, clear all existing drafts and start clean
      if (isFreshStart) {
        clearLocalDraft();

        // Check login status
        try {
          const user = await client.auth.me();
          if (user?.data) {
            setIsLoggedIn(true);
            // Delete server draft too
            try {
              const response = await client.entities.diagnosis_drafts.query({
                query: {},
                sort: "-updated_at",
                limit: 1,
              });
              const drafts = response?.data?.items;
              if (drafts && drafts.length > 0) {
                await client.entities.diagnosis_drafts.delete({ id: String(drafts[0].id) });
              }
            } catch {
              // Ignore deletion errors
            }
          }
        } catch {
          // Not logged in
        }

        // Remove the fresh param from URL without triggering re-render loop
        setSearchParams({}, { replace: true });
        setIsLoadingDraft(false);
        return;
      }

      // 1. Always load localStorage first
      const local = loadLocalDraft();

      // 2. Try server draft
      let serverAnswers: Record<number, number> = {};
      let serverCurrentQ = 0;
      let serverDraftId: number | null = null;
      let loggedIn = false;

      try {
        const user = await client.auth.me();
        if (user?.data) {
          loggedIn = true;
          setIsLoggedIn(true);

          const response = await client.entities.diagnosis_drafts.query({
            query: {},
            sort: "-updated_at",
            limit: 1,
          });

          const drafts = response?.data?.items;
          if (drafts && drafts.length > 0) {
            const draft = drafts[0];
            serverAnswers = draft.answers ? parseAnswersObj(JSON.parse(draft.answers)) : {};
            serverCurrentQ = draft.current_question ?? 0;
            serverDraftId = draft.id;
          }
        }
      } catch {
        // Not logged in or server error
      }

      // 3. Merge
      if (loggedIn) {
        const { merged, source } = mergeAnswers(local.answers, serverAnswers);
        const mergedCount = Object.keys(merged).length;

        if (mergedCount > 0) {
          setAnswers(merged);
          // Use the higher currentQ position
          const bestQ = source === "local" ? local.currentQ :
                        source === "server" ? serverCurrentQ :
                        Math.max(local.currentQ, serverCurrentQ);
          setCurrentQ(Math.min(bestQ, allQuestions.length - 1));
          setDraftSource(source);
          setWasRestored(true);

          if (source === "merged") {
            toast.success(`로컬 + 서버 데이터가 병합되었습니다. (${mergedCount}/${allQuestions.length}문항)`);
          } else if (source === "local") {
            toast.success(`로컬 저장 데이터가 복원되었습니다. (${mergedCount}/${allQuestions.length}문항)`);
          } else {
            toast.success(`서버 저장 데이터가 복원되었습니다. (${mergedCount}/${allQuestions.length}문항)`);
          }

          // Sync merged data back to server if local had extra answers
          if (source === "merged" || (source === "local" && serverDraftId)) {
            const now = new Date().toISOString().replace("T", " ").slice(0, 19);
            try {
              if (serverDraftId) {
                await client.entities.diagnosis_drafts.update({
                  id: String(serverDraftId),
                  data: {
                    answers: JSON.stringify(merged),
                    current_question: Math.max(local.currentQ, serverCurrentQ),
                    updated_at: now,
                  },
                });
              } else {
                const resp = await client.entities.diagnosis_drafts.create({
                  data: {
                    answers: JSON.stringify(merged),
                    current_question: local.currentQ,
                    created_at: now,
                    updated_at: now,
                  },
                });
                serverDraftId = resp?.data?.id ?? null;
              }
            } catch {
              // Sync failed, not critical
            }
          }

          if (serverDraftId) {
            setDraftId(serverDraftId);
            setDraftStatus("saved");
          }

          // Also update localStorage with merged data
          saveLocalDraft(merged, Math.max(local.currentQ, serverCurrentQ));
        } else if (serverDraftId) {
          setDraftId(serverDraftId);
        }
      } else {
        // Not logged in — use localStorage only
        const localCount = Object.keys(local.answers).length;
        if (localCount > 0) {
          setAnswers(local.answers);
          setCurrentQ(Math.min(local.currentQ, allQuestions.length - 1));
          setDraftSource("local");
          setWasRestored(true);
          setDraftStatus("saved");
          toast.success(`로컬 저장 데이터가 복원되었습니다. (${localCount}/${allQuestions.length}문항)`);
        }
      }

      setIsLoadingDraft(false);
    };
    loadDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save draft (debounced): localStorage always + server if logged in & online ──
  const saveDraft = useCallback(async () => {
    const currentAnswers = answersRef.current;
    if (Object.keys(currentAnswers).length === 0) return;

    setDraftStatus("saving");

    // Always save to localStorage
    saveLocalDraft(currentAnswers, currentQRef.current);

    // Save to server if logged in AND online
    if (isLoggedIn && navigator.onLine) {
      try {
        const now = new Date().toISOString().replace("T", " ").slice(0, 19);
        const payload = {
          answers: JSON.stringify(currentAnswers),
          current_question: currentQRef.current,
          updated_at: now,
        };

        const currentDraftId = draftIdRef.current;
        if (currentDraftId) {
          await client.entities.diagnosis_drafts.update({
            id: String(currentDraftId),
            data: payload,
          });
        } else {
          const resp = await client.entities.diagnosis_drafts.create({
            data: { ...payload, created_at: now },
          });
          if (resp?.data?.id) {
            setDraftId(resp.data.id);
          }
        }
      } catch {
        // Server save failed — mark as pending sync
        pendingSyncRef.current = true;
      }
    } else if (isLoggedIn && !navigator.onLine) {
      // Offline but logged in — mark pending sync for when we reconnect
      pendingSyncRef.current = true;
    }

    setDraftStatus("saved");
  }, [isLoggedIn]);

  // Trigger debounced save
  useEffect(() => {
    if (isLoadingDraft) return;
    if (Object.keys(answers).length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveDraft(); }, DRAFT_SAVE_DELAY);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, currentQ, saveDraft, isLoadingDraft]);

  // ── Delete draft (both localStorage + server) ──
  const deleteDraft = async () => {
    clearLocalDraft();
    const currentDraftId = draftIdRef.current;
    if (currentDraftId && isLoggedIn) {
      await client.entities.diagnosis_drafts.delete({ id: String(currentDraftId) });
    }
  };

  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;
  const safeIndex = Math.min(currentQ, totalQuestions - 1);
  const question = allQuestions[safeIndex];
  const part = getPartForQuestion(question.id);
  const isLastQuestion = safeIndex === totalQuestions - 1;
  const allAnswered = answeredCount === totalQuestions;

  const partQuestionIndex = part ? part.questions.findIndex((q) => q.id === question.id) + 1 : 0;
  const partTotal = part ? part.questions.length : 0;

  // Detect if we're at the first question of a part and intro hasn't been dismissed
  const isFirstQuestionOfPart = part ? part.questions[0].id === question.id : false;
  const showPartIntro = isFirstQuestionOfPart && part && !dismissedIntros.has(part.key);
  const currentPartIntro = part ? partIntros[part.key] : null;

  const dismissIntro = () => {
    if (part) {
      setDismissedIntros((prev) => new Set(prev).add(part.key));
    }
  };

  const handleAnswer = (score: number) => {
    setAnswers((prev) => {
      const updated = { ...prev, [question.id]: score };
      // Auto-advance only after state is guaranteed to be set
      if (!isLastQuestion) {
        setTimeout(() => {
          // Double-check the answer was actually saved before advancing
          if (updated[question.id]) {
            setCurrentQ((prev) => Math.min(prev + 1, totalQuestions - 1));
          }
        }, 350);
      }
      return updated;
    });
  };

  const calculateScores = () => {
    const categoryScores: Record<string, number> = {};
    parts.forEach((p) => {
      let partScore = 0;
      p.questions.forEach((q) => {
        const raw = answers[q.id] || 3;
        partScore += q.reversed ? (6 - raw) : raw;
      });
      categoryScores[p.key] = partScore;
    });
    const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
    return { categoryScores, totalScore };
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error("모든 질문에 답변해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      let currentUser = null;
      try {
        const userRes = await client.auth.me();
        currentUser = userRes?.data;
      } catch {
        // Auth check failed / not logged in
      }

      if (!currentUser) {
        toast.info("진단 결과 저장을 위해 간편 로그인을 진행합니다.");
        saveLocalDraft(answers, currentQ);
        setIsSubmitting(false);
        setIsLoginModalOpen(true);
        return;
      }

      const { categoryScores, totalScore } = calculateScores();

      const response = await client.entities.diagnoses.create({
        data: {
          answers: JSON.stringify(answers),
          scores: JSON.stringify(categoryScores),
          total_score: totalScore,
          ai_report: "",
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      });

      const diagnosisId = response.data?.id;
      if (diagnosisId) {
        // Draft deletion is non-critical - don't block navigation if it fails
        try {
          await deleteDraft();
        } catch {
          // Draft deletion failed (e.g., 503) - not critical, continue
          clearLocalDraft();
        }
        setDraftId(null);
        setDraftStatus("idle");
        setWasRestored(false);
        // Show interstitial with confetti before navigating
        setPendingResultId(String(diagnosisId));
        setShowInterstitial(true);
      } else {
        toast.error("진단 저장에 실패했습니다.");
      }
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const msg = error?.data?.detail || error?.response?.data?.detail || error?.message || "오류가 발생했습니다.";
      const lowerMsg = String(msg).toLowerCase();

      if (
        status === 401 ||
        lowerMsg.includes("401") ||
        lowerMsg.includes("auth") ||
        lowerMsg.includes("login") ||
        lowerMsg.includes("credential")
      ) {
        toast.error("로그인이 필요합니다. 간편 로그인을 진행해주세요.");
        saveLocalDraft(answers, currentQ);
        setIsSubmitting(false);
        setIsLoginModalOpen(true);
      } else if (
        status === 504 ||
        status === 502 ||
        lowerMsg.includes("504") ||
        lowerMsg.includes("502") ||
        lowerMsg.includes("network") ||
        lowerMsg.includes("connect") ||
        lowerMsg.includes("refused")
      ) {
        toast.error("백엔드 서버(포트 8000)와 통신할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentQ(0);
    deleteDraft();
    setDraftId(null);
    setDraftStatus("idle");
    setDraftSource(null);
    setWasRestored(false);
    toast.info("처음부터 다시 시작합니다.");
  };

  // Storage type label
  const storageLabel = isOffline ? "오프라인 · 로컬" : isLoggedIn ? "클라우드" : "로컬";
  const StorageIcon = isOffline ? WifiOff : isLoggedIn ? Cloud : HardDrive;

  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-8 h-8 text-pink-500 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-gray-500">이전 진행 상태를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ── Confetti interstitial screen ──
  if (showInterstitial) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 animate-pulse opacity-30 scale-125" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-xl">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            🎉 분석이 완료되었습니다!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            50문항 모두 답변해주셔서 감사합니다
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-xs text-gray-400 mt-4">결과 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100" role="banner">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate("/")}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-pink-50 active:bg-pink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
            aria-label="홈으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" aria-hidden="true" />
          </button>
          <h1 className="text-base font-bold text-gray-900">관계 정밀 진단</h1>
          <div className="flex items-center gap-2">
            {/* Draft save indicator */}
            {draftStatus !== "idle" && (
              <div className="flex items-center gap-1">
                {draftStatus === "saving" ? (
                  <Save className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
                ) : (
                  <StorageIcon className={`w-3.5 h-3.5 ${isOffline ? "text-amber-500" : "text-green-500"}`} />
                )}
                <span className={`text-[11px] font-medium ${
                  draftStatus === "saving" ? "text-gray-400" : isOffline ? "text-amber-500" : "text-green-500"
                }`}>
                  {draftStatus === "saving" ? "저장 중..." : `${storageLabel} 저장됨`}
                </span>
              </div>
            )}
            {/* Offline banner in header */}
            {isOffline && draftStatus === "idle" && (
              <div className="flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-medium text-amber-500">오프라인</span>
              </div>
            )}
            <span className="text-sm text-gray-400 font-medium">{answeredCount}/{totalQuestions}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div
          className="h-2 bg-pink-100"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-label={`진행률: ${totalQuestions}문항 중 ${answeredCount}문항 완료 (${Math.round(progress)}%)`}
        >
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="pt-20 pb-40 px-4 sm:px-5 max-w-lg mx-auto" id="main-content" aria-label="관계 진단 설문">
        {/* ── Partner Invitation Reception Banner (Viral Loop) ── */}
        {inviteFrom && (
          <div className="mb-5 p-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 border-2 border-pink-200 rounded-2xl shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-pink-700">💌 커플 매칭 초대 진단</span>
                <span className="px-1.5 py-0.2 bg-pink-200/70 text-pink-800 text-[9px] font-bold rounded-full">
                  100% 무료
                </span>
              </div>
              <p className="text-[13px] font-bold text-gray-800 leading-snug">
                <span className="text-pink-600 font-black">{inviteFrom}</span>님이 {partnerName ? `${partnerName}님과의` : "당신과의"} 관계 진단에 초대했습니다!
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                답변을 완료하시면 두 사람의 솔직한 시선 차이와 듀얼 싱크로율 리포트가 즉시 매칭됩니다.
              </p>
            </div>
          </div>
        )}

        {/* ── Gift Ticket Banner ── */}
        {giftTicket && !inviteFrom && (
          <div className="mb-5 p-4 bg-gradient-to-r from-amber-50 via-pink-50 to-rose-50 border-2 border-pink-200 rounded-2xl shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-pink-700">🎁 연인 선물 티켓 적용됨</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full">
                  전액 결제 완료
                </span>
              </div>
              <p className="text-[13px] font-bold text-gray-800 leading-snug">
                선물받은 VIP 커플 패스로 전액 무료 진단이 진행됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Draft restored banner */}
        {wasRestored && answeredCount > 0 && answeredCount < totalQuestions && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            {draftSource === "merged" ? (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <span className="text-blue-400 text-[10px]">+</span>
                <Cloud className="w-4 h-4 text-blue-500" />
              </div>
            ) : draftSource === "server" ? (
              <Cloud className="w-5 h-5 text-blue-500 flex-shrink-0" />
            ) : (
              <HardDrive className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700">
                {draftSource === "merged"
                  ? "로컬 + 서버 데이터가 병합되었습니다"
                  : draftSource === "server"
                  ? "서버 저장 데이터가 복원되었습니다"
                  : "로컬 저장 데이터가 복원되었습니다"}
              </p>
              <p className="text-[10px] text-blue-500 mt-0.5">
                {answeredCount}문항 완료 · {isLoggedIn ? "클라우드 + 로컬" : "로컬"} 자동 저장 활성화
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-[10px] text-blue-600 font-bold px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
            >
              초기화
            </button>
          </div>
        )}

        {/* Login suggestion for non-logged-in users */}
        {!isLoggedIn && answeredCount > 0 && answeredCount < totalQuestions && !wasRestored && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-700">현재 로컬에만 저장됩니다</p>
              <p className="text-[10px] text-amber-500 mt-0.5">로그인하면 클라우드에도 자동 저장되어 다른 기기에서도 이어할 수 있어요</p>
            </div>
          </div>
        )}

        {/* Sync failed — manual sync banner */}
        {syncFailed && isLoggedIn && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700">서버 동기화 실패</p>
              <p className="text-[10px] text-red-500 mt-0.5">
                3회 자동 재시도에 실패했습니다. 데이터는 로컬에 안전하게 저장되어 있습니다.
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-[11px] text-white font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "동기화 중..." : "수동 동기화"}
            </button>
          </div>
        )}

        {/* Syncing in progress indicator */}
        {isSyncing && !syncFailed && isLoggedIn && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-500 flex-shrink-0 animate-spin" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700">서버 동기화 중...</p>
              <p className="text-[10px] text-blue-500 mt-0.5">
                재시도 {retryCountRef.current + 1}/{MAX_RETRY} · Exponential backoff 적용
              </p>
            </div>
          </div>
        )}

        {/* Part intro card — shown at the first question of each new section */}
        {showPartIntro && currentPartIntro && (
          <div className="mb-5 bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl p-5 shadow-md border border-indigo-100 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentPartIntro.icon}</span>
                <div>
                  <p className="text-sm font-bold text-indigo-800">{currentPartIntro.theory}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{currentPartIntro.theorist}</p>
                </div>
              </div>
              <button
                onClick={dismissIntro}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="이론 소개 닫기"
              >
                <X className="w-4 h-4 text-indigo-500" aria-hidden="true" />
              </button>
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
              {currentPartIntro.summary}
            </p>
            <div className="space-y-2">
              {currentPartIntro.keyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
            <button
              onClick={dismissIntro}
              className="mt-4 w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 active:from-indigo-700 active:to-purple-700 transition-all"
            >
              이해했어요, 진단 시작하기 →
            </button>
          </div>
        )}

        {/* Part indicator */}
        {part && (
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-secondary rounded-full mb-2">
              <span className="text-lg">{part.emoji}</span>
              <span className="text-sm font-bold text-primary">{part.title}</span>
            </div>
            <p className="text-xs text-muted-foreground tracking-wider uppercase">{part.subtitle}</p>
            <p className="text-muted-foreground text-sm mt-1">
              Part {parts.indexOf(part) + 1}/5 · 문항 {partQuestionIndex}/{partTotal}
            </p>
          </div>
        )}

        {/* Swipeable question area */}
        <div
          ref={swipeAreaRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="touch-pan-y"
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwipeTransitioning ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
            opacity: Math.max(0.4, 1 - Math.abs(swipeOffset) / 400),
            willChange: 'transform',
          }}
        >
        {/* Question */}
        <fieldset className="bg-card rounded-lg p-5 sm:p-6 shadow-sm border border-border mb-5 animate-slide-up" key={safeIndex}>
          <legend className="sr-only">
            질문 {question.id}: {question.text}
          </legend>
          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold"
              aria-hidden="true"
            >
              {question.id}
            </span>
            <h2 className="text-base font-semibold text-foreground leading-relaxed flex-1" id={`question-${question.id}`}>
              {question.text}
            </h2>
            {/* Tooltip trigger */}
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="flex-shrink-0 min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={showTooltip ? "심리학적 개념 설명 닫기" : "심리학적 개념 설명 보기"}
              aria-expanded={showTooltip}
              aria-controls={`tooltip-${question.id}`}
            >
              <HelpCircle className="w-5 h-5 text-accent" aria-hidden="true" />
            </button>
          </div>

          {/* Tooltip content */}
          {showTooltip && questionTooltips[question.id] && (
            <div
              id={`tooltip-${question.id}`}
              className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 relative animate-slide-up"
              role="region"
              aria-label="심리학적 개념 설명"
            >
              <button
                onClick={() => setShowTooltip(false)}
                className="absolute top-1.5 right-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-white/80 hover:bg-white active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="설명 닫기"
              >
                <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                  {questionTooltips[question.id].theory}
                </span>
              </div>
              <p className="text-sm font-bold text-indigo-800 mb-1.5">
                📖 {questionTooltips[question.id].concept}
              </p>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                {questionTooltips[question.id].description}
              </p>
            </div>
          )}
        </fieldset>

        {/* Score buttons — min 48px height for comfortable mobile touch */}
        <div className="space-y-3" role="radiogroup" aria-labelledby={`question-${question.id}`}>
          {scoreLabels.map((label, idx) => {
            const score = idx + 1;
            const isSelected = answers[question.id] === score;
            return (
              <button
                key={score}
                onClick={() => handleAnswer(score)}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${label} (${score}점)`}
                className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-primary bg-secondary shadow-sm"
                    : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50 active:bg-secondary"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden="true"
                >
                  {isSelected ? <CheckCircle className="w-5 h-5" /> : score}
                </div>
                <span className={`text-[15px] font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        </div>{/* End swipeable area */}

        {/* Swipe hint — shown briefly for first-time users */}
        {currentQ === 0 && answeredCount === 0 && (
          <div className="text-center mb-2 animate-pulse">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              좌우로 스와이프하여 문항을 이동할 수 있어요
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>
        )}

        {/* Navigation — large touch targets for mobile */}
        <nav className="flex items-center justify-between mt-8" aria-label="문항 이동">
          <button
            onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-1.5 text-[15px] font-medium text-muted-foreground hover:text-primary active:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[48px] px-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="이전 문항으로 이동"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            이전
          </button>

          {isLastQuestion ? (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !allAnswered}
                className="flex items-center gap-2 font-bold text-[15px] px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 bg-primary text-primary-foreground min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={isSubmitting ? "AI 분석 진행 중" : "AI 분석 받기"}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Heart className="w-5 h-5 animate-pulse" aria-hidden="true" />
                    분석 중...
                  </>
                ) : (
                  <>
                    AI 분석 받기
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!answers[question.id]) {
                  toast.warning("답변을 선택해주세요.");
                  return;
                }
                setCurrentQ((prev) => Math.min(totalQuestions - 1, prev + 1));
              }}
              disabled={!answers[question.id]}
              className="flex items-center gap-1.5 text-[15px] text-primary font-semibold hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[48px] px-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="다음 문항으로 이동"
            >
              다음
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </nav>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsLoggedIn(true);
          // Resume diagnosis submission after login
          setTimeout(() => {
            handleSubmitDiagnosis();
          }, 300);
        }}
      />
    </div>
  );
}