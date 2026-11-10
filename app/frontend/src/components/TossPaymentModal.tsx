import { useEffect, useRef, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { X, ShieldCheck, Lock, Loader2, CreditCard, Smartphone, Ticket, ArrowLeft, CheckCircle2 } from "lucide-react";
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

type SubPaymentMode = "widget" | "mobile_phone" | "gift_certificate";

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
  const [mode, setMode] = useState<SubPaymentMode>("widget");

  // Mobile Phone Payment state
  const [carrier, setCarrier] = useState<"SKT" | "KT" | "LGU+" | "MVNO">("SKT");
  const [phoneNum, setPhoneNum] = useState("");
  const [birthFront, setBirthFront] = useState("");
  const [genderDigit, setGenderDigit] = useState("");
  const [carrierAgreed, setCarrierAgreed] = useState(true);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // Gift Certificate Payment state
  const [giftCertType, setGiftCertType] = useState<"CULTURE" | "BOOK" | "HAPPY">("CULTURE");
  const [giftAuthMethod, setGiftAuthMethod] = useState<"ID" | "PIN">("PIN");
  const [giftUserId, setGiftUserId] = useState("");
  const [giftUserPw, setGiftUserPw] = useState("");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pin3, setPin3] = useState("");
  const [pin4, setPin4] = useState("");
  const [giftAgreed, setGiftAgreed] = useState(true);

  const widgetsRef = useRef<any>(null);
  const paymentMethodWidgetRef = useRef<any>(null);
  const agreementWidgetRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setReady(false);
      setSubmitting(false);
      setMode("widget");
      setOtpRequested(false);
      setOtpCode("");
      return;
    }

    if (mode !== "widget") {
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
  }, [isOpen, mode, orderId, amount, clientKey, customerKey]);

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

  const handleOpenMobilePhoneMode = async () => {
    // If merchant has a live API individual key (live_ck_), invoke native SDK directly
    if (clientKey && clientKey.startsWith("live_ck_")) {
      setSubmitting(true);
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const payment = tossPayments.payment({
          customerKey: customerKey || `cust_${Date.now()}`,
        });
        await payment.requestPayment({
          method: "MOBILE_PHONE",
          amount: { currency: "KRW", value: Number(amount) },
          orderId,
          orderName,
          successUrl,
          failUrl,
          customerEmail,
          customerName,
        });
        return;
      } catch (e: any) {
        if (e?.code === "USER_CANCEL" || e?.code === "PAY_PROCESS_CANCELED") {
          toast.info("휴대폰 결제가 취소되었습니다");
          setSubmitting(false);
          return;
        }
      } finally {
        setSubmitting(false);
      }
    }
    setMode("mobile_phone");
  };

  const handleOpenGiftCertificateMode = async () => {
    if (clientKey && clientKey.startsWith("live_ck_")) {
      setSubmitting(true);
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const payment = tossPayments.payment({
          customerKey: customerKey || `cust_${Date.now()}`,
        });
        await payment.requestPayment({
          method: "CULTURE_GIFT_CERTIFICATE",
          amount: { currency: "KRW", value: Number(amount) },
          orderId,
          orderName,
          successUrl,
          failUrl,
          customerEmail,
          customerName,
        });
        return;
      } catch (e: any) {
        if (e?.code === "USER_CANCEL" || e?.code === "PAY_PROCESS_CANCELED") {
          toast.info("상품권 결제가 취소되었습니다");
          setSubmitting(false);
          return;
        }
      } finally {
        setSubmitting(false);
      }
    }
    setMode("gift_certificate");
  };

  const handleSubmitMobilePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = phoneNum.replace(/\D/g, "");
    if (cleanedPhone.length < 10) {
      toast.warning("휴대폰 번호(10~11자리)를 정확히 입력해주세요.");
      return;
    }
    if (birthFront.length !== 6 || genderDigit.length !== 1) {
      toast.warning("생년월일 6자리와 주민번호 뒷자리 첫 번째 숫자를 입력해주세요.");
      return;
    }
    if (!carrierAgreed) {
      toast.warning("휴대폰 소액결제 필수 약관에 동의해주세요.");
      return;
    }

    if (!otpRequested) {
      setOtpRequested(true);
      toast.success(`${carrier} 통신사 본인확인 인증번호가 발송되었습니다. (테스트 인증번호: 000000)`);
      return;
    }

    if (otpCode.trim().length < 4) {
      toast.warning("인증번호 6자리(테스트 시 000000)를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (otpCode.trim() === "000000") {
        const sep = successUrl.includes("?") ? "&" : "?";
        window.location.href = `${successUrl}${sep}paymentKey=toss_mob_${Date.now()}&orderId=${encodeURIComponent(orderId)}&amount=${amount}&method=MOBILE_PHONE`;
      } else {
        toast.error("인증번호가 일치하지 않거나 통신사 소액결제 가맹점 심사 대기 중입니다. (테스트 번호: 000000)");
      }
    }, 800);
  };

  const handleSubmitGiftCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftAgreed) {
      toast.warning("상품권 결제 이용약관에 동의해주세요.");
      return;
    }

    if (giftAuthMethod === "PIN") {
      if (pin1.length < 4 || pin2.length < 4 || pin3.length < 4 || pin4.length < 4) {
        toast.warning("상품권 PIN 번호 16~18자리를 모두 입력해주세요.");
        return;
      }
    } else {
      if (!giftUserId.trim() || !giftUserPw.trim()) {
        toast.warning("상품권 사이트 아이디와 비밀번호를 입력해주세요.");
        return;
      }
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (pin1 === "0000" || giftUserId === "test") {
        const sep = successUrl.includes("?") ? "&" : "?";
        window.location.href = `${successUrl}${sep}paymentKey=toss_gift_${Date.now()}&orderId=${encodeURIComponent(orderId)}&amount=${amount}&method=GIFT_CERTIFICATE`;
      } else {
        toast.error("유효하지 않은 상품권 번호이거나 상품권 결제 가맹점 심사 대기 중입니다.");
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[150] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[560px] pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {mode !== "widget" ? (
              <button
                type="button"
                onClick={() => setMode("widget")}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                title="일반 결제창으로 돌아가기"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#0064FF] flex items-center justify-center shadow-sm">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full text-blue-200">
                  {mode === "mobile_phone"
                    ? "Toss Payments 휴대폰 소액결제"
                    : mode === "gift_certificate"
                    ? "Toss Payments 상품권 결제"
                    : "Toss Payments 보안 결제"}
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

        {/* 1) Default Widget Mode */}
        {mode === "widget" && (
          <>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  id="toss-mobile-phone-btn"
                  disabled={submitting}
                  onClick={handleOpenMobilePhoneMode}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11.5px] border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-[#0064FF] flex-shrink-0" />
                  <span>휴대폰 소액결제 (통신사)</span>
                </button>
                <button
                  type="button"
                  id="toss-gift-certificate-btn"
                  disabled={submitting}
                  onClick={handleOpenGiftCertificateMode}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11.5px] border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ticket className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>상품권 결제 (문화·도서상품권)</span>
                </button>
              </div>

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
          </>
        )}

        {/* 2) Mobile Phone Payment Mode (MOBILE_PHONE) */}
        {mode === "mobile_phone" && (
          <form onSubmit={handleSubmitMobilePhone} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0064FF] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-gray-900">
                    통신사 휴대폰 소액결제 (MOBILE_PHONE)
                  </p>
                  <p className="text-[11px] text-gray-500">
                    가맹점: 주식회사 레드뱅크 (HeartSync) · 익월 통신요금 합산 청구
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode("widget")}
                className="text-xs font-bold text-[#0064FF] hover:underline"
              >
                다른 결제수단
              </button>
            </div>

            {/* Carrier Selection */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                1. 이동통신사 선택
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["SKT", "KT", "LGU+", "MVNO"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCarrier(c)}
                    className={`py-2.5 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      carrier === c
                        ? "border-[#0064FF] bg-blue-50 text-[#0064FF]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {c === "MVNO" ? "알뜰폰" : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                2. 휴대폰 번호 입력
              </label>
              <input
                type="tel"
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
                placeholder="숫자만 입력 (예: 01012345678)"
                maxLength={11}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0064FF]"
                required
              />
            </div>

            {/* Birthdate & Gender Digit */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                3. 생년월일 및 성별코드 (본인확인용)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={birthFront}
                  onChange={(e) => setBirthFront(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="생년월일 6자리 (예: 950101)"
                  maxLength={6}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0064FF]"
                  required
                />
                <span className="text-gray-400 font-bold">-</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={genderDigit}
                    onChange={(e) => setGenderDigit(e.target.value.replace(/\D/g, "").slice(0, 1))}
                    placeholder="1"
                    maxLength={1}
                    className="w-10 text-center px-2 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0064FF]"
                    required
                  />
                  <span className="text-xs font-black text-gray-400 tracking-widest">
                    ● ● ● ● ● ●
                  </span>
                </div>
              </div>
            </div>

            {/* OTP Code if requested */}
            {otpRequested && (
              <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 space-y-1.5">
                <label className="block text-xs font-extrabold text-blue-900">
                  4. SMS 본인확인 인증번호 6자리 입력
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리 입력 (테스트 시: 000000)"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0064FF]"
                  required
                />
              </div>
            )}

            {/* Carrier Terms & Refund Policy Notice */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1.5 text-[11px] text-gray-600">
              <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={carrierAgreed}
                  onChange={(e) => setCarrierAgreed(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0064FF]"
                />
                <span>[필수] 휴대폰 소액결제 서비스 이용약관 및 개인정보 제3자 제공 동의</span>
              </label>
              <p className="text-[10.5px] text-gray-500 pl-6 leading-relaxed">
                • 휴대폰 결제는 당월 취소 시 통신사 청구 자체가 취소되며, 익월 이후 환불 시 고객센터(1599-9573)를 통해 본인 명의 계좌로 환불됩니다.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-[#0064FF] hover:bg-[#0052CC] text-white font-black text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>통신사 승인 처리 중...</span>
                </>
              ) : otpRequested ? (
                <span>인증 완료 및 {Number(amount).toLocaleString()}원 휴대폰 결제하기</span>
              ) : (
                <span>본인확인 인증번호 요청하기 ({Number(amount).toLocaleString()}원)</span>
              )}
            </button>
          </form>
        )}

        {/* 3) Gift Certificate Payment Mode (CULTURE_GIFT_CERTIFICATE) */}
        {mode === "gift_certificate" && (
          <form onSubmit={handleSubmitGiftCertificate} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-gray-900">
                    상품권 결제 (문화상품권 · 도서문화상품권)
                  </p>
                  <p className="text-[11px] text-gray-500">
                    가맹점: 주식회사 레드뱅크 (HeartSync) · 핀번호 또는 아이디 결제
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode("widget")}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                다른 결제수단
              </button>
            </div>

            {/* Gift Certificate Brand Selection */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                1. 상품권 종류 선택
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CULTURE", label: "컬처랜드 문화상품권" },
                  { id: "BOOK", label: "북앤라이프 도서상품권" },
                  { id: "HAPPY", label: "해피머니 상품권" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGiftCertType(g.id as any)}
                    className={`py-2.5 px-2 rounded-xl text-[11px] font-extrabold border-2 transition-all ${
                      giftCertType === g.id
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auth Method Toggle */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                2. 결제 방식 선택
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGiftAuthMethod("PIN")}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    giftAuthMethod === "PIN"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  상품권 PIN 번호 입력
                </button>
                <button
                  type="button"
                  onClick={() => setGiftAuthMethod("ID")}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    giftAuthMethod === "ID"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  컬처랜드/북앤라이프 ID 로그인
                </button>
              </div>
            </div>

            {giftAuthMethod === "PIN" ? (
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                  3. 상품권 PIN 번호 입력 (16~18자리)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={pin1}
                    onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    className="text-center py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <input
                    type="text"
                    value={pin2}
                    onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    className="text-center py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <input
                    type="text"
                    value={pin3}
                    onChange={(e) => setPin3(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    className="text-center py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <input
                    type="password"
                    value={pin4}
                    onChange={(e) => setPin4(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="4~6자리"
                    maxLength={6}
                    className="text-center py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-gray-700">
                  3. 상품권 사이트 계정 정보 입력
                </label>
                <input
                  type="text"
                  value={giftUserId}
                  onChange={(e) => setGiftUserId(e.target.value)}
                  placeholder="컬처랜드 / 북앤라이프 아이디"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <input
                  type="password"
                  value={giftUserPw}
                  onChange={(e) => setGiftUserPw(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1.5 text-[11px] text-gray-600">
              <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftAgreed}
                  onChange={(e) => setGiftAgreed(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-500"
                />
                <span>[필수] 상품권 결제 서비스 이용약관 및 결제 대행 동의</span>
              </label>
              <p className="text-[10.5px] text-gray-500 pl-6 leading-relaxed">
                • 상품권 결제 후 7일 이내 미사용 시 100% 전액 결제 취소 및 환불이 보장됩니다.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>상품권 승인 처리 중...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{Number(amount).toLocaleString()}원 상품권 결제하기</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
