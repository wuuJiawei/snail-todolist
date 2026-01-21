#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}正在停止所有服务...${NC}"
    # 杀死所有子进程
    pkill -P $$
    exit 0
}

# 捕获 Ctrl+C 信号
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  SnailTodoList 开发环境启动${NC}"
echo -e "${CYAN}========================================${NC}\n"

# 检查依赖
AIR_PATH=$(go env GOPATH)/bin/air
if [ ! -f "$AIR_PATH" ]; then
    echo -e "${RED}错误: air 未安装${NC}"
    echo -e "${YELLOW}请运行: go install github.com/air-verse/air@latest${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: npm 未安装${NC}"
    exit 1
fi

# 启动 Server (Go + Air)
echo -e "${GREEN}[Server]${NC} 启动 Go 后端服务 (热更新模式)..."
(
    cd server
    "$AIR_PATH" 2>&1 | while IFS= read -r line; do
        echo -e "${GREEN}[Server]${NC} $line"
    done
) &
SERVER_PID=$!

# 等待一秒，让 server 先启动
sleep 1

# 启动 Web (Vite)
echo -e "${BLUE}[Web]${NC} 启动 Vite 开发服务器..."
(
    cd web
    npm run dev 2>&1 | while IFS= read -r line; do
        echo -e "${BLUE}[Web]${NC} $line"
    done
) &
WEB_PID=$!

echo -e "\n${CYAN}========================================${NC}"
echo -e "${GREEN}✓ 所有服务已启动${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${YELLOW}提示: 按 Ctrl+C 停止所有服务${NC}\n"

# 等待所有后台进程
wait
