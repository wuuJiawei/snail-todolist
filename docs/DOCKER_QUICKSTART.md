# SnailTodoList Docker 快速启动

一句命令启动完整的 SnailTodoList 应用（包含数据库、后端、前端）。

## 🚀 快速开始

### 方式一：使用 Docker Hub 镜像（推荐）

```bash
docker run -d \
  --name snail-todolist \
  -p 80:80 \
  -p 23333:23333 \
  -v snail-data:/var/lib/postgresql/data \
  -e JWT_SECRET=your-secret-key-change-in-production \
  YOUR_DOCKERHUB_USERNAME/snail-todolist:latest
```

访问 http://localhost 即可使用！

### 方式二：使用 Docker Compose

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/snail-todolist.git
cd snail-todolist

# 2. 启动服务
docker-compose up -d
```

访问 http://localhost 即可使用！

## 📦 包含的服务

- **PostgreSQL 15**：数据库
- **Go Server**：后端 API（端口 23333）
- **React Web**：前端界面（端口 80）

## 🔧 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥（生产环境必须修改） | `change-this-in-production` |
| `POSTGRES_PASSWORD` | 数据库密码 | `postgres` |
| `JWT_EXPIRE_HOURS` | JWT 过期时间（小时） | `72` |

## 📝 常用命令

```bash
# 查看日志
docker logs -f snail-todolist

# 停止服务
docker stop snail-todolist

# 启动服务
docker start snail-todolist

# 删除容器（保留数据）
docker rm snail-todolist

# 删除容器和数据
docker rm snail-todolist
docker volume rm snail-data
```

## 🔍 故障排查

### 端口被占用

修改端口映射：

```bash
docker run -d \
  --name snail-todolist \
  -p 8080:80 \
  -p 23334:23333 \
  -v snail-data:/var/lib/postgresql/data \
  YOUR_DOCKERHUB_USERNAME/snail-todolist:latest
```

访问 http://localhost:8080

### 查看详细日志

```bash
# 查看所有日志
docker logs snail-todolist

# 实时查看日志
docker logs -f snail-todolist

# 查看最近 100 行日志
docker logs --tail 100 snail-todolist
```

### 重置应用

```bash
# 停止并删除容器
docker stop snail-todolist
docker rm snail-todolist

# 删除数据卷（会清空所有数据）
docker volume rm snail-data

# 重新启动
docker run -d \
  --name snail-todolist \
  -p 80:80 \
  -p 23333:23333 \
  -v snail-data:/var/lib/postgresql/data \
  YOUR_DOCKERHUB_USERNAME/snail-todolist:latest
```

## 📚 更多文档

- [完整部署指南](./DOCKER_DEPLOYMENT.md)
- [项目 README](../README.md)

## 🆘 获取帮助

- GitHub Issues: https://github.com/your-username/snail-todolist/issues
- 文档: https://github.com/your-username/snail-todolist/tree/main/docs
