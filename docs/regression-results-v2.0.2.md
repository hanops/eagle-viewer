# v2.0.2 Regression Results

Date: 2026-07-23

## Scope of change

This release is a desktop visual redesign plus a default-theme switch; it does
not touch API, data, or application logic.

- `f6bbff5` — Redesign desktop layout: light gallery (Gallery Atelier) becomes
  the default line, dark dense "tool" (Quiet Workbench) is the dark derivation;
  app now starts in the **light** theme by default. Dark hardcoded values are
  now scoped under `[data-theme="dark"]` so they no longer leak into the light
  theme.
- `75b18f3` — Consolidate duplicated theme token blocks and guard against accent
  self-reference, which had disabled the accent color across the UI.
- `512ae99` — Version bump to 2.0.2, README theme-default fix, CHANGELOG update.

## Automated checks

- `make check`: passed (Version check ok: 2.0.2; 36 passed)
- Ruff, pytest, Python compilation, and JavaScript syntax checks passed
- `git diff --check`: passed

## Dual-theme render probe (headless)

- Light theme: no dark-value leakage — `card-thumb` background resolves to the
  light token `rgb(227,228,225)`, not the dark `#24262a`.
- Dark theme: restores the dark token `#24262a`; toolbar heights 56px / 42px as
  expected.
- Narrow desktop (980px viewport): `@media(max-width:1100px)` responsive block
  collapses correctly in **both** themes — `.toolbar-left` width = 188px and the
  density control is hidden. (This block must live inside both the light and
  dark theme sections; a global media query alone loses to the
  `[data-theme="dark"] .toolbar-left` specificity.)
- Browser console: 0 errors, 0 warnings during render.

## Notes

- This release changes only CSS visuals and the default theme value. Search,
  multi-select, ZIP download, Inspector, preview, and mobile flows are covered
  by the 36 pytest cases and the established manual baseline; a quick light-theme
  main-path walk is recommended before announcing.
- PWA shell cache advanced to `eagle-viewer-shell-v41` with static asset
  revision `1.95` (from `75b18f3`); API responses, thumbnails, and original
  Vault files remain network-only.
- `mobile.css` is an independent system; the desktop CSS changes have zero
  impact on the mobile experience.
