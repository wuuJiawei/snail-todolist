#!/bin/bash
set -e

# SnailTask Server 一键部署脚本
# 用法: curl -sSL https://raw.githubusercontent.com/yourname/snailtask/main/server/scripts/install.sh | bash

INSTALL_DIR="${INSTALL_DIR:-$HOME/snailtask}"
REPO_URL="https://github.com/yourname/snailtask.git"

echo "🐌 SnailTask Server 安装脚本"
echo "================================"

# 检查依赖
check_dependencies() {
    echo "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker"
        echo "   https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        echo "❌ Docker Compose 未安装"
        exit 1
    fi
    
    echo "✓ Docker 已安装"
    echo "✓ Docker Compose 已安装"
}

# 下载配置
download_config() {
    echo ""
    echo "下载配置文件..."
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # 下载 docker-compose.yml
    curl -sSL "https://raw.githubusercontent.com/yourname/snailtask/main/server/docker-compose.yml" -o docker-compose.yml
    
    # 下载 .env.example
    curl -sSL "https://raw.githubusercontent.com/yourname/snailtask/main/server/.env.example" -o .env.example
    
    echo "✓ 配置文件已下载到 $INSTALL_DIR"
}

# 配置环境变量
configure_env() {
    echo ""
    echo "配置环境变量..."
    
    if [ -f .env ]; then
        echo "⚠️  .env 文件已存在，跳过配置"
        return
    fi
    
    cp .env.example .env
    
    # 生成随机 JWT_SECRET
    JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    sed -i.bak "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
    rm -f .env.bak
    
    echo "✓ 环境变量已配置"
    echo "⚠️  请编辑 $INSTALL_DIR/.env 修改数据库密码等配置"
}

# 启动服务
start_services() {
    echo ""
    echo "启动服务..."
    
    docker compose up -d
    
    echo ""
    echo "✓ 服务已启动"
    echo ""
    echo "================================"
    echo "🎉 安装完成！"
    echo ""
    echo "服务地址: http://localhost:23333"
    echo "健康检查: http://localhost:23333/healthz"
    echo "API 文档: http://localhost:23333/api/v1"
    echo ""
    echo "常用命令:"
    echo "  cd $INSTALL_DIR"
    echo "  docker compose logs -f    # 查看日志"
    echo "  docker compose restart    # 重启服务"
    echo "  docker compose down       # 停止服务"
    echo "================================"
}

# 主流程
main() {
    check_dependencies
    download_config
    configure_env
    start_services
}

main
