# 🤝 贡献指南

感谢你对蜗牛待办项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 Bug 修复
- ✨ 新功能开发
- 📝 文档改进
- 🎨 UI/UX 优化
- 🧪 测试覆盖
- 🌍 国际化支持

## 📋 开始之前

### 环境准备

1. **Node.js**: 18+ 版本
2. **包管理器**: npm 或 yarn
3. **编辑器**: 推荐 VS Code 并安装以下扩展：
   - TypeScript and JavaScript Language Features
   - Tailwind CSS IntelliSense
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter

### 项目设置

```bash
# 1. Fork 项目并克隆
git clone https://github.com/your-username/snail-todolist.git
cd snail-todolist

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 Supabase 配置

# 4. 启动开发服务器
npm run dev
```

## 🔄 贡献流程

### 1. 选择任务

- 查看 [Issues](https://github.com/your-username/snail-todolist/issues) 找到感兴趣的问题
- 查看 `good first issue` 标签的问题，适合新手
- 也可以提出新的功能建议

### 2. 创建分支

```bash
# 创建并切换到新分支
git checkout -b feature/your-feature-name
# 或者
git checkout -b fix/issue-number
```

分支命名约定：
- `feature/功能名称` - 新功能
- `fix/问题描述` - Bug 修复
- `docs/文档类型` - 文档更新
- `refactor/重构区域` - 代码重构

### 3. 开发代码

#### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 和 Prettier 配置
- 组件文件使用 PascalCase 命名
- 工具函数使用 camelCase 命名
- 常量使用 UPPER_SNAKE_CASE 命名

#### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型 (type)：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

示例：
```bash
git commit -m "feat(tasks): add drag and drop reordering"
git commit -m "fix(auth): resolve login redirect issue"
git commit -m "docs(readme): update installation guide"
```

### 4. 测试代码

```bash
# 运行类型检查
npm run type-check

# 运行 ESLint 检查
npm run lint

# 构建项目
npm run build
```

### 5. 提交 Pull Request

1. **推送分支**:
```bash
git push origin feature/your-feature-name
```

2. **创建 PR**:
   - 访问 GitHub 仓库页面
   - 点击 "Compare & pull request"
   - 填写 PR 模板

#### PR 标题格式

```
<type>: <简短描述>
```

示例：
- `feat: add task priority levels`
- `fix: resolve mobile responsive issues`

#### PR 描述模板

```markdown
## 📝 变更说明
<!-- 简要描述这次变更的内容 -->

## 🎯 相关 Issue
<!-- 关联的 Issue，使用 "Closes #123" 格式 -->

## 📋 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 样式调整

## 🧪 测试
<!-- 描述如何测试这些变更 -->

## 📸 截图 (如适用)
<!-- 如果是 UI 相关变更，请添加截图 -->

## ✅ 检查列表
- [ ] 代码遵循项目规范
- [ ] 已运行 npm run lint
- [ ] 已运行 npm run build
- [ ] 已测试相关功能
- [ ] 已更新文档（如需要）
```

## 🏗️ 项目架构

### 目录结构

```
src/
├── components/          # UI 组件
│   ├── ui/             # 基础 UI 组件 (shadcn/ui)
│   ├── tasks/          # 任务相关组件
│   ├── settings/       # 设置页面组件
│   └── projects/       # 项目管理组件
├── contexts/           # React Context
├── hooks/              # 自定义 Hooks
├── services/           # API 服务层
├── types/              # TypeScript 类型
├── utils/              # 工具函数
└── integrations/       # 第三方服务集成
```

### 技术栈理解

- **React 18**: 函数组件 + Hooks
- **TypeScript**: 类型安全
- **Tailwind CSS**: 工具类样式
- **shadcn/ui**: 现代 UI 组件库
- **Supabase**: 后端即服务
- **React Router**: 客户端路由

## 📚 开发指南

### 组件开发

1. **使用 shadcn/ui 组件**:
```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
```

2. **类型定义**:
```tsx
interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onComplete }) => {
  // ...
}
```

3. **样式规范**:
```tsx
// 使用 cn 函数合并类名
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className
)} />
```

### 状态管理

使用 React Context + Custom Hooks 模式：

```tsx
// contexts/TaskContext.tsx
export const TaskContext = createContext<TaskContextType | null>(null);

// hooks/useTaskContext.ts
export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within TaskProvider');
  }
  return context;
};
```

### API 调用

```tsx
// services/taskService.ts
export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

## 🐛 问题排查

### 常见问题

1. **环境变量未生效**
   - 确保变量名以 `VITE_` 开头
   - 重启开发服务器

2. **TypeScript 错误**
   - 运行 `npm run type-check` 查看详细错误
   - 检查类型导入路径

3. **样式问题**
   - 检查 Tailwind 配置
   - 确认使用了正确的 shadcn/ui 组件

4. **Supabase 连接问题**
   - 验证环境变量设置
   - 检查网络连接和 RLS 策略

### 调试工具

- **React DevTools**: 组件状态调试
- **Network Tab**: API 调用监控
- **Console**: 错误日志查看

## 🎨 设计规范

### UI 设计原则

1. **一致性**: 使用统一的设计语言
2. **可访问性**: 支持键盘导航和屏幕阅读器
3. **响应式**: 适配所有设备尺寸
4. **性能**: 优化加载速度和交互体验

### 颜色系统

项目使用 Tailwind CSS 默认色板 + shadcn/ui 主题系统。

### 间距系统

遵循 Tailwind 的间距规范：
- 小间距: `space-y-2`, `gap-2`
- 中间距: `space-y-4`, `gap-4`
- 大间距: `space-y-6`, `gap-6`

## 📝 文档贡献

### 文档类型

- **README.md**: 项目介绍和快速开始
- **CONTRIBUTING.md**: 贡献指南（本文档）
- **docs/**: 详细文档目录
- **代码注释**: 复杂逻辑的说明

### 文档规范

- 使用清晰的标题结构
- 添加适当的 emoji 增加可读性
- 提供具体的代码示例
- 保持内容最新

## 🚀 发布流程

### 版本管理

项目使用语义化版本控制 (SemVer)：
- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能性新增
- **PATCH**: 向下兼容的问题修正

### 发布步骤

1. 更新版本号 (`package.json`)
2. 更新 CHANGELOG
3. 创建 Git tag
4. 部署到生产环境

## 💬 交流与反馈

### 获得帮助

- **GitHub Issues**: 报告 Bug 或提出功能建议
- **GitHub Discussions**: 技术讨论和问答
- **Pull Request**: 代码审查和改进建议

### 行为准则

我们期望所有贡献者：

- 🤝 友善和包容
- 🎯 专注于建设性的反馈
- 📚 帮助他人学习和成长
- 🌍 尊重不同的观点和经验

## 🙏 致谢

感谢所有为项目做出贡献的开发者！你们的努力让蜗牛待办变得更好。

---

**开始贡献**: [选择一个 Issue](https://github.com/your-username/snail-todolist/issues) 然后开始你的第一个 PR！

如果你在贡献过程中遇到任何问题，随时通过 Issues 向我们求助。我们很乐意帮助新手贡献者！ 🚀