# Regression Results — v4.1.1 (2026-07-29)

Scope: engineering hardening, frontend module decomposition, self-contained
runtime assets, Docker and CI contract checks, and desktop theme-menu repair.

## Build / automated verification

- `make check` passes: version consistency, Ruff, pytest (38 tests),
  `compileall`, and `node --check` for every web module.
- PWA restore contract uses static asset revision `1.111` and Service Worker
  cache `eagle-viewer-shell-v57`.
- Project contracts verify Docker dependency alignment, private build-context
  exclusions, no external frontend runtime assets, security response headers,
  and deterministic desktop asset ordering.
- `git diff --check` reports no whitespace errors.

## Manual verification

- Started the app against `tests/fixtures/sample.library`.
- Verified desktop loading, search, Inspector open/close, click-empty-space
  close behavior, and light/dark theme switching at 1280 × 720.
- Verified the appearance popover remains above the content toolbar and its
  Gallery, Workbench, and Carbon controls are clickable.
- Verified the mobile shell at 390 × 844 in light and dark themes.
- Confirmed the mobile header, content, and three-tab bottom navigation fill
  the viewport exactly, with no horizontal overflow or excess bottom gap.
- Verified mobile search returns the expected fixture result.
- Confirmed the browser console reports no warnings or errors during the
  checked desktop and mobile flows.

## Notes

- Desktop CSS, rendering, and interaction code now load as ordered,
  responsibility-focused assets.
- The application version remains independent from the static asset revision
  and Service Worker cache generation.
