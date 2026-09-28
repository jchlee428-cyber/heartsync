import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, BarChart3, TrendingUp, TrendingDown, Minus, CheckCircle2, Shield, AlertTriangle, Calendar, ChevronDown, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";

const client = createClient();

const categoryInfo: Record<string, { label: string; subtitle: string; emoji: string; color: string }> = {
  conflict: { label: "갈등 관리", subtitle: "소통 패턴", emoji: "⚡", color: "#f59e0b" },
  intimacy: { label: "정서적 친밀감", subtitle: "우정", emoji: "💕", color: "#ec4899" },
  trust: { label: "신뢰/애착", subtitle: "안정감", emoji: "🤝", color: "#3b82f6" },
  values: { label: "가치관", subtitle: "공유 의미", emoji: "🌟", color: "#8b5cf6" },
  physical: { label: "신체적 만족", subtitle: "성적 친밀감", emoji: "🔥", color: "#ef4444" },
};

function getOverallGrade(total: number) {
  if (total >= 210) return { grade: "매우 건강", label: "🟢", color: "text-green-600", bg: "bg-green-50", icon: <CheckCircle2 className="w-4 h-4" /> };
  if (total >= 175) return { grade: "양호", label: "🔵", color: "text-blue-600", bg: "bg-blue-50", icon: <Shield className="w-4 h-4" /> };
  if (total >= 140) return { grade: "주의 필요", label: "🟡", color: "text-amber-600", bg: "bg-amber-50", icon: <Shield className="w-4 h-4" /> };
  return { grade: "위험", label: "🔴", color: "text-red-600", bg: "bg-red-50", icon: <AlertTriangle className="w-4 h-4" /> };
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getDiffIcon(diff: number) {
  if (diff > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (diff < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
}

function getDiffColor(diff: number) {
  if (diff > 0) return "text-green-600";
  if (diff < 0) return "text-red-600";
  return "text-gray-400";
}

function getDiffBg(diff: number) {
  if (diff > 0) return "bg-green-50";
  if (diff < 0) return "bg-red-50";
  return "bg-gray-50";
}

interface Diagnosis {
  id: string;
  total_score: number;
  scores: Record<string, number> | string;
  created_at: string;
  ai_report?: string;
}

export default function ComparePage() {
  const navigate = useNavigate();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");
  const [showPickerA, setShowPickerA] = useState(false);
  const [showPickerB, setShowPickerB] = useState(false);

  useEffect(() => {
    loadDiagnoses();
  }, []);

  const loadDiagnoses = async () => {
    try {
      const user = await client.auth.me();
      if (!user?.data) {
        toast.error("로그인이 필요합니다.");
        navigate("/");
        return;
      }
      const response = await client.entities.diagnoses.query({
        query: {},
        sort: "-created_at",
        limit: 50,
      });
      const items: Diagnosis[] = response.data?.items || [];
      setDiagnoses(items);

      // Auto-select latest two if available
      if (items.length >= 2) {
        setSelectedA(String(items[1].id));
        setSelectedB(String(items[0].id));
      } else if (items.length === 1) {
        setSelectedA(String(items[0].id));
      }
    } catch {
      toast.error("데이터를 불러올 수 없습니다.");
      navigate("/my");
    } finally {
      setLoading(false);
    }
  };

  const diagA = useMemo(() => diagnoses.find((d) => String(d.id) === selectedA), [diagnoses, selectedA]);
  const diagB = useMemo(() => diagnoses.find((d) => String(d.id) === selectedB), [diagnoses, selectedB]);

  const scoresA = useMemo(() => {
    if (!diagA) return {} as Record<string, number>;
    return typeof diagA.scores === "string" ? JSON.parse(diagA.scores) : diagA.scores;
  }, [diagA]);

  const scoresB = useMemo(() => {
    if (!diagB) return {} as Record<string, number>;
    return typeof diagB.scores === "string" ? JSON.parse(diagB.scores) : diagB.scores;
  }, [diagB]);

  const totalA = diagA?.total_score || 0;
  const totalB = diagB?.total_score || 0;
  const totalDiff = totalB - totalA;

  const canCompare = diagA && diagB && selectedA !== selectedB;

  // Compute per-category diffs
  const categoryDiffs = useMemo(() => {
    if (!canCompare) return [];
    return Object.keys(categoryInfo).map((cat) => {
      const a = Number(scoresA[cat] || 0);
      const b = Number(scoresB[cat] || 0);
      return { cat, a, b, diff: b - a };
    });
  }, [canCompare, scoresA, scoresB]);

  // Summary insights
  const insights = useMemo(() => {
    if (!canCompare || categoryDiffs.length === 0) return [];
    const msgs: string[] = [];

    if (totalDiff > 0) {
      msgs.push(`종합 점수가 ${totalDiff}점 상승했습니다! 관계가 개선되고 있는 긍정적인 신호입니다.`);
    } else if (totalDiff < 0) {
      msgs.push(`종합 점수가 ${Math.abs(totalDiff)}점 하락했습니다. 최근 관계에서 어려움이 있었을 수 있습니다.`);
    } else {
      msgs.push("종합 점수에 변화가 없습니다. 관계가 안정적으로 유지되고 있습니다.");
    }

    const improved = categoryDiffs.filter((c) => c.diff > 0).sort((a, b) => b.diff - a.diff);
    const declined = categoryDiffs.filter((c) => c.diff < 0).sort((a, b) => a.diff - b.diff);

    if (improved.length > 0) {
      const best = improved[0];
      const info = categoryInfo[best.cat];
      msgs.push(`${info.emoji} ${info.label} 영역이 +${best.diff}점으로 가장 크게 개선되었습니다.`);
    }
    if (declined.length > 0) {
      const worst = declined[0];
      const info = categoryInfo[worst.cat];
      msgs.push(`${info.emoji} ${info.label} 영역이 ${worst.diff}점으로 가장 많이 하락했습니다. 집중적인 관심이 필요합니다.`);
    }

    return msgs;
  }, [canCompare, categoryDiffs, totalDiff]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-pink-50/30 to-white">
        <div className="text-center">
          <Heart className="w-10 h-10 text-pink-500 animate-pulse mx-auto mb-3" />
          <p className="text-gray-500 text-sm">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (diagnoses.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
          <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
            <button onClick={() => navigate("/my")} className="p-2 rounded-full hover:bg-pink-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-base font-bold text-gray-900">리포트 비교</span>
            <div className="w-9" />
          </div>
        </header>
        <main className="pt-16 pb-32 px-5 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-50 text-center mt-8">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-700 mb-2">비교할 진단이 부족합니다</p>
            <p className="text-xs text-gray-400 mb-6">리포트를 비교하려면 최소 2회 이상의 진단이 필요합니다.</p>
            <button
              onClick={() => navigate("/diagnosis")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <Heart className="w-4 h-4" />
              진단 시작하기
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
          <button onClick={() => navigate("/my")} className="p-2 rounded-full hover:bg-pink-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-base font-bold text-gray-900">리포트 비교</span>
          <div className="w-9" />
        </div>
      </header>

      <main className="pt-16 pb-32 px-5 max-w-lg mx-auto">
        {/* Selection Area */}
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {/* Picker A (Before) */}
          <div className="relative">
            <button
              onClick={() => { setShowPickerA(!showPickerA); setShowPickerB(false); }}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                selectedA ? "border-blue-200 bg-blue-50/50" : "border-gray-200 bg-white"
              }`}
            >
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">이전</p>
              {diagA ? (
                <>
                  <p className="text-lg font-extrabold text-gray-900">{totalA}<span className="text-xs text-gray-400 font-normal">/250</span></p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(diagA.created_at)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">선택하세요</p>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute top-3 right-3" />
            </button>

            {showPickerA && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowPickerA(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-gray-100 max-h-52 overflow-y-auto">
                  {diagnoses.map((d) => {
                    const grade = getOverallGrade(d.total_score || 0);
                    const isSelected = String(d.id) === selectedA;
                    const isDisabled = String(d.id) === selectedB;
                    return (
                      <button
                        key={d.id}
                        disabled={isDisabled}
                        onClick={() => { setSelectedA(String(d.id)); setShowPickerA(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                          isSelected ? "bg-blue-50" : isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <span className="text-sm font-bold text-gray-800">{d.total_score || 0}</span>
                          <span className="text-[10px] text-gray-400 ml-1">/250</span>
                          <span className="text-[10px] text-gray-400 ml-2">{formatDate(d.created_at)}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${grade.color}`}>{grade.grade}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-pink-500" />
            </div>
          </div>

          {/* Picker B (After) */}
          <div className="relative">
            <button
              onClick={() => { setShowPickerB(!showPickerB); setShowPickerA(false); }}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                selectedB ? "border-pink-200 bg-pink-50/50" : "border-gray-200 bg-white"
              }`}
            >
              <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1">이후</p>
              {diagB ? (
                <>
                  <p className="text-lg font-extrabold text-gray-900">{totalB}<span className="text-xs text-gray-400 font-normal">/250</span></p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(diagB.created_at)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">선택하세요</p>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute top-3 right-3" />
            </button>

            {showPickerB && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowPickerB(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-gray-100 max-h-52 overflow-y-auto">
                  {diagnoses.map((d) => {
                    const grade = getOverallGrade(d.total_score || 0);
                    const isSelected = String(d.id) === selectedB;
                    const isDisabled = String(d.id) === selectedA;
                    return (
                      <button
                        key={d.id}
                        disabled={isDisabled}
                        onClick={() => { setSelectedB(String(d.id)); setShowPickerB(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                          isSelected ? "bg-pink-50" : isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <span className="text-sm font-bold text-gray-800">{d.total_score || 0}</span>
                          <span className="text-[10px] text-gray-400 ml-1">/250</span>
                          <span className="text-[10px] text-gray-400 ml-2">{formatDate(d.created_at)}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${grade.color}`}>{grade.grade}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Comparison Results */}
        {canCompare && (
          <>
            {/* Total Score Comparison */}
            <div className="mt-6 bg-white rounded-2xl p-5 shadow-md border border-gray-50">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-pink-500" />
                종합 점수 변화
              </h3>

              <div className="flex items-center justify-between mb-4">
                {/* Score A */}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-blue-500 mb-1">이전</p>
                  <p className="text-3xl font-extrabold text-gray-900">{totalA}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${getOverallGrade(totalA).bg} ${getOverallGrade(totalA).color}`}>
                    {getOverallGrade(totalA).icon}
                    {getOverallGrade(totalA).grade}
                  </div>
                </div>

                {/* Diff */}
                <div className={`flex flex-col items-center px-4 py-3 rounded-xl ${getDiffBg(totalDiff)}`}>
                  {getDiffIcon(totalDiff)}
                  <span className={`text-xl font-extrabold ${getDiffColor(totalDiff)}`}>
                    {totalDiff > 0 ? `+${totalDiff}` : totalDiff === 0 ? "±0" : totalDiff}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium">점 변화</span>
                </div>

                {/* Score B */}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-pink-500 mb-1">이후</p>
                  <p className="text-3xl font-extrabold text-gray-900">{totalB}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${getOverallGrade(totalB).bg} ${getOverallGrade(totalB).color}`}>
                    {getOverallGrade(totalB).icon}
                    {getOverallGrade(totalB).grade}
                  </div>
                </div>
              </div>

              {/* Total score bar comparison */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-500 font-bold w-8">이전</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${(totalA / 250) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-pink-500 font-bold w-8">이후</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-400 rounded-full transition-all duration-700" style={{ width: `${(totalB / 250) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Category-by-Category Comparison */}
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                영역별 비교
              </h3>

              {categoryDiffs.map(({ cat, a, b, diff }) => {
                const info = categoryInfo[cat];
                if (!info) return null;
                return (
                  <div key={cat} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.emoji}</span>
                        <div>
                          <span className="text-sm font-bold text-gray-800">{info.label}</span>
                          <span className="text-[10px] text-gray-400 ml-1">{info.subtitle}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getDiffBg(diff)} ${getDiffColor(diff)}`}>
                        {getDiffIcon(diff)}
                        {diff > 0 ? `+${diff}` : diff === 0 ? "±0" : diff}
                      </div>
                    </div>

                    {/* Dual bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-blue-500 font-semibold w-12">{a}/50</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${(a / 50) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-pink-500 font-semibold w-12">{b}/50</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-400 rounded-full transition-all duration-700" style={{ width: `${(b / 50) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Radar-style Summary */}
            <div className="mt-4 bg-white rounded-2xl p-5 shadow-md border border-gray-50">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-pink-500" />
                변화 요약
              </h3>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {categoryDiffs.map(({ cat, diff }) => {
                  const info = categoryInfo[cat];
                  if (!info) return null;
                  return (
                    <div key={cat} className="text-center">
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-1 ${getDiffBg(diff)}`}>
                        <span className={`text-sm font-extrabold ${getDiffColor(diff)}`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? "0" : diff}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-medium leading-tight block">{info.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-400" />
                  <span className="text-[10px] text-gray-500">이전 ({formatDate(diagA!.created_at)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-pink-400" />
                  <span className="text-[10px] text-gray-500">이후 ({formatDate(diagB!.created_at)})</span>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {insights.length > 0 && (
              <div className="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  변화 인사이트
                </h3>
                <div className="space-y-2.5">
                  {insights.map((msg, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <span className="text-[10px] font-bold text-purple-500">{idx + 1}</span>
                      </div>
                      <p className="text-[12px] text-gray-700 leading-relaxed">{msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate(`/result/${selectedB}`)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                최신 리포트 상세 보기
              </button>
              <button
                onClick={() => navigate("/diagnosis")}
                className="w-full flex items-center justify-center gap-2 bg-white text-pink-600 font-bold text-sm py-3.5 rounded-xl border-2 border-pink-200 hover:bg-pink-50 transition-all"
              >
                <Heart className="w-4 h-4" />
                새 진단 시작하기
              </button>
            </div>
          </>
        )}

        {/* Not enough selection */}
        {!canCompare && diagnoses.length >= 2 && (
          <div className="mt-8 bg-white rounded-2xl p-8 shadow-md border border-gray-50 text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">비교할 두 개의 진단을 선택해주세요</p>
            <p className="text-xs text-gray-400 mt-1">같은 진단은 비교할 수 없습니다</p>
          </div>
        )}
      </main>
    </div>
  );
}