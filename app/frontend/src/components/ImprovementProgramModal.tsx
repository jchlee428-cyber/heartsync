import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  MessageSquareQuote,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  PlanDuration,
  StepPracticeStatus,
  RelationshipProgramPlan,
  loadOrCreateProgramPlan,
  saveProgramPlan,
  updateProgramStepStatus,
  getProgramProgressSummary,
  resolveCurrentUserId,
} from "@/lib/improvementProgram";

interface ImprovementProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores?: Record<string, number> | null;
  onAskCoachAboutStep?: (promptText: string) => void;
}

const STATUS_BADGES: Record<
  StepPracticeStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "실천 전",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  completed: {
    label: "✅ 실천 완료",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  partial: {
    label: "🟡 부분 실천",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  struggled: {
    label: "💬 어려움 겪음 (AI 조정됨)",
    className: "bg-pink-50 text-pink-700 border-pink-200",
  },
};

export default function ImprovementProgramModal({
  isOpen,
  onClose,
  scores,
  onAskCoachAboutStep,
}: ImprovementProgramModalProps) {
  const userId = resolveCurrentUserId();
  const [plan, setPlan] = useState<RelationshipProgramPlan>(() =>
    loadOrCreateProgramPlan(userId, scores)
  );
  const [activeTab, setActiveTab] = useState<PlanDuration>(plan.activeDuration);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const loaded = loadOrCreateProgramPlan(userId, scores);
      setPlan(loaded);
      setActiveTab(loaded.activeDuration);
    }
  }, [isOpen, userId, scores]);

  const handleSwitchDuration = (duration: PlanDuration) => {
    setActiveTab(duration);
    const updated = { ...plan, activeDuration: duration };
    saveProgramPlan(updated);
    setPlan(updated);
  };

  const handleStatusChange = (stepId: string, status: StepPracticeStatus) => {
    const updated = updateProgramStepStatus(userId, activeTab, stepId, status);
    setPlan({ ...updated });
    if (status === "completed") {
      toast.success("실천 완료로 기록되었습니다! 다음 단계 제안이 활성화되었어요 🎉");
    } else if (status === "struggled") {
      toast.info("어려움을 겪으셨군요! AI 코치가 부담을 낮춘 대안 행동으로 계획을 자동 조정했습니다 💡");
    } else if (status === "partial") {
      toast.success("부분 실천 기록이 저장되었습니다. 작은 시도도 큰 변화의 시작이에요!");
    }
  };

  const handleSaveNote = (stepId: string) => {
    const steps = activeTab === "7d" ? plan.sevenDaySteps : plan.thirtyDaySteps;
    const currentStep = steps.find((s) => s.id === stepId);
    if (!currentStep) return;

    const updated = updateProgramStepStatus(
      userId,
      activeTab,
      stepId,
      currentStep.status,
      noteInput.trim()
    );
    setPlan({ ...updated });
    setEditingNoteId(null);
    toast.success("실천 기록 메모가 저장되었습니다.");
  };

  const steps = activeTab === "7d" ? plan.sevenDaySteps : plan.thirtyDaySteps;
  const progress = getProgramProgressSummary({ ...plan, activeDuration: activeTab });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-pink-100 rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
              <Calendar className="w-3 h-3" />
              맞춤형 관계 개선 프로그램 (STEP 7)
            </span>
            <span className="text-[11px] font-bold bg-white/15 px-2.5 py-0.5 rounded-full">
              핵심 집중: {plan.focusLabel}
            </span>
          </div>
          <DialogTitle className="text-lg font-black text-white">
            7일 단기 집중 & 30일 관계 체질 개선 플랜
          </DialogTitle>
          <DialogDescription className="text-white/85 text-xs mt-1">
            진단 결과와 AI 코칭 내용을 바탕으로 생성된 맞춤 실천 계획입니다. 진행 상황에 따라 AI가 난이도를 자동 조정합니다.
          </DialogDescription>

          {/* Duration Switcher */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 bg-black/15 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleSwitchDuration("7d")}
              className={`py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === "7d"
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              🔥 7일 단기 집중 계획
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDuration("30d")}
              className={`py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === "30d"
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              🌱 30일(4주) 체질 개선 계획
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>
                실천 달성률 ({progress.completedCount}/{progress.totalSteps} 완료
                {progress.struggledCount > 0 ? ` · AI 조정 ${progress.struggledCount}건` : ""})
              </span>
              <span>{progress.completionRate}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps List */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-gray-50/60">
          {steps.map((step) => {
            const badge = STATUS_BADGES[step.status];
            return (
              <div
                key={step.id}
                className={`rounded-2xl p-4 bg-white border shadow-xs transition-all space-y-2.5 ${
                  step.status === "completed"
                    ? "border-emerald-200 bg-emerald-50/20"
                    : step.status === "struggled"
                      ? "border-pink-200 bg-pink-50/20"
                      : "border-gray-100"
                }`}
              >
                {/* Step Title & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[10px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full mb-1">
                      {step.dayOrPhaseLabel}
                    </span>
                    <h4 className="text-sm font-extrabold text-gray-900">{step.title}</h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* 1. 개선 목표 & 2. 구체적인 행동 */}
                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="font-bold text-gray-800 mb-0.5">🎯 개선 목표</p>
                    <p className="text-gray-600 leading-relaxed">{step.goal}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-pink-50/50 border border-pink-100">
                    <p className="font-bold text-pink-700 mb-0.5">⚡ 구체적인 행동</p>
                    <p className="text-gray-700 leading-relaxed">{step.action}</p>
                  </div>
                </div>

                {/* 3. 실행 방법 및 대화 예시 */}
                <div className="p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100 text-xs">
                  <p className="font-bold text-indigo-700 mb-1 flex items-center gap-1">
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    실행 방법 & 실전 대화 예시
                  </p>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{step.howTo}</p>
                </div>

                {/* 4. 예상되는 어려움 */}
                <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                  <p className="font-bold text-amber-800 mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    예상되는 어려움 & 대처법
                  </p>
                  <p className="text-gray-600 leading-relaxed">{step.expectedObstacle}</p>
                </div>

                {/* AI Dynamic Adjustment Box (shown when struggled / adjusted) */}
                {step.isAdjustedByAi && step.adjustmentNote && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 text-xs space-y-1">
                    <p className="font-extrabold text-pink-700 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      진행 상황에 따른 AI 맞춤 계획 조정
                    </p>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {step.adjustmentNote}
                    </p>
                  </div>
                )}

                {/* 6. 다음 단계 제안 */}
                <div className="flex items-start gap-1.5 text-[11px] text-gray-500 bg-gray-50 px-2.5 py-2 rounded-xl">
                  <ArrowRight className="w-3.5 h-3.5 text-pink-500 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-700">다음 단계 제안:</strong> {step.nextStepSuggestion}
                  </span>
                </div>

                {/* 5. 실천 여부 기록 버튼 & 메모 */}
                <div className="pt-1 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-pink-500" />
                      실천 여부 기록:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(step.id, "completed")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          step.status === "completed"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-emerald-50"
                        }`}
                      >
                        ✅ 완료
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(step.id, "partial")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          step.status === "partial"
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-amber-50"
                        }`}
                      >
                        🟡 부분 실천
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(step.id, "struggled")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          step.status === "struggled"
                            ? "bg-pink-600 text-white border-pink-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-pink-50"
                        }`}
                      >
                        💬 어려움(난이도 조정)
                      </button>
                    </div>
                  </div>

                  {/* Practice note & Ask AI Coach */}
                  <div className="flex items-center justify-between gap-2">
                    {editingNoteId === step.id ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="실천 후 느낀 점이나 상대 반응을 짧게 기록해보세요"
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-pink-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(step.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-pink-500 text-white text-[11px] font-bold"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(step.id);
                          setNoteInput(step.practiceNote || "");
                        }}
                        className="text-[11px] text-gray-500 hover:text-pink-600 underline"
                      >
                        {step.practiceNote
                          ? `📝 기록: "${step.practiceNote}" (수정)`
                          : "+ 실천 메모 남기기"}
                      </button>
                    )}

                    {onAskCoachAboutStep && (
                      <button
                        type="button"
                        onClick={() => {
                          onAskCoachAboutStep(
                            `[${step.dayOrPhaseLabel}: ${step.title}] 과제를 실천하려고 하는데, 우리 상황에 맞게 대화법이나 실행 방법을 조금 더 구체적으로 코칭해줄 수 있을까요?`
                          );
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 text-[11px] font-bold flex-shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                        이 단계 AI 코칭받기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
