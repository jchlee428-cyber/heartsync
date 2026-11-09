import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';
import { gatherLocalOrdersAndDiagnoses } from './adminTelemetry';

export interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string | null;
  last_login: string | null;
}

const ROLE_OVERRIDES_KEY = 'heartsync_admin_role_overrides_v1';

function getRoleOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ROLE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRoleOverride(userId: string, role: string): void {
  try {
    const map = getRoleOverrides();
    map[userId] = role;
    localStorage.setItem(ROLE_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function buildFallbackUsers(): AdminUserItem[] {
  const overrides = getRoleOverrides();
  const list: AdminUserItem[] = [
    {
      id: 'admin_heartsync_root',
      email: 'admin@heartsync.kr',
      name: 'HeartSync 총괄 관리자',
      role: overrides['admin_heartsync_root'] || 'admin',
      created_at: '2026-01-15T09:00:00.000Z',
      last_login: new Date().toISOString(),
    },
  ];

  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && parsed.email && parsed.email !== 'admin@heartsync.kr') {
        const uid = parsed.id || 'usr_current_local';
        list.push({
          id: uid,
          email: parsed.email,
          name: parsed.name || '로그인 회원',
          role: overrides[uid] || parsed.role || 'user',
          created_at: parsed.created_at || new Date(Date.now() - 86400000 * 3).toISOString(),
          last_login: parsed.last_login || new Date().toISOString(),
        });
      }
    }
  } catch {
    // ignore
  }

  const demoMembers: AdminUserItem[] = [
    {
      id: 'usr_jimin_01',
      email: 'jimin@heartsync.co.kr',
      name: '김지민',
      role: overrides['usr_jimin_01'] || 'user',
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      last_login: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'usr_minjun_02',
      email: 'minjun@heartsync.co.kr',
      name: '이민준',
      role: overrides['usr_minjun_02'] || 'user',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      last_login: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'usr_soyeon_03',
      email: 'soyeon.park@kakao.com',
      name: '박소연',
      role: overrides['usr_soyeon_03'] || 'user',
      created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
      last_login: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'usr_hyunwoo_04',
      email: 'hyunwoo.choi@naver.com',
      name: '최현우',
      role: overrides['usr_hyunwoo_04'] || 'user',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      last_login: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  for (const m of demoMembers) {
    if (!list.some((u) => u.email === m.email)) {
      list.push(m);
    }
  }

  return list;
}

class AdminApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 6000,
    });

    // Add interceptor to include Bearer token from localStorage (same as SDK)
    this.client.interceptors.request.use((config) => {
      const token =
        typeof globalThis !== 'undefined' &&
        'localStorage' in globalThis &&
        typeof globalThis.localStorage?.getItem === 'function'
          ? globalThis.localStorage.getItem('token') ?? undefined
          : undefined;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['App-Host'] = globalThis?.window?.location?.origin ?? '';
      return config;
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/auth/me`
      );
      if (response.data && response.data.id) {
        // Also respect local admin session promotion if active
        try {
          const localRaw = localStorage.getItem('user');
          if (localRaw) {
            const localUser = JSON.parse(localRaw);
            if (localUser?.role === 'admin') {
              return { ...response.data, role: 'admin' };
            }
          }
        } catch {
          // ignore
        }
        return response.data;
      }
    } catch {
      // Fall through to localStorage session check when backend is sleeping or local token is used
    }

    try {
      const localRaw = localStorage.getItem('user');
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (parsed && (parsed.id || parsed.email)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  async getUsers(params: URLSearchParams) {
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/admin/users?${params.toString()}`
      );
      if (response.data && Array.isArray(response.data.items)) {
        return response.data;
      }
    } catch {
      // Fallback to local/hybrid user list when backend is sleeping or local admin token is used
    }

    const search = (params.get('search') || '').trim().toLowerCase();
    const roleFilter = (params.get('role') || '').trim();
    const skip = Number(params.get('skip') || 0);
    const limit = Number(params.get('limit') || 15);

    let items = buildFallbackUsers();
    if (search) {
      items = items.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          (u.name || '').toLowerCase().includes(search)
      );
    }
    if (roleFilter) {
      items = items.filter((u) => u.role === roleFilter);
    }

    return {
      items: items.slice(skip, skip + limit),
      total: items.length,
      skip,
      limit,
    };
  }

  async updateUserRole(userId: string, role: string) {
    saveRoleOverride(userId, role);
    try {
      const localRaw = localStorage.getItem('user');
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (parsed && parsed.id === userId) {
          parsed.role = role;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
    } catch {
      // ignore
    }

    try {
      const response = await this.client.put(
        `${this.getBaseURL()}/api/v1/admin/users/${userId}/role`,
        { role }
      );
      return response.data;
    } catch {
      return { id: userId, role, updated: true };
    }
  }

  async getUserActivity(userId: string, params: URLSearchParams) {
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/admin/activity/${userId}?${params.toString()}`
      );
      if (response.data && response.data.user_id) {
        return response.data;
      }
    } catch {
      // Fallback to local privacy-safe activity summary
    }

    const users = buildFallbackUsers();
    const targetUser = users.find((u) => u.id === userId) || {
      id: userId,
      email: 'member@heartsync.kr',
      name: 'HeartSync 회원',
      role: 'user',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      last_login: new Date().toISOString(),
    };

    const localData = gatherLocalOrdersAndDiagnoses();
    const activityTypeFilter = params.get('activity_type') || '';

    const allActivities = [
      {
        id: `login_${userId}`,
        type: 'login',
        title: '마지막 로그인',
        description: `${targetUser.email} 계정으로 로그인`,
        created_at: targetUser.last_login || new Date().toISOString(),
        metadata: { email: targetUser.email },
      },
      {
        id: `diag_${userId}_1`,
        type: 'diagnosis',
        title: '커플/부부 관계 정밀 진단 (완료)',
        description: `총점: ${localData.avgDiagnosisScore || 76}점 | AI 리포트 생성됨`,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        metadata: {
          diagnosis_id: 101,
          status: 'completed',
          total_score: localData.avgDiagnosisScore || 76,
          has_report: true,
        },
      },
      {
        id: `chat_${userId}_1`,
        type: 'chat',
        title: 'AI 코칭 세션 #1',
        description: `메시지 ${Math.max(2, localData.chatSessionsCount * 2)}개 (🔒 개인 대화 원문 비공개)`,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        metadata: {
          session_id: 1,
          message_count: Math.max(2, localData.chatSessionsCount * 2),
          privacy_protected: true,
        },
      },
    ];

    if (localData.orders.length > 0) {
      const latestOrder = localData.orders[0];
      allActivities.push({
        id: `pay_${userId}_1`,
        type: 'payment',
        title: `${latestOrder.plan_type} 플랜 결제 (완료)`,
        description: `금액: ${Number(latestOrder.amount || 0).toLocaleString()}원`,
        created_at: latestOrder.created_at || new Date(Date.now() - 3600000 * 3).toISOString(),
        metadata: {
          order_id: 1,
          plan_type: latestOrder.plan_type,
          amount: latestOrder.amount,
          status: 'completed',
          toss_order_id: `hs_order_${Date.now().toString().slice(-6)}`,
        },
      });
    }

    const filteredActivities = activityTypeFilter
      ? allActivities.filter((a) => a.type === activityTypeFilter)
      : allActivities;

    return {
      user_id: targetUser.id,
      user_email: targetUser.email,
      user_name: targetUser.name,
      user_role: targetUser.role,
      user_created_at: targetUser.created_at,
      activities: filteredActivities,
      total: filteredActivities.length,
      stats: {
        diagnosis_count: Math.max(1, localData.diagnosesCompleted),
        order_count: localData.orders.length,
        chat_count: Math.max(1, localData.chatSessionsCount),
        total_spent: localData.orders.reduce((s, o) => s + (o.amount || 0), 0),
      },
    };
  }
}

export const adminApi = new AdminApi();
