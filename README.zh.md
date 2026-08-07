# Eagle Vault Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](pyproject.toml)
[![GitHub release](https://img.shields.io/github/v/release/hanops/eagle-viewer)](https://github.com/hanops/eagle-viewer/releases)

> 把 Eagle 素材库挂到服务器上，浏览器远程浏览、搜索、预览和下载 —— 手机和平板也能用。

[English README](README.md) · **当前版本**：v4.3.3 (2026-08-08) · [更新日志](CHANGELOG.md)

---

## 简介

[Eagle](https://eagle.cool/) 是一款桌面端素材管理软件，用来整理图片、视频、音频和文档。Eagle Vault Viewer 把你同步到 NAS 的 Eagle 库变成网页版，任何能打开浏览器的设备都能访问——不用额外装什么软件。

Eagle 库始终以**只读**方式挂载，不会修改库里的任何文件。

---

## 功能一览

- **浏览**：解析 Eagle 库的文件夹树（`metadata.json`），展示每个 `*.info/metadata.json` 里的素材。
- **多种视图**：全部素材、最近 7/30 天、按文件夹、按标签、搜索。
- **增量加载**：全部素材、最近、文件夹、标签、搜索视图滚动分批加载，不会一次渲染太多。
- **三栏布局**：左侧素材库树 + 中间密度可调的网格画布 + 右侧详情面板（Inspector）。
- **查看模式**：瀑布流网格和列表两种布局，缩略图密度可调，设置会记住。
- **详情面板**：点击素材打开详情卡片——大预览图、尺寸、格式、路径、标签、来源、备注。面板里可以复制链接或下载。
- **左侧导航**：可展开折叠的文件夹树，带子文件夹计数，侧栏宽度可拖拽，可隐藏。所有偏好本地持久化。
- **排序筛选**：按修改时间/创建时间/名称/大小/格式排序；按图片/视频/文档/音频/其他类型筛选。
- **密码保护文件夹**：Eagle 中设置了密码的文件夹及其子文件夹不会进入索引、搜索、缩略图和文件接口。
- **远程更新感知**：检测到库目录或元数据变化时，提示就地刷新。
- **悬停预览**：鼠标悬停缩略图 300ms 后显示大图预览。
- **卡片操作**：桌面端鼠标悬停显示预览和详情按钮；右键和移动端长按弹出选择、复制链接、下载菜单。
- **预览与下载**：图片、视频、音频、PDF、纯文本直接预览；其他格式可下载。单个文件下载保留原文件名，多选只保留复制链接。
- **音频播放器**：音频素材打开全功能播放器，显示格式、时长、BPM。
- **图片工具**：全屏查看器，支持缩放适应、窗口适应、放大缩小。视频音频使用浏览器原生控件。
- **多选**：选择素材后可复制链接。移动端触摸友好。
- **前后导航**：详情面板支持 ← / → 快捷键切换素材。
- **分享**：从详情面板、右键菜单、移动端长按、全屏预览都能复制素材链接。
- **手动刷新索引**：工具栏一键刷新，不用重启服务就能看到新内容。
- **复制到剪贴板**：图片素材可以直接复制（需要 HTTPS 或 localhost）。
- **快捷键**：`Esc` 取消选择或关闭预览/详情面板；`←` / `→` 在详情面板中切换素材。
- **快速搜索**：按名称、标签、备注搜索。支持标签内联搜索。
- **Hash URL**：当前文件夹、标签、搜索、排序、类型和打开的素材都反映在 URL hash 中——可分享、可刷新恢复。
- **三套主题**：画廊（暖陶土浅色，默认）、工作台（深色蓝）、碳工作室（深色绿）。切换只改颜色不改布局。工具栏、侧栏、卡片和移动端弹层都跟随主题。偏好持久化。
- **PWA**：可添加到主屏幕，外壳缓存。素材和 API 数据始终从远程实时获取。
- **移动端优化**：底部三栏导航（资料库、文件夹、搜索）。触摸预览、长按操作、手势关闭弹层、主题同步、安全区域适配。
- **中英文界面**：右上角一键切换，默认跟随浏览器语言。
- **内联 SVG 图标**：所有图标都是内联 SVG，清晰一致。

---

## 产品边界

这个网页版查看器专注于**远程只读浏览**，不是要复刻 Eagle 桌面端全部功能。它提供：素材库浏览、文件夹、标签、搜索、预览、素材链接、下载和基础多选。它**没有**：收藏队列、评分、工作集、标注、智能文件夹、色彩分析、随机浏览、命令面板、高级导出或离线数据管理。

iPhone / iPad 用同一个网页。Safari 打开远程地址，点**分享 → 添加到主屏幕**即可获得独立窗口。底部三个 tab 分别是资料库、文件夹和搜索。

PWA 外壳缓存 + IndexedDB 缩略图缓存：之前看过的图片在网络差或离线时也能秒开。素材列表、原始文件、未看过的缩略图仍需实时连接。

---

## 隐私说明

Eagle Vault Viewer **完全不联网**：

- **无遥测、无统计、无外部请求**——不会向外发送任何数据。没有追踪像素、没有崩溃上报、没有使用统计。
- **无第三方 CDN**——所有前端资源（CSS、JS、字体、图标）都自包含，从应用本身提供。没有 Google Fonts，没有外部图标库。
- **你的数据留在你的网络里**——Eagle 库完全在你自己的机器或 NAS 上解析和服务。没有任何数据发送到外部服务器。
- **可选密码保护**——设置 `VIEWER_PASSWORD` 环境变量后，访问需要登录。API 访问可用 `VIEWER_API_TOKEN` 进一步限制。
- **Docker 镜像从源码构建**——使用项目提供的 `Dockerfile` 构建。没有来自未知来源的预编译二进制文件。

唯一的网络活动是你的浏览器和你控制的服务器之间的通信（局域网、VPN，或通过你自己的反代实现 HTTPS）。

---

## 快速开始

### Docker（推荐，适合 NAS）

1. 把 Eagle 库目录挂载到容器的 `/vault`。
2. 构建并启动：

```bash
# 在 docker-compose.yml 里修改 volumes 指向你的库，例如：
# volumes:
#   - /volume1/eagle/Design.library:/vault:ro

docker compose up -d --build
```

3. 打开 `http://<NAS-或主机IP>:8000`。

#### 远程访问（局域网 / VPN / HTTPS）

手机通过 HTTP 访问查看器——**绝对不要在手机上挂载 `.library` 目录**。库只在服务端：

- **局域网**：同 WiFi → `http://<服务器IP>:8000/mobile.html`
- **VPN（推荐）**：Tailscale / ZeroTier / WireGuard → `http://<VPN-IP>:8000/mobile.html`
- **HTTPS**：`navigator.share` 和剪贴板需要 HTTPS 环境。通过 Caddy 反代（参考 [`Caddyfile.example`](Caddyfile.example)）或 Tailscale Funnel 开启。

完整服务端挂载 + 远程访问示例：[`docker-compose.remote.example.yml`](docker-compose.remote.example.yml)。搭配的 [`Caddyfile.example`](Caddyfile.example) 可用于 Tailscale / 自定义域名 / 纯局域网 HTTPS 反代。

### 本地开发

```bash
cd eagle-viewer
uv sync
cp .env.example .env
export EAGLE_VAULT_ROOT=/path/to/your/Design.library
make dev
```

---

## 开发者 & 贡献

```bash
make setup    # 安装/同步开发环境
make dev      # 启动开发服务器
make check    # 版本一致性检查、lint、pytest、Python/JS 语法检查
make test     # 仅运行 pytest
```

- [贡献指南](CONTRIBUTING.md)
- [发布流程](docs/release.md)
- [更新日志](CHANGELOG.md)
- [安全策略](SECURITY.md)

前端使用纯 HTML/CSS/JS，没有框架。后端是 FastAPI。

---

## 配置项

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `EAGLE_VAULT_ROOT` | Eagle 库目录路径（容器内需挂载） | `/vault` |
| `VIEWER_PASSWORD` | 访问密码——设置后需要登录才能查看 | _(空)_ |
| `VIEWER_SECRET_KEY` | Session 签名密钥——建议用 `openssl rand -hex 32` 生成 | 回退到 `VIEWER_PASSWORD` |
| `VIEWER_API_TOKEN` | API 客户端的 Bearer Token——设置后 API 调用需此 Token 或网页会话 | _(空)_ |

---

## API（只读）

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/health` | 无需认证的容器健康检查 |
| GET | `/api/info` | API 元数据：版本、能力、可用认证方式 |
| GET | `/api/tree` | 文件夹树（每个节点含 `count`：该文件夹及子文件夹的素材总数） |
| GET | `/api/items` | 全部素材（支持 `sort`、`dir`、`type`、`offset`、`limit`） |
| GET | `/api/recent?days=7\|30` | 最近 N 天素材（支持 `sort`、`dir`、`type`、`offset`、`limit`） |
| GET | `/api/folders/{folder_id}/items` | 指定文件夹内的素材（支持 `sort`、`dir`、`type`、`offset`、`limit`） |
| GET | `/api/tags` | 标签及计数 |
| POST | `/api/items/resolve` | 按素材 ID 批量获取当前元数据 |
| GET | `/api/tags/{tag}/items` | 指定标签的素材（支持 `sort`、`dir`、`type`、`offset`、`limit`） |
| GET | `/api/search?q=...` | 搜索（支持 `sort`、`dir`、`type`、`offset`、`limit`） |
| GET | `/api/items/{item_id}` | 单个素材元数据 |
| GET | `/api/items/{item_id}/snippet` | 文本文件片段（目前支持 `.txt`） |
| GET | `/api/items/{item_id}/thumbnail` | 缩略图（找不到时返回占位图） |
| GET | `/api/items/{item_id}/file` | 原文件（预览） |
| GET | `/api/items/{item_id}/file?download=true` | 原文件（下载） |
| POST | `/api/library/reload` | 触发全量重新扫描库 |

列表类接口返回：`items`、`total`、`offset`、`limit`、`nextOffset`、`hasMore`，以及接口特定字段（`subfolders`、`tag`、`query`、`days`）。

Eagle 密码保护文件夹返回 `423 Locked`；其素材不会进入查看器索引，因此素材详情/缩略图/文件接口返回 `404`。

---

## 库目录结构

Eagle 库目录应包含：

- `metadata.json` — 库级别元数据（含 `folders` 树）
- `images/*.info/` — 每个素材一个子目录，内含 `metadata.json` 和媒体文件

这和 Eagle 桌面端的标准格式一致。把 `EAGLE_VAULT_ROOT` 指向你同步到 NAS 的库路径即可。

---

## License

[MIT](LICENSE) © 2026 hanops
