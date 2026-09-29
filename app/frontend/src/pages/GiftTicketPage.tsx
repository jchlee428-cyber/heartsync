import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, Sparkles, Gift, ArrowRight, Share2, Copy, Check, Shield, Calendar, User } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import Header from "@/components/Header";

interface GiftTicketData {
  ticketId: string;
  senderName: string;
  recipientName: string;
  message: string;
  planId: string;
  planName: string;
  amount: number;
  createdAt: string;
  status: "ACTIVE" | "USED";
}

export default function GiftTicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<GiftTicketData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpenLetter, setIsOpenLetter] = useState(false);

  useEffect(() => {
    // Try to load ticket data from localStorage
    let data: GiftTicketData | null = null;
    if (ticketId) {
      const stored = localStorage.getItem(`heartsync_gift_ticket_${ticketId}`);
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse ticket data", e);
        }
      }
    }

    // Fallback default sample ticket if accessed directly or shared
    if (!data) {
      data = {
        ticketId: ticketId || "GIFT-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        senderName: "민준",
        recipientName: "지민",
        message: "우리 100일을 기념하며 서로의 마음과 속마음을 더 깊이 이해하고 맞춰가고 싶어서 준비했어. 언제나 고맙고 사랑해! 💕",
        planId: "monthly_subscription",
        planName: "커플 듀얼 매칭 패키지 (2인 전액 지원권)",
        amount: 29000,
        createdAt: new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
        status: "ACTIVE",
      };
    }

    setTicket(data);

    // Fire gentle celebration confetti
    try {
      confetti({
        particleCount: 30,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ec4899", "#f43f5e", "#fda4af", "#f472b6"],
      });
    } catch {
      // ignore
    }
  }, [ticketId]);

  if (!ticket) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("선물 티켓 링크가 복사되었습니다!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleStartDiagnosis = () => {
    // Navigate to diagnosis with invitation context
    const params = new URLSearchParams({
      invite_from: ticket.senderName,
      partner_name: ticket.recipientName,
      gift_ticket: ticket.ticketId,
      type: "couple_match",
    });
    navigate(`/diagnosis?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50/50 to-white pb-24">
      <Header />

      <main className="max-w-md mx-auto px-5 pt-8">
        {/* Celebration Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-black mb-3 shadow-xs">
            <Gift className="w-3.5 h-3.5 text-pink-600 animate-bounce" />
            연인이 보낸 모바일 러브레터 선물권
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            <span className="text-pink-600">{ticket.recipientName}</span>님을 위한<br />
            특별한 초대장이 도착했습니다
          </h1>
          <p className="text-xs text-gray-500 mt-1.5">
            {ticket.senderName}님이 두 사람의 소중한 관계를 위해 정성을 담아 선물했습니다.
          </p>
        </div>

        {/* ── Romantic Ticket Card ── */}
        <div className="relative bg-white rounded-3xl shadow-xl border-2 border-pink-200 overflow-hidden mb-6">
          {/* Top Banner Ribbon */}
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white p-4 text-center relative">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-black tracking-wider uppercase">
                HEARTSYNC VIP COUPLE PASS
              </span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-lg font-black mt-0.5">{ticket.planName}</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Love Letter Section */}
            <div className="relative bg-gradient-to-br from-pink-50/60 to-rose-50/60 rounded-2xl p-5 border border-pink-100">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">💌</span>
                <span className="text-xs font-black text-pink-700 tracking-wider">
                  FROM. {ticket.senderName}
                </span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed font-serif italic whitespace-pre-wrap">
                "{ticket.message}"
              </p>
              <div className="text-right mt-3 text-[11px] text-pink-400 font-bold">
                TO. 사랑하는 {ticket.recipientName}에게
              </div>
            </div>

            {/* Ticket Info Details */}
            <div className="bg-gray-50/80 rounded-2xl p-4 space-y-2.5 text-xs text-gray-600 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <User className="w-3.5 h-3.5" />
                  선물 보낸 사람
                </span>
                <span className="font-bold text-gray-800">{ticket.senderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                  받는 연인
                </span>
                <span className="font-bold text-gray-800">{ticket.recipientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  선물 발송일
                </span>
                <span className="font-medium text-gray-700">{ticket.createdAt}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  티켓 상태
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">
                  전액 결제 완료 (무료 사용 가능)
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center text-[11px]">
                <span className="text-gray-400">티켓 고유 번호</span>
                <span className="font-mono text-gray-600">{ticket.ticketId}</span>
              </div>
            </div>

            {/* What you get */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                이 티켓으로 누릴 수 있는 혜택
              </h4>
              <ul className="text-xs text-gray-600 space-y-1.5 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  50문항 정밀 진단 2인 전액 무료 응시
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  AI 커플 싱크로율 &amp; 숨겨진 속마음 매칭 리포트
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  1:1 맞춤 대화법 및 영구 소장용 PDF 진단서 제공
                </li>
              </ul>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2 space-y-2.5">
              <button
                onClick={handleStartDiagnosis}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-base shadow-lg shadow-pink-200 active:scale-98 transition-all flex items-center justify-center gap-2 group"
              >
                <span>지금 바로 무료 진단 시작하기</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-3 rounded-xl bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "티켓 링크 복사됨!" : "선물 티켓 링크 복사해두기"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-gray-400">
          HeartSync · 심리학 연구 기반 AI 커플 진단 &amp; 케어 솔루션
        </p>
      </main>
    </div>
  );
}
