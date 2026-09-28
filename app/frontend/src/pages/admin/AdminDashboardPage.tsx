import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  CreditCard,
  MessageCircle,
  TrendingUp,
  Clock,
  User,
  ChevronRight,
  RefreshCw,
  Shield,
  Settings,
  UserCog,
  Activity,
} from 'lucide-react';
import { createClient } from '@metagptx/web-sdk';
import { toast } from 'sonner';

const client = createClient();

interface StatsData {
  totalDiagnoses: number;
  totalOrders: number;
  totalChatSessions: number;
  totalRevenue: number;
  recentOrders: any[];
  recentDiagnoses: any[];
}

interface AuditLogItem {
  id: number;
  admin_id: string;
  admin_email: string;
  action_type: string;
  target_type: string;
  target_id: string;
  description: string;
  details: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: '결제 완료', color: 'text-green-600', bg: 'bg-green-50' },
  pending: { label: '대기 중', color: 'text-amber-600', bg: 'bg-amber-50' },
  cancelled: { label: '취소됨', color: 'text-red-600', bg: 'bg-red-50' },
  refunded: { label: '환불됨', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const ACTION_TYPE_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  role_change: { label: '역할 변경', icon: UserCog, color: 'text-purple-600', bg: 'bg-purple-50' },
  setting_update: { label: '설정 수정', icon: Settings, color: 'text-blue-600', bg: 'bg-blue-50' },
  setting_add: { label: '설정 추가', icon: Settings, color: 'text-green-600', bg: 'bg-green-50' },
  setting_delete: { label: '설정 삭제', icon: Settings, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData>({
    totalDiagnoses: 0,
    totalOrders: 0,
    totalChatSessions: 0,
    totalRevenue: 0,
    recentOrders: [],
    recentDiagnoses: [],
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([loadStats(), loadAuditLogs()]);
  };

  const loadStats = async () => {
    try {
      const [diagnosesRes, ordersRes, chatRes] = await Promise.all([
        client.apiCall.invoke({
          url: '/api/v1/entities/diagnoses/all?sort=-created_at&limit=10',
          method: 'GET',
          data: {},
        }),
        client.apiCall.invoke({
          url: '/api/v1/entities/orders/all?sort=-created_at&limit=10',
          method: 'GET',
          data: {},
        }),
        client.apiCall.invoke({
          url: '/api/v1/entities/chat_sessions/all?sort=-created_at&limit=5',
          method: 'GET',
          data: {},
        }),
      ]);

      const orders = ordersRes.data?.items || [];
      const totalRevenue = orders
        .filter((o: any) => o.status === 'paid')
        .reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

      setStats({
        totalDiagnoses: diagnosesRes.data?.total || 0,
        totalOrders: ordersRes.data?.total || 0,
        totalChatSessions: chatRes.data?.total || 0,
        totalRevenue,
        recentOrders: orders.slice(0, 5),
        recentDiagnoses: (diagnosesRes.data?.items || []).slice(0, 5),
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      toast.error('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/entities/admin_audit_logs/all?sort=-created_at&limit=10',
        method: 'GET',
        data: {},
      });
      setAuditLogs(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('데이터가 새로고침되었습니다.');
  };

  const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`;

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return formatDateTime(dateStr);
  };

  const parseDetails = (details: string | null): Record<string, any> => {
    if (!details) return {};
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">서비스 현황을 한눈에 확인하세요</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={FileText}
          label="전체 진단"
          value={stats.totalDiagnoses.toString()}
          color="indigo"
        />
        <StatCard
          icon={CreditCard}
          label="전체 주문"
          value={stats.totalOrders.toString()}
          color="pink"
        />
        <StatCard
          icon={MessageCircle}
          label="채팅 세션"
          value={stats.totalChatSessions.toString()}
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="총 매출"
          value={formatCurrency(stats.totalRevenue)}
          color="amber"
        />
      </div>

      {/* Admin Audit Logs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500" />
            최근 관리 활동 로그
          </h3>
          <span className="text-xs text-gray-400">최근 10건</span>
        </div>
        <div className="divide-y divide-gray-50">
          {auditLogs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">관리 활동 기록이 없습니다</p>
            </div>
          ) : (
            auditLogs.map((log) => {
              const actionInfo = ACTION_TYPE_MAP[log.action_type] || {
                label: log.action_type,
                icon: Activity,
                color: 'text-gray-600',
                bg: 'bg-gray-50',
              };
              const ActionIcon = actionInfo.icon;
              const details = parseDetails(log.details);

              return (
                <div key={log.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${actionInfo.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <ActionIcon className={`w-4 h-4 ${actionInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${actionInfo.bg} ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {log.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" />
                          {log.admin_email}
                        </span>
                        {log.action_type === 'role_change' && details.old_role && (
                          <span className="text-[10px] text-gray-500">
                            {details.old_role} → {details.new_role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-pink-500" />
              최근 주문
            </h3>
            <span className="text-xs text-gray-400">최근 5건</span>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentOrders.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">주문 내역이 없습니다</p>
              </div>
            ) : (
              stats.recentOrders.map((order: any) => {
                const statusInfo = STATUS_MAP[order.status] || {
                  label: order.status,
                  color: 'text-gray-600',
                  bg: 'bg-gray-100',
                };
                return (
                  <div key={order.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {order.plan_name || order.plan_type}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5" />
                            {order.user_id?.slice(0, 8)}...
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDateTime(order.created_at)}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 ml-3">
                        {formatCurrency(order.amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Diagnoses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              최근 진단
            </h3>
            <span className="text-xs text-gray-400">최근 5건</span>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentDiagnoses.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">진단 기록이 없습니다</p>
              </div>
            ) : (
              stats.recentDiagnoses.map((diag: any) => {
                const score = diag.total_score || 0;
                const hasReport = !!diag.ai_report;
                let gradeColor = 'text-red-600';
                let gradeBg = 'bg-red-50';
                let gradeLabel = '위험';
                if (score >= 210) {
                  gradeColor = 'text-green-600';
                  gradeBg = 'bg-green-50';
                  gradeLabel = '매우 건강';
                } else if (score >= 175) {
                  gradeColor = 'text-blue-600';
                  gradeBg = 'bg-blue-50';
                  gradeLabel = '양호';
                } else if (score >= 140) {
                  gradeColor = 'text-amber-600';
                  gradeBg = 'bg-amber-50';
                  gradeLabel = '주의';
                }

                return (
                  <div key={diag.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-gray-900">
                            {score}점
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${gradeBg} ${gradeColor}`}
                          >
                            {gradeLabel}
                          </span>
                          {hasReport && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold rounded-full">
                              AI 리포트
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5" />
                            {diag.user_id?.slice(0, 8)}...
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDateTime(diag.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    pink: {
      bg: 'bg-pink-50',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
    },
    emerald: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  };

  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.iconColor}`} />
        </div>
      </div>
      <p className="text-xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}