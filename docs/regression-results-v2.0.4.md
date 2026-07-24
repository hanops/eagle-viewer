# Regression Results — v2.0.4 (2026-07-24)

Scope: full de-industrialization of desktop + mobile UI, removal of dead surfaces
(canvas settings panel, logout, collection system), branding update, and small
backend additions (preview cache header, status `version` field).

## Build / automated verification
- `make check` passes: version-check (pyproject/README/core.js = 2.0.4), lint,
  pytest (35 passed), `compileall` (backend), `node --check` (all web modules).
- No dangling references to removed surfaces: `canvasPrefs`, `canvasSettingsPanel`,
  `logout`/`/logout`, `folder-toggle`, `data-feature-removed` surfaces, collection
  functions (`showCollection`, `openWorkspacesPanel`, `favoriteItems`, …) are gone
  from live code. Only inert dead stubs remain (`core.js` empty `collectionIds`/
  `workspaces`; `styles.css` `.mobile-continue-*` rules + `[data-feature-removed]`
  selector, which tests assert exist).
- PWA restore contract test (`test_pwa_restore_contract.py`) still passes — service
  worker does NOT cache `/api`, `manifest.json` shortcuts do not reference removed
  surfaces, and the `eagle-viewer-theme` key is preserved across state restore.

## Manual verification (programmatic, via Playwright computed-style probes)
The review environment cannot render images, so visual aesthetics were checked with
computed-style assertions rather than screenshots.

### Desktop (`/`)
- [x] **Three themes share one token source**: `gallery` (light terracotta, default),
      `workbench` (dark + blue `#5a7aff`), `carbon` (dark + green `#34d399`). The
      `.theme-swatch` tri-switch drives `data-theme`+`data-accent` only.
- [x] **Dark cards**: now carry a hairline `border` + `box-shadow: 0 1px 3px rgba(0,0,0,.38)`,
      verified by computed style in both `workbench` and `carbon`.
- [x] **Sidebar separation (dark)**: subtle `border-right` added so the sidebar no
      longer blends into the background.
- [x] **Light cards**: hairline border + layered shadow retained (no regression from 2.0.3).
- [x] **Branding**: banner replaced by circular logo + "Eagle Vault Viewer" wordmark.
- [x] **Canvas panel gone**: `canvasSettingsPanel` DOM and `[data-canvas-*]` handlers
      removed; grid density still works via `gridDensity` JS var (`eagle-viewer-grid-density`).
- [x] **Logout gone**: no `/logout` route (removed from `main.py` + `AuthMiddleware`).

### Mobile (`/mobile.html`)
- [x] **Theme follows desktop**: `syncTheme()` maps the shared `eagle-viewer-theme`
      key to the mobile `data-theme`/`data-accent`; tokens switched from cold blue-grey
      oklch to warm terracotta hex (matches desktop).
- [x] **OS dark preference respected**: hardcoded `data-theme="dark"` removed from
      `<html>`; `@media (prefers-color-scheme: dark)` now drives the default dark shell.
- [x] **Branding**: top bar shows the circular logo + wordmark.
- [x] **No dangling mobile buttons**: `data-mobile-more-action="canvas"` removed.

### Backend
- [x] `/api/item/{id}/file`: inline previews return `Cache-Control: private, max-age=86400`;
      downloads uncached. SW still never caches `/api` (PWA contract preserved).
- [x] `/api/library/status`: now includes `version` (from package metadata, falls back to `dev`).

## Version consistency
- `pyproject.toml`, `README.md`, `app/web/core.js` all at `2.0.4`.
- Static asset revision advanced `1.96 -> 1.97`; SW shell cache `eagle-viewer-shell-v42 -> v43`.

## Notes / non-goals
- Auth logic unchanged (only the logout route + its cleanup page were removed).
- Vault parsing and mobile IndexedDB cache strategy unchanged.
- Subjective polish deferred for user visual confirmation: desktop Fraunces offline
  fallback, deeper mobile layout/spacing, desktop masonry column gap. No functional
  regressions expected from leaving these as-is.
