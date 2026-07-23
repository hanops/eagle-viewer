# Eagle Vault Viewer

把 NAS 或远程主机上挂载的 Eagle 资源库带到浏览器：在无法安装 Eagle 的电脑、平板和手机上浏览、搜索、预览与下载素材。Vault 始终只读挂载，不修改库内任何文件。

**版本**：v2.0.2（2026-07-23）

**License**：MIT

## 功能

- **浏览**：解析 Eagle 库的文件夹树（`metadata.json`），按文件夹展示素材（各 `*.info/metadata.json`）
- **视图**：全部文件、收藏、最近查看、最近 7 天 / 30 天、按文件夹、按标签、搜索
- **增量加载**：全部文件、最近、文件夹、标签与搜索视图按批次自动续载，滚动到底部时继续加载更多，避免一次性渲染全量结果
- **Eagle 式工作区**：紧凑三栏结构，包含资源库树、可调密度素材画布和 Inspector；素材卡片持续显示文件名、尺寸、格式和来源信息
- **专业画布布局**：支持 Eagle 式瀑布流和列表两种视图；画布设置可切换缩略图填满 / 完整显示并调整缩略图大小；桌面和手机分别保存布局偏好
- **Inspector 面板**：点击素材打开资产档案，查看大图预览、规格、文件夹、标签、来源 URL、Eagle 备注和素材 ID，并可复制引用、分享或下载
- **左侧导航**：文件夹树可展开/折叠；导航栏宽度可拖拽调节；文件夹右侧显示含子文件夹在内的总文件数；整栏支持隐藏/展开，状态存本地
- **左侧快捷入口**：收藏与最近查看直接进入主导航；文件夹、标签和最近添加保持独立分区
- **排序与类型筛选**：按修改时间 / 创建时间 / 名称 / 大小 / 格式排序，并按图片、视频、文档、音频和其他类型收窄结果
- **保护文件夹边界**：Eagle 中设置密码的文件夹及其后代不会进入索引、搜索、缩略图或原文件端点
- **远程更新感知**：检测挂载 Vault 的目录与元数据变化，提示用户原位载入更新
- **悬停预览**：鼠标悬停缩略图 300ms 后显示大图预览；图片悬停优先使用缩略图链路，`pdf` 支持悬停预览
- **卡片快捷操作**：桌面悬停显示预览、详情和收藏；右键菜单与移动端长按面板保留选择、收藏、复制链接和下载
- **预览与下载**：图片、视频、音频、PDF 和纯文本可直接预览；其他格式下载后查看；单文件下载保留原文件名，多选可打包为 ZIP
- **音频试听**：音频素材可直接打开沉浸式播放器，展示格式、时长、BPM 和原生播放控制，适合远程试听素材库声音文件
- **基础图片工具**：全屏图片预览只保留缩小、适应窗口和放大，视频与音频使用浏览器原生播放控制
- **多选模式**：勾选素材后可加入收藏、复制链接或打包下载，保持移动端操作简单
- **详情浏览**：Inspector 支持上一项 / 下一项切换，键盘可用 `← / →`；关闭详情或全屏预览后会回到并短暂高亮刚查看的素材，滚远后也可用“回到当前项”浮动胶囊重新定位，长列表里不丢位置
- **素材分享**：Inspector、右键菜单、移动端长按菜单和全屏预览可复制当前素材链接，另一台设备打开后直接恢复详情
- **手动刷新索引**：前端工具栏可一键刷新资源库缓存，无需重启服务即可重新扫描 NAS 上最新内容
- **复制**：图片类素材可复制到剪贴板（需 HTTPS 或 localhost）
- **快捷键**：`Esc` 取消选择或关闭预览 / Inspector，Inspector 中可用 `← / →` 切换前后项
- **快速搜索**：按名称、标签或备注查找素材；标签区支持就地搜索
- **URL**：当前文件夹、标签、最近、搜索、收藏、排序、类型及打开素材反映在地址栏 hash，可分享或刷新恢复
- **主题**：完整的深色 / 浅色 Eagle 工作区主题，工具栏、侧栏、画布、Inspector 与移动端 sheet 会同步切换；默认浅色，偏好存本地
- **PWA**：支持安装到主屏幕，并缓存应用外壳；素材和 API 数据始终从远程 Vault 获取
- **移动端适配**：底部四栏导航覆盖资料库、收藏、搜索和更多设置；支持触控预览、长按操作、手势关闭、主题切换和安全区域适配
- **SVG 图标**：全部使用内联 SVG 图标，精致一致

## 产品边界

Web 聚焦远程只读浏览，而不是在浏览器内复制 Eagle 的完整工作台。界面保留资料库、文件夹、标签、搜索、收藏、最近查看、预览、素材链接、下载和基础多选；不提供整理队列、评分、工作集、Viewer 笔记、审片标记、智能视图、Eagle 智能文件夹、重复分析、色谱、随机漫游、命令工具、复杂引用导出或离线数据管理。

iPhone / iPad 使用同一套 Web 应用。在 Safari 打开远程地址后，可通过“分享 → 添加到主屏幕”获得独立窗口入口；底部四栏为资料库、收藏、搜索和更多设置。

浏览器缓存 PWA 静态外壳，并已浏览过的缩略图会存入 IndexedDB——弱网或断网重开时可即时还原已看过的图；素材列表、原文件与未浏览的缩略图仍依赖远程 Vault 连接。

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

#### 手机远程访问（LAN / VPN / HTTPS）

手机端应**通过 HTTP 访问服务端**，而不是在手机上直接挂载 `.library`：vault 只在服务端挂载，手机只消费 JSON 与缩略图。这样既能复用服务端的索引 / 缩略图 / 缓存头，又能用分层缓存应对移动网络不稳。

- **局域网**：手机与服务器同 WiFi，直接访问 `http://<服务器IP>:8000/mobile.html`。
- **VPN（推荐）**：用 Tailscale / ZeroTier / WireGuard 把手机接入与服务端同一虚拟网，再访问 `http://<VPN内网地址>:8000/mobile.html`——免端口转发、等同内网安全。
- **HTTPS**：分享 / 复制等功能要求 HTTPS 或 localhost（见下文安全说明）；即便走 VPN 也建议开启 HTTPS（Tailscale HTTPS 或 Caddy 反代），否则这些功能在手机上会被禁用。

完整的服务端挂载 + 远程访问示例见 [`docker-compose.remote.example.yml`](docker-compose.remote.example.yml)；其中可选的 Caddy 反代段配套 [`Caddyfile.example`](Caddyfile.example)，提供 Tailscale 内网域名 / 自有域名 / 纯局域网三种 HTTPS 反代写法，文件内注释即开即用。

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
| `VIEWER_API_TOKEN` | 自动化工具或 API 客户端使用的 Bearer Token；设置后 API 需要该 Token 或网页登录会话 | 空（不启用） |
| `VIEWER_STATE_PATH` | 收藏和最近查看的持久状态文件；应位于 Eagle 库挂载目录之外 | `data/eagle-viewer-state.json` |

## API（只读）

- `GET /health` — 无需认证的容器健康检查
- `GET /api/info` — API 版本、能力与可用认证方式，供自动化工具或 API 客户端连接检查
- `GET /api/tree` — 文件夹树（每个节点含 `count`：该文件夹及所有子文件夹内文件总数）
- `GET /api/items` — 全部文件（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/recent?days=7|30` — 最近 N 天素材（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/folders/{folder_id}/items` — 某文件夹下子文件夹与素材（支持 `sort`, `dir`, `type`, `offset`, `limit`）
- `GET /api/tags` — 标签及数量
- `GET /api/state` / `PUT /api/state` — 跨设备同步收藏和最近查看状态
- `POST /api/items/resolve` — 根据素材 ID 批量解析当前元数据，用于同步清单
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

Eagle 密码保护文件夹返回 `423 Locked`；其中素材不会进入 Viewer 索引，因此素材详情、缩略图和原文件直链统一返回 `404`，避免从非导航入口绕过保护。

素材元数据保留 Eagle 原生 `duration` 与 `bpm` 字段，Inspector 会显示可用的音视频信息。

自动化脚本或受信客户端可为任意 API 请求添加 `Authorization: Bearer <VIEWER_API_TOKEN>`。该 Token 应仅保存在系统密钥链、密码管理器或服务端密钥管理中；生产环境请始终通过 HTTPS 或可信内网访问。

状态写入使用 `revision` 做乐观锁。客户端先读取 `/api/state`，写回时携带返回的 `revision`；若其他设备已更新，服务端返回 `409` 和最新状态，避免静默覆盖。

## 库结构要求

Eagle 库目录应包含：

- `metadata.json` — 库级元数据（含 `folders` 树）
- `images/*.info/` — 每个素材一个子目录，内含 `metadata.json` 和媒体文件

与 Eagle 官方 Mac/Windows 端使用的库格式一致，直接使用同步到 NAS 的库路径即可。

## 更新记录

完整更新记录见 [CHANGELOG.md](CHANGELOG.md)。
