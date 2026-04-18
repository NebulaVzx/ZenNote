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

### 11. 撤销 / 重做 (Undo/Redo)
- **现状**：依赖浏览器默认 contentEditable 行为，不可靠
- **对标**：Notion Ctrl+Z 可精确撤销到任意历史状态
- **难度**：XL | **影响**：High
- **建议**：
  - 方案 A：引入 `yjs` + `y-prosemirror` 做协作式 UndoManager
  - 方案 B：自建操作栈（每次 blocks 变更记录 diff，Ctrl+Z 回放）
  - 这是体验核心，但工程量大，建议分阶段

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

### 18. 搜索历史 / 最近搜索
- **现状**：无
- **对标**：Notion / 语雀搜索弹窗显示最近搜索
- **难度**：S | **影响**：Low
- **建议**：localStorage 存最近 10 条搜索词，搜索弹窗空状态时显示

### 19. 替换功能
- **现状**：Ctrl+F 仅搜索，无替换
- **对标**：语雀 Ctrl+H 替换；VS Code 标准搜索替换
- **难度**：M | **影响**：Low
- **建议**：PageSearch 组件增加替换输入框 + Replace/Replace All 按钮

---

## 四、同步与数据 (Sync)

### 20. 自动同步定时器 [FIXED ✅]
- **状态**：v0.2.9 已实现。后端启动后台 goroutine，每 30 秒轮询 `sync_configs`，`auto_sync=1` 且间隔满足时自动执行 Upload。SyncStatus 组件显示 "Auto-sync on" 状态。
- **修复位置**：`backend/main.go`、`frontend/src/components/SyncStatus.tsx`

### 21. 同步进度指示
- **现状**：仅显示 "Upload complete" / "Download complete" 文字 toast
- **对标**：语雀显示同步进度条；Notion 显示同步中状态
- **难度**：M | **影响**：Low
- **建议**：WebSocket 推送同步进度，或前端轮询进度接口

### 22. Markdown 导入/导出 [FIXED ✅]
- **状态**：v0.3.0 已实现。支持通过 File 菜单或拖拽打开外部 `.md` 文件，在块编辑器中编辑后自动保存回原文件；支持导出任意页面为 Markdown（含 frontmatter）。新增 `pages.file_path` 和 `pages.frontmatter` 字段。
- **修复位置**：`frontend/src/utils/markdown.ts`、`frontend/src/components/TitleBar.tsx`、`frontend/src/App.tsx`、`src-tauri/src/lib.rs`

### 22b. 其他格式导出
- **现状**：仅支持 Markdown
- **对标**：Notion 导出 PDF / HTML；语雀导出多种格式；思源导出 .sy.zip
- **难度**：L | **影响**：Med
- **建议**：后续支持整页/整工作区导出为 ZIP（含图片 assets）

---

## 五、视觉与交互 (UI/UX)

### 23. 加载状态 / 骨架屏
- **现状**：Editor 仅显示 "Loading..." 文字
- **对标**：Notion / 语雀加载时有骨架屏动画
- **难度**：S | **影响**：Med
- **建议**：CSS 动画骨架屏替代 "Loading..."

### 24. 空状态引导
- **现状**：欢迎页仅有 `📝` + 文字
- **对标**：Notion 首次使用有模板选择引导
- **难度**：M | **影响**：Med
- **建议**：首次启动显示模板选择（空白页 / 日记 / 读书笔记 / 会议记录），模板即预设 block 结构

### 25. 快捷键提示面板 [FIXED ✅]
- **状态**：v0.2.5 已实现。`Ctrl+/` 呼出全局快捷键帮助面板，分类展示所有快捷键。
- **修复位置**：`frontend/src/components/KeyboardShortcutsModal.tsx`、`frontend/src/App.tsx`

### 26. Toast 通知组件 [FIXED ✅]
- **状态**：v0.2.5 已实现。全局 `ToastProvider`，支持 success / error / info，3 秒自动消失，带彩色左边框，已替换 `SyncStatus` 的内联 toast。
- **修复位置**：`frontend/src/components/ToastProvider.tsx`、`frontend/src/components/SyncStatus.tsx`、`frontend/src/main.tsx`

### 27. 侧边栏折叠 [FIXED ✅]
- **状态**：v0.2.3 已实现。标题栏新增折叠按钮，可展开/收起侧边栏。
- **修复位置**：`frontend/src/components/TitleBar.tsx`、`frontend/src/App.tsx`

### 28. 暗色 / 亮色主题
- **现状**：仅暗色主题，所有颜色硬编码
- **对标**：Notion / 语雀 / 思源均支持亮暗切换
- **难度**：L | **影响**：Med
- **建议**：
  - 将所有 `bg-[#1e1e1e]` / `text-gray-200` 等替换为 CSS 变量
  - Tailwind v3 `darkMode: 'class'` + 主题切换按钮
  - 此为重构级任务，建议单独迭代

### 29. 窗口尺寸记忆 [FIXED ✅]
- **状态**：v0.2.3 已实现。Rust 壳在关闭窗口时保存窗口尺寸和位置，下次启动自动恢复。
- **修复位置**：`src-tauri/src/lib.rs`

### 30. 系统托盘 (Tray)
- **现状**：关闭窗口即退出
- **对标**：语雀 / 思源可最小化到托盘
- **难度**：M | **影响**：Low
- **建议**：Tauri `tray` 插件，关闭时隐藏窗口，托盘右键退出

---

## 六、数据安全 (Safety)

### 31. 回收站 [FIXED ✅]
- **状态**：v0.2.7 已实现。`pages.deleted_at` 软删除，Sidebar 底部新增 Trash 入口，支持 Restore / Permanent Delete。
- **修复位置**：`backend/internal/db/db.go`、`backend/internal/api/api.go`、`frontend/src/components/Sidebar.tsx`、`frontend/src/App.tsx`

### 32. 本地备份 / 版本历史
- **现状**：无版本历史
- **对标**：Notion Page History；语雀历史版本；思源数据快照
- **难度**：L | **影响**：Med
- **建议**：
  - 简化方案：每次保存时将 blocks JSON 快照到 `page_snapshots` 表
  - 保留最近 50 个版本，Settings 中可查看/恢复

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

### 35. 防抖保存优化
- **现状**：1.5s 定时全量 PUT blocks
- **对标**：Notion 增量保存；语雀自动保存
- **难度**：L | **影响**：Med
- **建议**：
  - 仅发送变更的 block（diff 检测）
  - 或切换为单 block PUT 接口，修改即保存

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
| `Ctrl+Z` | 撤销 | ⚠️ 依赖浏览器，不可靠 |
| `Ctrl+Shift+Z` | 重做 | ⚠️ 同上 |
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
> 原有 #13/#14/#15/#20 已全部完成 ✅。当前待办：
1. **AI 增强** — 流式输出、更多 action（摘要 / 改写语气 / 代码生成）。差异化核心，持续迭代。
2. **撤销 / 重做** (#11) — XL 级。编辑器体验天花板功能，当前依赖浏览器默认行为不可靠。
3. **骨架屏** (#23) — S 级。纯 CSS 动画替代 "Loading..."，投入小见效快。
4. **悬浮大纲** — S 级。Editor 右侧自动提取 H1/H2/H3 形成目录树，点击跳转 + 滚动联动高亮。对标 Notion TOC，零后端改动。

### P2 — 中期规划 (功能完善)
4. **版本历史** (#32) — L 级。数据安全底线功能，每保存 snapshot 到 `page_snapshots` 表。
5. **暗亮主题** (#28) — L 级。用户呼声高，需将所有硬编码颜色改为 CSS 变量 + Tailwind `darkMode: 'class'`。
6. **空状态引导** (#24) — M 级。首次启动展示模板选择（空白页 / 日记 / 读书笔记 / 会议记录），降低上手门槛。
7. **防抖保存优化** (#35) — L 级。当前 1.5s 全量 PUT，改为仅发送变更 block 或单 block PUT。
8. **替换功能** (#19) — M 级。`Ctrl+H` 页面内搜索替换，对标 VS Code 标准体验。
9. **搜索历史** (#18) — S 级。localStorage 存最近 10 条，空状态展示。投入极小。
10. **其他格式导出** (#22b) — L 级。Markdown 已支持，后续 PDF / HTML / ZIP。

### P3 — 远期规划 (差异化)
11. **表格块** (#5) — XL 级。可先以 CSV 渲染简化实现。
12. **虚拟滚动** (#34) — XL 级。块数 >100 时启用，性能优化。
13. **同步进度** (#21) — M 级。WebSocket 推送或轮询进度条。
14. **系统托盘** (#30) — M 级。关闭窗口最小化到托盘而非退出。
15. **冲突 UI** (#33) — XL 级。当前 LWW 自动策略够用，用户有明确冲突时才需要。
16. **工作区切换** (#16) — L 级。影响面 Low，TitleBar 硬编码即可。

---

> 文档生成时间：2026-04-18 | 当前版本：v0.3.2
