/**
 * Storage Factory Module
 * Provides a singleton storage instance based on configuration
 */

import { StorageAdapter } from './types';
import { IndexedDBAdapter } from './indexeddb';
import { SupabaseAdapter } from './supabase';
import { isOfflineMode, getStorageConfig } from '@/config/storage';

let storageInstance: StorageAdapter | null = null;

/**
 * Get the storage adapter instance based on current configuration
 * Returns a singleton instance that is lazily initialized
 */
export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    const config = getStorageConfig();
    
    if (config.mode === 'offline') {
      storageInstance = new IndexedDBAdapter();
    } else {
      storageInstance = new SupabaseAdapter();
    }
  }
  
  return storageInstance;
}

/**
 * Initialize the storage adapter
 * Must be called before using storage operations
 */
export async function initializeStorage(): Promise<void> {
  const storage = getStorage();
  if (!storage.isReady()) {
    await storage.initialize();
  }
}

/**
 * Reset the storage instance (useful for testing or mode switching)
 */
export function resetStorage(): void {
  storageInstance = null;
}

/**
 * Check if storage is ready for operations
 */
export function isStorageReady(): boolean {
  return storageInstance?.isReady() ?? false;
}

// Re-export types and utilities
export { StorageAdapter, TaskFilter, SortOptions, PomodoroSession, TaskActivity } from './types';
export { isOfflineMode };
