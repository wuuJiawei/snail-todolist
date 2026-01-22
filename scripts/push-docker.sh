#!/bin/bash

# SnailTodoList Docker 推送脚本

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

echo -e "${GREEN}=== SnailTodoList Docker 推送脚本 ===${NC}"
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

# 检查是否已登录 Docker Hub
echo -e "${YELLOW}检查 Docker Hub 登录状态...${NC}"
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    echo -e "${YELLOW}请登录 Docker Hub:${NC}"
    docker login
fi

echo ""
echo -e "${GREEN}推送配置:${NC}"
echo "  镜像名称: ${FULL_IMAGE_NAME}"
echo "  版本标签: ${VERSION}"
echo ""

# 选择推送类型
echo -e "${YELLOW}请选择推送类型:${NC}"
echo "  1) All-in-One 镜像"
echo "  2) Web 镜像"
echo "  3) Server 镜像"
echo "  4) 全部推送"
read -p "请输入选项 (1-4): " PUSH_TYPE

case $PUSH_TYPE in
    1)
        echo -e "${GREEN}推送 All-in-One 镜像...${NC}"
        docker push "${FULL_IMAGE_NAME}:${VERSION}"
        docker push "${FULL_IMAGE_NAME}:latest"
        echo -e "${GREEN}✓ All-in-One 镜像推送完成${NC}"
        ;;
    2)
        echo -e "${GREEN}推送 Web 镜像...${NC}"
        docker push "${FULL_IMAGE_NAME}-web:${VERSION}"
        docker push "${FULL_IMAGE_NAME}-web:latest"
        echo -e "${GREEN}✓ Web 镜像推送完成${NC}"
        ;;
    3)
        echo -e "${GREEN}推送 Server 镜像...${NC}"
        docker push "${FULL_IMAGE_NAME}-server:${VERSION}"
        docker push "${FULL_IMAGE_NAME}-server:latest"
        echo -e "${GREEN}✓ Server 镜像推送完成${NC}"
        ;;
    4)
        echo -e "${GREEN}推送所有镜像...${NC}"
        
        echo -e "${YELLOW}[1/3] 推送 All-in-One 镜像...${NC}"
        docker push "${FULL_IMAGE_NAME}:${VERSION}"
        docker push "${FULL_IMAGE_NAME}:latest"
        
        echo -e "${YELLOW}[2/3] 推送 Web 镜像...${NC}"
        docker push "${FULL_IMAGE_NAME}-web:${VERSION}"
        docker push "${FULL_IMAGE_NAME}-web:latest"
        
        echo -e "${YELLOW}[3/3] 推送 Server 镜像...${NC}"
        docker push "${FULL_IMAGE_NAME}-server:${VERSION}"
        docker push "${FULL_IMAGE_NAME}-server:latest"
        
        echo -e "${GREEN}✓ 所有镜像推送完成${NC}"
        ;;
    *)
        echo -e "${RED}无效的选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== 推送完成 ===${NC}"
echo ""
echo -e "${YELLOW}镜像地址:${NC}"
case $PUSH_TYPE in
    1)
        echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
        ;;
    2)
        echo "  docker pull ${FULL_IMAGE_NAME}-web:${VERSION}"
        ;;
    3)
        echo "  docker pull ${FULL_IMAGE_NAME}-server:${VERSION}"
        ;;
    4)
        echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
        echo "  docker pull ${FULL_IMAGE_NAME}-web:${VERSION}"
        echo "  docker pull ${FULL_IMAGE_NAME}-server:${VERSION}"
        ;;
esac

echo ""
echo -e "${YELLOW}查看镜像:${NC}"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
