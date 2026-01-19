# SnailTodoList Docker 一键部署指南

最简单的 Docker 部署方式，5 分钟完成部署。

## 🚀 快速部署（推荐）

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 一键启动

```bash
# 1. 克隆仓库
git clone https://github.com/wuuJiawei/snail-todolist.git
cd snail-todolist

# 2. 创建环境变量文件
cat > .env <<EOF
# 数据库密码（请修改为强密码）
POSTGRES_PASSWORD=your-secure-password-here

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=$(openssl rand -base64 32)

# JWT 过期时间（小时）
JWT_EXPIRE_HOURS=72

# 端口配置
WEB_PORT=80
SERVER_PORT=23333
DB_PORT=5432

# API 地址（根据实际域名修改）
VITE_API_BASE_URL=http://localhost:23333

# CORS 配置
CORS_ORIGINS=http://localhost
EOF

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 访问应用

- 前端：http://localhost
- 后端 API：http://localhost:23333

## 📝 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 更新服务
git pull
docker-compose up -d --build
```

## 🔧 配置说明

### 修改端口

编辑 `.env` 文件：

```env
WEB_PORT=8080      # 前端端口
SERVER_PORT=8000   # 后端端口
DB_PORT=5433       # 数据库端口
```

### 配置域名

如果使用域名访问，修改 `.env` 文件：

```env
VITE_API_BASE_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 配置 SMTP（可选）

如果需要邮箱登录功能，在 `.env` 文件中添加：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

## 💾 数据备份

### 备份数据库

```bash
# 导出数据库
docker-compose exec db pg_dump -U postgres snail > backup-$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T db psql -U postgres snail < backup-YYYYMMDD.sql
```

### 备份数据卷

```bash
# 停止服务
docker-compose down

# 备份数据卷
docker run --rm \
  -v snail-todolist_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/data-backup-$(date +%Y%m%d).tar.gz /data

# 启动服务
docker-compose up -d
```

## 🔍 故障排查

### 1. 端口被占用

错误信息：`Bind for 0.0.0.0:80 failed: port is already allocated`

解决方法：修改 `.env` 文件中的端口配置

### 2. 数据库连接失败

检查数据库状态：

```bash
docker-compose exec db pg_isready -U postgres
```

查看数据库日志：

```bash
docker-compose logs db
```

### 3. 前端无法连接后端

检查 `VITE_API_BASE_URL` 配置是否正确：

```bash
# 查看前端配置
docker-compose exec web cat /usr/share/nginx/html/assets/*.js | grep -o 'http://[^"]*23333' | head -1
```

### 4. 服务无法启动

查看详细日志：

```bash
docker-compose logs
```

重新构建：

```bash
docker-compose down
docker-compose up -d --build
```

## 🌐 生产环境部署

### 使用 Nginx 反向代理

创建 `nginx-proxy.conf`：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:23333/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 使用 HTTPS

推荐使用 Let's Encrypt + Certbot：

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com
```

### 资源限制

编辑 `docker-compose.yml`，为每个服务添加资源限制：

```yaml
services:
  db:
    # ...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 📊 监控

### 查看资源使用

```bash
docker stats
```

### 查看容器健康状态

```bash
docker-compose ps
```

## 🔄 更新应用

```bash
# 1. 备份数据
docker-compose exec db pg_dump -U postgres snail > backup-before-update.sql

# 2. 拉取最新代码
git pull

# 3. 重新构建并启动
docker-compose up -d --build

# 4. 查看日志确认启动成功
docker-compose logs -f
```

## 🆘 获取帮助

- GitHub Issues: https://github.com/wuuJiawei/snail-todolist/issues
- 文档: https://github.com/wuuJiawei/snail-todolist/tree/main/docs

---

**提示**：首次部署建议先在测试环境验证，确认无误后再部署到生产环境。
