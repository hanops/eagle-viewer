# Changelog · 更新日志

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
