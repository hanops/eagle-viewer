# Regression Results — v4.3.3

Date: 2026-08-08

## Automated checks

- `make check` passed: 41 Python tests, 8 JavaScript tests, Ruff, version check (4.3.3), deploy check, Python compilation, and JavaScript behavior tests.
- `git diff --check` passed.

## Code-level verification

- Version bump 4.3.2 -> 4.3.3 synchronized across `pyproject.toml`, `README.md`, `README.zh.md`, `app/web/core.js` (VERSION and VERSION_DATE), `docker-compose.yml`, `docker-compose.remote.example.yml`, and `uv.lock`; repository-wide grep finds no stale `1.142` asset pins or `4.3.2` version references.
- `.pwa-standalone .overlay { bottom:auto; height:100vh; }` composes safely with the base `.overlay` rule (`position:fixed; inset:0`), keeping the top edge anchored while replacing the dvh-dependent bottom.
- `.pv-top button svg { width:18px; height:18px; }` matches the explicit-sizing convention of every other inline SVG in `mobile.css` (`.top .theme svg`, `.tb svg`, `.pv-hint svg`, etc.); the close/share buttons in `mobile.html` were the only remaining zero-intrinsic-size SVGs.
- The `navigator.standalone` class toggle sits inside the existing theme-bootstrap `try/catch`; on non-iOS surfaces the property is `undefined` and no class is added, so desktop and Android rendering paths are untouched.
- Service Worker `CACHE_NAME` bumped to `v90` in lockstep with the `v=1.143` asset pins in `index.html`, `mobile.html`, and the SW precache list.

## Release note

iOS home-screen standalone behavior (bottom gap fill, preview icon visibility, tab-bar safe-area fallback) must be rechecked on a physical iPhone after deployment; Playwright emulation cannot exercise `navigator.standalone`.
