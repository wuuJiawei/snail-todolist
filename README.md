<div>
  <img src="./public/logo.png" alt="Snail TodoList Logo" width="120" height="120" />
  
  # 🐌 Snail TodoList
  
  Snail TodoList 是一款面向个人与小团队的任务管理应用，强调"足够强大但保持轻量"。项目采用 React + 多后端架构，支持云端（Supabase）和本地离线（IndexedDB）两种存储模式，可自行部署并掌控数据，适合希望在现有工具之外获得更强可定制性的使用者。
  
  ## 为什么再写一个 To-Do List？
  1. **可控的数据与部署**：支持云端 Supabase 或完全本地离线模式，数据完全由你掌控。
  2. **灵活的存储模式**：用户可随时在登录页或设置中切换在线/离线模式，支持数据导入导出迁移。
  3. **合适的功能密度**：保留拖拽、标签、富文本等常用特性，同时避免臃肿的工作流系统。
  4. **易于拓展**：采用 shadcn/ui + Tailwind 的组件体系，便于快速新增模块或重新设计界面。
  
  ---
  
  ## ✨ 功能概览

  ### 核心功能
  - 任务管理：新增、编辑、完成、放弃、恢复，支持项目分组与排序
  - 日期视图：快速查看"今天""最近 7 天"，按需筛选逾期任务
  - 标签体系：支持标签增删、过滤、跨项目复用
  - 富文本详情：Milkdown 提供 Markdown 编辑、图片上传、代码块等能力
  - 打卡与统计：内置打卡日历、连续天数统计、总次数概览
  - 深浅色主题 + 响应式布局，桌面与移动端体验一致

  ### 🆕 离线模式
  - **完全本地存储**：使用 IndexedDB 存储所有数据，无需网络连接
  - **无需登录**：离线模式下可直接使用，无需注册账号
  - **用户可控切换**：在登录页点击"离线模式"按钮，或在设置中随时切换
  - **数据隔离**：在线/离线数据完全独立，通过导入导出进行迁移
  - **桌面端支持**：Tauri 桌面客户端完美支持离线模式

  ### 🆕 数据导入导出
  - **一键导出**：将所有清单、任务、标签导出为 ZIP 压缩包
  - **灵活导入**：支持"合并"或"替换"两种导入模式
  - **跨模式迁移**：在线/离线模式间自由迁移数据
  - **进度显示**：导入导出过程实时显示进度
  
  ---
  
  ## 🧱 技术栈
  | 分类 | 使用技术 |
  | --- | --- |
  | 前端框架 | React 18 · TypeScript |
  | 构建工具 | Vite |
  | UI 体系 | shadcn/ui · Radix UI · Tailwind CSS |
  | 状态与数据 | TanStack Query · Zustand · React Context |
  | 后端服务 | Supabase（PostgreSQL · Auth · Storage · Realtime） |
  | 本地存储 | IndexedDB（离线模式） |
  | 富文本 & 日期 | Milkdown · react-day-picker · date-fns |
  | 其它组件 | React Router 6 · React Hook Form · Recharts · JSZip |
  | 桌面客户端 | Tauri |
  
  ---
  
  ## 📁 项目结构
  ```text
  src/
  ├── components/
  │   ├── checkin/         # 打卡模块
  │   ├── settings/        # 设置页面组件
  │   ├── sidebar/
  │   ├── tasks/
  │   └── ui/              # 基础 UI 封装
  ├── config/              # 存储模式配置
  ├── contexts/            # Auth、Task、Project 等全局上下文
  ├── hooks/               # 自定义 Hooks
  ├── integrations/        # Supabase client 等集成
  ├── lib/                 # 公共工具与样式辅助
  ├── queries/             # TanStack Query 配置与 keys
  ├── services/            # API 调用与数据传输服务
  ├── storage/             # 存储抽象层
  │   ├── indexeddb/       # IndexedDB 适配器
  │   ├── supabase/        # Supabase 适配器
  │   └── types.ts         # 存储接口定义
  ├── store/               # Zustand store 定义
  ├── utils/               # 辅助函数与常量
  └── pages/               # 路由页面
  ```
  
  ---
  
  ## 🚀 快速开始

  ### 方式一：离线模式（推荐新手）

  无需配置后端，开箱即用：

  ```bash
  git clone https://github.com/wuuJiawei/snail-todolist.git
  cd snail-todolist
  npm install
  npm run dev
  ```

  打开 <http://localhost:5173>，点击登录页的"离线模式"按钮即可开始使用。

  ### 方式二：在线模式（Supabase）

  #### 环境要求
  - Node.js 18+
  - npm / pnpm / yarn
  - Supabase 项目（已启用数据库与 Storage）

  #### 初始化
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

  #### 数据库设置
  参考 `docs/SETUP.md`（如无，可在 Supabase 控制台创建下列数据表：`projects`、`tasks`、`tags`、`checkin_records` 等，并配置 RLS 规则与 Realtime）。

  #### 启动开发环境
  ```bash
  npm run dev
  ```
  默认运行在 <http://localhost:5173>。
  
  ---

  ## 🔄 存储模式切换

  ### 从登录页切换
  - 点击"离线模式"按钮直接进入离线模式
  - 使用账号登录则进入在线模式

  ### 从设置页切换
  1. 进入 设置 → 数据管理
  2. 在"存储模式"区域切换开关
  3. 确认切换（建议先导出数据）
  4. 应用将自动重载

  ### 数据迁移
  在线/离线模式的数据完全隔离，需通过导入导出迁移：
  1. 在当前模式下导出数据（设置 → 数据管理 → 导出）
  2. 切换到目标模式
  3. 导入之前导出的数据包

  ---

  ## 📋 常用脚本
  | 命令 | 说明 |
  | --- | --- |
  | `npm run dev` | 开发服务器 |
  | `npm run build` | 生产构建 |
  | `npm run preview` | 预览生产构建 |
  | `npm run lint` | ESLint 检查 |
  | `npm run test` | 运行测试 |
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

> 若部署后页面提示 "Missing VITE_SUPABASE_URL"，通常是环境变量未正确设置或未推送到所需环境。
> 
> 💡 即使未配置 Supabase，用户仍可使用离线模式。

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
首次打开未签名的应用可能遇到 "应用已损坏，无法打开" 或 "无法验证开发者" 提示，可执行以下命令解除隔离：
```bash
xattr -cr "/Applications/Snail TodoList.app"
```
若安装路径不同，请替换为实际路径。之后重新打开应用即可。

#### Windows 安全提醒
若被 Windows Defender 拦截：
1. 点击"更多信息"。
2. 选择"仍要运行"。
3. 可将程序添加至白名单，避免后续再次提示。

---

## 🗺️ Roadmap

### 已完成
- [x] 任务管理（增删改查、完成、放弃、恢复）
- [x] 项目分组与排序
- [x] 标签体系
- [x] 富文本编辑（Milkdown）
- [x] 打卡与统计
- [x] 深浅色主题
- [x] 响应式布局
- [x] Tauri 桌面客户端
- [x] 离线模式（IndexedDB 本地存储）
- [x] 用户可控模式切换（在线/离线）
- [x] 数据导入导出

### 计划中
- [ ] 自建后端服务（替代 Supabase）
  - [ ] RESTful API 设计
  - [ ] 用户认证（JWT）
  - [ ] Docker 一键部署
  - [ ] 支持 SQLite / PostgreSQL
- [ ] 数据同步（离线 ↔ 在线）
- [ ] 任务提醒与通知
- [ ] 日历视图
- [ ] 番茄钟集成
- [ ] 多语言支持（i18n）
- [ ] 移动端 App（React Native / Flutter）

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
- [Milkdown](https://milkdown.dev/)
- [Tauri](https://tauri.app/)
- 所有反馈、提交 Issue 或 PR 的用户
  
愿你在蜗牛般的步调中，也能持续推进每一个目标 🐌。
</div>
