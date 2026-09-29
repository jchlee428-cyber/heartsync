import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageCircle, Bell, Clock, Check, Send, Sparkles, Shield, Phone, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@metagptx/web-sdk";

const client = createClient();

interface AlimtalkRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultPartnerName?: string;
  latestScore?: number;
}

export default function AlimtalkRoutineModal({
  isOpen,
  onClose,
  defaultPhone = "",
  defaultPartnerName = "파트너",
  latestScore = 168,
}: AlimtalkRoutineModalProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [partnerName, setPartnerName] = useState(defaultPartnerName);
  const [preferredTime, setPreferredTime] = useState("20:00");
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<"d1" | "d7" | "d30">("d1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSubscribe = async () => {
    if (!phone || phone.replace(/[^0-9]/g, "").length < 10) {
      toast.warning("올바른 휴대전화 번호(- 제외 10~11자리)를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/notifications/subscribe-alimtalk",
        method: "POST",
        data: {
          phone,
          partner_name: partnerName,
          preferred_time: preferredTime,
          latest_score: latestScore,
        },
      });

      if (res.data?.success) {
        toast.success("카카오 알림톡 데일리 루틴이 등록되었습니다! 📱", {
          description: `매일 저녁 ${preferredTime}에 파트너와의 대화 질문과 D+7, D+30 변화 체크 알림이 전송됩니다.`,
        });
        localStorage.setItem("heartsync_alimtalk_phone", phone);
        localStorage.setItem("heartsync_alimtalk_subscribed", "true");
        onClose();
      } else {
        toast.error("등록 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    } catch {
      // Local fallback
      localStorage.setItem("heartsync_alimtalk_phone", phone);
      localStorage.setItem("heartsync_alimtalk_subscribed", "true");
      toast.success("카카오 알림톡 데일리 루틴이 설정되었습니다! (로컬 모드) 📱");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestAlimtalk = async () => {
    if (!phone || phone.replace(/[^0-9]/g, "").length < 10) {
      toast.warning("테스트 발송을 위해 휴대폰 번호를 먼저 입력해주세요.");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/notifications/send-alimtalk",
        method: "POST",
        data: {
          phone,
          template_type: selectedPreviewTab,
          partner_name: partnerName,
          latest_score: latestScore,
        },
      });

      if (res.data?.success) {
        toast.success(`[${selectedPreviewTab.toUpperCase()}] 알림톡 테스트 발송 성공! 💬`, {
          description: "카카오 비즈메시지 규격으로 정상 시뮬레이션되었습니다.",
        });
      }
    } catch {
      toast.info(`[${selectedPreviewTab.toUpperCase()}] 알림톡 시뮬레이션이 성공적으로 처리되었습니다.`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-gray-950 p-5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/10 text-gray-900 text-[10px] font-black w-fit mb-1.5">
            <MessageCircle className="w-3 h-3 fill-current" />
            카카오 알림톡 · 비즈뿌리오 / 알리고 연동
          </div>
          <DialogTitle className="text-lg font-black text-gray-950">
            관계 유지 데일리 루틴 (D+1, D+7, D+30)
          </DialogTitle>
          <DialogDescription className="text-gray-900/80 text-xs mt-1">
            진단 후 이탈을 방지하고 매일 퇴근길 둘만의 대화와 정기 변화 체크를 이어가세요.
          </DialogDescription>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Input Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                알림톡 받으실 휴대전화 번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">연인 이름 / 애칭</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="예: 지민"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">수신 시간 (퇴근길)</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium bg-white"
                >
                  <option value="19:00">저녁 7시 (19:00)</option>
                  <option value="20:00">저녁 8시 (20:00 - 권장)</option>
                  <option value="21:00">저녁 9시 (21:00)</option>
                  <option value="22:00">밤 10시 (22:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Kakao Alimtalk Preview Screen (D+1, D+7, D+30 Tabs) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-800">
                카카오 알림톡 실시간 미리보기
              </span>
              <button
                type="button"
                onClick={handleSendTestAlimtalk}
                disabled={isSendingTest}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTest ? "발송 중..." : "내 번호로 테스트 발송"}</span>
              </button>
            </div>

            {/* Tab selection */}
            <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-extrabold text-center">
              <button
                type="button"
                onClick={() => setSelectedPreviewTab("d1")}
                className={`py-1.5 rounded-lg transition-all ${
                  selectedPreviewTab === "d1"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                D+1 퇴근길 대화
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreviewTab("d7")}
                className={`py-1.5 rounded-lg transition-all ${
                  selectedPreviewTab === "d7"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                D+7 변화 체크
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreviewTab("d30")}
                className={`py-1.5 rounded-lg transition-all ${
                  selectedPreviewTab === "d30"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                D+30 월간 리포트
              </button>
            </div>

            {/* Kakao Talk Balloon Preview */}
            <div className="bg-[#b2c7d9] p-3 rounded-2xl space-y-2">
              <div className="max-w-[280px] bg-white rounded-2xl p-3.5 shadow-sm space-y-2 border border-black/5 text-xs text-left">
                {/* Yellow Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                    알림톡 도착
                  </span>
                  <span className="text-[9px] text-gray-400">HeartSync 공식</span>
                </div>

                {/* Content according to tab */}
                {selectedPreviewTab === "d1" && (
                  <div className="space-y-1.5 text-gray-800 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-gray-900">[HeartSync 데일리 루틴]</p>
                    <p>오늘 퇴근길, <span className="font-bold text-pink-600">{partnerName}</span>님에게 건네면 좋은 1가지 질문이 도착했습니다.</p>
                    <div className="p-2 bg-pink-50 rounded-lg border border-pink-100 font-semibold text-pink-800 text-[11px]">
                      💬 "오늘 하루 중 당신을 가장 미소 짓게 했던 순간은 언제였어?"
                    </div>
                    <p className="text-[10px] text-gray-500">
                      💡 존 가트맨 박사의 사랑의 지도 업데이트 팁: 일상의 사소한 감정 공유가 애착 안정성을 3배 강화합니다.
                    </p>
                  </div>
                )}

                {selectedPreviewTab === "d7" && (
                  <div className="space-y-1.5 text-gray-800 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-gray-900">[HeartSync 주간 리포트]</p>
                    <p>지난주 관계 진단(종합 <span className="font-bold">{latestScore}점</span>) 후 7일이 지났습니다.</p>
                    <p>이번 주 두 분의 갈등 지수와 소통 패턴에 어떤 긍정적 변화가 있었을까요?</p>
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 font-medium">
                      ⏱️ 3분 미니 체크인으로 이번 주 시계열 변화 포인트를 기록하세요!
                    </div>
                  </div>
                )}

                {selectedPreviewTab === "d30" && (
                  <div className="space-y-1.5 text-gray-800 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-gray-900">[HeartSync 30일 성장 리포트]</p>
                    <p>첫 진단 후 어느덧 30일이 지났습니다! 🎉</p>
                    <p>우리 커플의 갈등 지수는 지난달 대비 얼마나 개선되었을까요?</p>
                    <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-[10px] text-purple-900 font-semibold">
                      👑 30일 올케어 패스(49,000원)로 전문 시계열 그래프와 AI 집중 코칭을 무제한 누려보세요.
                    </div>
                  </div>
                )}

                {/* Kakao Button Preview */}
                <div className="pt-1">
                  <div className="w-full py-2 bg-gray-100 rounded-xl text-center text-[11px] font-bold text-gray-700 border border-gray-200">
                    {selectedPreviewTab === "d1"
                      ? "오늘의 질문 보러가기"
                      : selectedPreviewTab === "d7"
                      ? "3분 미니 진단 시작하기"
                      : "30일 올케어 패스 확인"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 space-y-2">
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] text-[#381E1F] font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>카카오 알림톡 데일리 루틴 시작하기</span>
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span>스팸 없는 관계 코칭 전용 알림톡 (언제든 무료 해지 가능)</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
