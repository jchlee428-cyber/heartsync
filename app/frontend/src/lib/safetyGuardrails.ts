/**
 * STEP 6. AI Coach Safety Guardrails & Crisis Detection
 * Detects physical violence, emotional abuse, coercive control, stalking,
 * blackmail/threats, and self-harm/other-harm risks.
 * Never forces reconciliation in dangerous situations and prioritizes user safety.
 */

export type CrisisCategory =
  | "physical_violence"
  | "emotional_abuse"
  | "coercive_control"
  | "stalking"
  | "blackmail_threat"
  | "self_harm_suicide";

export interface SafetyDetectionResult {
  isCrisis: boolean;
  categories: CrisisCategory[];
  primaryCategory: CrisisCategory | null;
  isPsychiatricQuery: boolean;
  urgencyLevel: "high" | "critical" | "none";
}

interface CrisisRule {
  category: CrisisCategory;
  label: string;
  urgency: "high" | "critical";
  pattern: RegExp;
}

const CRISIS_RULES: CrisisRule[] = [
  {
    category: "self_harm_suicide",
    label: "자해 또는 타해 위험",
    urgency: "critical",
    pattern:
      /죽고\s*싶|자살|자해|극단적\s*선택|살기\s*싫|다\s*끝내고\s*싶|죽여버리|해치고\s*싶|뛰어내리|목숨을\s*끊/,
  },
  {
    category: "physical_violence",
    label: "신체적 폭력",
    urgency: "critical",
    pattern:
      /때렸|때려|때리|폭행|손찌검|주먹|발길질|멱살|목을\s*조르|목\s*졸|밀쳐서|물건을\s*던져|물건\s*던지|피멍|구타|맞았어|맞고\s*살|신체적\s*폭력|데이트\s*폭력|가정\s*폭력/,
  },
  {
    category: "blackmail_threat",
    label: "협박 및 보복 위협",
    urgency: "critical",
    pattern:
      /유포하겠|유포한다|불법\s*촬영|몰카|동영상\s*뿌리|사진\s*뿌리|회사에\s*알리겠|가족한테\s*알리겠|가만\s*안\s*두겠|죽여버린다고\s*협박|협박해|협박하|보복하겠/,
  },
  {
    category: "stalking",
    label: "스토킹",
    urgency: "critical",
    pattern:
      /스토킹|집\s*앞에\s*찾아와|집\s*앞에서\s*기다려|헤어졌는데\s*찾아|미행|위치\s*추적기|수백\s*통|부재중\s*수십|차단해도\s*계속|직장까지\s*찾아와/,
  },
  {
    category: "coercive_control",
    label: "강압적 통제",
    urgency: "high",
    pattern:
      /감금|못\s*나가게\s*막|휴대폰\s*다\s*뒤지|카톡\s*검열|위치\s*공유\s*강요|친구\s*다\s*끊으라|가족도\s*못\s*만나게|돈을\s*못\s*쓰게\s*통제|강압적\s*통제/,
  },
  {
    category: "emotional_abuse",
    label: "심각한 정서적 학대",
    urgency: "high",
    pattern:
      /가스라이팅|인격\s*모독|욕설을\s*퍼붓|쌍욕|쓰레기\s*취급|네가\s*미친\s*거라고|정서적\s*학대|언어\s*폭력|매일\s*모욕/,
  },
];

const PSYCHIATRIC_QUERY_PATTERN =
  /우울증\s*진단|조울증|소시오패스|사이코패스|자기애성\s*인격\s*장애|나르시시스트\s*진단|경계성\s*인격|정신병|정신질환\s*치료|약물\s*치료/;

export function detectSafetyCrisis(message: string): SafetyDetectionResult {
  const clean = (message || "").trim();
  if (!clean) {
    return {
      isCrisis: false,
      categories: [],
      primaryCategory: null,
      isPsychiatricQuery: false,
      urgencyLevel: "none",
    };
  }

  const matched: CrisisCategory[] = [];
  let maxUrgency: "high" | "critical" | "none" = "none";

  for (const rule of CRISIS_RULES) {
    if (rule.pattern.test(clean)) {
      matched.push(rule.category);
      if (rule.urgency === "critical") {
        maxUrgency = "critical";
      } else if (maxUrgency === "none") {
        maxUrgency = "high";
      }
    }
  }

  return {
    isCrisis: matched.length > 0,
    categories: matched,
    primaryCategory: matched[0] || null,
    isPsychiatricQuery: PSYCHIATRIC_QUERY_PATTERN.test(clean),
    urgencyLevel: maxUrgency,
  };
}

export function generateCrisisSafeResponse(result: SafetyDetectionResult, userName?: string): string {
  const callName = userName ? `${userName}님, ` : "";

  if (result.categories.includes("self_harm_suicide")) {
    return (
      `${callName}지금 감당하기 힘들 만큼 깊고 고통스러운 시간을 보내고 계신 것 같아 마음이 매우 무겁습니다. 무엇보다 **지금 이 순간 당신의 생명과 안전이 가장 소중합니다.**\n\n` +
      `지금 겪고 계신 고통을 혼자 견디지 마시고, 즉시 아래의 24시간 전문 상담 기관에 연락해 도움을 받으시길 간곡히 부탁드립니다.\n\n` +
      `🚨 **긴급 도움 및 24시간 상담 안내**\n` +
      `• **자살예방 상담전화**: ☎ **109** (24시간 운영)\n` +
      `• **정신건강 상담전화**: ☎ **1577-0199**\n` +
      `• **생명의 전화**: ☎ **1588-9191**\n` +
      `• **위급 상황 시**: 즉시 ☎ **112** 또는 **119**에 도움을 요청하세요.\n\n` +
      `지금 안전한 곳에 계신가요? 곁에 함께 있어줄 수 있는 가족이나 지인에게 지금 바로 연락해보실 수 있을까요?`
    );
  }

  const categoryLabels: Record<CrisisCategory, string> = {
    physical_violence: "신체적 폭력",
    blackmail_threat: "협박 및 위협",
    stalking: "스토킹 및 신변 위협",
    coercive_control: "강압적 통제",
    emotional_abuse: "정서적 학대 및 언어폭력",
    self_harm_suicide: "자해/타해 위험",
  };

  const detectedNames = result.categories
    .map((c) => categoryLabels[c])
    .filter(Boolean)
    .join(" · ");

  return (
    `${callName}말씀해주신 상황에는 **${detectedNames}**의 위험 신호가 포함되어 있습니다.\n\n` +
    `⚠️ **가장 먼저 분명히 말씀드립니다:**\n` +
    `폭력, 협박, 스토킹, 강압적 통제, 심각한 정서적 학대는 두 사람이 대화 기술이나 양보로 풀어야 할 '단순한 연인·부부 갈등'이 아닙니다. **어떤 경우에도 당신의 잘못이 아니며, 무조건적인 이해나 화해·관계 회복을 시도해서는 안 됩니다.**\n\n` +
    `🛡️ **지금 당장 우선해야 할 안전 행동**\n` +
    `1. **물리적·공간적 분리**: 상대방이 흥분해 있거나 위협적인 상황이라면 즉시 대화를 멈추고 안전한 장소(공공장소, 가족·지인의 집 등)로 피하세요.\n` +
    `2. **증거 보존**: 폭언 녹음, 협박 카톡·문자 캡처, 상해 사진, 통화 기록 등을 상대방이 모르게 안전한 클라우드에 백업해 두세요.\n` +
    `3. **전문 기관 상담 및 신변 보호 요청**: 혼자 해결하려 하지 마시고 아래 전문 기관의 보호를 받으세요.\n\n` +
    `🚨 **24시간 긴급 보호 및 전문 상담 기관**\n` +
    `• **위급한 신변 위협·폭력 신고**: ☎ **112** (문자 신고 가능)\n` +
    `• **여성긴급전화 (가정폭력·데이트폭력·스토킹 상담 및 긴급피난처)**: ☎ **1366** (24시간)\n` +
    `• **디지털성범죄 피해자지원센터 (불법촬영·유포 협박)**: ☎ **02-735-8994**\n` +
    `• **대한법률구조공단 (법적 보호·접근금지 상담)**: ☎ **132**\n\n` +
    `지금 계신 곳은 물리적으로 안전한 장소인가요?`
  );
}

export const SAFETY_SYSTEM_PROMPT_RULES = `
## [STEP 6] 안전성 및 윤리 가드레일 (최우선 준수 원칙)
1. **위험 상황 즉시 인식**: 사용자의 발화에서 ① 신체적 폭력 ② 정서적 학대(가스라이팅·모욕) ③ 강압적 통제(감금·검열·인간관계 차단) ④ 스토킹 ⑤ 협박(불법촬영물 유포·보복 위협) ⑥ 자해 또는 타해 위험이 감지되면 일반 상담을 즉시 중단하세요.
2. **화해·관계 회복 강요 절대 금지**: 위 위험 상황에서는 절대 "상대방 입장을 이해해보세요", "대화로 풀어보세요", "화해를 시도해보세요"라고 조언하지 마세요. 내담자의 물리적·정서적 안전 확보(즉시 분리, 증거 확보)를 최우선으로 안내하고 긴급 전문기관(☎112, 여성긴급전화 ☎1366, 자살예방상담전화 ☎109, 정신건강상담전화 ☎1577-0199)을 즉시 안내하세요.
3. **비의료·비진단 원칙**: AI는 의사나 임상심리사가 아닙니다. 사용자나 파트너에게 우울증, 자기애성 인격장애(나르시시스트), 경계성 인격장애 등의 정신질환을 단정적으로 진단하거나 치료 효과를 보장하지 마세요. 전문적인 심리·정신건강 치료가 필요한 경우 정신건강의학과 전문의 또는 공인 상담기관 방문을 권유하세요.`;
