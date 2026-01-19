.PHONY: help docker-build docker-push docker-test docker-all docker-clean

# 默认目标
help:
	@echo "SnailTodoList Docker 构建工具"
	@echo ""
	@echo "使用方法:"
	@echo "  make docker-build    - 构建 Docker 镜像"
	@echo "  make docker-test     - 测试 Docker 镜像"
	@echo "  make docker-push     - 推送到 Docker Hub"
	@echo "  make docker-all      - 构建、测试并推送"
	@echo "  make docker-clean    - 清理 Docker 镜像和容器"
	@echo ""
	@echo "环境变量:"
	@echo "  DOCKER_USERNAME      - Docker Hub 用户名"
	@echo "  VERSION              - 镜像版本标签 (默认: latest)"
	@echo ""
	@echo "示例:"
	@echo "  DOCKER_USERNAME=myuser make docker-build"
	@echo "  DOCKER_USERNAME=myuser VERSION=v1.0.0 make docker-all"

# 构建 Docker 镜像
docker-build:
	@./scripts/build-docker.sh

# 测试 Docker 镜像
docker-test:
	@./scripts/test-docker.sh

# 推送到 Docker Hub
docker-push:
	@./scripts/push-docker.sh

# 构建、测试并推送
docker-all: docker-build docker-test docker-push
	@echo "✓ 所有操作完成"

# 清理 Docker 镜像和容器
docker-clean:
	@echo "清理 Docker 资源..."
	@docker rm -f snail-test 2>/dev/null || true
	@docker rm -f snail-todolist 2>/dev/null || true
	@docker images | grep snail-todolist | awk '{print $$3}' | xargs -r docker rmi -f || true
	@echo "✓ 清理完成"

# 本地开发
dev:
	@pnpm dev

# 构建前端
build:
	@pnpm build

# 运行测试
test:
	@pnpm test

# 启动 Docker Compose
compose-up:
	@docker-compose up -d

# 停止 Docker Compose
compose-down:
	@docker-compose down

# 查看 Docker Compose 日志
compose-logs:
	@docker-compose logs -f
