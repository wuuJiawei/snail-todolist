/**
 * Vitest test setup file
 * Configures global test environment
 */

import 'fake-indexeddb/auto';

// Mock import.meta.env for tests
const mockEnv: Record<string, string | undefined> = {
  VITE_STORAGE_MODE: undefined,
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
};

// Store original env
const originalEnv = { ...import.meta.env };

// Helper to set env for tests
export const setTestEnv = (key: string, value: string | undefined) => {
  mockEnv[key] = value;
  (import.meta.env as Record<string, string | undefined>)[key] = value;
};

// Helper to reset env after tests
export const resetTestEnv = () => {
  Object.keys(mockEnv).forEach((key) => {
    (import.meta.env as Record<string, string | undefined>)[key] = originalEnv[key];
  });
};

// Apply mock env
Object.keys(mockEnv).forEach((key) => {
  if (mockEnv[key] !== undefined) {
    (import.meta.env as Record<string, string | undefined>)[key] = mockEnv[key];
  }
});
