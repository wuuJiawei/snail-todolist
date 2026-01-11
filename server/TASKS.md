# SnailTask Server 开发任务清单

> 基于前端功能全面审计后的完整任务清单，确保后端 API 完整覆盖所有前端功能。

---

## ⚠️ 重要声明

**本项目将完全移除 Supabase 依赖，使用自定义后端服务取代。**

- ❌ 不兼容 Supabase
- ❌ 不保留 Supabase 模式
- ✅ 使用自定义后端（Go + PostgreSQL）
- ✅ 保留离线模式（IndexedDB）

前端存储模式简化为两种：
```typescript
type StorageMode = 'online' | 'offline';
```

---

## 功能覆盖分析

### ✅ 已实现功能
- 用户认证（注册、登录、邮箱验证码）
- 用户资料管理
- 清单/项目 CRUD
- 任务基础 CRUD
- 任务状态管理
- 搜索功能
- 批量操作
- 拖拽排序
- 清单成员管理
- 聚合查询（overview/today/upcoming）

### ❌ 缺失功能（需补充）
1. **标签系统** - tags 表 CRUD + task_tags 关联
2. **任务活动记录** - task_activities 时间线
3. **番茄钟** - pomodoro_sessions 管理
4. **项目分享** - project_shares 分享码
5. **任务附件** - attachments JSONB 字段
6. **任务标记** - flagged 字段
7. **软删除/回收站** - deleted/deleted_at 字段
8. **任务放弃** - abandoned/abandoned_at 字段

---

## M0 - MVP 基础功能（已完成）

### Phase 0-8: 基础架构 ✅
- [x] 项目初始化、配置、日志
- [x] 数据库连接与迁移
- [x] 认证模块
- [x] 清单模块
- [x] 任务模块
- [x] 聚合查询
- [x] 路由整合
- [x] 健康检查

---

## M1 - 增强功能（已完成）

### Phase 9-11 ✅
- [x] 搜索功能
- [x] 批量操作
- [x] 拖拽排序

---

## M2 - 架构重构（参考《重构》第二版）

> **重构目标**：将业务逻辑从前端迁移到后端，前端只负责 UI 展示和用户交互。
> 
> **现有问题**：
> - 前端直接操作 Supabase，承担过多业务逻辑
> - 单表查询架构，前端需要多次请求并在内存中组装数据
> - 权限检查、数据校验等逻辑散落在前端各处
> - 难以维护和扩展
>
> **重构原则**（《重构》第二版）：
> - 小步前进，每步可验证
> - 保持系统随时可运行
> - 先写测试，再重构
> - 提取函数、移动函数、内联函数

---

### Phase 23: 前端架构重构（移除 Supabase）

> **目标**：完全移除 Supabase，前端只保留 online 和 offline 两种模式

- [ ] **T23.1 创建轻量 API 客户端**
  - 验收标准：统一的 HTTP 客户端，仅负责请求/响应
  - 落点：`src/lib/apiClient.ts`
  - 功能：
    - fetch 封装，自动附加 Authorization header
    - 统一错误处理（网络错误、业务错误）
    - Token 管理（存储、刷新）
  - **不包含**：业务逻辑、数据转换、缓存

- [ ] **T23.2 简化存储模式配置**
  - 验收标准：只支持 online 和 offline 两种模式
  - 落点：`src/config/storage.ts`
  - 变更：
    ```typescript
    // 移除 supabase，只保留两种模式
    type StorageMode = 'online' | 'offline';
    ```

- [ ] **T23.3 创建 OnlineStorageAdapter**
  - 验收标准：实现 StorageAdapter 接口，调用后端 API
  - 落点：`src/storage/online/OnlineStorageAdapter.ts`
  - 要求：
    - 直接调用后端聚合接口
    - 不在前端做数据组装
    - 错误处理委托给 apiClient

- [ ] **T23.4 更新存储工厂**
  - 验收标准：根据配置返回对应适配器（无 Supabase）
  - 落点：`src/storage/index.ts`
  - 逻辑：
    ```typescript
    // 只有两种模式，online 为默认
    if (mode === 'offline') return new IndexedDBAdapter();
    return new OnlineStorageAdapter();
    ```

- [ ] **T23.5 移除 Supabase 相关代码**
  - 验收标准：完全删除 Supabase 依赖
  - 删除文件：
    - `src/lib/supabase.ts`
    - `src/storage/supabase/*`
  - 删除依赖：
    - `@supabase/supabase-js`
  - 清理引用：移除所有 import supabase 的代码

- [ ] **T23.6 简化前端服务层**
  - 验收标准：移除前端业务逻辑，保留 UI 相关代码
  - 落点：`src/services/*.ts`
  - 重构：
    - 删除权限检查逻辑（后端负责）
    - 删除数据组装逻辑（后端负责）
    - 保留 toast 提示、UI 状态管理

---

### Phase 24: 后端聚合接口

- [ ] **T24.1 实现任务聚合查询**
  - 验收标准：单次请求返回任务及关联数据
  - 落点：`server/internal/handler/task.go`
  - 接口：`GET /api/v1/lists/:id/tasks`
  - 返回：任务列表 + 每个任务的标签 + 活动记录摘要
  - **替代**：前端多次查询 tasks + task_tags + tags

- [ ] **T24.2 实现仪表盘聚合接口**
  - 验收标准：单次请求返回仪表盘所有数据
  - 落点：`server/internal/handler/overview.go`
  - 接口：`GET /api/v1/overview`
  - 返回：
    - 统计数据（总任务数、完成数、逾期数）
    - 清单列表（含任务计数）
    - 今日任务
    - 即将到期任务
  - **替代**：前端 5+ 次查询

- [ ] **T24.3 实现任务详情聚合接口**
  - 验收标准：单次请求返回任务完整信息
  - 落点：`server/internal/handler/task.go`
  - 接口：`GET /api/v1/tasks/:id`
  - 返回：任务详情 + 标签 + 附件 + 活动记录
  - **替代**：前端 4 次查询

---

### Phase 25: 数据迁移工具（Supabase → 自定义后端）

> **目标**：帮助现有 Supabase 用户一次性迁移数据到自定义后端

- [ ] **T25.1 创建数据导出接口（后端）**
  - 验收标准：导出用户全部数据为 JSON
  - 落点：`server/internal/handler/migration.go`
  - 接口：`GET /api/v1/export`
  - 数据：lists, tasks, tags, task_tags, pomodoro_sessions, task_activities

- [ ] **T25.2 创建数据导入接口（后端）**
  - 验收标准：导入完整数据集，事务保证
  - 落点：`server/internal/handler/migration.go`
  - 接口：`POST /api/v1/import`
  - 要求：ID 映射、冲突处理、回滚支持

- [ ] **T25.3 创建 Supabase 数据导出脚本（一次性工具）**
  - 验收标准：从 Supabase 导出用户数据为 JSON 文件
  - 落点：`scripts/export-from-supabase.ts`（独立脚本，不打包到前端）
  - 说明：这是一次性迁移工具，迁移完成后可删除

- [ ] **T25.4 创建迁移向导 UI**
  - 验收标准：引导用户完成数据迁移
  - 落点：`src/components/settings/MigrationWizard.tsx`
  - 步骤：上传导出文件 → 配置后端 URL → 执行导入 → 验证

---

### Phase 26: 后端配置 UI

- [ ] **T26.1 创建后端配置页面**
  - 验收标准：用户可配置后端 URL 和切换离线模式
  - 落点：`src/pages/Settings/BackendSettings.tsx`
  - 功能：
    - 后端 URL 配置
    - 连接测试
    - 切换离线模式

- [ ] **T26.2 实现配置持久化**
  - 验收标准：配置保存到 localStorage，启动时加载
  - 落点：`src/config/storage.ts`

---

## M3 - 功能补全（后端）

### Phase 16: 任务模型扩展 ✅

- [x] **T16.1 扩展 Task 模型字段**
- [x] **T16.2 更新任务状态映射**
- [x] **T16.3 实现软删除接口**
- [x] **T16.4 实现任务放弃功能**
- [x] **T16.5 实现任务标记功能**

---

### Phase 17: 标签系统 ✅

- [x] **T17.1 创建 Tag 模型**
- [x] **T17.2 创建 TaskTag 关联模型**
- [x] **T17.3 实现 Tag Repository**
- [x] **T17.4 实现 Tag Service**
- [x] **T17.5 实现 Tag Handler**

---

### Phase 18: 任务活动记录 ✅

- [x] **T18.1 创建 TaskActivity 模型**
- [x] **T18.2 实现 TaskActivity Repository**
- [x] **T18.3 实现 TaskActivity Service**
- [x] **T18.4 实现 TaskActivity Handler**

---

### Phase 19: 番茄钟功能 ✅

- [x] **T19.1 创建 PomodoroSession 模型**
- [x] **T19.2 实现 Pomodoro Repository**
- [x] **T19.3 实现 Pomodoro Service**
- [x] **T19.4 实现 Pomodoro Handler**

---

### Phase 20: 项目分享功能（待实现）

- [ ] **T20.1 创建 ProjectShare 模型**
  - 验收标准：项目分享模型定义完整
  - 落点：`server/internal/model/project_share.go`
  - 结构：
    ```go
    type ProjectShare struct {
        ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
        ProjectID uuid.UUID  `gorm:"type:uuid;index;not null" json:"project_id"`
        CreatedBy uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
        ShareCode string     `gorm:"size:8;uniqueIndex;not null" json:"share_code"`
        IsActive  bool       `gorm:"default:true" json:"is_active"`
        ExpiresAt time.Time  `gorm:"not null" json:"expires_at"`
        CreatedAt time.Time  `json:"created_at"`
    }
    ```

- [ ] **T20.2 实现 ProjectShare Repository**
  - 验收标准：分享数据访问层完整
  - 落点：`server/internal/repository/project_share_repo.go`
  - 方法：Create, FindByCode, FindActiveByProject, Deactivate

- [ ] **T20.3 实现 ProjectShare Service**
  - 验收标准：分享业务逻辑完整
  - 落点：`server/internal/service/project_share_service.go`
  - 方法：GetOrCreateShare, DeactivateShare, JoinByCode

- [ ] **T20.4 实现 ProjectShare Handler**
  - 验收标准：分享 API 接口可用
  - 落点：`server/internal/handler/project_share.go`
  - 接口：
    - `GET /api/v1/lists/:id/share` - 获取或创建分享链接
    - `DELETE /api/v1/lists/:id/share` - 停用分享链接
    - `POST /api/v1/share/join` - 通过分享码加入项目

---

### Phase 21: 任务附件功能

- [ ] **T21.1 更新 Task 模型支持附件**
  - 验收标准：attachments 字段可正确存取
  - 落点：`server/internal/model/task.go`
  - 附件结构：
    ```go
    type TaskAttachment struct {
        ID           string    `json:"id"`
        Filename     string    `json:"filename"`
        OriginalName string    `json:"original_name"`
        URL          string    `json:"url"`
        Size         int64     `json:"size"`
        Type         string    `json:"type"`
        UploadedAt   time.Time `json:"uploaded_at"`
    }
    ```

- [ ] **T21.2 实现附件上传接口**
  - 验收标准：文件可上传并关联到任务
  - 落点：`server/internal/handler/attachment.go`
  - 接口：
    - `POST /api/v1/tasks/:id/attachments` - 上传附件
    - `DELETE /api/v1/tasks/:id/attachments/:attachmentId` - 删除附件
    - `GET /api/v1/tasks/:id/attachments` - 获取任务附件列表

- [ ] **T21.3 集成文件存储**
  - 验收标准：支持本地存储或 S3 兼容存储
  - 落点：`server/pkg/storage/storage.go`
  - 配置：STORAGE_TYPE (local/s3), STORAGE_PATH, S3_BUCKET 等

---

---

## M3 - 协作功能（已完成）

### Phase 12: 项目共享 ✅
- [x] 共享数据模型
- [x] 邀请接口
- [x] 权限检查

---

## M4 - 生产化

### Phase 13: 缓存与限流（规划）

- [ ] **T13.1 集成 Redis**
  - 验收标准：Redis 连接可用
  - 落点：`server/pkg/redis/redis.go`

- [ ] **T13.2 实现请求限流**
  - 验收标准：每用户每分钟 100 次请求限制
  - 落点：`server/internal/middleware/ratelimit.go`

- [ ] **T13.3 实现 overview 缓存**
  - 验收标准：overview 数据缓存 30 秒
  - 落点：`server/internal/service/overview_service.go`

---

### Phase 14: 可观测性 ✅
- [x] Prometheus metrics
- [x] 链路追踪（X-Request-ID）
- [x] 结构化日志

---

### Phase 15: 发布与部署 ✅
- [x] Docker Hub 发布
- [x] 部署文档
- [x] 一键部署脚本

---

## 附录

### A. 完整 API 路由清单

#### 数据迁移
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/export | 导出用户数据 | ❌ |
| POST | /api/v1/import | 导入用户数据 | ❌ |

#### 认证（公开）
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| POST | /api/v1/auth/register | 用户注册 | ✅ |
| POST | /api/v1/auth/login | 密码登录 | ✅ |
| POST | /api/v1/auth/email/code | 发送验证码 | ✅ |
| POST | /api/v1/auth/email/login | 验证码登录 | ✅ |

#### 用户（需认证）
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/user/profile | 获取资料 | ✅ |
| PUT | /api/v1/user/profile | 更新资料 | ✅ |
| PUT | /api/v1/user/password | 修改密码 | ✅ |

#### 清单/项目
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/lists | 获取清单列表 | ✅ |
| POST | /api/v1/lists | 创建清单 | ✅ |
| PUT | /api/v1/lists/:id | 更新清单 | ✅ |
| DELETE | /api/v1/lists/:id | 删除清单 | ✅ |
| PATCH | /api/v1/lists/:id/sort | 更新排序 | ✅ |

#### 清单成员
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/lists/:id/members | 获取成员 | ✅ |
| POST | /api/v1/lists/:id/members | 邀请成员 | ✅ |
| PUT | /api/v1/lists/:id/members/:memberId | 更新角色 | ✅ |
| DELETE | /api/v1/lists/:id/members/:memberId | 移除成员 | ✅ |

#### 项目分享
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/lists/:id/share | 获取/创建分享 | ❌ |
| DELETE | /api/v1/lists/:id/share | 停用分享 | ❌ |
| POST | /api/v1/share/join | 加入项目 | ❌ |

#### 任务
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/lists/:id/tasks | 获取清单任务 | ✅ |
| POST | /api/v1/lists/:id/tasks | 创建任务 | ✅ |
| GET | /api/v1/tasks/:id | 获取任务详情 | ✅ |
| PUT | /api/v1/tasks/:id | 更新任务 | ✅ |
| DELETE | /api/v1/tasks/:id | 软删除任务 | ✅ |
| PATCH | /api/v1/tasks/:id/status | 更新状态 | ✅ |
| PATCH | /api/v1/tasks/:id/sort | 更新排序 | ✅ |
| POST | /api/v1/tasks/:id/restore | 恢复任务 | ✅ |
| DELETE | /api/v1/tasks/:id/permanent | 永久删除 | ✅ |
| POST | /api/v1/tasks/:id/abandon | 放弃任务 | ✅ |
| POST | /api/v1/tasks/:id/reactivate | 重新激活 | ✅ |
| PATCH | /api/v1/tasks/:id/flag | 切换标记 | ✅ |

#### 任务附件
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/tasks/:id/attachments | 获取附件 | ❌ |
| POST | /api/v1/tasks/:id/attachments | 上传附件 | ❌ |
| DELETE | /api/v1/tasks/:id/attachments/:aid | 删除附件 | ❌ |

#### 标签
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/tags | 获取标签列表 | ✅ |
| POST | /api/v1/tags | 创建标签 | ✅ |
| PUT | /api/v1/tags/:id | 更新标签 | ✅ |
| DELETE | /api/v1/tags/:id | 删除标签 | ✅ |
| GET | /api/v1/tasks/:id/tags | 获取任务标签 | ✅ |
| POST | /api/v1/tasks/:id/tags/:tagId | 添加标签 | ✅ |
| DELETE | /api/v1/tasks/:id/tags/:tagId | 移除标签 | ✅ |

#### 任务活动
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/tasks/:id/activities | 获取活动记录 | ✅ |

#### 番茄钟
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| POST | /api/v1/pomodoro/sessions | 开始会话 | ✅ |
| GET | /api/v1/pomodoro/sessions | 获取会话列表 | ✅ |
| GET | /api/v1/pomodoro/sessions/active | 获取活跃会话 | ✅ |
| PATCH | /api/v1/pomodoro/sessions/:id/complete | 完成会话 | ✅ |
| PATCH | /api/v1/pomodoro/sessions/:id/cancel | 取消会话 | ✅ |
| DELETE | /api/v1/pomodoro/sessions/:id | 删除会话 | ✅ |
| GET | /api/v1/pomodoro/stats/today | 今日统计 | ✅ |

#### 聚合查询
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/overview | 仪表盘概览 | ✅ |
| GET | /api/v1/today | 今日任务 | ✅ |
| GET | /api/v1/upcoming | 即将到期 | ✅ |
| GET | /api/v1/search | 搜索任务 | ✅ |
| GET | /api/v1/trash | 回收站 | ✅ |
| GET | /api/v1/flagged | 标记任务 | ✅ |

#### 批量操作
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| POST | /api/v1/tasks/batch/status | 批量更新状态 | ✅ |
| POST | /api/v1/tasks/batch/delete | 批量删除 | ✅ |

---

### B. 数据模型对照表

| 前端字段 | 后端字段 | 状态 | 说明 |
|----------|----------|------|------|
| id | ID | ✅ | UUID |
| title | Title | ✅ | |
| description | Description | ✅ | |
| completed | - | ❌ | 需新增 |
| completed_at | - | ❌ | 需新增 |
| date (due_date) | DueDate | ✅ | |
| project (list_id) | ListID | ✅ | |
| icon | - | ❌ | 需新增 |
| updated_at | UpdatedAt | ✅ | |
| user_id | UserID | ✅ | |
| sort_order | SortOrder | ✅ | |
| deleted | - | ❌ | 需新增（非 GORM 软删除）|
| deleted_at | DeletedAt | ⚠️ | 需改为普通字段 |
| abandoned | - | ❌ | 需新增 |
| abandoned_at | - | ❌ | 需新增 |
| flagged | - | ❌ | 需新增 |
| attachments | - | ❌ | 需新增 JSONB |

---

### C. 错误码定义

| Code | 含义 |
|------|------|
| 0 | 成功 |
| 1001 | 参数校验失败 |
| 1002 | 未授权 |
| 1003 | 禁止访问 |
| 1004 | 资源不存在 |
| 2001 | 邮箱已注册 |
| 2002 | 邮箱或密码错误 |
| 2003 | Token 过期 |
| 2004 | 标签已存在 |
| 2005 | 分享码无效或已过期 |
| 2006 | 已是项目成员 |
| 5000 | 服务器内部错误 |

---

### D. 开发优先级建议

**P0 - 核心功能（必须）**
1. T23.1-T23.8 前端 API 适配层
2. T16.1-T16.5 任务模型扩展（软删除、放弃、标记）
3. T17.1-T17.5 标签系统

**P1 - 重要功能（高优先）**
1. T24.1-T24.6 数据迁移工具
2. T25.1-T25.3 后端设置 UI
3. T18.1-T18.4 任务活动记录
4. T19.1-T19.4 番茄钟功能

**P2 - 增强功能（中优先）**
1. T20.1-T20.4 项目分享
2. T21.1-T21.3 任务附件

**P3 - 可选功能（低优先）**
1. T13.1-T13.3 缓存与限流

---

### E. 实施检查清单

每个 Phase 完成后需验证：

- [ ] 模型定义完整，字段类型正确
- [ ] Repository 方法覆盖所有查询场景
- [ ] Service 包含完整业务逻辑和权限检查
- [ ] Handler 参数校验完整
- [ ] 路由已注册到 main.go
- [ ] API 测试脚本更新
- [ ] 数据库迁移执行成功
