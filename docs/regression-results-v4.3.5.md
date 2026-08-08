# Regression Results — v4.3.5

Date: 2026-08-08

## Automated checks

- `make check` passed: 41 Python tests, 8 JavaScript tests, Ruff, version check (4.3.5), deploy check, Python compilation, and JavaScript behavior tests.
- `git diff --check` passed.

## Code-level verification

- Version bump 4.3.4 -> 4.3.5 synchronized across `pyproject.toml`, `README.md`, `README.zh.md`, `app/web/core.js` (VERSION), `docker-compose.yml`, `docker-compose.remote.example.yml`, and `uv.lock`.
- Root cause confirmed by pixel analysis of the two iPhone screenshots (1290x2796 @3x): the standalone shell and preview overlay both ended at y=2619px (873pt) while the physical screen is 932pt tall — a 59pt shortfall left a paper-colored blank band below the tab bar and cut through the preview action buttons. This matches the documented WebKit standalone viewport-unit under-report.
- The `--pwa-h` physical-height sizing from v4.3.4 is kept as the primary fix; v4.3.5 adds:
  - `display-mode: standalone/fullscreen` media-query mirror of the height and safe-area rules, so the correction applies even if the bootstrap JS detection fails early.
  - Bootstrap split into two independent try blocks: theme write (which touches `localStorage`) can no longer abort the standalone detection.
  - Html canvas background painted to match the tab bar (`var(--bg2)`) in standalone mode, and switched to the preview overlay color (`#0d0c0b`) via a `pv-open` class toggled by `mobile.js` while the preview is open — even a worst-case short viewport cannot show a background-color blank band.
- Static asset revision bumped to 1.146 and Service Worker cache to v93 in lockstep across `index.html`, `mobile.html`, and the SW precache list.

## Release note

iOS home-screen behavior (tab-bar bottom fill, preview action buttons fully visible) must be rechecked on a physical iPhone after deployment; Playwright emulation cannot exercise installed-PWA display modes. If a device still shows the old shell, close the PWA fully and relaunch (SW v93 with `skipWaiting`/`clients.claim` takes over on the next launch); as a last resort, remove and re-add the home-screen icon to clear the Service Worker cache.
