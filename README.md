# ZenNote (墨迹)

一款本地优先的块级 Markdown 笔记软件，支持类 Notion 的编辑体验和 S3 云端同步。

> **状态**：Phase 1 MVP 开发中（本地编辑器 + SQLite）

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS v3
- **桌面端**：Tauri v2 (Rust)
- **后端**：Golang (Gin) + SQLite (`modernc.org/sqlite`，纯 Go 实现)
- **搜索**：SQLite FTS5

---

## 项目结构

```
ZenNote/
├── frontend/               # React 前端源码
│   ├── src/components/     # UI 组件
│   ├── src/api/            # HTTP API 客户端
│   ├── src/types/          # TypeScript 类型定义
│   └── ...
├── src-tauri/              # Tauri 桌面端壳 (Rust)
├── backend/                # Go 后端服务
│   ├── internal/
│   │   ├── api/            # REST API 路由
│   │   ├── db/             # SQLite 初始化与数据层
│   │   └── models/         # 数据模型
│   └── main.go             # 服务入口
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

打开**单独的终端**，运行：

```bash
cd backend
# Windows
.\zennote-backend.exe

# 或直接从源码编译运行
go run .
```

后端默认监听：`http://localhost:8080`

> 首次启动会自动在工作目录创建 `ZenNoteWorkspace` 文件夹和 SQLite 数据库。

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

---

## 当前已实现功能 (Phase 1 MVP)

- [x] Windows 自定义无边框标题栏
- [x] 页面树侧边栏（嵌套层级、新建页面）
- [x] 多标签页（类似 VS Code）
- [x] 块编辑器（Paragraph、Heading、Bullet/Numbered/Todo List、Divider、Code）
- [x] Markdown 快捷输入（`# `、`- `、`[] `、`1. `、`> ` 等）
- [x] SQLite 本地持久化 + 自动保存
- [x] 全局搜索（基于 SQLite FTS5，快捷键 `Ctrl+P`）
- [x] 深色主题 UI

---

## 开发路线图

- **Phase 2**：S3 云端同步、Web 端适配
- **Phase 3**：AI 辅助（`/ai` 续写/润色）
- **Phase 4**：插件系统、导出 Markdown/ZIP

---

## 许可证

MIT
