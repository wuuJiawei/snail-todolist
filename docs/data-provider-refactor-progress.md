# Data Provider 精简与重构进度

## 基线与边界

- 基线分支：`origin/main`
- 基线提交：`4ee24998604c90c1d87b35376b4d817400f85276`
- 工作分支：`refactor/data-provider-cleanup`
- 核心约束：保留现有业务功能和 UI；仅移除 IndexedDB 离线模式；禁止整体推翻重写。
- 数据访问边界：`Component → Hook/Query/UseCase → Repository → Supabase Provider → Supabase SDK`
- 状态边界：TanStack Query 管服务端数据，Zustand 管客户端 UI，Context 只承载生命周期能力。

## 修改前基线（2026-08-05）

| 检查 | 结果 | 已有问题 |
| --- | --- | --- |
| `npm ci` | 通过 | 22 个依赖漏洞：1 low、4 moderate、15 high、2 critical；未执行破坏性自动升级 |
| `npm run test` | 失败 | 63 项中 60 通过、3 失败：番茄钟空白标题 1 项；非法随机日期导致导入导出 2 项失败 |
| `npm run lint` | 失败 | 108 errors、19 warnings，主要是条件 Hook、显式 `any`、旧编辑器注释和既有 Hook 依赖问题 |
| `npm run build` | 通过 | Browserslist 数据过期；主 chunk 超过 6 MB |

## 里程碑与小节点

状态取值：`待开始`、`进行中`、`已完成`、`阻塞`。每个节点结束后至少运行受影响测试、全量测试、lint 和 build；结果写入“回归记录”。

### M0：安全基线与完整盘点 — 已完成

- [x] M0.1 从 `origin/main` 建立独立 feature 分支和 worktree — 已完成
- [x] M0.2 安装锁定依赖并记录 test/lint/build 基线 — 已完成
- [x] M0.3 盘点 Supabase、IndexedDB、模式分支、服务与 UI 调用图 — 已完成
- [x] M0.4 记录生产代码行数和离线相关文件清单 — 已完成

### M1：锁定核心业务行为 — 已完成

- [x] M1.1 修正不表达有效业务行为的既有测试生成器/断言 — 已完成
- [x] M1.2 补充任务完成、放弃、删除、恢复、排序行为测试 — 已完成
- [x] M1.3 补充项目、任务、标签关联与导入导出测试 — 已完成（复用现有关联测试并修正导入导出生成器）
- [x] M1.4 补充 Query 缓存刷新保护测试 — 已完成

### M2：领域契约与 Provider 工厂 — 已完成

- [x] M2.1 建立统一领域错误（Supabase 转换在 M3 实现） — 已完成
- [x] M2.2 拆分 task/project/tag/check-in/pomodoro/auth 等 Repository 接口 — 已完成
- [x] M2.3 建立 `DataProvider`、`createDataProvider`、`getDataProvider` — 已完成
- [x] M2.4 覆盖 `supabase`、`self-host` 未实现和非法配置测试 — 已完成

### M3：Supabase Provider 实现与映射 — 已完成

- [x] M3.1 将数据库 Row 类型限制在 Supabase Provider 内 — 已完成
- [x] M3.2 建立 task/project/tag 等 mapper 与映射测试 — 已完成
- [x] M3.3 将现有 Supabase 数据访问封装到各 Repository 实现 — 已完成（adapter bridge 已在 M7 删除）
- [x] M3.4 建立 Repository 契约测试 — 已完成

### M4：业务层迁移与复杂流程编排 — 已完成

- [x] M4.1 迁移任务、项目、标签 Query 和 mutation — 已完成
- [x] M4.2 迁移认证、打卡、番茄钟、搜索、附件与资料访问 — 已完成
- [x] M4.3 将导入清理、实体 upsert 和关系恢复流程放入 UseCase — 已完成
- [x] M4.4 清除 Component、Context、Store、业务 Hook 的直接 Supabase SDK 调用 — 已完成

### M5：彻底移除离线模式 — 已完成

- [x] M5.1 删除 IndexedDB adapter、测试和离线专属类型 — 已完成
- [x] M5.2 删除离线用户、会话、初始化与模式分支 — 已完成
- [x] M5.3 删除模式切换 UI、文案、环境变量与配置文件 — 已完成
- [x] M5.4 清理 `fake-indexeddb` 等不再使用的依赖 — 已完成

### M6：状态与职责收敛 — 已完成

- [x] M6.1 缩减 `TaskProvider` 的数据访问、缓存和提示职责 — 已完成（1,487 行降至 975 行）
- [x] M6.2 消除 Context、Zustand、Query 的重复服务端状态 — 已完成
- [x] M6.3 收敛重复 toast、错误处理和缓存失效逻辑 — 已完成（新增路径统一使用 `DataError`、`withSupabaseError` 和 Query key；旧 Provider service 的内部提示冻结为渐进遗留）
- [x] M6.4 拆分仍然过大的业务模块，保持增量改造 — 已完成（活动日志、防抖和排序队列已拆 Hook）

### M7：清理、全量回归与交付 — 已完成

- [x] M7.1 删除无用文件、依赖、类型、配置和兼容分支 — 已完成
- [x] M7.2 静态扫描确认 SDK 边界与离线代码归零 — 已完成
- [x] M7.3 `npm run test`、`npm run lint`、`npm run build` 全绿 — 已完成
- [x] M7.4 统计代码行变化、提交 SHA、自部署接入说明和遗留问题 — 已完成

### M8：Provider 内部遗留吸收 — 已完成

- [x] M8.1 将项目协作逻辑吸收到 `SupabaseProjectCollaborationRepository` — 已完成
- [x] M8.2 将打卡逻辑吸收到 `SupabaseCheckInRepository` — 已完成
- [x] M8.3 将番茄钟逻辑吸收到 `SupabasePomodoroRepository` — 已完成
- [x] M8.4 将标签逻辑吸收到 `SupabaseTagRepository` — 已完成
- [x] M8.5 将搜索、活动、附件、资料和应用信息逻辑吸收到对应 Repository — 已完成
- [x] M8.6 将项目 CRUD/排序吸收到 `SupabaseProjectRepository` — 已完成
- [x] M8.7 将任务核心 CRUD/排序吸收到 `SupabaseTaskRepository` — 已完成
- [x] M8.8 删除最终 `SupabaseAdapter`、`legacy` 和无用依赖，重新生成最终统计 — 已完成
- [x] M8.9 启动本地 Web 执行认证页、受保护路由和控制台冒烟 — 已完成
- [x] M8.10 连接真实 Supabase 执行注册、会话与核心 CRUD 回归 — 已完成

### M9：PR 评审整改 — 已完成

- [x] M9.1 将 task/project/tag/member Repository 合同改为 camelCase 领域模型 — 已完成
- [x] M9.2 将 replace 导入清理改为受 `auth.uid()` 约束的原子 RPC — 已完成
- [x] M9.3 清除 Component、Page、Context、Query 对 DataProvider 的直接调用 — 已完成
- [x] M9.4 将标签查询、缓存同步和 CRUD 从 `TaskProvider` 拆到独立 Hook — 已完成
- [x] M9.5 固定 Tauri npm API/CLI 2.8 版本，消除 CI 的跨 minor 版本漂移 — 已完成
- [x] M9.6 在 ESLint flat config 中排除 Tauri 构建产物 — 已完成
- [x] M9.7 同步 pnpm lockfile 的 Tauri 固定版本，恢复 Cloudflare 冻结安装 — 已完成
- [x] M9.8 将伪装成 PNG 的 `icon.ico` 重建为标准多尺寸 Windows ICO — 已完成

## 回归记录

| 时间 | 节点 | 受影响测试 | 全量测试 | lint | build | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-05 | 修改前基线 | — | 3 failed / 60 passed | 108 errors / 19 warnings | 通过（2 类既有警告） | 已记录基线债务 |
| 2026-08-05 | M1.1–M1.3 行为锁定 | 24 passed | 68 passed | 变更文件 0 errors / 0 warnings | 通过（基线警告不变） | 可进入契约设计 |
| 2026-08-05 | M2.1–M2.2 领域契约 | — | 68 passed | `src/data` 0 errors / 0 warnings | 通过（基线警告不变） | 契约不暴露 Supabase SDK 类型 |
| 2026-08-05 | M2.3–M3 Provider 与 Supabase 实现 | 16 passed | 80 passed | `src/data` 0 errors / 0 warnings | 通过（基线警告不变） | 工厂、映射、错误和任务契约已覆盖 |
| 2026-08-05 | M4.1/M4.2/M4.4 业务迁移 | 4 compatibility passed | 83 passed | 变更范围 0 errors / 2 个既有 Fast Refresh warnings | 通过（基线警告不变） | UI、Context、Store、Hook、Query 的 SDK 直连已归零 |
| 2026-08-05 | M4.3 导入导出 UseCase | 4 passed | 83 passed | 变更范围 0 errors / 0 warnings | 通过（基线警告不变） | 导入保留实体 ID 并恢复任务标签关系 |
| 2026-08-05 | M5.1–M5.4 离线模式移除 | 游客聊天 RLS 1 passed | 49 passed | 变更范围 0 errors / 0 warnings；全量 33 errors / 16 warnings | 通过（基线警告不变） | IndexedDB、离线身份/入口/配置和测试依赖归零；测试数下降来自离线专属测试删除 |
| 2026-08-05 | M1.4/M6.2 Query 状态收敛 | Query 刷新与键隔离 2 passed | 51 passed | 变更范围 0 errors / 1 个既有 Fast Refresh warning；全量 33 errors / 16 warnings | 通过（基线警告不变） | task/project/tag 服务端状态只保留在 Query cache；删除 task/project Zustand store |
| 2026-08-05 | M6.1/M6.4 TaskProvider 拆分 | 状态转换与排序计算 2 passed | 53 passed | 变更范围 0 errors / 0 warnings；全量 33 errors / 16 warnings | 通过（基线警告不变） | Provider 减少 512 行；活动记录/描述防抖与排序持久化队列拆为独立 Hook |
| 2026-08-05 | M6.3/M7.1 lint 与过渡层清理 | Supabase Repository 相关测试 13 passed | 53 passed | 0 errors / 0 warnings | 通过（基线警告不变） | 清除全仓 lint 债务；删除 adapter bridge 和 3 个未使用兼容类型 |
| 2026-08-05 | M7.2 SDK 目录边界收口 | Supabase Provider 相关测试 13 passed | 53 passed | 0 errors / 0 warnings | 通过（基线警告不变） | Supabase client、数据库类型和 SDK 调用全部位于 `src/data/providers/supabase` |
| 2026-08-05 | M7.3 最终回归 | 53 passed | 53 passed | 0 errors / 0 warnings | 通过（Browserslist 与大 chunk 两类基线警告） | 交付检查通过 |
| 2026-08-05 | M8.1–M8.5 Provider 辅助实体吸收 | Supabase Repository 测试通过 | 65 passed | 0 errors / 0 warnings | 通过（基线警告不变） | 删除 7 个 legacy service，修复打卡、番茄钟、标签和搜索边界行为 |
| 2026-08-05 | M8.6 Project Repository 去适配器化 | 3 passed | 68 passed | 0 errors / 0 warnings | 通过（基线警告不变） | Project CRUD/排序直接依赖注入的 Supabase client，数据库写入字段完成收口 |
| 2026-08-05 | M8.7 Task Repository 去适配器化 | 12 passed | 71 passed | 0 errors / 0 warnings | 通过（基线警告不变） | 保留共享项目权限和附件映射；恢复时间字段真实清空；查询错误不再吞并为空数组 |
| 2026-08-05 | M8.8 最终 legacy/依赖清理 | 12 passed | 71 passed | 0 errors / 0 warnings | 通过（基线警告不变） | `npm ci` 成功；Adapter、legacy、`uuid` 及空目录全部删除；静态扫描归零 |
| 2026-08-05 | M8.9 本地 Web 冒烟 | `/auth`、登录/注册切换、`/settings`、`/chat` | 71 passed | 0 errors / 0 warnings | 通过（基线警告不变） | 修复 Query 空数据引用导致的 Provider 无限更新；复测控制台 0 errors |
| 2026-08-05 | M8.10 真实 Supabase 回归 | 注册/确认/登录/退出/会话恢复；清单、任务、标签、状态流转、垃圾桶、日期、标记、搜索、打卡、番茄钟、导出 | 71 passed | 0 errors / 0 warnings | 通过（Browserslist 与大 chunk 两类基线警告） | 真实 RLS/CRUD 通过；导出 ZIP 含项目、任务、标签和关系数据；搜索弹窗仍有 `origin/main` 已存在的 Radix 无障碍标题告警 |
| 2026-08-06 | M9 PR 评审整改 | 领域 mapper、partial update、原子清理、Query 边界、标签缓存、npm/pnpm 冻结安装、Tauri aarch64 release | 74 passed | 0 errors / 0 warnings | Web 与 Tauri build 通过（基线警告不变） | 四项评审问题已修复；replace 导入在清理失败时停止；三平台 Tauri CI 通过，Windows 非法 ICO 根因已修复 |

## M0 调用盘点

### 规模

- TypeScript/TSX：33,547 行，其中生产代码 31,064 行、测试 2,483 行。
- IndexedDB 专属实现与测试：1,886 行。
- `TaskProvider.tsx`：1,487 行；`taskService.ts`：1,416 行；`storage/operations.ts`：959 行。
- 生产代码直接依赖 Supabase SDK 或 client：20 个文件。
- 生产代码含离线模式分支：22 个文件。
- 通过 `storage/operations` 访问数据的生产文件：20 个。

### 数据访问链路现状

1. 部分业务走 `Component/Hook → storage/operations → StorageAdapter`。
2. `StorageAdapter` 根据 `VITE_STORAGE_MODE` 在 `IndexedDBAdapter` 和 `SupabaseAdapter` 之间切换。
3. `SupabaseAdapter` 又反向调用 `src/services/*Service`，这些 service 直接调用 Supabase SDK，形成 adapter/service 循环职责。
4. 认证、实时订阅、项目分享、聊天室和加入共享项目绕过 adapter，直接调用 Supabase。
5. toast 和错误吞并同时散落在 operations、service、Context 与 Component。

### 直接 Supabase 调用分类

- 认证/会话：`AuthContext.tsx`、`AuthCallback.tsx`。
- 任务/标签/活动/搜索：`taskService.ts`、`tagService.ts`、`taskActivityService.ts`、`searchService.ts`。
- 项目/分享/成员：`ProjectContext.tsx`、两个共享项目 Dialog、`JoinSharedProject.tsx`、两个 project service。
- 打卡/番茄钟/应用信息：对应三个 service。
- 实时消息：`Chat.tsx`。
- 统一 adapter 与初始化：`storage/supabase/SupabaseAdapter.ts`、`integrations/supabase/client.ts`。

### 离线专属范围

- 数据实现：`src/storage/indexeddb/*`、`src/config/storage.ts`、`.env.offline`。
- 模式入口：设置页数据管理、模式切换 Dialog、认证页入口。
- 离线身份/路由：`AuthContext`、`AuthRoute`、`UserMenu`、账户设置。
- 条件禁用：共享项目、聊天室、实时任务/项目订阅、Query 重连策略。
- 测试依赖：`fake-indexeddb`、IndexedDB adapter 测试、storage mode 测试。

## 提交记录

| 阶段 | Commit | 说明 |
| --- | --- | --- |
| M0 | `169d28d` | 建立可持续更新的里程碑、节点和回归记录 |
| M1 | `4625618` | 修正随机测试边界并锁定任务状态转换和排序行为 |
| M2 | `550cce6` | 建立领域模型、Repository 契约和 Provider 工厂 |
| M3 | `15f479b` | 建立 Supabase repositories、mapper 和统一错误 |
| M4 | `8733526`、`df6c351` | 迁移业务数据访问和导入导出流程 |
| M5 | `c3dde5b` | 删除 IndexedDB、离线模式及其依赖和 UI |
| M6.2 | `11eafc4` | 统一 task/project/tag 的 Query server-state 来源并补缓存测试 |
| M6.1/M6.4 | `e7e134d` | 拆分活动记录和排序 Hook，缩减 TaskProvider |
| M6.3 | `c3ec1a6` | 清除既有 lint errors 和 warnings |
| M7.1 | `d680008` | 删除 Supabase adapter bridge 和统一大接口残留 |
| M7.2 | `fceba29` | 将 Supabase client、SDK 类型和数据库类型完全收口到 Provider |
| M7.4 | `eb47690` | 汇总第一轮重构结果和接入说明 |
| M8.1–M8.5 | `d90409a`、`4550211`、`a8f5c51`、`39e0dae`、`7d4e332` | 依次吸收项目协作、打卡、番茄钟、标签和辅助服务 |
| M8.6 | `365cd8b` | 将项目 CRUD、排序和映射直接收口到 Repository |
| M8.7 | `6929b79` | 将任务 CRUD、状态、排序、共享权限和附件映射直接收口到 Repository |
| M8.8 | `eccd2e4` | 删除最终 Adapter/legacy 和仅由 legacy 使用的 `uuid` 依赖 |
| M8.9 | `898073f` | 修复空 Query 数据引用导致的 Provider 重复更新 |
| M8.10 | `7911898` | 记录真实 Supabase 回归结果 |
| 文档与配置 | `614d82b`、`71680c4`、`e3aa52d`、`bbd0418` | 完成最终报告、README、默认 Provider 和 Agent 指南 |
| M9.1–M9.4 | `8f780c9` | 修复 PR 评审发现的数据映射、导入安全和职责边界问题 |
| M9.5–M9.6 | `177877d` | 固定兼容的 Tauri npm 工具链并排除桌面构建产物 |
| M9.7 | `165e5ca` | 同步 pnpm lockfile 中的 Tauri 固定版本 |
| M9.8 | `1617d73` | 重建符合 Windows Resource Compiler 要求的应用图标 |

## 风险与决策记录

- `origin/main` 与 `v2.0` 相差 56 个提交；本次已由用户明确选择 `origin/main`，不合并或 cherry-pick `v2.0`。
- 原工作区 `docker/Dockerfile.web` 有用户未提交改动；通过独立 worktree 隔离，本分支不会携带该改动。
- 原 `StorageAdapter`、Provider 内部 `SupabaseAdapter` 和所有 legacy service 已全部删除；Repository 直接依赖注入 Supabase client。
- 游客聊天写入受 RLS 的 `x-anonymous-id` 校验约束；迁移到 Repository 时已在 Supabase Provider 内恢复专用请求头并加入回归测试，页面不感知 SDK 细节。
- M5 删除了 34 个离线专属测试，故全量测试由 M4 的 83 项变为 49 项；保留的 Supabase 和业务行为测试全部通过。
- task/project/tag 数组和加载状态已从 Zustand 移除；Query cache 是唯一服务端状态源，Context 只提供数据视图、业务操作和必要的生命周期能力。
- 当前分支已通过仓库外启动脚本连接真实 Supabase，完成邮箱注册确认、登录/退出/会话恢复和核心 RLS/CRUD 回归；环境配置和测试账号均未写入 Git。
- replace 导入依赖 `sql_migrations/20260806102000_clear_owned_data.sql`；生产发布前必须先应用该迁移。缺少 RPC 时导入会安全失败，不会退回客户端逐条删除。

## 交付统计

- TypeScript/TSX 总量：33,547 行降至 28,685 行，减少 4,862 行。
- 生产 TypeScript/TSX：31,064 行降至 26,628 行，减少 4,436 行。
- 测试 TypeScript/TSX：2,483 行降至 2,057 行；净减少来自删除 IndexedDB/storage 专属测试，同时新增 Repository、工厂、Query 和业务行为测试。
- 全部文件 diff：新增 5,453 行、删除 10,223 行，净减少 4,770 行；共影响 134 个文件。
- `TaskProvider.tsx`：1,487 行降至 701 行；标签职责位于 152 行的 `useTaskTagActions.ts`。
- 静态扫描：`src` 内 IndexedDB/离线配置、Adapter/legacy 引用均为 0；Provider 外 Supabase SDK/client 引用为 0；旧 `src/storage` 引用为 0。

## 最终删除清单

- 离线实现与配置：`.env.offline`、`src/config/storage.ts`、`src/config/storage.test.ts`、整个 `src/storage/indexeddb`、旧 `src/storage` operations/types/adapter。
- 离线 UI：`ModeSwitchDialog.tsx`；认证、用户菜单、账户设置、数据管理等页面中的离线入口、提示和条件分支已移除。`DataManagementSettings` 保留，仅服务当前 Supabase 数据的导入导出。
- 重复服务与过渡层：task/tag/check-in/pomodoro/search/activity/project collaboration/app info service、两个 Supabase Adapter、最终 `legacy` 目录和 `legacyTypes.ts`。
- 重复状态：`src/store/taskStore.ts`、`src/store/projectStore.ts`。
- 依赖：`fake-indexeddb`、`uuid`。

## 最终数据访问结构

```text
src/data/
├── contracts/                 # 领域 Repository 与统一错误
├── providers/supabase/        # Supabase client、Row 类型、mapper、Repository 实现
├── createDataProvider.ts      # provider 配置解析与工厂
├── dataProvider.ts            # DataProvider 聚合接口
├── models.ts                  # provider-neutral 模型
└── operations.ts              # 业务兼容入口/流程调用
```

业务依赖固定为：`Component/Context → Hook/Query/UseCase → Repository → Supabase 实现 → Supabase SDK`。认证、项目、任务、标签、打卡、番茄钟、搜索、附件、聊天室等原有直接 SDK 调用均已迁入 Provider；Component、Context、Store 和业务 Hook 扫描无直连。

## Repository 与 Supabase 实现

| Repository 契约 | Supabase 实现 |
| --- | --- |
| `TaskRepository` | `SupabaseTaskRepository` |
| `ProjectRepository` | `SupabaseProjectRepository` |
| `ProjectCollaborationRepository` | `SupabaseProjectCollaborationRepository` |
| `TagRepository` | `SupabaseTagRepository` |
| `CheckInRepository` | `SupabaseCheckInRepository` |
| `PomodoroRepository` | `SupabasePomodoroRepository` |
| `AuthRepository` | `SupabaseAuthRepository` |
| `ChatRepository` | `SupabaseChatRepository` |
| `ActivityRepository` | `SupabaseActivityRepository` |
| `FileRepository` | `SupabaseFileRepository` |
| `SearchRepository` | `SupabaseSearchRepository` |
| `ProfileRepository` | `SupabaseProfileRepository` |
| `DataTransferRepository` | `SupabaseDataTransferRepository` |
| `AppInfoRepository` | `SupabaseAppInfoRepository` |

数据库 Row 到领域模型统一通过 `mappers.ts`；附件 JSON、旧附件字段、check-in/pomodoro/file/auth 字段转换和 provider 错误不会散落到业务层。

## 状态职责结果

- TanStack Query：任务、项目、标签等服务端数据、加载状态、失效和重连刷新。
- Zustand：仅保留用户资料等客户端全局状态；task/project 重复 server-state store 已删除。
- Context：提供数据视图、操作编排和 Provider 生命周期，不再持有第二份服务端数据源或调用 SDK。
- Repository：单实体数据访问、映射和 provider 错误转换。
- UseCase/service：导入、清理、关系恢复等多实体流程。
- Component：展示、交互、toast；Provider 内部 toast 已归零。

## 新增回归覆盖

- Provider 工厂：`supabase`、`self-host` 未实现、非法配置。
- Repository：任务、项目、标签、项目协作、打卡、番茄钟、搜索、活动、聊天室的映射和访问契约。
- 任务：完成/放弃/删除/恢复、排序、共享项目权限、附件兼容映射、缺失记录错误。
- 项目与标签：创建排序、更新/不存在、任务标签关联。
- Query：缓存 key 隔离与刷新。
- 导入导出：实体 ID、项目/任务/标签和任务标签关系保持。
- 统一错误：PostgREST/Supabase 错误到 `DataError`。
- 真实环境冒烟：认证会话、清单/任务/标签 CRUD、任务状态流转、日期/标记/搜索、打卡、番茄钟及 ZIP 导出。

最终共有 17 个测试文件、71 项测试，全部通过。

## 尚未处理的问题

- `self-host` 只保留规划值和明确的“未实现”错误；本次目标是不实现后端本身。
- 共享清单邀请需要第二个测试用户；附件上传需要确认目标 Storage bucket 策略；聊天室只验证了认证加载，未向全局聊天室发送测试消息。这三项为避免影响其他用户而未执行写入回归。
- 搜索弹窗缺少 `DialogTitle`，打开时会产生一条 Radix 无障碍控制台错误；`origin/main` 同样存在，非本次重构引入。
- build 仍提示 Browserslist 数据过期和主 chunk 约 6 MB；均为修改前已有警告，拆包属于独立性能任务。
- `npm ci` 报告 21 个依赖漏洞（1 low、3 moderate、15 high、2 critical）；未执行可能引入破坏性升级的 `npm audit fix --force`。
- `database.types.ts` 来自主分支且落后于部分 SQL migration（如 task `attachments`、`flagged`）；运行时已在 Provider Row mapper 隔离，后续应从目标 Supabase schema 重新生成类型。

## Self-host Provider 接入步骤

1. 在 `src/data/providers/self-host` 实现现有 Repository 接口，只返回 `src/data/models.ts` 和业务类型中的领域模型。
2. 组装 `createSelfHostDataProvider(): DataProvider`。
3. 在 `createDataProvider` 的 `self-host` 分支注册工厂。
4. 将 `VITE_DATA_PROVIDER` 改为 `self-host`；页面、Context、Store、业务 Hook 和 Query 不需要修改。
