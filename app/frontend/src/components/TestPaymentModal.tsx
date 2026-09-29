import { useState } from "react";
import { X, CreditCard, Sparkles, Shield, CheckCircle2, Loader2, ArrowRight, Smartphone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { createClient } from "@metagptx/web-sdk";

const client = createClient();

interface TestPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  amount: number;
  diagnosisId?: string;
  onSuccess: (result: any) => void;
  onLaunchTossRealTest?: () => void;
}

export default function TestPaymentModal({
  isOpen,
  onClose,
  planId,
  planName,
  amount,
  diagnosisId,
  onSuccess,
  onLaunchTossRealTest,
}: TestPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "kakaopay" | "tosspay" | "naverpay">("card");
  const [selectedCardCompany, setSelectedCardCompany] = useState("현대카드");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const cardCompanies = ["현대카드", "신한카드", "KB국민카드", "삼성카드", "롯데카드", "카카오뱅크"];

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate real PG network latency for realism (1.2s)
      await new Promise((r) => setTimeout(r, 1200));

      const methodNameMap: Record<string, string> = {
        card: `가상 카드결제 (${selectedCardCompany})`,
        kakaopay: "카카오페이 (가상 결제)",
        tosspay: "토스페이 (가상 결제)",
        naverpay: "네이버페이 (가상 결제)",
      };

      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/simulate_payment",
        method: "POST",
        data: {
          plan_type: planId,
          diagnosis_id: diagnosisId || localStorage.getItem("heartsync_pending_diagnosis_id") || undefined,
          payment_method: methodNameMap[selectedMethod],
        },
      });

      if (res.data?.status === "paid") {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });

        toast.success("가상 결제가 성공적으로 승인되었습니다! (실제 과금 0원)");
        onSuccess(res.data);
      } else {
        toast.error("가상 결제 처리에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (e: any) {
      console.error(e);
      const detail = e?.data?.detail || e?.message || "가상 결제 중 오류가 발생했습니다.";
      toast.error(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden text-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm font-black">
              🧪
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  테스트 시뮬레이터
                </span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.5 rounded-full">
                  실제 과금 0원
                </span>
              </div>
              <h2 className="text-base font-extrabold tracking-tight mt-0.5">
                가상 결제 시뮬레이션
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Notice Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              토스페이먼츠 심사 기간 중 <strong>전체 기능(속마음 잠금 해제, PDF 다운로드 등)</strong>을 사전에 점검하고 피드백을 수집할 수 있도록 제공되는 안전한 테스트 모드입니다.
            </p>
          </div>

          {/* Selected Plan Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">선택 상품</p>
              <h3 className="text-sm font-extrabold text-gray-900 mt-0.5">{planName}</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 line-through mr-1.5">
                ₩{amount.toLocaleString()}
              </span>
              <span className="text-base font-black text-pink-600">
                ₩0 <span className="text-xs font-normal text-gray-500">(체험)</span>
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block">
              가상 결제 수단 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod("card")}
                className={`py-3 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  selectedMethod === "card"
                    ? "border-pink-500 bg-pink-50/60 text-pink-700 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <CreditCard className="w-4 h-4 text-pink-500" />
                <span>가상 신용카드</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("kakaopay")}
                className={`py-3 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  selectedMethod === "kakaopay"
                    ? "border-amber-400 bg-amber-50 text-amber-900 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-[#FEE500] text-[9px] font-black flex items-center justify-center text-amber-950">
                  K
                </span>
                <span>카카오페이</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("tosspay")}
                className={`py-3 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  selectedMethod === "tosspay"
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-[#0064FF] text-[9px] font-black flex items-center justify-center text-white">
                  T
                </span>
                <span>토스페이</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("naverpay")}
                className={`py-3 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  selectedMethod === "naverpay"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-[#03C75A] text-[9px] font-black flex items-center justify-center text-white">
                  N
                </span>
                <span>네이버페이</span>
              </button>
            </div>
          </div>

          {/* Virtual Card Preview for Card Mode */}
          {selectedMethod === "card" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                가상 카드사 선택
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {cardCompanies.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCardCompany(c)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all border ${
                      selectedCardCompany === c
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Realistic Virtual Card UI */}
              <div className="mt-3 relative rounded-2xl bg-gradient-to-tr from-gray-900 via-slate-800 to-gray-700 p-4 text-white shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold tracking-widest text-gray-300">
                    {selectedCardCompany}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider bg-white/10 px-2 py-0.5 rounded text-amber-300">
                    TEST VIRTUAL CARD
                  </span>
                </div>
                <div className="font-mono text-sm tracking-widest mb-3">
                  •••• •••• •••• 8821
                </div>
                <div className="flex justify-between items-end text-[10px] text-gray-400 font-mono">
                  <span>VALID THRU 12/29</span>
                  <span className="text-white font-sans font-bold">HEARTSYNC TESTER</span>
                </div>
              </div>
            </div>
          )}

          {/* Action CTA Button */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-sm shadow-lg shadow-pink-200 active:scale-98 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>가상 결제 승인 요청 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>1초만에 가상 결제 완료하기 (과금 0원)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {onLaunchTossRealTest && (
              <button
                type="button"
                onClick={onLaunchTossRealTest}
                disabled={isProcessing}
                className="w-full py-2.5 text-center text-xs text-gray-400 hover:text-gray-600 font-medium underline"
              >
                토스페이먼츠 공식 테스트 결제창 띄우기 →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
