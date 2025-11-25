import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// 读取package.json获取版本信息
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 明确加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // 注入版本信息到全局变量
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    // 确保环境变量在所有模式下都可用
    envDir: process.cwd(),
  };
});
