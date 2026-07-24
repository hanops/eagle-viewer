# PROGRESS

> 面向后续维护者 / AI agent 的项目现状、关键决策与已知坑。
> 与 `CHANGELOG.md`（记录“已发布了什么”）、`AGENTS.md`（通用结构与命令）互补。
> 每次做出会影响后续迭代的决策或踩到新坑，请追加到此文件。

最后更新：2026-07-24 · 当前版本：**3.0.0（待发布）**

---

## 1. 当前状态

- **v3.0.0 待发布**：主版本跳升。本轮为开源准备 + i18n 语言切换 + 移动端底部导航完整修复。含：全英文文档（README / CONTRIBUTING / CODE_OF_CONDUCT / regression-checklist / release 等）、GitHub Actions CI 工作流、Issue/PR 模板、i18n 框架（右上角语言按钮 + `data-i18n` 基础设施 + zh/en 双语数据）、隐私说明、Eagle 官网链接、Docker Compose 镜像版本更新。`AGENTS.md` 加入 gitignore。新增 `GOVERNANCE.md` / `docs/logo.svg` / `docs/screenshots/README.md`。后端 `APP_VERSION` 回退改为读 `pyproject.toml` 避免 `vdev` 问题。SW shell 缓存升至 `eagle-viewer-shell-v45`。
- **v2.0.5 已发布**：tag `v2.0.5` 已推送，GitHub Release 已建。本轮为移动端底部导航修复（`100dvh` 覆盖 `100vh` 导致浏览器工具栏遮挡）、清理死 CSS（`.mobile-continue-*` 选择器级剥离）以及集合系统死代码彻底清除。静态资源 revision 升至 `1.98`、SW shell 缓存升至 `eagle-viewer-shell-v44`。
- 版本号一致性由 `make check` 的 version-check 保证，**只比对三处**：`pyproject.toml`、`README.md`、`app/web/core.js`。改版本号时这三处必须同步（`uv.lock` 里项目自身版本也需一致，`uv sync` 会带出）。
- 工作树中 `docs/mockups/web-desktop-redesign.html` 是**有意保留**的设计参考稿（untracked），不是临时文件，勿删。

---

## 2. 架构决策

### 移动端远程访问
- **vault 只在服务端挂载**；手机端永远通过 HTTP 访问 `/mobile.html`，**不要在手机上直接挂载 `.library`**（手机跑不了服务端 Python 解析）。
- 推荐拓扑：服务端把 `.library` 挂到 `EAGLE_VAULT_ROOT` → FastAPI 解析+索引+缩略图 → 手机经 LAN 或 VPN + HTTPS 接入。
- 建议启用 HTTPS：解锁 `navigator.share` / 剪贴板（要求 HTTPS 或 localhost）。
- 远程部署示例见 `docker-compose.remote.example.yml`（含可选 Caddy HTTPS 反代、NFS volume 挂载注释）。挂载属 compose 职责，**不能**用 Dockerfile 实现。

### 移动端客户端缓存（已实现，`app/web/mobile.js`）
- 缩略图走 IndexedDB 快照（库 `eagle-viewer-thumbs`，值 `{blob,ts}`）。
- 按 `/api/library/status` 的 `revision` 失效：`localStorage['ev:thumbRev']` 比对，变化即 `Thumbs.clear()`。
- 有界 LRU：上限 500 项 / 用量 >85% 清空；`hydrateThumbs` 用 IntersectionObserver 懒水合，miss 时写回；IndexedDB 不可用则走网络回退。

### 桌面端视觉方向
- 主线 **浅色画廊（Gallery Atelier，暖陶土）**，暗色为其派生 **Quiet Workbench**。
- **默认浅色主题**：`bootstrap.js` 回退 light、`index.html` `data-theme=light`。
- `app/web/styles.css` 为桌面样式单一来源（8700+ 行）；顶部是唯一 token 来源（`[data-theme="light"]` + `[data-theme="dark"]`），下含全局桌面规则、两个主题覆盖段（原生 CSS nesting）、移动端 `@media(max-width:768px)` 段。

---

## 3. 已知坑（务必先读再改）

- **深色桌面规则必须限定 `[data-theme="dark"]`**，不可裸写，否则样式会泄漏到浅色主题。
- **移动端 `@media` 规则保持全局**（不要限定主题）。
- **1100px 窄桌面响应式块的作用域坑**：窄桌面折叠规则（如 `.density-control{display:none}`、`.toolbar-left` 缩宽等）必须**同时写进 light 段与 dark 段各自作用域**，不能只放全局 `@media(max-width:1100px)`。原因：`[data-theme="dark"] .toolbar-left{...}` 特异性 (0,2,0) 会压过全局媒体查询的 (0,1,0)，导致 dark 在窄屏丢失折叠。放进各自主题作用域后特异性对等、靠后源胜出，两主题才一致折叠。
- **`mobile.html` 用独立的 `mobile.css`**，桌面 `styles.css` 的改动对移动端零影响；两者勿混淆。
- **SW 不得缓存 `/api`**：契约测试会失败。
- **`warmCurrentOfflineSnapshot`（桌面）是存活功能**，曾被误判为无效旧代码，实为移动端相关，勿删。
- **`v2.0.1` 从未打 tag**：CHANGELOG 里有 `2.0.1` 发布段，但仓库无 `v2.0.1` tag（现有 tag 到 `v2.0.0` 再到 `v2.0.2`）。`gh release create` 不能用 `--notes-start-tag v2.0.1`，去掉该参数让 gh 自动推断上一 tag。
- **PWA 测试硬编码静态资源版本号**：`tests/test_pwa_restore_contract.py::test_static_shell_uses_one_asset_revision` 内硬编码 `?v=1.95` 与 `eagle-viewer-shell-v41`，并断言 `index.html`/`mobile.html`/`sw.js` 都含该版本。**bump 静态资源 revision（如 `1.95`→`1.96`）或 SW 缓存名（如 `v41`→`v42`）时，必须同步改这条测试**，否则 `make check` 的 pytest 失败。
- **`git fetch --tags origin` 会因本地旧 tag 让 `&&` 链中断**：若本地已存在同名旧 tag（如 `v1.4.0`），fetch 报 `would clobber existing tag` 返回非零，整条 `&&` 构建链会在 fetch 处断（表象像 checkout 失败）。构建时直接用 `git checkout -f vX.Y.Z`（tag 上次已 fetch 存在）即可，或 `git fetch --tags origin || true`。
- **`uv run` 会顺带把 `uv.lock` 里项目自身版本号同步成新版本**（如 `2.0.2`→`2.0.3`）。若 `make check` 触发 `uv run` 后发现 `uv.lock` 变脏，补一个 `uv.lock` 同步提交即可（不影响 docker 构建，后者用 `requirements.txt`）。

---

## 4. 发布流程

参阅 [`docs/release.md`](docs/release.md)。

### Docker 镜像构建约定
- Tag 标准：`eagle-viewer:vX.Y.Z`，**不要加 `:latest`**。
- 流程：`docker build -t eagle-viewer:vX.Y.Z .` → `docker save eagle-viewer:vX.Y.Z -o ./images/eagle-viewer-vX.Y.Z.tar`。
- `images/` 是 untracked 构建产物目录，`git checkout -f` 不会误删。
