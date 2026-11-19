import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';

export const ADMIN_TOKEN_KEY = 'heartsync_admin_token';

export interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string | null;
  last_login: string | null;
}

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

class AdminApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });

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
      const admToken = getAdminToken();
      if (admToken) {
        config.headers['x-admin-token'] = admToken;
      }
      config.headers['App-Host'] = globalThis?.window?.location?.origin ?? '';
      return config;
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async verifyAdminLogin(email: string, passcode: string) {
    const res = await fetch('/api/admin-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'verify_admin',
        email: email.trim().toLowerCase(),
        passcode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.adminToken) {
      throw new Error(data?.detail || data?.error || '관리자 비밀번호가 올바르지 않습니다.');
    }
    setAdminToken(data.adminToken);
    return data as { success: true; adminToken: string; user: any };
  }

  async checkAdminSession() {
    const admToken = getAdminToken();
    if (!admToken) return null;

    try {
      const res = await fetch('/api/admin-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': admToken,
        },
        body: JSON.stringify({
          eventType: 'check_session',
          adminToken: admToken,
        }),
      });
      if (!res.ok) {
        clearAdminToken();
        return null;
      }
      const data = await res.json();
      if (data?.valid && data?.user) {
        return data.user;
      }
    } catch {
      // Network error
    }
    clearAdminToken();
    return null;
  }

  async getCurrentUser() {
    return this.checkAdminSession();
  }

  async getUsers(params: URLSearchParams) {
    const admToken = getAdminToken();
    const qs = new URLSearchParams(params.toString());
    qs.set('view', 'users');

    const res = await fetch(`/api/admin-metrics?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'x-admin-token': admToken,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.error || '관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    return res.json();
  }

  async updateUserRole(userId: string, role: string) {
    const admToken = getAdminToken();
    const res = await fetch('/api/admin-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': admToken,
      },
      body: JSON.stringify({
        eventType: 'role_update',
        userId,
        role,
        adminToken: admToken,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.error || '역할 변경에 실패했습니다.');
    }
    return res.json();
  }

  async getUserActivity(userId: string, params: URLSearchParams) {
    const admToken = getAdminToken();
    const qs = new URLSearchParams(params.toString());
    qs.set('view', 'activity');
    qs.set('userId', userId);

    const res = await fetch(`/api/admin-metrics?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'x-admin-token': admToken,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.error || '활동 내역을 불러오지 못했습니다.');
    }
    return res.json();
  }

  async getSettings() {
    const admToken = getAdminToken();
    const res = await fetch('/api/admin-metrics?view=settings', {
      method: 'GET',
      headers: {
        'x-admin-token': admToken,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.error || '설정 조회 권한이 없습니다.');
    }
    return res.json();
  }

  async upsertSetting(scope: 'backend' | 'frontend', key: string, value: string, description?: string) {
    const admToken = getAdminToken();
    const res = await fetch('/api/admin-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': admToken,
      },
      body: JSON.stringify({
        eventType: 'settings_upsert',
        scope,
        key,
        value,
        description,
        adminToken: admToken,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.error || '설정 저장에 실패했습니다.');
    }
    return res.json();
  }

  async deleteSetting(scope: 'backend' | 'frontend', key: string) {
    const admToken = getAdminToken();
    const res = await fetch('/api/admin-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': admToken,
      },
      body: JSON.stringify({
        eventType: 'settings_delete',
        scope,
        key,
        adminToken: admToken,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.error || '설정 삭제에 실패했습니다.');
    }
    return res.json();
  }
}

export const adminApi = new AdminApi();
