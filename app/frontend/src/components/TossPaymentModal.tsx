import { useEffect, useRef, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { X, ShieldCheck, Lock, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface TossPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderName: string;
  amount: number;
  clientKey: string;
  customerKey: string;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
}

export default function TossPaymentModal({
  isOpen,
  onClose,
  orderId,
  orderName,
  amount,
  clientKey,
  customerKey,
  customerName = "고객",
  customerEmail = "customer@heartsync.kr",
  successUrl,
  failUrl,
}: TossPaymentModalProps) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const widgetsRef = useRef<any>(null);
  const paymentMethodWidgetRef = useRef<any>(null);
  const agreementWidgetRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setReady(false);
      setSubmitting(false);
      return;
    }

    let cancelled = false;

    async function initTossWidgets() {
      try {
        setReady(false);
        const effectiveKey =
          clientKey && (clientKey.startsWith("test_gck_") || clientKey.startsWith("live_gck_"))
            ? clientKey
            : "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

        const tossPayments = await loadTossPayments(effectiveKey);
        if (cancelled) return;

        const widgets = tossPayments.widgets({
          customerKey: customerKey || `cust_${Date.now()}`,
        });
        widgetsRef.current = widgets;

        await widgets.setAmount({
          currency: "KRW",
          value: Number(amount),
        });

        const [pmWidget, agrWidget] = await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#toss-widget-payment-method",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#toss-widget-agreement",
            variantKey: "AGREEMENT",
          }),
        ]);

        paymentMethodWidgetRef.current = pmWidget;
        agreementWidgetRef.current = agrWidget;

        if (!cancelled) {
          setReady(true);
        }
      } catch (err: any) {
        console.error("Failed to initialize Toss Payment Widget:", err);
        if (!cancelled) {
          toast.error("결제창을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
      }
    }

    // Ensure Radix Dialog body pointer-events lock is cleared so Toss iframe receives clicks
    document.body.style.pointerEvents = "auto";
    const pointerTimer = setTimeout(() => {
      document.body.style.pointerEvents = "auto";
    }, 250);

    // Small delay to ensure DOM containers are mounted
    const timer = setTimeout(() => {
      initTossWidgets();
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(pointerTimer);
      try {
        paymentMethodWidgetRef.current?.destroy?.();
        agreementWidgetRef.current?.destroy?.();
      } catch {}
    };
  }, [isOpen, orderId, amount, clientKey, customerKey]);

  if (!isOpen) return null;

  const handleRequestPayment = async () => {
    if (!widgetsRef.current || !ready) return;
    setSubmitting(true);
    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerEmail,
        customerName,
      });
    } catch (e: any) {
      if (
        e?.code === "USER_CANCEL" ||
        e?.code === "PAY_PROCESS_CANCELED" ||
        e?.message?.includes("취소")
      ) {
        toast.info("결제가 취소되었습니다");
      } else {
        const msg = e?.message || "결제 요청 중 오류가 발생했습니다";
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[560px] pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0064FF] flex items-center justify-center shadow-sm">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full text-blue-200">
                  Toss Payments 보안 결제
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight mt-0.5 truncate max-w-[340px]">
                {orderName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="결제창 닫기"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Order Summary Bar */}
        <div className="px-6 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-gray-600">최종 결제 금액</span>
          <span className="text-lg font-black text-[#0064FF]">
            ₩{Number(amount).toLocaleString()}원
          </span>
        </div>

        {/* Toss Official Widget Containers */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 relative min-h-[340px]">
          {!ready && (
            <div className="absolute inset-0 z-10 bg-white/90 flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="w-8 h-8 text-[#0064FF] animate-spin" />
              <p className="text-xs font-bold text-gray-600">
                토스페이먼츠 보안 결제창을 불러오는 중입니다...
              </p>
            </div>
          )}
          <div id="toss-widget-payment-method" className="w-full" />
          <div id="toss-widget-agreement" className="w-full" />
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex-shrink-0 space-y-2.5">
          <button
            type="button"
            id="toss-widget-submit-btn"
            disabled={!ready || submitting}
            onClick={handleRequestPayment}
            className="w-full py-4 rounded-2xl bg-[#0064FF] hover:bg-[#0052CC] disabled:bg-gray-300 text-white font-black text-[15px] shadow-lg shadow-blue-500/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>카드사 결제창 호출 중...</span>
              </>
            ) : (
              <span>{Number(amount).toLocaleString()}원 결제하기</span>
            )}
          </button>
          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              256-bit SSL 암호화
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              토스페이먼츠 전자결제 에스크로 보호
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
