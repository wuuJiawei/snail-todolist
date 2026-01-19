#!/bin/bash

# SnailTodoList 快速部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SnailTodoList 快速部署 ===${NC}"
echo ""

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

# 生成随机密钥
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
    fi
}

# 创建 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}创建 .env 配置文件...${NC}"
    
    JWT_SECRET=$(generate_secret)
    POSTGRES_PASSWORD=$(generate_secret)
    
    cat > .env <<EOF
# 数据库密码
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT 密钥
JWT_SECRET=${JWT_SECRET}

# JWT 过期时间（小时）
JWT_EXPIRE_HOURS=72

# 端口配置
WEB_PORT=80
SERVER_PORT=23333
DB_PORT=5432

# API 地址
VITE_API_BASE_URL=http://localhost:23333

# CORS 配置
CORS_ORIGINS=http://localhost
EOF
    
    echo -e "${GREEN}✓ .env 文件已创建${NC}"
else
    echo -e "${YELLOW}⚠ .env 文件已存在，跳过创建${NC}"
fi

# 显示配置
echo ""
echo -e "${GREEN}部署配置:${NC}"
echo "  前端端口: 80"
echo "  后端端口: 23333"
echo "  数据库端口: 5432"
echo ""

# 询问是否继续
read -p "是否开始部署? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

# 启动服务
echo ""
echo -e "${GREEN}启动 Docker Compose 服务...${NC}"
docker-compose up -d

# 等待服务启动
echo ""
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo ""
echo -e "${GREEN}服务状态:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}=== 部署完成 ===${NC}"
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo "  前端: http://localhost"
echo "  后端: http://localhost:23333"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""
echo -e "${YELLOW}查看实时日志:${NC}"
docker-compose logs -f
