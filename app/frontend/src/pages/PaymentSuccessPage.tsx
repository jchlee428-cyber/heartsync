import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import { CheckCircle, XCircle, Loader2, ArrowRight, Home, Sparkles, Gift, Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

const client = createClient();

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Toss Payments params
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const giftTicketId = searchParams.get("gift_ticket_id");

  // Stripe params
  const sessionId = searchParams.get("session_id");
  const provider = searchParams.get("provider");

  const isStripe = provider === "stripe" || (sessionId && !paymentKey);

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [planType, setPlanType] = useState<string>("");
  const [dbOrderId, setDbOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [giftData, setGiftData] = useState<any>(null);
  const [copiedGiftLink, setCopiedGiftLink] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const planNames: Record<string, string> = {
    single_analysis: "1회 정밀 분석",
    monthly_subscription: "월 구독",
    couple_premium: "커플 프리미엄 패키지",
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    if (giftTicketId) {
      const stored = localStorage.getItem(`heartsync_gift_${giftTicketId}`) || localStorage.getItem("heartsync_latest_gift");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setGiftData(parsed);
          localStorage.setItem(`heartsync_gift_ticket_${giftTicketId}`, stored);
        } catch (e) {
          console.error("Failed to parse gift data", e);
        }
      }
    }

    if (isStripe && sessionId) {
      confirmStripePayment();
    } else if (paymentKey && orderId && amount) {
      confirmTossPayment();
    } else if (giftTicketId) {
      // Mock / Direct return from test gift payment
      setStatus("success");
      setPlanType("monthly_subscription");
      setPaidAmount(amount ? `₩${Number(amount).toLocaleString()}` : "₩29,000");
    } else {
      setErrorMessage("결제 정보가 올바르지 않습니다. 다시 시도해주세요.");
      setStatus("failed");
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const confirmTossPayment = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/confirm_payment",
        method: "POST",
        data: {
          payment_key: paymentKey,
          order_id: orderId,
          amount: Number(amount),
        },
      });

      if (res.data?.status === "paid") {
        setStatus("success");
        setPlanType(res.data.plan_type || "");
        setDbOrderId(res.data.db_order_id || null);
        setPaymentMethod(res.data.payment_method || "");
        setReceiptUrl(res.data.receipt_url || null);
        setPaidAmount(amount ? `₩${Number(amount).toLocaleString()}` : "");

        if (giftTicketId) {
          // Gift ticket purchase completed - user will view/share their gift ticket!
        } else {
          const diagId = res.data.diagnosis_id || localStorage.getItem("heartsync_pending_diagnosis_id");
          if (diagId) {
            setDiagnosisId(diagId);
            startCountdown(diagId);
          } else {
            tryFetchLatestDiagnosis();
          }
        }
      } else {
        setErrorMessage("결제 승인에 실패했습니다. 다시 시도해주세요.");
        setStatus("failed");
      }
    } catch (e: any) {
      const detail = e?.data?.detail || e?.message || "결제 확인 중 오류가 발생했습니다";
      setErrorMessage(detail);
      setStatus("failed");
    }
  };

  const confirmStripePayment = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/stripe/verify_payment",
        method: "POST",
        data: {
          session_id: sessionId,
        },
      });

      if (res.data?.status === "paid") {
        setStatus("success");
        setPlanType(res.data.plan_type || "");
        setDbOrderId(res.data.db_order_id || null);
        setPaymentMethod("Stripe");
        setPaidAmount("");

        const diagId = localStorage.getItem("heartsync_pending_diagnosis_id");
        if (diagId) {
          setDiagnosisId(diagId);
          startCountdown(diagId);
        } else {
          tryFetchLatestDiagnosis();
        }
      } else {
        setErrorMessage("Stripe 결제 확인에 실패했습니다. 다시 시도해주세요.");
        setStatus("failed");
      }
    } catch (e: any) {
      const detail = e?.data?.detail || e?.message || "Stripe 결제 확인 중 오류가 발생했습니다";
      setErrorMessage(detail);
      setStatus("failed");
    }
  };

  const tryFetchLatestDiagnosis = async () => {
    try {
      const diagRes = await client.entities.diagnoses.query({
        query: {},
        sort: "-created_at",
        limit: 1,
      });
      const items = diagRes?.data?.items || [];
      const latestDiag = items[0];
      if (latestDiag?.id) {
        setDiagnosisId(latestDiag.id);
        startCountdown(latestDiag.id);
      }
    } catch {
      // Non-critical
    }
  };

  const startCountdown = (diagId: string) => {
    let count = 5;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        navigate(`/result/${diagId}`);
      }
    }, 1000);
  };

  const handleGoToResult = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (diagnosisId) {
      localStorage.removeItem("heartsync_pending_diagnosis_id");
      navigate(`/result/${diagnosisId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />

      <div className="max-w-lg mx-auto px-5 pt-16 pb-28 text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-pink-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">결제 승인 중...</h2>
            <p className="text-sm text-gray-500">
              {isStripe ? "Stripe에서 결제를 확인하고 있습니다" : "토스페이먼츠에서 결제를 확인하고 있습니다"}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                결제가 완료되었습니다! 🎉
              </h2>
              <p className="text-sm text-gray-500">
                {planNames[planType] || planType} 플랜이 활성화되었습니다
              </p>
            </div>

            {/* Order Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {dbOrderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">주문번호</span>
                  <span className="font-bold text-gray-800">#{dbOrderId}</span>
                </div>
              )}
              {paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">결제수단</span>
                  <span className="font-bold text-gray-800">{paymentMethod}</span>
                </div>
              )}
              {paidAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">결제금액</span>
                  <span className="font-bold text-gray-800">{paidAmount}</span>
                </div>
              )}
              {receiptUrl && (
                <div className="pt-2 border-t border-gray-200">
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 underline"
                  >
                    영수증 확인하기 →
                  </a>
                </div>
              )}
            </div>

            {/* ── Gift Delivery Card ── */}
            {giftTicketId && (
              <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 rounded-3xl p-6 border-2 border-pink-200 text-left space-y-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Gift className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-pink-600 tracking-wider">
                      HEARTSYNC VIP GIFT
                    </span>
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                      {giftData?.recipientName || "연인"}님을 위한 모바일 러브레터 티켓 발급 완료!
                    </h3>
                  </div>
                </div>

                {giftData?.loveLetter && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-pink-100 font-serif italic text-xs text-gray-700 leading-relaxed shadow-xs">
                    "{giftData.loveLetter}"
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => navigate(`/gift/${giftTicketId}`)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 group"
                  >
                    <Gift className="w-4 h-4" />
                    <span>발급된 모바일 선물 티켓 열기</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={async () => {
                      const giftUrl = `${window.location.origin}/gift/${giftTicketId}`;
                      try {
                        await navigator.clipboard.writeText(giftUrl);
                        setCopiedGiftLink(true);
                        toast.success("선물 티켓 링크가 복사되었습니다!");
                        setTimeout(() => setCopiedGiftLink(false), 2500);
                      } catch {
                        toast.error("링크 복사에 실패했습니다.");
                      }
                    }}
                    className="w-full py-3 rounded-2xl bg-white border border-pink-200 hover:bg-pink-50 text-pink-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    {copiedGiftLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedGiftLink ? "선물 링크 복사됨!" : "선물 티켓 URL 복사하기"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Auto-redirect notice when diagnosis ID exists */}
            {!giftTicketId && diagnosisId && (
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border border-pink-100">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
                  <p className="text-sm font-bold text-gray-800">
                    AI 상세 분석 리포트를 준비하고 있습니다
                  </p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  <span className="font-bold text-pink-600">{countdown}초</span> 후 자동으로 결과 페이지로 이동합니다
                </p>
                <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                  />
                </div>
                <button
                  onClick={handleGoToResult}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  지금 바로 상세 리포트 확인하기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Fallback buttons when no diagnosis ID */}
            {!diagnosisId && (
              <div className="space-y-3 pt-4">
                <button
                  onClick={() => navigate("/diagnosis")}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all"
                >
                  지금 진단 시작하기
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  홈으로 돌아가기
                </button>
              </div>
            )}
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                결제 확인에 실패했습니다
              </h2>
              <p className="text-sm text-gray-500">
                {errorMessage || "결제가 정상적으로 처리되지 않았습니다. 다시 시도해주세요."}
              </p>
            </div>
            <div className="space-y-3 pt-4">
              <button
                onClick={() => navigate("/pricing")}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all"
              >
                다시 시도하기
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer for Legal & Business Compliance */}
      <Footer className="pb-28 mt-4" />
      <BottomNav />
    </div>
  );
}