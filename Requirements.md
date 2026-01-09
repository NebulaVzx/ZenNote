# 墨迹 (ZenNote) 产品需求文档 (PRD)

> 版本：v0.1 可实现版  
> 日期：2026-04-14  
> 状态：需求确认 & 待开发

---

## 1. 项目概述

### 1.1 产品定位
墨迹（ZenNote）是一款面向知识工作者的 **Markdown 原生块级笔记软件**，强调"本地优先 + 云端同步"，提供类 Notion 的交互体验与类思源/语雀的离线安全感。

### 1.2 目标平台
| 平台 | 优先级 | 说明 |
|------|--------|------|
| Windows 桌面端 | P0 | 主力平台，以桌面端体验为核心 |
| Web 端 | P1 | 作为辅助访问与轻量编辑入口 |
| macOS/Linux 桌面端 | P2 | 后续扩展 |

### 1.3 核心差异化
- **本地优先**：所有数据先落本地 SQLite/文件，离线可完整使用。
- **S3 同步**：自托管成本低，用户可自由选择存储后端（MinIO、阿里云 OSS、AWS S3 等）。
- **类 IDE 的 AI 辅助**：在编辑器内无缝获得 Cursor 式的 AI 建议。

---

## 2. 术语表

| 术语 | 定义 |
|------|------|
| **Block（块）** | 笔记中的最小内容单元，如段落、标题、列表项、代码块等。 |
| **Page（页面）** | 由多个 Block 组成的文档，是笔记的基本组织单位。 |
| **Workspace（工作区）** | 用户的顶层数据容器，对应一个本地文件夹 + 一个云端同步配置。 |
| **Slash Command** | 输入 `/` 唤起的快捷命令面板。 |
| **Floating Toolbar** | 选中文本后浮出的格式化工具条。 |

---

## 3. 功能需求 (Functional Requirements)

### 3.1 编辑器核心 (Editor Core)

#### FR-EC-01 块级 Markdown 编辑
- 编辑器采用 **Block-based WYSIWYG** 架构（类似 Notion / 思源）。
- 支持通过 Markdown 语法快速触发格式转换：
  - `#` + 空格 → 标题 1；`##` + 空格 → 标题 2，依此类推。
  - `-` + 空格 → 无序列表。
  - `1.` + 空格 → 有序列表。
  - `[]` + 空格 → Todo 复选框。
  - `>` + 空格 → 引用块。
  - `` ``` `` + 空格/回车 → 代码块。
  - `---` + 回车 → 分隔线。
- 触发转换后，当前 Block 应立即渲染为对应样式，且光标保持在块内。

#### FR-EC-02 Slash Command（/ 命令）
- 在空 Block 内输入 `/` 时，弹出命令面板。
- 面板支持键盘上下选择、回车确认、Esc 关闭。
- 首期必须支持的命令：
  | 命令 | 别名/关键词 | 行为 |
  |------|------------|------|
  | Heading 1 | `/h1` | 转为 H1 |
  | Heading 2 | `/h2` | 转为 H2 |
  | Bullet List | `/list` | 转为无序列表 |
  | Numbered List | `/num` | 转为有序列表 |
  | To-do List | `/todo` | 转为待办列表 |
  | Code Block | `/code` | 转为代码块 |
  | Markdown Block | `/md` `/dmk` | 转为纯 Markdown 编辑块（可选兼容旧习惯） |
  | Toggle List | `/toggle` | 转为可折叠列表块 |
  | Divider | `/divider` | 插入分隔线 |
  | AI 续写 | `/ai` | 调用 AI 基于上下文生成内容 |

#### FR-EC-03 代码块 (Code Block)
- 代码块支持语法高亮（基于 PrismJS / Shiki）。
- 支持语言选择下拉框。
- 支持复制按钮。

#### FR-EC-04 折叠块 (Toggle Block)
- 折叠块包含一个 **标题行** 和一个可展开/收起的 **内容区**。
- 内容区内可以嵌套任意其他 Block。
- 左侧提供 ▶/▼ 切换图标。

#### FR-EC-05 拖拽与选中
- 支持通过拖拽左侧的 "块手柄"（Block Handle）移动 Block 顺序。
- 支持 Shift + 点击 多选连续 Block，进行批量删除或移动。
- 支持 `/` 命令转换多选 Block（如同时把多个段落转成待办）。

#### FR-EC-06 富文本内联格式
- 选中文本后，弹出 Floating Toolbar，提供：
  - 加粗 (Ctrl+B)
  - 斜体 (Ctrl+I)
  - 行内代码 (Ctrl+E)
  - 删除线
  - 超链接 (Ctrl+K)
  - 高亮/背景色
- 支持 Markdown 快捷键：`**text**`、`*text*`、`` `text` `` 等实时渲染。

---

### 3.2 页面与导航 (Pages & Navigation)

#### FR-PN-01 侧边栏导航
- 左侧固定侧边栏，包含：
  - **搜索框**（可全局搜索）。
  - **页面树**（无限层级嵌套）。
  - **快捷入口**（最近浏览、收藏、回收站）。
  - **同步状态指示器**（未同步/同步中/已同步/冲突）。
- 支持拖拽页面调整层级和顺序。

#### FR-PN-02 多标签页 (Tabs)
- 编辑区顶部显示标签栏，类似 Chrome / VS Code。
- 标签页行为：
  - 点击页面树中的页面 → 在当前标签页打开（若已打开则切换）。
  - 中键/右键关闭标签。
  - 支持固定标签（Pin Tab）。
  - 关闭软件后重启，恢复上次打开的标签页（可选配置）。

#### FR-PN-03 页面属性
- 每个页面包含元数据：标题、创建时间、更新时间、图标、封面图。
- 页面标题实时同步到标签页和页面树中。

---

### 3.3 搜索 (Search)

#### FR-SR-01 全局搜索
- 快捷键：`Ctrl+Shift+F`（或 `Ctrl+P` 快速跳转）。
- 搜索范围：所有页面标题 + 所有 Block 文本内容。
- 结果展示：页面标题 + 匹配文本高亮上下文 + 跳转链接。
- 支持模糊搜索（基于本地 SQLite FTS5 或 FlexSearch）。

#### FR-SR-02 页面内搜索
- 快捷键：`Ctrl+F`。
- 在当前页面内高亮所有匹配结果，支持上下跳转。

---

### 3.4 数据与同步 (Data & Sync)

#### FR-DS-01 本地优先存储
- 所有数据默认保存在本地 Workspace 文件夹中。
- 页面内容存储格式：**SQLite**（便于 FTS 搜索与块级 CRDT/增量同步）。
- 同时定期导出为 **Markdown 文件**作为冗余备份/可迁移格式（隐藏目录 `.zennote/export`）。
- 附件（图片等）直接保存在本地文件系统中。

#### FR-DS-02 S3 云端同步
- 用户可在设置中配置 S3 同步桶：
  - Endpoint、Bucket、Region、AccessKey、SecretKey。
  - 可选前缀（Prefix）用于多设备隔离。
- 同步策略：
  - **增量同步**：仅上传/下载变更的 SQLite WAL 或差异块。
  - **冲突解决**：基于时间戳的 Last-Write-Wins（LWW），冲突时生成分支副本供用户手动合并。
  - **手动同步按钮** + **自动同步间隔**（默认 5 分钟，可配置）。
- 首次同步时，本地数据与云端数据做全量比对合并。

#### FR-DS-03 离线可用
- 无网络时，所有编辑功能完全可用。
- 有网络恢复后，自动排队并执行同步。
- 同步状态需在 UI 中明确展示（图标/提示）。

#### FR-DS-04 数据导出
- 支持导出整个 Workspace 为 `.zip`。
- 支持导出单页面为 `.md` 文件。

---

### 3.5 UI/UX (界面与体验)

#### FR-UI-01 自定义标题栏
- Windows 桌面端**不使用原生标题栏**，采用自定义绘制：
  - 左侧：窗口图标 + 工作区名称。
  - 中间：可拖拽区域（双击最大化/还原）。
  - 右侧：最小化、最大化、关闭按钮。
- 支持系统级右键菜单（还原、移动、大小、最小化、最大化、关闭）。

#### FR-UI-02 主题与外观
- 支持浅色 / 深色模式，跟随系统或手动切换。
- 主色调采用中性、低饱和配色（参考 Notion / 语雀）。
- 字体：正文使用系统无衬线字体（如 Segoe UI / PingFang SC），代码块使用等宽字体（如 JetBrains Mono / Fira Code）。

#### FR-UI-03 响应式布局
- Web 端适配：侧边栏可收起，编辑器区自适应宽度（最大 900px 居中，或全宽可选）。
- 桌面端：默认固定侧边栏 + 可调整宽度的编辑器区。

---

### 3.6 AI 辅助 (AI Assistant)

#### FR-AI-01 AI 续写/润色
- 在编辑器中，通过 `/ai` 或选中文本后点击 "Ask AI" 唤起。
- 功能选项：
  - **续写**：基于上文生成后续内容。
  - **润色**：改进表达。
  - **翻译**：翻译成指定语言。
  - **解释**：解释选中概念。
- AI 生成内容以 Diff / 候选块形式插入，用户需点击 **接受/拒绝** 才能正式落盘。

#### FR-AI-02 AI 配置
- 用户在设置中配置 AI Provider（OpenAI API / 本地 Ollama / 自定义 BaseURL + Model）。
- API Key 保存在本地加密存储中（或使用系统凭据管理器）。

---

## 4. 非功能需求 (Non-Functional Requirements)

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| NFR-01 | 性能 | 打开 1000 页面的工作区，侧边栏加载 < 2s；搜索 10,000 条记录 < 500ms。 |
| NFR-02 | 兼容性 | Windows 10/11 桌面端稳定运行；Web 端支持 Chrome/Edge/Firefox/Safari 最新两版。 |
| NFR-03 | 离线 | 断网后所有本地操作零报错；恢复网络后 10s 内自动重试同步。 |
| NFR-04 | 安全 | 本地 SQLite 可配置加密；S3 密钥与 AI Key 不落日志、不上传除配置外的第三方。 |
| NFR-05 | 可扩展 | 后端接口设计预留 WebDAV、阿里云盘等扩展点；前端 Slash Command 插件化预留。 |

---

## 5. 技术架构

### 5.1 整体架构
```
┌─────────────────────────────────────────────┐
│           Windows Desktop (Tauri/Electron)   │
│  ┌───────────────────────────────────────┐   │
│  │      React + Block Editor Frontend    │   │
│  └───────────────────────────────────────┘   │
│  ┌───────────────────────────────────────┐   │
│  │   Golang Backend (Embedded / Sidecar) │   │
│  │   - SQLite (数据存储 + FTS)            │   │
│  │   - S3 Sync Client                    │   │
│  │   - AI Proxy / Local LLM Bridge       │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│           Web Server (Golang + Gin/Fiber)   │
│   - REST API / WebSocket                    │
│   - Auth (JWT, 可选)                        │
│   - S3 Sync Orchestration                   │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│              S3-Compatible Storage          │
│         (MinIO / Aliyun OSS / AWS S3)       │
└─────────────────────────────────────────────┘
```

### 5.2 技术栈确认
| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React 18+ | 组件化、生态成熟。 |
| 桌面端壳 | **Tauri v2** (Rust) 或 **Electron** | 推荐 Tauri（体积小、性能高、自定义标题栏简单），若团队熟悉 Electron 亦可。 |
| 块编辑器 | 自研 或 基于 **BlockNote** / **Slate.js** / **ProseMirror** | 自研成本最高但可控；BlockNote 是 React 友好型方案，建议评估。 |
| 后端服务 | Golang (Gin / Echo / Fiber) | 高并发、编译产物单一，适合桌面端内嵌。 |
| 数据库 | SQLite3 (+ `go-sqlite3` 或 `mattn/go-sqlite3`) | 本地优先首选；启用 WAL 模式提升并发。 |
| 全文搜索 | SQLite FTS5 或 Bleve | FTS5 零依赖，优先采用。 |
| 同步协议 | S3 (AWS SDK for Go v2) | 先支持 PUT/GET/List/Delete 对象操作。 |
| AI 接口 | OpenAI API 兼容格式 | 可对接任意 OpenAI-like 端点。 |

### 5.3 数据模型 (核心表结构)

#### `workspaces`
```sql
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    local_path TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
);
```

#### `pages`
```sql
CREATE TABLE pages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    parent_id TEXT,
    title TEXT,
    icon TEXT,
    cover_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (parent_id) REFERENCES pages(id)
);
```

#### `blocks`
```sql
CREATE TABLE blocks (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    type TEXT NOT NULL,          -- paragraph, heading, list_item, code, toggle, etc.
    content TEXT,                -- 纯文本或 JSON
    props TEXT,                  -- JSON: { level: 2, language: "go", checked: true }
    parent_id TEXT,              -- 用于嵌套（toggle、列表）
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (page_id) REFERENCES pages(id),
    FOREIGN KEY (parent_id) REFERENCES blocks(id)
);
```

#### `attachments`
```sql
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    mime_type TEXT,
    size INTEGER,
    created_at INTEGER
);
```

#### FTS5 虚拟表
```sql
CREATE VIRTUAL TABLE blocks_fts USING fts5(
    content,
    content='blocks',
    content_rowid='rowid'
);
-- 通过 triggers 同步 blocks_fts
```

---

## 6. 开发阶段规划

### Phase 1：MVP 本地编辑器 (4~6 周)
**目标**：Windows 桌面端可本地创建、编辑、保存 Markdown 页面。

| 周次 | 任务 |
|------|------|
| W1 | 项目脚手架搭建（Tauri + React + Golang 内嵌服务），自定义标题栏。 |
| W2 | 块编辑器基础（Paragraph、Heading、List、Divider），Markdown 快捷键。 |
| W3 | Slash Command 实现，页面树侧边栏，多标签页。 |
| W4 | SQLite 数据持久化，页面增删改查，页面树拖拽排序。 |
| W5 | 全局/局部搜索（FTS5），页面内搜索高亮。 |
| W6 | 代码块、折叠块，UI 打磨，深色模式。 |

### Phase 2：S3 同步与 Web 端 (3~4 周)
**目标**：实现 S3 云端同步，并部署 Web 端作为辅助入口。

| 周次 | 任务 |
|------|------|
| W1 | Golang S3 Sync Client，增量上传/下载逻辑。 |
| W2 | 冲突检测与 LWW 合并策略，同步状态 UI。 |
| W3 | Web 端适配（React SPA + Golang API），离线支持评估（PWA / 缓存）。 |
| W4 | 同步设置面板，端到端测试。 |

### Phase 3：AI 辅助与高级功能 (2~3 周)
**目标**：接入 AI，完善产品体验。

| 周次 | 任务 |
|------|------|
| W1 | AI 配置面板，/ai Slash Command，选中文本 Ask AI 浮条。 |
| W2 | 续写/润色/翻译 Diff 展示，接受/拒绝交互。 |
| W3 | 数据导出（Markdown / Zip），性能优化，Bug 修复。 |

### Phase 4：稳定与扩展 (持续)
- 用户反馈迭代。
- 扩展 WebDAV、阿里云盘等同步后端。
- 插件系统 / 模板市场。

---

## 7. 里程碑与 Git 提交规范

- **每个 Phase 结束后**，进行一次 Git 提交并推送到 GitHub。
- 提交信息遵循：`feat(phase1): 完成本地编辑器 MVP`
- 关键节点打 Tag：`v0.1.0-alpha`、`v0.2.0-beta` 等。

---

## 8. 风险与假设

| 风险 | 缓解措施 |
|------|----------|
| 块编辑器自研成本高 | Phase 1 优先集成 BlockNote 或 Slate，避免从零造轮子。 |
| S3 同步冲突复杂 | 首期采用 LWW，明确告知用户冲突处理策略，后续引入 CRDT。 |
| Tauri 与 Golang 内嵌通信 | 使用 Tauri 的 Command 调用 Golang HTTP 服务（localhost），降低耦合。 |
| Windows 自定义标题栏边缘 case | 充分测试最大化、多显示器 DPI、系统休眠恢复后的状态。 |

---

## 9. 附录：参考产品

- **Notion**：块级编辑、Slash Command、多标签页。
- **思源笔记**：本地优先、Markdown 导出、自定义存储路径。
- **语雀**：简洁 UI、目录树、文档管理。
- **Cursor**：AI Diff 交互、Inline 建议。

---

*本文档作为 ZenNote 的开发基准。后续如有功能变更，需在此文档中更新并记录变更日志。*
