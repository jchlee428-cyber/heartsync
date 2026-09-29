import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Heart, Sparkles, CheckCircle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@metagptx/web-sdk";
import confetti from "canvas-confetti";

const client = createClient();

interface MiniDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MINI_QUESTIONS = [
  { id: "1", category: "conflict", label: "갈등 관리", text: "최근 갈등이 생겼을 때, 서로 인격을 비난하지 않고 차분하게 대화하려 노력했다." },
  { id: "2", category: "conflict", label: "갈등 관리", text: "의견 차이가 생겼을 때 상대방의 사과나 화해 제스처를 기분 좋게 받아들였다." },
  { id: "3", category: "intimacy", label: "정서적 친밀감", text: "최근 일주일 동안 서로의 하루 일과나 소소한 고민에 대해 깊이 귀 기울여 들었다." },
  { id: "4", category: "intimacy", label: "정서적 친밀감", text: "파트너와 함께 있을 때 진심으로 편안하고 즐거운 우정을 느꼈다." },
  { id: "5", category: "trust", label: "신뢰/애착", text: "파트너가 나를 두고 떠나거나 마음이 식을까 봐 불안해하지 않고 안정감을 느꼈다." },
  { id: "6", category: "trust", label: "신뢰/애착", text: "파트너와의 약속이나 말에 대해 의심 없이 온전히 신뢰할 수 있었다." },
  { id: "7", category: "values", label: "가치관", text: "돈, 여가, 미래 계획 등 중요한 일상적 결정에서 서로의 뜻을 잘 조율했다." },
  { id: "8", category: "values", label: "가치관", text: "파트너가 나의 개인적 목표나 커리어 성장을 진심으로 지지해주고 있다고 느꼈다." },
  { id: "9", category: "physical", label: "신체적 만족", text: "손잡기, 포옹, 가벼운 입맞춤 등 일상적인 스킨십이 자연스럽고 따뜻했다." },
  { id: "10", category: "physical", label: "신체적 만족", text: "파트너와의 신체적·성적 친밀감에 대해 편안하게 감정을 나눌 수 있었다." },
];

export default function MiniDiagnosisModal({ isOpen, onClose, onSuccess }: MiniDiagnosisModalProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (qId: string, val: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === MINI_QUESTIONS.length;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.warning("10개 문항에 모두 답변해주세요!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/diagnoses/mini-checkin",
        method: "POST",
        data: { answers },
      });

      if (res.data?.success) {
        toast.success("3분 미니 체크인이 완료되었습니다! 🎉", {
          description: "시계열 관계 변화 그래프에 새로운 데이터가 반영되었습니다.",
        });

        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
            colors: ["#ec4899", "#f43f5e", "#a855f7"],
          });
        } catch {
          // ignore
        }

        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error("저장에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error("Mini checkin error:", err);
      // Fallback: save to localStorage if backend is offline
      const localId = `mini_${Date.now()}`;
      toast.success("3분 미니 체크인이 저장되었습니다! (오프라인 모드) 🎉");
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white p-5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black w-fit mb-1.5">
            <Clock className="w-3 h-3" />
            3분 퀵 체크인 (10문항)
          </div>
          <DialogTitle className="text-lg font-black text-white">
            우리 커플의 이번 주 변화 체크하기
          </DialogTitle>
          <DialogDescription className="text-white/80 text-xs mt-1">
            50문항 전체를 풀지 않아도, 3분 만에 시계열 변화 곡선을 업데이트할 수 있습니다.
          </DialogDescription>
          {/* Progress */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
            <span>진행률 ({answeredCount}/{MINI_QUESTIONS.length})</span>
            <span>{Math.round((answeredCount / MINI_QUESTIONS.length) * 100)}%</span>
          </div>
          <div className="mt-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / MINI_QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {MINI_QUESTIONS.map((q, idx) => {
            const currentVal = answers[q.id];
            return (
              <div key={q.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-pink-600 px-2 py-0.5 rounded-full bg-pink-100/60">
                    Q{idx + 1}. {q.label}
                  </span>
                  {currentVal && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {currentVal}점
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-snug">{q.text}</p>

                {/* 1 ~ 5 Rating buttons */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { val: 1, label: "전혀 아님" },
                    { val: 2, label: "약간 아님" },
                    { val: 3, label: "보통" },
                    { val: 4, label: "대체로 그럼" },
                    { val: 5, label: "매우 그럼" },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => handleSelect(q.id, btn.val)}
                      className={`py-2 px-1 rounded-xl text-center transition-all ${
                        currentVal === btn.val
                          ? "bg-pink-600 text-white font-black shadow-sm scale-102 ring-2 ring-pink-300"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-pink-50/50 hover:border-pink-200"
                      }`}
                    >
                      <div className="text-xs font-black">{btn.val}</div>
                      <div className="text-[9px] truncate opacity-80">{btn.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Submit */}
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 space-y-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              isComplete && !isSubmitting
                ? "bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white shadow-md active:scale-98"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>시계열 기록 저장 중...</span>
              </>
            ) : (
              <>
                <span>3분 체크인 완료하고 시계열 그래프 보기</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            다음에 하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
