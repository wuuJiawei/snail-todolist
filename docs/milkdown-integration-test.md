# Milkdown Markdown 编辑器集成文档

## 完成内容

1. ✅ 引入并安装 Milkdown 生态依赖（core、react、preset-commonmark、history、cursor、listener、upload、theme-nord、transformer、utils、ctx）。
2. ✅ 新增 `src/components/tasks/MilkdownEditor.tsx`，负责：
   - 使用 Milkdown + Nord 主题渲染 WYSIWYG Markdown 编辑器；
   - 与 `TaskDetail` 现有的 `EditorBridge` 协议兼容（`blocksToMarkdownLossy` 仍可导出 Markdown）；
   - 保持与 Tailwind 的样式隔离（wrapper + 内联类名，不复用全局 reset）；
   - 监听文档变化，通过 Listener 插件触发现有的自动保存逻辑；
   - 只读态下禁用编辑（垃圾桶任务仍可预览）。
3. ✅ 图片上传
   - 替换 Vditor 内建上传逻辑，使用 Milkdown `upload` 插件自定义 `uploader`；
   - 粘贴 / 拖拽图片后调用 Supabase 存储，上传成功后自动插入 `<img>` 节点；
   - 同步 `TaskAttachments`，避免重复附件记录。
4. ✅ 样式
   - 移除 `index.css` 中所有 Vditor 相关样式；
   - 新增 `.milkdown-editor` 相关布局，确保编辑器撑满容器且不受 Tailwind 影响；
   - 保留文本选择与滚动行为，与全局 UX 保持一致。
5. ✅ 依赖 & 文档
   - 删除 `vditor` 依赖并更新 README 致谢；
   - 新增本测试文档，描述 Milkdown 的功能范围和验证项。

## 需要验证的功能

### 基础交互
1. **加载**：进入 TaskDetail 时编辑器正常渲染，默认值与任务描述一致。
2. **输入**：Markdown 与所见即所得互通（标题、列表、代码块、表格、任务列表等）；中文 IME 不出现错位。
3. **自动保存**：输入后触发 `handleEditorChange`，延迟保存逻辑仍生效；切换任务前后内容保持同步。
4. **复制为 Markdown**：调用 `blocksToMarkdownLossy` 仍返回完整 Markdown（用于“复制为 Markdown”操作）。
5. **只读模式**：垃圾桶内任务无法编辑，但可以滚动、选中和复制内容。

### 图片上传
1. 粘贴 / 拖拽单张或多张图片，均能触发 Supabase 上传，编辑器中插入图片节点。
2. 上传中的占位 UI 可见，上传失败时出现 toast。
3. 上传完成后附件列表同步更新且可删除。
4. 上传后的 Markdown 保存后刷新仍能还原图片。

### 辅助能力
1. **快捷键**：常规快捷键（Cmd/Ctrl + B/I/K）、撤销重做、Tab 缩进等是否工作。
2. **滚动体验**：大量内容下滚动流畅，无明显卡顿。
3. **跨任务切换**：快速切换任务不会出现其他任务的暂存内容或竞态覆盖。
4. **深色模式**：Nord 主题随应用主题切换，文字和分割线清晰。

## 回归 & 潜在风险

- 插件体系由 ProseMirror 驱动，未来如需 Slash Menu / 自定义 Block，可在 Milkdown 扩展层实现。
- 若 Tailwind 未来新增更激进的 base reset，应继续通过 `.milkdown-editor` 包裹，避免污染编辑器内部元素。
- 当前未提供工具栏按钮，功能依赖 Markdown & 快捷键；若需要富工具栏可引入 Milkdown 社区插件或自定义 UI。

## 开发调试

```bash
npm run dev
```

访问 <http://localhost:5173>，选择任意任务验证上述列表。如遇问题，请记录：
1. 复现步骤
2. 真实/预期结果
3. 控制台/网络错误
4. 浏览器与版本
