# ZenNote 项目交接文档

> **生成时间**：2026-04-18
> **当前版本**：v0.3.8
> **用途**：在新 Thread/Agent 启动时快速同步项目上下文，避免重复探索和遗漏关键信息。

---

## 1. 一句话定位

ZenNote（墨迹）是一款面向知识工作者的**本地优先块级笔记软件**，基于 **Tauri v2 (Rust) + React 19 + Go 1.25 + SQLite** 构建，提供类 Notion 的编辑体验和 S3 兼容存储的云端同步。

---

## 2. 已经完成的核心工作（截至 v0.2.4）

### Phase 1 — 本地编辑 MVP ✅
- 块级编辑器（Paragraph、Heading H1/H2/**H3**、Bullet List、Numbered List、Todo List、**Quote**、Code、Toggle、Divider）
- Markdown 快捷语法：`#`、`##`、`###`、`-`、`1.`、`[]`、`>`、` ``` `
- Slash Command (`/`) 快速插入块
- 选中文本浮动工具条（Bold / Italic / Strikethrough / Clear）
- 块级拖拽排序（左侧 `⋮⋮` 手柄，含蓝色插入指示线和半透明反馈）
- 页面树无限层级 + 拖拽调整层级 + 批量多选删除
- 多标签页（VS Code 风格）
- 全局搜索 `Ctrl+P`（SQLite FTS5）+ 页面内搜索 `Ctrl+F`

### Phase 2 — S3 云端同步 ✅
- S3 / MinIO / 阿里云 OSS 兼容配置面板
- 增量上传/下载（MD5 + 修改时间）
- LWW（Last-Write-Wins）冲突解决，自动备份 `.conflict-{timestamp}`
- 标题栏同步状态指示器 + 手动 Upload/Download

### Windows 便携版 ✅
- `scripts/build-portable.bat` 一键打包（含前后端）
- Rust 壳自动检测并静默启动 `bin/zennote-backend.exe`
- 关闭窗口时自动结束后端进程
- Go 后端嵌入版本信息和应用图标（SmartScreen 缓解）

### v0.2.4 最新 6 项体验优化 ✅
1. **#13 修复拖拽不流畅** — 编辑区和侧边栏的块/页面拖拽在 WebView2 中增加透明 drag image、蓝色插入指示线、半透明反馈
2. Todo 勾选后文字显示删除线 + 变灰
3. 新增 Heading 3（`###` + `/h3`）
4. 新增 Quote 块（`>` + `/quote`）
5. 标题栏新增侧边栏折叠按钮
6. 窗口大小/位置记忆（关闭后重启自动恢复）

### v0.2.5 最新 2 项体验优化 ✅
1. **#25 快捷键提示面板** — `Ctrl+/` 呼出全局快捷键帮助
2. **#26 Toast 通知组件** — 全局 Toast Provider，统一操作反馈

### Phase 3 — AI-assisted Writing MVP ✅ (v0.2.6)
1. **AI Config Panel** — SettingsModal 新增 AI Config 标签页，支持 OpenAI / Ollama / Custom 配置
2. **Backend AI Proxy** — `/api/ai/generate` 代理请求，API Key 不暴露给前端
3. **`/ai` Slash Command** — 编辑器中 `/ai` 或 AI Assist 唤起 AI 动作面板（续写 / 润色 / 翻译 / 解释）
4. **"Ask AI" 浮动工具条** — 选中文本后 toolbar 新增 Sparkles 按钮
5. **Diff / Accept-Reject UI** — AI 生成内容以绿色 Ghost Block 预览，Accept 后插入为正式段落

### v0.2.7 — P0/P1 体验优化 Batch 1 ✅
1. **#31 回收站** — `pages.deleted_at` 软删除，Sidebar 底部新增 Trash 入口，支持 Restore / Permanent Delete
2. **#36 后端健康检查 + 重连** — 前端 3 秒轮询 `/api/health`，断连时显示浮层并提供 "Restart Backend" 按钮（Tauri command）
3. **#8 有序列表序号自动递增** — 渲染时向前查找连续 `numbered_list` 块，自动计算当前序号
4. **#10 块菜单** — 拖拽手柄旁 `⋯` 按钮，支持 Delete / Duplicate / Turn into
5. **#17 搜索结果跳转定位** — 全局搜索点击结果后 Editor 滚动到匹配 block 并高亮 1.5 秒
6. **#12 页面图标 / Emoji 选择器** — 页面标题左侧显示 `pages.icon`，点击弹出 Emoji picker

### v0.2.8 — 行内格式持久化 ✅
1. **#3 行内格式持久化** — `block.content` 改为存储 `innerHTML`，`Ctrl+B/I/S` 产生的格式标签在切换块和页面刷新后不再丢失。搜索高亮改为 DOM 层面文本节点遍历。

### v0.2.9 — P1 剩余项 Batch ✅
1. **#20 自动同步定时器** — 后端启动后台 goroutine，每 30 秒轮询 `sync_configs`，`auto_sync=1` 时自动执行 Upload
2. **#15 右键菜单** — Sidebar 页面树项右键弹出上下文菜单，支持 New page / Rename / Duplicate / Add to favorites / Delete
3. **#13 页面收藏** — `pages` 表新增 `is_favorite`，Sidebar 顶部新增 Favorites 区域，显示所有收藏页面
4. **#14 最近编辑排序** — Sidebar 新增 Tree / Recent 视图切换，Recent 视图按 `updated_at DESC` 显示最近 15 个编辑页面

### v0.3.0 — Markdown 互操作 + 图片插入 ✅
1. **Markdown 打开/编辑/导出** — 支持通过 File 菜单或拖拽打开外部 `.md` 文件，在块编辑器中编辑后自动保存回原文件；支持导出任意页面为 Markdown。
2. **Frontmatter 支持** — 导入/导出标准 YAML frontmatter（`title`, `icon`, `created_at`, `updated_at`），存储于 `pages.frontmatter`。
3. **图片块** — 编辑器新增 `image` 块类型，支持从剪贴板粘贴图片（自动存入 `.zennote/assets/`）和从外部拖拽图片插入。
4. **Tauri 文件操作** — 新增 `open_markdown_file`、`save_markdown_file`、`copy_image_to_assets`、`read_image_base64` Rust 命令，集成 `tauri-plugin-dialog` 和 `tauri-plugin-fs`。

### v0.3.1 — 首次启动数据加载修复 ✅
1. **修复首次启动空白页问题** — 后端初始化（SQLite 建表 + 默认数据）可能需要 1-2 秒，`refreshPages()` 在 mount 时失败未被捕获导致 `pages` 保持空数组。修复后：
   - `refreshPages()` 添加 `.catch(() => [])` 防止 fetch 失败时 Promise reject
   - `backendOnline` 初始值改为 `false`，避免误导用户认为后端已就绪
   - backendOnline 从 `false→true` 时自动重载 `refreshPages()`
   - 断连浮层文案改为 "Backend Not Ready"

### v0.3.2 — Rust 壳后端启动等待修复 ✅
1. **修复首次启动窗口在 backend 就绪前显示（第 1 层）** — 根本原因是 `try_start_backend()` 仅 `thread::sleep(800ms)` 就假定后端已就绪。但首次运行 SQLite 建表 + seed + Windows 防火墙弹窗确认可能需要数秒。
   - `try_start_backend()` 改为**轮询探测**：每 250ms 尝试 `TcpStream::connect("127.0.0.1:8080")`，最多等待 30 秒
   - 探测超时则 kill 子进程并返回 `None`
   - 保留 v0.3.1 前端兜底逻辑

### v0.3.3 — 窗口隐藏到后端就绪 ✅
1. **修复首次启动空白窗口比防火墙弹窗还快（第 2 层）** — v0.3.2 只解决了 setup 阻塞问题，但 Tauri **窗口在 `setup()` 之前就已经创建并可见**。即使 setup 轮询 30 秒，空白窗口仍然先出现。
   - `setup()` 开始时立即 `window.hide()`
   - 后端 truly ready 后 `window.show()` + `window.set_focus()`

### v0.3.4 — 从源头解决窗口可见性 ✅
1. **真正修复首次启动空白窗口闪烁** — v0.3.3 的 `window.hide()` 在 `setup()` 中执行，总是晚于 Tauri 按配置创建窗口的那一刻，用户仍会看到一个短暂闪现。
   - 正确做法：`tauri.conf.json` 中 `"visible": false`，让窗口**初始就不可见**
   - `setup()` 中不再需要 `window.hide()` 这个事后补救
   - `try_start_backend()` 轮询探测 `:8080` 成功后（或超时后）再 `window.show()` + `window.set_focus()`
   - 用户首次启动完整链路：双击 exe → 无窗口 → 防火墙弹窗（如需）→ 点击允许 → 后端 bind → 窗口正确显示

### v0.3.5 — P1 迭代：骨架屏 + 大纲 + AI 流式 + 撤销重做 ✅
1. **骨架屏** (#23) — `SkeletonScreen` 组件替代 Editor "Loading..." 文字，含标题、段落、Heading、代码块的脉冲动画占位。
2. **悬浮大纲 / TOC** — `OutlinePanel` 组件在 Editor 右侧提取 heading 块形成目录树，`IntersectionObserver` 滚动联动高亮，点击跳转到对应位置。
3. **AI 流式输出** — 后端新增 `/api/ai/generate-stream` SSE 端点，前端通过 `ReadableStream` 逐字渲染 ghost block，体验大幅提升。
4. **AI 扩展 Action** — 新增 7 个 action：Summary（摘要）、Shorter（缩短）、Longer（扩展）、Professional（专业语气）、Casual（随意语气）、Friendly（友好语气）、Code（代码生成）。Tone 类 action 归入子菜单。
5. **撤销 / 重做** (#11) — `useBlockHistory` hook 实现快照式历史栈（最大 50 条），在 insert / delete / duplicate / reorder / type change / AI accept / multi-select delete 前自动记录。支持 `Ctrl+Z` 撤销、`Ctrl+Y` / `Ctrl+Shift+Z` 重做。
6. **修复首次启动空白侧边栏根因** — `backend/internal/db/db.go` 中 `ALTER TABLE pages ADD COLUMN deleted_at` 在 `CREATE TABLE IF NOT EXISTS pages` 之前执行，导致新数据库缺少 `deleted_at` 列，`listPages()` 查询失败。修复方案：在 `CREATE TABLE pages` 定义中直接包含 `deleted_at` 列，保留 `ALTER TABLE` 供已有数据库向后兼容。

### v0.3.6 — P2 迭代：暗亮主题 + 防抖保存优化 ✅
1. **暗亮主题** (#28) — 新增 Light / Dark / System 三种主题模式。`index.css` 定义 `.light` / `.dark` CSS 变量，`tailwind.config.js` 启用 `darkMode: 'class'`。所有组件的硬编码暗色（`bg-[#191919]`、`text-gray-200` 等）替换为 CSS 变量。SettingsModal 新增 Appearance 标签页，支持一键切换。主题偏好持久化到 `localStorage`。
2. **防抖保存优化** (#35) — 后端新增 `PATCH /api/pages/:id/blocks` 增量更新接口，仅更新指定 block。前端 Editor 新增 `lastSavedBlocksRef`，保存前对比找出内容变化的 block。若无结构性变更（增删块、排序），只发送变化的 block，大幅降低 payload。

### v0.3.7 — P2 迭代：其他格式导出（HTML）✅
1. **其他格式导出** (#22b) — 新增「导出为 HTML」功能。File 菜单新增 "Export as HTML..." 选项，支持将当前页面导出为独立 HTML 文件，含所有块类型（段落、标题、列表、待办、引用、代码、分割线、折叠、图片）的完整渲染，内置响应式 CSS（含暗色模式 `prefers-color-scheme: dark` 支持）。复用现有 `save_markdown_file` Tauri command 写入文件。

### v0.3.8 — P3 批次 A：系统托盘 + 同步进度 ✅
1. **系统托盘** (#30) — 关闭窗口时最小化到系统托盘而非退出。Tauri `tray-icon` feature 启用，`TrayIconBuilder` 创建托盘图标和右键菜单（Show / Quit）。左键单击托盘图标恢复窗口显示。
2. **同步进度** (#21) — 同步上传/下载时显示实时进度。后端 `Syncer` 新增 `SetOnProgress` 回调，`Upload`/`Download` 方法在扫描/传输/完成阶段触发进度事件。新增 `GET /api/sync/progress` SSE 端点推送进度。前端 `SyncStatus` 组件订阅 SSE，显示进度条、当前文件名和百分比。

---

## 3. 明确未完成的 Pending 任务

> **P2 中期规划已全部完成 ✅** (v0.3.8)

| 优先级 | 任务 | 说明 | 关联文件 |
|--------|------|------|----------|
| P3 | **表格块** (#5) | XL 级。可先以 CSV 渲染简化实现。 | `frontend/src/components/Editor.tsx` |
| P3 | **虚拟滚动** (#34) | XL 级。块数 >100 时启用，性能优化。 | `frontend/src/components/Editor.tsx` |
| P3 | **同步进度** (#21) | M 级。WebSocket 推送或轮询进度条。 | — |
| P3 | **系统托盘** (#30) | M 级。关闭窗口最小化到托盘而非退出。 | `src-tauri/src/lib.rs` |
| P3 | **冲突 UI** (#33) | XL 级。当前 LWW 自动策略够用，用户有明确冲突时才需要。 | — |
| P3 | **工作区切换** (#16) | L 级。影响面 Low，TitleBar 硬编码即可。 | — |
| P2 | **其他格式导出** (#22b) | L 级。Markdown 已支持，后续 PDF / HTML / ZIP。 | — |

> 完整的优化清单见根目录 `OPTIMIZATION.md`。

---

## 4. 关键文件索引

| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | 项目技术栈、目录结构、开发命令、编码规范 |
| `OPTIMIZATION.md` | 体验优化清单（P0~P3 分级） |
| `frontend/src/components/Editor.tsx` | 块编辑器核心 |
| `frontend/src/components/Sidebar.tsx` | 页面树、拖拽、页面管理 |
| `frontend/src/components/SlashCommand.tsx` | `/` 命令面板 |
| `frontend/src/App.tsx` | 根组件，Sidebar/Tabs/Editor 编排 |
| `frontend/src/components/TitleBar.tsx` | 自定义标题栏 |
| `backend/internal/api/api.go` | Go REST API 路由 |
| `backend/internal/db/db.go` | SQLite 表结构初始化 |
| `src-tauri/src/lib.rs` | Tauri Rust 壳，后端生命周期、窗口状态记忆 |
| `scripts/build-portable.bat` | Windows 便携版一键打包脚本 |

---

## 5. 已知的工程陷阱

1. **版本号必须全量同步**：`frontend/package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`backend/versioninfo.json`、`SettingsModal.tsx`、`backend/internal/api/api.go`、`scripts/build-portable.bat`。
2. **Go 后端编译参数**：`-H=windowsgui -s -w`，否则便携版会弹出命令行窗口。
3. **Tauri 输出 exe 名称**：Cargo 包名是 `tauri-app`，所以 release 产物是 `tauri-app.exe`，打包脚本中需要改名为 `ZenNote.exe`。
4. **Editor 的 `normalizeText` 会 trim()**：所以 Markdown 快捷语法判断不能依赖末尾空格（比如用 `'[]'` 而非 `'[] '`）。
5. **RTK 前缀**：项目中使用了 RTK（Rust Token Killer）过滤工具，bash 命令前建议加 `rtk` 前缀节省 token。

---

## 6. 推荐的下一步行动

**建议顺序**：

P1（骨架屏 / 大纲 / AI 流式 / 撤销重做）和 P2（暗亮主题 / 防抖保存优化）已全部完成。接下来建议按优先级推进：

**P2 — 中期待办**：
1. **版本历史** (#32) — 数据安全底线，每次保存 snapshot 到 `page_snapshots` 表。
2. **空状态引导** (#24) — 首次启动模板选择，降低上手门槛。
3. **替换功能** (#19) — `Ctrl+H` 页面内搜索替换。
4. **搜索历史** (#18) — localStorage 存最近 10 条，S 级难度极易做。

**P3 — 远期**：表格块 (#5)、虚拟滚动 (#34)、同步进度 (#21)、系统托盘 (#30) 等。

---

## 7. Phase 3 之后的远期规划（暂不启动）

### Rust 后端重写评估

> **决策**：等 Phase 3（AI-assisted writing）全部完成后，再评估是否启动。

**当前 Go 后端规模**：约 1236 行（`backend/**/*.go`），覆盖 pages/blocks CRUD、FTS5 搜索、S3 同步、数据库迁移。

**预估工作量**：
- Rust 重写（axum + rusqlite + aws-sdk-rust）约 **1500–2000 行**
- 纯编码+调试时间约 **4–6 天**
- Token 消耗估算：**300K–500K**

**好处**：
1. **单 exe 打包**：Rust HTTP server 直接在 Tauri 进程内启动（`tokio::spawn`），彻底删掉 `try_start_backend()` 和 `bin/zennote-backend.exe` 的子进程管理。
2. **启动更可靠**：没有端口占用或子进程挂掉的风险。
3. **包体积更小**：单二进制 + LTO 有望比双 exe 方案更小。

**坏处**：
1. **开发效率低**：Rust 的错误处理、生命周期、异步比 Go 繁琐，迭代慢。
2. **SQLite 跨平台编译麻烦**：Go 的 `modernc.org/sqlite` 是纯 Go 零依赖；Rust `rusqlite` 需要本地 C 编译器（Windows 上配 clang/MSVC 很痛苦）。
3. **S3 SDK 生态弱**：aws-sdk-rust 文档和社区案例比 Go v2 SDK 少。
4. **维护门槛高**：如果团队不熟 Rust，后期改 bug 会卡。

**结论**：当前 Go 后端够用，迁移收益主要是“单 exe”工程简化，不是功能增强。建议 **Phase 3 稳定后再决定是否启动**。

---

## 8. 快速验证指令

```bash
# 前端类型检查
cd frontend && npx tsc --noEmit

# Rust 检查
cd src-tauri && cargo check

# 一键打包（Windows）
scripts/build-portable.bat
```

---

## 9. 给新 Agent 的交接话术（复制即用）

```
请继续开发 ZenNote 项目。

**当前版本**：v0.3.6，GitHub 已 push，tag 已打。

**必读文件**（按顺序）：
1. `CLAUDE.md` — 技术栈和开发规范
2. `HANDOFF.md`（本文件）— 当前状态和未完成任务
3. `OPTIMIZATION.md` — 如果要继续优化，从这里挑任务

**当前建议的下一步**：
- 继续 **P2 功能完善** — 版本历史 (#32)、空状态引导 (#24)、替换功能 (#19)、搜索历史 (#18)
- 或启动 **P3 远期功能** — 表格块 (#5)、虚拟滚动 (#34)、系统托盘 (#30)

**注意**：
- 任何修改如果涉及功能变更或 bug 修复，必须同步更新版本号
- 修改完成后需要运行完整 build 验证，commit 并 push 到 GitHub
- 使用 bash 命令时建议加 `rtk` 前缀（项目配置了 RTK 过滤）

请告诉我你打算先处理哪个任务，确认后我们开始。
```
