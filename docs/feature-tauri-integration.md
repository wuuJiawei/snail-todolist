# Tauri 集成改造计划与追踪

> 本文档用于跟踪“将现有 Vite + React + TS 项目集成 Tauri（Rust）以支持桌面客户端打包”的实施清单、分支策略、验收标准与风险。执行过程中使用复选框逐项勾选。

## 分支策略

- 建议创建长期特性分支：`feature/tauri-integration`
- 开发流程：
  - 起分支：`git checkout -b feature/tauri-integration`
  - 持续在该分支提交改动，小步提交，保持可回滚
  - 阶段性提交通过 PR 合并到 `main`（在满足“验收标准”后）

## 里程碑

- M1：完成初始化与基本窗口运行（能打开 Tauri 窗口加载本地 `dist`）
- M2：OAuth 与通知等关键功能适配完成，桌面端可等价使用
- M3：签名、公证与 CI 多平台构建打通

## 执行清单（逐项打勾）

- 环境与初始化
  - [x] 安装 Rust 工具链（用户已完成）
  - [x] 安装 `@tauri-apps/cli`（通过 npx 使用最新版本）
  - [x] 初始化 Tauri（生成 `src-tauri/`、`tauri.conf.json`、`Cargo.toml`）

- 配置与脚本
  - [x] 配置 `tauri.conf.json`：`devUrl` 改为 8080 对齐 Vite，更新 `identifier`
  - [x] 配置安全：`CSP`、远端域名白名单（含 Supabase 域名）
  - [x] 调整 Vite：`base: './'`、HMR 端口与 Tauri 对齐
  - [x] 在 `package.json` 增加 `tauri:dev`、`tauri:build` 脚本

- 资源与品牌
  - [x] 准备 1024x1024 源图（PNG/SVG）并运行 `tauri icon` 生成多平台图标

- 桌面特性适配
  - [x] Supabase OAuth：注册自定义协议（`snailtodo://`）——已在 Tauri 配置添加，待前端回调适配
  - [ ] 通知适配：抽象统一通知层，优先 Tauri 通知，浏览器通知回退

- 安全与权限
  - [ ] 最小权限 `allowlist`，限制外部链接统一用系统浏览器打开

- 构建与发布
  - [ ] macOS 签名与公证（Apple ID/证书/钥匙串）
  - [ ] CI 多平台构建与产物发布（macOS/Windows/Linux）
  - [ ] 更新文档（README/SETUP）：本地运行、打包、签名、公证、发布流程

- 质量保障
  - [ ] 本地桌面端通过验收标准
  - [ ] 关键路径端到端验证：登录、创建/编辑任务、附件上传、搜索、通知

## 验收标准（必须全部满足）

- `bun run tauri:dev` 能启动桌面窗口，正常连接 Supabase 并完成登录
- `bun run tauri:build` 产出可安装包（macOS DMG/Windows MSI 等），安装后功能等价 Web 版
- 桌面 OAuth 回调与通知工作稳定，无明显回归
- CI 能产出签名/公证后的安装包（macOS）

## 风险与注意事项

- HMR 端口与 Overlay 配置不当会导致开发窗口空白
- CSP/域名白名单配置错误会阻断远端资源（如 Supabase）
- 自定义协议的 OAuth 回调需端到端测试（深链到应用）
- 签名/公证在本地与 CI 的一致性需提前演练
- 权限最小化，谨慎开启 `fs/shell/http` 等能力

## 变更点（预期）

- 新增目录：`src-tauri/`（`src/main.rs`、`Cargo.toml`、`tauri.conf.json` 等）
- 调整：`vite.config.ts`（`base`、HMR、`outDir`）
- 脚本：在 `package.json` 增加 `tauri:dev`、`tauri:build`
- 代码：抽象通知层、OAuth 回调处理、必要的 IPC 封装（后续 PR 实施）

## 命令参考

- 创建分支：
  - `git checkout -b feature/tauri-integration`
- 安装 CLI（任选其一）：
  - `bun add -D @tauri-apps/cli`
  - `npm i -D @tauri-apps/cli`
- 初始化：
  - `bunx tauri init --ci`（或 `npx tauri init --ci`）
- 生成图标：
  - `bunx tauri icon ./public/logo.png`
- 开发与构建：
  - `bun run tauri:dev`
  - `bun run tauri:build`
