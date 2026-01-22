.PHONY: help dev build clean build-all test lint fmt docker-up docker-down docker-logs

# 显示帮助
help:
	@echo "SnailTask Server - 可用命令:"
	@echo ""
	@echo "  make dev          - 启动开发服务器（热重载，需要 air）"
	@echo "  make run          - 直接运行服务器"
	@echo "  make build        - 构建当前平台二进制"
	@echo "  make build-all    - 跨平台构建（Tauri sidecar）"
	@echo "  make test         - 运行测试"
	@echo "  make lint         - 运行 linter"
	@echo "  make fmt          - 格式化代码"
	@echo "  make clean        - 清理构建产物"
	@echo ""
	@echo "  make docker-up    - 启动 Docker Compose"
	@echo "  make docker-down  - 停止 Docker Compose"
	@echo "  make docker-logs  - 查看 Docker 日志"
	@echo ""

# 开发运行（热重载）
dev:
	@which air > /dev/null || (echo "请先安装 air: go install github.com/air-verse/air@latest" && exit 1)
	air

# 直接运行
run:
	go run main.go

# 当前平台构建
build:
	go build -o bin/snail-server main.go

# 跨平台构建（用于 Tauri sidecar）
build-all: clean
	mkdir -p bin
	# macOS Intel
	GOOS=darwin GOARCH=amd64 go build -o bin/snail-server-x86_64-apple-darwin main.go
	# macOS Apple Silicon
	GOOS=darwin GOARCH=arm64 go build -o bin/snail-server-aarch64-apple-darwin main.go
	# Windows
	GOOS=windows GOARCH=amd64 go build -o bin/snail-server-x86_64-pc-windows-msvc.exe main.go
	# Linux
	GOOS=linux GOARCH=amd64 go build -o bin/snail-server-x86_64-unknown-linux-gnu main.go

# 运行测试
test:
	go test -v ./...

# 运行测试（带覆盖率）
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# 运行 linter
lint:
	@which golangci-lint > /dev/null || (echo "请先安装 golangci-lint: brew install golangci-lint" && exit 1)
	golangci-lint run

# 格式化代码
fmt:
	go fmt ./...
	goimports -w .

# 清理
clean:
	rm -rf bin/ tmp/ coverage.out coverage.html

# Docker 命令
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-build:
	docker compose build
