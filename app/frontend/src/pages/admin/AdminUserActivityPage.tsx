import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  LogIn,
  Stethoscope,
  CreditCard,
  MessageCircle,
  Clock,
  Mail,
  Shield,
  User,
  RefreshCw,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { createClient } from '@metagptx/web-sdk';
import { toast } from 'sonner';

const client = createClient();

interface ActivityLogItem {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string | null;
  metadata: Record<string, any> | null;
}

interface UserActivityData {
  user_id: string;
  user_email: string;
  user_name: string | null;
  user_role: string;
  user_created_at: string | null;
  activities: ActivityLogItem[];
  total: number;
  stats: {
    diagnosis_count: number;
    order_count: number;
    chat_count: number;
    total_spent: number;
  };
}

const typeConfig: Record<
  string,
  { icon: any; label: string; color: string; bg: string }
> = {
  login: {
    icon: LogIn,
    label: '로그인',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  diagnosis: {
    icon: Stethoscope,
    label: '진단',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  payment: {
    icon: CreditCard,
    label: '결제',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  chat: {
    icon: MessageCircle,
    label: '채팅',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
};

export default function AdminUserActivityPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('');

  const loadActivity = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { limit: 200 };
      if (activeFilter) params.activity_type = activeFilter;

      const res = await client.apiCall.invoke({
        url: `/api/v1/admin/activity/${userId}`,
        method: 'GET',
        data: params,
      });

      const result = (res?.data || res) as UserActivityData;
      setData(result);
    } catch (err: any) {
      console.error('[AdminUserActivityPage] Error:', err);
      const detail =
        err?.response?.data?.detail || err?.message || 'Unknown error';
      setError(detail);
      toast.error('활동 로그를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId, activeFilter]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 30) return `${diffDay}일 전`;
    return formatDateTime(dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">활동 로그 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-4">
            {error || '데이터를 불러올 수 없습니다.'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              목록으로
            </button>
            <button
              onClick={loadActivity}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filters = [
    { key: '', label: '전체', count: data.total },
    { key: 'login', label: '로그인', count: null },
    { key: 'diagnosis', label: '진단', count: data.stats.diagnosis_count },
    { key: 'payment', label: '결제', count: data.stats.order_count },
    { key: 'chat', label: '채팅', count: data.stats.chat_count },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            사용자 활동 로그
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            사용자의 모든 활동 이력을 확인합니다
          </p>
        </div>
        <button
          onClick={loadActivity}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* User info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              data.user_role === 'admin' ? 'bg-indigo-100' : 'bg-gray-100'
            }`}
          >
            {data.user_role === 'admin' ? (
              <Shield className="w-6 h-6 text-indigo-600" />
            ) : (
              <User className="w-6 h-6 text-gray-500" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {data.user_name || '이름 없음'}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {data.user_email}
            </p>
          </div>
          <span
            className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
              data.user_role === 'admin'
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {data.user_role === 'admin' ? '관리자' : '일반 사용자'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Stethoscope}
            label="진단 횟수"
            value={`${data.stats.diagnosis_count}회`}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard
            icon={CreditCard}
            label="결제 횟수"
            value={`${data.stats.order_count}회`}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <StatCard
            icon={MessageCircle}
            label="채팅 세션"
            value={`${data.stats.chat_count}개`}
            color="text-purple-600"
            bg="bg-purple-50"
          />
          <StatCard
            icon={BarChart3}
            label="총 결제액"
            value={`${data.stats.total_spent.toLocaleString()}원`}
            color="text-rose-600"
            bg="bg-rose-50"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Activity timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {data.activities.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">활동 기록이 없습니다</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.activities.map((activity) => {
              const config = typeConfig[activity.type] || {
                icon: Activity,
                label: activity.type,
                color: 'text-gray-600',
                bg: 'bg-gray-50',
              };
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className="px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {activity.title}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(activity.created_at)}</span>
                        {activity.created_at && (
                          <span className="text-gray-300 ml-1">
                            ({formatRelativeTime(activity.created_at)})
                          </span>
                        )}
                      </div>

                      {/* Metadata details */}
                      {activity.metadata && activity.type === 'payment' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activity.metadata.toss_order_id && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              주문번호: {activity.metadata.toss_order_id}
                            </span>
                          )}
                          {activity.metadata.status && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                activity.metadata.status === 'completed' ||
                                activity.metadata.status === 'DONE'
                                  ? 'bg-green-50 text-green-600'
                                  : activity.metadata.status === 'failed'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {activity.metadata.status}
                            </span>
                          )}
                        </div>
                      )}
                      {activity.metadata &&
                        activity.type === 'diagnosis' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activity.metadata.total_score !== null &&
                              activity.metadata.total_score !== undefined && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                                  점수: {activity.metadata.total_score}점
                                </span>
                              )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                activity.metadata.has_report
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {activity.metadata.has_report
                                ? 'AI 리포트 있음'
                                : '리포트 없음'}
                            </span>
                          </div>
                        )}
                      {activity.metadata && activity.type === 'chat' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                            메시지 {activity.metadata.message_count || 0}개
                          </span>
                          {activity.metadata.diagnosis_id && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              진단 #{activity.metadata.diagnosis_id} 연결
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            총 {data.activities.length}개의 활동 기록
          </p>
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
  bg,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}