/**
 * Storage configuration module
 * Determines which storage backend to use based on user preference (localStorage)
 * with fallback to environment configuration
 */

export type StorageMode = 'supabase' | 'offline';

export interface StorageConfig {
  mode: StorageMode;
  isOfflineMode: boolean;
}

/** localStorage key for user's storage mode preference */
export const STORAGE_MODE_KEY = 'snail_storage_mode';

/**
 * Set storage mode preference in localStorage
 * Requires page reload to take effect (storage adapter is singleton)
 */
export function setStorageMode(mode: StorageMode): void {
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {
    console.warn('Failed to save storage mode preference');
  }
}

/**
 * Clear storage mode preference from localStorage
 * Will fallback to environment variable or default on next load
 */
export function clearStorageMode(): void {
  try {
    localStorage.removeItem(STORAGE_MODE_KEY);
  } catch {
    console.warn('Failed to clear storage mode preference');
  }
}

/**
 * Get storage configuration
 * Priority: localStorage > environment variable > default ('supabase')
 */
export const getStorageConfig = (): StorageConfig => {
  let mode: StorageMode = 'supabase';
  
  // Priority 1: Check localStorage for user preference
  try {
    const stored = localStorage.getItem(STORAGE_MODE_KEY);
    if (stored === 'offline' || stored === 'supabase') {
      mode = stored;
    } else if (!stored) {
      // Priority 2: Fallback to environment variable
      const envMode = import.meta.env.VITE_STORAGE_MODE as string | undefined;
      if (envMode === 'offline') {
        mode = 'offline';
      }
    }
  } catch {
    // localStorage not available, use environment variable
    const envMode = import.meta.env.VITE_STORAGE_MODE as string | undefined;
    if (envMode === 'offline') {
      mode = 'offline';
    }
  }
  
  return {
    mode,
    isOfflineMode: mode === 'offline',
  };
};

// Export singleton config values for easy access throughout the application
const config = getStorageConfig();

export const STORAGE_MODE = config.mode;
export const isOfflineMode = config.isOfflineMode;
