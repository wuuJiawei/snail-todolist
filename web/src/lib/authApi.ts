/**
 * Authentication API for custom backend
 */

import { apiClient, ApiClientError } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  nickname?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  token: string;
  user: AuthUser;
}

export interface AuthConfig {
  email_login_enabled: boolean;
}

export interface SMTPConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  email_login_enabled: boolean;
}

export const authApi = {
  async getConfig(): Promise<AuthConfig> {
    return apiClient.get<AuthConfig>('/auth/config');
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    const data = await apiClient.post<LoginResponse>('/auth/login', { username, password });
    apiClient.setToken(data.token);
    return data;
  },

  async register(username: string, password: string, email?: string): Promise<RegisterResponse> {
    const data = await apiClient.post<RegisterResponse>('/auth/register', { username, password, email });
    apiClient.setToken(data.token);
    return data;
  },

  async sendEmailCode(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/email/code', { email });
  },

  async emailLogin(email: string, code: string): Promise<LoginResponse> {
    const data = await apiClient.post<LoginResponse>('/auth/email/login', { email, code });
    apiClient.setToken(data.token);
    return data;
  },

  async getProfile(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/user/profile');
  },

  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    return apiClient.put<AuthUser>('/user/profile', updates);
  },

  async updatePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/user/password', { 
      old_password: oldPassword, 
      new_password: newPassword 
    });
  },

  logout(): void {
    apiClient.setToken(null);
  },

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },

  getToken(): string | null {
    return apiClient.getToken();
  },
};

export const settingsApi = {
  async getSMTPConfig(): Promise<SMTPConfig> {
    return apiClient.get<SMTPConfig>('/settings/smtp');
  },

  async updateSMTPConfig(config: Partial<SMTPConfig>): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/settings/smtp', config);
  },

  async getAppInfo(): Promise<AppInfoConfig> {
    return apiClient.get<AppInfoConfig>('/settings/app-info');
  },

  async updateAppInfo(config: AppInfoConfig): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/settings/app-info', config);
  },
};

export interface AppInfoConfig {
  app_name: string;
  app_description: string;
  app_logo_url: string;
  developer_name: string;
  contact_email: string;
  contact_website: string;
  features: string[];
}

export async function getPublicAppInfo(): Promise<AppInfoConfig> {
  return apiClient.get<AppInfoConfig>('/app-info');
}

export { ApiClientError };
