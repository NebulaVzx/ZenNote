# ZenNote 体验优化清单

> 对标 Notion / 语雀 / 思源笔记，梳理当前产品与业界标杆之间的差距，按优先级排列。
> 每项标注难度 (S/M/L/XL) 和影响面 (High/Med/Low)。

---

## 一、编辑器核心体验 (Editor)

### 1. 代码块换行偏移 [FIXED ✅]
- **状态**：已修复。此前在代码块中按 Enter 后光标位置偏移，现已解决。
- **修复位置**：`frontend/src/components/Editor.tsx` — 调整了 `react-simple-code-editor` 的 textarea 与 `<pre>` 的行高同步逻辑。

### 2. 块级拖拽不流畅 [FIXED ✅]
- **状态**：v0.2.4 已修复。为编辑区和侧边栏的块/页面拖拽增加了透明 drag image、蓝色插入指示线、被拖拽块半透明反馈，并修复了 WebView2 中 `dragend` 先于 `drop` 导致的状态丢失问题。
- **修复位置**：`frontend/src/components/Editor.tsx`、`frontend/src/components/Sidebar.tsx`

### 3. 行内格式丢失 [FIXED ✅]
- **状态**：v0.2.8 已修复。`block.content` 改为存储 `innerHTML` 而非 `innerText`，切换 active/inactive 块时 `<b>`、`<i>`、`<strike>` 等格式标签不再丢失。搜索高亮改为 DOM 层面文本节点遍历，避免切到 HTML 标签。
- **修复位置**：`frontend/src/components/Editor.tsx`、`frontend/src/components/SearchModal.tsx`

### 4. 图片 / 附件插入 [FIXED ✅]
- **状态**：v0.3.0 已实现。新增 `image` 块类型，支持从剪贴板粘贴图片（自动存入 `.zennote/assets/`）和从外部拖拽图片插入编辑器。图片路径以相对路径存储于 `block.props`。
- **修复位置**：`frontend/src/components/Editor.tsx`、`frontend/src/components/SlashCommand.tsx`、`src-tauri/src/lib.rs`

### 5a. 悬浮大纲 / TOC [FIXED ✅]
- **状态**：v0.3.5 已实现。`OutlinePanel` 组件在 Editor 右侧提取 heading 块形成目录树，支持点击跳转到对应位置，使用 `IntersectionObserver` 实现滚动联动高亮当前 heading。
- **修复位置**：`frontend/src/components/OutlinePanel.tsx`、`frontend/src/components/Editor.tsx`

### 5. 表格块
- **现状**：无
- **对标**：Notion / 语雀 / 思源均支持
- **难度**：XL | **影响**：Med
- **建议**：Phase 4+，可考虑简单的 CSV 渲染表格

### 6. 引用块 (Blockquote) [FIXED ✅]
- **状态**：v0.2.3 已新增 `quote` 块类型，支持 `>` 快捷键和 `/quote` 插入，左侧带竖线缩进样式。
- **修复位置**：`frontend/src/components/Editor.tsx`

### 7. Heading 3 [FIXED ✅]
- **状态**：v0.2.3 已新增 H3 支持，支持 `###` 和 `/h3` 插入。
- **修复位置**：`frontend/src/components/Editor.tsx`

### 8. 有序列表序号自动递增 [FIXED ✅]
- **状态**：v0.2.7 已修复。渲染时向前查找连续 numbered_list 块，自动计算当前序号。
- **修复位置**：`frontend/src/components/Editor.tsx`

### 9. Todo 完成态样式 [FIXED ✅]
- **状态**：v0.2.3 已修复。勾选 todo 后文字显示删除线 + 变灰。
- **修复位置**：`frontend/src/components/Editor.tsx`

### 10. 块菜单（右侧 `+` / `⋯`） [FIXED ✅]
- **状态**：v0.2.7 已实现。拖拽手柄旁 `⋯` 按钮弹出 Block Menu，支持 Delete / Duplicate / Turn into。
- **修复位置**：`frontend/src/components/Editor.tsx`、`frontend/src/components/SlashCommand.tsx`

### 11. 撤销 / 重做 (Undo/Redo) [FIXED ✅]
- **状态**：v0.3.5 已实现。`useBlockHistory` hook 快照式历史栈（最大 50 条），在 insert / delete / duplicate / reorder / type change / AI accept / multi-select delete 前自动 `history.push`。支持 `Ctrl+Z` 撤销、`Ctrl+Y` / `Ctrl+Shift+Z` 重做，还原时自动刷新 DOM。
- **修复位置**：`frontend/src/hooks/useBlockHistory.ts`、`frontend/src/components/Editor.tsx`

---

## 二、页面与导航 (Sidebar)

### 12. 页面图标 / Emoji 选择器 [FIXED ✅]
- **状态**：v0.2.7 已实现。页面标题左侧和 Sidebar 均显示 `pages.icon`，点击标题旁图标可弹出 Emoji picker。
- **修复位置**：`frontend/src/components/Editor.tsx`、`frontend/src/components/Sidebar.tsx`、`frontend/src/components/EmojiPicker.tsx`

### 13. 页面收藏 / 快捷入口 [FIXED ✅]
- **状态**：v0.2.9 已实现。`pages` 表新增 `is_favorite INTEGER DEFAULT 0`，Sidebar 顶部新增 Favorites 区域，右键菜单支持 Add/Remove favorites。
- **修复位置**：`backend/internal/db/db.go`、`backend/internal/api/api.go`、`frontend/src/components/Sidebar.tsx`

### 14. 页面最近编辑排序 [FIXED ✅]
- **状态**：v0.2.9 已实现。Sidebar 新增 Tree / Recent 视图切换按钮，Recent 视图按 `updated_at DESC` 显示最近 15 个页面，含相对时间（"2m ago"）。
- **修复位置**：`frontend/src/components/Sidebar.tsx`

### 15. 右键菜单 [FIXED ✅]
- **状态**：v0.2.9 已实现。Sidebar 页面树项右键弹出上下文菜单，支持 New page / Rename / Duplicate / Add to favorites / Delete。
- **修复位置**：`frontend/src/components/Sidebar.tsx`

### 16. 工作区切换
- **现状**：TitleBar 硬编码 "My Workspace"
- **对标**：Notion 多工作区切换；思源多工作空间
- **难度**：L | **影响**：Low
- **建议**：Phase 4+，需后端支持多 workspace

---

## 三、搜索 (Search)

### 17. 搜索结果跳转定位 [FIXED ✅]
- **状态**：v0.2.7 已实现。全局搜索点击结果后 Editor 滚动到对应 block 并高亮 1.5 秒。
- **修复位置**：`frontend/src/components/SearchModal.tsx`、`frontend/src/components/Editor.tsx`、`frontend/src/App.tsx`

### 18. 搜索历史 / 最近搜索 [FIXED ✅]
- **状态**：v0.3.5 已实现。`localStorage` 存储最近 10 条搜索词（`zennote.searchHistory`），SearchModal 空状态时显示历史列表，支持点击重新搜索、单独删除、清除全部。
- **修复位置**：`frontend/src/components/SearchModal.tsx`

### 19. 替换功能 [FIXED ✅]
- **状态**：v0.3.5 已实现。`Ctrl+H` 呼出替换栏，PageSearch 组件新增 "替换为..." 输入框 + "替换" / "全部替换" 按钮。Editor 内部实现 `replaceInBlocks`，通过正则匹配替换 block.content，支持单条替换和全部替换。
- **修复位置**：`frontend/src/components/PageSearch.tsx`、`frontend/src/components/Editor.tsx`、`frontend/src/App.tsx`

---

## 四、同步与数据 (Sync)

### 20. 自动同步定时器 [FIXED ✅]
- **状态**：v0.2.9 已实现。后端启动后台 goroutine，每 30 秒轮询 `sync_configs`，`auto_sync=1` 且间隔满足时自动执行 Upload。SyncStatus 组件显示 "Auto-sync on" 状态。
- **修复位置**：`backend/main.go`、`frontend/src/components/SyncStatus.tsx`

### 21. 同步进度指示 [FIXED ✅]
- **状态**：v0.3.8 已实现。后端 `Syncer` 新增 `SetOnProgress` 回调，扫描/传输/完成阶段触发 `SyncProgress` 事件。新增 `GET /api/sync/progress` SSE 端点推送进度。前端 `SyncStatus` 组件订阅 SSE，显示进度条、当前文件名和百分比。
- **修复位置**：`backend/internal/sync/syncer.go`、`backend/internal/api/sync.go`、`frontend/src/components/SyncStatus.tsx`

### 22. Markdown 导入/导出 [FIXED ✅]
- **状态**：v0.3.0 已实现。支持通过 File 菜单或拖拽打开外部 `.md` 文件，在块编辑器中编辑后自动保存回原文件；支持导出任意页面为 Markdown（含 frontmatter）。新增 `pages.file_path` 和 `pages.frontmatter` 字段。
- **修复位置**：`frontend/src/utils/markdown.ts`、`frontend/src/components/TitleBar.tsx`、`frontend/src/App.tsx`、`src-tauri/src/lib.rs`

### 22b. 其他格式导出 [FIXED ✅]
- **状态**：v0.3.7 已实现 HTML 导出。File 菜单新增 "Export as HTML..."，将当前页面导出为独立 HTML 文件，含所有块类型的完整渲染和内置响应式 CSS（支持 `prefers-color-scheme: dark`）。
- **修复位置**：`frontend/src/utils/export.ts`、`frontend/src/components/TitleBar.tsx`、`frontend/src/App.tsx`

---

## 五、视觉与交互 (UI/UX)

### 23. 加载状态 / 骨架屏 [FIXED ✅]
- **状态**：v0.3.5 已实现。`SkeletonScreen` 组件替代 "Loading..." 文字，包含标题、段落行、Heading、代码块的脉冲动画占位。
- **修复位置**：`frontend/src/components/SkeletonScreen.tsx`、`frontend/src/components/Editor.tsx`

### 24. 空状态引导 [FIXED ✅]
- **状态**：v0.3.5 已实现。首次启动检测 `localStorage.getItem('zennote.hasLaunched')`，未设置则展示 `WelcomeScreen` 模板选择界面，含 4 个模板卡片（空白页 / 日记 / 读书笔记 / 会议记录）。选择后自动创建页面并写入预设 blocks。
- **修复位置**：`frontend/src/components/WelcomeScreen.tsx`、`frontend/src/App.tsx`

### 25. 快捷键提示面板 [FIXED ✅]
- **状态**：v0.2.5 已实现。`Ctrl+/` 呼出全局快捷键帮助面板，分类展示所有快捷键。
- **修复位置**：`frontend/src/components/KeyboardShortcutsModal.tsx`、`frontend/src/App.tsx`

### 26. Toast 通知组件 [FIXED ✅]
- **状态**：v0.2.5 已实现。全局 `ToastProvider`，支持 success / error / info，3 秒自动消失，带彩色左边框，已替换 `SyncStatus` 的内联 toast。
- **修复位置**：`frontend/src/components/ToastProvider.tsx`、`frontend/src/components/SyncStatus.tsx`、`frontend/src/main.tsx`

### 27. 侧边栏折叠 [FIXED ✅]
- **状态**：v0.2.3 已实现。标题栏新增折叠按钮，可展开/收起侧边栏。
- **修复位置**：`frontend/src/components/TitleBar.tsx`、`frontend/src/App.tsx`

### 28. 暗色 / 亮色主题 [FIXED ✅]
- **状态**：v0.3.6 已实现。新增 Light / Dark / System 三种主题模式。`index.css` 定义 `.light` / `.dark` CSS 变量集合，`tailwind.config.js` 启用 `darkMode: 'class'`。所有组件的硬编码暗色（`bg-[#191919]`、`text-gray-200` 等）批量替换为 CSS 变量（`--bg-primary`、`--text-secondary` 等）。SettingsModal 新增 Appearance 标签页，支持一键切换。主题偏好持久化到 `localStorage`。
- **修复位置**：`frontend/src/index.css`、`frontend/tailwind.config.js`、`frontend/src/App.tsx`、`frontend/src/components/SettingsModal.tsx` 及全局组件

### 29. 窗口尺寸记忆 [FIXED ✅]
- **状态**：v0.2.3 已实现。Rust 壳在关闭窗口时保存窗口尺寸和位置，下次启动自动恢复。
- **修复位置**：`src-tauri/src/lib.rs`

### 30. 系统托盘 (Tray) [FIXED ✅]
- **状态**：v0.3.8 已实现。`Cargo.toml` 启用 `tray-icon` feature，`lib.rs` 中 `TrayIconBuilder` 创建托盘图标和右键菜单（Show / Quit）。关闭窗口时 `prevent_close()` + `hide()`，托盘右键"退出"才杀死后端并完全退出。
- **修复位置**：`src-tauri/Cargo.toml`、`src-tauri/src/lib.rs`

---

## 六、数据安全 (Safety)

### 31. 回收站 [FIXED ✅]
- **状态**：v0.2.7 已实现。`pages.deleted_at` 软删除，Sidebar 底部新增 Trash 入口，支持 Restore / Permanent Delete。
- **修复位置**：`backend/internal/db/db.go`、`backend/internal/api/api.go`、`frontend/src/components/Sidebar.tsx`、`frontend/src/App.tsx`

### 32. 本地备份 / 版本历史 [FIXED ✅]
- **状态**：v0.3.5 已实现。每次保存 blocks 时自动创建 snapshot（`page_snapshots` 表保留最近 50 个版本）。SettingsModal 新增 History 标签页，展示快照列表（时间 + 块数量），支持恢复到任意版本。恢复后自动刷新页面。
- **修复位置**：`backend/internal/db/db.go`、`backend/internal/api/api.go`、`frontend/src/components/SettingsModal.tsx`

### 33. 冲突解决 UI
- **现状**：LWW 自动解决冲突，用户无感知
- **对标**：Git merge conflict UI；Notion 版本对比
- **难度**：XL | **影响**：Low
- **建议**：Phase 4+，当前 LWW 策略够用

---

## 七、性能与工程 (Performance)

### 34. 大页面虚拟滚动
- **现状**：所有 block 一次性渲染
- **对标**：Notion / 语雀长文档流畅滚动
- **难度**：XL | **影响**：Med
- **建议**：引入 `react-window` 或 `@tanstack/virtual`，块数 > 100 时启用

### 35. 防抖保存优化 [FIXED ✅]
- **状态**：v0.3.6 已实现。后端新增 `PATCH /api/pages/:id/blocks` 增量更新接口，仅更新指定的 block。前端 Editor 新增 `lastSavedBlocksRef`，保存前对比当前 blocks 与上次保存状态，仅收集内容有变化的 block 发送。若无结构性变更（增删块、排序），走 `PATCH` 只发变化块；有结构性变更则走 `PUT` 全量替换。Markdown 文件同步逻辑保持不变。
- **修复位置**：`backend/internal/api/api.go`、`frontend/src/components/Editor.tsx`、`frontend/src/api/index.ts`

### 36. 后端健康检查 + 重连 [FIXED ✅]
- **状态**：v0.2.7 已实现。前端 3 秒轮询 `/api/health`，断连时显示浮层并提供 "Restart Backend" 按钮（Tauri command）。
- **修复位置**：`frontend/src/App.tsx`、`src-tauri/src/lib.rs`

---

## 八、快捷键汇总 (待补全)

| 快捷键 | 功能 | 状态 |
|--------|------|------|
| `Ctrl+P` | 全局搜索 | ✅ |
| `Ctrl+F` | 页面内搜索 | ✅ |
| `Ctrl+A` (单按) | 选中当前块 | ✅ |
| `Ctrl+A` (双按) | 选中全文 | ✅ |
| `Ctrl+B` | 加粗 | ✅ |
| `Ctrl+I` | 斜体 | ✅ |
| `Ctrl+S` | 手动保存 | ❌ 未实现 |
| `Ctrl+Z` | 撤销 | ✅ (v0.3.5) |
| `Ctrl+Shift+Z` | 重做 | ✅ (v0.3.5) |
| `Ctrl+Y` | 重做 | ✅ (v0.3.5) |
| `Ctrl+\` | 切换侧边栏 | ✅ (v0.2.3) |
| `Ctrl+/` | 快捷键帮助 | ✅ (v0.2.5) |
| `Ctrl+Shift+P` | 命令面板 | ❌ 未实现 |
| `/` | Slash Command | ✅ |
| `Tab` | 代码块缩进 | ✅ |
| `Shift+Tab` | 代码块反缩进 | ❌ 未实现 |

---

## 九、推荐优先级排序

### P0 — 必须尽快修复 (体验阻断)
> P0 已全部完成 ✅

### P1 — 近期迭代 (体验提升明显)
> P1 已全部完成 ✅ (v0.3.5)
1. **AI 增强** — v0.3.5 已完成。流式 SSE 输出、7 个新 action（摘要 / 缩短 / 扩展 / 专业语气 / 随意语气 / 友好语气 / 代码生成）、Tone 子菜单。
2. **撤销 / 重做** (#11) — v0.3.5 已完成。快照式历史栈，Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z。
3. **骨架屏** (#23) — v0.3.5 已完成。CSS 脉冲动画骨架屏替代 "Loading..."。
4. **悬浮大纲** — v0.3.5 已完成。右侧 heading 目录树 + IntersectionObserver 滚动联动。

> **P2 已全部完成 ✅** (v0.3.6)
> - **搜索历史** (#18) — v0.3.5 已完成
> - **空状态引导** (#24) — v0.3.5 已完成
> - **替换功能** (#19) — v0.3.5 已完成
> - **版本历史** (#32) — v0.3.5 已完成
> - **暗亮主题** (#28) — v0.3.6 已完成
> - **防抖保存优化** (#35) — v0.3.6 已完成

### P2 — 剩余未开始
> P2 已全部完成 ✅ (v0.3.7)

### P3 — 远期规划 (差异化)
11. **表格块** (#5) — XL 级。可先以 CSV 渲染简化实现。
12. **虚拟滚动** (#34) — XL 级。块数 >100 时启用，性能优化。
> **P3 批次 A 已完成 ✅** (v0.3.8)
> - **同步进度** (#21) — v0.3.8 已完成
> - **系统托盘** (#30) — v0.3.8 已完成

### P3 — 剩余未开始
15. **冲突 UI** (#33) — XL 级。当前 LWW 自动策略够用，用户有明确冲突时才需要。
16. **工作区切换** (#16) — L 级。影响面 Low，TitleBar 硬编码即可。

---

> 文档生成时间：2026-04-18 | 当前版本：v0.3.8
