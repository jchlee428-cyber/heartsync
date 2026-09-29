import { useState, useEffect } from "react";
import { createClient } from "@metagptx/web-sdk";
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  ArrowLeft,
  Shield,
  Star,
  AlertCircle,
  Globe,
  CreditCard,
  Lock,
  RotateCcw,
  Headphones,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import LoginModal from "@/components/LoginModal";
import GiftModal from "@/components/GiftModal";
import Footer from "@/components/Footer";
import TestPaymentModal from "@/components/TestPaymentModal";

const client = createClient();

interface Plan {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  priceNum: number;
  originalPrice?: string;
  discountBadge?: string;
  priceUsd: string;
  priceUsdNum: number;
  period: string;
  description: string;
  targetAudience: string;
  features: string[];
  icon: React.ElementType;
  gradient: string;
  btnGradient: string;
  popular?: boolean;
  badge?: string;
  comingSoon?: boolean;
}

const plans: Plan[] = [
  {
    id: "single_analysis",
    name: "개인 정밀 분석 (1회권)",
    subtitle: "Personal Insight Pass",
    price: "19,900",
    priceNum: 19900,
    originalPrice: "29,000",
    discountBadge: "31% 할인",
    priceUsd: "14.99",
    priceUsdNum: 1499,
    period: "1회 소장",
    description: "나 혼자 먼저 관계 상태를 객관적으로 점검해보고 싶을 때",
    targetAudience: "연인과의 갈등 원인이나 내 마음·애착 유형을 먼저 정밀 진단하고 싶은 분",
    features: [
      "AI 기반 50문항 전 영역 심층 진단 1회",
      "5대 핵심 영역(갈등·친밀·신뢰·가치관·성적) 정밀 분석 리포트",
      "존 가트맨 심리학 이론 기반 맞춤 솔루션 제안",
      "AI 심리 코칭 챗봇 1:1 상담 (30분)",
      "영구 소장용 고화질 분석 진단서 PDF 다운로드",
    ],
    icon: Zap,
    gradient: "from-blue-500 to-cyan-500",
    btnGradient: "from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
  },
  {
    id: "monthly_subscription",
    name: "커플 듀얼 매칭 패키지",
    subtitle: "Couple Matching Pass (2인)",
    price: "29,000",
    priceNum: 29000,
    originalPrice: "39,800",
    discountBadge: "27% 특별 할인",
    priceUsd: "21.99",
    priceUsdNum: 2199,
    period: "2인 패키지",
    description: "서로의 속마음과 차이점을 완벽하게 이해하고 맞출 때",
    targetAudience: "자주 부딪히거나, 서로의 서운함과 기대치를 객관적으로 맞추고 싶은 모든 커플",
    popular: true,
    badge: "🔥 91% 커플 선택 · 인기 1위",
    features: [
      "두 사람 모두 각자 50문항 정밀 진단 (2인 이용권 포함)",
      "AI 커플 상호 비교 분석 리포트 (시선 차이 매칭)",
      "서로의 서운함을 푸는 1:1 맞춤 대화법 가이드북",
      "AI 심리 코치 챗봇 1개월 무제한 상담",
      "평생 보관용 커플 종합 진단서 PDF 2부 제공",
      "연애/부부 관계 개선 맞춤 액션 플랜 제공",
    ],
    icon: Sparkles,
    gradient: "from-pink-500 via-rose-500 to-red-500",
    btnGradient: "from-pink-600 via-rose-600 to-red-600 hover:from-pink-700 hover:via-rose-700 hover:to-red-700 shadow-pink-200",
  },
  {
    id: "couple_premium",
    name: "30일 관계 개선 올케어 패스",
    subtitle: "30-Day Intensive All-Care",
    price: "49,000",
    priceNum: 49000,
    originalPrice: "79,000",
    discountBadge: "38% 할인",
    priceUsd: "36.99",
    priceUsdNum: 3699,
    period: "30일 무제한",
    description: "싸움이 잦거나 이별 위기 극복, 결혼 전 확실한 조율이 필요할 때",
    targetAudience: "근본적인 소통 체질을 개선하고 확실한 관계 회복 루틴을 만들고 싶은 분",
    badge: "👑 프리미엄 올케어",
    features: [
      "30일간 언제든 재진단 무제한 (관계 변화 추적 그래프)",
      "두 사람의 변화 비교 리포트 무제한 업데이트",
      "주차별 맞춤 커플 미션 & 소통 루틴 가이드",
      "AI 전문 상담 챗봇 30일 무제한 우선 지원",
      "진단서 및 단계별 변화 리포트 무제한 PDF 소장",
      "갈등 위기 상황 즉시대처용 AI 솔루션 치트키",
    ],
    icon: Crown,
    gradient: "from-purple-600 via-pink-600 to-amber-500",
    btnGradient: "from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 shadow-purple-200",
  },
];
const PLANS = plans;

type PaymentProvider = "toss" | "stripe";

export default function PricingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [isTestMode, setIsTestMode] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("toss");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftInitialPlan, setGiftInitialPlan] = useState<string>("monthly_subscription");
  const [activeTab, setActiveTab] = useState<"self" | "gift">("self");
  const [testModalPlan, setTestModalPlan] = useState<Plan | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [enableVirtualTest, setEnableVirtualTest] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    checkAuth();
    checkTossStatus();
    checkStripeStatus();
  }, []);

  const getEffectiveUser = () => {
    if (user) return user;
    try {
      const isLoggedOut = localStorage.getItem("isLougOutManual") === "true";
      const token = localStorage.getItem("token");
      if (!token || isLoggedOut) return null;

      const cached = localStorage.getItem("user");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      return { name: "회원", role: "user" };
    } catch {
      return null;
    }
  };

  const checkAuth = async () => {
    try {
      const isLoggedOut = localStorage.getItem("isLougOutManual") === "true";
      const token = localStorage.getItem("token");
      if (!token || isLoggedOut) {
        setUser(null);
        return;
      }

      // Immediately restore cached user to avoid any UI flash or delay
      const cached = localStorage.getItem("user");
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          setUser({ name: "회원", role: "user" });
        }
      } else {
        setUser({ name: "회원", role: "user" });
      }

      try {
        const res = await client.auth.me();
        if (res?.data) {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch {
        // Backend cold-starting or offline; keep cached session
      }

      fetchCurrentPlan();
    } catch (e) {
      console.warn("Auth initialization warning:", e);
    }
  };

  const checkTossStatus = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/toss-status",
        method: "GET",
        data: {},
      });
      setIsTestMode(!res.data?.key_configured);
    } catch {
      setIsTestMode(true);
    }
  };

  const checkStripeStatus = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/stripe/status",
        method: "GET",
        data: {},
      });
      setStripeConfigured(res.data?.configured || false);
    } catch {
      setStripeConfigured(false);
    }
  };

  const fetchCurrentPlan = async () => {
    // Check local storage active plan first
    try {
      const localPlanStr = localStorage.getItem("heartsync_active_plan");
      if (localPlanStr) {
        const parsed = JSON.parse(localPlanStr);
        if (parsed.plan_type && parsed.is_active) {
          setCurrentPlan(parsed.plan_type);
        }
      }
    } catch {}

    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/my-plan",
        method: "GET",
        data: {},
      });
      if (res.data?.plan_type) {
        setCurrentPlan(res.data.plan_type);
      }
    } catch {
      // Default to free or existing local plan
    }
  };

  const handlePurchaseToss = async (planId: string) => {
    const activeUser = getEffectiveUser();
    if (!activeUser) {
      toast.info("로그인이 필요합니다");
      setIsLoginModalOpen(true);
      return;
    }

    setLoading(planId);
    try {
      const diagnosisId = localStorage.getItem("heartsync_pending_diagnosis_id") || undefined;
      if (diagnosisId) {
        localStorage.setItem("heartsync_pending_diagnosis_id", diagnosisId);
      }

      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/prepare_order",
        method: "POST",
        data: { plan_type: planId, diagnosis_id: diagnosisId },
      });

      const { order_id, order_name, amount, client_key } = res.data;

      const tossPayments = await loadTossPayments(client_key);
      const currentHost = window.location.origin;

      await (tossPayments as any).requestPayment("CARD", {
        amount: {
          currency: "KRW",
          value: amount,
        },
        orderId: order_id,
        orderName: order_name,
        successUrl: `${currentHost}/payment-success`,
        failUrl: `${currentHost}/pricing?payment=failed`,
        card: {
          flowMode: "DEFAULT",
        },
      });
    } catch (e: any) {
      if (e?.code === "USER_CANCEL" || e?.code === "PAY_PROCESS_CANCELED" || e?.message?.includes("취소")) {
        toast.info("결제가 취소되었습니다");
      } else if (e?.code === "INVALID_CARD_COMPANY") {
        toast.error("지원하지 않는 카드입니다. 다른 카드를 사용해주세요.");
      } else {
        const detail = e?.data?.detail || e?.message || "";
        console.error("Payment error:", e);
        toast.error(detail || "결제 처리 중 오류가 발생했습니다");
      }
    } finally {
      setLoading(null);
    }
  };

  const handlePurchaseStripe = async (planId: string) => {
    const activeUser = getEffectiveUser();
    if (!activeUser) {
      toast.info("로그인이 필요합니다");
      setIsLoginModalOpen(true);
      return;
    }

    if (!stripeConfigured) {
      toast.error("Stripe 결제가 아직 설정되지 않았습니다");
      return;
    }

    setLoading(planId);
    try {
      const mode = planId === "couple_premium" ? "payment" : "payment";

      const res = await client.apiCall.invoke({
        url: "/api/v1/stripe/create_payment_session",
        method: "POST",
        data: {
          plan_type: planId,
          currency: "usd",
          mode: mode,
        },
      });

      const { url } = res.data;
      if (url) {
        client.utils.openUrl(url);
      } else {
        toast.error("결제 페이지를 열 수 없습니다");
      }
    } catch (e: any) {
      const detail = e?.data?.detail || e?.message || "";
      console.error("Stripe payment error:", e);
      toast.error(detail || "Stripe 결제 처리 중 오류가 발생했습니다");
    } finally {
      setLoading(null);
    }
  };

  const handlePurchase = async (planId: string) => {
    const activeUser = getEffectiveUser();
    if (!activeUser) {
      toast.info("로그인이 필요합니다");
      setIsLoginModalOpen(true);
      return;
    }

    const selectedPlan = plans.find((p) => p.id === planId);
    if (enableVirtualTest && selectedPlan) {
      setTestModalPlan(selectedPlan);
      setIsTestModalOpen(true);
      return;
    }

    if (paymentProvider === "stripe") {
      await handlePurchaseStripe(planId);
    } else {
      await handlePurchaseToss(planId);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "failed") {
      const code = params.get("code") || "";
      const message = params.get("message") || "결제에 실패했습니다";
      if (code === "PAY_PROCESS_CANCELED") {
        toast.info("결제가 취소되었습니다");
      } else {
        toast.error(message);
      }
      window.history.replaceState({}, "", "/pricing");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/40 to-white">
      <Header />

      <div className="max-w-xl mx-auto px-5 pt-6 pb-28">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-500 text-sm font-medium mb-5 px-3 py-2 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          이전 페이지로 돌아가기
        </button>

        {/* Test Mode Banner */}
        {isTestMode && paymentProvider === "toss" && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-0.5">🧪 테스트 결제 모드 동작 중</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  현재 개발 테스트 모드입니다. 결제창이 열려도 실제 요금이 청구되지 않는 안전 모드입니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Payment Status Banner */}
        {currentPlan && currentPlan !== "free" && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                ✅
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    현재 결제 상태: 결제 완료
                  </span>
                </div>
                <p className="text-sm font-bold text-emerald-950 mt-0.5">
                  {(plans.find((p) => p.id === currentPlan) || plans[1])?.name || currentPlan} 플랜 정상 이용 중
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/mypage")}
              className="text-xs text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 font-bold px-3 py-1.5 rounded-xl shadow-2xs"
            >
              내 플랜 보기
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-pink-100/70 text-pink-700 text-xs font-bold rounded-full mb-3 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-pink-600" />
            1초 간편결제 · 100% 안전 보장
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            나와 연인을 위한 맞춤 플랜
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            15년 임상 심리학 연구 및 AI 관계 코칭을 통해<br />
            서로의 속마음과 관계의 해답을 명쾌하게 찾아보세요.
          </p>
        </div>

        {/* ── 탭 전환: 내 진단 결제하기 vs 연인에게 선물하기 ── */}
        <div className="flex rounded-2xl bg-pink-100/70 p-1.5 mb-6 border border-pink-200/80 shadow-xs">
          <button
            onClick={() => setActiveTab("self")}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "self"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Zap className="w-4 h-4 text-pink-500" />
            <span>내 진단 결제하기</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("gift");
              setIsGiftModalOpen(true);
            }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "gift"
                ? "bg-white text-pink-600 shadow-sm"
                : "text-pink-600 hover:text-pink-700"
            }`}
          >
            <Gift className="w-4 h-4 text-pink-500 animate-bounce" />
            <span>🎁 연인에게 선물하기 (100일/1주년)</span>
          </button>
        </div>

        {/* ── Test Mode Interactive Control Banner ── */}
        <div className="bg-gradient-to-r from-amber-50 via-pink-50 to-purple-50 rounded-2xl p-4 border border-amber-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                🧪
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900">
                    사전 점검 및 피드백용 테스트 결제 모드
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-full">
                    토스 심사 중 활성화
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  실제 카드 청구 없이 <strong>1초 가상 결제</strong>로 리포트 전체 열람 및 <strong>PDF 다운로드</strong>를 즉시 시뮬레이션할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  const nextState = !enableVirtualTest;
                  setEnableVirtualTest(nextState);
                  toast.info(nextState ? "가상 결제 모드가 켜졌습니다 (과금 0원)" : "토스 결제창 모드가 켜졌습니다");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  enableVirtualTest
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span>{enableVirtualTest ? "✓ 1초 가상결제 ON" : "가상결제 OFF"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2번 개선: 국내 2040 최선호 간편결제 공식 뱃지 배너 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100/80 mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-pink-500" />
              대한민국 2040 선호 1위 간편결제 지원
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              1초 터치 결제
            </span>
          </div>

          {/* 간편결제 브랜드 로고 뱃지 그리드 */}
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {/* 카카오페이 */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FEE500]/15 border border-[#FEE500]/40 transition-all hover:scale-105">
              <span className="text-[11px] font-black text-[#381E1F]">카카오페이</span>
              <span className="text-[9px] text-gray-500 font-medium mt-0.5">KakaoPay</span>
            </div>
            {/* 네이버페이 */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#03C75A]/10 border border-[#03C75A]/30 transition-all hover:scale-105">
              <span className="text-[11px] font-black text-[#03C75A]">네이버페이</span>
              <span className="text-[9px] text-gray-500 font-medium mt-0.5">NaverPay</span>
            </div>
            {/* 토스페이 */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0064FF]/10 border border-[#0064FF]/30 transition-all hover:scale-105">
              <span className="text-[11px] font-black text-[#0064FF]">토스페이</span>
              <span className="text-[9px] text-gray-500 font-medium mt-0.5">TossPay</span>
            </div>
            {/* 애플페이 */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-200 transition-all hover:scale-105">
              <span className="text-[11px] font-bold text-gray-900">Apple Pay</span>
              <span className="text-[9px] text-gray-500 font-medium mt-0.5">애플페이</span>
            </div>
            {/* 신용/체크카드 */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-200 transition-all hover:scale-105">
              <span className="text-[11px] font-bold text-gray-700">모든 카드</span>
              <span className="text-[9px] text-gray-500 font-medium mt-0.5">앱카드지원</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            * 토스페이먼츠 보안 결제창을 통해 카드번호 입력 없이 앱에서 원클릭으로 결제됩니다.
          </p>
        </div>

        {/* ── 4번 개선: 요금제 (플랜 1, 2, 3) 리뉴얼 ── */}
        <div className="space-y-5">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const showUsd = paymentProvider === "stripe";

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl p-6 shadow-md border-2 transition-all duration-300 ${
                  plan.popular
                    ? "border-pink-400 shadow-xl shadow-pink-100 ring-2 ring-pink-400/20"
                    : "border-gray-100 hover:border-pink-200 hover:shadow-lg"
                }`}
              >
                {/* 인기 뱃지 / 프리미엄 뱃지 */}
                {plan.badge && (
                  <div className="absolute -top-3.5 right-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-extrabold rounded-full shadow-sm ${
                        plan.popular
                          ? "bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      }`}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      {plan.discountBadge && !showUsd && (
                        <span className="text-[11px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                          {plan.discountBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                  </div>
                </div>

                {/* Target Audience Callout */}
                <div className="mb-4 bg-gray-50/80 rounded-xl px-3.5 py-2 border border-gray-100">
                  <p className="text-[11px] text-gray-600 leading-snug">
                    <strong className="text-pink-600 font-semibold">추천 대상:</strong> {plan.targetAudience}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <div className="flex items-baseline gap-2">
                    {showUsd ? (
                      <>
                        <span className="text-3xl font-black text-gray-900">
                          ${plan.priceUsd}
                        </span>
                        <span className="text-sm font-medium text-gray-400">USD / {plan.period}</span>
                      </>
                    ) : (
                      <>
                        {plan.originalPrice && (
                          <span className="text-sm font-semibold text-gray-400 line-through">
                            ₩{plan.originalPrice}
                          </span>
                        )}
                        <span className="text-3xl font-black text-gray-900 tracking-tight">
                          ₩{plan.price}
                        </span>
                        <span className="text-sm font-semibold text-gray-400">
                          / {plan.period}
                        </span>
                      </>
                    )}
                  </div>
                  {showUsd && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      (원화 환산 약 ₩{plan.price} KRW)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-0.5 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 leading-tight">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    현재 이용 중인 플랜
                  </button>
                ) : (
                  <div>
                    <button
                      onClick={() => handlePurchase(plan.id)}
                      disabled={loading === plan.id || (paymentProvider === "stripe" && !stripeConfigured)}
                      className={`w-full py-3.5 rounded-2xl text-[15px] font-extrabold text-white transition-all duration-300 bg-gradient-to-r ${plan.btnGradient} shadow-md active:scale-98 flex items-center justify-center gap-2 ${
                        loading === plan.id || (paymentProvider === "stripe" && !stripeConfigured)
                          ? "opacity-60 cursor-wait"
                          : "hover:shadow-lg hover:scale-[1.01]"
                      }`}
                    >
                      {loading === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          결제창 호출 중...
                        </span>
                      ) : paymentProvider === "stripe" && !stripeConfigured ? (
                        "Stripe 설정 필요"
                      ) : (
                        <>
                          <span>⚡ {plan.popular ? "1초 간편결제로 시작하기 (인기 1위)" : "1초 간편결제로 시작하기"}</span>
                        </>
                      )}
                    </button>

                    {/* ── 3번 개선: 버튼 직하단 환불 보증 안내 ── */}
                    <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-gray-500">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI 리포트 생성 전 7일 이내 100% 전액 환불 보장</span>
                    </div>

                    {/* ── 선물하기 버튼 (100일/1주년/기념일 선물) ── */}
                    <button
                      type="button"
                      onClick={() => {
                        setGiftInitialPlan(plan.id);
                        setIsGiftModalOpen(true);
                      }}
                      className="w-full mt-3 py-3 rounded-2xl border-2 border-pink-200 bg-pink-50/60 hover:bg-pink-100/80 text-pink-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-xs"
                    >
                      <Gift className="w-4 h-4 text-pink-500" />
                      <span>연인에게 이 플랜 선물하기 (모바일 러브레터 티켓 발송)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 1번 개선: 해외 결제(Stripe) 옵션 접이식 토글 ── */}
        <div className="mt-8 bg-white rounded-2xl p-4 border border-gray-200/70 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>해외 카드(Visa/Mastercard) 또는 Apple Pay 결제가 필요하신가요?</span>
            </div>
            <button
              onClick={() => setPaymentProvider((prev) => (prev === "stripe" ? "toss" : "stripe"))}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                paymentProvider === "stripe"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {paymentProvider === "stripe" ? "국내 결제로 복귀" : "해외 결제(USD) 전환"}
            </button>
          </div>
          {paymentProvider === "stripe" && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-purple-700">
              🌍 해외 결제 모드가 켜졌습니다. 요금이 USD($)로 표시되며 Stripe 글로벌 체크아웃 페이지로 연결됩니다.
              {!stripeConfigured && (
                <p className="text-amber-600 mt-1">⚠️ 현재 Stripe API 설정이 완료되지 않았습니다.</p>
              )}
            </div>
          )}
        </div>

        {/* ── 3번 개선: 전자상거래법 준수 청약철회 및 환불 규정 상세 고지 ── */}
        <div className="mt-6 bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left">
          <button
            onClick={() => setShowRefundPolicy(!showRefundPolicy)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-gray-500" />
              전자상거래 소비자보호법에 따른 환불 및 청약철회 안내
            </span>
            {showRefundPolicy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRefundPolicy && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-[11px] text-gray-600 leading-relaxed">
              <p>
                <strong>1. 서비스 개시 전 (리포트 미생성 상태):</strong> 결제일로부터 7일 이내에 진단 리포트를 생성하지 않은 경우, 마이페이지 또는 고객센터를 통해 신청 시 100% 전액 환불됩니다.
              </p>
              <p>
                <strong>2. 서비스 개시 후 (AI 분석 리포트 생성 및 열람 완료):</strong> 전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항(디지털 콘텐츠의 제공이 개시된 경우)에 따라, 맞춤 AI 심리 분석 리포트가 생성된 이후에는 서비스의 즉각적 소비 특성상 단순 변심에 의한 청약철회가 제한됩니다.
              </p>
              <p>
                <strong>3. 시스템 오류 및 결제 분쟁:</strong> 결제 후 시스템 오류로 인해 리포트가 정상 생성되지 않은 경우 무조건 전액 환불 또는 이용권이 즉시 재지급됩니다.
              </p>
              <p className="text-gray-500 pt-1">
                * 고객센터 문의: support@heartsync.co.kr | 토스페이먼츠(PG) 에스크로 안전 거래 보장
              </p>
            </div>
          )}
        </div>

        {/* Trust Badges Footer */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              256-bit SSL 암호화 결제
            </span>
            <span>|</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              토스페이먼츠 공식 안전 PG
            </span>
            <span>|</span>
            <span>결제 즉시 분석 시작</span>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(loggedInUser) => {
          setIsLoginModalOpen(false);
          if (loggedInUser) {
            setUser(loggedInUser);
          }
          checkAuth();
        }}
      />

      {/* Gift Modal (100일/1주년/기념일 선물) */}
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => {
          setIsGiftModalOpen(false);
          setActiveTab("self");
        }}
        initialPlanId={giftInitialPlan}
      />

      {/* Test Payment Modal */}
      {testModalPlan && (
        <TestPaymentModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          planId={testModalPlan.id}
          planName={testModalPlan.name}
          amount={testModalPlan.priceNum}
          diagnosisId={localStorage.getItem("heartsync_pending_diagnosis_id") || undefined}
          onSuccess={(result) => {
            setIsTestModalOpen(false);
            const diagId = result.diagnosis_id || localStorage.getItem("heartsync_pending_diagnosis_id");
            navigate(
              `/payment-success?paymentKey=${result.toss_payment_key || "sim_test"}&orderId=${result.db_order_id || "TEST-SIM"}&amount=0&simulated=true&plan_type=${testModalPlan.id}${diagId ? `&diagnosis_id=${diagId}` : ""}`
            );
          }}
          onLaunchTossRealTest={() => {
            setIsTestModalOpen(false);
            handlePurchaseToss(testModalPlan.id);
          }}
        />
      )}

      {/* PG 심사 승인 요건 준수 Footer */}
      <Footer className="pb-28 mt-8" />

      <BottomNav />
    </div>
  );
}