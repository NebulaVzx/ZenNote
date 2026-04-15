# ZenNote (墨迹)

一款本地优先的块级 Markdown 笔记软件，支持类 Notion 的编辑体验和 S3 兼容存储的云端同步。

> **状态**：Phase 1 MVP 与 Phase 2 云端同步已完成，进入 Phase 3 AI 辅助开发阶段。Windows 便携版已支持一键打包（含自动 bundled 后端）。

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS v3
- **桌面端**：Tauri v2 (Rust)
- **后端**：Golang (Gin) + SQLite (`modernc.org/sqlite`，纯 Go 实现)
- **搜索**：SQLite FTS5
- **同步**：AWS SDK for Go v2（兼容 S3 / MinIO / 阿里云 OSS）

---

## 项目结构

```
ZenNote/
├── frontend/               # React 前端源码
│   ├── src/components/     # UI 组件（Editor、Sidebar、Search 等）
│   ├── src/api/            # HTTP API 客户端
│   ├── src/types/          # TypeScript 类型定义
│   └── ...
├── src-tauri/              # Tauri 桌面端壳 (Rust)
│   └── icons/              # 应用图标（已替换为自定义 ZenNote 图标）
├── backend/                # Go 后端服务
│   ├── internal/
│   │   ├── api/            # REST API 路由（页面、块、搜索、同步）
│   │   ├── db/             # SQLite 初始化与数据层
│   │   ├── models/         # 数据模型
│   │   └── sync/           # S3 客户端与同步逻辑
│   └── main.go             # 服务入口
├── .memory-bank/           # 项目记忆银行（交接文档）
│   ├── brief.md
│   ├── product.md
│   └── context.md
├── Requirements.md         # 产品需求文档 (PRD)
└── README.md               # 本文档
```

> **说明**：前端与后端分别放在 `frontend/` 和 `backend/` 中，`src-tauri/` 保留 Tauri Rust 代码，结构清晰且便于后续 Web 端独立部署。

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- Rust ≥ 1.70
- Go ≥ 1.21

### 1. 安装依赖

```bash
# 根目录安装 Tauri CLI
npm install

# 前端依赖
cd frontend
npm install
cd ..
```

### 2. 启动后端服务

**开发模式**：打开**单独的终端**，运行：

```bash
cd backend
go run .
```

后端默认监听：`http://localhost:8080`

> 首次启动会自动在工作目录创建 `ZenNoteWorkspace` 文件夹和 SQLite 数据库。

**Release / 便携版**：`ZenNote.exe` 已内置自动 bundled `bin/zennote-backend.exe`，双击即可运行，无需手动启动后端。

### 3. 启动桌面端（开发模式）

在**另一个终端**中，从项目根目录运行：

```bash
npm run tauri dev
```

这会：
1. 启动 Vite 开发服务器（`http://localhost:1420`）
2. 编译并启动 Tauri 桌面窗口

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite Web 前端（在 `frontend/` 内） |
| `npm run build` | 构建前端生产包到 `frontend/dist/` |
| `npm run tauri dev` | 启动 Tauri 桌面端（开发模式） |
| `npm run tauri build` | 打包 Tauri 桌面端安装程序 |
| `cd backend && go run .` | 从源码启动 Go 后端 |
| `cd backend && go build -o zennote-backend.exe .` | 编译后端可执行文件 |
| `scripts\build-portable.bat` | 一键打包 Windows 便携版（含前后端）到 `release/vX.X.X/` |

---

## 已实现功能

### Phase 1: 本地编辑 MVP ✅

- **块级编辑器**
  - Paragraph、Heading（H1/H2）、Bullet List、Numbered List、To-do List
  - 代码块：语法高亮、18 种语言切换、Tab 缩进、优雅 Enter/换行
  - Toggle 折叠块、Divider 分隔线
  - Markdown 快捷语法：`# `、`## `、`- `、`1. `、`[] `、`> `、`\`\`\``
  - Slash Command (`/`) 快速插入块
  - 选中文本浮动工具条（加粗、斜体、删除线、清除格式）
  - 块级拖拽排序（左侧 `⋮⋮` 手柄）
- **页面管理**
  - 无限层级页面树（Sidebar），支持拖拽调整层级
  - 多标签页（类似 VS Code）
  - 页面创建、重命名、单删、批量多选删除
- **搜索**
  - 全局搜索（基于 SQLite FTS5，快捷键 `Ctrl+P`）
  - 页面内搜索高亮 + 上下跳转（快捷键 `Ctrl+F`）
- **数据持久化**
  - SQLite WAL 模式，Block 级自动保存

### Phase 2: S3 云端同步 ✅

- **同步配置**
  - 支持 S3 / MinIO / 阿里云 OSS 等兼容存储
  - 设置面板：Endpoint、Region、Bucket、Prefix、Access Key
  - 连接测试按钮
- **增量同步**
  - 本地 → S3 增量上传（基于 MD5 与修改时间）
  - S3 → 本地增量下载
  - LWW（Last-Write-Wins）冲突解决，旧版本自动备份为 `.conflict-时间戳`
- **同步 UI**
  - 标题栏同步状态指示器
  - 手动 Upload / Download 按钮
  - Auto sync 开关与同步间隔设置

---

## 开发路线图

- **Phase 3**：AI 辅助（配置面板、`/ai` 续写/润色、Ask AI 浮条）
- **Phase 4**：数据导出（Markdown / ZIP）、自定义标题栏、主题切换、回收站、附件上传

---

## 许可证

MIT
