#!/bin/bash

# SnailTodoList Docker 构建脚本

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

echo -e "${GREEN}=== SnailTodoList Docker 构建脚本 ===${NC}"
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

echo -e "${GREEN}构建配置:${NC}"
echo "  镜像名称: ${FULL_IMAGE_NAME}"
echo "  版本标签: ${VERSION}"
echo ""

# 选择构建类型
echo -e "${YELLOW}请选择构建类型:${NC}"
echo "  1) All-in-One 镜像 (PostgreSQL + Server + Web)"
echo "  2) 仅 Web 镜像"
echo "  3) 仅 Server 镜像"
echo "  4) 全部构建"
read -p "请输入选项 (1-4): " BUILD_TYPE

case $BUILD_TYPE in
    1)
        echo -e "${GREEN}构建 All-in-One 镜像...${NC}"
        docker build -t "${FULL_IMAGE_NAME}:${VERSION}" -f docker/Dockerfile .
        docker tag "${FULL_IMAGE_NAME}:${VERSION}" "${FULL_IMAGE_NAME}:latest"
        echo -e "${GREEN}✓ All-in-One 镜像构建完成${NC}"
        ;;
    2)
        echo -e "${GREEN}构建 Web 镜像...${NC}"
        docker build -t "${FULL_IMAGE_NAME}-web:${VERSION}" -f docker/Dockerfile.web .
        docker tag "${FULL_IMAGE_NAME}-web:${VERSION}" "${FULL_IMAGE_NAME}-web:latest"
        echo -e "${GREEN}✓ Web 镜像构建完成${NC}"
        ;;
    3)
        echo -e "${GREEN}构建 Server 镜像...${NC}"
        docker build -t "${FULL_IMAGE_NAME}-server:${VERSION}" -f server/Dockerfile ./server
        docker tag "${FULL_IMAGE_NAME}-server:${VERSION}" "${FULL_IMAGE_NAME}-server:latest"
        echo -e "${GREEN}✓ Server 镜像构建完成${NC}"
        ;;
    4)
        echo -e "${GREEN}构建所有镜像...${NC}"
        
        echo -e "${YELLOW}[1/3] 构建 All-in-One 镜像...${NC}"
        docker build -t "${FULL_IMAGE_NAME}:${VERSION}" -f docker/Dockerfile .
        docker tag "${FULL_IMAGE_NAME}:${VERSION}" "${FULL_IMAGE_NAME}:latest"
        
        echo -e "${YELLOW}[2/3] 构建 Web 镜像...${NC}"
        docker build -t "${FULL_IMAGE_NAME}-web:${VERSION}" -f docker/Dockerfile.web .
        docker tag "${FULL_IMAGE_NAME}-web:${VERSION}" "${FULL_IMAGE_NAME}-web:latest"
        
        echo -e "${YELLOW}[3/3] 构建 Server 镜像...${NC}"
        docker build -t "${FULL_IMAGE_NAME}-server:${VERSION}" -f server/Dockerfile ./server
        docker tag "${FULL_IMAGE_NAME}-server:${VERSION}" "${FULL_IMAGE_NAME}-server:latest"
        
        echo -e "${GREEN}✓ 所有镜像构建完成${NC}"
        ;;
    *)
        echo -e "${RED}无效的选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== 构建完成 ===${NC}"
echo ""
echo -e "${YELLOW}查看构建的镜像:${NC}"
docker images | grep "${DOCKER_USERNAME}/${IMAGE_NAME}"

echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "  1. 测试镜像: ./scripts/test-docker.sh"
echo "  2. 推送到 Docker Hub: ./scripts/push-docker.sh"
