import { useState } from "react";
import {
  Lock,
  Sparkles,
  Crown,
  ChevronRight,
  Shield,
  Zap,
  Star,
  AlertTriangle,
  Heart,
  Eye,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface BlurPaywallSectionProps {
  totalScore: number;
  scores: Record<string, number>;
  weakestArea: string;
  diagnosisId: string;
  onUnlock: () => void;
  onSimulatedUnlock?: () => void;
  onInvitePartner: () => void;
}

export default function BlurPaywallSection({
  totalScore,
  scores,
  weakestArea,
  diagnosisId,
  onUnlock,
  onSimulatedUnlock,
  onInvitePartner,
}: BlurPaywallSectionProps) {
  const isHighRisk = totalScore < 175;

  return (
    <div className="mt-8 space-y-6">
      {/* ── Teaser Intro Header ── */}
      <div className="text-center space-y-1.5 px-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100/80 text-pink-700 text-xs font-black mb-1">
          <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
          AI 심리학 심층 솔루션 리포트
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          여기서부터 두 사람의 <span className="text-pink-600">진짜 속마음</span>이 밝혀집니다
        </h2>
        <p className="text-xs text-gray-500 font-medium">
          단순한 점수 확인을 넘어, 이별 위험을 막고 관계를 회복시키는 맞춤 처방전입니다
        </p>

        {/* ── Test Mode Simulation Banner ── */}
        {onSimulatedUnlock && (
          <div className="pt-2">
            <button
              onClick={onSimulatedUnlock}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-extrabold text-xs shadow-md shadow-orange-200 active:scale-98 transition-all flex items-center justify-center gap-2 border border-amber-300"
            >
              <span>🧪 [테스트 모드] 1초 가상 결제로 즉시 잠금 해제 & PDF 체험 (과금 0원)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Card 1: 상대방의 진짜 서운함 1위 (Highest Curiosity Trigger) ── */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-pink-200 bg-white p-5 sm:p-6 shadow-xl">
        {/* Lock Overlay Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-base">
              🤫
            </span>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-pink-500">
                TOP SECRET INSIGHT
              </span>
              <h3 className="text-base font-extrabold text-gray-900">
                상대방이 차마 말하지 못한 '진짜 서운함' 1위
              </h3>
            </div>
          </div>
          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-black rounded-full shadow-2xs">
            <Lock className="w-3 h-3" />
            잠김
          </span>
        </div>

        {/* Blurred Content */}
        <div className="relative py-2 select-none">
          <p className="text-sm text-gray-800 leading-relaxed filter blur-[5px] pointer-events-none">
            진단 데이터 정밀 분석 결과, 상대방은 최근 대화 과정에서 당신의 무의식적인 특정 말투와 침묵 반응에서 '내 감정이 온전히 인정받지 못하고 있다'는 소외감을 강하게 느낀 것으로 파악되었습니다. 겉으로는 일상적인 대화를 나누고 있지만, 내면에는 '말해도 바뀌지 않을 것 같다'는 체념적 갈등 회피 패턴이 누적되어 있어 즉각적인 솔루션 조율이 필요합니다.
          </p>

          {/* Frosted Glass Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-lg mb-2">
              <Eye className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-800 mb-2">
              상대방이 마음에 묻어둔 핵심 결핍과 서운함 확인하기
            </p>
            <button
              onClick={onUnlock}
              className="py-2 px-4 rounded-xl text-xs font-black bg-pink-600 hover:bg-pink-700 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>19,900원에 속마음 잠금 해제</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Card 2: 이별 위험도 & 가트맨 4대 독소 치명도 ── */}
      <div className="relative overflow-hidden rounded-3xl border border-red-100 bg-white p-5 sm:p-6 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-base">
              ⚠️
            </span>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-red-500">
                CRITICAL RELATIONSHIP INDEX
              </span>
              <h3 className="text-base font-extrabold text-gray-900">
                이별 위험도 & 가트맨 4대 독소 치명도 분석
              </h3>
            </div>
          </div>
          <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-[11px] font-black rounded-full">
            <Lock className="w-3 h-3" />
            위험 지표
          </span>
        </div>

        {/* Blurred Content */}
        <div className="relative py-2 select-none">
          <p className="text-sm text-gray-800 leading-relaxed filter blur-[5px] pointer-events-none">
            존 가트맨 박사의 3,000쌍 커플 데이터 기준, 현재 두 사람의 갈등 관리 점수는 4대 관계 파탄 독소(비난·경멸·방어·담쌓기) 중 특히 <strong>'방어적 회피'와 '감정적 단절'</strong>이 위험 임계점(76점)을 초과한 상태입니다. 이 패턴이 지속될 경우 3개월 이내에 정서적 유대가 급격히 식어 회복 불능 상태에 빠질 확률이 매우 높게 측정되었습니다.
          </p>

          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-xl p-4 text-center">
            <span className="text-xs font-bold text-gray-800 mb-2">
              🚨 우리 커플의 이별 위험도와 갈등 취약점 수치 확인
            </span>
            <button
              onClick={onUnlock}
              className="py-2 px-4 rounded-xl text-xs font-black bg-gray-900 hover:bg-black text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-pink-400" />
              <span>위험 수치 및 방어 전략 열람</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Card 3: 당장 이번 주말 화해 대화법 가이드 (Practical Solution) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-white p-5 sm:p-6 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-base">
              💬
            </span>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-purple-600">
                ACTIONABLE CONVERSATION SCRIPT
              </span>
              <h3 className="text-base font-extrabold text-gray-900">
                [이번 주말 즉시 처방] 싸움 없이 풀리는 '화해 대화법'
              </h3>
            </div>
          </div>
          <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-black rounded-full">
            <Lock className="w-3 h-3" />
            처방전
          </span>
        </div>

        {/* Blurred Content */}
        <div className="relative py-2 select-none">
          <p className="text-sm text-gray-800 leading-relaxed filter blur-[5px] pointer-events-none">
            상대방의 마음을 열기 위해 주말에 먼저 건네야 할 최적의 첫 마디: "지난번 대화 때 네가 한 말이 계속 마음에 남았어. 내 입장을 변명하려는 게 아니라, 네가 어떤 마음이었는지 제대로 듣고 싶어." 이후 이어지는 3단계 감정 은행 입금 프로세스와 상대방의 회피 반응을 부드럽게 무장 해제시키는 화해 시도(Repair Attempt) 매뉴얼 전문이 수록되어 있습니다.
          </p>

          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-xl p-4 text-center">
            <span className="text-xs font-bold text-gray-800 mb-2">
              💡 싸우지 않고 감정을 전하는 1:1 대화 스크립트 전문
            </span>
            <button
              onClick={onUnlock}
              className="py-2 px-4 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>화해 스크립트 전체 잠금 해제</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Partner Viral Invite Banner (Feature 2 Integration) ── */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-[10px] font-black tracking-wide">
              👥 2인 커플 듀얼 매칭
            </span>
            <h3 className="text-lg font-black tracking-tight">
              연인도 검사하면 '서로의 시선 차이'가 열립니다!
            </h3>
            <p className="text-xs text-white/90">
              내가 생각한 우리 vs 연인이 생각한 우리! 카카오톡으로 1초 초대장을 보내보세요.
            </p>
          </div>
          <button
            onClick={onInvitePartner}
            className="flex-shrink-0 py-3 px-5 rounded-2xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] text-xs font-black shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.766 1.87 5.187 4.708 6.551-.194.698-.707 2.53-.81 2.923-.13.486.177.48.374.348.156-.104 2.47-1.69 3.475-2.378.736.104 1.493.158 2.253.158 5.523 0 10-3.477 10-7.767C22 6.477 17.523 3 12 3z" />
            </svg>
            <span>연인에게 1초 초대장 보내기</span>
          </button>
        </div>
      </div>

      {/* ── Social Proof & Trust Badges ── */}
      <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {["bg-rose-400", "bg-purple-400", "bg-blue-400", "bg-pink-400"].map((c, i) => (
              <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white flex items-center justify-center text-[10px] text-white font-bold`}>
                {["김", "이", "박", "최"][i]}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-600">
            <span className="font-extrabold text-gray-900">4,382쌍</span>의 커플이 이번 달 솔루션을 열람했습니다
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-3.5 h-3.5 fill-current" />
          ))}
          <span className="text-gray-700 ml-1">4.9 / 5.0 만족도</span>
        </div>
      </div>

      {/* ── High-Converting Sticky Bottom Floating CTA Banner ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-pink-200/80 p-3.5 sm:p-4 shadow-2xl">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                31% 특가
              </span>
              <span className="text-xs text-gray-400 line-through">29,000원</span>
              <span className="text-sm font-black text-rose-600">19,900원</span>
            </div>
            <p className="text-[11px] text-gray-600 truncate font-semibold">
              🔒 전체 솔루션 + AI 챗봇 코칭 영구 소장
            </p>
          </div>

          <button
            onClick={onUnlock}
            className="flex-shrink-0 py-3.5 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-black text-sm shadow-lg shadow-pink-300 active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>즉시 잠금 해제</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
