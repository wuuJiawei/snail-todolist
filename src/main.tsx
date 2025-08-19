import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 开发环境下加载搜索调试工具
if (import.meta.env.DEV) {
  import('./utils/searchDebug');
}

createRoot(document.getElementById("root")!).render(<App />);
