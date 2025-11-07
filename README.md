<div>
  <img src="./public/logo.png" alt="Snail TodoList Logo" width="120" height="120" />
  
  # 🐌 Snail TodoList
  
  Snail TodoList 是一款面向个人与小团队的任务管理应用，强调“足够强大但保持轻量”。项目采用 React + Supabase 架构，可自行部署并掌控数据，适合希望在现有工具之外获得更强可定制性的使用者。
  
  ## 为什么再写一个 To-Do List？
  1. **可控的数据与部署**：后端基于 Supabase，既能使用托管服务，也能按需自建。
  2. **合适的功能密度**：保留拖拽、标签、富文本等常用特性，同时避免臃肿的工作流系统。
  3. **易于拓展**：采用 shadcn/ui + Tailwind 的组件体系，便于快速新增模块或重新设计界面。
  
  ---
  
  ## ✨ 功能概览
  - 任务管理：新增、编辑、完成、放弃、恢复，支持项目分组与排序。
  - 日期视图：快速查看“今天”“最近 7 天”，按需筛选逾期任务。
  - 标签体系：支持标签增删、过滤、跨项目复用。
  - 富文本详情：Vditor 提供 Markdown 编辑、图片上传、代码块等能力。
  - 打卡与统计：内置打卡日历、连续天数统计、总次数概览。
  - 深浅色主题 + 响应式布局，桌面与移动端体验一致。
  
  ---
  
  ## 🧱 技术栈
  | 分类 | 使用技术 |
  | --- | --- |
  | 前端框架 | React 18 · TypeScript |
  | 构建工具 | Vite |
  | UI 体系 | shadcn/ui · Radix UI · Tailwind CSS |
  | 状态与数据 | TanStack Query · Zustand · React Context |
  | 后端服务 | Supabase（PostgreSQL · Auth · Storage · Realtime） |
  | 富文本 & 日期 | Vditor · react-day-picker · date-fns |
  | 其它组件 | React Router 6 · React Hook Form · Recharts |
  | 桌面客户端 | Tauri |
  
  ---
  
  ## 📁 项目结构
  ```text
  src/
  ├── components/
  │   ├── checkin/         # 打卡模块
  │   ├── sidebar/
  │   ├── tasks/
  │   └── ui/              # 基础 UI 封装
  ├── contexts/            # Auth、Task、Project 等全局上下文
  ├── hooks/               # 自定义 Hooks
  ├── integrations/        # Supabase client 等集成
  ├── lib/                 # 公共工具与样式辅助
  ├── queries/             # TanStack Query 配置与 keys
  ├── services/            # Supabase 相关 API 调用
  ├── store/               # Zustand store 定义
  ├── utils/               # 辅助函数与常量
  └── pages/               # 路由页面
  ```
  
  ---
  
  ## 🚀 快速开始
  ### 环境要求
  - Node.js 18+
  - npm / pnpm / yarn
  - Supabase 项目（已启用数据库与 Storage）
  
  ### 初始化
  ```bash
  git clone https://github.com/wuuJiawei/snail-todolist.git
  cd snail-todolist
  npm install
  cp .env.example .env
  ```
  在 `.env` 中设置：
  ```dotenv
  VITE_SUPABASE_URL=你的_supabase_url
  VITE_SUPABASE_ANON_KEY=你的_supabase_anon_key
  ```
  
  ### 数据库设置
  参考 `docs/SETUP.md`（如无，可在 Supabase 控制台创建下列数据表：`projects`、`tasks`、`tags`、`checkin_records` 等，并配置 RLS 规则与 Realtime）。
  
  ### 启动开发环境
  ```bash
  npm run dev
  ```
  默认运行在 <http://localhost:5173>。
  
  ### 常用脚本
  | 命令 | 说明 |
  | --- | --- |
  | `npm run dev` | 开发服务器 |
  | `npm run build` | 生产构建 |
  | `npm run preview` | 预览生产构建 |
  | `npm run lint` | ESLint 检查 |
  | `npm run tauri:dev` | 桌面客户端调试 |
  | `npm run tauri:build` | 桌面客户端打包 |
  
  ---
  
  ## 部署

### Vercel（推荐）
1. Fork 或 Clone 本仓库到你的 GitHub 账号。
2. 登录 [Vercel](https://vercel.com) 并导入项目。
3. 在 **Project → Settings → Environment Variables** 中添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   分别填入 Supabase 项目的 URL 与 anon key，并确保在 Production / Preview / Development 环境都配置。
4. 点击 Deploy，稍待片刻即可访问线上版本。

> 若部署后页面提示 “Missing VITE_SUPABASE_URL”，通常是环境变量未正确设置或未推送到所需环境。

### 静态托管或自建服务器
- 运行 `npm run build` 生成 `dist/` 静态资源。
- 将 `dist/` 上传至 Netlify、Cloudflare Pages、GitHub Pages、S3/OSS 等平台，或自行托管于 Nginx/Apache。

### 桌面客户端（Tauri）
#### 构建
```bash
npm run tauri:build
```
生成的安装包位于 `src-tauri/target/` 对应目录，可按平台分发。

#### macOS 安全提醒
首次打开未签名的应用可能遇到 “应用已损坏，无法打开” 或 “无法验证开发者” 提示，可执行以下命令解除隔离：
```bash
xattr -cr "/Applications/Snail TodoList.app"
```
若安装路径不同，请替换为实际路径。之后重新打开应用即可。

#### Windows 安全提醒
若被 Windows Defender 拦截：
1. 点击“更多信息”。
2. 选择“仍要运行”。
3. 可将程序添加至白名单，避免后续再次提示。

---

## 贡献指南
1. Fork 仓库并创建分支：`git checkout -b feature/xxx`
2. 提交修改：`git commit -m "feat: xxx"`
3. 推送到远程：`git push origin feature/xxx`
4. 提交 Pull Request，附上修改说明
  
如需帮助或想参与讨论，请访问 [Issues](https://github.com/wuuJiawei/snail-todolist/issues)。
  
---
  
## 许可证
本项目采用 [MIT License](./LICENSE)。欢迎在遵循许可的前提下自由使用、修改与分发。
  
---
  
## 致谢
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/)
- [Vditor](https://b3log.org/vditor/)
- 所有反馈、提交 Issue 或 PR 的用户
  
愿你在蜗牛般的步调中，也能持续推进每一个目标 🐌。