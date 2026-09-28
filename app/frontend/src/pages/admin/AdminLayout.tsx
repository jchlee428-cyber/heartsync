import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { createClient } from '@metagptx/web-sdk';
import { adminApi } from '@/lib/adminApi';
import {
  LayoutDashboard,
  Settings,
  Users,
  ArrowLeft,
  Shield,
  LogIn,
  Menu,
  X,
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('[AdminLayout] Checking auth...');
      const token = localStorage.getItem('token');
      console.log('[AdminLayout] Token exists:', !!token);

      if (!token) {
        console.log('[AdminLayout] No token found, user not logged in');
        setLoading(false);
        return;
      }

      // Use adminApi which calls the backend /api/v1/auth/me with Bearer token
      // This returns the role from the JWT (which comes from the app's database)
      const userData = await adminApi.getCurrentUser();
      console.log('[AdminLayout] adminApi.getCurrentUser() response:', userData);

      if (userData) {
        console.log('[AdminLayout] User data:', JSON.stringify(userData));
        console.log('[AdminLayout] User role:', userData.role);
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      } else {
        console.log('[AdminLayout] No user data returned from backend');
        // Fallback: try SDK auth.me() to at least get basic user info
        try {
          const sdkRes = await client.auth.me();
          if (sdkRes?.data) {
            console.log('[AdminLayout] SDK fallback user data:', sdkRes.data);
            setUser(sdkRes.data);
            // SDK might not have role, so check both
            setIsAdmin(sdkRes.data.role === 'admin');
          }
        } catch (sdkErr) {
          console.warn('[AdminLayout] SDK auth.me() also failed:', sdkErr);
        }
      }
    } catch (err: any) {
      console.error('[AdminLayout] Auth check error:', err);
      setAuthError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
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

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">인증 오류</h2>
          <p className="text-sm text-gray-500 mb-4">
            인증 확인 중 오류가 발생했습니다.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-left">
            <p className="text-xs text-gray-500 break-all">{authError}</p>
          </div>
          <button
            onClick={() => navigate('/login?from_url=/admin')}
            className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            다시 로그인
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-3 text-gray-500 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">로그인 필요</h2>
          <p className="text-sm text-gray-500 mb-6">
            관리자 페이지에 접근하려면 로그인이 필요합니다.
          </p>
          <button
            onClick={() => navigate('/login?from_url=/admin')}
            className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            로그인
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-3 text-gray-500 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-sm text-gray-500 mb-2">
            관리자 권한이 필요합니다.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-500">
              현재 계정: {user.email}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              역할: {user.role === 'user' ? '일반 사용자' : user.role || '알 수 없음'}
            </p>
          </div>
          <button
            onClick={() => navigate('/login?from_url=/admin')}
            className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors mb-3"
          >
            다른 계정으로 로그인
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 text-gray-500 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              {user.email}
            </span>
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