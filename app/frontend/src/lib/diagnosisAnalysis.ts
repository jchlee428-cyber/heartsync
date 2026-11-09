/**
 * 50-Question Relationship Diagnosis Item-Level Analysis Utility
 * Extracts critical vulnerable items, strength items, Gottman Four Horsemen indicators,
 * and Anxious vs. Avoidant Attachment subscales from `diagnosis.answers` for AI prompts.
 */

export interface DiagnosisQuestionMeta {
  id: number;
  partKey: "conflict" | "intimacy" | "trust" | "values" | "physical";
  partLabel: string;
  text: string;
  reversed?: boolean;
  concept: string;
  subscale?:
    | "criticism"
    | "contempt"
    | "defensiveness"
    | "stonewalling"
    | "repair_failure"
    | "anxious_attachment"
    | "avoidant_attachment"
    | "secure_attachment"
    | "trust_erosion";
}

export const SCORE_LABELS = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestionMeta[] = [
  // Part 1: 갈등 관리 및 소통 패턴 (conflict, Q1~Q10, 모두 역채점)
  { id: 1, partKey: "conflict", partLabel: "갈등 관리", text: "우리는 사소한 문제로 시작해 서로의 인격을 비난하는 싸움으로 번질 때가 많다.", reversed: true, concept: "비난 (Criticism)", subscale: "criticism" },
  { id: 2, partKey: "conflict", partLabel: "갈등 관리", text: "싸우는 도중 상대방이나 나, 둘 중 한 명은 입을 다물거나 자리를 피해버린다.", reversed: true, concept: "담쌓기 (Stonewalling)", subscale: "stonewalling" },
  { id: 3, partKey: "conflict", partLabel: "갈등 관리", text: "갈등이 생겼을 때, 나는 상대방의 말에 공감하기보다 내 입장을 방어하기에 급급하다.", reversed: true, concept: "방어 (Defensiveness)", subscale: "defensiveness" },
  { id: 4, partKey: "conflict", partLabel: "갈등 관리", text: "화해를 시도했을 때, 상대방이 이를 받아주지 않아 상황이 더 악화된 적이 많다.", reversed: true, concept: "화해 시도 실패 (Repair Failure)", subscale: "repair_failure" },
  { id: 5, partKey: "conflict", partLabel: "갈등 관리", text: "우리는 싸움이 끝난 후, 무엇이 문제였는지 차분하게 복기하는 대화를 거의 하지 않는다.", reversed: true, concept: "갈등 후 복기 부재 (Aftermath Processing)", subscale: "repair_failure" },
  { id: 6, partKey: "conflict", partLabel: "갈등 관리", text: "상대방의 말투나 표정에서 나를 무시하거나 조롱한다는 느낌(경멸)을 받을 때가 있다.", reversed: true, concept: "경멸 (Contempt)", subscale: "contempt" },
  { id: 7, partKey: "conflict", partLabel: "갈등 관리", text: "우리는 한 가지 주제(예: 돈, 시댁/처가, 집안일)로 반복해서 똑같이 싸운다.", reversed: true, concept: "영원한 문제 교착 (Perpetual Problems)", subscale: "repair_failure" },
  { id: 8, partKey: "conflict", partLabel: "갈등 관리", text: "싸울 때 \"너는 항상 그래\", \"너는 한 번도 안 그래\"와 같은 극단적인 표현을 쓴다.", reversed: true, concept: "과잉 일반화·비난 (Overgeneralization)", subscale: "criticism" },
  { id: 9, partKey: "conflict", partLabel: "갈등 관리", text: "나는 상대방에게 불만이 있어도 갈등이 될까 봐 속으로만 참고 표현하지 않는다.", reversed: true, concept: "감정 억압·회피 (Emotional Suppression)", subscale: "stonewalling" },
  { id: 10, partKey: "conflict", partLabel: "갈등 관리", text: "우리 커플은 갈등을 해결하는 명확한 규칙이나 노하우가 없다.", reversed: true, concept: "갈등 해결 시스템 부재", subscale: "repair_failure" },

  // Part 2: 정서적 친밀감 및 우정 (intimacy, Q11~Q20, 모두 정채점)
  { id: 11, partKey: "intimacy", partLabel: "정서적 친밀감", text: "나는 오늘 상대방이 겪은 구체적인 스트레스 요인이 무엇인지 알고 있다.", concept: "사랑의 지도 (Love Map)" },
  { id: 12, partKey: "intimacy", partLabel: "정서적 친밀감", text: "우리는 하루 일과를 마치고 서로 대화하는 시간이 즐겁고 기다려진다.", concept: "상호 전환 (Turning Toward)" },
  { id: 13, partKey: "intimacy", partLabel: "정서적 친밀감", text: "상대방은 내 인생의 꿈과 목표가 무엇인지 정확히 알고 지지해준다.", concept: "꿈과 목표 지지 (Dreams Within Conflict)" },
  { id: 14, partKey: "intimacy", partLabel: "정서적 친밀감", text: "우리는 최근 1개월 이내에 둘만이 즐길 수 있는 데이트나 취미 활동을 했다.", concept: "의도적 친밀감 (Intentional Intimacy)" },
  { id: 15, partKey: "intimacy", partLabel: "정서적 친밀감", text: "나는 상대방에게 나의 부끄러운 점이나 약점을 솔직하게 털어놓을 수 있다.", concept: "취약성 공유 (Vulnerability Sharing)" },
  { id: 16, partKey: "intimacy", partLabel: "정서적 친밀감", text: "상대방은 내가 우울하거나 힘들 때, 나를 위로하는 방법을 잘 알고 있다.", concept: "정서적 조율 (Emotional Attunement)" },
  { id: 17, partKey: "intimacy", partLabel: "정서적 친밀감", text: "우리는 서로의 어린 시절 상처나 트라우마에 대해 깊이 대화해 본 적이 있다.", concept: "깊은 자기 개방 (Deep Self-Disclosure)" },
  { id: 18, partKey: "intimacy", partLabel: "정서적 친밀감", text: "나는 상대방이 나를 진심으로 존중하고 있다고 느낀다.", concept: "존중과 애정 (Fondness & Admiration)" },
  { id: 19, partKey: "intimacy", partLabel: "정서적 친밀감", text: "우리는 유머 코드가 잘 맞아 함께 웃는 일이 많다.", concept: "공유된 유머 (Shared Humor)" },
  { id: 20, partKey: "intimacy", partLabel: "정서적 친밀감", text: "상대방은 나의 가장 친한 친구(Best Friend)라고 말할 수 있다.", concept: "우정 기반 사랑 (Friendship-Based Love)" },

  // Part 3: 신뢰 및 애착 유형 (trust, Q21~Q30)
  { id: 21, partKey: "trust", partLabel: "신뢰/애착", text: "연락이 되지 않으면 상대방이 무엇을 하고 있는지 불안해서 견디기 힘들다.", reversed: true, concept: "불안형 애착 - 연락 불안", subscale: "anxious_attachment" },
  { id: 22, partKey: "trust", partLabel: "신뢰/애착", text: "나는 상대방이 언제든 나를 떠날 수도 있다는 막연한 불안감을 느낀다.", reversed: true, concept: "유기 불안 (Abandonment Anxiety)", subscale: "anxious_attachment" },
  { id: 23, partKey: "trust", partLabel: "신뢰/애착", text: "상대방은 내가 필요로 할 때 항상 그 자리에 있을 것이라는 확신이 있다.", concept: "안전 기지 (Secure Base)", subscale: "secure_attachment" },
  { id: 24, partKey: "trust", partLabel: "신뢰/애착", text: "우리는 서로에게 숨기는 것이 없다고 느끼며, 투명하게 소통하고 있다.", concept: "관계 투명성 (Relational Transparency)", subscale: "secure_attachment" },
  { id: 25, partKey: "trust", partLabel: "신뢰/애착", text: "상대방이 이성 동료나 친구를 만나는 것에 대해 예민하게 반응하는 편이다.", reversed: true, concept: "질투와 불안정 애착", subscale: "anxious_attachment" },
  { id: 26, partKey: "trust", partLabel: "신뢰/애착", text: "나는 상대방에게 의존하는 것이 불편하고, 혼자 해결하는 것이 편하다.", reversed: true, concept: "회피형 애착 (Avoidant Attachment)", subscale: "avoidant_attachment" },
  { id: 27, partKey: "trust", partLabel: "신뢰/애착", text: "상대방은 약속을 잘 지키며, 말과 행동이 일치하는 사람이다.", concept: "신뢰의 일관성 (Trust Consistency)", subscale: "secure_attachment" },
  { id: 28, partKey: "trust", partLabel: "신뢰/애착", text: "우리는 과거의 연애사나 이성 문제로 인해 현재도 갈등을 빚곤 한다.", reversed: true, concept: "과거 관계 트라우마", subscale: "trust_erosion" },
  { id: 29, partKey: "trust", partLabel: "신뢰/애착", text: "나는 상대방이 나에게 솔직하지 않다고 느낄 때가 종종 있다.", reversed: true, concept: "신뢰 침식 (Trust Erosion)", subscale: "trust_erosion" },
  { id: 30, partKey: "trust", partLabel: "신뢰/애착", text: "우리 관계는 한 쪽이 더 많이 사랑하고 매달리는 '기울어진 관계' 같다.", reversed: true, concept: "관계 불균형 (Relationship Equity)", subscale: "anxious_attachment" },

  // Part 4: 가치관 및 공유 의미 (values, Q31~Q40)
  { id: 31, partKey: "values", partLabel: "가치관", text: "우리는 경제권 관리와 소비 습관에 대해 합의가 잘 되어 있다.", concept: "재정적 호환성" },
  { id: 32, partKey: "values", partLabel: "가치관", text: "자녀 계획이나 양육 방식에 대해 우리 둘의 생각은 비슷하다.", concept: "양육 가치관 일치" },
  { id: 33, partKey: "values", partLabel: "가치관", text: "양가 부모님이나 가족을 대하는 태도에 대해 큰 갈등은 없다.", concept: "확대가족 경계 설정" },
  { id: 34, partKey: "values", partLabel: "가치관", text: "우리는 주말이나 휴가를 보내는 방식(휴식 vs 활동)이 잘 맞는다.", concept: "여가 호환성" },
  { id: 35, partKey: "values", partLabel: "가치관", text: "종교나 정치적 견해 차이로 인해 심각하게 다툰 적이 있다.", reversed: true, concept: "핵심 가치관 갈등" },
  { id: 36, partKey: "values", partLabel: "가치관", text: "집안일 분담이 공정하게 이루어지고 있다고 생각한다.", concept: "가사 분담 공정성" },
  { id: 37, partKey: "values", partLabel: "가치관", text: "우리는 5년, 10년 뒤의 미래를 함께 구체적으로 그려본 적이 있다.", concept: "공유된 미래 비전" },
  { id: 38, partKey: "values", partLabel: "가치관", text: "상대방의 직업이나 커리어에 대해 나는 불만이 있다.", reversed: true, concept: "커리어 지지 부족" },
  { id: 39, partKey: "values", partLabel: "가치관", text: "우리는 삶에서 무엇이 가장 중요한지(예: 성공, 가족, 행복)에 대한 가치관이 일치한다.", concept: "삶의 우선순위 일치" },
  { id: 40, partKey: "values", partLabel: "가치관", text: "상대방과 함께 늙어가는 모습이 긍정적으로 그려진다.", concept: "장기적 헌신 (Long-term Commitment)" },

  // Part 5: 신체적/성적 만족도 (physical, Q41~Q50)
  { id: 41, partKey: "physical", partLabel: "신체적 만족", text: "나는 현재 우리의 성관계 횟수와 퀄리티에 만족한다.", concept: "성적 만족도" },
  { id: 42, partKey: "physical", partLabel: "신체적 만족", text: "우리는 성적인 불만이나 취향에 대해 솔직하게 대화할 수 있다.", concept: "성적 소통 (Sexual Communication)" },
  { id: 43, partKey: "physical", partLabel: "신체적 만족", text: "성관계 외에도 손잡기, 포옹 등 일상적인 스킨십이 자연스럽고 많다.", concept: "비성적 스킨십 (Non-Sexual Touch)" },
  { id: 44, partKey: "physical", partLabel: "신체적 만족", text: "상대방은 나를 여전히 매력적인 이성으로 바라보고 있다고 느낀다.", concept: "성적 매력 인식" },
  { id: 45, partKey: "physical", partLabel: "신체적 만족", text: "피곤하거나 바쁘다는 이유로 성관계를 거부하는 일이 잦아졌다.", reversed: true, concept: "성적 거부 패턴" },
  { id: 46, partKey: "physical", partLabel: "신체적 만족", text: "나는 스킨십을 원하지만 상대방이 피하는 느낌을 받는다.", reversed: true, concept: "스킨십 회피 (Touch Avoidance)", subscale: "avoidant_attachment" },
  { id: 47, partKey: "physical", partLabel: "신체적 만족", text: "우리의 잠자리 문제는 관계의 다른 부분(대화, 기분 등)에 영향을 미친다.", reversed: true, concept: "성적 문제의 파급 효과 (Spillover Effect)" },
  { id: 48, partKey: "physical", partLabel: "신체적 만족", text: "나는 상대방과의 스킨십이 정서적으로 연결되어 있다는 느낌을 준다.", concept: "정서-신체 연결 (Emotional-Physical Connection)" },
  { id: 49, partKey: "physical", partLabel: "신체적 만족", text: "성적인 문제로 인해 전문가의 도움을 받고 싶다는 생각을 한 적이 있다.", reversed: true, concept: "성적 갈등 심화" },
  { id: 50, partKey: "physical", partLabel: "신체적 만족", text: "전반적으로 우리 커플의 로맨틱한 분위기는 연애 초기에 비해 너무 많이 식었다.", reversed: true, concept: "로맨틱 열정 감소 (Romantic Decline)" },
];

export interface EvaluatedQuestionItem {
  question: DiagnosisQuestionMeta;
  rawAnswer: number;      // 사용자가 선택한 원점수 (1~5)
  convertedScore: number; // 관계 건강도 환산 점수 (1~5, 높을수록 건강)
  answerLabel: string;    // "전혀 아니다" ~ "매우 그렇다"
}

export interface AttachmentProfile {
  anxiousAvg: number;       // 1.0 ~ 5.0 (높을수록 불안형 애착 성향 강함)
  avoidantAvg: number;      // 1.0 ~ 5.0 (높을수록 회피형 애착 성향 강함)
  secureAvg: number;        // 1.0 ~ 5.0 (높을수록 안전 기지/신뢰 확신 높음)
  primaryType: string;      // "안정형 (Secure)", "불안형 (Anxious-Preoccupied)", "회피형 (Dismissive-Avoidant)", "혼란/불안-회피 복합형 (Fearful-Avoidant)"
  summaryText: string;
}

export interface GottmanHorsemenProfile {
  activeHorsemen: string[];
  summaryText: string;
}

export interface DetailedAnswersAnalysis {
  hasAnswers: boolean;
  answeredCount: number;
  criticalItems: EvaluatedQuestionItem[]; // 환산 점수 1~2점 (심각한 취약 문항)
  strengthItems: EvaluatedQuestionItem[]; // 환산 점수 4~5점 (핵심 강점 문항)
  attachment: AttachmentProfile;
  horsemen: GottmanHorsemenProfile;
  promptSection: string; // AI 프롬프트에 직접 삽입할 마크다운 블록
}

/**
 * Safely parse `answers` from DB (JSON string or Record)
 */
export function parseDiagnosisAnswers(rawAnswers: unknown): Record<number, number> {
  if (!rawAnswers) return {};
  try {
    const parsed = typeof rawAnswers === "string" ? JSON.parse(rawAnswers) : rawAnswers;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const qId = Number(k);
      const val = Number(v);
      if (!Number.isNaN(qId) && !Number.isNaN(val) && val >= 1 && val <= 5) {
        result[qId] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Analyze 50 individual question answers to extract item-level clinical insights
 */
export function analyzeDiagnosisAnswers(rawAnswers: unknown): DetailedAnswersAnalysis {
  const answersMap = parseDiagnosisAnswers(rawAnswers);
  const answeredKeys = Object.keys(answersMap);

  if (answeredKeys.length === 0) {
    return {
      hasAnswers: false,
      answeredCount: 0,
      criticalItems: [],
      strengthItems: [],
      attachment: {
        anxiousAvg: 2.5,
        avoidantAvg: 2.5,
        secureAvg: 3.0,
        primaryType: "세부 응답 데이터 미포함",
        summaryText: "개별 문항 응답 데이터가 없어 영역별 합산 점수를 기준으로 분석합니다.",
      },
      horsemen: {
        activeHorsemen: [],
        summaryText: "갈등 관리 영역 합산 점수를 기준으로 소통 패턴을 평가합니다.",
      },
      promptSection: "",
    };
  }

  const evaluated: EvaluatedQuestionItem[] = [];

  for (const q of DIAGNOSIS_QUESTIONS) {
    const raw = answersMap[q.id];
    if (raw === undefined) continue;
    const converted = q.reversed ? 6 - raw : raw;
    evaluated.push({
      question: q,
      rawAnswer: raw,
      convertedScore: converted,
      answerLabel: SCORE_LABELS[raw - 1] || "보통이다",
    });
  }

  // 취약 문항 (환산 점수 1~2점, 가장 낮은 순 정렬)
  const criticalItems = evaluated
    .filter((item) => item.convertedScore <= 2)
    .sort((a, b) => a.convertedScore - b.convertedScore || a.question.id - b.question.id);

  // 강점 문항 (환산 점수 4~5점, 가장 높은 순 정렬)
  const strengthItems = evaluated
    .filter((item) => item.convertedScore >= 4)
    .sort((a, b) => b.convertedScore - a.convertedScore || a.question.id - b.question.id);

  // 1. 애착 세부 지수 산출 (원점수 기준 위험도: 역채점 문항은 원점수가 높을수록 해당 불안/회피 특성이 강함)
  const getRawOrDefault = (id: number, def = 3) => answersMap[id] ?? def;

  // 불안형 애착 지표: Q21(연락두절 불안), Q22(유기 불안), Q25(이성 예민/질투), Q30(기울어진 관계/매달림)
  const anxiousIds = [21, 22, 25, 30];
  const anxiousAvg = Number(
    (anxiousIds.reduce((sum, id) => sum + getRawOrDefault(id), 0) / anxiousIds.length).toFixed(2)
  );

  // 회피형 애착 지표: Q26(의존 불편/혼자 해결), Q2(갈등 시 입 다물거나 자리 회피), Q9(불만 속으로 참음), Q46(스킨십 회피)
  const avoidantIds = [26, 2, 9, 46];
  const avoidantAvg = Number(
    (avoidantIds.reduce((sum, id) => sum + getRawOrDefault(id), 0) / avoidantIds.length).toFixed(2)
  );

  // 안정 기지/신뢰 확신 지표: Q23(안전 기지), Q24(관계 투명성), Q27(말과 행동 일치)
  const secureIds = [23, 24, 27];
  const secureAvg = Number(
    (secureIds.reduce((sum, id) => sum + getRawOrDefault(id), 0) / secureIds.length).toFixed(2)
  );

  let primaryType = "안정형 (Secure Attachment)";
  if (anxiousAvg >= 3.5 && avoidantAvg >= 3.5) {
    primaryType = "혼란형 / 불안-회피 복합형 (Fearful-Avoidant)";
  } else if (anxiousAvg >= 3.5 && anxiousAvg >= avoidantAvg) {
    primaryType = "불안형 애착 (Anxious-Preoccupied)";
  } else if (avoidantAvg >= 3.5 && avoidantAvg > anxiousAvg) {
    primaryType = "회피형 애착 (Dismissive-Avoidant)";
  } else if (anxiousAvg >= 3.0 || avoidantAvg >= 3.0 || secureAvg < 3.2) {
    primaryType = anxiousAvg >= avoidantAvg
      ? "경미한 불안형 경향 (Mild Anxious Tendency)"
      : "경미한 회피형 경향 (Mild Avoidant Tendency)";
  }

  const attachmentSummary = `주된 애착 역동: ${primaryType} (불안애착 지수 ${anxiousAvg}/5.0, 회피애착 지수 ${avoidantAvg}/5.0, 안전기지 확신도 ${secureAvg}/5.0)`;

  // 2. 가트맨의 4가지 독소(Four Horsemen) 및 회복 실패 감지
  const activeHorsemen: string[] = [];
  if (getRawOrDefault(1) >= 4 || getRawOrDefault(8) >= 4) {
    activeHorsemen.push(`비난(Criticism: Q1=${getRawOrDefault(1)}점, Q8=${getRawOrDefault(8)}점)`);
  }
  if (getRawOrDefault(6) >= 4) {
    activeHorsemen.push(`경멸(Contempt: Q6=${getRawOrDefault(6)}점 — 가장 위험한 관계 독소)`);
  }
  if (getRawOrDefault(3) >= 4) {
    activeHorsemen.push(`방어(Defensiveness: Q3=${getRawOrDefault(3)}점)`);
  }
  if (getRawOrDefault(2) >= 4 || getRawOrDefault(9) >= 4) {
    activeHorsemen.push(`담쌓기·감정억압(Stonewalling: Q2=${getRawOrDefault(2)}점, Q9=${getRawOrDefault(9)}점)`);
  }
  if (getRawOrDefault(4) >= 4 || getRawOrDefault(5) >= 4) {
    activeHorsemen.push(`회복 시도 및 갈등 복기 실패(Repair Failure: Q4=${getRawOrDefault(4)}점, Q5=${getRawOrDefault(5)}점)`);
  }

  const horsemenSummary =
    activeHorsemen.length > 0
      ? `활성화된 갈등 독소: ${activeHorsemen.join(", ")}`
      : "가트맨 4대 독소(비난·경멸·방어·담쌓기) 중 심각 수준(4~5점)으로 활성화된 항목 없음";

  // 3. 프롬프트용 마크다운 섹션 조립
  const topCriticalLines = criticalItems.slice(0, 12).map(
    (item) =>
      `- [Q${item.question.id} / ${item.question.partLabel} - ${item.question.concept}] "${item.question.text}" → 사용자 응답: **${item.answerLabel}** (건강도 ${item.convertedScore}/5점)`
  );

  const topStrengthLines = strengthItems.slice(0, 6).map(
    (item) =>
      `- [Q${item.question.id} / ${item.question.partLabel} - ${item.question.concept}] "${item.question.text}" → 사용자 응답: **${item.answerLabel}** (건강도 ${item.convertedScore}/5점)`
  );

  const promptSection = `
## 🔍 50문항 개별 응답 기반 정밀 임상 데이터 (매우 중요 — 반드시 분석에 반영할 것)
- **애착 세부 프로파일**: ${attachmentSummary}
- **가트맨 갈등 독소(Four Horsemen) 프로파일**: ${horsemenSummary}

### ⚠️ 사용자가 직접 체크한 핵심 취약/갈등 문항 (건강도 1~2점 문항, 총 ${criticalItems.length}개 중 주요 항목)
${topCriticalLines.length > 0 ? topCriticalLines.join("\n") : "- 심각한 취약 문항(1~2점)이 발견되지 않았습니다 (전반적으로 안정적인 응답)."}

### ✨ 사용자가 직접 체크한 관계 강점/보호 요인 문항 (건강도 4~5점 주요 항목)
${topStrengthLines.length > 0 ? topStrengthLines.join("\n") : "- 뚜렷한 강점 문항(4~5점)이 적으며 전반적인 관계 에너지 회복이 필요합니다."}
`;

  return {
    hasAnswers: true,
    answeredCount: evaluated.length,
    criticalItems,
    strengthItems,
    attachment: {
      anxiousAvg,
      avoidantAvg,
      secureAvg,
      primaryType,
      summaryText: attachmentSummary,
    },
    horsemen: {
      activeHorsemen,
      summaryText: horsemenSummary,
    },
    promptSection,
  };
}

