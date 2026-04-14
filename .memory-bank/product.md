# ZenNote 产品功能与目标

## 核心定位
本地优先的 Markdown 原生块级笔记软件，提供类 Notion 的交互体验与离线安全感，支持自托管 S3 同步。

---

## 已实现功能

### Phase 1: 本地编辑 MVP (已完成)
- **块级编辑器**
  - Paragraph、Heading（H1/H2）、Bullet List、Numbered List、To-do List
  - 代码块（语法高亮、18 种语言切换）
  - Toggle 折叠块、Divider 分隔线
  - Markdown 快捷语法：`# `、`## `、`- `、`1. `、`[] `、`> `、`\`\`\``
  - Slash Command (`/`) 快速插入块
  - 选中文本浮动工具条（加粗、斜体、删除线、清除格式）
- **页面管理**
  - 无限层级页面树（Sidebar）
  - 多标签页（Tabs）
  - 页面创建、重命名、单删、批量多选删除
  - 页面树拖拽排序（支持父子层级调整）
- **搜索**
  - 全局搜索（FTS5）
  - 页面内搜索高亮 + 上下跳转
- **数据持久化**
  - SQLite WAL 模式
  - Block 级增删改查

### Phase 2: S3 云端同步 (已完成)
- **同步配置**
  - S3 / MinIO / 阿里云 OSS 兼容配置面板
  - 连接测试按钮
- **增量同步**
  - 本地 → S3 增量上传（基于文件修改时间和 MD5）
  - S3 → 本地增量下载
  - LWW（Last-Write-Wins）冲突解决，旧版本自动备份为 `.conflict-时间戳`
- **同步 UI**
  - 标题栏同步状态指示器
  - 手动 Upload / Download 按钮
  - Auto sync 开关与同步间隔设置

---

## 待实现功能 (Roadmap)

### Phase 3: AI 辅助与 polish
- [ ] AI 配置面板（OpenAI / 自定义 BaseURL / Ollama）
- [ ] `/ai` Slash Command 续写
- [ ] 选中文本后 "Ask AI" 浮条（润色、翻译、解释）
- [ ] AI 生成内容的 Diff / 接受拒绝交互

### Phase 4: 稳定与扩展
- [ ] 数据导出（单页 `.md`、整个 Workspace `.zip`）
- [ ] 自定义标题栏（Windows 非原生边框）
- [ ] 深色/浅色主题切换
- [ ] 块级拖拽排序（Editor 内 Block 顺序调整）
- [ ] 页面树折叠/展开状态持久化
- [ ] 回收站（软删除）
- [ ] 附件/图片上传与本地存储
