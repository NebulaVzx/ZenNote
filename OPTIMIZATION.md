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

### 3. 行内格式丢失
- **现状**：`document.execCommand('bold')` 产生的 `<b>` 标签在切换 active/inactive 块时丢失，因为 `innerText` 不保留 HTML
- **对标**：Notion / 语雀行内格式完全持久化
- **难度**：XL | **影响**：High
- **建议**：
  - 方案 A：将 `content` 字段改为存储 innerHTML 而非 innerText
  - 方案 B：引入轻量标记（类似 Markdown inline），渲染时转换
  - 需要同步修改后端 FTS5 搜索逻辑（提取纯文本建索引）

### 4. 图片 / 附件插入
- **现状**：不支持任何图片或附件
- **对标**：Notion 拖拽/粘贴即插入；语雀支持本地/网络图片；思源支持 `/assets` 目录
- **难度**：XL | **影响**：High
- **建议**：
  - Phase 4 范围，但建议尽早设计数据模型
  - 块类型新增 `image`、`file`，content 存文件路径，文件存 `.zennote/assets/`
  - 支持粘贴剪贴板图片 → 写入本地文件 → 插入 image 块

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

### 8. 有序列表序号自动递增
- **现状**：所有 numbered_list 块前缀都是硬编码的 `1.`
- **对标**：Notion / 语雀自动计算序号
- **难度**：M | **影响**：Med
- **建议**：渲染时向前查找连续 numbered_list 块，计算当前序号

### 9. Todo 完成态样式 [FIXED ✅]
- **状态**：v0.2.3 已修复。勾选 todo 后文字显示删除线 + 变灰。
- **修复位置**：`frontend/src/components/Editor.tsx`

### 10. 块菜单（右侧 `+` / `⋯`）
- **现状**：无右键菜单或块操作菜单
- **对标**：Notion 悬浮 `⋮⋮` 出菜单（Delete / Duplicate / Turn into / Copy）；语雀行首 `+` 插入
- **难度**：L | **影响**：High
- **建议**：
  - 悬浮或右键弹出：Delete、Duplicate、Turn into (切换块类型)、Copy block
  - 可复用 SlashCommand 的块类型列表做 Turn into

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

### 12. 页面图标 / Emoji 选择器
- **现状**：页面图标字段 `icon` 存在但未使用，所有页面显示 `FileText` 图标
- **对标**：Notion 页面标题前可插入 Emoji / Icon；语雀支持文档图标
- **难度**：M | **影响**：Med
- **建议**：页面标题旁增加 Emoji picker（可用 `emoji-mart` 或轻量 Unicode picker），存入 `pages.icon`

### 13. 页面收藏 / 快捷入口
- **现状**：无
- **对标**：Notion Favorites；语雀收藏夹；思源书签
- **难度**：M | **影响**：Med
- **建议**：`pages` 表加 `is_favorite INTEGER DEFAULT 0`，Sidebar 顶部渲染 Favorites 区域

### 14. 页面最近编辑排序
- **现状**：页面仅按 `sort_order` 排列
- **对标**：Notion 可按最近编辑排序；语雀 "最近编辑" 列表
- **难度**：S | **影响**：Med
- **建议**：Sidebar 增加 "Recent" 视图，按 `updated_at DESC` 排列

### 15. 右键菜单
- **现状**：侧边栏无右键菜单，所有操作需 hover 显示小按钮
- **对标**：Notion / 语雀 / 思源均有完整右键菜单
- **难度**：M | **影响**：Med
- **建议**：自定义 ContextMenu 组件，包含：New page、Rename、Delete、Duplicate、Add to favorites

### 16. 工作区切换
- **现状**：TitleBar 硬编码 "My Workspace"
- **对标**：Notion 多工作区切换；思源多工作空间
- **难度**：L | **影响**：Low
- **建议**：Phase 4+，需后端支持多 workspace

---

## 三、搜索 (Search)

### 17. 搜索结果跳转定位
- **现状**：全局搜索 (Ctrl+P) 点击结果后仅跳转到页面，不会定位到匹配的 block
- **对标**：Notion 点击搜索结果直接滚动到匹配位置并高亮
- **难度**：M | **影响**：High
- **建议**：搜索结果携带 `block_id`，跳转后 Editor 滚动到对应 block 并闪烁高亮

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

### 20. 自动同步定时器
- **现状**：`auto_sync` 配置存在但后端无定时轮询
- **对标**：Notion 实时同步；语雀定时同步
- **难度**：M | **影响**：Med
- **建议**：后端启动时若 `auto_sync=1`，启动 `time.Ticker` 定时执行 Upload

### 21. 同步进度指示
- **现状**：仅显示 "Upload complete" / "Download complete" 文字 toast
- **对标**：语雀显示同步进度条；Notion 显示同步中状态
- **难度**：M | **影响**：Low
- **建议**：WebSocket 推送同步进度，或前端轮询进度接口

### 22. 导出功能
- **现状**：无
- **对标**：Notion 导出 Markdown / PDF / HTML；语雀导出多种格式；思源导出 .sy.zip
- **难度**：L | **影响**：High
- **建议**：
  - Phase 4 优先实现 Markdown 导出（遍历 blocks 转换为 .md）
  - 后续支持整页/整工作区导出为 ZIP

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

### 31. 回收站
- **现状**：删除页面直接从数据库移除，不可恢复
- **对标**：Notion 30 天回收站；语雀回收站；思源回收站
- **难度**：M | **影响**：High
- **建议**：
  - `pages` 表加 `deleted_at INTEGER`，删除时软删除
  - Sidebar 底部加 "Trash" 入口
  - 30 天后自动清理（后端定时任务）

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

### 36. 后端健康检查 + 重连
- **现状**：前端请求失败仅 console.error
- **对标**：桌面应用应自动重连后端
- **难度**：M | **影响**：High
- **建议**：
  - 前端定时 ping `/api/health`
  - 失败时显示 "连接断开" 提示 + 自动重试
  - 便携版模式：Tauri 检测后端进程挂掉则自动重启

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
1. **行内格式丢失** (#3) — 用户数据丢失
2. **回收站** (#31) — 数据安全底线
3. **后端健康检查 + 重连** (#36) — 便携版可靠性

### P1 — 近期迭代 (体验提升明显)
4. **块菜单** (#10) — 编辑效率飞跃
5. **搜索结果跳转定位** (#17) — 搜索闭环
6. **有序列表序号** (#8) — M 级
7. **自动同步定时器** (#20) — M 级
8. **页面图标 / Emoji** (#12) — M 级
9. **右键菜单** (#15) — M 级

### P2 — 中期规划 (功能完善)
10. **页面收藏** (#13)
11. **撤销 / 重做** (#11)
12. **Markdown 导出** (#22)
13. **骨架屏** (#23)
14. **空状态引导** (#24)
15. **版本历史** (#32)
16. **防抖保存优化** (#35)

### P3 — 远期规划 (差异化)
17. **图片 / 附件** (#4)
18. **表格块** (#5)
19. **暗亮主题** (#28)
20. **虚拟滚动** (#34)
21. **工作区切换** (#16)
22. **系统托盘** (#30)
23. **同步进度** (#21)
24. **替换功能** (#19)
25. **冲突 UI** (#33)
26. **搜索历史** (#18)
27. **最近编辑** (#14)

---

> 文档生成时间：2026-04-17 | 当前版本：v0.2.6
