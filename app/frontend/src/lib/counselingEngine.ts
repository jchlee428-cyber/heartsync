/**
 * STEP 4, 5, 6, 7 Integrated Conversational Relationship Coaching Engine
 *
 * Enforces the 9 Core Principles:
 * 1. 질문의 의도를 먼저 파악한다.
 * 2. 사용자의 감정을 존중한다.
 * 3. 사실(Fact)과 추측(Assumption)을 구분한다.
 * 4. 이전 진단 결과를 필요한 범위에서 참고한다.
 * 5. 질문 유형(9종)에 맞는 답변 전략을 제공한다.
 * 6. 구체적인 대화 예시('...')를 제시한다.
 * 7. 사용자가 당장 실행할 수 있는 행동을 제안한다.
 * 8. 상황이 불분명하면 추가 확인 질문을 한다.
 * 9. 전문적인 도움이 필요한 상황은 적절히 안내한다.
 */

import { analyzeDiagnosisAnswers } from "./diagnosisAnalysis";
import {
  detectSafetyCrisis,
  generateCrisisSafeResponse,
} from "./safetyGuardrails";

export type QuestionIntentType =
  | "emotional" // 감정적 고민
  | "conflict" // 갈등 해결
  | "communication" // 의사소통
  | "trust" // 신뢰 문제
  | "recovery" // 관계 회복
  | "breakup" // 이별 고민
  | "marriage" // 결혼 고민
  | "partner_understanding" // 상대방 이해
  | "script_writing"; // 대화문 작성

export interface QuestionIntentAnalysis {
  intent: QuestionIntentType;
  label: string;
  isAmbiguous: boolean;
  strategyDirective: string;
}

export interface CounselingDiagnosisContext {
  id: string;
  total_score: number;
  scores: Record<string, number>;
  answers?: Record<string, number> | string;
  ai_report?: string;
}

const INTENT_RULES: {
  intent: QuestionIntentType;
  label: string;
  pattern: RegExp;
  strategyDirective: string;
}[] = [
  {
    intent: "script_writing",
    label: "대화문 작성",
    pattern:
      /카톡\s*문구|문자\s*문구|뭐라고\s*보내|어떻게\s*말해|대화문|대사|멘트|말해볼까|편지|카톡\s*보낼|1번|①/,
    strategyDirective:
      "질문 유형 [대화문 작성]: 사용자가 파트너에게 바로 복사해 보내거나 말할 수 있는 구체적인 대화문을 상황/온도별(① 부드럽게 공감하며 운을 떼는 문장, ② 내 감정과 요청을 명확히 전하는 문장)로 작성해주고, 전송하기 좋은 타이밍(예: 퇴근 후 여유 있을 때)을 함께 제안하세요.",
  },
  {
    intent: "breakup",
    label: "이별 고민",
    pattern:
      /이별|헤어질|헤어지|갈라서|정리해야|그만\s*만나|끝내야|헤어지는\s*게\s*맞|미련|재회/,
    strategyDirective:
      "질문 유형 [이별 고민]: 섣불리 이별이나 유지를 단정하지 마세요. 감정이 격해진 상태에서의 충동적 결정(추측)과 반복되는 구조적 문제(사실)를 구분하도록 돕고, 결정 전 마지막으로 점검해볼 핵심 기준 2가지와 상대의 의지를 확인하는 대화 예시를 제시하세요.",
  },
  {
    intent: "marriage",
    label: "결혼 고민",
    pattern:
      /결혼|예비\s*부부|파혼|상견례|시댁|처가|신혼|가사\s*분담|육아|생활비|경제권|이혼/,
    strategyDirective:
      "질문 유형 [결혼 고민]: 막연한 불안감(추측)과 현실적으로 합의가 필요한 항목(재정·가족 경계·역할 분담 등 사실)을 구분하세요. 상대방과 감정이 상하지 않게 현실적 기준을 조율하는 대화 예시와 이번 주 함께 작성해볼 합의 행동 1가지를 제안하세요.",
  },
  {
    intent: "partner_understanding",
    label: "상대방 이해",
    pattern:
      /왜\s*그럴까|속마음|도대체\s*왜|무슨\s*생각|이해가\s*안|심리가\s*뭐|왜\s*저러|2번|②/,
    strategyDirective:
      "질문 유형 [상대방 이해]: 상대방의 행동을 '나를 사랑하지 않아서'라는 추측으로 단정하지 않도록 사실과 추측을 구분하세요. 애착 성향이나 방어기제(수치심 회피, 감정 과부하 등) 관점에서 상대의 심리를 설명하고, 상대의 진짜 속마음을 안전하게 확인하는 대화 예시를 제시하세요.",
  },
  {
    intent: "trust",
    label: "신뢰 문제",
    pattern:
      /신뢰|거짓말|의심|불안|연락이\s*안|읽씹|답장|이성\s*문제|여사친|남사친|숨기|배신|믿음/,
    strategyDirective:
      "질문 유형 [신뢰 문제]: 확인된 사실(연락 지연, 약속 불이행 등)과 불안에서 비롯된 추측을 명확히 구분하세요. 추궁 대신 상대가 지킬 수 있는 투명한 안심 규칙(예: 바쁠 때 한 줄 예보하기)을 제안하는 대화문과 당장 실행할 수 있는 행동을 안내하세요.",
  },
  {
    intent: "conflict",
    label: "갈등 해결",
    pattern:
      /싸우|싸움|다투|다툼|냉전|화해|사과|비난|폭발|말싸움|갈등|타임아웃/,
    strategyDirective:
      "질문 유형 [갈등 해결]: 갈등 당시의 감정을 존중하되, 감정이 격해진 상태에서의 설전을 멈추고 사실과 감정을 분리하도록 안내하세요. 어색한 냉전을 깨거나 싸움을 멈추는 구체적인 대화 예시와 이번 주 실천할 갈등 완화 규칙 1가지를 제시하세요.",
  },
  {
    intent: "recovery",
    label: "관계 회복",
    pattern:
      /권태기|설렘|식었|소원|멀어진|예전\s*같지|친밀감|스킨십|회복|다시\s*좋아/,
    strategyDirective:
      "질문 유형 [관계 회복]: 관계가 소원해졌다고 해서 곧바로 사랑이 끝났다는 추측과 구분하고, 익숙함 속에서 정서적 교류가 줄어든 사실을 짚어주세요. 오늘 바로 건넬 수 있는 고마움·애정 표현 대화문과 이번 주 함께 해볼 10~20분 친밀감 행동을 제안하세요.",
  },
  {
    intent: "communication",
    label: "의사소통",
    pattern:
      /대화|말을\s*안\s*들어|안\s*통해|동문서답|말투|짜증|회피|입을\s*다물|침묵|경청|답답/,
    strategyDirective:
      "질문 유형 [의사소통]: 상대방이 내 말을 듣지 않는다고 느낄 때의 서운함을 공감하고, 먼저 상대가 대화할 여유가 없는 상황(사실)인지 나를 무시하는 것(추측)인지 확인하도록 안내하세요. '상황-감정-부탁' 순서의 구체적 대화문과 이번 주 10분씩 서로의 이야기를 듣는 실행 행동을 제안하세요.",
  },
  {
    intent: "emotional",
    label: "감정적 고민",
    pattern:
      /서운|외로|속상|슬퍼|우울|지쳐|힘들어|눈물|공허|자존감|답답해/,
    strategyDirective:
      "질문 유형 [감정적 고민]: 사용자의 지치고 서운한 감정을 충분히 존중하고 타당화하세요. 감정이 올라올 때 사실과 부정적 추측을 분리하도록 돕고, 내 감정을 상대에게 부드럽게 알리는 대화 예시와 오늘 나를 돌보는 구체적 행동을 제안하세요.",
  },
];

export function classifyQuestionIntent(
  userMessage: string,
  topicId?: string | null
): QuestionIntentAnalysis {
  const clean = (userMessage || "").trim();
  const isAmbiguous =
    clean.length <= 8 &&
    !/선물|말투|동문서답|변명|회피|연락|이별|결혼|카톡/.test(clean);

  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(clean)) {
      return {
        intent: rule.intent,
        label: rule.label,
        isAmbiguous,
        strategyDirective: rule.strategyDirective,
      };
    }
  }

  const topicMap: Record<string, QuestionIntentType> = {
    communication: "communication",
    conflict: "conflict",
    intimacy: "recovery",
    trust: "trust",
    values: "marriage",
    self_growth: "emotional",
  };

  const fallbackIntent = (topicId && topicMap[topicId]) || "communication";
  const matchedRule =
    INTENT_RULES.find((r) => r.intent === fallbackIntent) || INTENT_RULES[7];

  return {
    intent: matchedRule.intent,
    label: matchedRule.label,
    isAmbiguous,
    strategyDirective: matchedRule.strategyDirective,
  };
}

interface ScenarioTemplate {
  id: string;
  intent: QuestionIntentType;
  keywords: RegExp;
  relatedPart: "conflict" | "intimacy" | "trust" | "values" | "physical";
  empathyAndFactCheck: string[];
  dialogueExamples: string[];
  actionAndFollowUp: string[];
}

const SCENARIOS: ScenarioTemplate[] = [
  {
    id: "communication_listening",
    intent: "communication",
    keywords: /말을\s*안\s*들어|듣지\s*않|대화가\s*안|안\s*통해|공감|소통|이야기|경청/,
    relatedPart: "conflict",
    empathyAndFactCheck: [
      "상대방이 내 말을 귀담아듣지 않는다고 느끼면 서운함과 외로움이 크게 쌓일 수 있습니다. 이때 상대방이 나에게 마음이 식어서 안 듣는 것(추측)인지, 아니면 당장 피로하거나 대화할 마음의 여유가 없는 상황(사실)인지 먼저 구분해 확인해 보세요.",
      "내 속마음을 털어놓았는데 상대방이 건성으로 듣거나 해결책만 던지면 마음이 닫히게 되죠. 먼저 상대방이 내 감정 공감을 어려워하는 대화 습관(사실) 때문인지, 지금 대화를 나누기 힘든 타이밍인지 차분히 살펴보세요.",
    ],
    dialogueExamples: [
      "다음과 같이 내 감정과 구체적인 부탁을 담아 말해 볼 수 있습니다:\n\n> 💬 *'당신이 내 이야기를 들어주지 않는다고 느낄 때 마음이 많이 서운해. 오늘 저녁에 잠시 시간을 내서 서로의 이야기를 들어줄 수 있을까?'*",
      "상대방의 방어를 낮추며 대화를 여는 구체적인 문장입니다:\n\n> 💬 *'오늘 하루 많이 피곤했지? 지금 당장 결론을 내자는 건 아니고, 내가 오늘 느꼈던 서운한 마음을 10분만 편하게 이야기하고 싶은데 괜찮은 시간 알려줄래?'*",
    ],
    actionAndFollowUp: [
      "우선 이번 주에 서로의 이야기를 반론 없이 **10분씩 듣는 시간**을 한 번 마련해 보세요.\n\n보통 두 분이 대화를 나눌 때 상대방이 어떤 반응을 보일 때 가장 '내 말을 안 들어준다'고 느끼시나요?",
      "오늘 저녁에는 스마트폰을 잠시 내려놓고 **딱 10분간 서로의 하루 이야기만 들어주는 행동**부터 시작해 보세요.\n\n최근 상대방에게 이야기를 꺼냈을 때 어떤 상황이었는지 조금 더 들려주실 수 있나요?",
    ],
  },
  {
    id: "contact_trust",
    intent: "trust",
    keywords: /연락|카톡|문자|답장|읽씹|안\s*읽|불안|신뢰|거짓말|의심/,
    relatedPart: "trust",
    empathyAndFactCheck: [
      "연락이 늦어지거나 상대의 태도가 평소와 다르게 느껴지면 불안과 서운함이 커질 수 있습니다. 다만 '연락이 늦은 상황(사실)'과 '상대가 나를 소홀히 여긴다거나 마음이 변했다는 생각(추측)'을 먼저 구분해 보시는 것이 중요합니다.",
      "신뢰가 흔들리거나 연락 공백이 길어지면 하루 종일 마음이 초조해지기 마련입니다. 불안한 마음에 바로 추궁하기보다, 상대방의 실제 일정이나 상황(사실)을 먼저 차분히 확인해 보세요.",
    ],
    dialogueExamples: [
      "상대방을 추궁하지 않으면서도 내 불안을 덜어주는 구체적인 대화 예시입니다:\n\n> 💬 *'네가 바쁠 때 연락이 어려운 건 이해해. 다만 예고 없이 연락이 안 되면 내가 많이 불안하고 서운해. 바빠지기 전에 이따 몇 시쯤 연락하겠다고 한 줄만 미리 알려줄 수 있을까?'*",
      "믿음과 안심을 요청할 때는 다음과 같이 말해 볼 수 있습니다:\n\n> 💬 *'너를 못 믿어서가 아니라 내가 요즘 마음이 조금 불안해서 그래. 우리가 서로 더 안심할 수 있게 약속 시간이나 연락 규칙 하나만 같이 정해볼까?'*",
    ],
    actionAndFollowUp: [
      "우선 이번 주에는 바빠지기 전에 서로 **'한 줄 일정 예보 카톡 보내기'**를 당장 실행해 보세요.\n\n주로 어떤 시간대나 상황에서 연락이 닿지 않을 때 가장 불안하신가요?",
      "오늘부터 연락이 늦어질 때 연속 카톡 대신 **'상황 확인 + 안심 요청 1문장'**만 보내는 행동을 실천해 보세요.\n\n연락이나 신뢰 문제를 꺼냈을 때 상대방은 주로 어떻게 반응하는 편인가요?",
    ],
  },
  {
    id: "conflict_resolution",
    intent: "conflict",
    keywords: /싸우|싸움|다투|다툼|화해|사과|냉전|말투|짜증|비난|방어|회피|침묵/,
    relatedPart: "conflict",
    empathyAndFactCheck: [
      "같은 문제나 말투로 다툼이 반복되면 깊은 피로감과 답답함을 느끼게 됩니다. 상대방이 일부러 나를 공격하려는 것(추측)인지, 아니면 감정이 격해져 서로 방어적인 말투가 먼저 나온 것(사실)인지 구분해 보세요.",
      "다툰 뒤 냉전이 길어지거나 상대가 입을 닫으면 방치된 듯한 서운함이 커질 수 있습니다. 상대가 대화를 피하는 것이 나를 무시해서(추측)가 아니라, 싸움이 더 커질까 봐 두려워 시간을 필요로 하는 상태(사실)일 수 있음을 먼저 확인해 보세요.",
    ],
    dialogueExamples: [
      "감정 싸움을 멈추고 부드럽게 대화를 다시 여는 구체적인 문장입니다:\n\n> 💬 *'아까는 우리가 둘 다 감정이 올라와서 말이 세게 나갔던 것 같아. 맞고 틀리고를 떠나서 너랑 서먹하게 지내는 게 제일 마음이 안 좋아. 오늘 저녁에 15분만 차분하게 서로 마음 이야기해 볼 수 있을까?'*",
      "상대의 날 선 말투가 서운할 때는 다음과 같이 말해 볼 수 있습니다:\n\n> 💬 *'네 말의 뜻은 알겠는데, 짜증 섞인 말투로 들으니까 마음이 많이 속상해. 같은 내용이라도 조금만 부드러운 톤으로 다시 말해줄 수 있을까?'*",
    ],
    actionAndFollowUp: [
      "우선 이번 주에는 다툼 중 목소리가 커질 때 **'20분간 잠시 쉬었다가 다시 대화하기(타임아웃)'**를 실행해 보세요.\n\n최근 두 분의 다툼은 주로 어떤 주제나 상황에서 시작되었나요?",
      "오늘 당장 어색한 기류를 깨는 **짧은 화해 카톡 1줄**을 먼저 건네보세요.\n\n다투고 나면 보통 두 분의 냉전은 며칠 정도 이어지는 편인가요?",
    ],
  },
  {
    id: "relationship_recovery",
    intent: "recovery",
    keywords: /권태기|설렘|식었|소원|멀어진|애정|사랑의\s*언어|친밀감|스킨십|회복/,
    relatedPart: "intimacy",
    empathyAndFactCheck: [
      "예전 같은 설렘이나 다정한 표현이 줄어들면 '사랑이 식은 걸까' 하는 허전함이 찾아올 수 있습니다. 하지만 설렘이 잔잔해진 현상(사실)을 곧바로 애정이 끝났다는 결론(추측)으로 단정하지 마시고, 최근 두 사람 사이에 일상의 피로나 대화 부족이 있었는지 확인해 보세요.",
    ],
    dialogueExamples: [
      "다시 따뜻한 친밀감을 깨우는 구체적인 대화 예시입니다:\n\n> 💬 *'요즘 우리가 바빠서 둘만의 대화가 줄어드니까 조금 외롭고 아쉽더라. 이번 주말에는 평소 안 가보던 곳에서 30분만 같이 산책하면서 이야기 나눌 수 있을까?'*",
    ],
    actionAndFollowUp: [
      "우선 이번 주에는 매일 1번씩 당연하게 여겼던 상대의 행동에 **구체적인 고마움 표현하기**를 실행해 보세요.\n\n본인과 상대방이 가장 사랑받는다고 느끼는 표현 방식(다정한 말, 함께하는 시간, 스킨십, 선물, 도움)은 각각 무엇인가요?",
    ],
  },
  {
    id: "breakup_concern",
    intent: "breakup",
    keywords: /이별|헤어질|헤어지|정리해야|끝내야|그만\s*만나|재회/,
    relatedPart: "conflict",
    empathyAndFactCheck: [
      "이별을 고민할 만큼 마음이 많이 지치고 상처받으셨을 것 같습니다. 지금 올라오는 '당장 끝내고 싶다'는 감정이 최근 다툼 직후의 일시적 소진(추측·감정)인지, 아니면 수차례 구체적으로 요청했음에도 전혀 개선되지 않는 반복적 문제(사실)인지 차분히 구분해 보세요.",
    ],
    dialogueExamples: [
      "결정을 내리기 전 상대방의 관계 개선 의지를 명확히 확인하는 대화 예시입니다:\n\n> 💬 *'요즘 같은 갈등이 반복되면서 솔직히 내가 이 관계를 계속 이어갈 수 있을지 많이 지치고 두려워. 나는 우리 관계를 지키고 싶은데, 너도 함께 대화 방식을 바꿔볼 의향이 있는지 진지하게 듣고 싶어.'*",
    ],
    actionAndFollowUp: [
      "감정이 격해진 상태에서 즉각 이별을 통보하기보다, **3일간 감정을 가라앉히며 '내가 바라는 최소한의 변화 1가지'를 적어보는 행동**을 먼저 실행해 보세요.\n\n이별을 가장 심각하게 고민하게 만든 결정적인 계기는 무엇이었나요?",
    ],
  },
  {
    id: "marriage_values",
    intent: "marriage",
    keywords: /결혼|부부|시댁|처가|육아|가사|경제|돈|소비|미래|가치관|이혼/,
    relatedPart: "values",
    empathyAndFactCheck: [
      "결혼 생활이나 현실적인 가치관(재정, 가족, 가사 분담)에서 의견이 부딪히면 앞날이 막막하게 느껴질 수 있습니다. '우리 가치관이 완전히 안 맞는다'는 막연한 두려움(추측)과 '아직 구체적인 역할·예산 규칙을 합의하지 않은 상태(사실)'를 구분해 보세요.",
    ],
    dialogueExamples: [
      "누가 맞고 틀린지 따지지 않고 현실적인 합의를 이끄는 대화 예시입니다:\n\n> 💬 *'우리가 살아온 환경이 달라서 이 부분에 대한 기준이 다른 게 당연한 것 같아. 내 방식만 고집하지 않을 테니, 오늘 저녁에 15분만 시간을 내서 둘 다 수용할 수 있는 중간 규칙을 하나만 같이 정해볼 수 있을까?'*",
    ],
    actionAndFollowUp: [
      "우선 이번 주에 두 분이 가장 자주 부딪히는 현실 주제 1가지에 대해 **'서로 양보할 수 있는 선 1가지씩 적어서 교환하기'**를 실행해 보세요.\n\n현재 재정, 가족 경계, 가사·역할 중 가장 조율이 시급한 부분은 무엇인가요?",
    ],
  },
];

function matchDirectFollowUp(
  cleanMsg: string,
  lastAssistantMsg: string
): string | null {
  const isShort = cleanMsg.length <= 26;

  // 1. "동문서답", "내 말을 안 들어줘", "딴소리"
  if (/동문서답|내\s*말을\s*안\s*들어|내\s*얘기를\s*안\s*들어|딴소리|공감을\s*안|듣지를\s*않/.test(cleanMsg)) {
    return (
      `상대방이 내 말에 **'${cleanMsg}'**으로 반응하거나 내 이야기를 듣지 않는다고 느끼면 서운함과 답답함이 커질 수 있습니다.\n\n` +
      `먼저 상대방이 내 마음을 일부러 무시하는 것(추측)인지, 아니면 대화할 여유가 없거나 감정 공감 방식이 서툰 상황(사실)인지 확인해 보세요.\n\n` +
      `다음과 같이 말해 볼 수 있습니다:\n\n` +
      `> 💬 *'당신이 내 이야기를 들어주지 않는다고 느낄 때 마음이 많이 서운해. 해결책보다 내 마음을 먼저 알아줬으면 좋겠어. 오늘 저녁에 잠시 시간을 내서 서로의 이야기를 들어줄 수 있을까?'*\n\n` +
      `우선 이번 주에 **서로의 이야기를 반론 없이 10분씩 듣는 시간**을 마련해 보세요. 최근에 어떤 이야기를 꺼냈을 때 상대방이 그렇게 반응했나요?`
    );
  }

  // 2. 사랑의 언어 단답 ("선물", "스킨십", "칭찬", "시간", "도움")
  if (
    isShort &&
    (/사랑받는|애정\s*표현|선호하는/.test(lastAssistantMsg) ||
      /^(선물|스킨십|말|따뜻한\s*말|칭찬|함께하는\s*시간|시간|도움|봉사)$/.test(cleanMsg))
  ) {
    if (/선물/.test(cleanMsg)) {
      return (
        `**'선물'**을 가장 중요한 애정 표현으로 느끼시는군요! 여기서 선물은 비싼 물건이 아니라 **'나를 떠올리고 챙겨준 정성과 기억'**을 뜻합니다.\n\n` +
        `상대방이 선물을 잘 챙기지 않는다면 마음이 식어서(추측)가 아니라, 상대의 애정 표현 방식이 나와 달라서 몰랐을 가능성(사실)이 큽니다.\n\n` +
        `다음과 같이 구체적으로 말해 볼 수 있습니다:\n\n` +
        `> 💬 *'나는 거창한 게 아니더라도 네가 지나가다 내 생각나서 사 온 작은 간식이나 손편지 하나를 받을 때 정말 사랑받는다고 느껴. 가끔 그렇게 작은 정성을 표현해주면 정말 행복할 것 같아.'*\n\n` +
        `우선 이번 주에 내가 먼저 상대방이 좋아하는 작은 간식을 건네며 서로의 애정 표현 방식을 이야기하는 시간을 가져보세요. 상대방은 어떤 표현을 받을 때 가장 좋아하나요?`
      );
    }
  }

  // 3. 말투 / 짜증 / 표정 / 방어 / 변명
  if (isShort && /말투|짜증|표정|한숨|변명|방어|화내|적반하장/.test(cleanMsg)) {
    return (
      `상대방의 **'${cleanMsg}'** 때문에 마음이 많이 상하셨군요. 대화 내용보다 날 선 말투나 방어적인 태도를 마주하면 존중받지 못하는 기분이 들기 마련입니다.\n\n` +
      `먼저 상대방이 나를 공격하려는 의도(추측)인지, 아니면 지적받는다고 느껴 순간적으로 방어기제가 작동한 것(사실)인지 구분해 보세요.\n\n` +
      `다음과 같이 말해 볼 수 있습니다:\n\n` +
      `> 💬 *'너를 비난하려는 게 아니야. 다만 그렇게 방어적이거나 날 선 말투로 이야기하면 내 마음이 많이 서운하고 대화를 이어가기 힘들어. 조금만 부드러운 톤으로 서로 이야기를 들어줄 수 있을까?'*\n\n` +
      `우선 이번 주에는 서운한 점을 말할 때 **'네가 잘못했다는 뜻이 아니라~'이라는 안심 문장으로 대화를 시작하는 행동**을 실천해 보세요. 주로 어떤 주제를 꺼낼 때 상대방의 말투가 날카로워지나요?`
    );
  }

  // 4. 대화문 작성 요청
  if (/카톡\s*문구|문자\s*문구|뭐라고\s*보내|어떻게\s*말해|대화문|멘트|1번|①/.test(cleanMsg)) {
    return (
      `상황에 맞춰 바로 활용하실 수 있는 **구체적인 대화문 2가지**를 작성해 드립니다.\n\n` +
      `**① 부드럽게 대화를 요청하는 문장**\n` +
      `> 💬 *'오늘 하루 바빴지? 너를 탓하려는 게 아니라 요즘 내 마음이 조금 서운하고 외로워서 그래. 오늘 저녁에 10분만 시간 내서 서로 이야기를 들어줄 수 있을까?'*\n\n` +
      `**② 다툰 뒤 어색한 냉전을 푸는 문장**\n` +
      `> 💬 *'아까는 우리가 둘 다 감정이 앞서서 말이 세게 나갔던 것 같아. 너랑 서먹하게 지내는 게 제일 마음 쓰이네. 이따 차 한 잔 마시면서 차분하게 이야기 나누자.'*\n\n` +
      `우선 오늘 저녁 상대방이 퇴근 후 여유가 있는 시간에 두 문장 중 하나를 보내보세요. 상대방의 평소 성향에 맞춰 문구를 조금 더 다듬어 드릴까요?`
    );
  }

  return null;
}

function pickNonRepeating(
  items: string[],
  pastText: string,
  startIdx: number
): string {
  if (!items || items.length === 0) return "";
  for (let offset = 0; offset < items.length; offset++) {
    const candidate = items[(startIdx + offset) % items.length];
    const snippet = candidate.slice(0, 26);
    if (!pastText.includes(snippet)) {
      return candidate;
    }
  }
  return items[startIdx % items.length];
}

/**
 * Generates a high-quality counseling response adhering strictly to STEP 4, 5, 6, 7.
 */
export function generateContextualCounselingReply(params: {
  userMessage: string;
  history: { role: "user" | "assistant"; content: string }[];
  diagnosis: CounselingDiagnosisContext | null;
  topicId?: string | null;
  userName?: string;
}): string {
  const { userMessage, history, diagnosis, topicId, userName } = params;
  const cleanMsg = (userMessage || "").trim();

  // [STEP 6] Crisis & Safety Guardrail Check First (Highest Priority)
  const safetyResult = detectSafetyCrisis(cleanMsg);
  if (safetyResult.isCrisis) {
    return generateCrisisSafeResponse(safetyResult, userName);
  }

  // [STEP 6] Psychiatric / Medical Diagnosis Boundary Check
  if (safetyResult.isPsychiatricQuery) {
    return (
      `말씀해주신 증상이나 성향으로 인해 관계에서 겪는 혼란과 피로감이 무척 크실 것 같습니다.\n\n` +
      `다만 AI 코치는 의료인이나 임상심리전문가가 아니므로 우울증, 인격장애 등 **정신질환을 진단하거나 의학적 치료 효과를 보장할 수 없습니다.**\n\n` +
      `정확한 심리 평가나 치료적 개입이 필요한 상황이라면 **정신건강의학과 전문의 또는 공인 임상심리 상담기관(정신건강상담전화 ☎ 1577-0199)**의 전문적인 진료를 받아보시기를 권해드립니다.\n\n` +
      `일상적인 관계 소통 안에서 상대방이나 본인의 감정을 안전하게 지키는 대화법이 필요하시다면, 현재 가장 힘드신 구체적인 대화 상황을 알려주시겠어요?`
    );
  }

  const assistantMessages = history.filter((m) => m.role === "assistant");
  const lastAssistantMsg =
    assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : "";
  const pastAssistantText = assistantMessages.map((m) => m.content).join("\n");

  // Direct short / follow-up answer check
  const directReply = matchDirectFollowUp(cleanMsg, lastAssistantMsg);
  if (directReply && !pastAssistantText.includes(directReply.slice(0, 28))) {
    return directReply;
  }

  const intentAnalysis = classifyQuestionIntent(cleanMsg, topicId);

  // [Principle 8] If the user's message is too vague/ambiguous on the first turn, ask clarifying questions
  if (intentAnalysis.isAmbiguous && assistantMessages.length <= 1) {
    return (
      `말씀해주신 **'${cleanMsg}'**만으로는 지금 두 분이 겪고 계신 구체적인 상황을 정확히 파악하기가 조심스럽습니다. 내 마음을 제대로 이해받고 실질적인 해결책을 찾으실 수 있도록 조금만 더 알려주시겠어요?\n\n` +
      `1. 최근 파트너와 어떤 말이나 행동 때문에 마음이 상하거나 답답하셨나요?\n` +
      `2. 그 상황에서 본인이 가장 원했던 상대방의 반응은 무엇이었나요?\n\n` +
      `편하게 한두 문장으로만 상황을 설명해주시면, 그에 맞는 **구체적인 대화 예시와 이번 주 실행 행동**을 바로 안내해 드릴게요.`
    );
  }

  const userTurnIndex = history.filter((m) => m.role === "user").length;

  let scenario =
    SCENARIOS.find((s) => s.keywords.test(cleanMsg)) ||
    SCENARIOS.find((s) => s.intent === intentAnalysis.intent) ||
    SCENARIOS[0];

  const seed = userTurnIndex + cleanMsg.length;
  const empathyAndFact = pickNonRepeating(
    scenario.empathyAndFactCheck,
    pastAssistantText,
    seed
  );
  const dialogueExample = pickNonRepeating(
    scenario.dialogueExamples,
    pastAssistantText,
    userTurnIndex
  );
  const actionAndQuestion = pickNonRepeating(
    scenario.actionAndFollowUp,
    pastAssistantText,
    userTurnIndex
  );

  // [Principle 4] Reference previous diagnosis results only within necessary scope (no mechanical listing)
  let diagnosisNote = "";
  if (diagnosis && diagnosis.scores && userTurnIndex === 0) {
    const itemAnalysis = analyzeDiagnosisAnswers(diagnosis.answers);
    const partScore = diagnosis.scores[scenario.relatedPart];
    const matchingCritical =
      itemAnalysis.criticalItems.find((item) => item.question.partKey === scenario.relatedPart) ||
      itemAnalysis.criticalItems[0];

    if (matchingCritical && partScore !== undefined && partScore < 38) {
      diagnosisNote = ` (최근 진단에서도 **'${matchingCritical.question.concept}'** 문항과 **${itemAnalysis.attachment.primaryType}** 성향이 확인되어, 이 상황에서 서운함이 더 크게 다가오셨을 수 있습니다.)`;
    }
  }

  return `${empathyAndFact}${diagnosisNote}\n\n${dialogueExample}\n\n${actionAndQuestion}`;
}
