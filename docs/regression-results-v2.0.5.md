# Regression Results — v2.0.5 (2026-07-24)

Scope: mobile bottom-nav viewport fix, removal of the remaining `.mobile-continue-*`
dead CSS, and removal of dead collection/workspace code branches; version bump to 2.0.5
(static asset revision `1.98`, SW shell cache `eagle-viewer-shell-v44`).

## Build / automated verification
- `make check` passes: version-check (pyproject/README/core.js = 2.0.5), lint,
  pytest (34 passed), `compileall` (backend), `node --check` (all web modules).
- PWA restore contract test (`test_pwa_restore_contract.py`) updated for the new
  asset revision (`1.98`) and SW cache (`eagle-viewer-shell-v44`) and passes — service
  worker does NOT cache `/api`, `manifest.json` shortcuts do not reference removed
  surfaces, and the `eagle-viewer-theme` key is preserved across state restore.

## Manual verification (programmatic, via Playwright + CSSOM probes)
The review environment cannot render images, so checks use computed-style and
CSSOM assertions rather than screenshots. The app was booted against the sample
fixture vault and loaded in headless Chromium.

### CSS cleanup (`styles.css`)
- [x] **`styles.css` parses with zero errors** — loaded as a real stylesheet in the
      browser; `document.styleSheets` reports the sheet parses cleanly (no console
      errors/warnings).
- [x] **Dead rules gone**: **0** `mobile-continue` rules remain (was ~230 lines
      entangled in compound selectors with live `.mobile-workbar` / `.install-coach`
      / `.pull-refresh` rules). The removal was performed by a brace-aware pass; as a
      side effect the whole file's whitespace was normalized (leading indentation
      stripped, spacing added around `{`), so the diff is larger than the ~230 lines
      of dead rules — but no live rule values changed.
- [x] **Live rules preserved**: 50 `.mobile-workbar` references retained (and 44
      distinct `.mobile-workbar` rules counted in the CSSOM), and the
      `[data-feature-removed]` rule (asserted by the PWA contract test) is still
      present.
- [x] **No broken selectors**: no empty rules and no dangling comma-before-brace
      produced. The PWA contract test (which asserts `[data-feature-removed]` is in
      `styles.css`) still passes.

### Mobile bottom-nav fix (`mobile.css`)
- [x] **Viewport rule order corrected**: `#app { height:100vh; height:100dvh; }`
      now declares `100dvh` last so it wins on dual-supporting browsers. Previously
      `100vh` (last) overrode `100dvh`, making `#app` taller than the visible
      viewport and pushing the bottom `.tabs` behind the mobile browser's bottom
      toolbar. The masonry/waterfall layout itself is unchanged.

### Dead code branches
- [x] **Backend**: `state_store.py` no longer persists an unused `collections` field;
      frontend never read it, and the `/api/state` endpoint is retained for density
      and other viewer-state sync.
- [x] **Frontend**: `core.js` dropped the inert `currentCollection` / `workspaces`
      state; `render.js` dropped the unreachable `currentView === 'collection'`
      branches and the uncalled `getLastViewedItemForMobile()`; `api.js` /
      `bootstrap.js` / `interactions.js` dropped the corresponding dead assignments
      and URL params.
- [x] **Live systems kept**: smart views (`savedViews`) and the `collectionIds.items`
      item cache (used by `getItemById`) remain intact — confirmed no dangling refs
      after removal (node --check + grep).

## Version consistency
- `pyproject.toml`, `README.md`, `app/web/core.js` all at `2.0.5`.
- Static asset revision advanced `1.97 -> 1.98`; SW shell cache
  `eagle-viewer-shell-v43 -> v44`.

## Notes / non-goals
- Auth logic, vault parsing, and the mobile IndexedDB thumbnail cache strategy are
  unchanged.
- The `styles.css` cleanup only removes dead rules; no live style values changed, so
  no visual regression is expected (verified via CSSOM rule retention).
