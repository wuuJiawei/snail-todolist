# Docker 镜像构建和发布指南

本指南介绍如何构建 SnailTodoList Docker 镜像并发布到 Docker Hub。

## 前置准备

1. **安装 Docker**
   ```bash
   # macOS
   brew install --cask docker
   
   # 或从官网下载
   # https://www.docker.com/products/docker-desktop
   ```

2. **注册 Docker Hub 账号**
   - 访问 https://hub.docker.com/signup
   - 注册一个免费账号

3. **登录 Docker Hub**
   ```bash
   docker login
   # 输入用户名和密码
   ```

## 快速构建和发布

### 方式一：使用脚本（推荐）

```bash
# 1. 设置 Docker Hub 用户名
export DOCKER_USERNAME=your-dockerhub-username

# 2. 构建镜像
./scripts/build-docker.sh

# 3. 测试镜像
./scripts/test-docker.sh

# 4. 推送到 Docker Hub
./scripts/push-docker.sh
```

### 方式二：使用 Makefile

```bash
# 设置 Docker Hub 用户名
export DOCKER_USERNAME=your-dockerhub-username

# 构建、测试并推送（一键完成）
make docker-all

# 或分步执行
make docker-build   # 构建
make docker-test    # 测试
make docker-push    # 推送
```

## 详细步骤

### 1. 构建镜像

#### All-in-One 镜像（推荐）

包含 PostgreSQL + Server + Web 的完整镜像：

```bash
docker build -t your-dockerhub-username/snail-todolist:latest -f Dockerfile .
```

#### 分离镜像

**Web 镜像：**
```bash
docker build -t your-dockerhub-username/snail-todolist-web:latest -f Dockerfile.web .
```

**Server 镜像：**
```bash
docker build -t your-dockerhub-username/snail-todolist-server:latest -f server/Dockerfile ./server
```

### 2. 测试镜像

#### 测试 All-in-One 镜像

```bash
# 启动容器
docker run -d \
  --name snail-test \
  -p 8080:80 \
  -p 23334:23333 \
  -e JWT_SECRET=test-secret-key \
  your-dockerhub-username/snail-todolist:latest

# 等待服务启动（约 30 秒）
sleep 30

# 测试前端
curl http://localhost:8080

# 测试后端
curl http://localhost:23334/api/health

# 查看日志
docker logs snail-test

# 停止测试
docker rm -f snail-test
```

#### 测试 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3. 推送到 Docker Hub

#### 推送 All-in-One 镜像

```bash
# 推送 latest 标签
docker push your-dockerhub-username/snail-todolist:latest

# 推送版本标签
docker tag your-dockerhub-username/snail-todolist:latest your-dockerhub-username/snail-todolist:v1.0.0
docker push your-dockerhub-username/snail-todolist:v1.0.0
```

#### 推送所有镜像

```bash
# All-in-One
docker push your-dockerhub-username/snail-todolist:latest

# Web
docker push your-dockerhub-username/snail-todolist-web:latest

# Server
docker push your-dockerhub-username/snail-todolist-server:latest
```

### 4. 验证发布

访问 Docker Hub 查看镜像：
```
https://hub.docker.com/r/your-dockerhub-username/snail-todolist
```

测试拉取：
```bash
docker pull your-dockerhub-username/snail-todolist:latest
```

## 镜像说明

### All-in-One 镜像

- **镜像名称**: `your-dockerhub-username/snail-todolist`
- **大小**: 约 500MB
- **包含服务**:
  - PostgreSQL 15
  - Go Server (端口 23333)
  - React Web (端口 80)
- **适用场景**: 快速体验、开发环境、小型部署

### 分离镜像

#### Web 镜像
- **镜像名称**: `your-dockerhub-username/snail-todolist-web`
- **大小**: 约 50MB
- **包含**: Nginx + React 静态文件
- **端口**: 80

#### Server 镜像
- **镜像名称**: `your-dockerhub-username/snail-todolist-server`
- **大小**: 约 20MB
- **包含**: Go 后端服务
- **端口**: 23333

## 版本管理

### 标签策略

- `latest`: 最新稳定版本
- `v1.0.0`: 语义化版本号
- `dev`: 开发版本

### 创建版本标签

```bash
# 设置版本号
VERSION=v1.0.0

# 构建并标记
docker build -t your-dockerhub-username/snail-todolist:${VERSION} -f Dockerfile .
docker tag your-dockerhub-username/snail-todolist:${VERSION} your-dockerhub-username/snail-todolist:latest

# 推送
docker push your-dockerhub-username/snail-todolist:${VERSION}
docker push your-dockerhub-username/snail-todolist:latest
```

## 自动化构建

### GitHub Actions

创建 `.github/workflows/docker-publish.yml`：

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/snail-todolist:latest
            ${{ secrets.DOCKER_USERNAME }}/snail-todolist:${{ github.ref_name }}
```

## 故障排查

### 构建失败

```bash
# 清理构建缓存
docker builder prune -a

# 重新构建（不使用缓存）
docker build --no-cache -t your-dockerhub-username/snail-todolist:latest -f Dockerfile .
```

### 推送失败

```bash
# 检查登录状态
docker info | grep Username

# 重新登录
docker logout
docker login
```

### 镜像过大

```bash
# 查看镜像大小
docker images | grep snail-todolist

# 查看镜像层
docker history your-dockerhub-username/snail-todolist:latest

# 优化建议：
# 1. 使用 alpine 基础镜像
# 2. 合并 RUN 命令
# 3. 清理构建缓存
# 4. 使用 .dockerignore
```

## 最佳实践

1. **使用多阶段构建**：减小最终镜像大小
2. **固定基础镜像版本**：避免不可预期的变化
3. **最小化层数**：合并 RUN 命令
4. **使用 .dockerignore**：排除不必要的文件
5. **添加健康检查**：确保服务正常运行
6. **设置资源限制**：防止资源耗尽
7. **定期更新依赖**：获取安全补丁

## 清理资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理构建缓存
docker builder prune -a

# 清理所有未使用的资源
docker system prune -a --volumes
```

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Dockerfile 最佳实践](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [多阶段构建](https://docs.docker.com/build/building/multi-stage/)
