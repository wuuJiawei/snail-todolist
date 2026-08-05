# SnailTodoList Agent Guide

## 项目概览

- 技术栈：React 18、TypeScript、Vite、Tailwind CSS、shadcn/ui、Supabase。
- 应用入口：`index.html`、`src/main.tsx`。
- 页面与业务组件位于 `src/`，静态资源位于 `public/`。
- Supabase 迁移位于 `sql_migrations/`；不要假设存在 `supabase/migrations/`。
- Tauri 桌面端仍保留在 `src-tauri/`，对应脚本为 `npm run tauri:dev` 和 `npm run tauri:build`。

## 数据访问边界

业务代码必须遵循：

```text
Component
  -> Hook / Query / UseCase
  -> Repository Interface
  -> Supabase Repository
  -> Supabase SDK
```

- Supabase SDK、数据库 Row 类型和字段映射只允许位于 `src/data/providers/supabase/`。
- 组件、Context、Store、Hook 不得直接导入 Supabase client。
- Repository 返回领域模型和统一错误，不暴露 Query Builder、PostgREST Response 或数据库字段细节。
- `VITE_DATA_PROVIDER` 缺省时使用 `supabase`；`self-host` 仅为预留实现。
- 当前不支持 IndexedDB 和离线模式，不要新增离线分支、离线身份或模式切换入口。

## 状态职责

- TanStack Query：服务端数据、缓存、加载状态和失效。
- Zustand：纯客户端全局 UI 状态。
- Context：Provider 生命周期和必要的业务操作编排。
- Repository：单实体数据读写与映射。
- UseCase/Service：导入导出、关系恢复等跨实体流程。
- Component：展示、交互和用户反馈。

## React 与 TypeScript

- 遵循 KISS 和 DRY；优先复用现有 Hook、组件和工具。
- 使用明确的组件、Hook 和 Repository 名称，避免无意义缩写。
- 禁止无理由新增 `any` 或宽泛类型断言。
- 复杂业务逻辑放入 Hook、Query 或 UseCase，避免堆在 JSX 和 Provider 中。
- 使用受控组件、单向数据流、稳定 key，并处理加载、错误、空数据和竞态状态。
- 遵循现有 shadcn/ui、Radix UI 和 Tailwind 约定，保证键盘操作、语义标签和 aria 属性。
- 注释只解释必要的“为什么”，不要写重复代码行为的注释。

## Supabase 与迁移

- 新建迁移文件使用 `sql_migrations/YYYYMMDDHHmmss_description.sql` 命名。
- 新表必须启用 RLS；策略按 select/insert/update/delete 和角色明确拆分。
- 迁移应包含目的、影响表和安全注意事项说明。
- 修改 Supabase 数据访问时补充 Repository 映射、错误转换和业务行为测试。

## 验证与提交

Node.js 18+ 和 npm 是默认开发环境。提交前至少运行：

```bash
npm ci
npm run test
npm run lint
npm run build
```

- 保持改动增量化，保留现有业务功能和 UI 效果。
- 使用 Conventional Commits 英文提交信息。
- 任何涉及认证、RLS、数据删除、导入导出或迁移的改动，都要记录回归范围和残余风险。
