# 贡献指南

感谢你考虑为 Snail TodoList 做出贡献！

## 如何贡献

### 报告 Bug

如果你发现了 bug，请[创建一个 Issue](https://github.com/wuuJiawei/snail-todolist/issues/new)，并包含以下信息：

- Bug 的详细描述
- 复现步骤
- 预期行为
- 实际行为
- 截图（如果适用）
- 环境信息（操作系统、浏览器版本等）

### 提出功能建议

我们欢迎新功能建议！请[创建一个 Issue](https://github.com/wuuJiawei/snail-todolist/issues/new)，并说明：

- 功能的详细描述
- 使用场景
- 为什么这个功能有用
- 可能的实现方式（可选）

### 提交代码

1. **Fork 仓库**

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行修改**
   - 遵循项目的代码规范（见 `.kiro/steering/react-guidelines.md`）
   - 编写清晰的提交信息
   - 确保代码通过 lint 检查

4. **测试你的修改**
   ```bash
   npm run lint
   npm run test
   ```

5. **提交 Pull Request**
   - 清晰描述你的修改
   - 关联相关的 Issue
   - 确保 CI 检查通过

## 开发环境设置

### 前端开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 代码检查
npm run lint
```

### 后端开发

```bash
cd server

# 安装依赖
go mod download

# 启动服务器
go run main.go

# 运行测试
go test ./...
```

### 桌面客户端开发

```bash
# 安装 Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 启动开发模式
npm run wails:dev

# 构建
npm run wails:build
```

## 代码规范

### TypeScript/React

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件和 Hooks
- 使用有意义的变量和函数名
- 添加必要的注释（解释"为什么"，而不是"做什么"）

### Go

- 遵循 Go 官方代码规范
- 使用 `gofmt` 格式化代码
- 编写单元测试
- 添加必要的错误处理

### Git 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat(tasks): add drag and drop support

Implement drag and drop functionality for task reordering
using @hello-pangea/dnd library.

Closes #123
```

## 文档贡献

文档同样重要！你可以：

- 修正错别字和语法错误
- 改进现有文档的清晰度
- 添加新的使用示例
- 翻译文档到其他语言

## 翻译

我们欢迎将应用翻译成更多语言！

1. 复制 `src/locales/zh-CN.json` 到新的语言文件
2. 翻译所有文本
3. 在 `src/locales/index.ts` 中注册新语言
4. 提交 Pull Request

## 行为准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性的批评
- 关注对项目最有利的事情

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

## 问题？

如有任何问题，请随时：
- [创建 Issue](https://github.com/wuuJiawei/snail-todolist/issues/new)
- 在 Pull Request 中提问

感谢你的贡献！🎉
