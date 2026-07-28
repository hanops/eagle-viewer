# Regression Results — v4.0.1 (2026-07-28)

Scope: mobile/desktop polish after 4.0.0, including removal of batch ZIP download,
desktop blank-area Inspector dismissal, and the latest version/cache sync.

## Build / automated verification
- `make check` passes: version-check (pyproject/README/core.js = 4.0.1), lint,
  pytest, `compileall` (backend), and `node --check` (all web modules).
- PWA restore contract test updated for the new asset revision (`1.105`) and SW
  cache (`eagle-viewer-shell-v53`) and passes.

## Manual verification
- Local app booted against `tests/fixtures/sample.library` on `127.0.0.1:8765`.
- Confirmed the frontend reported version `4.0.1`.
- Confirmed the desktop Inspector closes when clicking blank space outside content.
- Confirmed 390 px mobile layout remains within the viewport with no horizontal
  overflow and no obvious cramped toolbar bleed.
- Confirmed multi-select exposes copy-link actions without the removed ZIP flow.

## Notes
- Release notes and README version markers were synchronized with the new version.
- Static asset revision advanced to `1.105`; SW shell cache advanced to
  `eagle-viewer-shell-v53`.
