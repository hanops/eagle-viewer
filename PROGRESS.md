# PROGRESS

> 面向后续维护者 / AI agent 的项目现状、关键决策与已知坑。
> 与 `CHANGELOG.md`（记录“已发布了什么”）、`AGENTS.md`（通用结构与命令）互补。
> 每次做出会影响后续迭代的决策或踩到新坑，请追加到此文件。

最后更新：2026-07-23 · 当前版本：**2.0.2（已发布）**

---

## 1. 当前状态

- **v2.0.2 已发布**：tag `v2.0.2` 已推送，GitHub Release 已建。此版本主要为桌面端视觉重做。
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

---

## 4. 发布流程（见 `docs/release.md`）

1. Bump 版本：`pyproject.toml` + `README.md` + `app/web/core.js`（若改缓存策略还需 `sw.js` cache 名）。
2. 更新 `CHANGELOG.md`，发布时去掉顶部 `(unreleased)` 标记。
3. `make check` 通过（含 version-check / lint / pytest / 语法检查）。
4. 若改了 UI 可见行为，产出 `docs/regression-results-vX.Y.Z.md`（模板参考既有文件）。
5. `git commit` → `git tag vX.Y.Z`。
6. `git push origin main` + `git push origin vX.Y.Z`。
7. `gh release create vX.Y.Z --target main --title vX.Y.Z --generate-notes`（自动推断上一 tag）。

### Docker 镜像构建约定
- 在专用构建副本里执行；tag **带 `v` 前缀**（如 `eagle-viewer:v2.0.2`），**不要加 `:latest`**。
- 流程：`docker build -t eagle-viewer:vX.Y.Z .` → `docker save ... -o ./images/eagle-viewer-vX.Y.Z.tar`。
- `images/` 是 untracked 构建产物目录；`git checkout -f` 不会删 untracked，可安全切 tag。
- 具体开发机主机 / 端口 / 归档路径等基础设施细节不入库（见私有运维记录）。
