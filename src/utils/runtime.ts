export function isTauriRuntime(): boolean {
  // Detect Tauri by presence of injected globals
  // Avoid relying solely on userAgent
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}


