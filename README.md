# 🐌 蜗牛待办 (Snail TodoList)

一个现代化、功能丰富的待办事项管理应用，支持项目分组、任务排序、协作共享等功能。

## ✨ 特性

- 📝 **智能任务管理** - 创建、编辑、完成、放弃任务
- 🗂️ **项目分组** - 灵活的项目管理和任务分类
- 📅 **日期管理** - 支持任务截止日期和时间视图
- 🔄 **拖拽排序** - 直观的任务优先级调整
- 👥 **协作共享** - 项目共享和多人协作
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌙 **深色模式** - 支持明暗主题切换
- 🔍 **高级搜索** - 全文搜索和筛选功能
- 🗃️ **存档管理** - 已完成和已放弃任务的分类管理
- 📊 **数据统计** - 任务完成统计和趋势分析

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- Supabase 账户（用于后端数据库）

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/snail-todolist.git
cd snail-todolist
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Supabase 配置：
```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. **设置数据库**

参考 [数据库设置指南](./docs/SETUP.md) 完成 Supabase 配置

5. **启动开发服务器**
```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

## 🏗️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **状态管理**: React Context + Custom Hooks
- **路由**: React Router
- **后端**: Supabase (PostgreSQL + 实时订阅 + 认证)
- **部署**: Vercel

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   ├── ui/             # 基础 UI 组件
│   ├── tasks/          # 任务相关组件
│   ├── settings/       # 设置页面组件
│   └── projects/       # 项目管理组件
├── contexts/           # React Context 状态管理
├── hooks/              # 自定义 React Hooks
├── services/           # API 服务层
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
├── constants/          # 常量定义
└── integrations/       # 第三方服务集成
```

## 🎯 核心功能

### 任务管理
- ✅ 创建、编辑、完成任务
- 📅 设置截止日期
- 🏷️ 项目分类
- 🗑️ 任务放弃和恢复
- 🔄 拖拽排序

### 项目协作
- 👥 项目共享
- 🔗 邀请链接生成
- 👤 成员权限管理

### 数据统计
- 📊 完成率统计
- 📈 任务趋势分析
- 📋 项目统计概览

### 用户体验
- 🌙 深色/浅色主题
- 📱 响应式设计
- 🔍 实时搜索
- ⚡ 离线支持

## 🚀 部署

### Vercel 部署（推荐）

1. Fork 此项目到你的 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. **重要**: 设置环境变量
   - 进入项目 Settings → Environment Variables
   - 添加 `VITE_SUPABASE_URL` = 你的 Supabase 项目 URL
   - 添加 `VITE_SUPABASE_ANON_KEY` = 你的 Supabase anon key
   - 确保选择 Production, Preview, Development 环境
4. 部署完成

⚠️ **常见错误**: 如果看到 "Missing VITE_SUPABASE_URL" 错误，说明步骤3的环境变量没有正确设置

### 其他平台

支持任何静态网站托管平台：
- Netlify
- GitHub Pages
- CloudFlare Pages
- 自建服务器

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](./CONTRIBUTING.md)

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情

## 🎨 设计理念

蜗牛待办采用"慢工出细活"的设计理念：
- 🐌 **专注当下** - 避免过度规划，专注当前任务
- 🌱 **渐进改进** - 支持任务的迭代优化
- 🎯 **简约高效** - 界面简洁但功能强大
- 🤝 **协作友好** - 支持团队协作和知识共享

## 📞 联系

- 项目主页: [GitHub Repository](https://github.com/your-username/snail-todolist)
- 问题反馈: [Issues](https://github.com/your-username/snail-todolist/issues)
- 功能建议: [Discussions](https://github.com/your-username/snail-todolist/discussions)

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！