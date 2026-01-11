/**
 * Authentication API for custom backend
 */

import { apiClient, ApiClientError } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  user: AuthUser;
  message: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    apiClient.setToken(data.token);
    return data;
  },

  async register(email: string, password: string): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', { email, password });
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

export { ApiClientError };
