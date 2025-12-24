/**
 * Property tests for storage configuration
 * Feature: offline-mode, Property 1: Configuration Mode Selection
 * Validates: Requirements 1.2, 7.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

describe('Storage Configuration', () => {
  // Store original env
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset module cache to re-evaluate config
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    Object.assign(import.meta.env, originalEnv);
  });

  describe('Property 1: Configuration Mode Selection', () => {
    /**
     * For any valid VITE_STORAGE_MODE environment value ("offline" or "supabase"),
     * the Config_Manager SHALL return the corresponding storage mode,
     * and for undefined values, it SHALL default to "supabase".
     */
    it('should return "offline" mode when VITE_STORAGE_MODE is "offline"', async () => {
      (import.meta.env as Record<string, string>).VITE_STORAGE_MODE = 'offline';
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('offline');
      expect(config.isOfflineMode).toBe(true);
    });

    it('should return "supabase" mode when VITE_STORAGE_MODE is "supabase"', async () => {
      (import.meta.env as Record<string, string>).VITE_STORAGE_MODE = 'supabase';
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('supabase');
      expect(config.isOfflineMode).toBe(false);
    });

    it('should default to "supabase" mode when VITE_STORAGE_MODE is undefined', async () => {
      delete (import.meta.env as Record<string, string | undefined>).VITE_STORAGE_MODE;
      
      const { getStorageConfig } = await import('./storage');
      const config = getStorageConfig();
      
      expect(config.mode).toBe('supabase');
      expect(config.isOfflineMode).toBe(false);
    });

    it('should default to "supabase" mode for any invalid VITE_STORAGE_MODE value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => s !== 'offline' && s !== 'supabase'),
          async (invalidMode) => {
            vi.resetModules();
            (import.meta.env as Record<string, string>).VITE_STORAGE_MODE = invalidMode;
            
            const { getStorageConfig } = await import('./storage');
            const config = getStorageConfig();
            
            expect(config.mode).toBe('supabase');
            expect(config.isOfflineMode).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent isOfflineMode flag with mode value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('offline', 'supabase', undefined, '', 'invalid'),
          async (modeValue) => {
            vi.resetModules();
            if (modeValue === undefined) {
              delete (import.meta.env as Record<string, string | undefined>).VITE_STORAGE_MODE;
            } else {
              (import.meta.env as Record<string, string>).VITE_STORAGE_MODE = modeValue;
            }
            
            const { getStorageConfig } = await import('./storage');
            const config = getStorageConfig();
            
            // isOfflineMode should be true only when mode is 'offline'
            expect(config.isOfflineMode).toBe(config.mode === 'offline');
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
