# Eagle Vault Viewer

只读查看 NAS 上同步的 Eagle 资源库：在浏览器中按文件夹浏览、预览、下载素材。无需写权限，不修改库内任何文件。

**版本**：v1.5.1（2026-05-08）

**License**：MIT

## 功能

- **浏览**：解析 Eagle 库的文件夹树（`metadata.json`），按文件夹展示素材（各 `*.info/metadata.json`）
- **视图**：全部文件、最近 7 天 / 30 天、按文件夹、按标签、搜索
- **增量加载**：全部文件、最近、文件夹、标签与搜索视图按批次自动续载，滚动到底部时继续加载更多，避免一次性渲染全量结果
- **瀑布流布局**：素材按原始宽高比展示，不裁切缩略图；支持网格（瀑布流）与列表两种视图切换；当结果主要由无缩略图文件构成时，自动切换为左对齐的固定宽度紧凑网格，避免空列、异常放大或纵向错位
- **Inspector 面板**：点击素材右侧滑出详情面板，展示大图预览、文件名、格式、尺寸、大小、时间、文件夹路径、标签、来源 URL、备注等
- **左侧导航**：文件夹树可展开/折叠；导航栏宽度可拖拽调节；文件夹右侧显示含子文件夹在内的总文件数；整栏支持隐藏/展开，状态存本地
- **毛玻璃侧边栏**：现代 frosted glass 视觉风格
- **排序与筛选**：按修改时间 / 创建时间 / 名称 / 大小 / 格式排序；按类型筛选（图片 / 视频 / 文档 / 音频 / 其他）
- **高级筛选**：支持按最小尺寸、文件大小范围、横图 / 竖图 / 方图、有无标签、有无备注、有无来源 URL 组合筛选
- **保存视图**：可将当前视图、排序、类型与高级筛选保存为本地快捷入口
- **索引状态**：查看最近一次扫描的文件数、文件夹数、标签数、扫描耗时与跳过统计
- **本地清单**：可将素材加入收藏或待整理清单；清单仅存浏览器本地，不写入 Eagle 库
- **命令面板**：支持 `Cmd/Ctrl+K` 快速打开视图、标签、文件夹、保存视图与工具入口
- **疑似重复**：按文件大小、尺寸与格式找出可能重复的素材组
- **悬停预览**：鼠标悬停缩略图 300ms 后显示大图预览；图片悬停优先使用缩略图链路，`pdf` 支持悬停预览
- **预览与下载**：图片 / 视频预览；单文件下载为原文件名；多选后「打包下载」为 ZIP（按文件夹名/文件名命名，重名加序号）
- **图片预览增强**：图片预览支持放大、缩小、适应窗口与原始尺寸
- **导出**：当前列表导出为 CSV（左键）或 JSON（右键）；多选后可单独导出已选项
- **多选模式**：多选时自动切换到批量操作语义，显示已选数量、总大小与类型构成；支持反选，避免与单文件详情混淆
- **详情浏览**：Inspector 支持上一项 / 下一项切换，键盘可用 `← / →`
- **手动刷新索引**：前端工具栏可一键刷新资源库缓存，无需重启服务即可重新扫描 NAS 上最新内容
- **复制**：图片类素材可复制到剪贴板（需 HTTPS 或 localhost）
- **快捷键**：j/k 或 ↑↓ 导航、Enter 预览、Space 多选、Esc 关闭预览/Inspector、`← / →` 切换详情前后项
- **快速跳转**：搜索框支持 `#标签` 直达标签视图、`/文件夹` 直达文件夹；标签区支持就地搜索
- **URL**：当前视图（文件夹/标签/最近/搜索及排序）反映在地址栏 hash，可分享或刷新保持状态
- **主题**：深色 / 浅色切换，默认浅色，偏好存本地
- **PWA**：支持安装到主屏幕；Service Worker 缓存静态资源，弱网可打开界面
- **移动端适配**：响应式布局，侧边栏抽屉式滑出，Inspector 底部上滑，瀑布流自适应列数
- **SVG 图标**：全部使用内联 SVG 图标，精致一致

## 运行方式

### Docker（推荐，用于 NAS）

1. 将 NAS 上的 Eagle 库目录挂载到容器内 `/vault`。
2. 构建并启动：

```bash
# 修改 docker-compose.yml 中 volumes 为你的库路径，例如：
# volumes:
#   - /volume1/eagle/Design.library:/vault:ro

docker-compose up -d --build
```

3. 浏览器访问 `http://<NAS或主机IP>:8000`。

### 本地开发

```bash
cd eagle-viewer
uv sync
cp .env.example .env
export EAGLE_VAULT_ROOT=/path/to/your/Design.library
make dev
```

## 开发与贡献

- `make setup` — 安装 / 同步本地开发环境
- `make dev` — 启动开发服务
- `make check` — 运行版本一致性、lint、pytest、Python/JS 语法检查
- `make test` — 运行自动测试
- `CHANGELOG.md` — 更新记录
- `docs/release.md` — 发布流程
- `CONTRIBUTING.md` — 贡献指南
- `SECURITY.md` — 安全报告方式

前端保持原生 HTML/CSS/JS，不引入框架；后端使用 FastAPI。更细的仓库协作约定见 `AGENTS.md`。

## 配置

| 环境变量 | 说明 | 默认 |
|----------|------|------|
| `EAGLE_VAULT_ROOT` | 库在容器内的路径（需挂载） | `/vault` |
| `VIEWER_PASSWORD` | 访问密码。设置后打开页面需先登录；不设置则无需认证 | 空（不启用） |
| `VIEWER_SECRET_KEY` | Session 签名密钥，建议随机字符串（如 `openssl rand -hex 32`） | 未设置时使用 `VIEWER_PASSWORD` |

## API（只读）

- `GET /api/tree` — 文件夹树（每个节点含 `count`：该文件夹及所有子文件夹内文件总数）
- `GET /api/items` — 全部文件（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/recent?days=7|30` — 最近 N 天素材（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/folders/{folder_id}/items` — 某文件夹下子文件夹与素材（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/tags` — 标签及数量
- `GET /api/library/stats` — 最近一次索引状态
- `GET /api/duplicates?limit=50` — 疑似重复素材组
- `GET /api/tags/{tag}/items` — 某标签下素材（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/search?q=...` — 搜索（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/items/{item_id}` — 素材元数据
- `GET /api/items/{item_id}/snippet` — 文本文件摘要（目前支持 `txt`）
- `GET /api/items/{item_id}/thumbnail` — 缩略图（无则返回占位图）
- `GET /api/items/{item_id}/file` — 原文件（预览）
- `GET /api/items/{item_id}/file?download=true` — 原文件（下载）
- `POST /api/library/reload` — 重新扫描资源库并刷新内存缓存
- `POST /api/items/batch-download` — 批量打包为 ZIP（Body: `["id1","id2",...]`）

列表类接口返回：`items`、`total`、`offset`、`limit`、`nextOffset`、`hasMore`，以及各端点自有字段（如 `subfolders`、`tag`、`query`、`days`），供前端增量加载使用。

## 库结构要求

Eagle 库目录应包含：

- `metadata.json` — 库级元数据（含 `folders` 树）
- `images/*.info/` — 每个素材一个子目录，内含 `metadata.json` 和媒体文件

与 Eagle 官方 Mac/Windows 端使用的库格式一致，直接使用同步到 NAS 的库路径即可。

## 更新记录

完整更新记录见 [CHANGELOG.md](CHANGELOG.md)。
