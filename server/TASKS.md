# SnailTask Server 开发任务清单

> 基于前端功能全面审计后的完整任务清单，确保后端 API 完整覆盖所有前端功能。

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

## M2 - 前端适配与数据迁移（新增）

### Phase 23: 前端 API 适配层

- [ ] **T23.1 创建 API 客户端基础设施**
  - 验收标准：统一的 HTTP 客户端，支持 token 管理和错误处理
  - 落点：`src/lib/apiClient.ts`
  - 功能：
    - 基于 fetch 的请求封装
    - 自动附加 Authorization header
    - 统一错误处理和 toast 提示
    - 请求/响应拦截器

- [ ] **T23.2 创建后端模式配置**
  - 验收标准：支持切换 Supabase / 自定义后端 / 离线模式
  - 落点：`src/lib/backendConfig.ts`
  - 配置项：
    ```typescript
    type BackendMode = 'supabase' | 'custom' | 'offline';
    interface BackendConfig {
      mode: BackendMode;
      customApiUrl?: string;
    }
    ```

- [ ] **T23.3 创建数据适配器接口**
  - 验收标准：定义统一的数据访问接口
  - 落点：`src/adapters/DataAdapter.ts`
  - 接口定义：
    ```typescript
    interface DataAdapter {
      // Auth
      login(email: string, password: string): Promise<AuthResult>;
      register(email: string, password: string, name: string): Promise<AuthResult>;
      logout(): Promise<void>;
      getCurrentUser(): Promise<User | null>;
      
      // Tasks
      getTasks(listId?: string): Promise<Task[]>;
      createTask(task: CreateTaskInput): Promise<Task>;
      updateTask(id: string, updates: UpdateTaskInput): Promise<Task>;
      deleteTask(id: string): Promise<void>;
      // ... 其他方法
    }
    ```

- [ ] **T23.4 实现 Supabase 适配器**
  - 验收标准：现有 Supabase 逻辑封装为适配器
  - 落点：`src/adapters/SupabaseAdapter.ts`
  - 要求：保持现有功能不变

- [ ] **T23.5 实现自定义后端适配器**
  - 验收标准：调用自定义后端 API
  - 落点：`src/adapters/CustomBackendAdapter.ts`
  - 要求：实现 DataAdapter 接口的所有方法

- [ ] **T23.6 实现离线适配器**
  - 验收标准：使用 IndexedDB 本地存储
  - 落点：`src/adapters/OfflineAdapter.ts`
  - 要求：复用现有离线存储逻辑

- [ ] **T23.7 创建适配器工厂**
  - 验收标准：根据配置返回对应适配器
  - 落点：`src/adapters/index.ts`
  - 功能：
    ```typescript
    function getAdapter(): DataAdapter {
      switch (config.mode) {
        case 'supabase': return new SupabaseAdapter();
        case 'custom': return new CustomBackendAdapter();
        case 'offline': return new OfflineAdapter();
      }
    }
    ```

- [ ] **T23.8 更新 Services 使用适配器**
  - 验收标准：所有 service 通过适配器访问数据
  - 落点：`src/services/*.ts`
  - 要求：渐进式迁移，保持向后兼容

---

### Phase 24: 数据迁移工具

- [ ] **T24.1 创建数据导出接口（后端）**
  - 验收标准：支持导出用户全部数据
  - 落点：`server/internal/handler/migration.go`
  - 接口：
    - `GET /api/v1/export` - 导出用户数据（JSON 格式）
  - 数据包含：lists, tasks, tags, task_tags, pomodoro_sessions, task_activities

- [ ] **T24.2 创建数据导入接口（后端）**
  - 验收标准：支持导入完整数据集
  - 落点：`server/internal/handler/migration.go`
  - 接口：
    - `POST /api/v1/import` - 导入用户数据
  - 要求：事务保证、ID 映射、冲突处理

- [ ] **T24.3 实现 Supabase 数据导出（前端）**
  - 验收标准：从 Supabase 导出用户数据
  - 落点：`src/services/migrationService.ts`
  - 功能：
    ```typescript
    async function exportFromSupabase(): Promise<ExportData> {
      // 导出 lists, tasks, tags 等
    }
    ```

- [ ] **T24.4 实现数据导入到自定义后端（前端）**
  - 验收标准：将导出数据导入自定义后端
  - 落点：`src/services/migrationService.ts`
  - 功能：
    ```typescript
    async function importToCustomBackend(data: ExportData): Promise<void> {
      // 调用后端导入接口
    }
    ```

- [ ] **T24.5 创建迁移向导 UI**
  - 验收标准：引导用户完成数据迁移
  - 落点：`src/components/settings/MigrationWizard.tsx`
  - 步骤：
    1. 选择数据源（Supabase）
    2. 配置目标后端 URL
    3. 预览数据
    4. 执行迁移
    5. 验证结果

- [ ] **T24.6 实现迁移进度追踪**
  - 验收标准：显示迁移进度和错误信息
  - 落点：`src/hooks/useMigration.ts`
  - 功能：进度百分比、当前步骤、错误列表

---

### Phase 25: 后端设置 UI

- [ ] **T25.1 创建后端配置页面**
  - 验收标准：用户可配置后端模式
  - 落点：`src/pages/Settings/BackendSettings.tsx`
  - 功能：
    - 选择模式：Supabase / 自定义后端 / 离线
    - 输入自定义后端 URL
    - 测试连接
    - 保存配置

- [ ] **T25.2 实现后端连接测试**
  - 验收标准：验证后端可用性
  - 落点：`src/services/backendService.ts`
  - 功能：调用 /healthz 检查连接

- [ ] **T25.3 实现配置持久化**
  - 验收标准：配置保存到 localStorage
  - 落点：`src/lib/backendConfig.ts`
  - 要求：应用启动时自动加载配置

---

## M3 - 功能补全（后端）

### Phase 16: 任务模型扩展

- [ ] **T16.1 扩展 Task 模型字段**
  - 验收标准：Task 模型包含前端所需全部字段
  - 落点：`server/internal/model/task.go`
  - 新增字段：
    ```go
    Completed    bool           `gorm:"default:false" json:"completed"`
    CompletedAt  *time.Time     `json:"completed_at"`
    Deleted      bool           `gorm:"default:false;index" json:"deleted"`
    DeletedAt    *time.Time     `json:"deleted_at"`
    Abandoned    bool           `gorm:"default:false" json:"abandoned"`
    AbandonedAt  *time.Time     `json:"abandoned_at"`
    Flagged      bool           `gorm:"default:false" json:"flagged"`
    Icon         string         `gorm:"size:50" json:"icon"`
    Attachments  datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"attachments"`
    ```

- [ ] **T16.2 更新任务状态映射**
  - 验收标准：completed 字段与 status 字段正确同步
  - 落点：`server/internal/service/task_service.go`
  - 逻辑：status=done 时自动设置 completed=true, completed_at=now()

- [ ] **T16.3 实现软删除接口**
  - 验收标准：任务移入回收站而非物理删除
  - 落点：`server/internal/handler/task.go`
  - 接口：
    - `DELETE /api/v1/tasks/:id` - 软删除（设置 deleted=true）
    - `POST /api/v1/tasks/:id/restore` - 恢复任务
    - `DELETE /api/v1/tasks/:id/permanent` - 永久删除
    - `GET /api/v1/trash` - 获取回收站任务

- [ ] **T16.4 实现任务放弃功能**
  - 验收标准：任务可标记为放弃状态
  - 落点：`server/internal/handler/task.go`
  - 接口：
    - `POST /api/v1/tasks/:id/abandon` - 放弃任务
    - `POST /api/v1/tasks/:id/reactivate` - 重新激活

- [ ] **T16.5 实现任务标记功能**
  - 验收标准：任务可标记/取消标记
  - 落点：`server/internal/handler/task.go`
  - 接口：
    - `PATCH /api/v1/tasks/:id/flag` - 切换标记状态
    - `GET /api/v1/flagged` - 获取所有标记任务

---

### Phase 17: 标签系统

- [ ] **T17.1 创建 Tag 模型**
  - 验收标准：Tag 模型定义完整
  - 落点：`server/internal/model/tag.go`
  - 结构：
    ```go
    type Tag struct {
        ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
        Name      string     `gorm:"size:100;not null" json:"name"`
        UserID    uuid.UUID  `gorm:"type:uuid;index;not null" json:"user_id"`
        ProjectID *uuid.UUID `gorm:"type:uuid;index" json:"project_id"`
        CreatedAt time.Time  `json:"created_at"`
    }
    ```

- [ ] **T17.2 创建 TaskTag 关联模型**
  - 验收标准：多对多关联表定义完整
  - 落点：`server/internal/model/task_tag.go`
  - 结构：
    ```go
    type TaskTag struct {
        TaskID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"task_id"`
        TagID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"tag_id"`
        CreatedAt time.Time `json:"created_at"`
    }
    ```

- [ ] **T17.3 实现 Tag Repository**
  - 验收标准：标签 CRUD 操作封装完整
  - 落点：`server/internal/repository/tag_repo.go`
  - 方法：Create, FindByID, FindByUser, FindByProject, Update, Delete

- [ ] **T17.4 实现 Tag Service**
  - 验收标准：标签业务逻辑完整
  - 落点：`server/internal/service/tag_service.go`
  - 方法：CreateTag, GetTags, UpdateTag, DeleteTag, AttachToTask, DetachFromTask

- [ ] **T17.5 实现 Tag Handler**
  - 验收标准：标签 API 接口可用
  - 落点：`server/internal/handler/tag.go`
  - 接口：
    - `GET /api/v1/tags` - 获取用户标签（可选 project_id 过滤）
    - `POST /api/v1/tags` - 创建标签
    - `PUT /api/v1/tags/:id` - 更新标签
    - `DELETE /api/v1/tags/:id` - 删除标签
    - `POST /api/v1/tasks/:id/tags/:tagId` - 给任务添加标签
    - `DELETE /api/v1/tasks/:id/tags/:tagId` - 移除任务标签
    - `GET /api/v1/tasks/:id/tags` - 获取任务的标签

---

### Phase 18: 任务活动记录

- [ ] **T18.1 创建 TaskActivity 模型**
  - 验收标准：活动记录模型定义完整
  - 落点：`server/internal/model/task_activity.go`
  - 结构：
    ```go
    type TaskActivity struct {
        ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
        TaskID      uuid.UUID      `gorm:"type:uuid;index;not null" json:"task_id"`
        UserID      *uuid.UUID     `gorm:"type:uuid;index" json:"user_id"`
        AnonymousID *uuid.UUID     `gorm:"type:uuid;index" json:"anonymous_id"`
        Action      string         `gorm:"size:50;not null" json:"action"`
        Metadata    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
        CreatedAt   time.Time      `json:"created_at"`
    }
    ```
  - Action 枚举：task_created, title_updated, description_updated, status_updated, due_date_updated, project_changed, attachments_updated, tag_added, tag_removed, task_moved_to_trash, task_restored, task_abandoned, task_reactivated

- [ ] **T18.2 实现 TaskActivity Repository**
  - 验收标准：活动记录数据访问层完整
  - 落点：`server/internal/repository/task_activity_repo.go`
  - 方法：Create, FindByTask (分页), FindByUser

- [ ] **T18.3 实现 TaskActivity Service**
  - 验收标准：活动记录自动创建
  - 落点：`server/internal/service/task_activity_service.go`
  - 要求：在任务变更时自动记录活动

- [ ] **T18.4 实现 TaskActivity Handler**
  - 验收标准：活动记录 API 可用
  - 落点：`server/internal/handler/task_activity.go`
  - 接口：
    - `GET /api/v1/tasks/:id/activities` - 获取任务活动记录（分页）

---

### Phase 19: 番茄钟功能

- [ ] **T19.1 创建 PomodoroSession 模型**
  - 验收标准：番茄钟会话模型定义完整
  - 落点：`server/internal/model/pomodoro.go`
  - 结构：
    ```go
    type PomodoroSessionType string
    const (
        PomodoroFocus      PomodoroSessionType = "focus"
        PomodoroShortBreak PomodoroSessionType = "short_break"
        PomodoroLongBreak  PomodoroSessionType = "long_break"
    )
    
    type PomodoroSession struct {
        ID        uuid.UUID           `gorm:"type:uuid;primaryKey" json:"id"`
        UserID    uuid.UUID           `gorm:"type:uuid;index;not null" json:"user_id"`
        StartTime time.Time           `gorm:"not null" json:"start_time"`
        EndTime   *time.Time          `json:"end_time"`
        Duration  int                 `gorm:"not null" json:"duration"` // 分钟
        Type      PomodoroSessionType `gorm:"size:20;not null" json:"type"`
        Completed bool                `gorm:"default:false" json:"completed"`
        CreatedAt time.Time           `json:"created_at"`
    }
    ```

- [ ] **T19.2 实现 Pomodoro Repository**
  - 验收标准：番茄钟数据访问层完整
  - 落点：`server/internal/repository/pomodoro_repo.go`
  - 方法：Create, FindByID, FindByUser, FindActive, Update, Delete, GetTodayStats

- [ ] **T19.3 实现 Pomodoro Service**
  - 验收标准：番茄钟业务逻辑完整
  - 落点：`server/internal/service/pomodoro_service.go`
  - 方法：StartSession, CompleteSession, CancelSession, GetActive, GetSessions, GetTodayStats

- [ ] **T19.4 实现 Pomodoro Handler**
  - 验收标准：番茄钟 API 接口可用
  - 落点：`server/internal/handler/pomodoro.go`
  - 接口：
    - `POST /api/v1/pomodoro/sessions` - 开始会话
    - `GET /api/v1/pomodoro/sessions` - 获取会话列表（支持时间范围过滤）
    - `GET /api/v1/pomodoro/sessions/active` - 获取当前活跃会话
    - `PATCH /api/v1/pomodoro/sessions/:id/complete` - 完成会话
    - `PATCH /api/v1/pomodoro/sessions/:id/cancel` - 取消会话
    - `DELETE /api/v1/pomodoro/sessions/:id` - 删除会话
    - `GET /api/v1/pomodoro/stats/today` - 获取今日统计

---

### Phase 20: 项目分享功能

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
| DELETE | /api/v1/tasks/:id | 软删除任务 | ⚠️ 需改为软删除 |
| PATCH | /api/v1/tasks/:id/status | 更新状态 | ✅ |
| PATCH | /api/v1/tasks/:id/sort | 更新排序 | ✅ |
| POST | /api/v1/tasks/:id/restore | 恢复任务 | ❌ |
| DELETE | /api/v1/tasks/:id/permanent | 永久删除 | ❌ |
| POST | /api/v1/tasks/:id/abandon | 放弃任务 | ❌ |
| POST | /api/v1/tasks/:id/reactivate | 重新激活 | ❌ |
| PATCH | /api/v1/tasks/:id/flag | 切换标记 | ❌ |

#### 任务附件
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/tasks/:id/attachments | 获取附件 | ❌ |
| POST | /api/v1/tasks/:id/attachments | 上传附件 | ❌ |
| DELETE | /api/v1/tasks/:id/attachments/:aid | 删除附件 | ❌ |

#### 标签
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/tags | 获取标签列表 | ❌ |
| POST | /api/v1/tags | 创建标签 | ❌ |
| PUT | /api/v1/tags/:id | 更新标签 | ❌ |
| DELETE | /api/v1/tags/:id | 删除标签 | ❌ |
| GET | /api/v1/tasks/:id/tags | 获取任务标签 | ❌ |
| POST | /api/v1/tasks/:id/tags/:tagId | 添加标签 | ❌ |
| DELETE | /api/v1/tasks/:id/tags/:tagId | 移除标签 | ❌ |

#### 任务活动
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/tasks/:id/activities | 获取活动记录 | ❌ |

#### 番茄钟
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| POST | /api/v1/pomodoro/sessions | 开始会话 | ❌ |
| GET | /api/v1/pomodoro/sessions | 获取会话列表 | ❌ |
| GET | /api/v1/pomodoro/sessions/active | 获取活跃会话 | ❌ |
| PATCH | /api/v1/pomodoro/sessions/:id/complete | 完成会话 | ❌ |
| PATCH | /api/v1/pomodoro/sessions/:id/cancel | 取消会话 | ❌ |
| DELETE | /api/v1/pomodoro/sessions/:id | 删除会话 | ❌ |
| GET | /api/v1/pomodoro/stats/today | 今日统计 | ❌ |

#### 聚合查询
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | /api/v1/overview | 仪表盘概览 | ✅ |
| GET | /api/v1/today | 今日任务 | ✅ |
| GET | /api/v1/upcoming | 即将到期 | ✅ |
| GET | /api/v1/search | 搜索任务 | ✅ |
| GET | /api/v1/trash | 回收站 | ❌ |
| GET | /api/v1/flagged | 标记任务 | ❌ |

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
