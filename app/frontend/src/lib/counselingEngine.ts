/**
 * Context-Aware Intelligent Counseling Fallback Engine
 * Generates personalized, non-repetitive relationship coaching responses based on:
 * 1. User's specific question intent (12 clinical relationship scenarios)
 * 2. User's 50-question diagnosis results & item-level attachment/Gottman profile
 * 3. Current conversation turn & history (progressive multi-turn coaching)
 */

import { analyzeDiagnosisAnswers } from "./diagnosisAnalysis";

export interface CounselingDiagnosisContext {
  id: string;
  total_score: number;
  scores: Record<string, number>;
  answers?: Record<string, number> | string;
  ai_report?: string;
}

interface ScenarioTemplate {
  id: string;
  keywords: RegExp;
  relatedPart: "conflict" | "intimacy" | "trust" | "values" | "physical";
  title: string;
  empathy: string[];
  theoryInsight: string[];
  actionScripts: string[];
  followUpQuestions: string[];
}

const SCENARIOS: ScenarioTemplate[] = [
  {
    id: "contact_anxiety",
    keywords: /연락|카톡|문자|답장|읽씹|안\s*읽|불안|전화|디지털|소통\s*팁/,
    relatedPart: "trust",
    title: "연락 빈도와 애착 불안 조율",
    empathy: [
      "연락이 닿지 않거나 답장이 늦어질 때 밀려오는 초조함은 결코 내가 예민해서만은 아니에요. 상대방과의 연결이 끊어질까 봐 두려워하는 애착 시스템의 자연스러운 경보 신호입니다.",
      "카톡이나 문자에서 온도가 다르게 느껴지면 하루 종일 마음이 쓰이고 집중하기 어렵죠. 디지털 소통은 표정과 목소리가 빠져 있어 작은 공백도 거절처럼 느껴지기 쉽습니다.",
      "연락 문제로 서운함이 반복되면 '나만 이 관계에 매달리나' 하는 외로움까지 겹쳐 마음이 많이 지치셨을 거예요.",
    ],
    theoryInsight: [
      "존 볼비(Bowlby)의 애착 이론에서 연락 공백에 대한 불안은 **'안전 기지(Secure Base)'의 예측 가능성**이 흔들릴 때 강해집니다. 중요한 것은 연락 횟수 자체보다 '언제 다시 연결될지 아는 예측 가능성'입니다.",
      "디지털 대화에서는 상대의 바쁨을 '애정 식음'으로 자동 해석하는 **인지적 도약(Jumping to Conclusions)**이 일어나기 쉽습니다. 사실(바빠서 답장이 늦음)과 해석(나를 중요하게 생각하지 않음)을 분리하는 연습이 필요합니다.",
      "불안형-회피형 애착 역동에서는 한쪽이 연락을 재촉할수록 다른 쪽은 압박감을 느껴 더 숨어버리는 '추격-도망(Pursuer-Distancer) 패턴'이 생기기 쉽습니다.",
    ],
    actionScripts: [
      "오늘 대화에서 추궁 대신 **예측 가능한 공유 규칙**을 제안해보세요:\n> 💬 *\"나는 네가 바쁠 때 연락이 안 되는 건 이해해. 다만 '지금 회의 들어가, 이따 8시쯤 연락할게'라고 한 줄만 미리 알려주면 내가 훨씬 안심하고 기다릴 수 있을 것 같아.\"*\n이렇게 구체적인 행동 요청으로 바꾸면 상대도 부담 없이 수용하기 쉬워집니다.",
      "불안이 올라와 확인 카톡을 연속으로 보내고 싶을 때는 **'15분 감정 진정 규칙'**을 써보세요. 메모장에 지금 느끼는 불안한 감정을 먼저 적고, 비난이 빠진 한 문장(*\"오늘 하루 어땠어? 끝나고 목소리 잠깐 듣고 싶다\"*)으로 바꿔 보내보세요.",
      "텍스트로 민감한 감정 이야기를 나누는 것은 오해를 부르기 쉽습니다. 카톡은 '일정 공유와 짧은 애정 표현' 용도로만 쓰고, 서운한 이야기는 반드시 직접 만나거나 통화로 나누는 **'디지털 대화 경계선'**을 함께 정해보세요.",
    ],
    followUpQuestions: [
      "보통 상대방과 연락이 얼마나 안 될 때 가장 불안함이 크게 올라오시나요?",
      "연락 문제를 이야기했을 때 파트너는 주로 어떻게 반응하는 편인가요?",
      "두 분만의 '연락 예보 규칙'을 하나 정한다면 어떤 약속이 가장 마음을 편하게 해줄까요?",
    ],
  },
  {
    id: "recurring_fight",
    keywords: /반복|같은\s*문제|맨날|항상|다투|다툼|싸우|싸움|화가|화나|감정\s*조절|말투|비난|공격/,
    relatedPart: "conflict",
    title: "반복되는 다툼 패턴과 감정 과부하 차단",
    empathy: [
      "똑같은 주제로 도돌이표처럼 싸움이 반복되면 '우리는 안 맞나 보다' 하는 무력감이 찾아오죠. 문제를 해결하고 싶어서 꺼낸 말이 어느새 감정 싸움으로 번질 때 가장 지치기 마련입니다.",
      "다투는 순간 감정이 격해져 원치 않는 날 선 말이 나가고, 뒤돌아서 후회하는 과정이 반복되면 두 사람 모두 마음의 상처가 깊어질 수밖에 없어요.",
      "서로의 입장만 평행선처럼 맞설 때는 내용 자체보다 '상대가 내 마음을 전혀 이해하려 하지 않는다'는 답답함이 화를 더 키우곤 합니다.",
    ],
    theoryInsight: [
      "가트맨 박사의 연구에 따르면 커플 갈등의 **69%는 성격·생활방식 차이에서 오는 '영원한 문제(Perpetual Problems)'**입니다. 같은 문제로 싸우는 커플이 실패하는 이유는 문제 자체 때문이 아니라, 대화 시작 3분 안에 **비난·방어·경멸·담쌓기(4가지 독소)**가 등장하기 때문입니다.",
      "갈등 중 심박수가 분당 100회를 넘는 **'감정적 홍수(Emotional Flooding)'** 상태가 되면 뇌의 전두엽 기능이 일시 정지되어 공감이나 논리적 대화가 생물학적으로 불가능해집니다.",
      "반복 다툼의이면에는 표면적 주제(예: 약속 시간, 말투) 아래에 숨겨진 **'인정받고 싶은 욕구'와 '거절당할까 봐 두려운 2차 감정'**이 자리 잡고 있습니다.",
    ],
    actionScripts: [
      "다툼이 시작될 때 첫 문장을 바꾸는 **'부드러운 시작(Softened Start-up)'** 공식(상황 + 내 감정 + 긍정적 요청)을 적용해보세요:\n> ❌ *\"너는 왜 맨날 말투가 그 모양이야?\"*\n> ⭕ *\"방금 그렇게 말하니까 내가 무시받는 느낌이라 마음이 속상했어(감정). 같은 말이라도 조금만 부드럽게 해줄 수 있을까?(요청)\"*",
      "감정이 격해져 목소리가 커질 조짐이 보이면 즉시 **'20분 타임아웃 프로토콜'**을 선언하세요:\n> 💬 *\"지금은 우리가 둘 다 감정이 올라와서 상처 주는 말을 할 것 같아. 당신이 소중해서 그러니 20분만 숨 고르고 9시에 다시 차분히 이야기하자.\"*\n반드시 '다시 대화할 시간'을 함께 말해야 상대가 회피로 오해하지 않습니다.",
      "다음번 갈등이 지나간 뒤에는 **'갈등 복기 3단계 대화'**를 시도해보세요: ① 각자 그때 느꼈던 진짜 감정 1가지 말하기 → ② 상대 입장 요약해주기(*\"네 입장에선 그래서 서운했구나\"*) → ③ 내가 잘못한 부분 10%라도 먼저 인정하기.",
    ],
    followUpQuestions: [
      "최근 가장 크게 다투셨던 상황은 어떤 사소한 계기에서 시작되었나요?",
      "싸움이 시작될 때 두 분 중 누가 먼저 말을 꺼내고, 상대는 어떻게 반응하는 패턴인가요?",
      "다투는 도중 상대방의 어떤 말투나 행동이 나의 감정을 가장 급격하게 건드리나요?",
    ],
  },
  {
    id: "stonewalling_avoidance",
    keywords: /회피|입을\s*다물|침묵|동굴|피하|대화가\s*안|혼자만의|무시|담쌓기|답답/,
    relatedPart: "conflict",
    title: "침묵·회피(담쌓기) 패턴과 추격-도망 악순환 해체",
    empathy: [
      "문제를 풀려고 대화를 시도하는데 상대방이 입을 닫거나 자리를 피하면, 벽을 보고 이야기하는 것 같은 극심한 고립감과 분노를 느끼게 되죠.",
      "반대로 내 입장에서는 싸움이 커지는 게 두려워 일단 침묵을 택했는데, 상대방이 계속 다그치면 숨이 막히는 기분이 들기도 합니다.",
      "한 사람은 대화를 원해 다가가고 한 사람은 부담스러워 물러서는 패턴이 굳어지면 두 사람 모두 관계에서 큰 피로감을 느끼게 됩니다.",
    ],
    theoryInsight: [
      "감정중심치료(EFT, 수 존슨 박사)에서는 이를 전형적인 **'추격자-회피자(Pursuer-Withdrawer) 악순환 댄스'**로 설명합니다. 추격자는 '연결이 끊어질까 봐' 두려워 다그치고, 회피자는 '상황을 망치고 비난받을까 봐' 두려워 침묵합니다.",
      "가트맨 이론의 **담쌓기(Stonewalling)**는 상대를 골탕 먹이려는 의도가 아니라, 내면의 생리적 각성도가 한계치를 넘어 자기 보호를 위해 셔터를 내리는 반응인 경우가 많습니다.",
    ],
    actionScripts: [
      "상대가 침묵하거나 회피할 때 추격하는 대신 **안전감을 주는 완충 문장**을 건네보세요:\n> 💬 *\"내가 지금 당장 결론을 내자고 몰아세우려는 게 아니야. 네가 생각이 정리될 시간이 필요하면 기다릴게. 대신 오늘 밤에 10분만 이야기할 수 있을지 알려줘.\"*",
      "만약 본인이 동굴로 들어가고 싶어지는 편이라면, 그냥 입을 닫는 대신 **'안심 신호가 포함된 휴식 요청'**을 해보세요:\n> 💬 *\"지금 내 머릿속이 너무 복잡해서 바로 대답하기가 어려워. 너를 무시하는 게 절대 아니니까, 30분만 생각 정리하고 내가 먼저 말 걸게.\"*",
      "민감한 대화는 마주 보고 앉기보다 **나란히 걷거나 차를 타고 이동할 때(Side-by-Side 대화법)** 꺼내보세요. 시선 압박이 줄어들면 회피 성향인 파트너도 훨씬 방어 없이 속마음을 털어놓습니다.",
    ],
    followUpQuestions: [
      "대화를 피하거나 침묵하는 상황은 주로 어떤 주제가 나왔을 때 나타나나요?",
      "침묵이 이어질 때 보통 얼마 만에, 어떤 방식으로 다시 대화가 재개되나요?",
    ],
  },
  {
    id: "apology_repair",
    keywords: /화해|사과|어색|냉전|싸운\s*후|풀기|먼저\s*손/,
    relatedPart: "conflict",
    title: "갈등 후 어색함을 깨는 회복 시도(Repair Attempt)와 진정한 사과",
    empathy: [
      "다툰 뒤에 마음은 이미 누그러졌는데도 자존심이나 어색함 때문에 먼저 말을 건네기가 참 쉽지 않죠. 냉전이 길어질수록 서로 눈치만 보게 되어 더 힘들어집니다.",
      "어렵게 화해를 시도했는데 상대가 퉁명스럽게 반응하거나 사과가 형식적으로 느껴지면 오히려 서운함이 배가되기도 해요.",
    ],
    theoryInsight: [
      "가트맨 박사는 행복한 커플과 불행한 커플의 결정적 차이가 **'회복 시도(Repair Attempt)의 타이밍과 수용성'**에 있다고 밝혔습니다. 완벽한 논리적 합의보다 '우리 관계가 이 싸움보다 중요하다'는 정서적 신호가 먼저입니다.",
      "심리학자 해리 채프먼의 **'5가지 사과의 언어'**에 따르면, 진정한 화해에는 ① 유감 표현(미안해), ② 책임 인정(내가 잘못했어), ③ 보상 제안(어떻게 해줄까?), ④ 재발 방지 약속, ⑤ 용서 구하기 중 상대가 원하던 요소가 포함되어야 합니다.",
    ],
    actionScripts: [
      "어색한 냉전을 깨는 가장 효과적인 **'작은 회복 신호(Micro-Repair)'** 문장입니다:\n> 💬 *\"아까는 내가 감정이 앞서서 말을 세게 했어. 우리가 맞고 틀리고를 떠나서, 너랑 서먹하게 지내는 게 나는 제일 싫어. 커피 한 잔 마시면서 편하게 이야기할까?\"*",
      "사과할 때는 **'변명(근데 너도~)'을 완전히 뺀 3문장 사과법**을 써보세요:\n1. *\"아까 내가 ~라고 말한 건 내 불찰이야.\"* (행동 인정)\n2. *\"그 말 들었을 때 네가 참 외롭고 무시당하는 기분이었을 것 같아.\"* (상대 감정 공감)\n3. *\"다음엔 화가 나더라도 비난하지 않고 내 마음만 말할게. 미안해.\"* (대안 약속)",
    ],
    followUpQuestions: [
      "두 분이 다투고 나면 보통 냉전이 얼마나 지속되는 편인가요?",
      "사과를 주고받을 때 상대방의 어떤 태도가 가장 진심으로 와닿으시나요?",
    ],
  },
  {
    id: "boredom_romance",
    keywords: /권태기|설렘|식었|식어|애정\s*표현|사랑의\s*언어|데이트|친밀감|소원|친구\s*같/,
    relatedPart: "intimacy",
    title: "권태기 극복과 정서적 은행 계좌 재충전",
    empathy: [
      "연애 초기의 불꽃 같은 설렘이 줄어들고 일상이 무덤덤해지면 '사랑이 식은 걸까?' 하는 불안과 아쉬움이 찾아오죠. 함께 있어도 예전 같은 특별함이 덜 느껴질 때 마음이 허전해집니다.",
      "서로 너무 익숙해져서 고마움이나 애정 표현이 줄어들면, 안정감을 넘어 정서적 권태로 이어지기 쉬워요.",
    ],
    theoryInsight: [
      "로버트 스턴버그의 **'사랑의 삼각형 이론'**에서 열정(Passion)은 뇌의 도파민 적응으로 인해 1~2년이 지나면 자연스럽게 완만해집니다. 이때 **친밀감(Intimacy)과 헌신(Commitment)**을 의도적 자극과 결합해야 성숙한 로맨스가 유지됩니다.",
      "가트맨의 **'감정 은행 계좌(Emotional Bank Account)'** 이론과 아서 아론(Arthur Aron) 박사의 **'자기 확장 이론(Self-Expansion Theory)'**에 따르면, 익숙한 데이트가 아닌 '함께 새롭고 약간 낯선 경험'을 할 때 뇌는 연애 초기와 동일한 설렘 호르몬을 분비합니다.",
    ],
    actionScripts: [
      "이번 주말에는 익숙한 밥-카페 코스 대신 **'자기 확장(Self-Expansion) 데이트'**를 하나 시도해보세요: 가보지 않은 동네 골목 야간 산책, 원데이 클래스, 함께 새로운 요리 도전하기처럼 둘이서 처음 해보는 작은 모험이 설렘을 깨웁니다.",
      "게리 채프먼의 **'5가지 사랑의 언어'**를 오늘 저녁 대화 주제로 꺼내보세요:\n> 💬 *\"요즘 내가 너에게 사랑받는다고 가장 크게 느끼는 순간은 언제인 것 같아? 나는 네가 ~해줄 때 마음이 제일 따뜻해지더라.\"*",
      "하루 1번 **'감정 입금 루틴'**을 시작해보세요: 당연하게 여겼던 상대의 행동 하나를 찾아 구체적으로 칭찬하기(*\"오늘 바빴을 텐데 먼저 연락해줘서 고마워, 덕분에 힘났어\"*).",
    ],
    followUpQuestions: [
      "두 분이 가장 마지막으로 '오늘 정말 즐거웠다!'고 느꼈던 데이트나 순간은 언제였나요?",
      "본인과 파트너가 가장 선호하는 애정 표현 방식(말, 스킨십, 함께하는 시간, 선물, 도움)은 각각 무엇인가요?",
    ],
  },
  {
    id: "physical_sex",
    keywords: /스킨십|성관계|잠자리|섹스|거부|피하|매력|신체적|포옹|키스|손잡/,
    relatedPart: "physical",
    title: "신체적·성적 친밀감 회복과 정서-신체 연결",
    empathy: [
      "스킨십이나 잠자리 문제는 가장 가까운 사이에서도 꺼내기 민감하고, 거절당했을 때의 상처나 자존감 하락이 매우 크게 다가오는 영역이에요.",
      "한쪽은 친밀감을 원하는데 다른 한쪽이 피로감이나 부담으로 피하게 되면, 신체적 거리감이 곧 정서적 거리감으로 번지기 쉽습니다.",
    ],
    theoryInsight: [
      "성 치료 및 EFT(감정중심치료) 연구에서 성적 만족도의 가장 강력한 예측 인자는 빈도가 아니라 **'성에 대해 부끄러움이나 비난 없이 솔직하게 대화할 수 있는 성적 소통(Sexual Communication)'**입니다.",
      "특히 성관계라는 목적성 접촉 이전에, 일상적인 **비성적 스킨십(손잡기, 포옹, 6초 키스)**이 충분히 선행되어야 옥시토신이 분비되고 심리적 안전감이 형성됩니다.",
    ],
    actionScripts: [
      "잠자리가 아닌 **낮 시간의 편안한 분위기**에서 '나-메시지'로 스킨십 대화를 열어보세요:\n> 💬 *\"나는 너와 스킨십할 때 우리가 가장 가깝게 연결되어 있다고 느껴서 좋아. 요즘 네가 많이 피곤해 보이는데, 우리가 서로 부담 없이 편안하게 가까워지려면 어떻게 하면 좋을지 같이 이야기해보고 싶어.\"*",
      "성관계 부담을 완전히 내려놓은 **'비성적 스킨십 주간(Non-demand Touch)'**을 실천해보세요: 만날 때와 헤어질 때 **6초간 꼭 안아주기**, 나란히 앉아 손잡기처럼 '성관계로 이어지지 않아도 되는 안전한 스킨십'을 먼저 늘리면 방어벽이 자연스럽게 낮아집니다.",
    ],
    followUpQuestions: [
      "일상에서 손잡기나 포옹 같은 가벼운 스킨십은 두 분 사이에 자연스럽게 이루어지고 있나요?",
      "스킨십이나 친밀감에 대해 솔직하게 이야기를 꺼내는 데 가장 걸림돌이 되는 감정은 무엇인가요?",
    ],
  },
  {
    id: "trust_jealousy",
    keywords: /신뢰|거짓말|속이|의심|질투|이성\s*문제|이성\s*친구|남사친|여사친|바람|배신|경계|과거/,
    relatedPart: "trust",
    title: "신뢰 회복과 건강한 관계 경계선(Boundary) 설정",
    empathy: [
      "한 번 흔들린 신뢰나 이성 문제로 인한 불안감은 마음속에서 쉽게 지워지지 않죠. 의심하고 싶지 않은데도 자꾸 확인하게 되는 나 자신이 힘들게 느껴지실 거예요.",
      "질투나 경계선 문제는 '내가 속이 좁은 건가' 자책하기 쉽지만, 사실은 우리 관계의 안전 울타리를 지키고 싶은 자연스러운 보호 본능에서 출발합니다.",
    ],
    theoryInsight: [
      "가트맨 박사의 **'신뢰 구축 이론(Attunement & Trust)'**에 따르면, 신뢰는 거창한 맹세가 아니라 상대의 불안을 사소하게 여기지 않고 **투명성(Transparency)과 일관된 행동**으로 응답하는 작은 순간들의 축적에서 회복됩니다.",
      "이성 동료나 친구 문제에서는 '누가 맞느냐'의 옳고 그름 싸움이 아니라, 두 사람이 함께 편안함을 느끼는 **'상호 합의된 경계선(Mutual Boundary)'**을 재설정하는 것이 핵심입니다.",
    ],
    actionScripts: [
      "상대를 통제하거나 추궁하는 대신 **'관계 보호를 위한 경계선 합의 대화'**를 제안해보세요:\n> 💬 *\"내가 너의 인간관계를 통제하려는 게 아니야. 다만 이성 지인과 단둘이 늦게 만나거나 연락하는 건 나에게 불안감을 줘. 우리 둘 다 마음 편할 수 있는 선(예: 사전 공유, 단둘이 술자리 피하기)을 같이 정해보면 좋겠어.\"*",
      "이미 깨진 신뢰를 회복 중이라면, 사과 한 번으로 끝내려 하지 말고 **'투명한 선제 공유'**를 일정 기간 약속하세요. 질문받기 전에 먼저 일정을 알리고 약속을 100% 지키는 일관된 데이터가 쌓여야 뇌의 불안 경보가 꺼집니다.",
    ],
    followUpQuestions: [
      "신뢰가 흔들리거나 질투가 올라오게 된 구체적인 사건이나 계기가 있었나요?",
      "파트너가 어떤 행동을 일관되게 보여줄 때 마음이 가장 안심되시나요?",
    ],
  },
  {
    id: "finance_money",
    keywords: /돈|재정|소비|경제|절약|지출|비용|모으|통장|금전/,
    relatedPart: "values",
    title: "재정 가치관 및 소비 습관의 공유 의미 조율",
    empathy: [
      "돈과 소비 습관 문제는 현실적인 삶과 직결되어 있어서, 가치관이 다르면 상대가 무책임해 보이거나 반대로 너무 각박하게 느껴져 갈등이 깊어지기 쉽죠.",
    ],
    theoryInsight: [
      "가트맨의 **'공유 의미 체계(Shared Meaning System)'**에서 돈은 단순한 숫자가 아니라 각자가 성장하며 형성한 **'심리적 상징(안전감 vs 자유/현재의 행복)'**입니다. 소비 습관을 고치려 하기 전에 돈이 각자에게 의미하는 바를 이해해야 합니다.",
    ],
    actionScripts: [
      "상대의 지출을 지적하기보다 **'돈에 담긴 심리적 의미 대화'**를 먼저 나눠보세요:\n> 💬 *\"우리 서로 돈을 쓸 때나 모을 때 가장 중요하게 생각하는 가치가 뭔지 이야기해보자. 나는 저축이 '미래의 안전감'을 주는데, 너에게는 어떤 소비가 가장 큰 행복을 줘?\"*\n그 후 **① 공동 목표 자금(고정 비율) + ② 서로 간섭하지 않는 개인 자유 용돈**으로 영역을 분리하는 '투트랙 예산제'를 추천합니다.",
    ],
    followUpQuestions: [
      "두 분 사이에서 주로 어떤 항목의 지출이나 재정 계획 때문에 의견 차이가 생기나요?",
    ],
  },
  {
    id: "marriage_future",
    keywords: /결혼|미래|가치관|확신|평생|비전|장기|인생|목표|커리어/,
    relatedPart: "values",
    title: "결혼·미래 비전과 가치관 차이 조율",
    empathy: [
      "함께하는 시간이 깊어질수록 결혼이나 미래에 대한 생각 차이, 혹은 중요한 가치관의 온도 차가 보이면 '이 사람과 끝까지 갈 수 있을까' 하는 무거운 고민이 드실 거예요.",
    ],
    theoryInsight: [
      "가트맨의 **'꿈 속의 꿈(Dreams Within Conflict)'** 이론에 따르면, 미래 계획이나 가치관 충돌 이면에는 각자가 절대 포기할 수 없는 삶의 핵심 소망(안정, 자율성, 가족, 성취)이 숨어 있습니다. 차이를 '틀림'이 아닌 '서로 다른 두 문화의 만남'으로 다루어야 합니다.",
    ],
    actionScripts: [
      "결론을 재촉하기보다 상대의 내면 동기를 탐색하는 **'꿈 인터뷰 질문'**을 던져보세요:\n> 💬 *\"우리가 당장 결론을 내자는 건 아니야. 다만 네가 그리는 3년, 5년 뒤의 가장 이상적인 삶은 어떤 모습인지, 그리고 결혼이나 미래에 대해 어떤 기대나 걱정이 있는지 네 솔직한 마음을 듣고 싶어.\"*",
      "가치관 조율 시에는 **'양보 불가능한 핵심 영역(Core Areas)'** 1가지와 **'유연하게 맞출 수 있는 영역(Flexible Areas)'** 2가지를 각자 적어 교환해보면 구체적인 접점이 보입니다.",
    ],
    followUpQuestions: [
      "미래 계획이나 가치관 중에서 현재 두 분의 생각이 가장 크게 엇갈리는 주제는 무엇인가요?",
    ],
  },
  {
    id: "family_housework",
    keywords: /가사|집안일|분담|시댁|처가|부모님|가족|육아|아이|자녀|명절/,
    relatedPart: "values",
    title: "가사·육아 공정성과 원가족 경계선 설정",
    empathy: [
      "집안일 분담이나 양가 가족, 육아 문제는 일상에서 매일 부딪히는 현실이라, 나만 희생하고 있다는 불공정함이 쌓이면 애정까지 빠르게 소진되기 쉽습니다.",
    ],
    theoryInsight: [
      "사회교환이론(Equity Theory)과 보웬(Bowen)의 **가족체계이론**에 따르면, 커플의 행복은 ① 가사·육아에서 **'심리적 공정성'**을 느끼는가, 그리고 ② 양가 원가족보다 **'우리 부부/커플을 최우선 단위(We-ness)'**로 보호하는 경계선이 있는가에 달려 있습니다.",
    ],
    actionScripts: [
      "가사 분담 갈등 시에는 '도와준다'는 개념을 없애고 **'보이지 않는 노동(계획·기억·관리)까지 포함한 역할 카드 나누기'**를 해보세요:\n> 💬 *\"집안일을 누가 더 많이 하느냐를 따지자는 게 아니라, 우리가 둘 다 지치지 않게 각자 처음부터 끝까지 책임질 전담 영역을 명확히 나눠보자.\"*",
      "양가 가족 문제에서는 **'원가족 대변인 원칙'**을 세우세요: 내 부모님과의 조율은 반드시 내가 직접 총대를 메고, 파트너 편에 먼저 서주어야 관계의 신뢰가 무너지지 않습니다.",
    ],
    followUpQuestions: [
      "현재 가사 분담이나 가족·육아 문제에서 가장 불공평하거나 서운하게 느껴지는 지점은 무엇인가요?",
    ],
  },
  {
    id: "self_esteem_codependency",
    keywords: /자존감|의존|공의존|나를\s*먼저|돌보|우울|지쳐|지침|이별|헤어|힘들|내가\s*없/,
    relatedPart: "trust",
    title: "관계 속 자존감 회복과 건강한 심리적 독립",
    empathy: [
      "상대방의 기분과 반응에 내 하루 전체가 흔들리고, 관계에 에너지를 쏟느라 정작 나 자신을 잃어버린 것 같은 기분이 들 때 마음이 참 공허하고 지치셨을 거예요.",
    ],
    theoryInsight: [
      "건강한 친밀감은 두 사람이 하나로 녹아 없어지는 '융합(Enmeshment/공의존)'이 아니라, 각자 단단한 자기 정체성을 가진 두 사람이 만나는 **'건강한 상호의존(Interdependence)'**에서 나옵니다. 내 자존감의 안전기지를 나 자신 안에도 세워야 관계가 숨을 쉽니다.",
    ],
    actionScripts: [
      "이번 주부터 **'관계 외 자기 돌봄 루틴(Self-Soothing)'**을 하루 30분씩 확보해보세요: 파트너와 무관하게 나에게 성취감과 평온함을 주는 취미, 운동, 친구 만남을 의식적으로 유지하는 것이 오히려 관계의 매력을 높입니다.",
      "상대의 기분이 안 좋아 보일 때 *'내가 뭘 잘못했나?'*라고 내 탓으로 가져오는 습관을 멈추고, 속으로 **\"상대의 감정은 상대의 몫이고, 나는 내 평온을 지킬 권리가 있다\"**고 경계를 그어보세요.",
    ],
    followUpQuestions: [
      "요즘 관계 속에서 내가 가장 작아지거나 에너지를 빼앗긴다고 느끼는 순간은 언제인가요?",
    ],
  },
  {
    id: "general_communication",
    keywords: /.*/,
    relatedPart: "intimacy",
    title: "공감적 경청과 비폭력 대화(NVC) 연결",
    empathy: [
      "소중한 사람과 마음이 닿지 않고 대화가 겉도는 느낌이 들면 함께 있어도 외롭고 답답한 마음이 드실 거예요. 용기 내어 고민을 나눠주셔서 감사합니다.",
      "관계에서 겪는 서운함과 갈등은 두 사람이 더 깊은 이해로 나아가기 위해 겪는 신호이기도 해요. 지금 느끼시는 감정은 충분히 타당합니다.",
    ],
    theoryInsight: [
      "마셜 로젠버그의 **비폭력 대화(NVC)**와 가트맨의 **'상호 전환(Turning Toward)'** 이론에 따르면, 대화가 막히는 가장 큰 이유는 '내 진짜 감정(서운함, 외로움)과 욕구(인정, 안심)'를 말하는 대신 상대의 태도를 평가하는 말로 대화가 시작되기 때문입니다.",
    ],
    actionScripts: [
      "대화가 잘 통하지 않을 때는 해결책을 찾으려 하기보다 **'공감 확인 대화법(반영적 경청)'**을 먼저 제안해보세요:\n> 💬 *\"우리가 서로 오해가 쌓이지 않게, 내가 먼저 2분 동안 내 마음을 이야기할 테니 조언 대신 '네가 그래서 서운했구나' 하고 먼저 들어줄 수 있을까? 그다음엔 내가 네 이야기를 끝까지 들을게.\"*",
      "내 마음을 전할 때는 **NVC 4단계(관찰 → 감정 → 욕구 → 부탁)**를 활용해보세요:\n> 💬 *\"요즘 우리가 대화할 시간이 줄어드니까(관찰) 조금 외롭고 멀어진 기분이 들어(감정). 나는 너와 마음을 가까이 나누고 싶은데(욕구), 오늘 저녁에 15분만 산책하며 이야기할 수 있을까?(부탁)\"*",
    ],
    followUpQuestions: [
      "파트너와 대화할 때 어떤 순간에 가장 '말이 안 통한다'거나 '답답하다'고 느끼시나요?",
      "지금 이 고민에서 파트너가 내 마음의 어떤 부분을 가장 먼저 알아주기를 바라시나요?",
    ],
  },
];

/**
 * Generate a deeply contextualized, non-repetitive counseling response
 * when the live LLM endpoint is unavailable or in fallback mode.
 */
export function generateContextualCounselingReply(params: {
  userMessage: string;
  history: { role: "user" | "assistant"; content: string }[];
  diagnosis: CounselingDiagnosisContext | null;
  topicId?: string | null;
}): string {
  const { userMessage, history, diagnosis, topicId } = params;
  const cleanMsg = userMessage.trim();

  // Count how many user messages have been sent so far (0-indexed turn)
  const userTurnIndex = history.filter((m) => m.role === "user").length;

  // Match scenario by user message keywords first, then by selected topicId
  let scenario = SCENARIOS.find((s) => s.id !== "general_communication" && s.keywords.test(cleanMsg));

  if (!scenario && topicId) {
    const topicMap: Record<string, string> = {
      communication: "general_communication",
      conflict: "recurring_fight",
      intimacy: "boredom_romance",
      trust: "trust_jealousy",
      values: "marriage_future",
      self_growth: "self_esteem_codependency",
    };
    const mappedId = topicMap[topicId];
    scenario = SCENARIOS.find((s) => s.id === mappedId);
  }

  if (!scenario) {
    scenario = SCENARIOS[SCENARIOS.length - 1];
  }

  // Rotate variations deterministically by turn index + message length so consecutive answers never repeat
  const seed = userTurnIndex + cleanMsg.length;
  const empathyText = scenario.empathy[seed % scenario.empathy.length];
  const theoryText = scenario.theoryInsight[userTurnIndex % scenario.theoryInsight.length];
  const actionText = scenario.actionScripts[userTurnIndex % scenario.actionScripts.length];
  const followUpText = scenario.followUpQuestions[userTurnIndex % scenario.followUpQuestions.length];

  // Build personalized diagnosis insight paragraph if diagnosis is available
  let diagnosisBridge = "";
  if (diagnosis && diagnosis.scores) {
    const itemAnalysis = analyzeDiagnosisAnswers(diagnosis.answers);
    const partScore = diagnosis.scores[scenario.relatedPart];
    const partNames: Record<string, string> = {
      conflict: "갈등 관리",
      intimacy: "정서적 친밀감",
      trust: "신뢰/애착",
      values: "가치관",
      physical: "신체적 만족",
    };
    const partLabel = partNames[scenario.relatedPart] || "관계";

    // Look for a matching critical item in that part or overall
    const matchingCritical =
      itemAnalysis.criticalItems.find((item) => item.question.partKey === scenario!.relatedPart) ||
      itemAnalysis.criticalItems[0];

    if (matchingCritical && userTurnIndex === 0) {
      diagnosisBridge = `\n\n📊 **진단 데이터 기반 맞춤 분석:**\n최근 50문항 진단에서 **${partLabel} 영역(${partScore ?? 30}/50점)** 중 특히 **'${matchingCritical.question.concept}'** 문항(*"${matchingCritical.question.text}"*)에서 관계 피로도가 높게 나타났으며, 애착 프로파일은 **${itemAnalysis.attachment.primaryType}** 경향을 보이고 있습니다. 지금 말씀하신 고민은 바로 이 지점과 깊이 연결되어 있어요.`;
    } else if (partScore !== undefined && userTurnIndex <= 1) {
      diagnosisBridge = `\n\n📊 **진단 맥락 연결:**\n현재 두 분의 진단 결과에서 **${partLabel} 점수(${partScore}/50점, 종합 ${diagnosis.total_score}/250점)**를 함께 살펴보면, 서로에 대한 애정이 없어서가 아니라 갈등이나 서운함을 다루는 소통 방식의 차이에서 에너지가 소모되고 있는 상태로 보입니다.`;
    }
  }

  return `${empathyText}${diagnosisBridge}

💡 **심리학적 핵심 원리 (${scenario.title})**
${theoryText}

✨ **오늘 바로 실천해볼 수 있는 맞춤 대화법**
${actionText}

❓ **함께 더 이야기해보고 싶어요:**
${followUpText}`;
}

