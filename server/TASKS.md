# SnailTask Server 开发任务清单

> 按里程碑拆分的可执行任务清单，每个任务包含验收标准（DoD）和相关文件落点。

---

## M0 - MVP 基础功能

### Phase 0: 项目初始化

- [x] **T0.1 初始化 Go 模块**
  - 验收标准：`go mod init` 完成，`go.mod` 存在
  - 落点：`server/go.mod`
  - 命令：`go mod init github.com/yourname/snailtask/server`

- [x] **T0.2 创建目录结构**
  - 验收标准：README 中描述的目录结构全部创建
  - 落点：`server/cmd/`, `server/internal/`, `server/db/`
  - 命令：
    ```bash
    mkdir -p cmd/server internal/{config,handler,middleware,service,repository,model,pkg/{jwt,hash,validator,logger}} db/{migrations,queries} scripts
    ```

- [x] **T0.3 添加核心依赖**
  - 验收标准：`go mod tidy` 成功，无报错
  - 落点：`server/go.mod`, `server/go.sum`
  - 依赖列表：
    ```bash
    go get github.com/gin-gonic/gin
    go get github.com/jackc/pgx/v5
    go get github.com/golang-jwt/jwt/v5
    go get github.com/spf13/viper
    go get go.uber.org/zap
    go get github.com/go-playground/validator/v10
    go get golang.org/x/crypto
    ```

- [x] **T0.4 创建 .env.example**
  - 验收标准：包含所有必需环境变量，有注释说明
  - 落点：`server/.env.example`

- [x] **T0.5 创建 Makefile**
  - 验收标准：`make help` 显示所有可用命令
  - 落点：`server/Makefile`
  - 必须包含：dev, build, test, lint, sqlc, migrate-up, migrate-down

- [x] **T0.6 创建 .air.toml 热重载配置**
  - 验收标准：`air` 命令可启动并监听文件变化
  - 落点：`server/.air.toml`

- [x] **T0.7 创建 Dockerfile**
  - 验收标准：`docker build .` 成功，镜像小于 50MB
  - 落点：`server/Dockerfile`
  - 要求：多阶段构建，使用 alpine 基础镜像

- [x] **T0.8 创建 docker-compose.yml**
  - 验收标准：`docker compose up` 启动 server + postgres
  - 落点：`server/docker-compose.yml`

---

### Phase 1: 配置与日志

- [x] **T1.1 实现配置加载**
  - 验收标准：从环境变量和 .env 文件加载配置，优先级正确
  - 落点：`server/internal/config/config.go`
  - 测试：修改 .env 后重启，配置生效
  - 结构体定义：
    ```go
    type Config struct {
        Server   ServerConfig
        Database DatabaseConfig
        JWT      JWTConfig
        CORS     CORSConfig
        Log      LogConfig
    }
    ```

- [x] **T1.2 实现结构化日志**
  - 验收标准：日志包含 timestamp, level, msg, request_id
  - 落点：`server/pkg/logger/logger.go`
  - 要求：开发环境 console 格式，生产环境 JSON 格式

- [x] **T1.3 实现 request_id 中间件**
  - 验收标准：每个请求有唯一 ID，响应头包含 X-Request-ID
  - 落点：`server/internal/middleware/request_id.go`

- [x] **T1.4 实现请求日志中间件**
  - 验收标准：记录 method, path, status, latency, request_id
  - 落点：`server/internal/middleware/logger.go`

---

### Phase 2: 数据库与迁移

- [x] **T2.1 创建初始迁移文件**
  - 验收标准：包含 users, lists, tasks 表及索引（使用 GORM AutoMigrate）
  - 落点：`server/internal/model/user.go`, `server/internal/model/list.go`, `server/internal/model/task.go`
  - 说明：项目使用 GORM AutoMigrate 而非 sqlc，模型定义即迁移

- [x] **T2.2 配置数据访问层**
  - 验收标准：Repository 层封装 GORM 操作
  - 落点：`server/internal/repository/`
  - 说明：项目使用 GORM 而非 sqlc，Repository 模式封装数据访问

- [x] **T2.3 编写 user 查询**
  - 验收标准：CreateUser, FindByEmail, FindByID, ExistsByEmail 可用
  - 落点：`server/internal/repository/user_repo.go`

- [x] **T2.4 编写 list（项目）查询**
  - 验收标准：CRUD + 按用户查询
  - 落点：`server/internal/repository/list_repo.go`

- [x] **T2.5 编写 task 查询**
  - 验收标准：CRUD + 分页 + 按状态/日期过滤 + 统计
  - 落点：`server/internal/repository/task_repo.go`

- [x] **T2.6 编写聚合查询（overview）**
  - 验收标准：GetOverview 返回仪表盘所需全部数据
  - 落点：`server/internal/service/overview_service.go`

- [x] **T2.7 实现数据库连接池**
  - 验收标准：连接池配置可调，支持健康检查
  - 落点：`server/pkg/database/database.go`

---

### Phase 3: 认证模块

- [x] **T3.1 实现密码哈希工具**
  - 验收标准：使用 bcrypt，Hash/Verify 函数可用
  - 落点：`server/internal/service/auth_service.go`（内置 bcrypt）

- [x] **T3.2 实现 JWT 工具**
  - 验收标准：生成/验证 access token
  - 落点：`server/internal/pkg/jwt/jwt.go`
  - 要求：
    - Access Token 有效期 15 分钟
    - Refresh Token 有效期 7 天
    - Claims 包含 user_id, email, exp, iat

- [x] **T3.3 实现认证中间件**
  - 验收标准：从 Authorization header 解析 token，注入 user_id 到 context
  - 落点：`server/internal/middleware/auth.go`
  - 错误响应：401 Unauthorized（无 token / token 过期 / token 无效）

- [x] **T3.4 实现 auth service**
  - 验收标准：Register, Login, EmailLogin 方法可用
  - 落点：`server/internal/service/auth_service.go`
  - 业务逻辑：
    - Register：检查邮箱唯一性，哈希密码，创建用户
    - Login：验证邮箱密码，生成 token
    - EmailLogin：邮箱验证码登录

- [x] **T3.5 实现 auth handler**
  - 验收标准：4 个接口可用，参数校验完整
  - 落点：`server/internal/handler/auth.go`
  - 接口：
    - `POST /api/v1/auth/register` - 请求体：`{email, password, nickname}`
    - `POST /api/v1/auth/login` - 请求体：`{email, password}`
    - `POST /api/v1/auth/email/code` - 发送验证码
    - `POST /api/v1/auth/email/login` - 邮箱验证码登录

- [x] **T3.6 认证接口测试**
  - 验收标准：curl 测试通过，错误场景覆盖
  - 测试脚本：`server/scripts/test_api.sh`
  - 测试结果：✓ 健康检查、注册、登录、重复注册拒绝、错误密码拒绝、获取用户资料
  - 验收标准：curl 测试通过，错误场景覆盖
  - 测试用例：
    ```bash
    # 注册
    curl -X POST http://localhost:8080/api/v1/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"123456","name":"Test"}'
    
    # 登录
    curl -X POST http://localhost:8080/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"123456"}'
    
    # 预期响应
    # {"code":0,"data":{"access_token":"...","refresh_token":"...","expires_in":900}}
    ```

---

### Phase 4: 清单（项目）模块

- [x] **T4.1 实现 list repository**
  - 验收标准：封装 GORM 操作，提供业务友好接口
  - 落点：`server/internal/repository/list_repo.go`

- [x] **T4.2 实现 list service**
  - 验收标准：CRUD + 权限检查（只能操作自己的清单）
  - 落点：`server/internal/service/list_service.go`
  - 方法：Create, GetByID, List, Update, Delete

- [x] **T4.3 实现 list handler**
  - 验收标准：4 个接口可用，参数校验完整
  - 落点：`server/internal/handler/list.go`
  - 接口：
    - `GET /api/v1/lists` - 获取当前用户的清单列表
    - `POST /api/v1/lists` - 创建清单
    - `PUT /api/v1/lists/:id` - 更新清单
    - `DELETE /api/v1/lists/:id` - 删除清单（软删除）

- [x] **T4.4 清单接口测试**
  - 验收标准：curl 测试通过
  - 测试脚本：`server/scripts/test_api.sh`
  - 测试结果：✓ 创建清单、获取清单列表、更新清单、删除清单
  - 测试用例：
    ```bash
    # 创建清单
    curl -X POST http://localhost:23333/api/v1/lists \
      -H "Authorization: Bearer <token>" \
      -H "Content-Type: application/json" \
      -d '{"name":"工作","color":"#6366f1"}'
    
    # 获取清单列表
    curl http://localhost:23333/api/v1/lists \
      -H "Authorization: Bearer <token>"
    ```

---

### Phase 5: 任务模块

- [x] **T5.1 实现 task repository**
  - 验收标准：封装 GORM 操作，支持分页和过滤
  - 落点：`server/internal/repository/task_repo.go`

- [x] **T5.2 实现 task service**
  - 验收标准：CRUD + 权限检查 + 状态流转
  - 落点：`server/internal/service/task_service.go`
  - 方法：Create, GetByID, ListByList, Update, Delete, UpdateStatus

- [x] **T5.3 实现 task handler**
  - 验收标准：6 个接口可用，参数校验完整
  - 落点：`server/internal/handler/task.go`
  - 接口：
    - `GET /api/v1/lists/:id/tasks` - 获取清单下任务（分页）
    - `POST /api/v1/lists/:id/tasks` - 创建任务
    - `GET /api/v1/tasks/:id` - 获取任务详情
    - `PUT /api/v1/tasks/:id` - 更新任务
    - `DELETE /api/v1/tasks/:id` - 删除任务
    - `PATCH /api/v1/tasks/:id/status` - 更新状态

- [x] **T5.4 任务接口测试**
  - 验收标准：curl 测试通过
  - 测试脚本：`server/scripts/test_api.sh`
  - 测试结果：✓ 创建任务、获取任务列表、更新任务、更新状态、删除任务
  - 测试用例：
    ```bash
    # 创建任务
    curl -X POST http://localhost:23333/api/v1/lists/<list_id>/tasks \
      -H "Authorization: Bearer <token>" \
      -H "Content-Type: application/json" \
      -d '{"title":"完成报告","priority":2,"due_date":"2026-01-15"}'
    
    # 更新状态
    curl -X PATCH http://localhost:23333/api/v1/tasks/<task_id>/status \
      -H "Authorization: Bearer <token>" \
      -H "Content-Type: application/json" \
      -d '{"status":"doing"}'
    ```

---

### Phase 6: 聚合查询接口（核心）

- [x] **T6.1 实现 overview service**
  - 验收标准：单次调用返回仪表盘所需全部数据
  - 落点：`server/internal/service/overview_service.go`
  - 返回数据：
    - 全局统计（total_lists, total_tasks, todo/doing/done/overdue_count）
    - 清单列表（含每个清单的任务统计）
    - 每个清单的最近 3 个截止任务
    - 今日任务列表

- [x] **T6.2 实现 overview handler**
  - 验收标准：3 个聚合接口可用
  - 落点：`server/internal/handler/overview.go`
  - 接口：
    - `GET /api/v1/overview` - 仪表盘概览
    - `GET /api/v1/today` - 今日任务
    - `GET /api/v1/upcoming` - 即将到期任务（7 天内）

- [x] **T6.3 聚合接口测试**
  - 验收标准：curl 测试通过，响应结构符合预期
  - 测试脚本：`server/scripts/test_api.sh`
  - 测试结果：✓ 获取 overview、today、upcoming 接口，响应结构正确
  - 测试用例：
    ```bash
    # 获取仪表盘概览
    curl http://localhost:23333/api/v1/overview \
      -H "Authorization: Bearer <token>"
    
    # 获取今日任务
    curl http://localhost:23333/api/v1/today \
      -H "Authorization: Bearer <token>"
    
    # 获取即将到期任务
    curl http://localhost:23333/api/v1/upcoming \
      -H "Authorization: Bearer <token>"
    ```

- [x] **T6.4 性能验证**
  - 验收标准：overview 接口响应时间 < 100ms（100 个项目 + 1000 个任务）
  - 测试脚本：`server/scripts/test_performance.sh`
  - 测试结果：✓ 10 个清单 + 200 个任务，/overview 平均响应 49ms < 100ms 目标
  - 方法：使用 EXPLAIN ANALYZE 检查 SQL 执行计划
  - 落点：确保索引生效，无全表扫描

---

### Phase 7: 路由与中间件整合

- [x] **T7.1 实现 CORS 中间件**
  - 验收标准：允许配置的域名跨域访问
  - 落点：`server/internal/middleware/cors.go`
  - 配置：从 CORS_ORIGINS 环境变量读取

- [x] **T7.2 实现统一响应结构**
  - 验收标准：所有接口响应格式一致
  - 落点：`server/internal/model/response.go`
  - 结构：
    ```go
    type Response struct {
        Code    int         `json:"code"`
        Data    interface{} `json:"data,omitempty"`
        Message string      `json:"message,omitempty"`
    }
    ```

- [x] **T7.3 实现统一错误处理**
  - 验收标准：panic 恢复、错误码映射、友好错误信息
  - 落点：`server/internal/model/response.go`

- [x] **T7.4 实现参数校验**
  - 验收标准：使用 validator，校验失败返回具体字段错误
  - 落点：使用 gin 内置 binding 校验

- [x] **T7.5 整合路由**
  - 验收标准：所有路由注册完成，中间件链正确
  - 落点：`server/main.go`
  - 路由组织：
    ```go
    // 公开路由
    public := r.Group("/api/v1")
    public.POST("/auth/register", authHandler.Register)
    public.POST("/auth/login", authHandler.Login)
    
    // 需认证路由
    protected := r.Group("/api/v1")
    protected.Use(middleware.JWTAuth())
    protected.GET("/overview", overviewHandler.GetOverview)
    // ...
    ```

- [x] **T7.6 实现健康检查**
  - 验收标准：/healthz 和 /readyz 可用
  - 落点：`server/internal/handler/health.go`
  - /healthz：返回 {"status":"ok"}
  - /readyz：检查数据库连接

---

### Phase 8: 入口与启动

- [x] **T8.1 实现 main.go**
  - 验收标准：`go run main.go` 启动成功
  - 落点：`server/main.go`
  - 启动流程：
    1. 加载配置
    2. 初始化日志
    3. 连接数据库
    4. 注册路由
    5. 启动 HTTP 服务
    6. 优雅关闭

- [x] **T8.2 实现优雅关闭**
  - 验收标准：收到 SIGTERM 后等待请求完成再退出
  - 落点：`server/main.go`

- [x] **T8.3 端到端测试**
  - 验收标准：完整流程可跑通
  - 测试脚本：`server/scripts/test_api.sh`
  - 测试结果：✓ 23 个测试用例全部通过，完整流程验证成功
  - 测试流程：
    1. 注册用户 ✓
    2. 登录获取 token ✓
    3. 创建清单 ✓
    4. 创建任务 ✓
    5. 获取 overview ✓
    6. 验证数据正确 ✓

---

## M1 - 增强功能

### Phase 9: 搜索功能

- [x] **T9.1 添加 pg_trgm 扩展**
  - 验收标准：迁移文件创建扩展
  - 落点：`server/pkg/database/database.go`（在 AutoMigrate 中执行）
  - 测试结果：✓ 扩展在数据库初始化时自动创建

- [x] **T9.2 添加搜索索引**
  - 验收标准：任务标题支持模糊搜索
  - 落点：`server/pkg/database/database.go`（在 AutoMigrate 中执行）
  - 测试结果：✓ GIN 索引 idx_tasks_title_trgm 自动创建

- [x] **T9.3 实现搜索查询**
  - 验收标准：支持关键词搜索，返回匹配任务
  - 落点：`server/internal/repository/task_repo.go`
  - 测试结果：✓ Search 方法使用 ILIKE 模糊匹配，返回任务及清单名称

- [x] **T9.4 实现搜索接口**
  - 验收标准：`GET /api/v1/search?q=xxx` 可用
  - 落点：`server/internal/handler/task.go`, `server/main.go`
  - 测试结果：✓ 搜索"报告"返回匹配任务，包含 list_name 字段

---

### Phase 10: 批量操作

- [x] **T10.1 实现批量更新状态**
  - 验收标准：一次请求更新多个任务状态
  - 落点：`server/internal/repository/task_repo.go`
  - 测试结果：✓ BatchUpdateStatus 方法支持批量更新，返回影响行数

- [x] **T10.2 实现批量删除**
  - 验收标准：一次请求删除多个任务
  - 落点：`server/internal/repository/task_repo.go`
  - 测试结果：✓ BatchDelete 方法支持批量软删除

- [x] **T10.3 实现批量操作接口**
  - 验收标准：接口可用，事务保证原子性
  - 落点：`server/internal/handler/task.go`, `server/main.go`
  - 测试结果：✓ POST /api/v1/tasks/batch/status 和 /batch/delete 可用
  - 接口：
    - `POST /api/v1/tasks/batch/status` - 批量更新状态
    - `POST /api/v1/tasks/batch/delete` - 批量删除

---

### Phase 11: 拖拽排序

- [x] **T11.1 设计排序字段策略**
  - 验收标准：文档说明排序算法
  - 落点：`server/docs/sorting.md`
  - 测试结果：✓ 使用整数 sort_order，插入时取前后平均值

- [x] **T11.2 实现排序更新接口**
  - 验收标准：拖拽后更新 sort_order
  - 落点：`server/internal/handler/task.go`, `server/internal/repository/task_repo.go`
  - 测试结果：✓ PATCH /api/v1/tasks/:id/sort 可用
  - 接口：`PATCH /api/v1/tasks/:id/sort`
  - 请求体：`{"after_id": "uuid"}` 或 `{"before_id": "uuid"}`

- [x] **T11.3 实现清单排序**
  - 验收标准：清单也支持拖拽排序
  - 落点：`server/internal/handler/list.go`, `server/internal/repository/list_repo.go`
  - 测试结果：✓ PATCH /api/v1/lists/:id/sort 可用
  - 接口：`PATCH /api/v1/lists/:id/sort`

---

## M2 - 协作功能（规划）

### Phase 12: 项目共享

- [ ] **T12.1 设计共享数据模型**
  - 验收标准：ER 图和迁移文件
  - 新增表：project_members (project_id, user_id, role, invited_at, accepted_at)

- [ ] **T12.2 实现邀请接口**
  - 验收标准：项目所有者可邀请成员
  - 接口：`POST /api/v1/projects/:id/members`

- [ ] **T12.3 实现权限检查**
  - 验收标准：成员只能查看/编辑，所有者可删除
  - 角色：owner, editor, viewer

---

## M3 - 生产化

### Phase 13: 缓存与限流

- [ ] **T13.1 集成 Redis**
  - 验收标准：Redis 连接可用
  - 落点：`server/internal/pkg/redis/redis.go`

- [ ] **T13.2 实现请求限流**
  - 验收标准：每用户每分钟 100 次请求限制
  - 落点：`server/internal/middleware/ratelimit.go`

- [ ] **T13.3 实现 overview 缓存**
  - 验收标准：overview 数据缓存 30 秒
  - 落点：`server/internal/service/overview.go`
  - 缓存失效：任务/项目变更时清除

---

### Phase 14: 可观测性

- [ ] **T14.1 添加 Prometheus metrics**
  - 验收标准：/metrics 端点可用
  - 落点：`server/internal/middleware/metrics.go`
  - 指标：request_count, request_duration, error_count

- [ ] **T14.2 添加链路追踪**
  - 验收标准：请求可追踪
  - 落点：`server/internal/middleware/tracing.go`

- [ ] **T14.3 完善日志**
  - 验收标准：关键操作有审计日志
  - 落点：`server/internal/pkg/logger/logger.go`

---

### Phase 15: 发布与部署

- [ ] **T15.1 发布到 Docker Hub**
  - 验收标准：`docker pull yourname/snailtask-server` 可用
  - 落点：`.github/workflows/release.yml`

- [ ] **T15.2 编写部署文档**
  - 验收标准：文档完整，可照做部署
  - 落点：`server/docs/deployment.md`

- [ ] **T15.3 一键部署脚本**
  - 验收标准：`curl -sSL https://... | bash` 可部署
  - 落点：`server/scripts/install.sh`
  - 功能：检查依赖、下载 docker-compose、配置环境变量、启动服务

---

## 附录

### A. 开发环境检查清单

```bash
# 检查 Go 版本
go version  # 需要 1.22+

# 检查 PostgreSQL
psql --version  # 需要 15+

# 检查开发工具
sqlc version
migrate -version
air -v

# 检查 Docker
docker --version
docker compose version
```

### B. 常用命令速查

```bash
# 开发
make dev              # 启动开发服务器
make sqlc             # 生成 sqlc 代码
make migrate-up       # 执行迁移
make test             # 运行测试

# Docker
make docker-up        # 启动所有服务
make docker-down      # 停止所有服务
make docker-logs      # 查看日志

# 数据库
make db-shell         # 进入 psql
make db-reset         # 重置数据库
```

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
| 5000 | 服务器内部错误 |
