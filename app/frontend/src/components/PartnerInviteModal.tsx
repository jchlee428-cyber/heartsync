import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Heart, Copy, Check, MessageCircle, Sparkles, Share2, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface PartnerInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  myDiagnosisId?: string;
  myScore?: number;
  defaultMyName?: string;
}

export default function PartnerInviteModal({
  isOpen,
  onClose,
  myDiagnosisId,
  myScore,
  defaultMyName,
}: PartnerInviteModalProps) {
  const [myName, setMyName] = useState(defaultMyName || "지민");
  const [partnerName, setPartnerName] = useState("민준");
  const [customMsg, setCustomMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate invite link with query parameters
  const getInviteUrl = () => {
    const origin = window.location.origin;
    const params = new URLSearchParams({
      invite_from: myName,
      partner_name: partnerName,
      diag_id: myDiagnosisId || "latest",
      type: "couple_match",
    });
    return `${origin}/diagnosis?${params.toString()}`;
  };

  const getInviteMessage = () => {
    const customLine = customMsg ? `\n"${customMsg}"\n` : "";
    return `💕 [HeartSync] ${myName}님이 연인 ${partnerName}님을 관계 정밀 진단에 초대했습니다!
${customLine}
우리 커플의 갈등 패턴과 숨겨진 속마음을 확인하는 50문항 정밀 진단을 완료했어요!
${partnerName}님도 진단을 완료하면 두 사람의 싱크로율 리포트와 서로 몰랐던 시선 차이가 즉시 완성됩니다.

👉 지금 바로 진단 참여하고 결과 맞추기:
${getInviteUrl()}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteUrl());
      setCopied(true);
      toast.success("초대 링크가 복사되었습니다!", {
        description: "카카오톡이나 문자메시지에 붙여넣어 연인에게 보내보세요.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(getInviteMessage());
      toast.success("초대 메시지 전체가 복사되었습니다!", {
        description: "카카오톡에 그대로 붙여넣기만 하시면 됩니다.",
      });
    } catch {
      toast.error("메시지 복사에 실패했습니다.");
    }
  };

  const handleKakaoShare = () => {
    const inviteUrl = getInviteUrl();
    const text = `💕 ${myName}님이 ${partnerName}님과의 커플 정밀 진단을 완료했습니다!\n${partnerName}님도 참여하여 두 사람의 속마음 싱크로율을 확인해보세요.`;
    
    // 1. Try native Web Share if supported on mobile
    if (navigator.share) {
      navigator
        .share({
          title: "HeartSync 커플 관계 진단 초대",
          text: text,
          url: inviteUrl,
        })
        .catch(() => {});
      return;
    }

    // 2. Fallback to Kakao Story / Link clipboard
    const kakaoShareUrl = `https://story.kakao.com/share?url=${encodeURIComponent(
      inviteUrl
    )}&text=${encodeURIComponent(text)}`;
    window.open(kakaoShareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    toast.success("카카오 공유 창이 열렸습니다. (클립보드에도 초대장이 복사되었습니다)");
    navigator.clipboard.writeText(getInviteMessage()).catch(() => {});
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl">
        {/* Top Romantic Header */}
        <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-400 p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Users className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-black text-white tracking-tight">
            연인에게 1초 초대장 보내기
          </DialogTitle>
          <DialogDescription className="text-xs text-pink-100 mt-1 font-medium">
            파트너가 응답하면 두 사람의 싱크로율과 시선 차이가 자동 완성됩니다!
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          {/* Couple Name Inputs */}
          <div className="grid grid-cols-2 gap-3 bg-pink-50/50 p-3.5 rounded-2xl border border-pink-100/70">
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                내 이름 / 애칭
              </label>
              <input
                type="text"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="예: 지민"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                연인 이름 / 애칭
              </label>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="예: 민준"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">
              연인에게 남길 한 줄 메시지 (선택)
            </label>
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="예: 우리 이번 주말에 서로 속마음 맞춰보자 ❤️"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* Preview Card */}
          <div className="bg-gradient-to-br from-pink-50/80 via-white to-rose-50/50 p-4 rounded-2xl border border-pink-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span className="text-[11px] font-bold text-pink-700">
                초대장 미리보기
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              💌 <span className="font-bold text-pink-600">{myName}</span>님이{" "}
              <span className="font-bold text-blue-600">{partnerName}</span>님을{" "}
              <span className="font-extrabold text-gray-900">HeartSync 관계 정밀 진단</span>에 초대했습니다!
            </p>
            {customMsg && (
              <p className="text-xs text-pink-700 italic mt-1.5 bg-pink-100/60 px-2.5 py-1.5 rounded-lg border border-pink-200">
                "{customMsg}"
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-2">
              {partnerName}님이 참여하면 2인 듀얼 매칭 리포트가 즉시 잠금 해제됩니다.
            </p>
          </div>

          {/* Main Action 1: KakaoTalk Share (Yellow Button) */}
          <button
            onClick={handleKakaoShare}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-black text-sm bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] transition-all shadow-md active:scale-98"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.766 1.87 5.187 4.708 6.551-.194.698-.707 2.53-.81 2.923-.13.486.177.48.374.348.156-.104 2.47-1.69 3.475-2.378.736.104 1.493.158 2.253.158 5.523 0 10-3.477 10-7.767C22 6.477 17.523 3 12 3z" />
            </svg>
            <span>카카오톡으로 연인에게 1초 전송</span>
          </button>

          {/* Action 2: Link Copy + Message Copy (2-column) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50 text-gray-700 text-xs font-bold transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>초대 링크 복사</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopyMessage}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50 text-gray-700 text-xs font-bold transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5 text-pink-500" />
              <span>초대 문구 복사</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
