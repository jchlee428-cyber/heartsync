import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';

class AdminApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
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
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getUsers(params: URLSearchParams) {
    const response = await this.client.get(
      `${this.getBaseURL()}/api/v1/admin/users?${params.toString()}`
    );
    return response.data;
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.client.put(
      `${this.getBaseURL()}/api/v1/admin/users/${userId}/role`,
      { role }
    );
    return response.data;
  }

  async getUserActivity(userId: string, params: URLSearchParams) {
    const response = await this.client.get(
      `${this.getBaseURL()}/api/v1/admin/activity/${userId}?${params.toString()}`
    );
    return response.data;
  }
}

export const adminApi = new AdminApi();