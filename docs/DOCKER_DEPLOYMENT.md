# SnailTodoList Docker 部署指南

本文档介绍如何使用 Docker 部署 SnailTodoList 应用。

## 目录

- [快速开始](#快速开始)
- [部署方式](#部署方式)
  - [方式一：All-in-One 镜像（推荐用于快速体验）](#方式一all-in-one-镜像推荐用于快速体验)
  - [方式二：Docker Compose（推荐用于生产环境）](#方式二docker-compose推荐用于生产环境)
- [环境变量配置](#环境变量配置)
- [数据持久化](#数据持久化)
- [健康检查](#健康检查)
- [故障排查](#故障排查)

---

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+（如果使用 Compose 方式）
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

---

## 部署方式

### 方式一：All-in-One 镜像（推荐用于快速体验）

这种方式将 PostgreSQL、后端服务和前端应用打包在一个镜像中，适合快速体验和开发环境。

#### 1. 从 Docker Hub 拉取镜像

```bash
docker pull YOUR_DOCKERHUB_USERNAME/snail-todolist:latest
```

#### 2. 运行容器

```bash
docker run -d \
  --name snail-todolist \
  -p 80:80 \
  -p 23333:23333 \
  -v snail-data:/var/lib/postgresql/data \
  -e JWT_SECRET=your-secret-key-change-in-production \
  YOUR_DOCKERHUB_USERNAME/snail-todolist:latest
```

#### 3. 访问应用

- 前端：http://localhost
- 后端 API：http://localhost:23333

#### 4. 停止和删除

```bash
# 停止容器
docker stop snail-todolist

# 删除容器
docker rm snail-todolist

# 删除数据卷（注意：这会删除所有数据）
docker volume rm snail-data
```

---

### 方式二：Docker Compose（推荐用于生产环境）

这种方式将数据库、后端和前端分离为独立容器，符合容器最佳实践，适合生产环境。

#### 1. 克隆仓库

```bash
git clone https://github.com/your-username/snail-todolist.git
cd snail-todolist
```

#### 2. 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```env
# 数据库密码（生产环境请修改）
POSTGRES_PASSWORD=your-secure-password

# JWT 密钥（生产环境必须修改）
JWT_SECRET=your-secret-key-change-in-production

# JWT 过期时间（小时）
JWT_EXPIRE_HOURS=72

# 端口配置
WEB_PORT=80
SERVER_PORT=23333
DB_PORT=5432

# API 地址（根据实际域名修改）
VITE_API_BASE_URL=http://localhost:23333

# CORS 配置（根据实际域名修改）
CORS_ORIGINS=http://localhost,http://localhost:80

# SMTP 配置（可选，用于邮箱登录）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@example.com
```

#### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

#### 4. 访问应用

- 前端：http://localhost（或配置的 WEB_PORT）
- 后端 API：http://localhost:23333（或配置的 SERVER_PORT）
- 数据库：localhost:5432（或配置的 DB_PORT）

#### 5. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（注意：这会删除所有数据）
docker-compose down -v
```

---

## 环境变量配置

### 必需配置

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `JWT_SECRET` | JWT 签名密钥（生产环境必须修改） | `change-this-in-production` | `your-random-secret-key-here` |
| `POSTGRES_PASSWORD` | PostgreSQL 数据库密码 | `postgres` | `your-secure-password` |

### 可选配置

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `JWT_EXPIRE_HOURS` | JWT 过期时间（小时） | `72` | `168` |
| `WEB_PORT` | 前端端口 | `80` | `8080` |
| `SERVER_PORT` | 后端端口 | `23333` | `8000` |
| `DB_PORT` | 数据库端口 | `5432` | `5433` |
| `VITE_API_BASE_URL` | 前端 API 地址 | `http://localhost:23333` | `https://api.yourdomain.com` |
| `CORS_ORIGINS` | CORS 允许的源（逗号分隔） | `http://localhost` | `https://yourdomain.com,https://www.yourdomain.com` |

### SMTP 配置（可选）

如果需要支持邮箱登录功能，需要配置 SMTP：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SMTP_HOST` | SMTP 服务器地址 | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP 端口 | `587` |
| `SMTP_USER` | SMTP 用户名 | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP 密码 | `your-app-password` |
| `SMTP_FROM` | 发件人地址 | `noreply@yourdomain.com` |

---

## 数据持久化

### All-in-One 方式

数据存储在 Docker 卷中：

```bash
# 查看数据卷
docker volume ls | grep snail

# 备份数据
docker run --rm \
  -v snail-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/snail-backup-$(date +%Y%m%d).tar.gz /data

# 恢复数据
docker run --rm \
  -v snail-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/snail-backup-YYYYMMDD.tar.gz -C /
```

### Docker Compose 方式

数据存储在命名卷 `postgres_data` 中：

```bash
# 备份数据库
docker-compose exec db pg_dump -U postgres snail > backup.sql

# 恢复数据库
docker-compose exec -T db psql -U postgres snail < backup.sql
```

---

## 健康检查

所有服务都配置了健康检查：

```bash
# 检查容器健康状态
docker ps

# 查看详细健康检查信息
docker inspect --format='{{json .State.Health}}' snail-todolist | jq

# Docker Compose 方式
docker-compose ps
```

健康检查端点：

- 前端：`http://localhost/`
- 后端：`http://localhost:23333/api/health`
- 数据库：`pg_isready -U postgres`

---

## 故障排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker logs snail-todolist

# Docker Compose 方式
docker-compose logs
```

### 2. 数据库连接失败

检查数据库是否就绪：

```bash
# All-in-One 方式
docker exec snail-todolist pg_isready -U postgres

# Docker Compose 方式
docker-compose exec db pg_isready -U postgres
```

### 3. 前端无法连接后端

检查环境变量配置：

```bash
# 检查后端 API 地址
docker exec snail-web cat /usr/share/nginx/html/assets/*.js | grep -o 'http://[^"]*23333'
```

确保 `VITE_API_BASE_URL` 配置正确。

### 4. 端口冲突

如果默认端口被占用，修改 `.env` 文件中的端口配置：

```env
WEB_PORT=8080
SERVER_PORT=8000
DB_PORT=5433
```

### 5. 查看详细日志

```bash
# All-in-One 方式
docker exec snail-todolist tail -f /var/log/supervisor/*.log

# Docker Compose 方式
docker-compose logs -f [service_name]
```

### 6. 重置应用

```bash
# All-in-One 方式
docker stop snail-todolist
docker rm snail-todolist
docker volume rm snail-data

# Docker Compose 方式
docker-compose down -v
```

---

## 生产环境建议

1. **修改默认密码**：务必修改 `JWT_SECRET` 和 `POSTGRES_PASSWORD`
2. **使用 HTTPS**：配置反向代理（如 Nginx、Traefik）启用 HTTPS
3. **定期备份**：设置定时任务备份数据库
4. **监控日志**：使用日志聚合工具（如 ELK、Loki）监控应用日志
5. **资源限制**：为容器设置内存和 CPU 限制
6. **更新策略**：定期更新镜像以获取安全补丁

---

## 更新应用

### All-in-One 方式

```bash
# 拉取最新镜像
docker pull YOUR_DOCKERHUB_USERNAME/snail-todolist:latest

# 停止旧容器
docker stop snail-todolist
docker rm snail-todolist

# 启动新容器（数据卷会保留）
docker run -d \
  --name snail-todolist \
  -p 80:80 \
  -p 23333:23333 \
  -v snail-data:/var/lib/postgresql/data \
  -e JWT_SECRET=your-secret-key \
  YOUR_DOCKERHUB_USERNAME/snail-todolist:latest
```

### Docker Compose 方式

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

---

## 支持

如有问题，请访问：

- GitHub Issues: https://github.com/your-username/snail-todolist/issues
- 文档: https://github.com/your-username/snail-todolist/tree/main/docs

---

**注意**：本文档中的 `YOUR_DOCKERHUB_USERNAME` 需要替换为实际的 Docker Hub 用户名。
