import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, LogOut, FileText, Calendar, ChevronRight, User, RefreshCw, CheckCircle, XCircle, Clock, Wifi, WifiOff, Trash2, BarChart3, TrendingUp, Activity, Sparkles, GitCompareArrows, MessageCircle, Bot, Star, CreditCard, Receipt, Crown, ShieldCheck, Bell, BellRing, CheckCheck, Eye, AlertTriangle } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";
import LoginModal from "@/components/LoginModal";

const client = createClient();

const categoryInfo: Record<string, { label: string; emoji: string }> = {
  conflict: { label: "갈등 관리", emoji: "⚡" },
  intimacy: { label: "친밀감", emoji: "💕" },
  trust: { label: "신뢰", emoji: "🤝" },
  values: { label: "가치관", emoji: "🌟" },
  physical: { label: "신체적", emoji: "🔥" },
};

function getOverallGrade(total: number) {
  if (total >= 210) return { grade: "매우 건강 🟢", color: "text-green-600", bg: "bg-green-50" };
  if (total >= 175) return { grade: "양호 🔵", color: "text-blue-600", bg: "bg-blue-50" };
  if (total >= 140) return { grade: "주의 필요 🟡", color: "text-amber-600", bg: "bg-amber-50" };
  return { grade: "위험 🔴", color: "text-red-600", bg: "bg-red-50" };
}

interface SyncLog {
  id: number;
  status: string;
  attempt_count: number;
  error_message: string;
  sync_type: string;
  created_at: string;
}

interface DayTrend {
  label: string;
  total: number;
  success: number;
  failed: number;
}

/** Build last 7 days trend from sync logs */
function buildWeeklyTrend(logs: SyncLog[]): DayTrend[] {
  const days: DayTrend[] = [];
  const now = new Date();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayLabel = i === 0 ? "오늘" : i === 1 ? "어제" : dayNames[d.getDay()];

    const dayLogs = logs.filter((l) => {
      if (!l.created_at) return false;
      const logDate = l.created_at.slice(0, 10);
      return logDate === dateKey;
    });

    days.push({
      label: dayLabel,
      total: dayLogs.length,
      success: dayLogs.filter((l) => l.status === "success").length,
      failed: dayLogs.filter((l) => l.status === "failed").length,
    });
  }
  return days;
}

interface Order {
  id: number;
  plan_type: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface ActivePlan {
  plan_type: string;
  plan_name: string;
  analyses_remaining: number;
  is_active: boolean;
  expires_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "결제 완료", color: "text-green-600", bg: "bg-green-50" },
  pending: { label: "대기 중", color: "text-amber-600", bg: "bg-amber-50" },
  cancelled: { label: "취소됨", color: "text-red-600", bg: "bg-red-50" },
  refunded: { label: "환불됨", color: "text-gray-600", bg: "bg-gray-100" },
};

const PLAN_GRADIENT: Record<string, string> = {
  single_analysis: "from-blue-500 to-cyan-500",
  monthly_subscription: "from-pink-500 to-rose-500",
  couple_premium: "from-purple-500 to-pink-500",
};

export default function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [allSyncLogs, setAllSyncLogs] = useState<SyncLog[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [chatRatings, setChatRatings] = useState<Record<number, number>>({});
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncLogsExpanded, setSyncLogsExpanded] = useState(false);
  const [isCleaningLogs, setIsCleaningLogs] = useState(false);
  const autoCleanupDoneRef = useRef(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      let currentUser: any = null;
      try {
        const res = await client.auth.me();
        if (res?.data) {
          currentUser = res.data;
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch {
        // Backend offline
      }
      if (!currentUser) {
        const cached = localStorage.getItem("user");
        if (cached) {
          try {
            currentUser = JSON.parse(cached);
          } catch {
            currentUser = { name: "회원", role: "user" };
          }
        }
      }
      if (currentUser) {
        setUser(currentUser);
        await Promise.all([
          loadDiagnoses(),
          loadSyncLogs(),
          loadChatSessions(),
          loadChatRatings(),
          loadOrders(),
          loadActivePlan(),
          loadNotifications(),
        ]).catch(() => {});
        // Auto-cleanup old logs (30+ days) once per session
        if (!autoCleanupDoneRef.current) {
          autoCleanupDoneRef.current = true;
          autoCleanupOldLogs();
        }
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const loadDiagnoses = async () => {
    try {
      const response = await client.entities.diagnoses.query({
        query: {},
        sort: "-created_at",
        limit: 50,
      });
      setDiagnoses(response.data?.items || []);
    } catch {
      toast.error("진단 기록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const response = await client.entities.sync_logs.query({
        query: {},
        sort: "-created_at",
        limit: 200,
      });
      const items = response.data?.items || [];
      setAllSyncLogs(items);
      setSyncLogs(items.slice(0, 20));
    } catch {
      // Sync logs loading failure is non-critical
    }
  };

  const loadChatSessions = async () => {
    try {
      const response = await client.entities.chat_sessions.query({
        query: {},
        sort: "-updated_at",
        limit: 10,
      });
      setChatSessions(response.data?.items || []);
    } catch {
      // Non-critical
    }
  };

  const loadChatRatings = async () => {
    try {
      const response = await client.entities.chat_ratings.query({
        query: {},
        sort: "-created_at",
        limit: 100,
      });
      const items = response.data?.items || [];
      const ratingsMap: Record<number, number> = {};
      let sum = 0;
      for (const r of items) {
        ratingsMap[r.session_id] = r.rating;
        sum += r.rating || 0;
      }
      setChatRatings(ratingsMap);
      setTotalRatings(items.length);
      setAvgRating(items.length > 0 ? sum / items.length : null);
    } catch {
      // Non-critical
    }
  };

  const loadOrders = async () => {
    try {
      const response = await client.entities.orders.query({
        query: {},
        sort: "-created_at",
        limit: 50,
      });
      setOrders(response.data?.items || []);
    } catch {
      // Non-critical
    }
  };

  const loadActivePlan = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/payment/my-plan",
        method: "GET",
        data: {},
      });
      if (res.data) {
        setActivePlan(res.data);
      }
    } catch {
      // Non-critical
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/notifications/list",
        method: "GET",
        data: {},
      });
      if (res.data) {
        setNotifications(res.data.items || []);
        setUnreadNotifCount(res.data.unread_count || 0);
      }
    } catch {
      // Non-critical
    }
  };

  const handleMarkNotifRead = async (notifId: number) => {
    try {
      await client.apiCall.invoke({
        url: "/api/v1/notifications/mark-read",
        method: "POST",
        data: { notification_id: notifId },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("알림 읽음 처리에 실패했습니다.");
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await client.apiCall.invoke({
        url: "/api/v1/notifications/mark-all-read",
        method: "POST",
        data: {},
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
      toast.success("모든 알림을 읽음 처리했습니다.");
    } catch {
      toast.error("알림 읽음 처리에 실패했습니다.");
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "report_ready":
        return "📊";
      case "weekly_checkpoint":
        return "📅";
      default:
        return "🔔";
    }
  };

  const getNotifBg = (type: string, isRead: boolean) => {
    if (isRead) return "bg-gray-50 border-gray-100";
    switch (type) {
      case "report_ready":
        return "bg-pink-50/70 border-pink-200";
      case "weekly_checkpoint":
        return "bg-blue-50/70 border-blue-200";
      default:
        return "bg-amber-50/70 border-amber-200";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "krw") {
      return `₩${amount.toLocaleString()}`;
    }
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatTimeAgo = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  /** Auto-cleanup: silently remove logs older than 30 days */
  const autoCleanupOldLogs = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/sync-logs/cleanup",
        method: "POST",
        data: {},
      });
      const deleted = response?.data?.deleted_count ?? 0;
      if (deleted > 0) {
        // Refresh the list after cleanup
        await loadSyncLogs();
      }
    } catch {
      // Silent failure — auto-cleanup is non-critical
    }
  };

  /** Manual: clear ALL sync logs */
  const handleClearAllLogs = async () => {
    setIsCleaningLogs(true);
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/sync-logs/clear-all",
        method: "DELETE",
        data: {},
      });
      const deleted = response?.data?.deleted_count ?? 0;
      setSyncLogs([]);
      setAllSyncLogs([]);
      toast.success(`동기화 로그 ${deleted}건이 삭제되었습니다.`);
    } catch {
      toast.error("로그 정리에 실패했습니다.");
    } finally {
      setIsCleaningLogs(false);
    }
  };

  /** Manual: cleanup only 30+ day old logs */
  const handleCleanupOldLogs = async () => {
    setIsCleaningLogs(true);
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/sync-logs/cleanup",
        method: "POST",
        data: {},
      });
      const deleted = response?.data?.deleted_count ?? 0;
      if (deleted > 0) {
        await loadSyncLogs();
        toast.success(`30일 이상 된 로그 ${deleted}건이 삭제되었습니다.`);
      } else {
        toast.info("30일 이상 된 로그가 없습니다.");
      }
    } catch {
      toast.error("로그 정리에 실패했습니다.");
    } finally {
      setIsCleaningLogs(false);
    }
  };

  // ── Analytics computed from all sync logs ──
  const analytics = useMemo(() => {
    if (allSyncLogs.length === 0) return null;
    const total = allSyncLogs.length;
    const successCount = allSyncLogs.filter((l) => l.status === "success").length;
    const failedCount = total - successCount;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
    const avgRetry = total > 0
      ? (allSyncLogs.reduce((sum, l) => sum + (l.attempt_count || 0), 0) / total).toFixed(1)
      : "0";
    const weeklyTrend = buildWeeklyTrend(allSyncLogs);
    const maxDayTotal = Math.max(...weeklyTrend.map((d) => d.total), 1);
    return { total, successCount, failedCount, successRate, avgRetry, weeklyTrend, maxDayTotal };
  }, [allSyncLogs]);

  const handleDeleteDiagnosis = async (id: number) => {
    setIsDeleting(true);
    try {
      await client.entities.diagnoses.delete({ id: String(id) });
      setDiagnoses((prev) => prev.filter((d) => d.id !== id));
      toast.success("진단 기록이 삭제되었습니다.");
    } catch {
      toast.error("진단 기록 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await client.auth.logout();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("token");
    localStorage.setItem("isLougOutManual", "true");
    setUser(null);
    setDiagnoses([]);
    toast.success("로그아웃되었습니다.");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
          <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-base font-bold text-foreground">마이페이지</span>
          <div className="w-9" />
        </div>
      </header>

      <main className="pt-16 pb-32 px-5 max-w-lg mx-auto">
        {/* Profile Section */}
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border mt-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-foreground">회원</p>
                <p className="text-xs text-muted-foreground mt-0.5">진단 {diagnoses.length}회 완료</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">로그인하고 진단 기록을 확인하세요</p>
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                <Heart className="w-4 h-4" />
                로그인
              </button>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        {user && notifications.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setNotificationsExpanded(!notificationsExpanded)}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  {unreadNotifCount > 0 ? (
                    <BellRing className="w-4 h-4 text-pink-500" />
                  ) : (
                    <Bell className="w-4 h-4 text-pink-500" />
                  )}
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5">
                      {unreadNotifCount}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900">알림</h3>
                <span className="text-[10px] text-gray-400 font-normal">
                  ({notifications.length}건)
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    notificationsExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>
              {unreadNotifCount > 0 && (
                <button
                  onClick={handleMarkAllNotifsRead}
                  className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold hover:text-pink-600 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  모두 읽음
                </button>
              )}
            </div>

            {notificationsExpanded && (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-xl p-3.5 border transition-all ${getNotifBg(
                      notif.type,
                      notif.is_read
                    )} ${!notif.is_read ? "shadow-sm" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getNotifIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p
                            className={`text-xs font-semibold truncate pr-2 ${
                              notif.is_read ? "text-gray-500" : "text-gray-800"
                            }`}
                          >
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />
                          )}
                        </div>
                        <p
                          className={`text-[11px] leading-relaxed ${
                            notif.is_read ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {notif.created_at && (
                            <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTimeAgo(notif.created_at)}
                            </span>
                          )}
                          {notif.week_number && (
                            <span className="text-[9px] text-blue-500 font-medium px-1.5 py-0.5 bg-blue-50 rounded-full">
                              {notif.week_number}주차
                            </span>
                          )}
                          {notif.type === "report_ready" && notif.related_id && (
                            <button
                              onClick={() =>
                                navigate(`/result/${notif.related_id}`)
                              }
                              className="text-[9px] text-pink-500 font-semibold flex items-center gap-0.5 hover:text-pink-600"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              리포트 보기
                            </button>
                          )}
                        </div>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkNotifRead(notif.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                          title="읽음 처리"
                        >
                          <CheckCircle className="w-4 h-4 text-gray-400 hover:text-green-500 transition-colors" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Diagnosis History */}
        {user && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-500" />
              진단 기록
            </h3>

            {loading ? (
              <div className="text-center py-10">
                <Heart className="w-8 h-8 text-pink-400 animate-pulse mx-auto mb-2" />
                <p className="text-gray-400 text-sm">불러오는 중...</p>
              </div>
            ) : diagnoses.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">아직 진단 기록이 없습니다</p>
                <button
                  onClick={() => navigate("/diagnosis")}
                  className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-pink-100 transition-colors"
                >
                  첫 진단 시작하기
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {diagnoses.map((d) => {
                  const overall = getOverallGrade(d.total_score || 0);
                  const scores = typeof d.scores === "string" ? JSON.parse(d.scores || "{}") : d.scores || {};
                  const hasAiReport = !!d.ai_report && d.ai_report.length > 0;
                  return (
                    <div
                      key={d.id}
                      className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-400">{formatDate(d.created_at)}</span>
                          {hasAiReport && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold rounded-full">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI 리포트
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${overall.bg} ${overall.color}`}>
                            {overall.grade}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(d.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/result/${d.id}`)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-extrabold text-gray-900">{d.total_score || 0}</span>
                            <span className="text-xs text-gray-400">/ 250</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {Object.entries(scores).map(([cat, score]) => {
                                const info = categoryInfo[cat];
                                if (!info) return null;
                                return (
                                  <span key={cat} className="text-xs" title={`${info.label}: ${score}`}>
                                    {info.emoji}
                                  </span>
                                );
                              })}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Compare Reports Button */}
        {user && diagnoses.length >= 2 && (
          <div className="mt-4">
            <button
              onClick={() => navigate("/compare")}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <GitCompareArrows className="w-4 h-4" />
              리포트 비교하기
            </button>
          </div>
        )}

        {/* Payment & Plan Section */}
        {user && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-pink-500" />
              결제 및 플랜
            </h3>

            {/* Active Plan Card */}
            {activePlan && activePlan.is_active && activePlan.plan_type !== "free" ? (
              <div className={`bg-gradient-to-r ${PLAN_GRADIENT[activePlan.plan_type] || "from-pink-500 to-rose-500"} rounded-2xl p-5 shadow-lg mb-3 text-white`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    <span className="text-sm font-bold">{activePlan.plan_name}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    활성
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-white/70 mb-0.5">남은 분석 횟수</p>
                    <p className="text-lg font-extrabold">
                      {activePlan.analyses_remaining >= 999 ? "무제한" : `${activePlan.analyses_remaining}회`}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-white/70 mb-0.5">만료일</p>
                    {activePlan.expires_at ? (
                      <>
                        <p className="text-sm font-bold">{activePlan.expires_at}</p>
                        {(() => {
                          const days = getDaysRemaining(activePlan.expires_at);
                          if (days === null) return null;
                          return (
                            <p className={`text-[10px] font-medium mt-0.5 ${days <= 7 ? "text-yellow-200" : "text-white/70"}`}>
                              {days > 0 ? `${days}일 남음` : "만료됨"}
                            </p>
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-sm font-bold">무기한</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">무료 체험</p>
                      <p className="text-[11px] text-gray-400">프리미엄 플랜으로 업그레이드하세요</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full hover:shadow-lg transition-all"
                  >
                    업그레이드
                  </button>
                </div>
              </div>
            )}

            {/* Order History */}
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setOrdersExpanded(!ordersExpanded)}
                className="flex items-center gap-1.5"
              >
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-gray-400" />
                  결제 내역
                  {orders.length > 0 && (
                    <span className="text-[10px] text-gray-400 font-normal">({orders.length}건)</span>
                  )}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${ordersExpanded ? "rotate-90" : ""}`} />
              </button>
              <button
                onClick={() => navigate("/payment-history")}
                className="text-[11px] text-pink-500 font-semibold hover:text-pink-600 transition-colors"
              >
                전체 보기 →
              </button>
            </div>

            {ordersExpanded && (
              <div className="space-y-2 mt-2">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 text-center">
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs">결제 내역이 없습니다</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600", bg: "bg-gray-100" };
                    const gradient = PLAN_GRADIENT[order.plan_type] || "from-gray-400 to-gray-500";
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                              <CreditCard className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{order.plan_name || order.plan_type}</p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {formatDateTime(order.created_at)}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <span className="text-xs text-gray-400">결제 금액</span>
                          <span className="text-sm font-extrabold text-gray-900">
                            {formatCurrency(order.amount, order.currency || "krw")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat History Section */}
        {user && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-pink-500" />
                상담 기록
              </h3>
              <button
                onClick={() => navigate("/chatbot")}
                className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold hover:text-pink-600"
              >
                새 상담 시작 →
              </button>
            </div>

            {/* Satisfaction Stats Card */}
            {totalRatings > 0 && avgRating !== null && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">상담 만족도</p>
                      <p className="text-[10px] text-gray-500">{totalRatings}회 평가</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-extrabold text-amber-600">{avgRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">/ 5</span>
                    </div>
                    <div className="flex items-center gap-0.5 justify-end mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {chatSessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 text-center">
                <Bot className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-xs mb-3">아직 상담 기록이 없습니다</p>
                <button
                  onClick={() => navigate("/chatbot")}
                  className="inline-flex items-center gap-1.5 bg-pink-50 text-pink-600 font-semibold text-xs px-4 py-2 rounded-full hover:bg-pink-100 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  AI 코치와 상담하기
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/chatbot?sessionId=${session.id}`)}
                    className="w-full bg-white rounded-xl p-3.5 shadow-sm border border-gray-50 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-semibold text-gray-800 truncate pr-2">
                            {session.title || "상담 대화"}
                          </p>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                          {session.last_message_preview || "대화를 시작해보세요"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(session.updated_at || session.created_at)}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {session.message_count || 0}개 메시지
                          </span>
                          {chatRatings[session.id] && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {chatRatings[session.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync Analytics Dashboard */}
        {user && analytics && analytics.total > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-pink-500" />
              동기화 대시보드
            </h3>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-50">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {/* Success Rate */}
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke={analytics.successRate >= 80 ? "#22c55e" : analytics.successRate >= 50 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${(analytics.successRate / 100) * 175.93} 175.93`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-gray-900">
                      {analytics.successRate}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">성공률</p>
                </div>

                {/* Average Retry */}
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-2">
                    <div>
                      <Activity className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                      <span className="text-lg font-extrabold text-gray-900">{analytics.avgRetry}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">평균 재시도</p>
                </div>

                {/* Total Count */}
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center mb-2">
                    <div>
                      <TrendingUp className="w-4 h-4 text-pink-500 mx-auto mb-0.5" />
                      <span className="text-lg font-extrabold text-gray-900">{analytics.total}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">전체 동기화</p>
                </div>
              </div>

              {/* Success / Failed counts */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-green-700">{analytics.successCount}건 성공</span>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-700">{analytics.failedCount}건 실패</span>
                </div>
              </div>

              {/* 7-Day Trend Chart */}
              <div>
                <p className="text-[11px] font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-400" />
                  최근 7일 동기화 추이
                </p>
                <div className="flex items-end gap-1.5 h-28">
                  {analytics.weeklyTrend.map((day, idx) => {
                    const successH = day.total > 0 ? (day.success / analytics.maxDayTotal) * 100 : 0;
                    const failedH = day.total > 0 ? (day.failed / analytics.maxDayTotal) * 100 : 0;
                    const isEmpty = day.total === 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        {/* Tooltip */}
                        {!isEmpty && (
                          <span className="text-[9px] font-bold text-gray-500">{day.total}</span>
                        )}
                        {/* Stacked bar */}
                        <div className="w-full flex flex-col items-center justify-end flex-1">
                          {isEmpty ? (
                            <div className="w-full max-w-[28px] h-1 bg-gray-100 rounded-full" />
                          ) : (
                            <div className="w-full max-w-[28px] flex flex-col justify-end rounded-lg overflow-hidden"
                              style={{ height: `${Math.max(successH + failedH, 8)}%` }}
                            >
                              {failedH > 0 && (
                                <div
                                  className="w-full bg-red-400 transition-all duration-300"
                                  style={{ height: `${(day.failed / day.total) * 100}%`, minHeight: "3px" }}
                                />
                              )}
                              {successH > 0 && (
                                <div
                                  className="w-full bg-green-400 transition-all duration-300"
                                  style={{ height: `${(day.success / day.total) * 100}%`, minHeight: "3px" }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Day label */}
                        <span className={`text-[9px] font-medium ${day.label === "오늘" ? "text-pink-500 font-bold" : "text-gray-400"}`}>
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-green-400" />
                    <span className="text-[9px] text-gray-400">성공</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                    <span className="text-[9px] text-gray-400">실패</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sync Status Section */}
        {user && syncLogs.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setSyncLogsExpanded(!syncLogsExpanded)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-pink-500" />
                동기화 상태
                <span className="text-[10px] text-gray-400 font-normal">({syncLogs.length}건)</span>
              </h3>
              <div className="flex items-center gap-2">
                {/* Summary badge */}
                {(() => {
                  const lastLog = syncLogs[0];
                  const isSuccess = lastLog?.status === "success";
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSuccess ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}>
                      {isSuccess ? "최근 성공" : "최근 실패"}
                    </span>
                  );
                })()}
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${syncLogsExpanded ? "rotate-90" : ""}`} />
              </div>
            </button>

            {syncLogsExpanded && (
              <div className="space-y-2">
                {/* Cleanup action buttons */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={handleCleanupOldLogs}
                    disabled={isCleaningLogs}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <Clock className={`w-3.5 h-3.5 ${isCleaningLogs ? "animate-spin" : ""}`} />
                    {isCleaningLogs ? "정리 중..." : "30일 이전 정리"}
                  </button>
                  <button
                    onClick={handleClearAllLogs}
                    disabled={isCleaningLogs}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-red-500 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isCleaningLogs ? "animate-spin" : ""}`} />
                    {isCleaningLogs ? "삭제 중..." : "전체 삭제"}
                  </button>
                </div>

                {syncLogs.map((log) => {
                  const isSuccess = log.status === "success";
                  const isManual = log.sync_type === "manual";
                  const date = log.created_at ? new Date(log.created_at) : null;
                  const timeStr = date
                    ? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
                    : "";

                  return (
                    <div
                      key={log.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        isSuccess
                          ? "bg-green-50/50 border-green-100"
                          : "bg-red-50/50 border-red-100"
                      }`}
                    >
                      {/* Status icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSuccess ? "bg-green-100" : "bg-red-100"
                      }`}>
                        {isSuccess ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${isSuccess ? "text-green-700" : "text-red-700"}`}>
                            {isSuccess ? "동기화 성공" : "동기화 실패"}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                            isManual ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                          }`}>
                            {isManual ? "수동" : "자동"}
                          </span>
                          {log.attempt_count > 0 && (
                            <span className="text-[9px] text-gray-400">
                              재시도 {log.attempt_count}회
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-400">{timeStr}</span>
                        </div>
                        {!isSuccess && log.error_message && (
                          <p className="text-[10px] text-red-400 mt-0.5 truncate">{log.error_message}</p>
                        )}
                      </div>

                      {/* Connection icon */}
                      {isSuccess ? (
                        <Wifi className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate("/diagnosis")}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm py-3.5 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01] transition-all"
          >
            <Heart className="w-4 h-4" />
            새 진단 시작하기
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              진단 기록을 삭제하시겠습니까?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              삭제된 기록은 복구할 수 없습니다. AI 리포트도 함께 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteDiagnosis(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => checkAuth()}
      />
    </div>
  );
}