/**
 * STEP 7. Personalized 7-Day & 30-Day Relationship Improvement Program
 * Generates structured plans based on diagnosis results & AI coaching context.
 * Includes:
 * - 개선 목표 (goal)
 * - 구체적인 행동 (action)
 * - 실행 방법 (howTo)
 * - 예상되는 어려움 (expectedObstacle)
 * - 실천 여부 기록 (status & note)
 * - 다음 단계 제안 (nextStepSuggestion)
 * - 진행 상황에 따른 AI 동적 계획 조정 (Adaptive adjustment)
 */

export type PlanDuration = "7d" | "30d";
export type StepPracticeStatus = "pending" | "completed" | "partial" | "struggled";

export interface ProgramStepItem {
  id: string;
  dayOrPhaseLabel: string; // e.g., "Day 1" or "Week 1 (1~7일차)"
  title: string;
  goal: string; // 개선 목표
  action: string; // 구체적인 행동
  howTo: string; // 실행 방법 (대화 예시 포함)
  expectedObstacle: string; // 예상되는 어려움 및 대처법
  status: StepPracticeStatus; // 실천 여부 기록
  practiceNote?: string; // 사용자 실천 메모
  nextStepSuggestion: string; // 다음 단계 제안
  isAdjustedByAi?: boolean; // AI가 진행 상황에 맞춰 조정했는지 여부
  adjustmentNote?: string; // AI 조정 사유 및 완화된 대안
  easierAlternative: {
    action: string;
    howTo: string;
    nextStepSuggestion: string;
  };
}

export interface RelationshipProgramPlan {
  userId: string;
  focusCategory: string;
  focusLabel: string;
  createdAt: string;
  updatedAt: string;
  activeDuration: PlanDuration;
  sevenDaySteps: ProgramStepItem[];
  thirtyDaySteps: ProgramStepItem[];
}

function getProgramStorageKey(userId: string): string {
  const safeId = (userId || "guest").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return `heartsync_program_v1_${safeId}`;
}

export function resolveCurrentUserId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return String(parsed.id);
      if (parsed?.email) return String(parsed.email);
    }
  } catch {
    // Ignore
  }
  return "guest";
}

function buildSevenDayTemplates(focusCategory: string): ProgramStepItem[] {
  const isConflict = focusCategory === "conflict";
  const isTrust = focusCategory === "trust";
  const isIntimacy = focusCategory === "intimacy";

  return [
    {
      id: "7d_1",
      dayOrPhaseLabel: "Day 1",
      title: "감정 온도 관찰 및 비난 멈추기",
      goal: isConflict
        ? "다툼을 촉발하는 첫 3분의 비난·지적 말투 멈추기"
        : isTrust
          ? "불안할 때 추궁 대신 내 감정 상태 먼저 알아차리기"
          : "하루 1번 파트너의 일상과 감정 상태에 관심 기울이기",
      action: "오늘 하루 동안 상대의 행동을 평가하는 말('너는 왜 항상~') 대신 내 기분만 메모해보기",
      howTo:
        "서운하거나 답답한 순간이 오면 바로 말하기 전에 10초간 숨을 고르고 다음과 같이 부드럽게 운을 떼어보세요:\n\"오늘 하루 많이 피곤했지? 아까 그 일은 내가 조금 서운했는데, 네 생각도 편할 때 듣고 싶어.\"",
      expectedObstacle:
        "습관적으로 날 선 말투가 먼저 튀어나올 수 있습니다. 아차 싶을 때는 '미안, 내가 말을 너무 급하게 했네'라고 즉시 수정하면 충분합니다.",
      status: "pending",
      nextStepSuggestion: "Day 2의 '10분 경청 타임'으로 이어서 상대의 이야기를 끊지 않고 듣는 연습을 진행합니다.",
      easierAlternative: {
        action: "대면 대화가 부담스럽다면 퇴근길에 짧은 안부 카톡 1줄 보내기",
        howTo: "카톡 예시: '오늘 하루도 고생 많았어! 저녁 맛있게 먹고 이따 편하게 연락해 :)'",
        nextStepSuggestion: "부담 없는 안부 인사로 어색함을 먼저 낮춘 뒤 짧은 대화로 넘어갑니다.",
      },
    },
    {
      id: "7d_2",
      dayOrPhaseLabel: "Day 2",
      title: "반론 없이 10분간 서로의 이야기 듣기",
      goal: "상대방이 '내 말을 들어주고 있다'는 정서적 안전감 형성하기",
      action: "오늘 저녁 차를 마시거나 산책하며 5분씩 번갈아 상대방 이야기만 끝까지 들어주기",
      howTo:
        "상대가 이야기할 때 변명이나 해결책을 바로 말하지 않고 고개를 끄덕이며 이렇게 반응해보세요:\n\"그랬구나, 네 입장에서는 충분히 그렇게 느끼고 답답했을 것 같아.\"",
      expectedObstacle:
        "상대방의 말 중에 사실과 다른 부분이 있으면 즉시 반박하고 싶어집니다. '일단 끝까지 듣고 내 차례에 말하자'고 마음속으로 다짐해보세요.",
      status: "pending",
      nextStepSuggestion: "경청으로 방어벽이 낮아졌다면 Day 3에서 '나-전달법(I-Message)'으로 내 속마음을 전합니다.",
      easierAlternative: {
        action: "10분이 길게 느껴진다면 딱 3분만 상대의 오늘 가장 힘들었던 일 1가지 물어보기",
        howTo: "대화 예시: '오늘 하루 중에 제일 신경 쓰이거나 피곤했던 일 하나만 알려줄래? 그냥 들어주고 싶어서 그래.'",
        nextStepSuggestion: "짧은 공감 대화가 익숙해지면 점차 대화 시간을 5~10분으로 늘려갑니다.",
      },
    },
    {
      id: "7d_3",
      dayOrPhaseLabel: "Day 3",
      title: "사실과 추측 구분하여 속마음 전달하기",
      goal: "상대의 의도를 부정적으로 단정(추측)하지 않고 사실과 내 감정만 전달하기",
      action: "'상황(사실) + 내 감정 + 구체적 부탁' 3단계 문장으로 서운했던 점 1가지 이야기하기",
      howTo:
        "추측('날 무시해서 안 들은 거지?')을 빼고 이렇게 말해보세요:\n\"당신이 내 이야기를 들어주지 않는다고 느낄 때 마음이 많이 서운해(감정). 오늘 저녁에 잠시 시간을 내서 서로의 이야기를 들어줄 수 있을까?(부탁)\"",
      expectedObstacle:
        "상대가 여전히 방어적으로 반응할 수 있습니다. 그때는 '네가 잘못했다는 게 아니라 내 마음이 그랬다는 뜻이야'라고 안심시켜주세요.",
      status: "pending",
      nextStepSuggestion: "Day 4에서는 갈등이 아닌 긍정적 감정 은행 계좌를 채우는 감사 표현을 실천합니다.",
      easierAlternative: {
        action: "말로 꺼내기 어렵다면 카톡이나 손편지 메모로 부드럽게 내 마음 2줄 전하기",
        howTo: "카톡 예시: '우리가 더 잘 지내고 싶어서 용기 내어 적어봐. 가끔은 내 이야기에 조금만 더 귀 기울여주면 정말 힘이 날 것 같아.'",
        nextStepSuggestion: "글로 마음을 전한 뒤 상대의 표정과 반응을 차분히 살펴봅니다.",
      },
    },
    {
      id: "7d_4",
      dayOrPhaseLabel: "Day 4",
      title: "감정 은행 계좌에 구체적 감사 1건 입금하기",
      goal: isIntimacy
        ? "무덤덤해진 일상에 다정한 온기와 친밀감 불어넣기"
        : "지적보다 인정을 먼저 건네어 관계의 긍정성 비율 높이기",
      action: "당연하게 여겼던 파트너의 작은 배려나 노력을 찾아 구체적으로 고마움 표현하기",
      howTo:
        "막연한 '고마워' 대신 구체적인 행동을 짚어 말해보세요:\n\"바빴을 텐데 내가 말했던 거 기억하고 챙겨줘서 정말 고마워. 덕분에 마음이 참 든든했어.\"",
      expectedObstacle:
        "평소 칭찬이 어색해 쑥스러울 수 있습니다. 거창한 칭찬보다 사소한 행동 하나만 언급하면 훨씬 자연스럽습니다.",
      status: "pending",
      nextStepSuggestion: "Day 5에서는 두 사람만의 갈등 과열 방지 안전장치(타임아웃 규칙)를 합의합니다.",
      easierAlternative: {
        action: "직접 말하기 쑥스럽다면 작은 간식이나 커피 기프티콘과 함께 '고마워' 한마디 보내기",
        howTo: "메시지 예시: '요즘 고생 많은 것 같아서 보냈어. 늘 내 곁에 있어줘서 고마워!'",
        nextStepSuggestion: "작은 선물과 감사 표현으로 굳어 있던 분위기를 부드럽게 녹입니다.",
      },
    },
    {
      id: "7d_5",
      dayOrPhaseLabel: "Day 5",
      title: "우리 커플만의 '안전 신호·타임아웃' 약속 정하기",
      goal: "감정이 격해지거나 연락이 안 될 때 오해가 커지지 않는 명확한 규칙 세우기",
      action: "기분이 좋을 때 '다툴 때 멈추는 신호' 또는 '바쁠 때 한 줄 예보 규칙' 1가지 합의하기",
      howTo:
        "분위기가 편안할 때 가볍게 제안해보세요:\n\"우리 앞으로 혹시 이야기하다가 감정이 올라오면, 상처 주는 말 하기 전에 20분만 쉬었다가 다시 이야기하기로 약속할까?\"",
      expectedObstacle:
        "상대가 '지금 잘 지내는데 왜 싸울 이야기부터 하냐'고 할 수 있습니다. '지금 좋을 때 정해두어야 앞으로도 계속 이렇게 좋게 지낼 수 있어서 그래'라고 덧붙여보세요.",
      status: "pending",
      nextStepSuggestion: "Day 6에서는 스마트폰을 내려놓고 온전히 서로에게 집중하는 시간을 갖습니다.",
      easierAlternative: {
        action: "규칙 합의가 부담스럽다면 '내가 먼저 화날 때 심호흡 3번 하기' 나만의 다짐 정하기",
        howTo: "실천 방법: 감정이 올라올 때 즉각 대꾸하지 않고 물 한 잔 마시며 1분만 템포 늦추기",
        nextStepSuggestion: "내 반응 속도만 늦춰도 갈등이 크게 번지는 것을 막을 수 있습니다.",
      },
    },
    {
      id: "7d_6",
      dayOrPhaseLabel: "Day 6",
      title: "디지털 디톡스 & 20분 온전한 연결 시간",
      goal: "함께 있는 시간의 질(Quality Time)을 높이고 정서적 친밀감 회복하기",
      action: "오늘 저녁 20분 동안은 두 사람 모두 스마트폰을 치우고 눈을 맞추며 대화하거나 산책하기",
      howTo:
        "식사 후나 잠들기 전 이렇게 제안해보세요:\n\"오늘 밤에 딱 20분만 폰 내려놓고 동네 한 바퀴 같이 걸을까? 요즘 네가 제일 관심 있는 게 뭔지 궁금해.\"",
      expectedObstacle:
        "막상 폰을 치우면 무슨 말을 해야 할지 어색할 수 있습니다. '최근 가장 가보고 싶은 곳'이나 '주말에 먹고 싶은 음식' 같은 가벼운 주제로 시작하세요.",
      status: "pending",
      nextStepSuggestion: "마지막 Day 7에서 일주일간의 변화를 돌아보고 다음 단계를 설계합니다.",
      easierAlternative: {
        action: "20분 산책이 어렵다면 잠들기 전이나 헤어지기 전 10초 동안 따뜻하게 포옹하기",
        howTo: "실행 방법: 말없이 10초간 어깨를 토닥이며 안아주기 (옥시토신 분비로 긴장 완화)",
        nextStepSuggestion: "비언어적 스킨십으로 정서적 유대감을 먼저 회복합니다.",
      },
    },
    {
      id: "7d_7",
      dayOrPhaseLabel: "Day 7",
      title: "7일간의 관계 변화 돌아보기 & 3분 체크인",
      goal: "일주일간 서로 노력한 점을 인정하고 관계 개선 효능감 높이기",
      action: "이번 주 가장 좋았던 대화 순간 1가지를 나누고 HeartSync '3분 체크인'으로 점수 변화 기록하기",
      howTo:
        "일주일을 마무리하며 이렇게 이야기해보세요:\n\"이번 주에 우리가 서로 이야기 잘 들어주려고 노력해서 마음이 훨씬 편안했어. 함께 애써줘서 고마워. 앞으로도 이렇게 조금씩 맞춰가자.\"",
      expectedObstacle:
        "7일 모든 과제를 완벽히 못 지켰다고 실망할 필요 없습니다. 단 1~2가지만 실천했어도 관계의 방향은 이미 긍정적으로 바뀌고 있습니다.",
      status: "pending",
      nextStepSuggestion: "7일 집중 플랜 이후에는 '30일 관계 체질 개선 플랜'으로 건강한 소통 습관을 완전히 정착시켜보세요.",
      easierAlternative: {
        action: "혼자서 이번 주 내 감정이 가장 편안했던 순간 1가지를 떠올리고 3분 체크인 기록하기",
        howTo: "마이페이지 또는 결과 리포트의 '3분 체크인' 버튼으로 이번 주 관계 온도 점검하기",
        nextStepSuggestion: "AI 코치에게 이번 주 실천 후기를 들려주시면 다음 주 맞춤 코칭을 이어갑니다.",
      },
    },
  ];
}

function buildThirtyDayTemplates(focusCategory: string): ProgramStepItem[] {
  const focusName =
    focusCategory === "conflict"
      ? "갈등 패턴 교정"
      : focusCategory === "trust"
        ? "애착 안정성 및 신뢰 구축"
        : focusCategory === "intimacy"
          ? "정서적 친밀감 회복"
          : focusCategory === "values"
            ? "핵심 가치관 조율"
            : "신체적·정서적 교감 회복";

  return [
    {
      id: "30d_w1",
      dayOrPhaseLabel: "1주차 (Day 1~7)",
      title: `[기초 다지기] 부정적 감정 고리 끊기와 방어벽 낮추기`,
      goal: `${focusName}을 가로막는 급격한 감정 반응(비난·회피·추궁) 빈도를 절반으로 줄이기`,
      action: "주 3회 이상 '부드러운 대화 시작(나-전달법)'과 '10분 반론 없는 경청' 실천하기",
      howTo:
        "1주차 핵심 대화 공식:\n\"네가 ~할 때(사실) 나는 조금 외롭고 서운한 마음이 들어(감정). 우리 이번 주에 10분만 서로 이야기 들어주는 시간을 가져볼까?(부탁)\"",
      expectedObstacle:
        "초반에는 내가 먼저 말투를 바꿔도 상대방이 예전 방식대로 퉁명스럽게 반응할 수 있습니다. 최소 1주일은 일관된 신호를 보내야 상대의 방어기제가 내려갑니다.",
      status: "pending",
      nextStepSuggestion: "1주차에 대화의 안전감이 확보되면 2주차 '정서적 유대 및 안전 기지 구축'으로 넘어갑니다.",
      easierAlternative: {
        action: "주 3회 대면 대화가 부담스럽다면 매일 1회 비난 없는 다정한 안부 카톡 보내기",
        howTo: "예시: '오늘도 수고했어! 힘든 일 있으면 언제든 편하게 이야기해줘.'",
        nextStepSuggestion: "작은 안심 신호를 1주일간 꾸준히 쌓아 대화의 문턱을 낮춥니다.",
      },
    },
    {
      id: "30d_w2",
      dayOrPhaseLabel: "2주차 (Day 8~14)",
      title: "[유대감 회복] 사랑의 지도 업데이트 & 감정 은행 입금",
      goal: "서로의 현재 스트레스와 애정 욕구를 파악하고 긍정적 상호작용 비율(5:1) 높이기",
      action: "매일 1가지 구체적 감사 표현하기 + 주 1회 서로의 '사랑의 언어(선호하는 애정 표현)' 실천하기",
      howTo:
        "2주차 핵심 대화 질문:\n\"요즘 회사나 일상에서 너를 제일 신경 쓰이게 하는 일은 뭐야? 내가 어떻게 해줄 때 가장 힘이 나는지 알려줘.\"",
      expectedObstacle:
        "바쁜 평일에는 피로 때문에 대화 여유가 부족할 수 있습니다. 주말 낮 시간이나 이동 시간을 활용해 가볍게 이야기를 나눠보세요.",
      status: "pending",
      nextStepSuggestion: "2주차에 정서적 잔고가 채워지면 3주차에 '반복 갈등 주제 조율 및 규칙 수립'을 진행합니다.",
      easierAlternative: {
        action: "주 2회 상대방이 좋아하는 간식이나 짧은 응원 메시지로 마음 표현하기",
        howTo: "예시: '네가 좋아하는 거 보니까 생각나서 샀어. 맛있게 먹고 힘내!'",
        nextStepSuggestion: "말보다 행동이 편한 커플은 작은 배려 행동으로 친밀감을 먼저 높입니다.",
      },
    },
    {
      id: "30d_w3",
      dayOrPhaseLabel: "3주차 (Day 15~21)",
      title: "[문제 해결] 반복되는 핵심 갈등 1가지의 현실적 타협점 찾기",
      goal: "상대를 바꾸려 하기보다 두 사람 모두 지킬 수 있는 현실적인 '최소 합의선' 1가지 만들기",
      action: "가장 자주 부딪히는 주제(연락 빈도, 가사/재정, 주말 시간 등)에서 서로 1보씩 양보한 구체적 약속 정하기",
      howTo:
        "3주차 타협 대화 예시:\n\"우리가 이 문제로 자꾸 다투는 건 서로 중요하게 생각하는 기준이 달라서인 것 같아. 내 기준만 고집하지 않을 테니, 우리가 둘 다 편하게 지킬 수 있는 중간 지점을 하나만 정해보자.\"",
      expectedObstacle:
        "과거에 서운했던 일까지 한꺼번에 꺼내면 다시 논쟁이 됩니다. '과거 일은 빼고 앞으로 어떻게 할지만 딱 15분 이야기하자'고 범위를 제한하세요.",
      status: "pending",
      nextStepSuggestion: "3주차 합의 규칙을 일주일간 시험 적용한 뒤 4주차에 관계 체질 정착 및 재진단을 진행합니다.",
      easierAlternative: {
        action: "민감한 주제 합의가 어렵다면 '다툰 뒤 24시간 내에 먼저 손 내밀기' 화해 규칙 1가지만 정하기",
        howTo: "예시: '어떤 문제든 하루 넘겨서 냉전하지 않기로만 먼저 약속하자.'",
        nextStepSuggestion: "문제 자체보다 갈등 회복 속도를 줄이는 것만으로도 관계 만족도가 크게 올라갑니다.",
      },
    },
    {
      id: "30d_w4",
      dayOrPhaseLabel: "4주차 (Day 22~30)",
      title: "[습관 정착] 둘만의 주간 리추얼 완성 & 30일 전후 변화 점검",
      goal: "개선된 소통 방식이 일시적 노력이 아닌 두 사람만의 지속 가능한 관계 습관으로 자리 잡기",
      action: "주 1회 '우리 관계 15분 티타임' 정례화 + 50문항 재진단(또는 3분 체크인)으로 30일 전후 점수 비교하기",
      howTo:
        "4주차 리추얼 대화 예시:\n\"한 달 동안 우리가 서로 맞춰가려고 노력한 덕분에 예전보다 훨씬 편안하고 가까워진 느낌이야. 이번 달에 내가 해준 것 중에 제일 좋았던 건 뭐였어?\"",
      expectedObstacle:
        "한 달쯤 지나면 다시 예전 습관이 가끔 나올 수 있습니다. 실수하더라도 자책하지 말고 '다시 리추얼로 돌아가자'며 유연하게 넘기세요.",
      status: "pending",
      nextStepSuggestion: "30일 완주 후 HeartSync 시계열 그래프에서 상승한 점수를 확인하고 새로운 성장 목표를 설정하세요.",
      easierAlternative: {
        action: "월 1회 새로운 데이트 장소 방문하기 & HeartSync 체크인으로 관계 점수 기록하기",
        howTo: "함께 맛있는 식사를 하며 지난 한 달간 고마웠던 점 1가지씩 나누기",
        nextStepSuggestion: "정기적인 관계 검진 루틴을 통해 건강한 관계를 장기적으로 유지합니다.",
      },
    },
  ];
}

const CATEGORY_LABELS: Record<string, string> = {
  conflict: "갈등 관리 및 소통 패턴",
  intimacy: "정서적 친밀감 및 우정",
  trust: "신뢰 및 애착 안정성",
  values: "가치관 및 미래 합의",
  physical: "신체적·정서적 스킨십",
};

export function loadOrCreateProgramPlan(
  userId: string,
  scores?: Record<string, number> | null
): RelationshipProgramPlan {
  const key = getProgramStorageKey(userId);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as RelationshipProgramPlan;
        if (parsed && parsed.userId === userId && Array.isArray(parsed.sevenDaySteps)) {
          return parsed;
        }
      }
    } catch {
      // Fall through to create
    }
  }

  let focusCategory = "conflict";
  if (scores && Object.keys(scores).length > 0) {
    const sorted = Object.entries(scores).sort(([, a], [, b]) => a - b);
    focusCategory = sorted[0][0];
  }

  const now = new Date().toISOString();
  const plan: RelationshipProgramPlan = {
    userId,
    focusCategory,
    focusLabel: CATEGORY_LABELS[focusCategory] || "갈등 관리 및 소통 패턴",
    createdAt: now,
    updatedAt: now,
    activeDuration: "7d",
    sevenDaySteps: buildSevenDayTemplates(focusCategory),
    thirtyDaySteps: buildThirtyDayTemplates(focusCategory),
  };

  saveProgramPlan(plan);
  return plan;
}

export function saveProgramPlan(plan: RelationshipProgramPlan): void {
  if (typeof window === "undefined") return;
  try {
    plan.updatedAt = new Date().toISOString();
    localStorage.setItem(getProgramStorageKey(plan.userId), JSON.stringify(plan));
    window.dispatchEvent(new CustomEvent("heartsync:program-updated", { detail: plan }));
  } catch {
    // Ignore storage error
  }
}

/**
 * Updates a step's practice status & note.
 * If the user selects "struggled" (어려움 겪음), AI automatically adjusts the step
 * to a lower-barrier alternative action!
 */
export function updateProgramStepStatus(
  userId: string,
  duration: PlanDuration,
  stepId: string,
  status: StepPracticeStatus,
  practiceNote?: string
): RelationshipProgramPlan {
  const plan = loadOrCreateProgramPlan(userId);
  const list = duration === "7d" ? plan.sevenDaySteps : plan.thirtyDaySteps;

  const updatedList = list.map((step) => {
    if (step.id !== stepId) return step;

    const updatedStep: ProgramStepItem = {
      ...step,
      status,
      practiceNote: practiceNote !== undefined ? practiceNote : step.practiceNote,
    };

    if (status === "struggled" && step.easierAlternative) {
      updatedStep.isAdjustedByAi = true;
      updatedStep.adjustmentNote =
        `💡 [AI 코치 자동 난이도 조정] 기존 과제가 부담스러우셨군요! 무리하지 않도록 더 가볍고 실천하기 쉬운 대안 행동으로 계획을 조정했습니다:\n` +
        `• 조정된 행동: ${step.easierAlternative.action}\n` +
        `• 실행 팁: ${step.easierAlternative.howTo}`;
      updatedStep.nextStepSuggestion = step.easierAlternative.nextStepSuggestion;
    } else if (status === "completed") {
      updatedStep.isAdjustedByAi = false;
      updatedStep.adjustmentNote = undefined;
    }

    return updatedStep;
  });

  if (duration === "7d") {
    plan.sevenDaySteps = updatedList;
  } else {
    plan.thirtyDaySteps = updatedList;
  }

  saveProgramPlan(plan);
  return plan;
}

export function getProgramProgressSummary(plan: RelationshipProgramPlan): {
  duration: PlanDuration;
  totalSteps: number;
  completedCount: number;
  partialCount: number;
  struggledCount: number;
  completionRate: number;
  nextPendingStep: ProgramStepItem | null;
  strugglingSteps: ProgramStepItem[];
} {
  const steps = plan.activeDuration === "7d" ? plan.sevenDaySteps : plan.thirtyDaySteps;
  const totalSteps = steps.length;
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const partialCount = steps.filter((s) => s.status === "partial").length;
  const struggledCount = steps.filter((s) => s.status === "struggled").length;
  const completionRate =
    totalSteps > 0 ? Math.round(((completedCount + partialCount * 0.5) / totalSteps) * 100) : 0;

  const nextPendingStep =
    steps.find((s) => s.status === "pending" || s.status === "struggled") || null;
  const strugglingSteps = steps.filter((s) => s.status === "struggled");

  return {
    duration: plan.activeDuration,
    totalSteps,
    completedCount,
    partialCount,
    struggledCount,
    completionRate,
    nextPendingStep,
    strugglingSteps,
  };
}
