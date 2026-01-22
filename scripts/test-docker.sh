#!/bin/bash

# SnailTodoList Docker 测试脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
DOCKER_USERNAME="${DOCKER_USERNAME:-}"
IMAGE_NAME="snail-todolist"
VERSION="${VERSION:-latest}"
CONTAINER_NAME="snail-test"

echo -e "${GREEN}=== SnailTodoList Docker 测试脚本 ===${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

# 检查 Docker Hub 用户名
if [ -z "$DOCKER_USERNAME" ]; then
    echo -e "${YELLOW}请输入 Docker Hub 用户名:${NC}"
    read -r DOCKER_USERNAME
    
    if [ -z "$DOCKER_USERNAME" ]; then
        echo -e "${RED}错误: Docker Hub 用户名不能为空${NC}"
        exit 1
    fi
fi

FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

# 清理旧容器
echo -e "${YELLOW}清理旧容器...${NC}"
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true

# 启动容器
echo -e "${GREEN}启动测试容器...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    -p 8080:80 \
    -p 23334:23333 \
    -e JWT_SECRET=test-secret-key \
    "${FULL_IMAGE_NAME}:${VERSION}"

echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查容器状态
echo -e "${YELLOW}检查容器状态...${NC}"
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo -e "${GREEN}✓ 容器运行中${NC}"
else
    echo -e "${RED}✗ 容器未运行${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

# 测试前端
echo -e "${YELLOW}测试前端 (http://localhost:8080)...${NC}"
if curl -f -s http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✓ 前端访问正常${NC}"
else
    echo -e "${RED}✗ 前端访问失败${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

# 测试后端
echo -e "${YELLOW}测试后端 (http://localhost:23334/api/health)...${NC}"
sleep 5
if curl -f -s http://localhost:23334/api/health > /dev/null; then
    echo -e "${GREEN}✓ 后端访问正常${NC}"
else
    echo -e "${RED}✗ 后端访问失败${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

# 显示日志
echo ""
echo -e "${YELLOW}容器日志:${NC}"
docker logs ${CONTAINER_NAME} --tail 50

echo ""
echo -e "${GREEN}=== 测试完成 ===${NC}"
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo "  前端: http://localhost:8080"
echo "  后端: http://localhost:23334"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo "  docker logs -f ${CONTAINER_NAME}"
echo ""
echo -e "${YELLOW}停止测试:${NC}"
echo "  docker rm -f ${CONTAINER_NAME}"
