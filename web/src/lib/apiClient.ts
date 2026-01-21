/**
 * API Client for custom backend
 * Handles HTTP requests, authentication, and error handling
 */

const STORAGE_KEY_TOKEN = 'snail_auth_token';
const STORAGE_KEY_BASE_URL = 'snail_api_base_url';

export interface ApiError {
  code: number;
  message: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = this.loadBaseUrl();
    this.token = this.loadToken();
  }

  private loadBaseUrl(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BASE_URL);
      if (stored) return stored;
    } catch {
      // localStorage not available
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:23333';
  }

  private loadToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    try {
      localStorage.setItem(STORAGE_KEY_BASE_URL, url);
    } catch {
      // localStorage not available
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string | null): void {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      }
    } catch {
      // localStorage not available
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { isFormData?: boolean }
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!options?.isFormData && body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        const json = await response.json();
        errorData = { code: json.code || response.status, message: json.message || response.statusText };
      } catch {
        errorData = { code: response.status, message: response.statusText };
      }
      throw new ApiClientError(errorData.code, errorData.message);
    }

    const json: ApiResponse<T> = await response.json();
    if (json.code !== 0) {
      throw new ApiClientError(json.code, json.message);
    }

    return json.data;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async upload<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.request<T>('POST', path, formData, { isFormData: true });
  }

  async testConnection(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/healthz`);
      return true;
    } catch {
      return false;
    }
  }
}

export class ApiClientError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiClientError';
  }

  isUnauthorized(): boolean {
    return this.code === 1002 || this.code === 2003;
  }

  isForbidden(): boolean {
    return this.code === 1003;
  }

  isNotFound(): boolean {
    return this.code === 1004;
  }
}

export const apiClient = new ApiClient();
