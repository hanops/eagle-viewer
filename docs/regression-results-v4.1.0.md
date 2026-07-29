# Regression Results — v4.1.0 (2026-07-29)

Scope: curatorial desktop/mobile UI refinement, improved dark-theme readability,
larger default desktop asset density, persistent desktop version display, and
release/cache synchronization.

## Build / automated verification

- `make check` passes: version consistency, Ruff, pytest (33 tests),
  `compileall`, and `node --check` for all web modules.
- PWA restore contract uses static asset revision `1.108` and Service Worker
  cache `eagle-viewer-shell-v54`.
- `git diff --check` reports no whitespace errors.

## Manual verification

- Started the app against `tests/fixtures/sample.library`.
- Verified the desktop gallery at 1440 × 960 in light and dark themes.
- Verified the mobile gallery at 390 × 844 in light and dark themes.
- Confirmed the mobile layout fills the viewport with the bottom navigation at
  the screen edge and no horizontal overflow.
- Confirmed dark-theme primary and muted text, card borders, and file-cover
  excerpts remain legible.
- Confirmed image-card names and metadata remain visible without hover.
- Confirmed the browser console reports no warnings or errors during the checked
  desktop and mobile flows.

## Notes

- The desktop toolbar keeps the release version visible.
- Temporary Figma capture scripts are no longer present in production HTML.
- Static asset revision advanced to `1.108`; SW shell cache advanced to
  `eagle-viewer-shell-v54`.
