# 项目结构指南

这是一个使用 Vite、TypeScript、Tailwind CSS 和 Supabase 构建的前端项目。

- **源代码**: 主要的应用逻辑位于 [`src/`](mdc:src) 目录下。
- **入口点**: HTML 入口文件是 [`index.html`](mdc:index.html)。
- **构建配置**:
    - Vite 配置在 [`vite.config.ts`](mdc:vite.config.ts)。
    - TypeScript 配置在 [`tsconfig.json`](mdc:tsconfig.json)。
    - Tailwind CSS 配置在 [`tailwind.config.ts`](mdc:tailwind.config.ts)。
- **依赖管理**: 项目依赖和脚本定义在 [`package.json`](mdc:package.json)。
- **数据库**: Supabase 相关文件（如迁移脚本）位于 [`supabase/`](mdc:supabase) 目录。
- **静态资源**: 静态文件放在 [`public/`](mdc:public) 目录下。
