# ZenNote Backend

ZenNote 的本地后端服务，基于 Golang + Gin + SQLite 构建。

## 职责

- 管理本地 SQLite 数据库（页面、块、附件、工作区）
- 提供 REST API 供前端调用
- 支持 SQLite FTS5 全文搜索
- （Phase 2）实现 S3 增量同步客户端

## 目录结构

```
backend/
├── main.go                 # 服务入口，启动 HTTP 服务器
├── internal/
│   ├── api/
│   │   └── api.go          # Gin 路由注册（REST API）
│   ├── db/
│   │   └── db.go           # SQLite 初始化、表结构、FTS5 触发器
│   └── models/
│       └── models.go       # Page / Block / Workspace / SearchResult 结构体
└── go.mod                  # Go 模块定义
```

## 技术选型

- **Web 框架**：Gin
- **数据库**：SQLite（通过 `modernc.org/sqlite` 纯 Go 驱动，无需 CGO）
- **搜索**：SQLite FTS5 虚拟表 + 触发器自动同步

## 本地开发

### 安装依赖

```bash
cd backend
go mod tidy
```

### 编译

```bash
# Windows
go build -o zennote-backend.exe .

# Linux/macOS
go build -o zennote-backend .
```

### 运行

```bash
# 使用默认工作区（当前目录下的 ZenNoteWorkspace）
.\zennote-backend.exe

# 或指定自定义工作区路径
.\zennote-backend.exe -workspace "D:\\MyNotes"
```

服务启动后会输出：
```
ZenNote backend listening on http://localhost:8080
```

## API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/pages` | 列出所有页面 |
| POST | `/api/pages` | 创建新页面 |
| GET | `/api/pages/:id` | 获取页面详情 |
| PUT | `/api/pages/:id` | 更新页面标题 |
| DELETE | `/api/pages/:id` | 删除页面 |
| GET | `/api/pages/:id/blocks` | 获取页面的所有块 |
| PUT | `/api/pages/:id/blocks` | 全量更新页面块 |
| GET | `/api/search?q=xxx` | 全局搜索块内容 |

## 数据存储

默认在可执行文件同级目录创建：

```
ZenNoteWorkspace/
└── .zennote/
    └── data.db          # SQLite 主数据库
    └── data.db-wal      # WAL 日志
    └── data.db-shm      # WAL 共享内存
```

## 注意事项

- 前端开发时，Vite 已配置代理：`/api` → `http://localhost:8080`
- 生产打包时，Tauri 需要将后端二进制文件配置为 **sidecar** 自动启动
