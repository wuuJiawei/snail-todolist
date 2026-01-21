#!/bin/bash

# SnailTodoList 项目结构迁移回滚脚本
# 将项目从模块化结构恢复到原始扁平结构

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
BACKUP_DIR=".migration-backup"
DRY_RUN=false

# 日志文件
LOG_FILE="rollback-$(date +%Y%m%d-%H%M%S).log"

# 统计信息
MOVED_FILES=0
RESTORED_CONFIGS=0
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

show_usage() {
    cat << EOF
用法: $0 [选项]

选项:
    --dry-run           模拟运行，不实际执行文件操作
    --help              显示此帮助信息

示例:
    $0                  # 执行完整回滚
    $0 --dry-run        # 模拟运行，查看将要执行的操作

警告:
    此脚本将撤销项目结构迁移，恢复到原始扁平结构。
    请确保在执行前已备份重要数据。

EOF
}

# ============================================================================
# 前置条件检查
# ============================================================================

check_preconditions() {
    print_header "前置条件检查"
    
    # 检查是否在项目根目录
    if [ ! -d "web" ] && [ ! -d "desktop" ] && [ ! -d "docker" ]; then
        log_error "未检测到迁移后的目录结构"
        log_info "此脚本用于回滚项目结构迁移"
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
    
    log_success "前置条件检查通过"
}

# ============================================================================
# 确认回滚操作
# ============================================================================

confirm_rollback() {
    print_header "回滚确认"
    
    log_warning "此操作将撤销项目结构迁移，恢复到原始扁平结构"
    log_warning "所有迁移后的更改将被撤销"
    log ""
    
    if [ "$DRY_RUN" = false ]; then
        read -p "确定要继续吗? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "回滚已取消"
            exit 0
        fi
    else
        log_info "[DRY RUN] 跳过确认"
    fi
}

# ============================================================================
# 文件移动操作
# ============================================================================

git_move_back() {
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
    if [ "$dest_dir" != "." ]; then
        mkdir -p "$dest_dir"
    fi
    
    # 使用 git mv 移动文件
    if git mv "$source" "$dest" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "已恢复: $source -> $dest"
        ((MOVED_FILES++))
        return 0
    else
        log_error "恢复失败: $source -> $dest"
        return 1
    fi
}

# ============================================================================
# 回滚 Web 前端文件
# ============================================================================

rollback_web_files() {
    print_header "回滚 Web 前端文件"
    
    if [ ! -d "web" ]; then
        log_warning "web/ 目录不存在，跳过"
        return
    fi
    
    log_info "恢复源代码和资源..."
    git_move_back "web/src" "src"
    git_move_back "web/public" "public"
    git_move_back "web/index.html" "index.html"
    
    log_info "恢复配置文件..."
    git_move_back "web/package.json" "package.json"
    git_move_back "web/package-lock.json" "package-lock.json" || true
    git_move_back "web/pnpm-lock.yaml" "pnpm-lock.yaml" || true
    
    git_move_back "web/vite.config.ts" "vite.config.ts"
    git_move_back "web/vitest.config.ts" "vitest.config.ts" || true
    
    git_move_back "web/tsconfig.json" "tsconfig.json"
    git_move_back "web/tsconfig.app.json" "tsconfig.app.json" || true
    git_move_back "web/tsconfig.node.json" "tsconfig.node.json" || true
    
    git_move_back "web/tailwind.config.ts" "tailwind.config.ts"
    git_move_back "web/postcss.config.js" "postcss.config.js"
    
    git_move_back "web/eslint.config.js" "eslint.config.js"
    git_move_back "web/.eslintignore" ".eslintignore" || true
    
    git_move_back "web/components.json" "components.json" || true
    git_move_back "web/vercel.json" "vercel.json" || true
    
    # 删除空的 web 目录
    if [ "$DRY_RUN" = false ]; then
        if [ -d "web" ] && [ -z "$(ls -A web)" ]; then
            rmdir web
            log_success "已删除空目录: web/"
        fi
    fi
    
    log_success "Web 前端文件回滚完成"
}

# ============================================================================
# 回滚桌面客户端文件
# ============================================================================

rollback_desktop_files() {
    print_header "回滚桌面客户端文件"
    
    if [ ! -d "desktop" ]; then
        log_warning "desktop/ 目录不存在，跳过"
        return
    fi
    
    log_info "恢复桌面客户端文件..."
    git_move_back "desktop/app.go" "app.go"
    git_move_back "desktop/main.go" "main.go"
    git_move_back "desktop/wails.json" "wails.json"
    git_move_back "desktop/go.mod" "go.mod"
    git_move_back "desktop/go.sum" "go.sum"
    
    # 恢复 build 目录（如果存在）
    if [ -d "desktop/build" ]; then
        git_move_back "desktop/build" "build"
    fi
    
    # 删除空的 desktop 目录
    if [ "$DRY_RUN" = false ]; then
        if [ -d "desktop" ] && [ -z "$(ls -A desktop)" ]; then
            rmdir desktop
            log_success "已删除空目录: desktop/"
        fi
    fi
    
    log_success "桌面客户端文件回滚完成"
}

# ============================================================================
# 回滚 Docker 文件
# ============================================================================

rollback_docker_files() {
    print_header "回滚 Docker 文件"
    
    if [ ! -d "docker" ]; then
        log_warning "docker/ 目录不存在，跳过"
        return
    fi
    
    log_info "恢复 Docker 配置文件..."
    git_move_back "docker/Dockerfile" "Dockerfile"
    git_move_back "docker/Dockerfile.web" "Dockerfile.web" || true
    git_move_back "docker/docker-compose.yml" "docker-compose.yml"
    git_move_back "docker/nginx.conf" "nginx.conf" || true
    git_move_back "docker/.dockerignore" ".dockerignore" || true
    
    # 删除空的 docker 目录
    if [ "$DRY_RUN" = false ]; then
        if [ -d "docker" ] && [ -z "$(ls -A docker)" ]; then
            rmdir docker
            log_success "已删除空目录: docker/"
        fi
    fi
    
    log_success "Docker 文件回滚完成"
}

# ============================================================================
# 恢复配置文件
# ============================================================================

restore_configurations() {
    print_header "恢复配置文件"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "备份目录不存在: $BACKUP_DIR"
        log_info "跳过配置文件恢复"
        return
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] 将从 $BACKUP_DIR 恢复配置文件"
        return
    fi
    
    log_info "从备份恢复配置文件..."
    
    # 恢复配置文件
    for backup_file in "$BACKUP_DIR"/*.backup; do
        if [ -f "$backup_file" ]; then
            original_file=$(basename "$backup_file" .backup)
            cp "$backup_file" "$original_file"
            log_success "已恢复: $original_file"
            ((RESTORED_CONFIGS++))
        fi
    done
    
    if [ $RESTORED_CONFIGS -eq 0 ]; then
        log_warning "未找到备份的配置文件"
    else
        log_success "配置文件恢复完成"
    fi
}

# ============================================================================
# Git 重置选项
# ============================================================================

offer_git_reset() {
    print_header "Git 重置选项"
    
    log_info "可以使用以下方式完全重置到迁移前状态:"
    log ""
    log_info "1. 查找备份分支:"
    log_info "   git branch | grep backup-before-restructure"
    log ""
    log_info "2. 重置到备份分支:"
    log_info "   git reset --hard <backup-branch-name>"
    log ""
    log_info "3. 或者撤销最近的提交:"
    log_info "   git reset --hard HEAD~1"
    log ""
    
    if [ "$DRY_RUN" = false ]; then
        read -p "是否要立即重置到备份分支? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # 查找最新的备份分支
            local backup_branch=$(git branch | grep backup-before-restructure | tail -1 | xargs)
            if [ -n "$backup_branch" ]; then
                log_info "重置到分支: $backup_branch"
                git reset --hard "$backup_branch"
                log_success "已重置到备份分支"
            else
                log_error "未找到备份分支"
            fi
        fi
    fi
}

# ============================================================================
# 验证回滚结果
# ============================================================================

validate_rollback() {
    print_header "验证回滚结果"
    
    local validation_errors=0
    
    # 检查目录是否已删除
    log_info "检查目录清理..."
    for dir in "web" "desktop" "docker"; do
        if [ -d "$dir" ] && [ -n "$(ls -A $dir 2>/dev/null)" ]; then
            log_warning "目录仍存在且非空: $dir/"
            ((validation_errors++))
        else
            log_success "目录已清理: $dir/"
        fi
    done
    
    # 检查关键文件是否恢复
    log_info "检查关键文件..."
    local key_files=(
        "src"
        "public"
        "index.html"
        "package.json"
        "vite.config.ts"
        "app.go"
        "main.go"
        "wails.json"
        "Dockerfile"
        "docker-compose.yml"
    )
    
    for file in "${key_files[@]}"; do
        if [ -e "$file" ]; then
            log_success "文件已恢复: $file"
        else
            log_error "文件缺失: $file"
            ((validation_errors++))
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        log_success "验证通过"
        return 0
    else
        log_error "验证失败，发现 $validation_errors 个问题"
        return 1
    fi
}

# ============================================================================
# 生成回滚报告
# ============================================================================

generate_report() {
    print_header "回滚报告"
    
    log_info "统计信息:"
    log_info "  恢复文件数: $MOVED_FILES"
    log_info "  恢复配置数: $RESTORED_CONFIGS"
    log_info "  错误数: $ERRORS"
    log ""
    log_info "日志文件: $LOG_FILE"
    log ""
    
    if [ $ERRORS -eq 0 ]; then
        log_success "回滚成功完成！"
        log ""
        log_info "项目结构已恢复到迁移前状态"
        log_info "可以重新运行迁移脚本: ./scripts/migrate-structure.sh"
    else
        log_error "回滚过程中发现 $ERRORS 个错误"
        log_info "请检查日志文件: $LOG_FILE"
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
    print_header "SnailTodoList 项目结构回滚"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "模拟运行模式 - 不会实际执行文件操作"
    fi
    
    # 执行回滚步骤
    check_preconditions
    confirm_rollback
    rollback_web_files
    rollback_desktop_files
    rollback_docker_files
    restore_configurations
    
    # 验证和报告
    if [ "$DRY_RUN" = false ]; then
        validate_rollback
    fi
    
    generate_report
    
    # 提供 Git 重置选项
    if [ "$DRY_RUN" = false ]; then
        offer_git_reset
    fi
}

# 运行主函数
main "$@"
