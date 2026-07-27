# Regression Results — v4.0.0 (2026-07-27)

Scope: major release focused on product simplification, removal of the legacy viewer-state API, mobile layout tightening, and release/version synchronization.

## Build / automated verification
- `UV_CACHE_DIR=/private/tmp/eagle-viewer-uv-cache make check` passes: version-check (pyproject/README/core.js = 4.0.0), lint, pytest (34 passed), `compileall` (backend), and `node --check` (all web modules).
- PWA restore contract test updated for the new asset revision (`1.101`) and SW cache (`eagle-viewer-shell-v49`) and passes.

## Live smoke verification
- Local app booted against `tests/fixtures/sample.library` on `127.0.0.1:8765`.
- `GET /api/info` returns `version: "4.0.0"` and the reduced feature list.
- `GET /api/state` returns `404`, confirming the legacy state API is removed.
- `mobile.html` serves the synced static asset revision (`1.101`) and matches the current release version.

## Notes
- The release intentionally removes the old state-persistence surface and several advanced surfaces to keep the viewer centered on browse/search/preview/download.
- `playwright` is not installed in this environment, so the UI smoke pass here was done with live HTTP responses rather than a headless browser.
