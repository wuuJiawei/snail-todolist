# 开发环境搭建指南

## 桌面客户端（Wails）开发与打包

### 前置要求
- **Go 1.21+**: [下载安装](https://go.dev/dl/)
- **Node.js 18+**: [下载安装](https://nodejs.org/)
- **Wails CLI**: 
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```
- **系统 WebView**:
  - Windows: WebView2 Runtime（Windows 10/11 通常已预装）
  - macOS: 系统自带 WebKit
  - Linux: webkit2gtk
    ```bash
    # Debian/Ubuntu
    sudo apt install webkit2gtk-4.0-dev
    
    # Fedora
    sudo dnf install webkit2gtk3-devel
    
    # Arch
    sudo pacman -S webkit2gtk
    ```

### 本地开发

1. 克隆项目并安装依赖：
```bash
git clone https://github.com/wuuJiawei/snail-todolist.git
cd snail-todolist
npm install
```

2. 启动桌面应用开发模式：
```bash
npm run wails:dev
```

这将启动：
- Vite 开发服务器（http://localhost:8080）
- Wails 桌面窗口（自动连接到 Vite）
- 前端热重载功能

### 生产打包

构建当前平台的可执行文件：

```bash
npm run wails:build
```

构建特定平台：

```bash
npm run build:macos    # macOS Universal Binary
npm run build:windows  # Windows amd64
npm run build:linux    # Linux amd64
```

产物目录：`build/bin/`

### 平台特定注意事项

#### macOS
- **未签名应用**：首次运行需要解除隔离
  ```bash
  xattr -cr "/Applications/SnailTodoList.app"
  ```
- 或在"系统设置 → 隐私与安全性"中允许
- **代码签名**（可选）：
  ```bash
  wails build -platform darwin/universal -codesign "Developer ID Application: Your Name"
  ```

#### Windows
- 可能提示"Windows 已保护你的电脑"
- 点击"更多信息" → "仍要运行"
- **代码签名**（推荐）：使用 SignTool 和证书
- **WebView2**：如果用户系统缺少，可以在安装包中包含 WebView2 Runtime

#### Linux
- 确保已安装 webkit2gtk 开发包
- 某些发行版可能需要额外的依赖：
  ```bash
  sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev
  ```

### 开发工具

#### 调试
- 开发模式下可以打开 DevTools（右键 → 检查元素）
- 查看控制台日志和网络请求
- 使用 React DevTools 浏览器扩展

#### 热重载
- 修改前端代码会自动刷新应用窗口
- 修改 Go 代码需要重启 `wails:dev`

### CI/CD

可配置 GitHub Actions 自动构建多平台版本：

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@latest
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run wails:build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.platform }}-build
          path: build/bin/
```

---

# Supabase 数据库设置指南

本项目使用 Supabase 作为后端数据库。以下是完整的设置步骤。

## 1. 创建 Supabase 项目

1. 访问 [Supabase 控制台](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 选择组织并填写项目信息：
   - Name: 你的项目名称
   - Database Password: 设置一个强密码
   - Region: 选择离用户最近的区域
4. 等待项目创建完成（通常需要几分钟）

## 2. 获取项目配置

### 获取 API 配置
1. 在项目控制台中，进入 **Settings > API**
2. 复制以下信息：
   - **Project URL**: 形如 `https://your-project.supabase.co`
   - **anon public key**: 用于客户端连接的公开密钥

### 获取项目 ID
1. 进入 **Settings > General**
2. 复制 **Project ID**

## 3. 配置环境变量

1. 在项目根目录创建 `.env` 文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的配置：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. 数据库设置

本项目使用 Supabase 作为后端，数据库会在你创建 Supabase 项目时自动设置基础表结构。

### 必要的数据库表

项目需要以下核心表（Supabase Auth 和基础功能会自动创建）：
- **tasks** - 任务表
- **projects** - 项目表  
- **project_shares** - 项目分享表（可选）

如果你遇到表不存在的错误，请在 Supabase SQL Editor 中创建必要的表结构。

## 5. 验证配置

运行项目并测试基本功能：

```bash
npm run dev
```

测试以下功能：
- 用户注册/登录
- 创建任务
- 项目管理
- 任务拖拽排序

## 故障排除

### 常见问题

1. **Connection Error**: 检查 URL 和密钥是否正确
2. **Permission Denied**: 确认 RLS 策略已正确设置
3. **Migration Failed**: 按顺序手动执行迁移文件

### 环境变量未加载

确保：
- `.env` 文件在项目根目录
- 变量名以 `VITE_` 开头
- 重启开发服务器

## 生产环境部署

### Vercel 部署

1. 在 Vercel 控制台中设置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. 确保生产数据库的 RLS 策略正确配置

### 其他平台

任何支持 Node.js 的平台都可以部署，只需正确设置环境变量即可。

---

# 离线模式开发

离线模式使用 IndexedDB 存储数据，无需任何后端配置。

## 快速开始

1. 启动开发服务器：
```bash
npm run dev
```

2. 打开 http://localhost:5173

3. 在登录页点击"离线模式"按钮

## 数据存储

离线模式的数据存储在浏览器的 IndexedDB 中：
- 数据库名称：`snail-todolist-offline`
- 存储对象：tasks, projects, tags, checkin_records

## 调试

使用浏览器的开发者工具查看 IndexedDB：
- Chrome/Edge: DevTools → Application → Storage → IndexedDB
- Firefox: DevTools → Storage → IndexedDB

## 数据迁移

在线/离线模式的数据完全隔离，通过导入导出功能迁移：
1. 在当前模式下导出数据（设置 → 数据管理 → 导出）
2. 切换到目标模式
3. 导入之前导出的数据包
