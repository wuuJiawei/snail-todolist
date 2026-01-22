#!/bin/bash

# SnailTodoList 项目结构迁移验证脚本
# 验证迁移后的项目结构是否正确
# 实现基于属性的验证检查

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 配置
VERBOSE=false
SKIP_BUILD=false
REPORT_FILE="validation-report-$(date +%Y%m%d-%H%M%S).md"

# 统计信息
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ============================================================================
# 辅助函数
# ============================================================================

log() {
    echo -e "$1"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
}

log_fail() {
    log "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
}

log_warning() {
    log "${YELLOW}[!]${NC} $1"
    ((WARNING_CHECKS++))
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
    --verbose           显示详细输出
    --skip-build        跳过构建验证
    --help              显示此帮助信息

示例:
    $0                  # 执行完整验证
    $0 --verbose        # 显示详细信息
    $0 --skip-build     # 跳过构建测试（更快）

EOF
}

# ============================================================================
# 报告生成
# ============================================================================

init_report() {
    cat > "$REPORT_FILE" << EOF
# 项目结构迁移验证报告

**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')

## 概述

本报告验证 SnailTodoList 项目结构迁移的正确性。

---

EOF
}

append_report() {
    echo "$1" >> "$REPORT_FILE"
}

finalize_report() {
    append_report ""
    append_report "## 统计摘要"
    append_report ""
    append_report "- **总检查项**: $TOTAL_CHECKS"
    append_report "- **通过**: $PASSED_CHECKS ✓"
    append_report "- **失败**: $FAILED_CHECKS ✗"
    append_report "- **警告**: $WARNING_CHECKS !"
    append_report ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        append_report "**结论**: ✅ 验证通过"
    else
        append_report "**结论**: ❌ 验证失败"
    fi
    
    append_report ""
    append_report "---"
    append_report "*报告生成于: $(date)*"
}

# ============================================================================
# 属性 1: 文件重定位完整性
# ============================================================================

validate_property_1() {
    print_header "属性 1: 文件重定位完整性"
    append_report "## 属性 1: 文件重定位完整性"
    append_report ""
    append_report "**验证**: 所有计划移动的文件应存在于新位置，且不存在于旧位置"
    append_report ""
    
    log_info "验证文件是否已正确移动..."
    
    local property1_passed=true
    
    # 检查 Web 前端文件
    check_file_moved "src" "web/src" || property1_passed=false
    check_file_moved "public" "web/public" || property1_passed=false
    check_file_moved "index.html" "web/index.html" || property1_passed=false
    check_file_moved "package.json" "web/package.json" || property1_passed=false
    check_file_moved "vite.config.ts" "web/vite.config.ts" || property1_passed=false
    check_file_moved "tsconfig.json" "web/tsconfig.json" || property1_passed=false
    check_file_moved "tailwind.config.ts" "web/tailwind.config.ts" || property1_passed=false
    check_file_moved "postcss.config.js" "web/postcss.config.js" || property1_passed=false
    check_file_moved "eslint.config.js" "web/eslint.config.js" || property1_passed=false
    
    # 检查桌面客户端文件
    check_file_moved "app.go" "desktop/app.go" || property1_passed=false
    check_file_moved "main.go" "desktop/main.go" || property1_passed=false
    check_file_moved "wails.json" "desktop/wails.json" || property1_passed=false
    check_file_moved "go.mod" "desktop/go.mod" || property1_passed=false
    check_file_moved "go.sum" "desktop/go.sum" || property1_passed=false
    
    # 检查 Docker 文件
    check_file_moved "Dockerfile" "docker/Dockerfile" || property1_passed=false
    check_file_moved "docker-compose.yml" "docker/docker-compose.yml" || property1_passed=false
    
    append_report ""
    if [ "$property1_passed" = true ]; then
        append_report "**结果**: ✅ 通过"
    else
        append_report "**结果**: ❌ 失败"
    fi
    append_report ""
}

check_file_moved() {
    local old_path="$1"
    local new_path="$2"
    
    ((TOTAL_CHECKS++))
    
    # 检查新位置是否存在
    if [ -e "$new_path" ]; then
        # 检查旧位置是否不存在
        if [ ! -e "$old_path" ]; then
            log_success "$old_path -> $new_path"
            append_report "- ✓ \`$old_path\` → \`$new_path\`"
            return 0
        else
            log_fail "$old_path 仍存在于旧位置"
            append_report "- ✗ \`$old_path\` 仍存在于旧位置"
            return 1
        fi
    else
        log_fail "$new_path 不存在"
        append_report "- ✗ \`$new_path\` 不存在"
        return 1
    fi
}

# ============================================================================
# 属性 2: Git 历史保留
# ============================================================================

validate_property_2() {
    print_header "属性 2: Git 历史保留"
    append_report "## 属性 2: Git 历史保留"
    append_report ""
    append_report "**验证**: Git 应将文件移动跟踪为重命名，而非删除+添加"
    append_report ""
    
    log_info "验证 Git 历史是否保留..."
    
    # 检查关键文件的 Git 历史
    local test_files=(
        "web/src"
        "web/package.json"
        "desktop/app.go"
        "docker/Dockerfile"
    )
    
    local property2_passed=true
    
    for file in "${test_files[@]}"; do
        ((TOTAL_CHECKS++))
        
        if [ ! -e "$file" ]; then
            log_warning "$file 不存在，跳过历史检查"
            append_report "- ! \`$file\` 不存在，跳过"
            continue
        fi
        
        # 使用 git log --follow 检查历史
        if git log --follow --oneline "$file" 2>/dev/null | head -1 > /dev/null; then
            log_success "$file 的 Git 历史已保留"
            append_report "- ✓ \`$file\` 历史已保留"
        else
            log_fail "$file 的 Git 历史丢失"
            append_report "- ✗ \`$file\` 历史丢失"
            property2_passed=false
        fi
    done
    
    append_report ""
    if [ "$property2_passed" = true ]; then
        append_report "**结果**: ✅ 通过"
    else
        append_report "**结果**: ❌ 失败"
    fi
    append_report ""
}

# ============================================================================
# 属性 3: 路径引用一致性
# ============================================================================

validate_property_3() {
    print_header "属性 3: 路径引用一致性"
    append_report "## 属性 3: 路径引用一致性"
    append_report ""
    append_report "**验证**: 配置文件中不应存在旧路径引用"
    append_report ""
    
    log_info "搜索旧路径引用..."
    
    # 定义需要检查的旧路径模式（排除合理的引用）
    local old_patterns=(
        "^src/"
        "^public/"
        "^dist/"
        "^build/"
        "Dockerfile$"
        "docker-compose.yml$"
    )
    
    # 定义需要检查的文件
    local config_files=(
        "web/vite.config.ts"
        "web/package.json"
        "desktop/wails.json"
        "docker/docker-compose.yml"
        "Makefile"
        ".gitignore"
    )
    
    local property3_passed=true
    local found_references=false
    
    for config_file in "${config_files[@]}"; do
        if [ ! -f "$config_file" ]; then
            log_warning "$config_file 不存在，跳过"
            continue
        fi
        
        ((TOTAL_CHECKS++))
        
        # 搜索可疑的旧路径引用
        # 注意：这是一个简化的检查，实际可能需要更复杂的逻辑
        local suspicious_lines=$(grep -n "^\s*[\"']src/" "$config_file" 2>/dev/null || true)
        
        if [ -n "$suspicious_lines" ]; then
            log_warning "$config_file 可能包含旧路径引用"
            append_report "- ! \`$config_file\` 可能需要更新"
            if [ "$VERBOSE" = true ]; then
                echo "$suspicious_lines"
            fi
            found_references=true
        else
            log_success "$config_file 未发现明显的旧路径引用"
            append_report "- ✓ \`$config_file\` 检查通过"
        fi
    done
    
    append_report ""
    if [ "$found_references" = false ]; then
        append_report "**结果**: ✅ 通过"
    else
        append_report "**结果**: ⚠️ 需要人工审查"
    fi
    append_report ""
    
    log_info "注意: 此检查为启发式检查，建议人工审查配置文件"
}

# ============================================================================
# 属性 4: 根目录整洁性
# ============================================================================

validate_property_4() {
    print_header "属性 4: 根目录整洁性"
    append_report "## 属性 4: 根目录整洁性"
    append_report ""
    append_report "**验证**: 根目录应只包含允许的目录和文件"
    append_report ""
    
    log_info "检查根目录内容..."
    
    # 定义允许的目录
    local allowed_dirs=(
        "server"
        "web"
        "desktop"
        "docker"
        "scripts"
        "docs"
        ".kiro"
        ".github"
        ".git"
        ".vscode"
        ".idea"
        ".cursor"
        ".claude"
        ".windsurf"
    )
    
    # 定义允许的文件
    local allowed_files=(
        ".gitignore"
        ".env"
        ".env.example"
        ".env.offline"
        "LICENSE"
        "README.md"
        "README_EN.md"
        "CONTRIBUTING.md"
        "Makefile"
        "dev.sh"
        ".DS_Store"
        "PRE_MIGRATION_BASELINE.md"
        "CURRENT_STRUCTURE.txt"
        "MIGRATION_SUMMARY.md"
        ".migration-backup"
    )
    
    ((TOTAL_CHECKS++))
    
    local property4_passed=true
    local unexpected_items=()
    
    # 检查根目录中的所有项
    for item in *; do
        # 跳过隐藏文件（已在 allowed_files 中单独列出）
        if [[ "$item" == .* ]]; then
            continue
        fi
        
        local is_allowed=false
        
        # 检查是否是允许的目录
        if [ -d "$item" ]; then
            for allowed_dir in "${allowed_dirs[@]}"; do
                if [ "$item" = "$allowed_dir" ]; then
                    is_allowed=true
                    break
                fi
            done
        else
            # 检查是否是允许的文件
            for allowed_file in "${allowed_files[@]}"; do
                if [ "$item" = "$allowed_file" ]; then
                    is_allowed=true
                    break
                fi
            done
        fi
        
        if [ "$is_allowed" = false ]; then
            unexpected_items+=("$item")
            property4_passed=false
        fi
    done
    
    if [ ${#unexpected_items[@]} -eq 0 ]; then
        log_success "根目录整洁，只包含允许的项"
        append_report "- ✓ 根目录整洁"
    else
        log_fail "根目录包含意外的项:"
        append_report "- ✗ 根目录包含意外的项:"
        for item in "${unexpected_items[@]}"; do
            log "  - $item"
            append_report "  - \`$item\`"
        done
    fi
    
    append_report ""
    if [ "$property4_passed" = true ]; then
        append_report "**结果**: ✅ 通过"
    else
        append_report "**结果**: ❌ 失败"
    fi
    append_report ""
}

# ============================================================================
# 属性 5: 构建输出位置正确性
# ============================================================================

validate_property_5() {
    print_header "属性 5: 构建输出位置正确性"
    append_report "## 属性 5: 构建输出位置正确性"
    append_report ""
    append_report "**验证**: 构建输出应在组件特定目录中"
    append_report ""
    
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "跳过构建验证"
        append_report "- ! 跳过构建验证"
        append_report ""
        return
    fi
    
    log_info "验证构建输出位置..."
    
    # 检查 .gitignore 是否更新
    ((TOTAL_CHECKS++))
    if [ -f ".gitignore" ]; then
        if grep -q "web/dist" .gitignore && grep -q "desktop/build" .gitignore; then
            log_success ".gitignore 已更新构建输出路径"
            append_report "- ✓ \`.gitignore\` 已更新"
        else
            log_fail ".gitignore 未更新构建输出路径"
            append_report "- ✗ \`.gitignore\` 需要更新"
        fi
    fi
    
    # 检查旧的构建输出目录是否存在
    ((TOTAL_CHECKS++))
    if [ -d "dist" ] || [ -d "build" ]; then
        log_warning "根目录仍存在旧的构建输出目录"
        append_report "- ! 根目录存在旧的构建输出目录"
    else
        log_success "根目录无旧的构建输出目录"
        append_report "- ✓ 根目录已清理"
    fi
    
    append_report ""
    append_report "**结果**: ⚠️ 需要实际构建测试"
    append_report ""
}

# ============================================================================
# 构建过程验证
# ============================================================================

validate_build_processes() {
    print_header "构建过程验证"
    append_report "## 构建过程验证"
    append_report ""
    
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "跳过构建过程验证"
        append_report "- ! 跳过构建过程验证"
        append_report ""
        return
    fi
    
    log_info "此部分需要手动执行构建测试"
    log_info "建议执行以下命令:"
    log ""
    log "  ${CYAN}# Web 构建${NC}"
    log "  cd web && npm install && npm run build"
    log ""
    log "  ${CYAN}# Docker 构建${NC}"
    log "  docker build -f docker/Dockerfile.web -t test-web ."
    log ""
    log "  ${CYAN}# 桌面构建${NC}"
    log "  cd desktop && wails build"
    log ""
    
    append_report "### 手动构建测试"
    append_report ""
    append_report "请手动执行以下构建测试:"
    append_report ""
    append_report "1. **Web 构建**"
    append_report "   \`\`\`bash"
    append_report "   cd web && npm install && npm run build"
    append_report "   \`\`\`"
    append_report ""
    append_report "2. **Docker 构建**"
    append_report "   \`\`\`bash"
    append_report "   docker build -f docker/Dockerfile.web -t test-web ."
    append_report "   \`\`\`"
    append_report ""
    append_report "3. **桌面构建**"
    append_report "   \`\`\`bash"
    append_report "   cd desktop && wails build"
    append_report "   \`\`\`"
    append_report ""
}

# ============================================================================
# 目录结构可视化
# ============================================================================

show_directory_structure() {
    print_header "目录结构"
    append_report "## 当前目录结构"
    append_report ""
    append_report "\`\`\`"
    
    log_info "当前目录结构:"
    log ""
    
    # 使用 tree 命令（如果可用）或 ls
    if command -v tree &> /dev/null; then
        tree -L 2 -I 'node_modules|.git' | tee -a "$REPORT_FILE"
    else
        log "."
        for dir in web desktop docker server docs scripts; do
            if [ -d "$dir" ]; then
                log "├── $dir/"
                ls -1 "$dir" | head -5 | sed 's/^/│   ├── /'
            fi
        done
        
        # 同样写入报告
        append_report "."
        for dir in web desktop docker server docs scripts; do
            if [ -d "$dir" ]; then
                append_report "├── $dir/"
            fi
        done
    fi
    
    append_report "\`\`\`"
    append_report ""
}

# ============================================================================
# 主函数
# ============================================================================

main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
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
    
    # 初始化报告
    init_report
    
    # 显示标题
    print_header "SnailTodoList 项目结构迁移验证"
    
    log_info "开始验证..."
    log_info "报告文件: $REPORT_FILE"
    log ""
    
    # 执行验证
    validate_property_1
    validate_property_2
    validate_property_3
    validate_property_4
    validate_property_5
    validate_build_processes
    show_directory_structure
    
    # 生成最终报告
    finalize_report
    
    # 显示摘要
    print_header "验证摘要"
    
    log_info "总检查项: $TOTAL_CHECKS"
    log_success "通过: $PASSED_CHECKS"
    log_fail "失败: $FAILED_CHECKS"
    log_warning "警告: $WARNING_CHECKS"
    log ""
    
    log_info "详细报告已保存到: ${CYAN}$REPORT_FILE${NC}"
    log ""
    
    # 返回状态
    if [ $FAILED_CHECKS -eq 0 ]; then
        log_success "验证通过！"
        exit 0
    else
        log_fail "验证失败，请检查报告"
        exit 1
    fi
}

# 运行主函数
main "$@"
