# Snail TodoList

<img align="right" height="96px" src="./public/logo.png" alt="Snail TodoList" />

一个开源、可自部署的任务管理应用。你的任务，你的数据，你来掌控 — 无追踪、无广告、无订阅费用。

[![主页](https://img.shields.io/badge/🏠-项目主页-blue?style=flat-square)](https://github.com/wuuJiawei/snail-todolist)
[![在线演示](https://img.shields.io/badge/✨-在线体验-orange?style=flat-square)](https://snail-todolist.vercel.app)
[![文档](https://img.shields.io/badge/📚-使用文档-green?style=flat-square)](./docs)
[![Docker](https://img.shields.io/docker/pulls/wujiawei0926/snail-todolist?style=flat-square&logo=docker)](https://hub.docker.com/r/wujiawei0926/snail-todolist)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

<img src="./docs/screenshots/snailtodo-screenshot-1.png" alt="Snail TodoList 演示截图" width="100%" />

## 概述

Snail TodoList 是一个注重隐私、可自托管的任务管理工具，适用于个人待办、团队协作和项目管理。采用 React + TypeScript 前端和 Go 后端构建，提供流畅的使用体验，同时保证数据完全由你掌控。

**为什么选择 Snail TodoList 而不是云服务？**

| 特性           | Snail TodoList              | 云服务                    |
| -------------- | --------------------------- | ------------------------- |
| **隐私保护**   | ✅ 自托管，零遥测           | ❌ 数据存储在第三方服务器 |
| **成本**       | ✅ 永久免费，MIT 许可       | ❌ 订阅费用               |
| **性能**       | ✅ 本地运行，即时响应       | ⚠️ 依赖网络连接           |
| **数据所有权** | ✅ 完全控制与导出           | ❌ 供应商锁定             |
| **离线使用**   | ✅ 完整的离线模式           | ❌ 需要网络连接           |
| **定制化**     | ✅ 开源，可自由修改         | ❌ 封闭生态               |

## 核心特性

### 🔒 隐私优先架构
- 自托管在你的基础设施上，零遥测
- 完整的数据所有权和导出能力
- 无追踪、无广告、无供应商锁定

### 📝 Markdown 原生支持
- 完整的 Markdown 编辑体验
- 支持代码高亮、图片上传
- 纯文本存储，数据随时可迁移

### 💾 双模式存储
- **在线模式**：使用自建后端，支持多设备同步
- **离线模式**：使用 IndexedDB 本地存储，无需网络

### ⚡ 极速体验
- React 18 + TypeScript 构建的现代化前端
- Go 语言后端，高性能低资源占用
- 针对大量任务优化的性能表现

### 🐳 简单部署
- 一行命令 Docker 安装
- 支持 PostgreSQL 数据库
- 提供桌面客户端（Wails）

### 🎯 功能丰富
- 项目分组与任务管理
- 标签系统与智能过滤
- 番茄钟计时器
- 打卡日历与统计
- 任务活动记录
- 数据导入导出

### 🎨 精美界面
- 简洁现代的设计风格
- 深色模式支持
- 响应式布局，适配各种屏幕尺寸

## 快速开始

### Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/wuuJiawei/snail-todolist.git
cd snail-todolist

# 一键部署
./scripts/quick-deploy.sh
```

访问 `http://localhost` 即可开始使用！

### 离线模式（无需后端）

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 `http://localhost:5173`，点击"离线模式"按钮即可使用。

### 桌面客户端

下载适用于你的操作系统的客户端：

- **macOS**: [下载 .dmg](https://github.com/wuuJiawei/snail-todolist/releases)
- **Windows**: [下载 .exe](https://github.com/wuuJiawei/snail-todolist/releases)
- **Linux**: [下载 .AppImage](https://github.com/wuuJiawei/snail-todolist/releases)

### 其他部署方式

- **Docker Compose** - 适合生产环境部署
- **Vercel** - 一键部署到 Vercel
- **静态托管** - 部署到任何静态托管服务
- **从源码构建** - 用于开发和定制

查看我们的[部署文档](./docs/DOCKER_DEPLOY_SIMPLE.md)了解详细说明。

## 文档

- 📖 [快速开始指南](./docs/DOCKER_DEPLOY_SIMPLE.md)
- 🐳 [Docker 部署文档](./docs/DOCKER_DEPLOYMENT.md)
- 🖥️ [桌面客户端指南](./docs/wails-guide.md)
- 🔧 [开发环境搭建](./docs/SETUP.md)
- 📦 [数据导入导出](./docs/DOCKER_DEPLOY_SIMPLE.md#数据备份)

## 技术栈

**前端**
- React 18 + TypeScript
- Vite 构建工具
- shadcn/ui + Radix UI 组件库
- TailwindCSS 样式
- Zustand 状态管理
- TanStack Query 数据获取

**后端**
- Go 语言
- PostgreSQL 数据库
- RESTful API

**桌面客户端**
- Wails (Go + WebView)

## 贡献

我们欢迎各种形式的贡献！无论是修复 bug、添加功能、改进文档还是帮助翻译 — 每一份贡献都很重要。

**贡献方式：**

- 🐛 [报告 Bug](https://github.com/wuuJiawei/snail-todolist/issues/new)
- 💡 [提出功能建议](https://github.com/wuuJiawei/snail-todolist/issues/new)
- 🔧 [提交 Pull Request](https://github.com/wuuJiawei/snail-todolist/pulls)
- 📖 [改进文档](https://github.com/wuuJiawei/snail-todolist/tree/main/docs)
- 🌍 [帮助翻译](./src/locales)

查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解更多详情。

## 路线图

- [ ] 📱 移动端原生应用（iOS/Android）
- [ ] 👥 团队协作功能
- [ ] 📅 日历视图
- [ ] 📋 子任务支持
- [ ] 🔌 更多集成（Telegram、Slack 等）
- [ ] 📖 API 文档和 SDK
- [ ] 🌐 更多语言支持
- [ ] 🔔 通知提醒功能

查看 [Issues](https://github.com/wuuJiawei/snail-todolist/issues) 了解更多计划中的功能。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=wuuJiawei/snail-todolist&type=Date)](https://star-history.com/#wuuJiawei/snail-todolist&Date)

## 许可证

Snail TodoList 是根据 [MIT 许可证](LICENSE) 授权的开源软件。

## 隐私政策

Snail TodoList 以隐私为核心原则构建。作为自托管应用，所有数据都保存在你的基础设施上。没有遥测、没有追踪、没有数据收集。

**我们的承诺：**
- ✅ 不收集任何个人信息
- ✅ 不使用任何追踪或分析工具
- ✅ 不向第三方共享数据
- ✅ 完全开源，代码可审计

---

**[项目主页](https://github.com/wuuJiawei/snail-todolist)** • **[在线演示](https://snail-todolist.vercel.app)** • **[使用文档](./docs)** • **[问题反馈](https://github.com/wuuJiawei/snail-todolist/issues)**

---

<p align="center">
  <sub>用 ❤️ 构建 | Made with ❤️</sub>
</p>
