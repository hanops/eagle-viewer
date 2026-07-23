# Regression Results — v2.0.3 (2026-07-23)

Scope: mobile PWA fixes (locked folders, preview background, search back button) and a
desktop light-theme card-border fix. No backend / API changes.

## Manual verification

### Mobile (`/mobile.html`)
- [x] **Locked folders**: Eagle-locked (encrypted / smart) folders render with a lock
      icon and are greyed out; tapping shows "该文件夹被 Eagle 锁定，无法在远程查看"
      instead of navigating into a raw HTTP 423 error.
- [x] **Normal folders**: drilling into a normal subfolder still works (folder stack
      push/pop, back chevron).
- [x] **Preview background**: opening any item from search / library shows a clean
      black background with no adjacent thumbnails peeking through.
- [x] **Swipe between items**: left/right swipe still switches items (does not depend
      on the removed peek thumbnails).
- [x] **Search back button**: the search view top bar shows a back arrow that returns
      to the home library.

### Desktop (`/`)
- [x] **Light theme cards**: tiles in the light (default) theme now have a hairline
      border + layered shadow, clearly separated from the `#f4f4f1` background; hover
      lifts with an accent-coloured border; selected card shows an accent ring.
- [x] **Dark theme cards**: unchanged (already had a border); light fix is scoped to
      `[data-theme="light"]` and does not regress dark.
- [x] **Theme switch**: toggling light/dark keeps both card styles correct.

### PWA shell
- [x] `sw.js` cache name advanced to `eagle-viewer-shell-v42`; static asset query
      revision bumped `1.95 -> 1.96` so clients refetch the new shell/CSS.

## Version consistency
- `pyproject.toml`, `README.md`, `app/web/core.js` all at `2.0.3`.
- `make check` (version-check, lint, pytest, compileall, node --check) passes.

## Notes / non-goals
- No changes to `app/api`, Vault parsing, or mobile IndexedDB cache strategy.
- Responsive 1100px / mobile `@media` rules untouched.
