# SnailTodoList All-in-One Docker Image
# 包含 PostgreSQL + Go Server + React Web

# 构建后端
FROM golang:1.21-alpine AS server-builder

WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o snail-server main.go

# 构建前端
FROM node:20-alpine AS web-builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
# 设置生产环境变量
ENV VITE_API_BASE_URL=http://localhost:23333
ENV VITE_STORAGE_MODE=online
RUN pnpm build

# 最终镜像
FROM postgres:15-alpine

# 安装必要的工具
RUN apk add --no-cache \
    nginx \
    supervisor \
    ca-certificates \
    tzdata \
    curl \
    bash

ENV TZ=Asia/Shanghai

# 复制后端服务
COPY --from=server-builder /app/server/snail-server /app/server/snail-server

# 复制前端文件
COPY --from=web-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/http.d/default.conf

# 复制数据库迁移文件
COPY sql_migrations /app/sql_migrations

# 创建必要的目录
RUN mkdir -p /var/log/supervisor /run/nginx /var/lib/nginx/tmp

# 创建 supervisor 配置
RUN cat > /etc/supervisord.conf <<'EOF'
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:postgres]
command=/usr/local/bin/postgres -D /var/lib/postgresql/data
user=postgres
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/postgres.log
stderr_logfile=/var/log/supervisor/postgres_err.log
priority=1

[program:server]
command=/app/server/snail-server
directory=/app/server
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/server.log
stderr_logfile=/var/log/supervisor/server_err.log
environment=PORT="23333",DATABASE_URL="postgres://postgres:postgres@localhost:5432/snail?sslmode=disable",JWT_SECRET="%(ENV_JWT_SECRET)s",JWT_EXPIRE_HOURS="%(ENV_JWT_EXPIRE_HOURS)s",SERVER_MODE="production",LOG_LEVEL="info",CORS_ORIGINS="http://localhost"
startsecs=10
startretries=5
priority=2

[program:nginx]
command=/usr/sbin/nginx -g 'daemon off;'
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/nginx.log
stderr_logfile=/var/log/supervisor/nginx_err.log
priority=3
EOF

# 创建启动脚本
RUN cat > /app/entrypoint.sh <<'EOF'
#!/bin/bash
set -e

# 设置默认环境变量
export JWT_SECRET="${JWT_SECRET:-change-this-in-production}"
export JWT_EXPIRE_HOURS="${JWT_EXPIRE_HOURS:-72}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

echo "=== SnailTodoList Starting ==="
echo "JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "JWT_EXPIRE_HOURS: ${JWT_EXPIRE_HOURS}"

# 初始化 PostgreSQL 数据目录
if [ ! -d "/var/lib/postgresql/data/base" ]; then
    echo "Initializing PostgreSQL database..."
    mkdir -p /var/lib/postgresql/data
    chown -R postgres:postgres /var/lib/postgresql/data
    chmod 700 /var/lib/postgresql/data
    
    su-exec postgres initdb -D /var/lib/postgresql/data
    
    # 配置 PostgreSQL
    echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "listen_addresses='*'" >> /var/lib/postgresql/data/postgresql.conf
    echo "port=5432" >> /var/lib/postgresql/data/postgresql.conf
fi

# 启动 PostgreSQL（临时）
echo "Starting PostgreSQL temporarily..."
su-exec postgres pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql.log start

# 等待 PostgreSQL 启动
echo "Waiting for PostgreSQL to start..."
for i in {1..30}; do
    if su-exec postgres pg_isready -h localhost > /dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# 创建数据库和用户
echo "Setting up database..."
su-exec postgres psql -v ON_ERROR_STOP=0 <<-EOSQL
    SELECT 'CREATE DATABASE snail' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'snail')\gexec
    ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD}';
EOSQL

# 运行数据库迁移
echo "Running database migrations..."
for migration in /app/sql_migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying migration: $(basename $migration)"
        su-exec postgres psql -d snail -f "$migration" 2>&1 | grep -v "already exists" || true
    fi
done

# 停止临时 PostgreSQL
echo "Stopping temporary PostgreSQL..."
su-exec postgres pg_ctl -D /var/lib/postgresql/data stop -m fast

echo "=== Starting all services with supervisord ==="

# 启动 supervisord
exec /usr/bin/supervisord -c /etc/supervisord.conf
EOF

RUN chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 80 23333 5432

# 数据卷
VOLUME ["/var/lib/postgresql/data"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost/ > /dev/null 2>&1 || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
