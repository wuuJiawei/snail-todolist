export function isTauriRuntime(): boolean {
  // Detect Tauri by presence of injected globals
  // Avoid relying solely on userAgent
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

/**
 * Navigate to a path with full page reload
 * Compatible with both Web and Tauri WebView environments
 * Use this when you need to reinitialize all contexts and singletons
 */
export function navigateWithReload(path: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      window.location.href = path;
    }
  } catch (e) {
    console.error('Navigation failed:', e);
  }
}


