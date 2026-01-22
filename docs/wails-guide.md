# Wails 开发指南

本文档介绍 Snail TodoList 桌面客户端的 Wails 架构和开发指南。

## 项目结构

```
snail-todolist/
├── app.go              # Wails 应用上下文
├── main.go             # Wails 应用入口
├── wails.json          # Wails 配置文件
├── go.mod              # Go 模块依赖
├── dist/               # 前端构建产物（嵌入到应用中）
├── build/              # Wails 构建产物
│   └── bin/            # 可执行文件
└── src/                # React 前端代码（不变）
```

## Wails 架构

### 应用入口（main.go）

```go
package main

import (
    "embed"
    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
)

//go:embed all:dist
var assets embed.FS

func main() {
    app := NewApp()
    
    err := wails.Run(&options.App{
        Title:  "Snail TodoList",
        Width:  1280,
        Height: 800,
        AssetServer: &assetserver.Options{
            Assets: assets,
        },
        OnStartup:  app.startup,
        OnShutdown: app.shutdown,
    })
    
    if err != nil {
        log.Fatal(err)
    }
}
```

### 应用上下文（app.go）

```go
package main

import "context"

type App struct {
    ctx context.Context
}

func NewApp() *App {
    return &App{}
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    // 初始化逻辑
}

func (a *App) shutdown(ctx context.Context) {
    // 清理逻辑
}
```

## 前端集成

### 资源嵌入

Wails 使用 Go 的 `embed` 功能将前端资源嵌入到可执行文件中：

```go
//go:embed all:dist
var assets embed.FS
```

这意味着：
- 前端代码必须先构建到 `dist/` 目录
- 所有静态资源都会打包到可执行文件中
- 无需单独分发前端文件

### 开发模式

开发模式下，Wails 不使用嵌入的资源，而是连接到 Vite 开发服务器：

```json
{
  "frontend:dev:serverUrl": "http://localhost:8080"
}
```

这样可以享受：
- 前端热重载
- 快速迭代
- 完整的开发工具支持

## 配置文件（wails.json）

```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "snail-todolist",
  "outputfilename": "SnailTodoList",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "http://localhost:8080",
  "author": {
    "name": "Snail Team",
    "email": "team@snail-todolist.com"
  },
  "info": {
    "companyName": "Snail",
    "productName": "Snail TodoList",
    "productVersion": "1.0.6",
    "copyright": "Copyright © 2024 Snail Team",
    "comments": "一个现代化、功能丰富的待办事项管理应用"
  }
}
```

### 配置说明

- `name`: 项目名称（用于内部标识）
- `outputfilename`: 生成的可执行文件名
- `frontend:install`: 安装前端依赖的命令
- `frontend:build`: 构建前端的命令
- `frontend:dev:watcher`: 启动前端开发服务器的命令
- `frontend:dev:serverUrl`: 前端开发服务器的 URL
- `info`: 应用元数据（显示在关于对话框等）

## 开发工作流

### 1. 启动开发模式

```bash
npm run wails:dev
```

这会：
1. 启动 Vite 开发服务器（http://localhost:8080）
2. 启动 Wails 应用窗口
3. 应用窗口加载 Vite 服务器的内容
4. 前端代码修改会自动热重载

### 2. 调试

#### 前端调试
- 右键点击应用窗口 → "检查元素"
- 使用 Chrome DevTools 调试前端代码
- 查看控制台日志、网络请求等

#### Go 代码调试
- 使用 `log.Println()` 输出日志
- 或使用 Delve 调试器：
  ```bash
  dlv debug
  ```

### 3. 构建生产版本

```bash
# 构建当前平台
npm run wails:build

# 构建特定平台
npm run build:macos
npm run build:windows
npm run build:linux
```

构建过程：
1. 运行 `npm run build` 构建前端
2. 将 `dist/` 目录嵌入到 Go 二进制文件
3. 编译 Go 代码
4. 生成可执行文件到 `build/bin/`

## 常见问题

### Q: 如何添加 Go 后端功能？

A: 在 `app.go` 中添加方法，然后在 `main.go` 中绑定：

```go
// app.go
func (a *App) Greet(name string) string {
    return fmt.Sprintf("Hello %s!", name)
}

// main.go
err := wails.Run(&options.App{
    // ...
    Bind: []interface{}{
        app,
    },
})
```

前端调用：
```typescript
import { Greet } from '../wailsjs/go/main/App'

const greeting = await Greet("World")
```

### Q: 如何访问系统功能？

A: 使用 Wails 的运行时 API：

```typescript
import { BrowserOpenURL } from '@wailsapp/runtime'

// 在系统浏览器中打开 URL
BrowserOpenURL("https://example.com")
```

### Q: 如何自定义窗口？

A: 在 `main.go` 中配置窗口选项：

```go
err := wails.Run(&options.App{
    Title:     "Snail TodoList",
    Width:     1280,
    Height:    800,
    MinWidth:  800,
    MinHeight: 600,
    Frameless: false,
    // ...
})
```

### Q: 如何处理应用图标？

A: 将图标文件放在项目根目录：
- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `icon.png` (Linux)

然后在 `wails.json` 中配置：
```json
{
  "icon": "icon.png"
}
```

### Q: 构建失败怎么办？

A: 常见原因和解决方案：

1. **前端构建失败**
   - 检查 `npm run build` 是否成功
   - 确保 `dist/` 目录存在

2. **Go 编译失败**
   - 运行 `go mod tidy` 清理依赖
   - 检查 Go 版本是否 >= 1.21

3. **WebView 缺失**
   - Windows: 安装 WebView2 Runtime
   - Linux: 安装 webkit2gtk

### Q: 如何减小应用体积？

A: 几个优化建议：

1. **前端优化**
   - 使用代码分割（dynamic import）
   - 移除未使用的依赖
   - 压缩图片和资源

2. **Go 优化**
   - 使用 `-ldflags="-s -w"` 去除调试信息
   - 使用 UPX 压缩可执行文件（可选）

3. **Wails 优化**
   - 使用 `-clean` 标志清理构建缓存
   - 考虑使用 `-webview2` 标志（Windows）

## 最佳实践

### 1. 前端代码复用

Wails 应用的前端代码与 Web 版本完全相同，这意味着：
- 保持前端代码的平台无关性
- 不要在前端代码中直接调用 Wails API
- 使用环境变量区分 Web 和桌面环境

### 2. 错误处理

在 Go 代码中妥善处理错误：

```go
func (a *App) DoSomething() error {
    if err := someOperation(); err != nil {
        log.Printf("Error: %v", err)
        return fmt.Errorf("operation failed: %w", err)
    }
    return nil
}
```

### 3. 性能优化

- 避免在 Go 和 JavaScript 之间频繁通信
- 批量处理数据而不是逐个传递
- 使用 Web Workers 处理耗时的前端任务

### 4. 安全性

- 不要在前端代码中硬编码敏感信息
- 使用环境变量或配置文件管理密钥
- 验证所有来自前端的输入

## 参考资源

- [Wails 官方文档](https://wails.io/docs/introduction)
- [Wails GitHub](https://github.com/wailsapp/wails)
- [Wails 示例项目](https://github.com/wailsapp/wails/tree/master/v2/examples)
- [Go 官方文档](https://go.dev/doc/)
