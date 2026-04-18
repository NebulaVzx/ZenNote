# ZenNote — Claude Code Context

ZenNote（墨迹）是一款面向知识工作者的本地优先块级笔记软件，提供类 Notion 的编辑体验，支持 S3 兼容存储的云端同步。

## Tech Stack
- **Desktop**: Tauri v2 (Rust)
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v3
- **Backend**: Go 1.25 + Gin
- **Database**: SQLite (modernc.org/sqlite) + FTS5
- **Sync**: AWS SDK for Go v2 (S3/MinIO/OSS compatible)

## Directory Structure
```
frontend/src/          # React app
  components/          # Editor.tsx, Sidebar.tsx, SettingsModal.tsx, etc.
  api/index.ts         # Axios client to Go backend
backend/internal/
  api/api.go           # Gin routes & handlers
  db/db.go             # SQLite schema & queries
  models/              # Go structs
  sync/                # S3 client & sync logic
src-tauri/             # Tauri Rust shell
```

## Common Commands
- **Dev**: `cd frontend && npm run dev` (Vite dev server) + `cd backend && go run .` (Go backend)
- **Build**: `cd frontend && npm run build` then `cd src-tauri && cargo tauri build`
- **Backend test**: `cd backend && go test ./...`

## Coding Conventions
- **Frontend**: Use functional components + hooks. Prefer `const` arrow functions. Tailwind classes sorted logically (layout → spacing → color → typography).
- **Backend**: Handler functions in `api.go` receive `*gin.Context`. Return JSON with `c.JSON(http.StatusOK, data)` or `c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})`.
- **Database**: Use `sql.NullString` for nullable text fields. Migration-style schema init in `db.go`.
- **Naming**: Go files snake_case, React components PascalCase, hooks camelCase starting with `use`.

## Current Phase
Phase 3 AI-assisted writing (v0.2.6) 已完成。v0.3.0 新增 Markdown 互操作 + 图片插入。

接下来的主要方向：
1. **AI 增强** — 流式输出、更多 action（摘要 / 改写语气 / 代码生成）
2. **编辑器体验** — Undo/Redo、表格块、代码块语法高亮
3. **P2 完善** — 骨架屏、空状态引导、版本历史

## Key Files
- `backend/internal/api/api.go` — add new HTTP routes here.
- `backend/internal/db/db.go` — add schema & queries here.
- `frontend/src/components/Editor.tsx` — block editor core.
- `frontend/src/components/SettingsModal.tsx` — settings UI.
- `frontend/src/api/index.ts` — frontend API client.
- `frontend/src/utils/markdown.ts` — Markdown ↔ Blocks parser & generator.
- `frontend/src/components/TitleBar.tsx` — File menu (open/export Markdown).
- `src-tauri/src/lib.rs` — Tauri commands (file dialogs, image asset copy).

## Instructions for Claude
- **Do not** explore `node_modules/` or `src-tauri/target/`.
- For multi-file changes, enter **Plan Mode** first and confirm the approach.
- When compacting context, preserve decisions on tech choices and current active file targets.
- Keep responses concise; avoid long explanations when only code changes are needed.
