# ZenNote 工作交接本 (Context)

> ⚠️ **每次切换会话或工具前，请务必更新此文件。**

---

## 当前阶段
**Phase 2 已完成，正处于 Phase 2 → Phase 3 的过渡阶段。**

最近的开发重心是修复编辑器交互细节和完成 S3 同步功能的 UI/后端对接。

---

## 最近一次提交
- **Commit**: `087e72b`
- **Message**: `fix(editor+sidebar): restore slash shortcuts and fix drag-and-drop`
- **推送状态**: 已推送到 GitHub `origin/main`

### 该提交修复的内容
1. **恢复斜杠命令和 Markdown 快捷语法** (`/`, `[] `, `# ` 等)
   - 根因：`placeCaretAtEnd` 之前插入了 `\u200B`（零宽空格），污染了 `innerText`，导致精确匹配失效。
   - 修复：移除 `\u200B`，`normalizeText` 增加 `.trim()` 和过滤 `\u200B`。
2. **修复 Sidebar 页面树拖拽**
   - 根因：HTML5 拖拽必须调用 `e.dataTransfer.setData`，之前重写时漏掉了。
   - 修复：在 `GripVertical` 手柄的 `onDragStart` 中补上了 `setData`。
3. **修复 Editor block 拖拽**
   - `⋮⋮` 手柄改为常显（不再 hover 才显示）。
   - `onDragOver`/`onDrop` 移到整个 block 行上，提升落点容错。

---

## 当前代码状态

### 已知问题 / 待验证
- [ ] **Editor block 拖拽**：虽然代码层面已修复，但需要在真实运行时验证跨 block 拖放是否流畅。
- [ ] **Sidebar 页面树拖拽**：需要在真实运行时验证拖到页面（成为子页面）和拖到空白区（成为根页面）的行为。
- [ ] **代码块 Enter 行为**：当前逻辑是
  - `Shift+Enter` = 插入换行
  - 光标在开头 = 上方插入 paragraph
  - 光标在空行的最后一行末尾 = 下方插入 paragraph 并删除当前空行
  - 需要在真实使用中验证是否符合直觉。
- [ ] **SettingsModal 按钮大小**：已经统一为 `px-4 py-2`，视觉上应该一致了，需用户确认。

### 尚未实现的功能（下一步重点）
1. **AI 配置面板** —— 需要新增 `ai_configs` 表、后端 API、前端设置页签。
2. **`/ai` Slash Command** —— 需要接入 OpenAI 兼容 API，实现基于上下文的续写。
3. **Ask AI 浮条** —— 选中文本后弹出浮条，支持润色/翻译/解释。
4. **数据导出** —— 导出单页面为 Markdown，导出整个 Workspace 为 zip。
5. **块级拖拽排序的彻底完善** —— 当前拖拽手柄已加，但拖拽视觉反馈（插入线/占位符）还可以优化。
6. **回收站** —— 当前是硬删除，后续需要软删除 + 回收站恢复。

---

## 下一步计划（建议执行顺序）

### 短期（本周）
1. **全面运行 E2E 测试**
   - 当前项目没有可执行的 Playwright 配置文件（之前的 `e2e-test.cjs` 已不存在）。
   - 建议重新建立一套完整的 Playwright 测试（或至少手动测试清单），覆盖：页面创建、编辑、快捷语法、代码块、拖拽、同步设置。
2. **修复运行时发现的新 UI 小问题**
   - 如果有用户反馈的新的交互别扭之处，优先修复。

### 中期（下周）
3. **Phase 3 启动：AI 辅助**
   - 数据库：新增 `ai_configs` 表（provider, base_url, model, api_key）。
   - 后端：新增 `/api/ai/config` CRUD API，`/api/ai/complete` 流式/非流式续写接口。
   - 前端：SettingsModal 增加 AI 标签页；Editor 增加 `/ai` 命令和 Ask AI 浮条。

### 长期
4. **数据导出、自定义标题栏、主题切换、回收站**

---

## 关键技术栈
- **桌面端**: Tauri v2 (Rust)
- **前端**: React 19 + Vite + TypeScript + Tailwind CSS v3
- **后端**: Go 1.25 + Gin
- **数据库**: SQLite (modernc.org/sqlite) + FTS5
- **同步**: AWS SDK for Go v2 (S3)
- **图标**: 已替换为自定义 ZenNote 图标（Pillow 生成 + `tauri icon`）

---

## 重要文件路径
- **Backend API**: `backend/internal/api/api.go`
- **Backend Sync**: `backend/internal/sync/s3client.go`, `backend/internal/sync/syncer.go`
- **Frontend Editor**: `frontend/src/components/Editor.tsx`
- **Frontend Sidebar**: `frontend/src/components/Sidebar.tsx`
- **Frontend API Client**: `frontend/src/api/index.ts`
- **Requirements**: `Requirements.md`
- **Memory Bank**: `.memory-bank/`
