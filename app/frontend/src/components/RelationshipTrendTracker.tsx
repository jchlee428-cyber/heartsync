import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Crown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  PlusCircle,
  Award,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import MiniDiagnosisModal from "./MiniDiagnosisModal";
import { getPlanUpgradeQuote, resolveLocalActivePlanType } from "@/lib/planUpgrade";

const client = createClient();

export interface TrendPoint {
  id: string | number;
  date: string;
  rawDate?: string;
  total_score: number;
  grade: string;
  scores: Record<string, number>;
  is_mini?: boolean;
}

interface TrendData {
  history: TrendPoint[];
  total_count: number;
  latest_score: number;
  previous_score?: number | null;
  score_change: number;
  conflict_improvement_pct: number;
  trend_status: "improving" | "stable" | "warning" | "baseline" | "empty";
  headline_insight: string;
  detailed_insight: string;
}

interface RelationshipTrendTrackerProps {
  onOpenAlimtalk?: () => void;
  currentDiagnosis?: any;
}

const CATEGORY_META: { key: string; label: string; emoji: string }[] = [
  { key: "conflict", label: "갈등 관리", emoji: "⚡" },
  { key: "intimacy", label: "정서적 친밀감", emoji: "💕" },
  { key: "trust", label: "신뢰/애착", emoji: "🤝" },
  { key: "values", label: "가치관", emoji: "🌟" },
  { key: "physical", label: "신체적 만족", emoji: "🔥" },
];

function computeGradeLabel(total: number, conflictScore?: number): string {
  if (total < 140 || (conflictScore !== undefined && conflictScore > 0 && conflictScore < 25)) {
    return total >= 140 ? "위험(갈등주의) 🔴" : "위험 🔴";
  }
  if (total >= 210) return "매우 건강 🟢";
  if (total >= 175) return "양호 🔵";
  return "주의 필요 🟡";
}

function getCategoryLevelBadge(score: number): { text: string; colorClass: string } {
  if (score >= 40) return { text: "매우 건강", colorClass: "text-emerald-600" };
  if (score >= 35) return { text: "양호", colorClass: "text-blue-600" };
  if (score >= 28) return { text: "주의 필요", colorClass: "text-amber-600" };
  return { text: "집중 케어", colorClass: "text-red-600" };
}

function formatShortDate(dateInput?: string, seqIndex?: number): string {
  const turnPrefix = seqIndex !== undefined ? `${seqIndex + 1}회차` : "";
  if (!dateInput) return turnPrefix || "최근";
  // If already formatted like "10.24"
  if (/^\d{2}\.\d{2}$/.test(dateInput)) {
    return turnPrefix ? `${turnPrefix} (${dateInput})` : dateInput;
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return turnPrefix ? `${turnPrefix}` : String(dateInput);
  }
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return turnPrefix ? `${turnPrefix} (${mm}.${dd})` : `${mm}.${dd}`;
}

function parseScoresObj(raw: any): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      conflict: Number(parsed.conflict) || 0,
      intimacy: Number(parsed.intimacy) || 0,
      trust: Number(parsed.trust) || 0,
      values: Number(parsed.values) || 0,
      physical: Number(parsed.physical) || 0,
    };
  } catch {
    return {};
  }
}

export default function RelationshipTrendTracker({
  currentDiagnosis,
}: RelationshipTrendTrackerProps) {
  const navigate = useNavigate();
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isMiniModalOpen, setIsMiniModalOpen] = useState(false);

  const buildAuthenticTrend = useCallback((serverPoints: any[]) => {
    const rawRecords: {
      id: string | number;
      created_at: string;
      total_score: number;
      scores: Record<string, number>;
      is_mini: boolean;
    }[] = [];

    // 1. Collect valid server points (filtering out any synthetic id=0 placeholder)
    for (const sp of serverPoints) {
      if (!sp || sp.id === 0 || sp.date === "진단 대기") continue;
      const scores = parseScoresObj(sp.scores);
      const total = Number(sp.total_score) || Object.values(scores).reduce((a, b) => a + b, 0);
      if (total > 0) {
        rawRecords.push({
          id: sp.id,
          created_at: sp.created_at || sp.date || "",
          total_score: total,
          scores,
          is_mini: Boolean(sp.is_mini),
        });
      }
    }

    // 2. Collect localStorage diagnoses & mini check-ins
    try {
      const localListRaw = localStorage.getItem("heartsync_local_diagnoses");
      if (localListRaw) {
        const localList = JSON.parse(localListRaw);
        if (Array.isArray(localList)) {
          for (const item of localList) {
            const scores = parseScoresObj(item?.scores);
            const total = Number(item?.total_score) || Object.values(scores).reduce((a, b) => a + b, 0);
            if (total > 0) {
              rawRecords.push({
                id: item.id || `local_${item.created_at}`,
                created_at: item.created_at || "",
                total_score: total,
                scores,
                is_mini: String(item.answers || "").includes("[MINI_CHECKIN]"),
              });
            }
          }
        }
      }
    } catch {}

    try {
      const lastRaw = localStorage.getItem("heartsync_last_diagnosis");
      if (lastRaw) {
        const lastItem = JSON.parse(lastRaw);
        const scores = parseScoresObj(lastItem?.scores);
        const total = Number(lastItem?.total_score) || Object.values(scores).reduce((a, b) => a + b, 0);
        if (total > 0) {
          rawRecords.push({
            id: lastItem.id || "last_local",
            created_at: lastItem.created_at || "",
            total_score: total,
            scores,
            is_mini: String(lastItem.answers || "").includes("[MINI_CHECKIN]"),
          });
        }
      }
    } catch {}

    try {
      const miniRaw = localStorage.getItem("heartsync_mini_checkins");
      if (miniRaw) {
        const miniList = JSON.parse(miniRaw);
        if (Array.isArray(miniList)) {
          for (const m of miniList) {
            const scores = parseScoresObj(m?.scores);
            const total = Number(m?.total_score) || Object.values(scores).reduce((a, b) => a + b, 0);
            if (total > 0) {
              rawRecords.push({
                id: m.id || `mini_${m.created_at}`,
                created_at: m.created_at || "",
                total_score: total,
                scores,
                is_mini: true,
              });
            }
          }
        }
      }
    } catch {}

    // 3. Include currentDiagnosis prop if passed from ResultPage
    if (currentDiagnosis) {
      const scores = parseScoresObj(currentDiagnosis.scores);
      const total =
        Number(currentDiagnosis.total_score) || Object.values(scores).reduce((a, b) => a + b, 0);
      if (total > 0) {
        rawRecords.push({
          id: currentDiagnosis.id || "current_diag",
          created_at: currentDiagnosis.created_at || new Date().toISOString(),
          total_score: total,
          scores,
          is_mini: String(currentDiagnosis.answers || "").includes("[MINI_CHECKIN]"),
        });
      }
    }

    // 4. Deduplicate records (by id, or by identical total_score + scores within the same minute)
    const deduped: typeof rawRecords = [];
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    for (const rec of rawRecords) {
      const idStr = String(rec.id);
      const dateMinute = rec.created_at ? String(rec.created_at).slice(0, 16) : "";
      const fingerprint = `${rec.total_score}_${rec.scores.conflict}_${rec.scores.intimacy}_${rec.scores.trust}_${dateMinute}`;

      if (idStr && idStr !== "undefined" && seenIds.has(idStr)) continue;
      if (dateMinute && seenFingerprints.has(fingerprint)) continue;

      if (idStr && idStr !== "undefined") seenIds.add(idStr);
      if (dateMinute) seenFingerprints.add(fingerprint);
      deduped.push(rec);
    }

    // Sort chronologically (oldest -> newest)
    deduped.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
        return ta - tb;
      }
      return 0;
    });

    // Keep up to the most recent 6 checkpoints for clean SVG visualization
    const recentRecords = deduped.slice(-6);

    if (recentRecords.length === 0) {
      setTrend({
        history: [],
        total_count: 0,
        latest_score: 0,
        previous_score: null,
        score_change: 0,
        conflict_improvement_pct: 0,
        trend_status: "empty",
        headline_insight: "아직 기록된 관계 진단 데이터가 없습니다.",
        detailed_insight:
          "50문항 정밀 진단 또는 우측 상단의 '3분 체크인'을 완료하시면 실제 점수를 기반으로 시계열 변화 그래프가 생성됩니다.",
      });
      return;
    }

    const historyPoints: TrendPoint[] = recentRecords.map((r, idx) => ({
      id: r.id,
      date: formatShortDate(r.created_at, idx),
      rawDate: r.created_at,
      total_score: r.total_score,
      grade: computeGradeLabel(r.total_score, r.scores.conflict),
      scores: r.scores,
      is_mini: r.is_mini,
    }));

    const latest = historyPoints[historyPoints.length - 1];
    const previous = historyPoints.length >= 2 ? historyPoints[historyPoints.length - 2] : null;

    // Case A: Only 1 diagnosis exists (Baseline — never show fake "improved by 15%" claims!)
    if (!previous) {
      const sortedCats = CATEGORY_META.map((c) => ({
        ...c,
        score: latest.scores[c.key] || 0,
      })).sort((a, b) => b.score - a.score);

      const strongest = sortedCats[0];
      const weakest = sortedCats[sortedCats.length - 1];

      setTrend({
        history: historyPoints,
        total_count: 1,
        latest_score: latest.total_score,
        previous_score: null,
        score_change: 0,
        conflict_improvement_pct: 0,
        trend_status: "baseline",
        headline_insight: `1회차 진단 기준점(${latest.total_score}점 · ${latest.grade})이 정확히 기록되었습니다 📊`,
        detailed_insight: `현재 가장 탄탄한 영역은 '${strongest.label}(${strongest.score}/50점)'이며, 우선적인 돌봄이 필요한 영역은 '${weakest.label}(${weakest.score}/50점)'입니다. 맞춤 실천 플랜을 적용한 뒤 [3분 체크인]으로 2회차 변화를 측정해보세요.`,
      });
      setActivePointIndex(0);
      return;
    }

    // Case B: 2 or more diagnoses exist — calculate 100% genuine score changes!
    const scoreChange = latest.total_score - previous.total_score;
    const latestConflict = latest.scores.conflict || 0;
    const prevConflict = previous.scores.conflict || 1;
    const conflictDiff = latestConflict - prevConflict;
    const conflictPct = Math.round((conflictDiff / Math.max(prevConflict, 1)) * 100);

    // Find the category with the biggest change
    let bestCatLabel = "갈등 관리";
    let bestCatDiff = conflictDiff;
    for (const c of CATEGORY_META) {
      const diff = (latest.scores[c.key] || 0) - (previous.scores[c.key] || 0);
      if (Math.abs(diff) > Math.abs(bestCatDiff)) {
        bestCatDiff = diff;
        bestCatLabel = c.label;
      }
    }

    let trendStatus: TrendData["trend_status"] = "stable";
    let headline = "";
    let detailed = "";

    if (scoreChange > 0) {
      trendStatus = "improving";
      headline = `직전 진단(${previous.total_score}점) 대비 종합 점수가 +${scoreChange}점 상승했습니다! 🎉`;
      detailed =
        bestCatDiff > 0
          ? `특히 '${bestCatLabel}' 영역이 직전보다 +${bestCatDiff}점 향상되며 관계 회복 탄력성이 실질적으로 개선되고 있습니다.`
          : `전반적인 영역에서 고른 점수 상승이 나타나며 안정적인 소통 흐름이 자리잡고 있습니다.`;
    } else if (scoreChange < 0) {
      trendStatus = "warning";
      headline = `직전 진단(${previous.total_score}점) 대비 종합 점수가 ${scoreChange}점 변화했습니다 ⚠️`;
      detailed =
        bestCatDiff < 0
          ? `최근 '${bestCatLabel}' 영역(${bestCatDiff}점)에서 관계 피로도가 감지되었습니다. 리포트의 실천 전략과 AI 코칭을 통해 소통 방식을 점검해보세요.`
          : `일시적인 스트레스나 갈등 여파로 점수가 다소 낮아졌습니다. 부드러운 시작 대화법으로 감정을 먼저다독여주세요.`;
    } else {
      trendStatus = "stable";
      headline = `직전 진단과 동일한 종합 ${latest.total_score}점(${latest.grade})을 유지하고 있습니다 🤝`;
      detailed = `큰 기복 없이 일관된 관계 흐름이 유지되고 있습니다. 가장 점수가 낮은 영역의 실천 과제를 하나씩 시도해 다음 단계로 도약해보세요.`;
    }

    setTrend({
      history: historyPoints,
      total_count: historyPoints.length,
      latest_score: latest.total_score,
      previous_score: previous.total_score,
      score_change: scoreChange,
      conflict_improvement_pct: conflictPct,
      trend_status: trendStatus,
      headline_insight: headline,
      detailed_insight: detailed,
    });
    setActivePointIndex(historyPoints.length - 1);
  }, [currentDiagnosis]);

  const fetchTrend = useCallback(async () => {
    setLoading(true);
    let serverHistory: any[] = [];
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/diagnoses/trend",
        method: "GET",
        data: {},
      });
      if (Array.isArray(res.data?.history)) {
        serverHistory = res.data.history;
      }
    } catch {
      // Backend unreachable or user not authenticated on server — use local diagnosis records
    } finally {
      buildAuthenticTrend(serverHistory);
      setLoading(false);
    }
  }, [buildAuthenticTrend]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  if (loading || !trend) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center py-12">
        <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-400">실제 진단 기록 기반 시계열 데이터를 불러오고 있습니다...</p>
      </div>
    );
  }

  const history = trend.history;
  const hasMultiple = history.length >= 2;
  const latestPoint = history.length > 0 ? history[history.length - 1] : null;
  const previousPoint = history.length >= 2 ? history[history.length - 2] : null;
  const activePoint =
    history.length > 0
      ? activePointIndex !== null && history[activePointIndex]
        ? history[activePointIndex]
        : latestPoint
      : null;

  // SVG Chart Dimensions — dynamically scaled to actual score range
  const svgWidth = 400;
  const svgHeight = 155;
  const padX = 48;
  const padY = 28;

  const minScore = 50;
  const maxScore = 250;

  const pointsCoords = history.map((pt, idx) => {
    const x =
      history.length === 1
        ? svgWidth / 2
        : padX + (idx / (history.length - 1)) * (svgWidth - padX * 2);
    const clamped = Math.max(minScore, Math.min(maxScore, pt.total_score));
    const y =
      svgHeight - padY - ((clamped - minScore) / (maxScore - minScore)) * (svgHeight - padY * 2);
    return { x, y, pt, idx };
  });

  let pathD = "";
  if (pointsCoords.length === 1) {
    pathD = `M ${padX} ${pointsCoords[0].y} L ${svgWidth - padX} ${pointsCoords[0].y}`;
  } else if (pointsCoords.length > 1) {
    pathD = pointsCoords.reduce((acc, curr, i) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      const prev = pointsCoords[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, "");
  }

  const areaD =
    pointsCoords.length > 1
      ? `${pathD} L ${pointsCoords[pointsCoords.length - 1].x} ${svgHeight - 12} L ${pointsCoords[0].x} ${svgHeight - 12} Z`
      : "";

  const bannerTheme =
    trend.trend_status === "warning"
      ? {
          box: "from-amber-50 via-orange-50/70 to-amber-50/40 border-amber-200/90",
          iconBg: "bg-amber-500",
          titleColor: "text-amber-950",
          descColor: "text-amber-800",
          Icon: AlertTriangle,
        }
      : trend.trend_status === "baseline" || trend.trend_status === "empty"
      ? {
          box: "from-blue-50 via-indigo-50/60 to-blue-50/40 border-blue-200/90",
          iconBg: "bg-blue-500",
          titleColor: "text-blue-950",
          descColor: "text-blue-800",
          Icon: BarChart3,
        }
      : {
          box: "from-emerald-50 via-teal-50 to-emerald-50/50 border-emerald-200/80",
          iconBg: "bg-emerald-500",
          titleColor: "text-emerald-900",
          descColor: "text-emerald-700",
          Icon: Award,
        };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-pink-100 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-black text-gray-900">관계 변화 추적 그래프</h3>
              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-black">
                실측 데이터 연동
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              내 실제 진단 기록({history.length}회)을 기반으로 산출되는 시계열 분석
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsMiniModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold text-xs flex items-center gap-1 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>3분 체크인</span>
        </button>
      </div>

      {/* ── Key Highlight Banner (실제 점수 기반 인사이트) ── */}
      <div className={`bg-gradient-to-r ${bannerTheme.box} rounded-2xl p-4 border shadow-xs`}>
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-xl ${bannerTheme.iconBg} flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm`}
          >
            <bannerTheme.Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black ${bannerTheme.titleColor} leading-snug`}>
              {trend.headline_insight}
            </p>
            <p className={`text-[11px] ${bannerTheme.descColor} mt-1 leading-relaxed`}>
              {trend.detailed_insight}
            </p>
          </div>
        </div>
      </div>

      {/* ── SVG Time-Series Chart ── */}
      {history.length > 0 && (
        <div className="relative bg-gradient-to-b from-gray-50/80 to-white rounded-2xl p-3 border border-gray-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 px-2 mb-1">
            <span>
              관계 점수 변화 곡선 {history.length === 1 ? "(1회차 기준점)" : `(총 ${history.length}회 기록)`}
            </span>
            <span className="text-pink-600 font-extrabold">
              현재 {trend.latest_score}점 / 250점
            </span>
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Reference Grid lines */}
            <line
              x1={padX}
              y1={padY}
              x2={svgWidth - padX}
              y2={padY}
              stroke="#f3f4f6"
              strokeDasharray="3 3"
            />
            <line
              x1={padX}
              y1={svgHeight / 2}
              x2={svgWidth - padX}
              y2={svgHeight / 2}
              stroke="#f3f4f6"
              strokeDasharray="3 3"
            />
            <line
              x1={padX}
              y1={svgHeight - padY}
              x2={svgWidth - padX}
              y2={svgHeight - padY}
              stroke="#f3f4f6"
            />

            {/* Area fill */}
            {areaD && <path d={areaD} fill="url(#trendGradient)" />}

            {/* Line stroke (dashed baseline if only 1 point, solid curve if >= 2 points) */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#ec4899"
                strokeWidth={pointsCoords.length === 1 ? "2" : "3.5"}
                strokeDasharray={pointsCoords.length === 1 ? "6 4" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {pointsCoords.map(({ x, y, pt, idx }) => {
              const isSelected =
                activePointIndex === idx ||
                (activePointIndex === null && idx === history.length - 1);
              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => setActivePointIndex(idx)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 8 : 5}
                    fill="#ffffff"
                    stroke={isSelected ? "#ec4899" : "#f43f5e"}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-200"
                  />
                  {isSelected && <circle cx={x} cy={y} r={3} fill="#ec4899" />}

                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#1f2937"
                  >
                    {pt.total_score}점
                  </text>

                  <text
                    x={x}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#6b7280"
                    fontWeight={isSelected ? "bold" : "normal"}
                  >
                    {pt.date}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Selected Point Detail Card */}
          {activePoint && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-pink-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-gray-900">{activePoint.date}</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 font-bold text-[10px]">
                  {activePoint.total_score}점 ({activePoint.grade})
                </span>
                {activePoint.is_mini ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold">
                    3분 체크인
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-bold">
                    50문항 정밀진단
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                갈등 {activePoint.scores?.conflict || 0}/50 · 친밀{" "}
                {activePoint.scores?.intimacy || 0}/50 · 신뢰 {activePoint.scores?.trust || 0}/50
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5대 영역별 실제 점수 및 변화율 지표 ── */}
      {latestPoint && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-black text-gray-800 flex items-center justify-between">
            <span>{hasMultiple ? "5대 영역별 실측 변화 지표" : "5대 영역별 현재 기준점 (1회차)"}</span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {hasMultiple && previousPoint
                ? `직전 검사(${previousPoint.date}) 대비 실제 증감`
                : "다음 체크인 시 영역별 증감률 자동 계산"}
            </span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {CATEGORY_META.map((cat) => {
              const currVal = latestPoint.scores?.[cat.key] || 0;
              const prevVal = previousPoint?.scores?.[cat.key];

              if (hasMultiple && prevVal !== undefined && prevVal > 0) {
                const diff = currVal - prevVal;
                const pct = Math.round((diff / prevVal) * 100);
                return (
                  <div
                    key={cat.key}
                    className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between"
                  >
                    <span className="text-gray-700 font-bold flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      <span className="text-[10px] text-gray-400 font-medium">({currVal}/50)</span>
                    </span>
                    {diff > 0 ? (
                      <span className="font-extrabold text-emerald-600 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5" />+{diff}점 ({pct > 0 ? `+${pct}%` : ""})
                      </span>
                    ) : diff < 0 ? (
                      <span className="font-extrabold text-red-500 flex items-center gap-0.5">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {diff}점 ({pct}%)
                      </span>
                    ) : (
                      <span className="font-bold text-gray-500 flex items-center gap-0.5">
                        <Minus className="w-3 h-3" />
                        유지 (0%)
                      </span>
                    )}
                  </div>
                );
              }

              // Single baseline diagnosis view: show real score & status badge honestly
              const badge = getCategoryLevelBadge(currVal);
              return (
                <div
                  key={cat.key}
                  className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between"
                >
                  <span className="text-gray-700 font-bold flex items-center gap-1.5">
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </span>
                  <span className={`font-extrabold ${badge.colorClass} flex items-center gap-1`}>
                    <span>{currVal}/50점</span>
                    <span className="text-[10px] opacity-85">· {badge.text}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 30일 올케어 패스 업셀링 / 활성 상태 배너 ── */}
      {(() => {
        const activePlanType = resolveLocalActivePlanType();
        const vipQuote = getPlanUpgradeQuote("couple_premium", activePlanType);

        if (vipQuote.isCurrentPlan) {
          return (
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-300 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-white">
                    30일 관계 개선 올케어 패스 VIP 이용 중
                  </p>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    30일간 무제한 시계열 재진단 및 AI 1:1 코칭이 활성화되어 있습니다.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 rounded-full flex-shrink-0">
                활성됨 ✅
              </span>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-300 animate-pulse" />
                <span className="text-xs font-black tracking-wide text-amber-300 uppercase">
                  ALL-CARE VIP SUBSCRIPTION
                </span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full">
                {vipQuote.isUpgrade
                  ? `기결제 -₩${vipQuote.creditFormatted} 차감`
                  : "38% 특별 할인"}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-black text-white leading-snug">
                {vipQuote.isUpgrade
                  ? `30일 관계 개선 올케어 패스 업그레이드 (차액 ₩${vipQuote.finalPriceFormatted})`
                  : "30일 관계 개선 올케어 패스 (₩49,000)"}
              </h4>
              <p className="text-[11px] text-purple-200 mt-1 leading-relaxed">
                {vipQuote.isUpgrade
                  ? `현재 이용 중인 ${vipQuote.activePlanName} 결제 금액(₩${vipQuote.creditFormatted})을 차감하고 차액만 결제하여 30일 무제한 추적으로 전환합니다.`
                  : "무제한 시계열 재진단 + 매주 갈등 변화 리포트 + AI 1:1 맞춤 코칭을 30일간 지속 제공합니다."}
              </p>
            </div>

            <button
              onClick={() => navigate("/pricing")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>
                {vipQuote.isUpgrade
                  ? `₩${vipQuote.finalPriceFormatted} 차액 결제로 30일 올케어 업그레이드`
                  : "30일 올케어로 무제한 추적 시작하기"}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Mini Diagnosis Modal */}
      <MiniDiagnosisModal
        isOpen={isMiniModalOpen}
        onClose={() => setIsMiniModalOpen(false)}
        onSuccess={() => fetchTrend()}
      />
    </div>
  );
}
