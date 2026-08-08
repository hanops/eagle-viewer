# Changelog · 更新日志

---

## 4.3.6 - 2026-08-08

### Fixed
- Reverted the v4.3.4 physical-height sizing in iOS home-screen standalone mode.
  `screen.height` returns the full screen size (e.g. 932pt on iPhone 15 Pro
  Max), which is taller than the standalone layout viewport (873pt), so the
  shell sized by it pushed the tab bar and preview action buttons out of the
  viewport — they only reappeared while the page was being scrolled and snapped
  back on release. The shell now keeps viewport-unit height again (tab bar
  always visible, flush with the layout-viewport bottom), and the strip below
  the viewport is covered by the html canvas painted in the tab-bar color
  (black under the preview overlay) via both the `pwa-standalone` class and the
  `display-mode` media-query fallback.
- Bumped the asset revision and service-worker cache so installed PWAs fetch the
  corrected shell on their next launch.
**中文**：撤销 v4.3.4 在 iOS 主屏独立模式下的物理屏高度撑满方案——`screen.height` 返回物理全屏高度（如 iPhone 15 Pro Max 为 932pt），大于 standalone 布局视口（873pt），按它撑高的外壳会把底部标签栏与预览操作按钮推出视口（仅在滚动时短暂露出、松手回弹消失）。现恢复视口单位高度（底栏始终可见、贴住布局视口底边），视口下方的屏幕条带由 html 画布同色背景覆盖（预览打开时转黑），`pwa-standalone` 类与 `display-mode` 媒体查询双通道生效；同步升级资源版本号与 SW 缓存。

---

## 4.3.5 - 2026-08-08

### Fixed
- Hardened the iOS home-screen standalone bottom fill: the physical-height rules
  now also apply through `display-mode: standalone/fullscreen` media queries, so
  a blank band can no longer appear below the tab bar or under the preview
  overlay even if the bootstrap JS detection fails early. The html canvas
  background now matches the tab bar (and turns black while the preview overlay
  is open), and the theme bootstrap is split from standalone detection so a
  restricted `localStorage` cannot skip it.
- Bumped the asset revision and service-worker cache so installed PWAs fetch the
  corrected shell on their next launch.
**中文**：加固 iOS 主屏独立模式的底部撑满逻辑：新增 `display-mode` 媒体查询兜底，即使 bootstrap 检测提前失败，标签栏下方与预览浮层底部也不会再露出背景色空白；html 画布底色改为与底栏同色（预览打开时转黑），并将主题写入与 standalone 检测拆分为独立 try，避免受限的 `localStorage` 拖累检测；同步升级资源版本号与 SW 缓存，已安装 PWA 下次启动即可获取修复。

---

## 4.3.4 - 2026-08-08

### Fixed
- Sized the mobile PWA shell from the physical screen height in iOS home-screen mode, since standalone viewport units (dvh/svh and even vh) under-report the screen and left a blank band below the tab bar and preview overlay.
- Detected home-screen standalone mode via `display-mode: standalone/fullscreen` media queries as a fallback when `navigator.standalone` is falsy on some iOS builds, so the safe-area paddings and height correction actually apply.
- Added more breathing room between the iOS status bar and the preview top navigation bar.

**中文**：iOS 主屏模式下改用物理屏幕高度撑满移动端外壳与预览浮层（独立模式的 dvh/svh/vh 视口单位均可能少算，导致底部空白）；部分 iOS 版本 `navigator.standalone` 不为 true，改用 `display-mode` 媒体查询兜底检测，确保安全区留白生效；预览顶栏与状态栏之间增加间距。

---

## 4.3.3 - 2026-08-08

### Fixed
- Filled the bottom gap of the mobile PWA in iOS home-screen standalone mode so the full-screen preview overlay reaches the physical screen bottom.
- Restored the close and share icons in the mobile full-screen preview top bar, which WebKit rendered invisibly as zero-size SVGs.

**中文**：修复 iOS 主屏独立模式下移动端 PWA 底部空白，全屏预览遮罩现在贴到物理屏幕底部；恢复预览顶栏关闭/分享图标（WebKit 将无固有尺寸的 SVG 解析为 0×0 导致不可见）。

---

## 4.3.2 - 2026-08-07

### Added
- Added byte-range media delivery for reliable iPhone and iPad video playback and seeking.
- Added explicit mobile preview fallback states, previous/next controls, and connection-state access from the Eagle brand mark.

**中文**：新增视频分段响应，提升 iPhone 与 iPad 播放和拖动稳定性；移动端新增不支持格式提示、预览切换按钮，并可从 Eagle 品牌入口访问连接状态。

### Fixed
- Fixed same-origin PDF iframe preview being blocked by the global frame-deny security header.
- Fixed stale mobile navigation and search responses overwriting the active view.
- Fixed failed Service Worker precaching deleting the last known-good offline shell.
- Fixed mobile status failure hiding usable recent items, unsupported formats opening blank previews, and English workbar sort labels remaining in Chinese.
- Fixed iPad gallery ordering and desktop compact-grid behavior when folders and files coexist.

**中文**：修复 PDF 预览被安全响应头阻断、移动端旧请求覆盖当前页面、Service Worker 缓存失败删除旧版本、状态请求失败连带隐藏最近素材、非预览格式出现空白预览、英文排序文案残留中文，以及 iPad 排序和文件夹混排布局问题。

### Performance
- Reduced repeated mobile gallery rebuilds and throttled thumbnail-cache eviction; large share operations now fall back safely instead of eagerly buffering oversized files.

**中文**：减少移动端分页重复重建和缩略图缓存扫描，超大分享文件改为安全回退，降低 iPhone/iPad 内存压力。

---

## 4.3.1 - 2026-08-07

### Added
- iOS-style collapsible large title on mobile PWA: a 34px display title sits in the content area and scrolls away, while a 17px compact title fades into the top bar with a hairline border — the signature iOS navigation interaction.
- Inset grouped cards on mobile: folder lists and the status page key-value table are now wrapped in white rounded-corner cards with inset hairline separators, matching Apple Settings aesthetics.

**中文**：移动端 PWA 新增 iOS 风格可折叠大标题——内容区 34px 大标题随滚动上移，顶栏 17px 紧凑标题淡入并出现发丝底边，还原 iOS 标志性导航交互。文件夹列表与状态页键值表改用白底圆角卡片包裹、内缩发丝分隔线，对齐 Apple Settings 视觉语言。

### Changed
- Mobile bottom tab bar height switched from JS-driven `--app-h` (visualViewport) to CSS `100dvh`, which iOS Safari/PWA corrects automatically on scroll with zero JS timing dependency.
- Search promoted to a root tab on mobile (back button removed); status page and folder sub-levels retain back navigation.
- Mobile palette refined to exact iOS system values: light grouped background `#f2f2f7`, dark pure black `#000` + `#1c1c1e` cards, Apple system blue `#007aff` / `#0a84ff`.
- SW shell cache bumped v61 → v62; static asset revision 1.115 → 1.116.

**中文**：移动端底栏高度从 JS 驱动的 `--app-h`（visualViewport）改为 CSS `100dvh`，iOS Safari/PWA 滚动时自动校正，零 JS 时序依赖。搜索提升为根 Tab（移除返回键）；状态页与文件夹子级保留返回导航。配色精修到 iOS 系统精确值：浅色分组底 `#f2f2f7`、深色纯黑 `#000` + `#1c1c1e` 卡片、系统蓝 `#007aff` / `#0a84ff`。SW shell 缓存升级 v61 → v62，静态资源版本 1.115 → 1.116。

### Fixed
- Mobile PWA bottom tab bar renders too high on first paint (iOS Safari), only dropping to the correct position after scrolling. Root cause: `--app-h` was read from `visualViewport` before the first frame, when the value was still incorrect. Replaced with `100dvh` which the browser self-corrects during scroll.

**中文**：修复移动端 PWA 底部导航栏首屏位置偏高、需滚动一下才落位的问题。根因：`--app-h` 在首帧前从 `visualViewport` 取值时仍为错误值，改用 `100dvh` 由浏览器滚动时自动校正。

---

## 4.3.0 - 2026-08-07

### Added
- Full Apple HIG visual restyle across desktop and mobile PWA surfaces: SF Pro system font stack, Apple system blue accent (#007aff / #0a84ff), neutral palette (#f5f5f7 / #1d1d1f light, #000000 / #f5f5f7 dark), frosted-glass toolbars and tab bars with `backdrop-filter: blur()`, hairline borders, and refined card shadows.
- Apple restyle report documenting the theme simplification, navigation fix, token override repair, and warm-color cleanup (`docs/apple-restyle-report.md`).

**中文**：桌面端与移动端 PWA 全面还原 Apple HIG 设计风格——SF Pro 系统字体栈、Apple 系统蓝强调色（#007aff / #0a84ff）、中性色板（浅色 #f5f5f7 / #1d1d1f，深色 #000000 / #f5f5f7）、毛玻璃工具栏与底部导航栏、发丝边框、精炼卡片阴影。新增 Apple 风格还原修复报告（`docs/apple-restyle-report.md`）。

### Changed
- Theme system simplified from three themes (Gallery / Workbench / Carbon) + two accent colors (Terra / Green) to two themes (Light / Dark) + single Apple system blue accent. Legacy theme keys auto-migrate to the new system.
- 13 hardcoded warm-tone rgba shadow/border values cleaned to neutral black across `styles-polish.css`, `styles-mobile-shell.css`, `styles-detail.css`, and `mobile.css`. Preview quality notice badge retinted from amber to Apple warning orange (#ff9500).
- `styles-polish.css` token override block (loaded last in cascade) aligned to Apple HIG neutrals — was overriding `styles.css` Apple tokens with legacy warm values.
- `manifest.json` theme_color / background_color and `index.html` / `mobile.html` meta theme-color updated to Apple values.
- SW shell cache bumped v59 → v60; static asset revision 1.113 → 1.114.

**中文**：主题体系从三主题（Gallery / Workbench / Carbon）+ 两强调色（Terra / Green）精简为两主题（浅色 / 深色）+ Apple 系统蓝单一强调色，旧主题键自动迁移。清理 13 处硬编码暖色 rgba 阴影/边框为中性黑，预览质量提示 badge 从琥珀色改为 Apple 警告色（#ff9500）。修复 `styles-polish.css`（层叠最后加载）的 token 覆盖问题——此前将 `styles.css` 的 Apple 中性色覆盖回旧暖色值。manifest.json 与 HTML meta theme-color 同步更新。SW shell 缓存升级 v59 → v60，静态资源版本号 1.113 → 1.114。

### Fixed
- Mobile bottom tab bar first-paint position drift on iOS Safari: `100dvh` returns an unreliable initial value on first frame, causing the tab bar to render too high. Fixed by driving a `--app-h` CSS variable from `visualViewport.resize` events, with `100dvh` and `100vh` as progressive-enhancement fallbacks.
- Test assertion `test_theme_and_mobile_navigation_remain_available` updated to check light/dark theme switcher instead of removed gallery/workbench/carbon.

**中文**：修复移动端底部导航栏在 iOS Safari 首屏位置靠上的问题——`100dvh` 在首帧取值不可靠，改用 `visualViewport.resize` 事件驱动 `--app-h` CSS 变量，以 `100dvh` 和 `100vh` 作为渐进增强回退。测试断言同步更新为检查浅色/深色主题切换器。

---

## 4.2.0 - 2026-08-07

### Added
- README Screenshots section filled with captures generated from the sample library (desktop gallery/workbench/carbon themes, inspector, and the four mobile surfaces); see `docs/screenshots/` for the naming convention.
- mobile.html search empty state now shows popular tag chips (top tags by count, tap to search), with zh/en copy.
- Enriched `tests/fixtures/sample.library` from 6 to 18 items across three folder levels, including a parent folder that only contains subfolders, and image/document/audio/video coverage for realistic UI and regression checks.

**中文**：README 的 Screenshots 小节用示例库生成的截图补齐（桌面三主题、Inspector、移动端四个界面），命名约定见 `docs/screenshots/`；mobile.html 搜索空态展示热门标签 chip（按数量取前 8，点按即搜），中英文文案齐全；测试 fixture 从 6 个素材丰富到 18 个，覆盖三级文件夹（含仅含子文件夹的父文件夹）与图片/文档/音频/视频类型。

### Fixed
- Narrow-window shell (<768px, pointer devices): the toolbar search box no longer truncates to a few characters; dangling SORT/TYPE labels are hidden together with their selects; the remote status pill collapses to its dot at ≤480px (full label kept as tooltip); the duplicated view header is gone; selection checkboxes only appear in batch-selection mode instead of as permanent gray dots.
- The redirect to `mobile.html` now targets touch devices only, and the viewport meta is parsed before the redirect script, so narrow no-touch loads and resized windows land on the same responsive shell.
- Hover preview no longer pops up while the Inspector is open.
- Folder views that only contain subfolders now show a hint line instead of a bare grid with a confusing "0 items" pill.
- List view: tagless rows render an empty cell instead of "—", and row actions get larger tap targets.

**中文**：窄窗口外壳（<768px、无触摸）修复——顶栏搜索框不再截断；SORT/TYPE 悬空标签随控件一起隐藏；≤480px 时远程状态 pill 折叠为圆点（完整文案保留为 tooltip）；重复的视图标题移除；选择框仅在批量选择模式显示，不再是常驻灰点。重定向改为仅触摸设备跳转 mobile.html，且 viewport meta 提前到重定向脚本之前，窄窗直开与宽窗拉窄体验一致。Inspector 打开期间不再弹出 hover 浮层。仅含子文件夹的视图显示提示行。列表视图无标签行留白替代 "—"，操作列热区加大。

### Changed
- Toolbar sort/filter selects use a custom chevron style aligned with the segmented quick filters.
- Mobile card titles wrap to two lines instead of a single truncated line.
- Chinese UI copy polish across the shell and PWA surfaces; service-worker shell cache bumped to v59.

**中文**：工具栏排序/筛选 select 换成与分段过滤器一致的自定义箭头样式；移动端卡片标题改为两行换行；中文文案整体润色，PWA shell 缓存升级到 v59。

---

## 4.1.4 - 2026-08-03

### Infrastructure
- Added `scripts/release.sh` and `scripts/deploy.sh` to automate the release ritual: read the tag from `docker-compose.yml`, run version/deploy artifact checks, `git pull --ff-only`, build and save the Docker image, copy to `/nas/`, and prune old tars keeping the three newest. `make release` and `make deploy` wrap the scripts; the documented `AGENTS.md` deploy procedure now points at the scripts.

**中文**：新增 `scripts/release.sh` 与 `scripts/deploy.sh` 自动化发布流程——从 `docker-compose.yml` 读取标签、运行版本与部署产物校验、`git pull --ff-only`、构建并保存 Docker 镜像、拷贝到 `/nas/`，并清理旧 tar 仅保留最近三个版本；`make release` 与 `make deploy` 封装脚本，`AGENTS.md` 中的部署流程已改为引用脚本。

### Maintenance
- Synced the `uv.lock` project version to `4.1.3` so the lockfile matches the released tag.

**中文**：将 `uv.lock` 中的项目版本同步为 `4.1.3`，使锁文件与已发布标签一致。

---

## 4.1.3 - 2026-08-03

### Infrastructure
- Added CI regression and deploy gates: a checklist-gate that requires PRs touching UI code to reference `docs/regression-checklist.md`, a deploy-check that verifies the Dockerfile digest pin and HEALTHCHECK and then proves the image builds, and a dedicated frontend-check job pinned to Node.js 22.
- Added `scripts/verify_deploy.py` and `scripts/check_regression_gate.py`; `make check` now includes the deploy artifact check so local and CI verification stay symmetric.

**中文**：新增 CI 回归与部署门禁——涉及 UI 代码的 PR 必须在描述中引用 `docs/regression-checklist.md` 的 checklist-gate、校验 Dockerfile digest 固定与 HEALTHCHECK 并实际构建镜像的 deploy-check，以及固定 Node.js 22 的独立前端检查 job；新增 `scripts/verify_deploy.py` 与 `scripts/check_regression_gate.py`，`make check` 现包含部署产物校验，本地与 CI 保持一致。

### Tests
- Added node:test behavior tests for the frontend core.js module (formatting, item classification, i18n, routing state) behind a CommonJS export seam that is a no-op in the browser.

**中文**：为前端 core.js 模块新增 node:test 行为测试（格式化、素材分类、i18n、路由状态），通过浏览器中为 no-op 的 CommonJS 导出缝隙实现。

### Refactor
- Added structured logging to the vault parser (per-skip warnings plus a load summary) and configured the root logger to INFO so startup summaries are visible under the default uvicorn deployment.

**中文**：为 vault 解析器增加结构化日志（逐条跳过警告与加载汇总），并将 root logger 配置为 INFO，使默认 uvicorn 部署下也能看到启动汇总。

### Maintenance
- Tracked AGENTS.md in version control with a refreshed frontend module inventory, and ignored local `.qoder/` tool artifacts.

**中文**：将 AGENTS.md 纳入版本控制并刷新前端模块清单，同时忽略本地 `.qoder/` 工具产物。

---

## 4.1.2 - 2026-07-31

### Fixes
- Fixed the iPhone PWA bottom tab bar applying the home-indicator safe-area inset twice (on both the `.tabs` container and each `.tb` button). On devices with a home indicator this left a doubled blank band below the tab labels and squeezed the icon+label stack upward into the top divider line. The inset is now reserved once on the container while each button keeps only visual padding.

**中文**：修复 iPhone PWA 底部导航栏把 home indicator 安全区内边距重复应用两次的问题（`.tabs` 容器与每个 `.tb` 按钮各加了一次）。在有 home indicator 的机型上，这会在标签下方留下一条翻倍的空白带，并把图标+文字向上挤压、顶到顶部分割线。现改为只在容器上预留一次安全区，按钮仅保留视觉内边距。

### Maintenance
- Advanced the static asset revision to `1.112` and the Service Worker shell cache to `eagle-viewer-shell-v58` so installed PWAs pick up the layout fix.

**中文**：静态资源修订号更新至 `1.112`，Service Worker shell 缓存更新至 `eagle-viewer-shell-v58`，确保已安装的 PWA 能加载到本次布局修复。

---

## 4.1.1 - 2026-07-29

### Security
- Added conservative browser security headers to every HTTP response and changed password verification to constant-time comparison.
- Removed the Google Fonts dependency so the web shell remains self-contained and does not make third-party runtime requests.

**中文**：为所有 HTTP 响应增加保守的浏览器安全头，并将密码校验改为恒定时间比较；移除 Google Fonts 依赖，确保 Web 外壳完全自包含且运行时不访问第三方资源。

### Fixes
- Fixed the desktop appearance popover stacking context so all three theme controls remain visible and clickable above the content toolbar.
- Kept the static asset, Service Worker, and classic-script load order synchronized after the frontend split.

**中文**：修复桌面外观菜单的层级问题，确保三套主题按钮都能在内容工具栏上方正常点击；前端拆分后同步静态资源、Service Worker 与经典脚本加载顺序。

### Refactor
- Split the monolithic desktop stylesheet, renderer, and interaction layer into focused files while preserving the original cascade and execution order.
- Updated local and CI JavaScript checks to validate every frontend module individually.

**中文**：将超大的桌面样式、渲染层和交互层按职责拆分，并保持原始级联与执行顺序；本地和 CI 现在会逐个校验所有前端模块。

### Infrastructure
- Added a hardened Docker build context, pinned the multi-platform Python base image, and aligned Compose image tags with the release version.
- Added CI version checks and regression contracts for Docker dependencies, private build-context exclusions, external runtime assets, response headers, and frontend asset ordering.

**中文**：增加安全的 Docker 构建上下文、固定多架构 Python 基础镜像，并让 Compose 镜像标签与发布版本一致；新增 CI 版本校验及 Docker 依赖、隐私文件排除、外部资源、安全响应头和前端加载顺序回归契约。

### Maintenance
- Advanced the static asset revision to `1.111` and the Service Worker shell cache to `eagle-viewer-shell-v57`.

**中文**：静态资源修订号更新至 `1.111`，Service Worker shell 缓存更新至 `eagle-viewer-shell-v57`。

---

## 4.1.0 - 2026-07-29

### Features
- Introduced a curatorial remote-library visual system across desktop and mobile, with a stronger collection header, clearer navigation hierarchy, refined warm gallery surfaces, and higher-contrast dark workbench styling.
- Increased the default desktop asset density from 164 px to 184 px so names, metadata, and previews remain readable during remote browsing.
- Refined the iPhone shell with larger top controls, search, asset labels, and bottom navigation while preserving full safe-area coverage.

**中文**：桌面端和移动端统一升级为“策展式远程资料库”视觉系统，强化资料库标题、导航层级、暖色画廊质感和深色工作台对比度；桌面素材默认尺寸由 164 px 调整为 184 px；同步放大 iPhone 顶部控件、搜索、素材标题和底部导航，并保持安全区域完整覆盖。

### Fixes
- Improved muted text and card-border contrast in dark themes so secondary information remains legible.
- Kept asset names and metadata visible below image cards instead of relying on hover-only context.
- Removed the temporary Figma capture scripts and moved the desktop version badge into the persistent toolbar.

**中文**：提升深色主题下次级文字和卡片边框的可读性；图片卡片持续显示名称与元数据，不再依赖悬停；清理临时 Figma 采集脚本，并将桌面版本号固定显示在工具栏。

### Maintenance
- Advanced the static asset revision to `1.108` and the Service Worker shell cache to `eagle-viewer-shell-v54`.

**中文**：静态资源修订号更新至 `1.108`，Service Worker shell 缓存更新至 `eagle-viewer-shell-v54`。

---

## 4.0.1 - 2026-07-28

### Fixes
- Removed the batch ZIP download flow; multi-select now keeps the lighter copy-link action and single-file downloads still preserve the original filename.
- Fixed the desktop Inspector so clicking empty space closes the detail panel again.
- Tightened the mobile/phone layout and simplified the remaining toolbar density so the shell feels less cramped on smaller screens.

**中文**：移除批量 ZIP 下载流程，多选时只保留复制链接，单文件下载仍保持原始文件名；修复桌面端点击空白处关闭详情面板；进一步收紧手机端布局与工具栏密度，减少小屏拥挤感。

### Documentation
- Synced the release notes, regression baseline, README version badge, and static shell version markers for the 4.0.1 release.

**中文**：同步更新发版说明、回归基线、README 版本标识以及静态 shell 版本标记，完成 4.0.1 发版对齐。

---

## 4.0.0 - 2026-07-27

### Breaking Changes
- Removed the legacy viewer-state API (`/api/state`) and the old state persistence file path.
- Removed the smart view, smart folder, duplicate, color atlas, random walk, and command surfaces to keep the product focused on the core browse/search/preview/download flow.

**中文**：移除旧版 viewer state API（`/api/state`）和状态持久化文件路径；同时删去智能视图、智能文件夹、重复项、色卡、随机浏览和命令面板等入口，聚焦核心浏览/搜索/预览/下载流程。

### Fixes
- Fixed mobile viewport fit and the top-level layout density on small screens.
- Fixed the mobile version badge so it matches the actual release version.
- Tightened ZIP entry sanitization for downloaded items.

**中文**：修复移动端视口适配和密度过紧的问题；修正移动端版本号显示；加强下载 ZIP 条目名清理。

### Documentation
- Updated both READMEs to reflect the simplified product scope and current release version.
- Refreshed the release notes and regression baseline for the new major version.

**中文**：更新中英文 README 以匹配简化后的产品边界和当前版本；同步刷新发版说明和回归基线。

### Maintenance
- Bumped the static asset revision and service worker cache.

**中文**：同步提升静态资源版本号和 Service Worker 缓存名。

---

## 3.0.1 - 2026-07-24

### Changes
- Added `README.zh.md`: full Chinese translation of the README.
- Updated `README.md`: added language link to the Chinese version.
- Updated `CHANGELOG.md`: added Chinese summaries for each version entry.
- Updated `scripts/check_versions.py`: added README.zh.md version verification.

**中文**：新增中文版 README。英文 README 和 CHANGELOG 补充中文内容。版本检查脚本同步更新。

---

## 3.0.0 - 2026-07-24

### Features
- **i18n / language switcher**: New language toggle button in the desktop toolbar top-right corner. Switches between Chinese (default) and English. All static UI text — sidebar, search, sort/filter, batch bar, theme labels, remote status, PWA messages, mobile tabbar — is translated via a `data-i18n` infrastructure with `t(key)` / `setLang()` / `applyStaticI18n()`. Language preference is persisted in `localStorage` and auto-detected from the browser `navigator.language`.
- **Open-source preparation**: Full English documentation (README, CONTRIBUTING, CODE_OF_CONDUCT, release.md, regression-checklist.md), GitHub Actions CI (3.11/3.12 matrix), Issue/PR templates, MIT license metadata in pyproject.toml.
- **Privacy section** in README: documents the fully offline, no-telemetry, no-CDN nature of the viewer.
- **Governance model**: `GOVERNANCE.md` added; `AGENTS.md` moved to `.gitignore` (internal AI agent guide).

**中文**：新增中英文切换按钮（右上角工具栏），界面文字全部双语化，默认跟随浏览器语言。开源准备：全英文文档、GitHub Actions CI、Issue/PR 模板、隐私说明、治理文档。AGENTS.md 移入 .gitignore。

### Fixes
- **Mobile bottom navigation gap**: Added `100lvh` before `100dvh` in `#app` height cascade. On browsers that don't support `dvh`, `lvh` (large viewport — address bar fully retracted) ensures the tabs start at the screen bottom on first load.
- **Version fallback leak**: Backend `APP_VERSION` fell back to the literal string `"dev"` when the package wasn't pip-installed, producing `CONNECTED vdev` in the mobile library strip. Changed to read from `pyproject.toml` via `tomllib`.
- **Sync-status CSS regression** (v2.0.5): Fixed `[data-state="conflict"]` selector mismatch that broke the Merging state color.

**中文**：修复移动端底部导航空白（lvh+dvh 双重兜底）；修复后端版本号回退显示「vdev」的问题（改为从 pyproject.toml 读取）；修复同步状态 CSS 选择器不匹配。

### Documentation
- README rewritten in English with badges, full API reference, configuration table, Eagle.cool link, and product boundaries.
- `regression-checklist.md` rewritten in English.
- `docs/release.md` rewritten in English.
- `docs/logo.svg` extracted as an independent asset.
- `docs/screenshots/README.md` added with naming conventions and generation instructions.
- `docker-compose.yml`, `docker-compose.remote.example.yml`, `login.html` comments and labels English-ified.
- `SECURITY.md` and `CHANGELOG.md` already in English.
- Removed `docs/regression-results-v1.4.0.md` and `v1.5.0.md` (contained personal file paths and referenced removed features).

**中文**：README 全部英文化（含徽章、API 文档、配置表、Eagle 链接）、regression-checklist 和 release.md 英文化、提取 logo.svg、Docker compose 和 login 注释英文化、删除含个人路径的旧回归结果文件。

### Infrastructure
- `.gitignore`: added `.codebuddy/`, `AGENTS.md`, `images/`, `*.egg-info/`, `dist/`, `build/`, `docs/mockups/web-desktop-redesign.html`.
- `pyproject.toml`: added `authors`, `license`, `keywords`, `[project.urls]`.
- GitHub Actions CI: matrix test on Python 3.11 / 3.12 with lint, test, and syntax checks.
- GitHub Issue templates (bug report, feature request) and PR template.
- Docker Compose: stale `eagle-viewer:v1.3` tag → `eagle-viewer:latest`.

**中文**：gitignore 补全、pyproject.toml 补元数据、新增 CI 工作流和 Issue/PR 模板、Docker Compose 镜像版本更新。

### Maintenance
- Bumped static asset revision and SW shell cache to `eagle-viewer-shell-v45`.

**中文**：静态资源 revision 和 SW 缓存升至 v45。

---

## 2.0.5 - 2026-07-24

### Fixes
- Mobile: fix bottom navigation tabs being pushed behind the mobile browser's bottom toolbar. Root cause was `#app { height:100dvh; height:100vh; }` — `100vh` was declared last and overrode `100dvh` on dual-supporting browsers, making `#app` taller than the visible viewport. Reordered so `100dvh` wins; the tabs now stay pinned above the browser chrome.

### Cleanup
- Removed the remaining `.mobile-continue-*` dead CSS (~230 lines) that 2.0.4's notes claimed to remove but was still present. It was entangled in compound selectors with live `.mobile-workbar` / `.install-coach` / `.pull-refresh` rules, so it required selector-level stripping rather than line deletion. The live selectors and the `[data-feature-removed]` rule are preserved.
- Removed dead collection/workspace code branches: `state_store.py` no longer persists an unused `collections` field; `core.js` dropped the inert `currentCollection` / `workspaces` state; `render.js` dropped the unreachable `currentView === 'collection'` branches and the uncalled `getLastViewedItemForMobile()`; `api.js` / `bootstrap.js` / `interactions.js` dropped the corresponding dead assignments and URL params. The smart-views (`savedViews`) system and the `collectionIds.items` item cache (used by `getItemById`) remain live.
- Bumped static asset revision to `1.98` and SW shell cache to `eagle-viewer-shell-v44`.

## 2.0.4 - 2026-07-24

### UI / Visual

- Desktop & mobile full de-industrialization pass: warm terracotta palette shared across both surfaces, single design language.
- Desktop: three themes now share one token source — `gallery` (light terracotta, default), `workbench` (dark + blue accent), `carbon` (dark + green accent). Theme switching changes color only, never layout/font-size.
- Desktop dark mode: cards gain a hairline border and layered shadow; the sidebar gets a subtle right border so it no longer blends into the background.
- Mobile: tokens switched to warm terracotta and the mobile shell now reads the shared `eagle-viewer-theme` key from the desktop side (`syncTheme()`), so the phone follows the chosen desktop theme. Removed the hardcoded `data-theme="dark"` so the OS dark preference is respected when no theme is set.
- Branding: "Eagle Vault Viewer" wordmark + circular logo replaces the old banner across desktop toolbar and mobile top bar.

### Removed (dead surfaces)

- Removed the orphaned Canvas settings panel (no desktop entry point) and its `canvasPrefs` storage chain. Thumbnail density is now a plain JS variable (`gridDensity`) persisted under `eagle-viewer-grid-density`.
- Removed the logout entry point (frontend + backend `/logout` route and its offline-data cleanup page).
- Removed the entire collection system: favorites / later / done / workspace (工作集) / recentViewed. Frontend state stubs in `core.js` remain inert and safe.
- Removed dead markup (`.mobile-continue-rail`, `data-feature-removed` surfaces, folder arrow glyphs, redundant viewport meta) and the corresponding dead CSS/JS.

### Backend

- `GET /api/item/{id}/file`: inline (preview) responses get `Cache-Control: private, max-age=86400` so swiping between images no longer re-pulls the full image from the remote mount every time; downloads remain uncached. Service worker still never caches `/api` (PWA contract preserved).
- `GET /api/library/status`: now reports the app `version` from package metadata.

### Documentation

- Updated `README.md`, `PROGRESS.md`, and this changelog to 2.0.4; advanced static-asset revision to `1.97` and SW shell cache to `eagle-viewer-shell-v43`.

## 2.0.3 - 2026-07-23

### Fixes

- Mobile: mark Eagle-locked folders (encrypted / smart) with a lock icon and block navigation into them with a friendly message, instead of failing with a raw HTTP 423.
- Mobile: remove the adjacent thumbnails peeking out behind the full-screen preview so other search results no longer bleed through the background.
- Mobile: add a back button to the search view to return to the home library.
- Desktop: give light-theme cards a hairline border and layered shadow so tiles no longer blend into the near-white background (the refined light-card styling had mistakenly been scoped inside the mobile-only media query).

### Documentation

- Advance the PWA shell cache to `eagle-viewer-shell-v42` with static asset revision `1.96`.

## 2.0.2 - 2026-07-23

### Features

- Cache already-viewed mobile thumbnails in IndexedDB so recently browsed images restore instantly on weak networks or after the Vault connection drops; the cache flushes when the source library revision changes, with a bounded LRU and graceful network-only fallback when IndexedDB is unavailable.
- Add `Caddyfile.example` and remote-access guidance (HTTPS reverse proxy via Tailscale / LAN / public domain) for reaching the mobile PWA from a phone.
- Redesign the desktop layout: light gallery (Gallery Atelier) as the default line with the dark dense "tool" (Quiet Workbench) as the dark derivation; the app now starts in the light theme by default. Larger whitespace, larger radii, soft shadows, hover lift, and Fraunces display titles; also fixes dark hardcoded values leaking into the light theme.

### Fixes

- Consolidate the duplicated global theme token blocks into a single source and guard against accent self-reference, which had disabled the entire accent color across the UI.

### Documentation

- Correct the mobile PWA description: thumbnails are now cached offline, not omitted.
- Advance the PWA shell cache to `eagle-viewer-shell-v41` with static asset revision `1.95`.

## 2.0.1 - 2026-07-21

### Fixes

- Fill the available iPhone viewport in Safari and installed PWA mode, including dynamic browser chrome and safe areas.
- Increase mobile search, navigation, and bottom-tab spacing while removing excess space below the primary actions.

## 2.0.0 - 2026-07-17

### Breaking Changes

- Remove advanced list filters, smart-folder and discovery endpoints, structured document previews, offline snapshots, and extended Viewer state fields.
- Limit shared Viewer state to favorites and recently viewed items; clients using removed fields or endpoints must migrate to the core browsing API.

### Features

- Focus the desktop and mobile experience on remote browsing, plain search, folders, tags, favorites, recent items, native preview, and download.
- Add a complete light theme alongside the dark theme and improve text size, contrast, and mobile touch targets.
- Keep two predictable layouts—waterfall grid and list—with a smaller image preview toolbar and browser-native media controls.
- Keep the PWA installable while caching only the static application shell, never API responses, thumbnails, or original Vault files.

### Fixes

- Remove organize queues, smart views, smart folders, tools, source-domain filtering, special search syntax, autoplay, filmstrips, and complex batch actions from user-facing surfaces.
- Align desktop and iPhone navigation, search, Inspector, and batch output with the simplified product boundary.

### Testing

- Replace removed feature contracts with focused coverage for core APIs, state synchronization, PWA cache boundaries, layouts, search, preview formats, themes, and protected folders.
- Verify desktop and 390 x 844 mobile flows in a real browser with no console errors or warnings.

## 1.6.0 - 2026-07-16

### Features

- Rework the browser into an Eagle-inspired remote workspace with richer navigation, filtering, inspection, review, comparison, batch output, and continuous preview workflows.
- Add an app-like iPhone PWA experience with safe-area layouts, bottom navigation, gesture-driven sheets, home-screen restore, offline snapshots, and mobile review controls.
- Add shared Viewer state for ratings, collections, saved views, workspaces, notes, and visual or timed review markers without modifying the mounted Eagle library.
- Add read-only Eagle smart-folder support, password-protected folder boundaries, palette exploration, similarity ranking, random discovery, and remote library change detection.
- Add bounded Quick Look previews for legacy Word, OOXML, XMind, fonts, and proprietary assets that already have an Eagle cached thumbnail.

### Fixes

- Clear private API, thumbnail, and local Viewer data on logout, and use network-first thumbnail authorization before falling back to offline data.
- Preserve Eagle smart-folder saved views when synchronizing Viewer state across devices.

### Testing

- Expand the sample library and automated coverage for authentication, protected folders, shared state, document previews, PWA restore, offline behavior, and desktop/mobile UI contracts.

## 1.5.1 - 2026-05-08

### Documentation

- Add MIT license, contribution guide, security policy, release process, issue templates, and pull request template.
- Clarify the split between public README content and agent-facing repository guidance.
- Show the current app version in the frontend toolbar.
- Add an inline favicon to avoid a missing icon request in browsers.

### Testing

- Add pytest coverage for Eagle library parsing and key list API behavior using a minimal fixture library.
- Use real PNG files in the fixture library instead of text placeholders.
- Add GitHub Actions CI, Makefile commands, version consistency checks, and local environment examples.

## 1.5.0 - 2026-05-08

### Features

- Add advanced filters, saved views, local collections, command palette, index stats, likely duplicate detection, and image preview zoom controls.
- Add incremental loading support for folder, tag, and search views.
- Add `uv` workflow with `pyproject.toml` and `uv.lock`.
- Add regression notes for real-vault and mobile checks.

### Fixes

- Ignore stale list responses when users switch views quickly.
- Read only the start of text files for snippet generation.

### Documentation

- Document v1.5.0 features, API changes, local development workflow, and regression checklist updates.

## 1.4.0 - 2026-04-13

### Features

- Add manual library reload, incremental loading for all/recent views, batch ZIP streaming, text snippets, tag search, quick filters, and frontend module split.

### Fixes

- Serve frontend static assets through `/static/*`.
