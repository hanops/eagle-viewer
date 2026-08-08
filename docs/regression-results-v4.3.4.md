# Regression Results — v4.3.4

Date: 2026-08-08

## Automated checks

- `make check` passed: 41 Python tests, 8 JavaScript tests, Ruff, version check (4.3.4), deploy check, Python compilation, and JavaScript behavior tests.
- `git diff --check` passed.

## Code-level verification

- Version bump 4.3.3 -> 4.3.4 synchronized across `pyproject.toml`, `README.md`, `README.zh.md`, `app/web/core.js` (VERSION), `docker-compose.yml`, `docker-compose.remote.example.yml`, and `uv.lock`.
- Standalone detection now ORs `navigator.standalone` with `(display-mode: standalone)` / `(display-mode: fullscreen)` media queries; on desktop/Android browser surfaces none of them match, so the correction stays scoped to installed PWAs.
- `--pwa-h` is derived from `screen.height` (portrait) / `screen.width` (landscape) and refreshed on `orientationchange`/`resize`, so the shell height no longer depends on any viewport unit; `100vh` remains only as the pre-JS fallback.
- Preview top bar top padding raised from `env(safe-area-inset-top) + 9px` to `+ 16px` for status-bar breathing room.
- Static asset revision bumped to 1.145 and Service Worker cache to v92 in lockstep across `index.html`, `mobile.html`, and the SW precache list.

## Release note

iOS home-screen behavior (bottom gap fill, action-button safe-area padding, preview top-bar spacing) must be rechecked on a physical iPhone after deployment; Playwright emulation cannot exercise installed-PWA display modes. If a device still shows the old shell, remove and re-add the home-screen icon to clear the Service Worker cache.
