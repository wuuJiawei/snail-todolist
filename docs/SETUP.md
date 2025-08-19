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