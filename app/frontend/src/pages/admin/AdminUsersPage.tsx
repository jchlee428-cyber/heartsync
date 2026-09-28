import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Shield,
  ShieldCheck,
  User,
  Clock,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string | null;
  last_login: string | null;
}

interface UserListResponse {
  items: UserItem[];
  total: number;
  skip: number;
  limit: number;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = 15;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('skip', String(page * limit));
      params.set('limit', String(limit));
      params.set('sort', '-created_at');
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      console.log('[AdminUsersPage] Loading users with params:', params.toString());

      const data = (await adminApi.getUsers(params)) as UserListResponse;
      console.log('[AdminUsersPage] Data:', data);

      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('[AdminUsersPage] Failed to load users:', err);
      const detail =
        err?.response?.data?.detail || err?.message || 'Unknown error';
      setError(detail);
      toast.error('사용자 목록을 불러오는데 실패했습니다: ' + detail);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (
      !confirm(
        `이 사용자의 역할을 '${newRole === 'admin' ? '관리자' : '일반 사용자'}'로 변경하시겠습니까?`
      )
    ) {
      return;
    }

    setChangingRole(userId);
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success(
        `사용자 역할이 '${newRole === 'admin' ? '관리자' : '일반 사용자'}'로 변경되었습니다.`
      );
      await loadUsers();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        '역할 변경에 실패했습니다.';
      toast.error(detail);
    } finally {
      setChangingRole(null);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            전체 사용자를 조회하고 역할을 관리합니다
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          />
          새로고침
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="이메일 또는 이름으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">전체 역할</option>
            <option value="admin">관리자</option>
            <option value="user">일반 사용자</option>
          </select>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            검색
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            전체 <span className="font-bold text-gray-900">{total}</span>명
          </span>
          {search && (
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              검색: &quot;{search}&quot;
              <button
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(0);
                }}
                className="ml-1 text-indigo-400 hover:text-indigo-600"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">사용자 목록 로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 text-sm font-medium mb-2">
                사용자 목록을 불러올 수 없습니다
              </p>
              <p className="text-gray-400 text-xs mb-4 break-all">{error}</p>
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {search
                  ? '검색 결과가 없습니다'
                  : '등록된 사용자가 없습니다'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">
                      사용자
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">
                      역할
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">
                      가입일
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">
                      최근 로그인
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 px-5 py-3">
                      활동 로그
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">
                      역할 변경
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              u.role === 'admin'
                                ? 'bg-indigo-100'
                                : 'bg-gray-100'
                            }`}
                          >
                            {u.role === 'admin' ? (
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {u.name || '이름 없음'}
                            </p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {u.role === 'admin' ? '관리자' : '일반 사용자'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(u.created_at)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(u.last_login)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() =>
                            navigate(`/admin/users/${u.id}/activity`)
                          }
                          className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="활동 로그 보기"
                        >
                          <Activity className="w-4 h-4 text-indigo-500" />
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.role === 'admin' ? (
                          <button
                            onClick={() => handleRoleChange(u.id, 'user')}
                            disabled={changingRole === u.id}
                            className="px-3 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {changingRole === u.id
                              ? '변경 중...'
                              : '관리자 해제'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            disabled={changingRole === u.id}
                            className="px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                          >
                            {changingRole === u.id
                              ? '변경 중...'
                              : '관리자 지정'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {users.map((u) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          u.role === 'admin'
                            ? 'bg-indigo-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {u.name || '이름 없음'}
                        </p>
                        <p className="text-[11px] text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role === 'admin' ? '관리자' : '사용자'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>가입: {formatDateTime(u.created_at)}</span>
                      <span>로그인: {formatDateTime(u.last_login)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          navigate(`/admin/users/${u.id}/activity`)
                        }
                        className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="활동 로그"
                      >
                        <Activity className="w-4 h-4 text-indigo-500" />
                      </button>
                      {u.role === 'admin' ? (
                        <button
                          onClick={() => handleRoleChange(u.id, 'user')}
                          disabled={changingRole === u.id}
                          className="px-3 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          {changingRole === u.id ? '...' : '관리자 해제'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(u.id, 'admin')}
                          disabled={changingRole === u.id}
                          className="px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        >
                          {changingRole === u.id ? '...' : '관리자 지정'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {page * limit + 1}-
                  {Math.min((page + 1) * limit, total)} / {total}명
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xs font-medium text-gray-700 px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage(Math.min(totalPages - 1, page + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}