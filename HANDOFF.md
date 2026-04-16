# ZenNote 项目交接文档

> **生成时间**：2026-04-16  
> **当前版本**：v0.2.3  
> **用途**：在新 Thread/Agent 启动时快速同步项目上下文，避免重复探索和遗漏关键信息。

---

## 1. 一句话定位

ZenNote（墨迹）是一款面向知识工作者的**本地优先块级笔记软件**，基于 **Tauri v2 (Rust) + React 19 + Go 1.25 + SQLite** 构建，提供类 Notion 的编辑体验和 S3 兼容存储的云端同步。

---

## 2. 已经完成的核心工作（截至 v0.2.3）

### Phase 1 — 本地编辑 MVP ✅
- 块级编辑器（Paragraph、Heading H1/H2/**H3**、Bullet List、Numbered List、Todo List、**Quote**、Code、Toggle、Divider）
- Markdown 快捷语法：`#`、`##`、`###`、`-`、`1.`、`[]`、`>`、` ``` `
- Slash Command (`/`) 快速插入块
- 选中文本浮动工具条（Bold / Italic / Strikethrough / Clear）
- 块级拖拽排序（左侧 `⋮⋮` 手柄）
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

### v0.2.3 最新 5 项体验优化 ✅
1. Todo 勾选后文字显示删除线 + 变灰
2. 新增 Heading 3（`###` + `/h3`）
3. 新增 Quote 块（`>` + `/quote`）
4. 标题栏新增侧边栏折叠按钮
5. 窗口大小/位置记忆（关闭后重启自动恢复）

---

## 3. 明确未完成的 Pending 任务

| 优先级 | 任务 | 说明 | 关联文件 |
|--------|------|------|----------|
| **P0** | **#13 修复拖拽不流畅 + 强制 Rust 重编译** | 编辑区和侧边栏的块/页面拖拽在 WebView2 中偶现不响应，缺少足够的视觉反馈。 | `frontend/src/components/Editor.tsx`<br>`frontend/src/components/Sidebar.tsx` |
| P1 | **行内格式持久化** | 当前 `Ctrl+B/I/S` 产生的 HTML 标签在切换 active/inactive 块时会丢失，因为 `content` 存的是 `innerText` 而非 `innerHTML`。 | `frontend/src/components/Editor.tsx` |
| P1 | **回收站** | 页面删除是硬删除，不可恢复。需要 `pages.deleted_at` 软删除 + Trash 入口。 | `backend/internal/db/db.go`<br>`frontend/src/components/Sidebar.tsx` |
| P2 | **图片/附件** | 数据库和 UI 均不支持图片插入。 | 全局 |
| P2 | **Undo/Redo** | 依赖浏览器默认行为，不可靠。 | `frontend/src/components/Editor.tsx` |

> 完整的 36 项优化清单见根目录 `OPTIMIZATION.md`。

---

## 4. 关键文件索引

| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | 项目技术栈、目录结构、开发命令、编码规范 |
| `OPTIMIZATION.md` | 36 项体验优化清单（P0~P3 分级） |
| `frontend/src/components/Editor.tsx` | 块编辑器核心，当前有一个 pending bug（拖拽） |
| `frontend/src/components/Sidebar.tsx` | 页面树、拖拽、页面管理 |
| `frontend/src/components/SlashCommand.tsx` | `/` 命令面板 |
| `frontend/src/App.tsx` | 根组件，Sidebar/Tabs/Editor 编排 |
| `frontend/src/components/TitleBar.tsx` | 自定义标题栏 |
| `backend/internal/api/api.go` | Go REST API 路由 |
| `backend/internal/db/db.go` | SQLite 表结构初始化 |
| `src-tauri/src/lib.rs` | Tauri Rust 壳，后端生命周期、窗口状态记忆 |
| `scripts/build-portable.bat` | Windows 便携版一键打包脚本 |
| `C:\Users\Yongbin\.claude\plans\wise-twirling-backus.md` | 上一个已完成的 Plan 文件 |

---

## 5. 已知的工程陷阱

1. **版本号必须全量同步**：`frontend/package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`backend/versioninfo.json`、`SettingsModal.tsx`、`backend/internal/api/api.go`。
2. **Go 后端编译参数**：`-H=windowsgui -s -w`，否则便携版会弹出命令行窗口。
3. **Tauri 输出 exe 名称**：Cargo 包名是 `tauri-app`，所以 release 产物是 `tauri-app.exe`，打包脚本中需要改名为 `ZenNote.exe`。
4. **Editor 的 `normalizeText` 会 trim()**：所以 Markdown 快捷语法判断不能依赖末尾空格（比如用 `'[]'` 而非 `'[] '`）。
5. **RTK 前缀**：项目中使用了 RTK（Rust Token Killer）过滤工具，bash 命令前建议加 `rtk` 前缀节省 token。

---

## 6. 推荐的下一步行动

如果接手时没有明确新需求，**默认按以下顺序处理**：

1. **修复 #13 拖拽不流畅**（用户多次提到）
2. **实现回收站**（数据安全底线，工程量大但优先级高）
3. **实现回收站**（数据安全底线，工程量大但优先级高）
4. **解决行内格式持久化**（编辑器核心体验）
5. **从 `OPTIMIZATION.md` 中挑选 S/M 级优化继续做**

---

## 7. 快速验证指令

```bash
# 前端类型检查
cd frontend && npx tsc --noEmit

# Rust 检查
cd src-tauri && cargo check

# 一键打包（Windows）
scripts/build-portable.bat
```

---

## 8. 给新 Agent 的交接话术（复制即用）

```
请继续开发 ZenNote 项目。

**当前版本**：v0.2.3，GitHub 已 push，tag 已打。

**必读文件**（按顺序）：
1. `CLAUDE.md` — 技术栈和开发规范
2. `HANDOFF.md`（本文件）— 当前状态和未完成任务
3. `OPTIMIZATION.md` — 如果要继续优化，从这里挑任务

**必须优先处理的 Pending Bug**：
- #13 拖拽不流畅：`frontend/src/components/Editor.tsx` + `Sidebar.tsx`

**注意**：
- 任何修改如果涉及功能变更或 bug 修复，必须同步更新版本号（当前应 bump 到 0.2.4）
- 修改完成后需要运行完整 build 验证，commit 并 push 到 GitHub
- 使用 bash 命令时建议加 `rtk` 前缀（项目配置了 RTK 过滤）

请告诉我你打算先处理哪个任务，确认后我们开始。
```
