import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageCircle, Send, Shield, Phone, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface AlimtalkRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultPartnerName?: string;
  latestScore?: number;
}

type ProviderStatus = {
  configured: boolean;
  mode: "live" | "partial_live" | "inspecting" | "unconfigured" | "auth_error" | "error";
  statuses?: { d1?: string; d7?: string; d30?: string };
  message?: string;
};

export default function AlimtalkRoutineModal({
  isOpen,
  onClose,
  defaultPhone = "",
  defaultPartnerName = "파트너",
  latestScore = 168,
}: AlimtalkRoutineModalProps) {
  const [phone, setPhone] = useState(
    () => defaultPhone || localStorage.getItem("heartsync_alimtalk_phone") || ""
  );
  const [partnerName, setPartnerName] = useState(defaultPartnerName);
  const [preferredTime, setPreferredTime] = useState("20:00");
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<"d1" | "d7" | "d30">("d1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/alimtalk")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setProviderStatus(data);
        }
      })
      .catch(() => {
        if (!cancelled) setProviderStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubscribe = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      toast.warning("올바른 휴대전화 번호(- 제외 10~11자리)를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/alimtalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          phone: cleanPhone,
          partner_name: partnerName,
          preferred_time: preferredTime,
          latest_score: latestScore,
        }),
      });
      const data = await res.json().catch(() => ({}));

      localStorage.setItem("heartsync_alimtalk_phone", cleanPhone);
      localStorage.setItem("heartsync_alimtalk_subscribed", "true");

      if (data?.dispatched) {
        toast.success("카카오 알림톡 데일리 루틴이 실제 예약되었습니다! 💬", {
          description:
            data.message ||
            `지정하신 ${preferredTime} 기준으로 D+1, D+7, D+30 알림톡이 발송됩니다.`,
        });
        onClose();
      } else if (data?.mode === "inspecting") {
        toast.info("데일리 루틴 연락처가 저장되었습니다.", {
          description:
            data.message ||
            "현재 카카오 알림톡 템플릿 검수 진행 중이며, 승인 완료 후 실발송이 시작됩니다.",
        });
        onClose();
      } else {
        toast.warning("실시간 예약 발송 대기 중", {
          description:
            data?.message || "환경변수 또는 템플릿 승인 상태를 확인해주세요.",
        });
      }
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestAlimtalk = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      toast.warning("테스트 발송을 위해 휴대폰 번호를 먼저 입력해주세요.");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/alimtalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test",
          phone: cleanPhone,
          template_type: selectedPreviewTab,
          partner_name: partnerName,
          latest_score: latestScore,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (data?.dispatched) {
        localStorage.setItem("heartsync_alimtalk_phone", cleanPhone);
        toast.success(`[${selectedPreviewTab.toUpperCase()}] 실제 알림톡 발송 완료! 💬`, {
          description: data.message || `${cleanPhone} 번호의 카카오톡을 확인해주세요.`,
        });
      } else if (data?.mode === "inspecting") {
        toast.info(`[${selectedPreviewTab.toUpperCase()}] 솔라피 연동 확인 완료 (카카오 검수 중)`, {
          description:
            data.message ||
            "현재 카카오 알림톡 템플릿 검수 진행 중입니다. 카카오 승인 즉시 실제 알림톡이 도착합니다.",
        });
      } else if (data?.mode === "unconfigured") {
        toast.warning("솔라피 환경변수 등록이 필요합니다", {
          description:
            data.message ||
            "Vercel 환경변수에 SOLAPI_API_KEY 및 SOLAPI_API_SECRET을 등록해주세요.",
        });
      } else {
        toast.error("테스트 발송 실패", {
          description: data?.message || "솔라피 발송 요청을 처리하지 못했습니다.",
        });
      }
    } catch {
      toast.error("네트워크 오류로 발송 요청에 실패했습니다.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const currentTabStatus = providerStatus?.statuses?.[selectedPreviewTab];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-gray-950 p-5 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/10 text-gray-900 text-[10px] font-black w-fit">
              <MessageCircle className="w-3 h-3 fill-current" />
              카카오 알림톡 · 솔라피(SOLAPI) 연동
            </div>
            {providerStatus?.configured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-gray-800 shadow-2xs">
                {currentTabStatus === "APPROVED" ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    실발송 활성
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-600" />
                    카카오 검수중
                  </>
                )}
              </span>
            )}
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
                placeholder="01012345678"
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
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTest ? "발송 확인 중..." : "내 번호로 테스트 발송"}</span>
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
              <div className="max-w-[290px] bg-white rounded-2xl p-3.5 shadow-sm space-y-2 border border-black/5 text-xs text-left">
                {/* Yellow Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                    알림톡 도착
                  </span>
                  <span className="text-[9px] text-gray-400">HeartSync 알림</span>
                </div>

                {/* Content according to tab */}
                {selectedPreviewTab === "d1" && (
                  <div className="space-y-1.5 text-gray-800 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-gray-900">[HeartSync 데일리 루틴 안내]</p>
                    <p>
                      안녕하세요. 고객님께서 신청하신 퇴근길 대화 루틴(D+1) 알림이 도착했습니다.
                    </p>
                    <p className="text-[11px]">
                      ■ 대화 대상: <span className="font-bold text-pink-600">{partnerName || "파트너"}</span>님
                    </p>
                    <div className="p-2 bg-pink-50 rounded-lg border border-pink-100 font-semibold text-pink-800 text-[11px]">
                      "오늘 하루 중 당신을 가장 미소 짓게 했던 순간은 언제였어?"
                    </div>
                    <p className="text-[10px] text-gray-500">
                      신청하신 시간에 맞춰 발송되는 서비스 이용 안내 메시지입니다.
                    </p>
                  </div>
                )}

                {selectedPreviewTab === "d7" && (
                  <div className="space-y-1.5 text-gray-800 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-gray-900">[HeartSync 주간 변화 점검 안내]</p>
                    <p>안녕하세요. 고객님께서 신청하신 D+7 관계 변화 체크인 일정 안내입니다.</p>
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 font-medium space-y-0.5">
                      <p>■ 파트너: {partnerName || "파트너"}님</p>
                      <p>■ 직전 진단 점수: {latestScore}점</p>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      진단 완료 후 7일이 경과하여 주간 소통 변화 점검 리포트를 확인하실 수 있습니다.
                    </p>
                  </div>
                )}

                {selectedPreviewTab === "d30" && (
                  <div className="space-y-1.5 text-gray-800 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-gray-900">[HeartSync 30일 점검 리포트 안내]</p>
                    <p>안녕하세요. 고객님께서 신청하신 D+30 월간 관계 점검 일정 안내입니다.</p>
                    <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-[10px] text-purple-900 font-semibold space-y-0.5">
                      <p>■ 파트너: {partnerName || "파트너"}님</p>
                      <p>■ 기준 진단 점수: {latestScore}점</p>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      첫 진단 이후 30일이 경과하여 월간 관계 변화 결과를 마이페이지에서 확인하실 수 있습니다.
                    </p>
                  </div>
                )}

                {/* Kakao Button Preview */}
                <div className="pt-1">
                  <div className="w-full py-2 bg-gray-100 rounded-xl text-center text-[11px] font-bold text-gray-700 border border-gray-200">
                    {selectedPreviewTab === "d1"
                      ? "오늘의 질문 확인하기"
                      : selectedPreviewTab === "d7"
                      ? "주간 점검 시작하기"
                      : "월간 리포트 확인하기"}
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
            className="w-full py-3.5 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] text-[#381E1F] font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>{isSubmitting ? "예약 처리 중..." : "카카오 알림톡 데일리 루틴 시작하기"}</span>
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
