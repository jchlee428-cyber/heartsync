import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Receipt, Crown, ShieldCheck, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { createClient } from "@metagptx/web-sdk";
import { toast } from "sonner";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const client = createClient();

interface Order {
  id: number;
  plan_type: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  order_id?: string;
}

interface ActivePlan {
  plan_type: string;
  plan_name: string;
  analyses_remaining: number;
  is_active: boolean;
  expires_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  paid: { label: "결제 완료", color: "text-green-600", bg: "bg-green-50", icon: "✅" },
  pending: { label: "대기 중", color: "text-amber-600", bg: "bg-amber-50", icon: "⏳" },
  cancelled: { label: "취소됨", color: "text-red-600", bg: "bg-red-50", icon: "❌" },
  refunded: { label: "환불됨", color: "text-gray-600", bg: "bg-gray-100", icon: "↩️" },
};

const PLAN_GRADIENT: Record<string, string> = {
  single_analysis: "from-blue-500 to-cyan-500",
  monthly_subscription: "from-pink-500 to-rose-500",
  couple_premium: "from-purple-500 to-pink-500",
};

const PLAN_ICON: Record<string, string> = {
  single_analysis: "⚡",
  monthly_subscription: "✨",
  couple_premium: "👑",
};

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await client.auth.me();
      if (res?.data) {
        setUser(res.data);
        await Promise.all([loadOrders(), loadActivePlan()]);
      }
    } catch {
      // Not logged in - show login prompt
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await client.entities.orders.query({
        query: {},
        sort: "-created_at",
        limit: 100,
      });
      const items = response.data?.items || [];
      setOrders(items);
      const paid = items.filter((o: Order) => o.status === "paid");
      const total = paid.reduce((sum: number, o: Order) => sum + (o.amount || 0), 0);
      setTotalSpent(total);
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

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="w-8 h-8 text-pink-500 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-gray-500">결제 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
        <Header />
        <div className="max-w-lg mx-auto px-5 pt-6 pb-28">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-500 text-sm font-medium mb-6 px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">결제 내역</h1>
            <p className="text-sm text-gray-500">나의 결제 및 구독 현황을 확인하세요</p>
          </div>
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-50 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium mb-2">로그인이 필요합니다</p>
            <p className="text-gray-400 text-xs mb-6">결제 내역을 확인하려면 로그인해주세요</p>
            <button
              onClick={() => navigate("/login?from_url=/payment-history")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
            >
              로그인하기
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const paidOrders = orders.filter((o) => o.status === "paid");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      <Header />

      <div className="max-w-lg mx-auto px-5 pt-6 pb-28">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-500 text-sm font-medium mb-6 px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        {/* Page Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">결제 내역</h1>
          <p className="text-sm text-gray-500">나의 결제 및 구독 현황을 확인하세요</p>
        </div>

        {/* Active Plan Card */}
        {activePlan && activePlan.is_active && activePlan.plan_type !== "free" ? (
          <div className={`bg-gradient-to-r ${PLAN_GRADIENT[activePlan.plan_type] || "from-pink-500 to-rose-500"} rounded-2xl p-5 shadow-lg mb-6 text-white`}>
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
                    <p className="text-sm font-bold">{formatDate(activePlan.expires_at)}</p>
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
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6">
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

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 text-center">
              <p className="text-[10px] text-gray-400 mb-1">총 결제 횟수</p>
              <p className="text-lg font-extrabold text-gray-900">{paidOrders.length}<span className="text-xs text-gray-400 font-normal">건</span></p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 text-center">
              <p className="text-[10px] text-gray-400 mb-1">총 결제 금액</p>
              <p className="text-lg font-extrabold text-pink-600">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 text-center">
              <p className="text-[10px] text-gray-400 mb-1">전체 내역</p>
              <p className="text-lg font-extrabold text-gray-900">{orders.length}<span className="text-xs text-gray-400 font-normal">건</span></p>
            </div>
          </div>
        )}

        {/* Order List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-50 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium mb-2">결제 내역이 없습니다</p>
            <p className="text-gray-400 text-xs mb-6">프리미엄 플랜을 구매하면 여기에 표시됩니다</p>
            <button
              onClick={() => navigate("/pricing")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <CreditCard className="w-4 h-4" />
              요금제 보기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-pink-500" />
              결제 상세 내역
            </h2>

            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600", bg: "bg-gray-100", icon: "📋" };
              const gradient = PLAN_GRADIENT[order.plan_type] || "from-gray-400 to-gray-500";
              const planIcon = PLAN_ICON[order.plan_type] || "📦";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition-all"
                >
                  {/* Top Row: Plan info + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <span className="text-lg">{planIcon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{order.plan_name || order.plan_type}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                      <span>{statusInfo.icon}</span>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Bottom Row: Amount + Order ID */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">결제 금액</span>
                      {order.order_id && (
                        <span className="text-[9px] text-gray-300 font-mono">
                          #{order.order_id.slice(-8)}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-gray-900">
                      {formatCurrency(order.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">결제 관련 문의</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                결제 취소, 환불 등 문의사항이 있으시면 고객센터로 연락해주세요.
                결제 후 7일 이내 미사용 시 전액 환불이 가능합니다.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/pricing")}
            className="inline-flex items-center gap-2 text-pink-500 font-semibold text-sm hover:text-pink-600 transition-colors"
          >
            요금제 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}