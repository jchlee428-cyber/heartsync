import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
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
      // Validate response has expected user data structure
      if (response.data && response.data.id) {
        return response.data;
      }
      // If response doesn't look like user data (e.g., {"Message": null} from cold start)
      return null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return null;
      }
      // For 5xx errors or network errors during cold start, return null instead of throwing
      if (
        error.response?.status >= 500 ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ERR_NETWORK'
      ) {
        console.warn('Backend not ready, treating as not logged in');
        return null;
      }
      throw new Error(
        error.response?.data?.detail || 'Failed to get user info'
      );
    }
  }

  async login() {
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/auth/login`
      );
      // The backend will redirect to OIDC provider
      // SSO will work via cookies automatically
      window.location.href = response.data.redirect_url;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.detail || 'Failed to initiate login'
      );
    }
  }

  async logout() {
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/auth/logout`
      );
      // The backend will redirect to OIDC provider logout
      window.location.href = response.data.redirect_url;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to logout');
    }
  }
}

export const authApi = new RPApi();