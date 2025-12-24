/**
 * Storage configuration module
 * Determines which storage backend to use based on environment configuration
 */

export type StorageMode = 'supabase' | 'offline';

export interface StorageConfig {
  mode: StorageMode;
  isOfflineMode: boolean;
}

/**
 * Get storage configuration from environment variables
 * Defaults to 'supabase' if VITE_STORAGE_MODE is not set
 */
export const getStorageConfig = (): StorageConfig => {
  const envMode = import.meta.env.VITE_STORAGE_MODE as string | undefined;
  const mode: StorageMode = envMode === 'offline' ? 'offline' : 'supabase';
  
  return {
    mode,
    isOfflineMode: mode === 'offline',
  };
};

// Export singleton config values for easy access throughout the application
const config = getStorageConfig();

export const STORAGE_MODE = config.mode;
export const isOfflineMode = config.isOfflineMode;
