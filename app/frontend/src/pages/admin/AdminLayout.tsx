import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { createClient } from '@metagptx/web-sdk';
import { adminApi, clearAdminToken } from '@/lib/adminApi';
import { clearUserSessionOnLogout } from '@/lib/userSync';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Settings,
  Users,
  ArrowLeft,
  Shield,
  LogIn,
  LogOut,
  Menu,
  X,
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

const client = createClient();

const sidebarItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/admin' },
  { icon: Users, label: '사용자 관리', path: '/admin/users' },
  { icon: Settings, label: '설정 관리', path: '/admin/settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Built-in Admin Login state
  const [adminEmail, setAdminEmail] = useState('admin@heartsync.kr');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setAuthError(null);
      const verifiedAdmin = await adminApi.checkAdminSession();
      if (verifiedAdmin && verifiedAdmin.role === 'admin') {
        setUser(verifiedAdmin);
        setIsAdmin(true);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch (err: any) {
      console.error('[AdminLayout] Auth check error:', err);
      setAuthError(err?.message || 'Unknown error');
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPasscode.trim()) {
      setAuthError('관리자 비밀번호를 입력해주세요.');
      toast.error('관리자 비밀번호를 입력해주세요.');
      return;
    }

    setLoggingIn(true);
    setAuthError(null);

    const targetEmail = (adminEmail || 'admin@heartsync.kr').trim().toLowerCase();

    try {
      const result = await adminApi.verifyAdminLogin(targetEmail, adminPasscode);
      const adminUser = result.user;

      localStorage.setItem('token', result.adminToken);
      localStorage.setItem('user', JSON.stringify(adminUser));
      localStorage.setItem('isLougOutManual', 'false');

      setAdminPasscode('');
      setUser(adminUser);
      setIsAdmin(true);
      toast.success('🛡️ 관리자 인증이 완료되었습니다.');
    } catch (err: any) {
      const msg = err?.message || '관리자 비밀번호가 올바르지 않습니다.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    clearAdminToken();
    await clearUserSessionOnLogout();
    setUser(null);
    setIsAdmin(false);
    toast.info('관리자 세션에서 로그아웃되었습니다.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (authError || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl p-7 sm:p-8 shadow-xl border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>

          <h2 className="text-xl font-extrabold text-gray-900 mb-1.5">
            HeartSync 관리자 로그인
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-5">
            {user && !isAdmin
              ? `현재 일반 계정(${user.email})으로 접속 중입니다. 관리자 권한으로 전환하거나 관리자 계정으로 로그인하세요.`
              : '8대 운영 지표 모니터링 및 서비스 관리를 위해 관리자 계정으로 접속합니다.'}
          </p>

          {authError && (
            <div className="bg-red-50 rounded-xl p-3 mb-4 text-left border border-red-100">
              <p className="text-xs text-red-600 break-all">{authError}</p>
            </div>
          )}

          <form onSubmit={handleDirectAdminLogin} className="space-y-3 text-left mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                관리자 이메일
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@heartsync.kr"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                관리자 비밀번호 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="관리자 비밀번호를 입력하세요"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn || !adminPasscode.trim()}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  관리자 인증 중...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  관리자 인증 후 접속
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2.5 text-gray-500 font-medium text-xs sm:text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className="text-base font-bold text-gray-900">
                관리자 모드
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50"
              title="관리자 로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              사이트로 돌아가기
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`w-4.5 h-4.5 ${
                    isActive ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="pt-14 lg:pl-56 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
