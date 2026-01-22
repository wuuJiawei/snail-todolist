# SnailTask Server 部署指南

## 部署方式

### 1. Docker Compose（推荐）

最简单的部署方式，适合单机部署。

```bash
# 克隆仓库
git clone https://github.com/yourname/snailtask.git
cd snailtask/server

# 复制环境变量
cp .env.example .env

# 编辑配置
vim .env

# 启动服务
docker compose up -d
```

### 2. 手动部署

#### 前置条件
- Go 1.22+
- PostgreSQL 15+
- (可选) Redis 7+

#### 步骤

```bash
# 编译
go build -o snailtask-server ./main.go

# 设置环境变量
export DATABASE_URL="postgres://user:pass@localhost:5432/snailtask?sslmode=disable"
export JWT_SECRET="your-secret-key"
export PORT=23333

# 运行
./snailtask-server
```

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| DATABASE_URL | ✓ | - | PostgreSQL 连接字符串 |
| JWT_SECRET | ✓ | - | JWT 签名密钥（至少 32 字符） |
| PORT | - | 23333 | HTTP 服务端口 |
| SERVER_MODE | - | development | 运行模式：development/production |
| LOG_LEVEL | - | info | 日志级别：debug/info/warn/error |
| CORS_ORIGINS | - | * | 允许的跨域来源 |

## 反向代理配置

### Nginx

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:23333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```
api.example.com {
    reverse_proxy localhost:23333
}
```

## TLS/HTTPS

推荐使用 Caddy 或 Let's Encrypt + Nginx 自动管理证书。

## 数据库备份

```bash
# 备份
pg_dump -h localhost -U postgres snailtask > backup.sql

# 恢复
psql -h localhost -U postgres snailtask < backup.sql
```

## 监控

- 健康检查：`GET /healthz`
- 就绪检查：`GET /readyz`
- Prometheus 指标：`GET /metrics`

## 日志

生产环境日志为 JSON 格式，可使用 ELK 或 Loki 收集分析。

```bash
# 查看日志
docker compose logs -f server
```

## 故障排查

### 数据库连接失败
1. 检查 DATABASE_URL 格式
2. 确认 PostgreSQL 服务运行中
3. 检查防火墙规则

### JWT 验证失败
1. 确认 JWT_SECRET 配置正确
2. 检查 token 是否过期

### 性能问题
1. 检查 /metrics 端点的请求延迟
2. 使用 EXPLAIN ANALYZE 分析慢查询
3. 确认数据库索引正确创建
