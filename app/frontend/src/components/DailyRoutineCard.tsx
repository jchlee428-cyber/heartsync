import { useState, useEffect } from "react";
import {
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  BellRing,
  Share2,
  Heart,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import AlimtalkRoutineModal from "./AlimtalkRoutineModal";

interface DailyRoutineCardProps {
  partnerName?: string;
  latestScore?: number;
}

const SAMPLE_QUESTIONS = [
  {
    topic: "소소한 기쁨",
    question: "오늘 하루 중 당신을 가장 미소 짓게 했던 순간은 언제였어?",
    tip: "가트맨의 '사랑의 지도(Love Map)' 업데이트",
  },
  {
    topic: "스트레스 완화",
    question: "요즘 당신을 가장 지치게 하거나 신경 쓰이게 하는 일은 뭐야?",
    tip: "해결책 대신 따뜻한 경청과 공감 먼저 건네기",
  },
  {
    topic: "감사 표현",
    question: "최근 내가 했던 사소한 말이나 행동 중에 고마웠던 게 있다면 뭐야?",
    tip: "감정 은행 계좌에 사랑 입금하기",
  },
  {
    topic: "설렘 소환",
    question: "우리가 연애 초반에 함께 갔던 데이트 장소 중 다시 가고 싶은 곳은?",
    tip: "존중과 애정(Fondness & Admiration) 활성화",
  },
  {
    topic: "주말 힐링",
    question: "이번 주말에 둘이서 꼭 해보고 싶은 단 하나의 소소한 힐링은?",
    tip: "의도적 친밀감(Intentional Intimacy) 시간 확보",
  },
];

export default function DailyRoutineCard({
  partnerName = "지민",
  latestScore = 168,
}: DailyRoutineCardProps) {
  const [qIndex, setQIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isAlimtalkModalOpen, setIsAlimtalkModalOpen] = useState(false);

  const currentQ = SAMPLE_QUESTIONS[qIndex];

  const handleNextQuestion = () => {
    setQIndex((prev) => (prev + 1) % SAMPLE_QUESTIONS.length);
  };

  const handleCopyQuestion = async () => {
    const text = `💕 [HeartSync 오늘 퇴근길 질문]\n"${currentQ.question}"\n\n(오늘 밤 우리 함께 이야기 나눠보자!)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("오늘의 대화 질문이 복사되었습니다!", {
        description: "카카오톡으로 연인에게 바로 전송해보세요.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleKakaoShare = () => {
    const text = `💕 [HeartSync 오늘 퇴근길 질문]\n"${currentQ.question}"\n\n(오늘 밤 우리 함께 이야기 나눠보자!)`;
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    window.open(kakaoUrl, "_blank", "width=600,height=500");
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/60 via-pink-50/40 to-rose-50/50 rounded-3xl p-5 border-2 border-amber-200/70 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-gray-900 flex items-center justify-center font-black text-sm shadow-xs">
            💬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-gray-900">퇴근길 데일리 루틴</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full">
                D+1 루틴
              </span>
            </div>
            <p className="text-[10px] text-gray-500">오늘 퇴근길, 파트너에게 건네는 1가지 질문</p>
          </div>
        </div>

        <button
          onClick={handleNextQuestion}
          className="text-[11px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 p-1 rounded-lg hover:bg-white/60 transition-colors"
          title="다른 질문 뽑기"
        >
          <RefreshCw className="w-3 h-3" />
          <span>다른 질문</span>
        </button>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl p-4 border border-amber-100/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-amber-700 px-2 py-0.5 rounded-full bg-amber-50">
            주제: {currentQ.topic}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">1일 1질문 챌린지</span>
        </div>

        <p className="text-sm font-black text-gray-800 leading-snug font-serif italic py-1">
          "{currentQ.question}"
        </p>

        <p className="text-[11px] text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-pink-500 flex-shrink-0" />
          <span>{currentQ.tip}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyQuestion}
          className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "질문 복사됨!" : "질문 복사하기"}</span>
        </button>

        <button
          onClick={() => setIsAlimtalkModalOpen(true)}
          className="flex-1 py-2.5 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#381E1F] font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-2xs"
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>알림톡 예약 (D+1, D+7)</span>
        </button>
      </div>

      {/* Alimtalk Routine Modal */}
      <AlimtalkRoutineModal
        isOpen={isAlimtalkModalOpen}
        onClose={() => setIsAlimtalkModalOpen(false)}
        defaultPartnerName={partnerName}
        latestScore={latestScore}
      />
    </div>
  );
}
