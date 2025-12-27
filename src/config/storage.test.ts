/**
 * Property tests for storage configuration
 * Feature: user-controlled-offline-mode, Property 1: Mode Persistence Round Trip
 * Validates: Requirements 3.1, 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

describe('Storage Configuration', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
    localStorage.clear();
  });

  describe('Property 1: Mode Persistence Round Trip', () => {
    /**
     * For any valid storage mode ('offline' or 'supabase'),
     * setting the mode and then getting the config should return the same mode.
     */
    it('should persist and retrieve offline mode from localStorage', async () => {
      const { setStorageMode, getStorageConfig, STORAGE_MODE_KEY } = await import('./storage');
      
      setStorageMode('offline');
      expect(localStorage.getItem(STORAGE_MODE_KEY)).toBe('offline');
      
      vi.resetModules();
      const { getStorageConfig: getConfig } = await import('./storage');
      const config = getConfig();
      
      expect(config.mode).toBe('offline');
      expect(config.isOfflineMode).toBe(true);
    });

    it('should persist and retrieve supabase mode from localStorage', async () => {
      const { setStorageMode, getStorageConfig, STORAGE_MODE_KEY } = await import('./storage');
      
      setStorageMode('supabase');
      expect(localStorage.getItem(STORAGE_MODE_KEY)).toBe('supabase');
      
      vi.resetModules();
      const { getStorageConfig: getConfig } = await import('./storage');
      const config = getConfig();
      
      expect(config.mode).toBe('supabase');
      expect(config.isOfflineMode).toBe(false);
    });

    it('should round-trip any valid storage mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('offline', 'supabase') as fc.Arbitrary<'offline' | 'supabase'>,
          async (mode) => {
            vi.resetModules();
            localStorage.clear();
            
            const { setStorageMode } = await import('./storage');
            setStorageMode(mode);
            
            vi.resetModules();
            const { getStorageConfig } = await import('./storage');
            const config = getStorageConfig();
            
            expect(config.mode).toBe(mode);
            expect(config.isOfflineMode).toBe(mode === 'offline');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('localStorage Priority over Environment Variable', () => {
    it('should prioritize localStorage over environment variable', async () => {
      (import.meta.env as Record<string, string>).VITE_STORAGE_MODE = 'supabase';
      localStorage.setItem('snail_storage_mode', 'offline');
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('offline');
      expect(config.isOfflineMode).toBe(true);
    });

    it('should fallback to environment variable when localStorage is empty', async () => {
      (import.meta.env as Record<string, string>).VITE_STORAGE_MODE = 'offline';
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('offline');
      expect(config.isOfflineMode).toBe(true);
    });
  });

  describe('Default Mode', () => {
    it('should default to supabase when no preference is set', async () => {
      delete (import.meta.env as Record<string, string | undefined>).VITE_STORAGE_MODE;
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('supabase');
      expect(config.isOfflineMode).toBe(false);
    });

    it('should ignore invalid localStorage values and use default', async () => {
      localStorage.setItem('snail_storage_mode', 'invalid_mode');
      delete (import.meta.env as Record<string, string | undefined>).VITE_STORAGE_MODE;
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('supabase');
      expect(config.isOfflineMode).toBe(false);
    });
  });

  describe('clearStorageMode', () => {
    it('should remove storage mode from localStorage', async () => {
      const { setStorageMode, clearStorageMode, STORAGE_MODE_KEY } = await import('./storage');
      
      setStorageMode('offline');
      expect(localStorage.getItem(STORAGE_MODE_KEY)).toBe('offline');
      
      clearStorageMode();
      expect(localStorage.getItem(STORAGE_MODE_KEY)).toBeNull();
    });
  });

  describe('Consistency', () => {
    it('should have consistent isOfflineMode flag with mode value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('offline', 'supabase', undefined) as fc.Arbitrary<'offline' | 'supabase' | undefined>,
          async (modeValue) => {
            vi.resetModules();
            localStorage.clear();
            
            if (modeValue) {
              localStorage.setItem('snail_storage_mode', modeValue);
            }
            delete (import.meta.env as Record<string, string | undefined>).VITE_STORAGE_MODE;
            
            const { getStorageConfig } = await import('./storage');
            const config = getStorageConfig();
            
            expect(config.isOfflineMode).toBe(config.mode === 'offline');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
