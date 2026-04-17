# ZenNote 项目交接文档

> **生成时间**：2026-04-17
> **当前版本**：v0.2.5
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

---

## 3. 明确未完成的 Pending 任务

| 优先级 | 任务 | 说明 | 关联文件 |
|--------|------|------|----------|
| P1 | **行内格式持久化** | 当前 `Ctrl+B/I/S` 产生的 HTML 标签在切换 active/inactive 块时会丢失，因为 `content` 存的是 `innerText` 而非 `innerHTML`。 | `frontend/src/components/Editor.tsx` |
| P1 | **回收站** | 页面删除是硬删除，不可恢复。需要 `pages.deleted_at` 软删除 + Trash 入口。 | `backend/internal/db/db.go`<br>`frontend/src/components/Sidebar.tsx` |
| P2 | **图片/附件** | 数据库和 UI 均不支持图片插入。 | 全局 |
| P2 | **Undo/Redo** | 依赖浏览器默认行为，不可靠。 | `frontend/src/components/Editor.tsx` |

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

1. **先完成 2 个 S 级高影响优化作为快速胜利**：
   - **#25 快捷键提示面板** (`Ctrl+/`)：提升新用户上手体验，改动小
   - **#26 Toast 通知组件**：统一操作反馈，为后续 Phase 3 的 AI 生成/保存状态提供基础设施

2. **然后正式启动 Phase 3（AI-assisted writing）**：
   - AI config panel（`ai_configs` 表 + CRUD API）
   - `/ai` slash command
   - "Ask AI" 浮动工具条
   - Diff / accept-reject UI

**为什么不先碰 P0/P1 的大坑**：
- **行内格式持久化**（#3）是 XL 级，涉及数据模型和 FTS5 搜索改造，短期内投入产出比不高
- **回收站**（#31）虽然重要，但当前用户规模下数据误删概率可控，且是 M 级工程，会拖慢 Phase 3 启动节奏
- **S 级优化**能在 1 天内交付可感知的体验提升，同时 Phase 3 是 CLAUDE.md 明确规划的当前重点，应该尽快进入

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

**当前版本**：v0.2.5，GitHub 已 push，tag 已打。

**必读文件**（按顺序）：
1. `CLAUDE.md` — 技术栈和开发规范
2. `HANDOFF.md`（本文件）— 当前状态和未完成任务
3. `OPTIMIZATION.md` — 如果要继续优化，从这里挑任务

**当前建议的下一步**：
- 先完成 2 个 S 级优化（#25 快捷键提示面板、#26 Toast 通知）作为快速胜利
- 然后启动 Phase 3（AI-assisted writing），从 AI config panel 开始

**注意**：
- 任何修改如果涉及功能变更或 bug 修复，必须同步更新版本号
- 修改完成后需要运行完整 build 验证，commit 并 push 到 GitHub
- 使用 bash 命令时建议加 `rtk` 前缀（项目配置了 RTK 过滤）

请告诉我你打算先处理哪个任务，确认后我们开始。
```
