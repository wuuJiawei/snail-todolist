import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { isTauriRuntime } from '@/utils/runtime'

// 开发环境下加载搜索调试工具
if (import.meta.env.DEV) {
  import('./utils/searchDebug');
}

createRoot(document.getElementById("root")!).render(<App />);

// Global external link handler: open http(s) links in system browser when in Tauri
if (isTauriRuntime()) {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      e.preventDefault();
      try {
        const mod = await import('@tauri-apps/plugin-shell');
        await mod.open(href);
      } catch {
        // ignore
      }
    }
  });
}
