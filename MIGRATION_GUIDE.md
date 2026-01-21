# 项目结构迁移指南

## 概述

SnailTodoList 项目已从扁平结构重组为模块化结构。本指南帮助开发者更新本地环境以适应新结构。

## 新的目录结构

```
.
├── web/              # Web 前端 (React + Vite)
│   ├── src/         # 源代码
│   ├── public/      # 静态资源
│   ├── dist/        # 构建输出
│   └── [配置文件]   # package.json, vite.config.ts 等
├── desktop/          # 桌面客户端 (Wails)
│   ├── app.go       # Wails 应用
│   ├── main.go      # 入口文件
│   ├── wails.json   # Wails 配置
│   └── build/       # 构建输出
├── docker/           # Docker 配置
│   ├── Dockerfile   # All-in-one 镜像
│   ├── Dockerfile.web  # Web-only 镜像
│   ├── docker-compose.yml
│   └── nginx.conf
├── server/           # 后端服务 (保持不变)
├── docs/             # 文档 (保持不变)
├── scripts/          # 构建脚本 (保持不变)
└── [核心配置]        # README, LICENSE, Makefile 等
```

## 更新本地仓库

### 1. 拉取最新代码

```bash
git fetch origin
git pull origin main
```

### 2. 清理旧的构建输出

```bash
# 删除旧的构建目录（如果存在）
rm -rf dist/ build/

# 清理 node_modules（可选，但推荐）
rm -rf node_modules/
```

### 3. 重新安装依赖

```bash
# Web 前端依赖
cd web
npm install
cd ..

# 桌面客户端依赖（如果使用）
cd desktop
go mod download
cd ..
```

## 更新开发工作流

### Web 开发

**之前：**
```bash
npm run dev
npm run build
npm run test
```

**现在：**
```bash
cd web
npm run dev
npm run build
npm run test

# 或使用 Makefile
make dev
make build
make test
```

### 桌面开发

**之前：**
```bash
wails dev
wails build
```

**现在：**
```bash
cd desktop
wails dev
wails build
```

### Docker 开发

**之前：**
```bash
docker build -f Dockerfile.web -t snail-web .
docker-compose up -d
```

**现在：**
```bash
docker build -f docker/Dockerfile.web -t snail-web .
docker-compose -f docker/docker-compose.yml up -d

# 或使用 Makefile
make compose-up
make compose-down
```

## 更新 IDE 配置

### VS Code

如果你的 `launch.json` 或 `tasks.json` 中有路径引用，需要更新：

**之前：**
```json
{
  "cwd": "${workspaceFolder}"
}
```

**现在：**
```json
{
  "cwd": "${workspaceFolder}/web"
}
```

### WebStorm / IntelliJ IDEA

1. 打开 Settings → Languages & Frameworks → JavaScript
2. 更新 Node.js 和 npm 的工作目录为 `web/`

## 常见问题

### Q: 为什么要进行这次重组？

A: 为了：
- 清晰的关注点分离
- 更好的模块化
- 简化构建流程
- 提高可维护性

### Q: 我的本地更改会丢失吗？

A: 不会。Git 使用 `git mv` 保留了所有文件历史。你的提交历史完整保留。

### Q: 构建失败怎么办？

A: 
1. 确保在正确的目录运行命令（web/ 或 desktop/）
2. 清理并重新安装依赖
3. 检查 .env 文件是否正确配置
4. 查看错误日志获取详细信息

### Q: Docker 构建失败？

A: 确保使用新的路径：
```bash
docker build -f docker/Dockerfile.web .
docker-compose -f docker/docker-compose.yml up
```

### Q: 如何回滚到旧结构？

A: 使用备份分支：
```bash
git branch | grep backup-before-restructure
git reset --hard <backup-branch-name>
```

## 环境变量

环境变量文件位置：
- **根目录**: `.env` (全局配置)
- **Web**: `web/.env.example` (Web 特定配置示例)
- **Desktop**: `desktop/.env.example` (桌面特定配置示例)

## 需要帮助？

如果遇到问题：
1. 查看 [MIGRATION_SCRIPTS_README.md](./MIGRATION_SCRIPTS_README.md)
2. 查看 [BUILD_AUTOMATION_UPDATES.md](./BUILD_AUTOMATION_UPDATES.md)
3. 查看 [DOCKER_CONFIG_UPDATES.md](./DOCKER_CONFIG_UPDATES.md)
4. 提交 Issue: https://github.com/wuuJiawei/snail-todolist/issues

## 迁移完成检查清单

- [ ] 拉取最新代码
- [ ] 清理旧的构建输出
- [ ] 重新安装依赖
- [ ] 更新 IDE 配置
- [ ] 测试 Web 开发流程
- [ ] 测试 Docker 构建（如果使用）
- [ ] 测试桌面构建（如果使用）
- [ ] 更新个人脚本和工具

---

**迁移日期**: 2024
**相关文档**: 
- [requirements.md](./.kiro/specs/project-restructure/requirements.md)
- [design.md](./.kiro/specs/project-restructure/design.md)
- [tasks.md](./.kiro/specs/project-restructure/tasks.md)
