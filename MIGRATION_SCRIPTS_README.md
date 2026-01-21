# 项目结构迁移脚本说明

本文档说明项目结构迁移的三个核心脚本的使用方法。

## 概述

为了将 SnailTodoList 从扁平结构重组为模块化结构，我们创建了三个 Bash 脚本：

1. **migrate-structure.sh** - 主迁移脚本
2. **rollback-migration.sh** - 回滚脚本
3. **validate-migration.sh** - 验证脚本

## 脚本详情

### 1. migrate-structure.sh - 主迁移脚本

**功能**：
- 执行完整的项目结构迁移
- 使用 `git mv` 保留文件历史
- 创建备份分支和配置文件备份
- 自动验证迁移结果

**使用方法**：

```bash
# 完整迁移（推荐先用 --dry-run 测试）
./scripts/migrate-structure.sh

# 模拟运行（不实际执行，查看将要做什么）
./scripts/migrate-structure.sh --dry-run

# 跳过 Git 状态检查（如果有未提交的更改）
./scripts/migrate-structure.sh --skip-validation

# 查看帮助
./scripts/migrate-structure.sh --help
```

**执行步骤**：
1. ✅ 前置条件检查（Git 状态、依赖等）
2. 📦 创建备份分支和配置文件备份
3. 📁 创建新目录结构（web/, desktop/, docker/）
4. 🔄 迁移 Web 前端文件到 web/
5. 🔄 迁移桌面客户端文件到 desktop/
6. 🔄 迁移 Docker 文件到 docker/
7. ⚙️ 提示配置文件更新（需手动完成）
8. ✅ 验证迁移结果
9. 📊 生成迁移报告

**输出**：
- 日志文件：`migration-YYYYMMDD-HHMMSS.log`
- 备份分支：`backup-before-restructure-YYYYMMDD-HHMMSS`
- 备份目录：`.migration-backup/`

**注意事项**：
- ⚠️ 脚本只执行文件移动，配置文件更新需要手动完成（参考 tasks.md 任务 8-11）
- ⚠️ 建议先在测试分支上运行
- ⚠️ 确保 Git 工作区干净（或使用 --skip-validation）

---

### 2. rollback-migration.sh - 回滚脚本

**功能**：
- 撤销项目结构迁移
- 将文件恢复到原始位置
- 从备份恢复配置文件
- 提供 Git 重置选项

**使用方法**：

```bash
# 完整回滚
./scripts/rollback-migration.sh

# 模拟运行（查看将要做什么）
./scripts/rollback-migration.sh --dry-run

# 查看帮助
./scripts/rollback-migration.sh --help
```

**执行步骤**：
1. ✅ 前置条件检查
2. ⚠️ 确认回滚操作
3. 🔄 回滚 Web 前端文件（web/ → 根目录）
4. 🔄 回滚桌面客户端文件（desktop/ → 根目录）
5. 🔄 回滚 Docker 文件（docker/ → 根目录）
6. 📦 从备份恢复配置文件
7. ✅ 验证回滚结果
8. 🔧 提供 Git 重置选项

**输出**：
- 日志文件：`rollback-YYYYMMDD-HHMMSS.log`

**注意事项**：
- ⚠️ 此操作不可逆（除非再次运行迁移脚本）
- ⚠️ 需要输入 "yes" 确认
- ⚠️ 如果配置文件已修改，可能需要手动调整

---

### 3. validate-migration.sh - 验证脚本

**功能**：
- 验证迁移的正确性
- 实现基于属性的验证检查
- 生成详细的验证报告
- 检查 Git 历史保留

**使用方法**：

```bash
# 完整验证
./scripts/validate-migration.sh

# 显示详细输出
./scripts/validate-migration.sh --verbose

# 跳过构建验证（更快）
./scripts/validate-migration.sh --skip-build

# 查看帮助
./scripts/validate-migration.sh --help
```

**验证内容**：

#### 属性 1: 文件重定位完整性
验证所有计划移动的文件存在于新位置，且不存在于旧位置。

#### 属性 2: Git 历史保留
验证 Git 将文件移动跟踪为重命名，而非删除+添加。

#### 属性 3: 路径引用一致性
搜索配置文件中的旧路径引用，确保已更新。

#### 属性 4: 根目录整洁性
验证根目录只包含允许的目录和文件。

#### 属性 5: 构建输出位置正确性
验证 .gitignore 已更新，旧的构建输出目录已清理。

**输出**：
- Markdown 报告：`validation-report-YYYYMMDD-HHMMSS.md`
- 控制台彩色输出

**退出码**：
- `0` - 验证通过
- `1` - 验证失败

---

## 推荐工作流程

### 首次迁移

```bash
# 1. 确保 Git 工作区干净
git status

# 2. 模拟运行，查看将要执行的操作
./scripts/migrate-structure.sh --dry-run

# 3. 执行实际迁移
./scripts/migrate-structure.sh

# 4. 验证迁移结果
./scripts/validate-migration.sh

# 5. 手动更新配置文件（参考 tasks.md 任务 8-11）
# - web/vite.config.ts
# - desktop/wails.json
# - docker/Dockerfile*
# - docker/docker-compose.yml
# - Makefile
# - .gitignore
# - scripts/*.sh
# - .github/workflows/*.yml

# 6. 再次验证
./scripts/validate-migration.sh

# 7. 测试构建流程
cd web && npm install && npm run build
docker build -f docker/Dockerfile.web -t test-web .

# 8. 提交更改
git add -A
git commit -m "refactor: restructure project to modular architecture" \
           -m "Move web frontend to web/ directory" \
           -m "Move desktop client to desktop/ directory" \
           -m "Move Docker configs to docker/ directory" \
           -m "Update all configuration files and scripts" \
           -m "Committed via Cursor (https://cursor.com)"
```

### 如果需要回滚

```bash
# 1. 模拟回滚
./scripts/rollback-migration.sh --dry-run

# 2. 执行回滚
./scripts/rollback-migration.sh

# 3. 验证回滚结果
./scripts/validate-migration.sh

# 4. 或者使用 Git 重置到备份分支
git branch | grep backup-before-restructure
git reset --hard <backup-branch-name>
```

---

## 脚本特性

### 安全特性

- ✅ **Git 历史保留**：使用 `git mv` 而非普通 `mv`
- ✅ **自动备份**：创建备份分支和配置文件备份
- ✅ **前置检查**：验证 Git 状态和依赖
- ✅ **模拟运行**：支持 `--dry-run` 模式
- ✅ **详细日志**：所有操作记录到日志文件
- ✅ **错误处理**：遇到错误时提供回滚建议

### 用户体验

- 🎨 **彩色输出**：使用颜色区分不同类型的消息
- 📊 **进度显示**：清晰的步骤标题和进度信息
- 📝 **详细报告**：生成 Markdown 格式的验证报告
- ⚠️ **交互确认**：关键操作需要用户确认
- 📖 **帮助文档**：每个脚本都有 `--help` 选项

### 兼容性

- 🍎 **macOS 兼容**：处理 macOS 的 `sed` 差异
- 🐧 **Linux 兼容**：支持标准 Linux 命令
- 🔧 **依赖最小**：只需要 bash、git 和基本 Unix 工具

---

## 故障排除

### 问题：Git 工作区不干净

**错误信息**：
```
[ERROR] Git 工作区不干净，请先提交或暂存更改
```

**解决方案**：
```bash
# 选项 1: 提交更改
git add -A
git commit -m "chore: commit before migration"

# 选项 2: 暂存更改
git stash

# 选项 3: 跳过检查（不推荐）
./scripts/migrate-structure.sh --skip-validation
```

### 问题：文件移动失败

**错误信息**：
```
[ERROR] 移动失败: src -> web/src
```

**解决方案**：
1. 检查文件是否存在：`ls -la src`
2. 检查目标目录是否已存在：`ls -la web/src`
3. 查看详细日志：`cat migration-*.log`
4. 如果需要，手动执行：`git mv src web/src`

### 问题：验证失败

**错误信息**：
```
[✗] web/src 不存在
```

**解决方案**：
1. 查看验证报告：`cat validation-report-*.md`
2. 检查迁移日志：`cat migration-*.log`
3. 手动检查文件位置：`ls -la web/`
4. 如果需要，运行回滚脚本

---

## 技术细节

### 文件映射

迁移脚本使用以下文件映射：

**Web 前端**：
- `src/` → `web/src/`
- `public/` → `web/public/`
- `index.html` → `web/index.html`
- `package.json` → `web/package.json`
- `vite.config.ts` → `web/vite.config.ts`
- `tsconfig.json` → `web/tsconfig.json`
- `tailwind.config.ts` → `web/tailwind.config.ts`
- `postcss.config.js` → `web/postcss.config.js`
- `eslint.config.js` → `web/eslint.config.js`

**桌面客户端**：
- `app.go` → `desktop/app.go`
- `main.go` → `desktop/main.go`
- `wails.json` → `desktop/wails.json`
- `go.mod` → `desktop/go.mod`
- `go.sum` → `desktop/go.sum`
- `build/` → `desktop/build/`

**Docker**：
- `Dockerfile` → `docker/Dockerfile`
- `Dockerfile.web` → `docker/Dockerfile.web`
- `docker-compose.yml` → `docker/docker-compose.yml`
- `nginx.conf` → `docker/nginx.conf`
- `.dockerignore` → `docker/.dockerignore`

### 验证属性

验证脚本实现了 5 个核心属性检查，对应设计文档中的正确性属性：

1. **Property 1**: File Relocation Completeness
2. **Property 2**: Git History Preservation
3. **Property 3**: Path Reference Consistency
4. **Property 4**: Root Directory Cleanliness
5. **Property 5**: Build Output Location Correctness

---

## 相关文档

- **需求文档**: `.kiro/specs/project-restructure/requirements.md`
- **设计文档**: `.kiro/specs/project-restructure/design.md`
- **任务列表**: `.kiro/specs/project-restructure/tasks.md`
- **当前结构**: `CURRENT_STRUCTURE.txt`
- **迁移基线**: `PRE_MIGRATION_BASELINE.md`

---

## 贡献者注意事项

如果需要修改这些脚本：

1. 保持向后兼容性
2. 更新帮助文档
3. 测试 macOS 和 Linux 兼容性
4. 更新本 README
5. 遵循项目的 shell 脚本风格（参考现有脚本）

---

**最后更新**: 2025-01-21
**维护者**: Kiro AI Agent
