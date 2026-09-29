import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Gift, Heart, Sparkles, Crown, Send, Check, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanId?: string;
}

export default function GiftModal({
  isOpen,
  onClose,
  selectedPlanId = "monthly_subscription",
}: GiftModalProps) {
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [loveLetter, setLoveLetter] = useState(
    "우리 1주년 기념으로 속마음 맞춰보자! 늘 사랑해 ❤️"
  );
  const [selectedPlan, setSelectedPlan] = useState<string>(selectedPlanId);
  const [isLoading, setIsLoading] = useState(false);

  const planOptions = [
    {
      id: "monthly_subscription",
      name: "커플 듀얼 매칭 패키지 (2인)",
      price: 29000,
      priceStr: "29,000원",
      badge: "🔥 선물 1위 (94% 선택)",
      desc: "두 사람 모두 진단하고, 서로의 시선 차이와 속마음 비교 리포트 제공",
    },
    {
      id: "couple_premium",
      name: "30일 관계 개선 올케어 패스",
      price: 49000,
      priceStr: "49,000원",
      badge: "👑 VIP 올케어",
      desc: "30일간 무제한 재진단 + AI 전문 코치 1:1 무제한 상담 + 주차별 미션",
    },
  ];

  const currentOption = planOptions.find((p) => p.id === selectedPlan) || planOptions[0];

  const handleGiftPayment = async () => {
    if (!recipientName.trim()) {
      toast.warning("선물 받으실 연인의 이름이나 애칭을 입력해주세요.");
      return;
    }
    if (!senderName.trim()) {
      toast.warning("보내시는 분(내 이름)을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Generate unique Gift Ticket ID
      const ticketId = `gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const giftData = {
        ticketId,
        senderName,
        recipientName,
        recipientPhone,
        loveLetter,
        planType: currentOption.id,
        planName: currentOption.name,
        amount: currentOption.price,
        createdAt: new Date().toISOString(),
      };

      // Save gift metadata to localStorage for instant retrieval on success page
      localStorage.setItem(`heartsync_gift_${ticketId}`, JSON.stringify(giftData));
      localStorage.setItem("heartsync_latest_gift", JSON.stringify(giftData));

      // 2. Initialize Toss Payments (Live or Test Mode)
      const clientKey = "test_ck_D5GePWvyJqK4W7m10bBg3zN97Eoq";
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({
        customerKey: `cust_${Date.now()}`,
      });

      const orderId = `order_${ticketId}`;

      // Request payment with redirect
      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: currentOption.price,
        },
        orderId: orderId,
        orderName: `[선물] HeartSync ${currentOption.name}`,
        successUrl: `${window.location.origin}/payment-success?gift_ticket_id=${ticketId}&orderId=${orderId}&amount=${currentOption.price}`,
        failUrl: `${window.location.origin}/pricing?payment_fail=true`,
        customerName: senderName,
      });
    } catch (err: any) {
      console.error("Gift payment error:", err);
      // If modal cancelled or error
      if (err?.code !== "USER_CANCEL") {
        toast.error("결제 창 호출에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl">
        {/* Top Header */}
        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-black text-white tracking-tight">
            연인에게 특별한 진단권 선물하기
          </DialogTitle>
          <DialogDescription className="text-xs text-pink-100 mt-1 font-medium">
            100일, 1주년, 결혼 전 마음을 담아 예쁜 모바일 러브레터 티켓을 전하세요
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Plan Choice Tabs */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-700 block">
              선물할 패키지 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {planOptions.map((opt) => {
                const isSelected = selectedPlan === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedPlan(opt.id)}
                    className={`p-3 rounded-2xl text-left border-2 transition-all relative ${
                      isSelected
                        ? "border-pink-500 bg-pink-50/60 shadow-xs"
                        : "border-gray-200 bg-white hover:border-pink-200"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-pink-600 block mb-0.5">
                      {opt.badge}
                    </span>
                    <p className="text-xs font-black text-gray-900 truncate">
                      {opt.name}
                    </p>
                    <p className="text-sm font-black text-pink-600 mt-1">
                      {opt.priceStr}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Names Grid */}
          <div className="grid grid-cols-2 gap-3 bg-pink-50/50 p-3.5 rounded-2xl border border-pink-100">
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                보내는 사람 (나)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="예: 지민"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                받는 사람 (연인)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="예: 민준"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>

          {/* Love Letter Message */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 block mb-1">
              💌 모바일 선물 티켓에 담길 러브레터 메시지
            </label>
            <textarea
              rows={2}
              value={loveLetter}
              onChange={(e) => setLoveLetter(e.target.value)}
              placeholder="연인에게 전하고 싶은 따뜻한 메시지를 적어보세요."
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
            />
          </div>

          {/* Ticket Preview Card */}
          <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 p-4 rounded-2xl border border-pink-200 shadow-xs relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-pink-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                모바일 러브레터 티켓 미리보기
              </span>
              <span className="px-2 py-0.5 rounded-full bg-pink-200 text-pink-800 text-[9px] font-bold">
                DOUBLES PASS
              </span>
            </div>
            <p className="text-xs font-bold text-gray-900">
              To. {recipientName || "연인"}님께
            </p>
            <p className="text-xs text-pink-700 italic my-1">
              "{loveLetter || "늘 사랑해 ❤️"}"
            </p>
            <p className="text-[11px] text-gray-500">
              From. {senderName || "나"} | {currentOption.name}
            </p>
          </div>

          {/* Payment CTA Button */}
          <button
            onClick={handleGiftPayment}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-black text-sm shadow-lg shadow-pink-200 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>결제창 준비 중...</span>
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>{currentOption.priceStr} 선물 결제하고 티켓 발급</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center">
            결제 완료 즉시 카카오톡으로 전송 가능한 고화질 모바일 선물 카드가 발급됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
