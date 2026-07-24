# Changelog

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
