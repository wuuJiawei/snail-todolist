#!/bin/bash

# SnailTodoList 项目结构迁移脚本
# 将项目从扁平结构重组为模块化结构
# 
# 目标结构:
#   web/     - Web 前端 (React + Vite)
#   desktop/ - 桌面客户端 (Wails)
#   docker/  - Docker 配置
#   server/  - 后端服务 (保持不变)
#   docs/    - 文档 (保持不变)
#   scripts/ - 构建脚本 (保持不变)

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
BACKUP_BRANCH="backup-before-restructure-$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".migration-backup"
DRY_RUN=false
SKIP_VALIDATION=false

# 日志文件
LOG_FILE="migration-$(date +%Y%m%d-%H%M%S).log"

# 统计信息
MOVED_FILES=0
UPDATED_CONFIGS=0
ERRORS=0

# ============================================================================
# 辅助函数
# ============================================================================

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
    ((ERRORS++))
}

print_header() {
    log ""
    log "${CYAN}========================================${NC}"
    log "${CYAN}$1${NC}"
    log "${CYAN}========================================${NC}"
    log ""
}

# 显示使用说明
show_usage() {
    cat << EOF
用法: $0 [选项]

选项:
    --dry-run           模拟运行，不实际执行文件操作
    --skip-validation   跳过前置验证检查
    --help              显示此帮助信息

示例:
    $0                  # 执行完整迁移
    $0 --dry-run        # 模拟运行，查看将要执行的操作
    $0 --skip-validation # 跳过验证直接执行迁移

EOF
}

# ============================================================================
# 前置条件检查
# ============================================================================

check_preconditions() {
    print_header "前置条件检查"
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -f "wails.json" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 检查 git 是否安装
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装"
        exit 1
    fi
    
    # 检查是否在 git 仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "当前目录不是 Git 仓库"
        exit 1
    fi
    
    # 检查 git 状态是否干净
    if [ "$SKIP_VALIDATION" = false ]; then
        if ! git diff-index --quiet HEAD --; then
            log_error "Git 工作区不干净，请先提交或暂存更改"
            log_info "提示: 运行 'git status' 查看未提交的更改"
            log_info "或使用 --skip-validation 跳过此检查"
            exit 1
        fi
        log_success "Git 工作区干净"
    else
        log_warning "跳过 Git 状态检查"
    fi
    
    # 检查是否已经迁移过
    if [ -d "web" ] && [ -d "desktop" ] && [ -d "docker" ]; then
        log_warning "检测到目标目录已存在，可能已经迁移过"
        read -p "是否继续? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "迁移已取消"
            exit 0
        fi
    fi
    
    log_success "前置条件检查通过"
}

# ============================================================================
# 创建备份
# ============================================================================

create_backup() {
    print_header "创建备份"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] 将创建备份分支: $BACKUP_BRANCH"
        return
    fi
    
    # 创建备份分支
    log_info "创建备份分支: $BACKUP_BRANCH"
    git branch "$BACKUP_BRANCH"
    log_success "备份分支已创建"
    
    # 创建配置文件备份目录
    log_info "创建配置文件备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # 备份关键配置文件
    local config_files=(
        "package.json"
        "vite.config.ts"
        "wails.json"
        "Dockerfile"
        "Dockerfile.web"
        "docker-compose.yml"
        "Makefile"
        ".gitignore"
    )
    
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            cp "$file" "$BACKUP_DIR/$file.backup"
            log_info "已备份: $file"
        fi
    done
    
    log_success "配置文件备份完成"
}

# ============================================================================
# 创建目录结构
# ============================================================================

create_directory_structure() {
    print_header "创建目录结构"
    
    local dirs=("web" "desktop" "docker")
    
    for dir in "${dirs[@]}"; do
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] 将创建目录: $dir/"
        else
            if [ ! -d "$dir" ]; then
                mkdir -p "$dir"
                log_success "已创建目录: $dir/"
            else
                log_warning "目录已存在: $dir/"
            fi
        fi
    done
}

# ============================================================================
# 文件移动操作
# ============================================================================

git_move() {
    local source="$1"
    local dest="$2"
    
    if [ ! -e "$source" ]; then
        log_warning "源文件不存在，跳过: $source"
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] git mv $source -> $dest"
        return 0
    fi
    
    # 确保目标目录存在
    local dest_dir=$(dirname "$dest")
    mkdir -p "$dest_dir"
    
    # 使用 git mv 移动文件
    if git mv "$source" "$dest" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "已移动: $source -> $dest"
        ((MOVED_FILES++))
        return 0
    else
        log_error "移动失败: $source -> $dest"
        return 1
    fi
}

# ============================================================================
# 迁移 Web 前端文件
# ============================================================================

migrate_web_files() {
    print_header "迁移 Web 前端文件"
    
    log_info "移动源代码和资源..."
    git_move "src" "web/src"
    git_move "public" "web/public"
    git_move "index.html" "web/index.html"
    
    log_info "移动配置文件..."
    git_move "package.json" "web/package.json"
    git_move "package-lock.json" "web/package-lock.json" || true
    git_move "pnpm-lock.yaml" "web/pnpm-lock.yaml" || true
    
    git_move "vite.config.ts" "web/vite.config.ts"
    git_move "vitest.config.ts" "web/vitest.config.ts" || true
    
    git_move "tsconfig.json" "web/tsconfig.json"
    git_move "tsconfig.app.json" "web/tsconfig.app.json" || true
    git_move "tsconfig.node.json" "web/tsconfig.node.json" || true
    
    git_move "tailwind.config.ts" "web/tailwind.config.ts"
    git_move "postcss.config.js" "web/postcss.config.js"
    
    git_move "eslint.config.js" "web/eslint.config.js"
    git_move ".eslintignore" "web/.eslintignore" || true
    
    git_move "components.json" "web/components.json" || true
    git_move "vercel.json" "web/vercel.json" || true
    
    log_success "Web 前端文件迁移完成"
}

# ============================================================================
# 迁移桌面客户端文件
# ============================================================================

migrate_desktop_files() {
    print_header "迁移桌面客户端文件"
    
    log_info "移动桌面客户端文件..."
    git_move "app.go" "desktop/app.go"
    git_move "main.go" "desktop/main.go"
    git_move "wails.json" "desktop/wails.json"
    git_move "go.mod" "desktop/go.mod"
    git_move "go.sum" "desktop/go.sum"
    
    # 移动 build 目录（如果存在）
    if [ -d "build" ]; then
        git_move "build" "desktop/build"
    else
        log_info "build/ 目录不存在，跳过"
    fi
    
    log_success "桌面客户端文件迁移完成"
}

# ============================================================================
# 迁移 Docker 文件
# ============================================================================

migrate_docker_files() {
    print_header "迁移 Docker 文件"
    
    log_info "移动 Docker 配置文件..."
    git_move "Dockerfile" "docker/Dockerfile"
    git_move "Dockerfile.web" "docker/Dockerfile.web" || true
    git_move "docker-compose.yml" "docker/docker-compose.yml"
    git_move "nginx.conf" "docker/nginx.conf" || true
    git_move ".dockerignore" "docker/.dockerignore" || true
    
    log_success "Docker 文件迁移完成"
}

# ============================================================================
# 更新配置文件
# ============================================================================

update_config_file() {
    local file="$1"
    local pattern="$2"
    local replacement="$3"
    
    if [ ! -f "$file" ]; then
        log_warning "配置文件不存在，跳过: $file"
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] 将更新 $file: $pattern -> $replacement"
        return 0
    fi
    
    # 使用 sed 进行替换（macOS 和 Linux 兼容）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|$pattern|$replacement|g" "$file"
    else
        sed -i "s|$pattern|$replacement|g" "$file"
    fi
    
    log_success "已更新: $file"
    ((UPDATED_CONFIGS++))
}

update_configurations() {
    print_header "更新配置文件"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] 配置文件更新将在实际运行时执行"
        log_info "主要更新内容:"
        log_info "  - web/vite.config.ts: 更新路径引用"
        log_info "  - desktop/wails.json: 更新前端路径"
        log_info "  - docker/Dockerfile*: 更新 COPY 路径"
        log_info "  - docker/docker-compose.yml: 更新构建上下文"
        log_info "  - Makefile: 更新脚本路径"
        log_info "  - .gitignore: 更新构建输出路径"
        return
    fi
    
    log_info "配置文件更新需要手动完成"
    log_info "请参考以下文件进行更新:"
    log_info "  - web/vite.config.ts"
    log_info "  - desktop/wails.json"
    log_info "  - docker/Dockerfile"
    log_info "  - docker/Dockerfile.web"
    log_info "  - docker/docker-compose.yml"
    log_info "  - Makefile"
    log_info "  - .gitignore"
    log_info "  - scripts/*.sh"
    log_info "  - .github/workflows/*.yml"
    
    log_warning "配置文件更新需要在后续任务中手动完成"
}

# ============================================================================
# 验证迁移结果
# ============================================================================

validate_migration() {
    print_header "验证迁移结果"
    
    local validation_errors=0
    
    # 检查目录是否创建
    log_info "检查目录结构..."
    for dir in "web" "desktop" "docker"; do
        if [ -d "$dir" ]; then
            log_success "目录存在: $dir/"
        else
            log_error "目录缺失: $dir/"
            ((validation_errors++))
        fi
    done
    
    # 检查关键文件是否移动
    log_info "检查关键文件..."
    local key_files=(
        "web/src"
        "web/public"
        "web/index.html"
        "web/package.json"
        "web/vite.config.ts"
        "desktop/app.go"
        "desktop/main.go"
        "desktop/wails.json"
        "docker/Dockerfile"
        "docker/docker-compose.yml"
    )
    
    for file in "${key_files[@]}"; do
        if [ -e "$file" ]; then
            log_success "文件存在: $file"
        else
            log_error "文件缺失: $file"
            ((validation_errors++))
        fi
    done
    
    # 检查旧文件是否已删除
    log_info "检查旧文件是否清理..."
    local old_files=(
        "src"
        "public"
        "index.html"
        "app.go"
        "main.go"
        "Dockerfile"
    )
    
    for file in "${old_files[@]}"; do
        if [ -e "$file" ]; then
            log_warning "旧文件仍存在: $file"
        else
            log_success "旧文件已清理: $file"
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        log_success "验证通过"
        return 0
    else
        log_error "验证失败，发现 $validation_errors 个错误"
        return 1
    fi
}

# ============================================================================
# 回滚功能
# ============================================================================

offer_rollback() {
    log ""
    log_warning "迁移过程中发现错误"
    log_info "备份分支: $BACKUP_BRANCH"
    log_info "可以使用以下命令回滚:"
    log_info "  git reset --hard $BACKUP_BRANCH"
    log_info "或运行回滚脚本:"
    log_info "  ./scripts/rollback-migration.sh"
    log ""
}

# ============================================================================
# 生成迁移报告
# ============================================================================

generate_report() {
    print_header "迁移报告"
    
    log_info "统计信息:"
    log_info "  移动文件数: $MOVED_FILES"
    log_info "  更新配置数: $UPDATED_CONFIGS"
    log_info "  错误数: $ERRORS"
    log ""
    log_info "日志文件: $LOG_FILE"
    log_info "备份分支: $BACKUP_BRANCH"
    log_info "备份目录: $BACKUP_DIR"
    log ""
    
    if [ $ERRORS -eq 0 ]; then
        log_success "迁移成功完成！"
        log ""
        log_info "下一步:"
        log_info "  1. 运行验证脚本: ./scripts/validate-migration.sh"
        log_info "  2. 更新配置文件（参考 tasks.md 任务 8-11）"
        log_info "  3. 测试构建流程"
        log_info "  4. 提交更改: git add -A && git commit -m 'refactor: restructure project'"
    else
        log_error "迁移过程中发现 $ERRORS 个错误"
        offer_rollback
    fi
}

# ============================================================================
# 主函数
# ============================================================================

main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 显示标题
    print_header "SnailTodoList 项目结构迁移"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "模拟运行模式 - 不会实际执行文件操作"
    fi
    
    # 执行迁移步骤
    check_preconditions
    create_backup
    create_directory_structure
    migrate_web_files
    migrate_desktop_files
    migrate_docker_files
    update_configurations
    
    # 验证和报告
    if [ "$DRY_RUN" = false ]; then
        validate_migration
    fi
    
    generate_report
}

# 运行主函数
main "$@"
