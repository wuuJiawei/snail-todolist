# Snail TodoList

Snail TodoList 是一款基于 React、TypeScript 和 Supabase 的任务管理应用，支持 Web、Vercel 与 Tauri 桌面端。

## 功能

- Supabase 登录、注册、OAuth、退出与会话恢复
- 任务创建、编辑、完成、放弃、删除、恢复与拖拽排序
- 清单、标签、共享成员和任务关联管理
- 日期视图、筛选、搜索、富文本和附件
- 打卡、统计与番茄钟
- ZIP 数据导入导出
- 深浅色主题、响应式布局和 Tauri 桌面端

## 数据访问架构

业务代码不直接调用 Supabase SDK：

```text
Component
  ↓
Hook / Query / UseCase
  ↓
Repository Interface
  ↓
Supabase Repository
  ↓
Supabase SDK
```

当前支持的数据 Provider：

- `supabase`：已实现
- `self-host`：保留配置值，尚未实现

切换到后续自部署后端时，应实现 `src/data/contracts` 中的 Repository 接口并在 Provider 工厂注册，不修改页面和核心业务代码。

## 本地运行

要求：Node.js 18+、npm。

```bash
npm ci
cp .env.example .env
npm run dev
```

在 `.env` 中填写：

```env
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 质量检查

```bash
npm run test
npm run lint
npm run build
```

## 数据导入导出

设置页的“数据管理”支持导出和导入 ZIP 备份。备份包含清单、任务、标签及任务—标签关系，只操作当前 Supabase 账户的数据。

## Tauri

```bash
npm run tauri:dev
npm run tauri:build
```

## 部署

- Vercel：配置上述环境变量后使用默认 Vite 构建命令。
- 自托管 Web：执行 `npm run build` 并部署 `dist/`。
- Supabase：执行 `sql_migrations/` 中需要的数据库迁移并配置认证回调地址。

## 文档

- [环境配置](docs/SETUP.md)
- [发布流程](docs/release-process.md)
- [数据 Provider 重构进度](docs/data-provider-refactor-progress.md)

## License

[MIT](LICENSE)
