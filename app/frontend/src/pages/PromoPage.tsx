import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Lock,
  Clock,
  Star,
  AlertTriangle,
  Zap,
  Users,
  BookOpen,
  Bot,
  ChevronRight,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import {
  getTotalDiagnosisCount,
  syncServerDiagnosisCount,
} from "@/lib/diagnosisCounter";
import {
  getCombinedReviews,
  syncReviewsFromServer,
  FEEDBACK_TAG_LABELS,
  type UserReview,
} from "@/lib/reviewStore";

type TargetPersonaKey = "couple2030" | "crisis" | "married3040";

const PERSONA_CONTENT: Record<
  TargetPersonaKey,
  {
    badge: string;
    tabLabel: string;
    headline: string;
    highlight: string;
    subcopy: string;
    ctaText: string;
    statLabel: string;
  }
> = {
  couple2030: {
    badge: "💑 2030 연인 · 예비부부 인기 1위",
    tabLabel: "💑 2030 연인·예비부부",
    headline: "사랑하는데 왜 사소한 말투로",
    highlight: "매번 똑같이 싸울까요?",
    subcopy:
      "감정이 아닌 심리학 데이터로 우리 커플의 애착 궁합과 소통 신호등을 3분 만에 번역해 드립니다.",
    ctaText: "우리 커플 관계 신호등 무료 확인하기",
    statLabel: "연인 갈등 패턴 정확도 96.4%",
  },
  crisis: {
    badge: "💔 갈등 · 이별 위기 긴급 솔루션",
    tabLabel: "💔 갈등·이별 위기",
    headline: "헤어지기 전에 딱 한 번만,",
    highlight: "진짜 원인을 데이터로 확인하세요",
    subcopy:
      "사랑이 식은 게 아니라 '소통 방어기제'가 충돌하고 있을 수 있습니다. 가트맨 박사 이론으로 관계 회복 가능성을 진단합니다.",
    ctaText: "관계 위기 신호(Red Flag) 무료 진단하기",
    statLabel: "위기 커플 대화 재개율 89.2%",
  },
  married3040: {
    badge: "💍 3040 부부 · 권태기 맞춤 케어",
    tabLabel: "💍 3040 부부·권태기",
    headline: "부부 상담 1회 20만 원이 부담스럽다면,",
    highlight: "집에서 밤 11시에도 시작하세요",
    subcopy:
      "예약 대기 없이 지금 바로, 혼자서도 시작할 수 있는 AI 부부 소통 건강검진과 30일 맞춤 관계 회복 루틴을 제공합니다.",
    ctaText: "부부 소통 건강검진 무료로 시작하기",
    statLabel: "오프라인 상담 대비 비용 90% 절감",
  },
};

const PAIN_POINTS = [
  {
    id: "p1",
    text: "내 마음을 몰라주고 매번 동문서답하거나 대화를 회피해요",
    tag: "담쌓기(Stonewalling) 패턴",
  },
  {
    id: "p2",
    text: "사소한 말투로 시작된 다툼이 결국 인격 비난으로 끝나요",
    tag: "비난·방어 악순환",
  },
  {
    id: "p3",
    text: "연락이 늦거나 표정이 어두우면 내가 뭘 잘못했나 불안해요",
    tag: "불안-회피 애착 역동",
  },
  {
    id: "p4",
    text: "내 서운함을 말하면 상대방은 '네가 예민하다'고 맞받아쳐요",
    tag: "정서적 무효화",
  },
  {
    id: "p5",
    text: "함께 있어도 외롭고 대화가 의무적인 용건 전달뿐이에요",
    tag: "정서적 친밀감 고갈",
  },
  {
    id: "p6",
    text: "이 사람과 계속 만나도(결혼해도) 행복할지 확신이 흔들려요",
    tag: "공유 가치관 불일치",
  },
];

const BEFORE_AFTER_CASES = [
  {
    id: "comm",
    label: "💬 동문서답·소통 단절",
    userQuestion: "내가 힘들다고 말하면 상대방은 딴소리를 하거나 대화를 피해요.",
    beforeReply:
      "서로 대화가 부족해서 생기는 문제입니다. 상대방의 입장을 이해하려고 노력하고 대화를 자주 나누어 보세요.",
    afterEmpathy:
      "내 마음을 꺼내놓았는데 상대가 화제를 돌리거나 피하면 거절당한 것처럼 외롭고 서운하실 수밖에 없습니다.",
    afterAnalysis:
      "[사실] 상대가 감정 대화에서 화제를 전환함 / [추측] 나를 무시한다기보다 감정적 부담을 피하려는 '회피형 방어기제'일 가능성이 높습니다.",
    afterScript:
      "\"오늘 있었던 일을 해결해 달라는 게 아니라, 그냥 내 편에서 5분만 들어주면 마음이 한결 편해질 것 같아. 지금 잠시 이야기 나눌 여유가 있을까?\"",
    afterAction:
      "오늘 저녁: 대화를 시작하기 전 '조언 말고 공감만 해달라'는 안전 가드레일을 먼저 알려주세요.",
  },
  {
    id: "fight",
    label: "⚡ 반복되는 말다툼",
    userQuestion: "사소한 집안일이나 연락 문제로 시작해서 매번 큰 싸움이 돼요.",
    beforeReply:
      "사소한 일로 화를 내기보다 서로 양보하고 배려하는 마음을 가지는 것이 중요합니다.",
    afterEmpathy:
      "같은 주제로 계속 싸우다 보면 '우리는 안 맞나 보다' 하고 지치고 무기력해지기 쉽습니다.",
    afterAnalysis:
      "가트맨 박사 연구에서 커플 갈등의 69%는 반복되는 문제입니다. 시작 첫 3분에 '너는 왜 맨날...'이라는 비난 대신 '나-전달법(부드러운 시작)'이 필요합니다.",
    afterScript:
      "\"연락이 늦어질 때(상황) 무슨 일 있나 걱정되고 혼자 남겨진 기분이 들어(감정). 바쁠 땐 '이따 연락할게'라고 카톡 한 줄만 남겨줄 수 있을까?(부탁)\"",
    afterAction:
      "이번 주 미션: 대화 중 감정이 격해지면 즉시 '20분 타임아웃'을 선언하고 물 한 잔 마시기.",
  },
  {
    id: "trust",
    label: "🤝 신뢰·연락 불안",
    userQuestion: "과거 거짓말 문제 이후로 상대방 말을 100% 믿기가 힘들어요.",
    beforeReply:
      "이미 지난 일이니 마음을 넓게 먹고 상대를 다시 믿어주려고 노력해 보세요.",
    afterEmpathy:
      "한 번 흔들린 신뢰 때문에 사소한 일에도 의심과 불안이 올라오는 것은 결코 예민해서가 아닌 자연스러운 자기보호 반응입니다.",
    afterAnalysis:
      "신뢰 회복은 피해자의 '무조건적 용서'가 아니라, 두 사람 사이의 '투명하고 예측 가능한 행동 규칙'을 세울 때 이루어집니다.",
    afterScript:
      "\"내가 다시 온전히 마음 놓고 의지하고 싶어서 그래. 앞으로 일정이 바뀔 때 미리 공유해 주면 내 불안이 훨씬 줄어들 것 같아.\"",
    afterAction:
      "7일 신뢰 회복 플랜: 매일 저녁 서로의 내일 일정을 가볍게 공유하는 3분 브리핑 루틴 만들기.",
  },
];

export default function PromoPage() {
  const navigate = useNavigate();
  const miniTestRef = useRef<HTMLDivElement>(null);

  const [persona, setPersona] = useState<TargetPersonaKey>("couple2030");
  const [diagCount, setDiagCount] = useState<number>(() =>
    getTotalDiagnosisCount()
  );
  const [checkedPains, setCheckedPains] = useState<string[]>([
    "p1",
    "p2",
  ]);
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);

  // 30-second interactive mini test state
  const [myStyle, setMyStyle] = useState<string>("속으로 참다가 폭발");
  const [partnerStyle, setPartnerStyle] = useState<string>("회피·침묵·동문서답");
  const [coreWorry, setCoreWorry] = useState<string>("대화가 통하지 않는 답답함");
  const [showMiniResult, setShowMiniResult] = useState(false);

  // Live reviews
  const [reviews, setReviews] = useState<UserReview[]>(
    () => getCombinedReviews().allReviews
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    syncServerDiagnosisCount().then((c) => setDiagCount(c));
    syncReviewsFromServer().then((serverRevs) => {
      setReviews(getCombinedReviews(serverRevs).allReviews);
    });
  }, []);

  const togglePainPoint = (id: string) => {
    setCheckedPains((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getMiniTestAnalysis = () => {
    const isHighRisk =
      checkedPains.length >= 4 ||
      partnerStyle.includes("회피") ||
      myStyle.includes("폭발");

    const flagTitle = isHighRisk
      ? "🟠 추격-도망(Pursuer-Distancer) 소통 과부하 신호"
      : "🟡 정서적 주파수 불일치 (해석 차이 주의)";

    const summary = `현재 두 분은 '${myStyle}' 패턴과 상대방의 '${partnerStyle}' 반응이 맞물려, '${coreWorry}'이(가) 반복되는 구조에 있습니다. 이는 사랑이 부족해서가 아니라 서로가 갈등 상황에서 불안을 다루는 방어기제가 정반대이기 때문입니다.`;

    const recommendedScript =
      partnerStyle.includes("회피")
        ? `"당신을 다그치려는 게 아니라, 우리가 더 편해지고 싶어서 꺼내는 이야기야. 오늘 저녁에 딱 10분만 내 마음을 들어줄 수 있을까?"`
        : `"우리가 서로 아끼는데 말투 때문에 상처 주는 게 너무 속상해. 서로 공격하지 않고 내 마음만 차분히 이야기해 볼까?"`;

    return { flagTitle, summary, recommendedScript };
  };

  const handleSharePromo = async () => {
    const shareUrl = `${window.location.origin}/promo`;
    const shareText =
      "💕 [HeartSync] 우리 커플은 왜 사소한 말투로 싸울까? 30초 만에 보는 우리 관계 신호등 & AI 속마음 번역기";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "HeartSync 커플·부부 관계 진단",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopiedLink(true);
      toast.success("파트너 초대 링크가 복사되었습니다! 카카오톡에 붙여넣어 보세요.");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.info(`링크 주소: ${shareUrl}`);
    }
  };

  const handleCopyScript = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/^"|"$/g, ""));
      setCopiedScript(true);
      toast.success("대화 스크립트가 복사되었습니다! 카톡이나 대화에 활용해 보세요.");
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      toast.info("복사에 실패했습니다.");
    }
  };

  const activePersona = PERSONA_CONTENT[persona];
  const activeCase = BEFORE_AFTER_CASES[activeCaseIdx];
  const miniResult = getMiniTestAnalysis();

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-white to-pink-50/40 pb-28">
      <Header />

      {/* ── SECTION 1: HERO & TARGET PERSONA TABS ── */}
      <section className="pt-20 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        {/* Persona Selector Tabs */}
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-pink-100 shadow-sm mb-6">
          {(Object.keys(PERSONA_CONTENT) as TargetPersonaKey[]).map((key) => {
            const isSelected = persona === key;
            return (
              <button
                key={key}
                onClick={() => setPersona(key)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-pink-50/60"
                }`}
              >
                {PERSONA_CONTENT[key].tabLabel}
              </button>
            );
          })}
        </div>

        {/* Live Participation Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100/80 text-rose-700 text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            {activePersona.badge}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            현재까지{" "}
            <strong className="font-black">
              {diagCount.toLocaleString()}명
            </strong>{" "}
            진단 완료
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
          {activePersona.headline}
          <br />
          <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
            {activePersona.highlight}
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-7 font-medium">
          {activePersona.subcopy}
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto mb-8">
          <button
            onClick={() => navigate("/diagnosis")}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-black text-base shadow-lg shadow-pink-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span>{activePersona.ctaText}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() =>
              miniTestRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-white text-pink-600 font-bold text-sm border-2 border-pink-200 hover:bg-pink-50 transition-all"
          >
            ⚡ 30초 미니 판독기 먼저 해보기
          </button>
        </div>

        {/* Trust Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto bg-white/90 rounded-2xl p-4 border border-pink-100 shadow-xs">
          <div>
            <p className="text-lg sm:text-2xl font-black text-pink-600">
              4.9 / 5.0
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              실제 이용자 만족도
            </p>
          </div>
          <div className="border-x border-gray-100">
            <p className="text-lg sm:text-2xl font-black text-gray-900">
              50문항 · 5대 영역
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              가트맨·애착이론 정밀 분석
            </p>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-black text-emerald-600">
              100% 비공개
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              개인 대화 원문 비수집 보장
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: INTERACTIVE PAIN POINT CHECKLIST ── */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-pink-100">
          <div className="text-center mb-6">
            <span className="text-xs font-extrabold text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
              공감 체크리스트
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">
              혹시 요즘 우리 모습도 이런가요?
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              해당하는 항목을 눌러보세요. 숨겨진 관계 역동을 즉시 알려드립니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {PAIN_POINTS.map((item) => {
              const isChecked = checkedPains.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => togglePainPoint(item.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                    isChecked
                      ? "border-pink-500 bg-pink-50/50 shadow-xs"
                      : "border-gray-100 bg-gray-50/50 hover:border-pink-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isChecked
                        ? "bg-pink-500 text-white"
                        : "bg-white border border-gray-300"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-xs sm:text-sm font-bold leading-snug ${
                        isChecked ? "text-gray-900" : "text-gray-600"
                      }`}
                    >
                      {item.text}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-pink-600 border border-pink-100">
                      🔍 {item.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Diagnosis Bridge Box */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-5 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-xs font-extrabold text-purple-700 mb-1">
                💡 현재 {checkedPains.length}개 항목이 체크되었습니다
              </p>
              <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
                {checkedPains.length >= 3
                  ? "체크하신 고민들은 단순한 성격 차이가 아니라 '불안-회피 애착 역동'과 가트맨의 '4가지 대화 독소'가 작동하고 있다는 신호입니다."
                  : "작은 서운함이 쌓여 대화 단절로 이어지기 전에 두 사람만의 소통 공식을 점검해 보세요."}
              </p>
            </div>
            <button
              onClick={() => navigate("/diagnosis")}
              className="w-full sm:w-auto flex-shrink-0 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>정밀 원인 분석하기</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: 30-SECOND MINI RELATIONSHIP TRAFFIC LIGHT (INTERACTIVE HOOK) ── */}
      <section
        ref={miniTestRef}
        className="py-10 px-4 sm:px-6 max-w-4xl mx-auto"
      >
        <div className="bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
            <div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">
                ⚡ 로그인 없이 30초 무료 체험
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-2">
                우리 커플 갈등 패턴 & 속마음 번역기
              </h2>
            </div>
            <span className="text-xs text-indigo-200">
              3가지만 선택하면 맞춤 대화 대본이 즉시 생성됩니다
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Step 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-xs font-bold text-pink-300 mb-2.5">
                1. 서운할 때 나의 반응은?
              </p>
              <div className="space-y-1.5">
                {[
                  "속으로 참다가 폭발",
                  "즉시 따지고 확인하려 함",
                  "돌려서 말하거나 삐짐",
                  "체념하고 입을 닫음",
                ].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setMyStyle(opt);
                      setShowMiniResult(true);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      myStyle === opt
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/15"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-xs font-bold text-pink-300 mb-2.5">
                2. 상대방의 주된 반응은?
              </p>
              <div className="space-y-1.5">
                {[
                  "회피·침묵·동문서답",
                  "방어·변명·논리 따지기",
                  "역공·화내기·비난",
                  "건성으로 사과하고 넘김",
                ].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setPartnerStyle(opt);
                      setShowMiniResult(true);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      partnerStyle === opt
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/15"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-xs font-bold text-pink-300 mb-2.5">
                3. 가장 해결하고 싶은 고민은?
              </p>
              <div className="space-y-1.5">
                {[
                  "대화가 통하지 않는 답답함",
                  "사소한 말투로 반복되는 싸움",
                  "연락·신뢰 문제로 인한 불안",
                  "이별 위기 또는 결혼 확신 부족",
                ].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setCoreWorry(opt);
                      setShowMiniResult(true);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      coreWorry === opt
                        ? "bg-pink-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/15"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!showMiniResult ? (
            <button
              onClick={() => setShowMiniResult(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-sm sm:text-base shadow-lg hover:opacity-95 transition-all"
            >
              🔍 선택 결과로 우리 관계 신호등 & 맞춤 대화법 보기
            </button>
          ) : (
            <div className="bg-white text-gray-900 rounded-2xl p-5 sm:p-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <span className="text-xs sm:text-sm font-black text-rose-600">
                  {miniResult.flagTitle}
                </span>
                <span className="text-[11px] font-semibold text-gray-400">
                  가트맨 & 성인 애착 역동 기반 티저 분석
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4">
                {miniResult.summary}
              </p>

              <div className="bg-pink-50/80 border border-pink-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-pink-700">
                    💬 오늘 저녁 바로 써먹는 '나-전달법' 추천 대본
                  </span>
                  <button
                    onClick={() =>
                      handleCopyScript(miniResult.recommendedScript)
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-800 bg-white px-2.5 py-1 rounded-lg border border-pink-200"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3 h-3" /> 복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> 대본 복사
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 italic">
                  {miniResult.recommendedScript}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => navigate("/diagnosis")}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  <span>50문항 전체 진단으로 5대 영역 점수 확인하기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/chatbot")}
                  className="py-3.5 px-5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs sm:text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI 코치와 바로 상담하기</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 4: AI COACH BEFORE & AFTER SHOWCASE ── */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            STEP 4~7 프롬프트 전면 고도화
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">
            "서로 이해하세요" 같은 뻔한 위로가 아닙니다
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            상황별 맞춤 대화 대본과 7일·30일 행동 루틴까지 구체적으로 코칭합니다
          </p>
        </div>

        {/* Topic Tabs */}
        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {BEFORE_AFTER_CASES.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActiveCaseIdx(idx)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeCaseIdx === idx
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-md">
          <div className="mb-4 pb-4 border-b border-gray-100 flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-extrabold">
              내담자 고민
            </span>
            <p className="text-sm sm:text-base font-bold text-gray-900">
              &ldquo;{activeCase.userQuestion}&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before: Generic Advice */}
            <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[11px] font-bold">
                  기존 일반 상담/조언
                </span>
                <span className="text-xs text-gray-400">추상적 · 실행 불가</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                &ldquo;{activeCase.beforeReply}&rdquo;
              </p>
              <div className="mt-4 pt-3 border-t border-gray-200/80 text-[11px] text-gray-400">
                ❌ 어떻게 말해야 할지 구체적인 대본이 없어 다시 똑같이 싸우게 됨
              </div>
            </div>

            {/* After: HeartSync AI Coach v2.0 */}
            <div className="rounded-2xl bg-gradient-to-br from-pink-50/70 via-white to-indigo-50/60 p-5 border-2 border-pink-300 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[11px] font-bold">
                  HeartSync AI 코치
                </span>
                <span className="text-[11px] font-bold text-indigo-600">
                  9대 코칭 원칙 적용
                </span>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <p className="text-gray-700 leading-relaxed">
                  <strong className="text-pink-600">① 감정 공감:</strong>{" "}
                  {activeCase.afterEmpathy}
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong className="text-indigo-600">② 사실·추측 구분:</strong>{" "}
                  {activeCase.afterAnalysis}
                </p>
                <div className="bg-white rounded-xl p-3 border border-pink-200">
                  <p className="text-[11px] font-extrabold text-pink-600 mb-1">
                    ③ 실제 대화 예시 (복사해서 바로 전송 가능)
                  </p>
                  <p className="text-xs font-bold text-gray-900">
                    {activeCase.afterScript}
                  </p>
                </div>
                <p className="text-emerald-700 font-semibold text-xs">
                  ✅ {activeCase.afterAction}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: OFFLINE COUNSELING VS HEARTSYNC COMPARISON TABLE ── */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md">
          <div className="text-center mb-6">
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              합리적 비용 · 완벽한 비밀 보장
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">
              오프라인 상담소 가기 전, 왜 HeartSync부터 시작할까요?
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3.5 px-3 text-xs sm:text-sm font-bold text-gray-500">
                    비교 항목
                  </th>
                  <th className="py-3.5 px-3 text-xs sm:text-sm font-bold text-gray-500 text-center">
                    오프라인 부부·커플 상담
                  </th>
                  <th className="py-3.5 px-4 text-xs sm:text-sm font-black text-pink-600 bg-pink-50/70 rounded-t-2xl text-center">
                    HeartSync AI 관계 진단·코칭
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                <tr>
                  <td className="py-3.5 px-3 font-bold text-gray-800">
                    비용 부담
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 text-center">
                    1회 150,000원 ~ 250,000원
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-pink-600 bg-pink-50/40 text-center">
                    기초 진단 0원 / 심층 19,900원~
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-gray-800">
                    이용 시간
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 text-center">
                    1~2주 전 예약 필수
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 bg-pink-50/40 text-center">
                    새벽 2시 다툰 직후에도 즉시 시작
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-gray-800">
                    파트너 참여
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 text-center">
                    상대가 방문 거부 시 진행 불가
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 bg-pink-50/40 text-center">
                    혼자서도 가능 & 카톡 링크로 간편 초대
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-gray-800">
                    대화 비밀 보장
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 text-center">
                    대면 노출 부담 존재
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700 bg-pink-50/40 text-center">
                    🔒 개인 대화 원문 비수집·비열람 보호
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-gray-800">
                    실천 관리
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 text-center">
                    50분 상담 종료 후 단절
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 bg-pink-50/40 rounded-b-2xl text-center">
                    7일 · 30일 맞춤 행동 루틴 밀착 관리
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: REAL USER REVIEWS (LIVE SYNCED) ── */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1 text-amber-400 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-4 h-4 fill-amber-400" />
            ))}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            실제 커플·부부들의 변화 이야기
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            막막했던 대화가 풀리고 서로를 이해하게 된 실제 후기입니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.slice(0, 6).map((rev, i) => (
            <div
              key={rev.id || i}
              className="bg-white rounded-2xl p-5 border border-pink-100 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: rev.rating || 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="w-3.5 h-3.5 text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  {rev.tags && rev.tags[0] && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">
                      {FEEDBACK_TAG_LABELS[rev.tags[0]] || rev.tags[0]}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3">
                  &ldquo;{rev.text}&rdquo;
                </p>
              </div>
              <p className="text-[11px] font-semibold text-gray-400">
                {rev.author}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 7: VIRAL SHARE CARD FOR PARTNER / SNS ── */}
      <section className="py-8 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-3xl p-6 sm:p-8 text-white text-center shadow-lg">
          <h2 className="text-xl sm:text-2xl font-black mb-2">
            &ldquo;자기야, 우리 이거 같이 해보자!&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-pink-100 max-w-xl mx-auto mb-6 leading-relaxed">
            무겁게 &lsquo;우리 문제 있어&rsquo;라고 말하는 대신, 가벼운 심리·소통 테스트 링크로 먼저 건네보세요. 두 사람의 결과를 나란히 비교할 수 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <button
              onClick={handleSharePromo}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-white text-pink-600 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:bg-pink-50 transition-all"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>초대 링크 복사 완료!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>카카오톡 · 파트너에게 초대 링크 공유하기</span>
                </>
              )}
            </button>
            <button
              onClick={() => navigate("/diagnosis")}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gray-900/90 hover:bg-gray-900 text-white font-bold text-xs sm:text-sm transition-all"
            >
              내가 먼저 3분 진단 시작하기
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── SECTION 8: STICKY CONVERSION BAR ── */}
      <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-100 px-4 py-3 shadow-[0_-4px_20px_rgba(244,63,94,0.08)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block">
            <p className="text-xs font-extrabold text-gray-900">
              🎁 지금 50문항 정밀 관계 건강도 진단 무료 제공
            </p>
            <p className="text-[11px] text-gray-500">
              🔒 개인 대화 원문은 수집·열람되지 않으며 100% 비밀이 보장됩니다
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSharePromo}
              className="px-3.5 py-3 rounded-xl border border-pink-200 text-pink-600 font-bold text-xs hover:bg-pink-50 transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>공유</span>
            </button>
            <button
              onClick={() => navigate("/diagnosis")}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>무료로 내 관계 진단 시작하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
