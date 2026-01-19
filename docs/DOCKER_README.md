# SnailTodoList Docker 部署

本文档提供 SnailTodoList 的 Docker 部署方案概览。

## 📚 文档导航

- **[快速部署指南](./DOCKER_DEPLOY_SIMPLE.md)** - 5 分钟快速部署（推荐新手）
- **[完整部署文档](./DOCKER_DEPLOYMENT.md)** - 详细的部署配置和故障排查
- **[构建发布指南](./DOCKER_BUILD_GUIDE.md)** - 如何构建和发布 Docker 镜像
- **[快速启动](./DOCKER_QUICKSTART.md)** - 一句命令启动应用

## 🚀 快速开始

### 最简单的方式

```bash
# 1. 克隆仓库
git clone https://github.com/wuuJiawei/snail-todolist.git
cd snail-todolist

# 2. 一键部署
./scripts/quick-deploy.sh
```

### 手动部署

```bash
# 1. 创建环境变量文件
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE_HOURS=72
WEB_PORT=80
SERVER_PORT=23333
DB_PORT=5432
VITE_API_BASE_URL=http://localhost:23333
CORS_ORIGINS=http://localhost
EOF

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

## 📦 包含的服务

- **PostgreSQL 15** - 数据库
- **Go Server** - 后端 API（端口 23333）
- **React Web** - 前端界面（端口 80）

## 🔧 常用命令

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
git pull && docker-compose up -d --build

# 备份数据库
docker-compose exec db pg_dump -U postgres snail > backup.sql
```

## 🌐 访问应用

- 前端：http://localhost
- 后端 API：http://localhost:23333

## 📝 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `POSTGRES_PASSWORD` | 数据库密码 | `postgres` |
| `JWT_SECRET` | JWT 签名密钥 | `change-this-in-production` |
| `JWT_EXPIRE_HOURS` | JWT 过期时间（小时） | `72` |
| `WEB_PORT` | 前端端口 | `80` |
| `SERVER_PORT` | 后端端口 | `23333` |
| `DB_PORT` | 数据库端口 | `5432` |
| `VITE_API_BASE_URL` | 前端 API 地址 | `http://localhost:23333` |
| `CORS_ORIGINS` | CORS 允许的源 | `http://localhost` |

## 🔍 故障排查

### 端口被占用

修改 `.env` 文件中的端口配置：

```env
WEB_PORT=8080
SERVER_PORT=8000
DB_PORT=5433
```

### 数据库连接失败

检查数据库状态：

```bash
docker-compose exec db pg_isready -U postgres
```

### 查看详细日志

```bash
docker-compose logs [service_name]
```

## 🏗️ 架构说明

```
┌─────────────────────────────────────────┐
│           Docker Network                │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │   Web    │  │  Server  │  │  DB   ││
│  │  (Nginx) │→ │   (Go)   │→ │(PG15) ││
│  │  :80     │  │  :23333  │  │ :5432 ││
│  └──────────┘  └──────────┘  └───────┘│
│                                         │
└─────────────────────────────────────────┘
         ↓
    postgres_data (Volume)
```

## 🔐 安全建议

1. **修改默认密码**：务必修改 `POSTGRES_PASSWORD` 和 `JWT_SECRET`
2. **使用 HTTPS**：生产环境配置 SSL 证书
3. **定期备份**：设置定时任务备份数据库
4. **限制端口**：不要暴露数据库端口到公网
5. **更新镜像**：定期更新基础镜像获取安全补丁

## 📊 性能优化

### 资源限制

编辑 `docker-compose.yml` 添加资源限制：

```yaml
services:
  db:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### 数据库优化

调整 PostgreSQL 配置以提升性能（根据服务器资源调整）。

## 🔄 更新流程

```bash
# 1. 备份数据
docker-compose exec db pg_dump -U postgres snail > backup-$(date +%Y%m%d).sql

# 2. 拉取最新代码
git pull

# 3. 重新构建并启动
docker-compose up -d --build

# 4. 验证服务
docker-compose ps
docker-compose logs -f
```

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/wuuJiawei/snail-todolist/issues
- **文档**: https://github.com/wuuJiawei/snail-todolist/tree/main/docs
- **讨论**: https://github.com/wuuJiawei/snail-todolist/discussions

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件

---

**提示**：首次部署建议先在测试环境验证，确认无误后再部署到生产环境。
