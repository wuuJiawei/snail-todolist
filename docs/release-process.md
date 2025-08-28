# SnailTodoList 发布流程

本文档介绍如何使用 GitHub Actions 自动构建和发布 SnailTodoList 应用。

## 自动发布流程

SnailTodoList 使用 GitHub Actions 自动构建和发布应用。当推送带有 `v` 前缀的标签（例如 `v1.0.0`）时，会自动触发构建和发布流程。

### 发布步骤

1. 确保应用版本号已更新
   
   在 `package.json` 文件中更新版本号：

   ```json
   {
     "name": "snail-todolist",
     "private": false,
     "version": "1.0.0",  // 更新此处的版本号
     ...
   }
   ```

2. 提交更改并创建标签

   ```bash
   # 提交版本更新
   git add package.json
   git commit -m "chore: bump version to 1.0.0"
   
   # 创建标签
   git tag v1.0.0
   
   # 推送提交和标签
   git push origin main
   git push origin v1.0.0
   ```

3. 等待 GitHub Actions 完成构建和发布

   GitHub Actions 会自动执行以下操作：
   - 构建各平台的应用（macOS Intel、macOS Apple Silicon、Windows、Linux）
   - 创建 GitHub Release
   - 将构建好的安装包上传到 Release

4. 检查发布结果

   构建完成后，可以在 GitHub 仓库的 "Releases" 页面查看发布结果。

## 支持的平台

当前支持以下平台：

- macOS Intel (x86_64)
- macOS Apple Silicon (aarch64)
- Windows
- Linux (Ubuntu)

## 手动触发构建

如果需要手动触发构建而不创建发布，可以在 GitHub Actions 页面手动运行工作流。这将构建应用但不会创建 Release。

## 故障排除

如果构建失败，可以查看 GitHub Actions 的日志以获取更多信息。常见问题包括：

- 依赖项安装失败
- 构建过程中的错误
- 权限问题

如果需要修改构建配置，可以编辑 `.github/workflows/tauri-build.yml` 文件。 