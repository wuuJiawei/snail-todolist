# SnailTask Server

> 🐌 一个注重后端聚合查询、避免前端 N+1 问题的现代化 Todo 应用后端服务

## 概览

SnailTask Server 是 SnailTodoList v2 的后端服务，采用 Go + Gin 构建，PostgreSQL 存储，专注于：

- **后端聚合查询**：一个接口返回完整数据，杜绝前端循环请求
- **清晰分层架构**：handler → service → repository → model，职责分明
- **生产可部署**：Docker 一键启动，支持本地开发与服务器部署
- **可观测性**：结构化日志、请求链路追踪、健康检查

## 技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| Web 框架 | Gin | 高性能、生态成熟、中间件丰富 |
| 数据库 | PostgreSQL | 支持复杂查询、JSON、全文检索 |
| SQL 工具 | **sqlc** | 类型安全、编译时检查、性能可控、避免 ORM 黑盒 |
| 迁移 | golang-migrate | 版本化迁移、支持回滚、CI 友好 |
| 认证 | JWT | 无状态、易于水平扩展、前后端分离友好 |
| 配置 | Viper | 支持多格式、环境变量覆盖 |
| 日志 | Zap | 高性能结构化日志 |

### 为什么选 sqlc 而非 GORM？

1. **类型安全**：SQL 编译时生成 Go 代码，IDE 自动补全，重构安全
2. **性能可控**：手写 SQL，精确控制 JOIN/预加载，避免 N+1
3. **可维护性**：SQL 即文档，DBA 可直接 review，无 ORM 魔法
4. **聚合查询友好**：复杂 JOIN 直接写 SQL，不受 ORM 限制

## 架构与目录结构

```
server/
├── cmd/
│   └── server/
│       └── main.go              # 入口
├── internal/
│   ├── config/                  # 配置加载
│   │   └── config.go
│   ├── handler/                 # HTTP 处理器（接收请求、返回响应）
│   │   ├── auth.go
│   │   ├── project.go
│   │   ├── task.go
│   │   └── overview.go          # 聚合查询接口
│   ├── middleware/              # 中间件（认证、日志、CORS、限流）
│   │   ├── auth.go
│   │   ├── cors.go
│   │   ├── logger.go
│   │   └── request_id.go
│   ├── service/                 # 业务逻辑层
│   │   ├── auth.go
│   │   ├── project.go
│   │   ├── task.go
│   │   └── overview.go
│   ├── repository/              # 数据访问层（调用 sqlc 生成代码）
│   │   ├── user.go
│   │   ├── project.go
│   │   └── task.go
│   ├── model/                   # 领域模型 & DTO
│   │   ├── user.go
│   │   ├── project.go
│   │   ├── task.go
│   │   └── response.go          # 统一响应结构
│   └── pkg/                     # 内部工具包
│       ├── jwt/
│       ├── hash/
│       ├── validator/
│       └── logger/
├── db/
│   ├── migrations/              # 数据库迁移文件
│   │   ├── 000001_init_schema.up.sql
│   │   └── 000001_init_schema.down.sql
│   ├── queries/                 # sqlc 查询定义
│   │   ├── user.sql
│   │   ├── project.sql
│   │   └── task.sql
│   └── sqlc.yaml                # sqlc 配置
├── scripts/                     # 开发脚本
│   ├── seed.sql                 # 种子数据
│   └── dev.sh                   # 开发启动脚本
├── .env.example
├── .air.toml                    # 热重载配置
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── go.mod
├── go.sum
└── README.md
```

### 分层职责

| 层 | 职责 | 依赖 |
|---|------|------|
| **handler** | 解析请求、参数校验、调用 service、构造响应 | service |
| **service** | 业务逻辑、事务编排、权限检查 | repository |
| **repository** | 数据访问、调用 sqlc 生成代码 | sqlc/db |
| **model** | 领域实体、DTO、请求/响应结构 | 无 |

## 关键设计决策

### ADR-001: 后端聚合查询

**背景**：v1 版本前端需要多次请求获取项目列表、每个项目的任务数、最近截止任务等，导致 N+1 问题和糟糕的用户体验。

**决策**：后端提供 `/api/v1/overview` 聚合接口，一次返回：
- 用户所有项目
- 每个项目的任务统计（total/todo/doing/done）
- 每个项目最近 3 个截止任务

**SQL 策略**：使用 PostgreSQL 的 `LATERAL JOIN` 或子查询聚合，单次查询完成。

### ADR-002: JWT 无状态认证

**背景**：需要支持前后端分离、未来移动端接入。

**决策**：
- 使用 JWT（HS256）
- Access Token 有效期 15 分钟
- Refresh Token 有效期 7 天，存储于 HttpOnly Cookie
- 登出时前端清除 token，后端可选实现 token 黑名单（Redis）

### ADR-003: 软删除与审计字段

**决策**：所有核心表包含：
- `created_at`, `updated_at`：自动维护
- `deleted_at`：软删除，NULL 表示未删除
- 查询默认过滤 `deleted_at IS NULL`

## 数据模型（MVP）

```sql
-- users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    priority INT DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    due_date DATE,
    tags TEXT[] DEFAULT '{}',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_projects_user_id ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project_id ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_user_id ON tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND status != 'done';
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
```

## API 设计（MVP）

### 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/auth/register` | 注册 |
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/logout` | 登出 |
| POST | `/api/v1/auth/refresh` | 刷新 token |

### 项目

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/projects` | 获取项目列表 |
| POST | `/api/v1/projects` | 创建项目 |
| GET | `/api/v1/projects/:id` | 获取项目详情（含任务） |
| PUT | `/api/v1/projects/:id` | 更新项目 |
| DELETE | `/api/v1/projects/:id` | 删除项目 |

### 任务

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/projects/:id/tasks` | 获取项目下任务（分页） |
| POST | `/api/v1/projects/:id/tasks` | 创建任务 |
| GET | `/api/v1/tasks/:id` | 获取任务详情 |
| PUT | `/api/v1/tasks/:id` | 更新任务 |
| DELETE | `/api/v1/tasks/:id` | 删除任务 |
| PATCH | `/api/v1/tasks/:id/status` | 更新任务状态 |

### 聚合查询（核心）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/overview` | 获取仪表盘概览数据 |
| GET | `/api/v1/today` | 获取今日任务 |
| GET | `/api/v1/upcoming` | 获取即将到期任务 |

### 聚合接口响应示例

**GET /api/v1/overview**

```json
{
  "code": 0,
  "data": {
    "stats": {
      "total_projects": 5,
      "total_tasks": 42,
      "todo_count": 20,
      "doing_count": 10,
      "done_count": 12,
      "overdue_count": 3
    },
    "projects": [
      {
        "id": "uuid",
        "name": "工作",
        "color": "#6366f1",
        "task_stats": {
          "total": 15,
          "todo": 8,
          "doing": 4,
          "done": 3
        },
        "upcoming_tasks": [
          {
            "id": "uuid",
            "title": "完成报告",
            "due_date": "2026-01-10",
            "priority": 2
          }
        ]
      }
    ],
    "today_tasks": [
      {
        "id": "uuid",
        "title": "开会",
        "project_name": "工作",
        "due_date": "2026-01-09"
      }
    ]
  }
}
```

## 快速开始

### 环境要求

- Go 1.22+
- PostgreSQL 15+
- Node.js 20+（前端）
- pnpm 8+（前端）
- Docker & Docker Compose（可选）

### 方式一：Docker Compose（推荐）

```bash
# 克隆仓库
git clone https://github.com/yourname/snailtask.git
cd snailtask/server

# 复制环境变量
cp .env.example .env

# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f server
```

服务启动后：
- API: http://localhost:8080
- PostgreSQL: localhost:5432

### 方式二：本地开发

```bash
# 1. 安装依赖
go mod download

# 2. 安装开发工具
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/air-verse/air@latest

# 3. 启动 PostgreSQL（使用 Docker）
docker run -d --name snailtask-db \
  -e POSTGRES_USER=snailtask \
  -e POSTGRES_PASSWORD=snailtask123 \
  -e POSTGRES_DB=snailtask \
  -p 5432:5432 \
  postgres:15-alpine

# 4. 复制并编辑环境变量
cp .env.example .env

# 5. 运行迁移
make migrate-up

# 6. 生成 sqlc 代码
make sqlc

# 7. 启动服务（热重载）
make dev
```

## 配置说明

### 环境变量

```bash
# .env.example

# 服务配置
SERVER_PORT=8080
SERVER_MODE=development  # development | production

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=snailtask
DB_PASSWORD=snailtask123
DB_NAME=snailtask
DB_SSLMODE=disable

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=168h

# CORS（逗号分隔）
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# 日志
LOG_LEVEL=debug  # debug | info | warn | error
LOG_FORMAT=console  # console | json
```

### 配置加载优先级

1. 环境变量（最高）
2. `.env` 文件
3. 代码默认值

## 数据库迁移

```bash
# 创建新迁移
make migrate-create name=add_tags_to_tasks

# 执行迁移
make migrate-up

# 回滚一个版本
make migrate-down

# 回滚所有
make migrate-reset

# 查看当前版本
make migrate-version

# 强制设置版本（修复脏状态）
make migrate-force version=1
```

迁移文件位于 `db/migrations/`，命名格式：`{version}_{description}.{up|down}.sql`

## 测试与质量

```bash
# 运行所有测试
make test

# 运行测试（带覆盖率）
make test-coverage

# 运行 lint
make lint

# 格式化代码
make fmt

# 生成 sqlc 代码
make sqlc

# 检查 sqlc 语法
make sqlc-vet
```

### 测试策略

- **单元测试**：service 层，mock repository
- **集成测试**：repository 层，使用 testcontainers 启动真实 PostgreSQL
- **API 测试**：handler 层，httptest + mock service

## 与前端联调

### 开发环境

前端项目位于 `/web`（或根目录 `/src`），使用 Vite 开发服务器。

**前端 vite.config.ts 配置代理：**

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

**或者直接配置 CORS：**

后端已配置 CORS 中间件，允许 `CORS_ORIGINS` 环境变量中的域名。

### API 调用约定

- 前端使用 `/api/v1/...` 路径
- 统一响应格式：`{ code: number, data?: T, message?: string }`
- code = 0 表示成功，非 0 表示错误
- 认证：`Authorization: Bearer <token>`

### 前端不应该做的事

❌ 循环请求获取每个项目的任务数  
❌ 前端聚合多个接口数据  
❌ 前端做复杂的数据过滤/排序  

✅ 调用 `/api/v1/overview` 一次获取仪表盘数据  
✅ 调用 `/api/v1/projects/:id` 获取项目详情（含任务统计）  
✅ 分页、过滤、排序参数传给后端处理  

## Docker 部署

### 构建镜像

```bash
docker build -t snailtask-server:latest .
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  server:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SERVER_MODE=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_USER=snailtask
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=snailtask
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=snailtask
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=snailtask
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U snailtask"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

### 生产部署建议

1. **反向代理**：使用 Nginx/Caddy 处理 TLS、静态文件、负载均衡
2. **数据库**：使用托管 PostgreSQL（RDS/Supabase/Neon）或独立部署
3. **备份**：配置 pg_dump 定时备份到 S3/OSS
4. **监控**：接入 Prometheus + Grafana
5. **日志**：生产环境使用 JSON 格式，接入 ELK/Loki

## 健康检查

```bash
# 存活检查
curl http://localhost:8080/healthz
# {"status":"ok"}

# 就绪检查（含数据库连接）
curl http://localhost:8080/readyz
# {"status":"ok","checks":{"database":"ok"}}
```

## Makefile 命令速查

```makefile
make dev          # 启动开发服务器（热重载）
make build        # 构建二进制
make test         # 运行测试
make lint         # 运行 linter
make sqlc         # 生成 sqlc 代码
make migrate-up   # 执行迁移
make migrate-down # 回滚迁移
make docker-build # 构建 Docker 镜像
make docker-up    # 启动 Docker Compose
make docker-down  # 停止 Docker Compose
```

## Roadmap

### M0 - MVP（当前）
- [x] 项目脚手架
- [ ] 用户认证（注册/登录/JWT）
- [ ] 项目 CRUD
- [ ] 任务 CRUD
- [ ] 聚合查询接口

### M1 - 增强
- [ ] 邮箱验证
- [ ] 密码重置
- [ ] 任务搜索（PostgreSQL trigram）
- [ ] 批量操作（批量完成/删除）
- [ ] 拖拽排序（sort_order 字段）

### M2 - 协作
- [ ] 项目共享
- [ ] 成员邀请
- [ ] 权限管理

### M3 - 生产化
- [ ] Redis 缓存热点数据
- [ ] 请求限流
- [ ] Prometheus metrics
- [ ] 发布到 Docker Hub
- [ ] 一键部署脚本（curl | bash）

## Contributing

参见 [CONTRIBUTING.md](../CONTRIBUTING.md)

提交代码前请确保：
1. `make lint` 无错误
2. `make test` 全部通过
3. 新增 API 需补充测试
4. 迁移文件需包含 up 和 down

## License

MIT
