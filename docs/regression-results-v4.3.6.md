# Regression Results — v4.3.6

Date: 2026-08-08

## Automated checks

- `make check` passed: 41 Python tests, 8 JavaScript tests, Ruff, version check (4.3.6), deploy check, Python compilation, and JavaScript behavior tests.
- `git diff --check` passed.

## Code-level verification

- Version bump 4.3.5 -> 4.3.6 synchronized across `pyproject.toml`, `README.md`, `README.zh.md`, `app/web/core.js` (VERSION), `docker-compose.yml`, `docker-compose.remote.example.yml`, and `uv.lock`. Asset revision bumped 1.146 -> 1.147 and service-worker cache v93 -> v94 consistently across `index.html`, `mobile.html`, and `sw.js`.
- Root cause confirmed by local reproduction with a simulated standalone layout viewport (430 x 873 CSS px, matching the measured iPhone 15 Pro Max standalone viewport):
  - v4.3.5 state (`--pwa-h: 932px`): shell measured `h=932 bottom=932`, tab bar spanned `853~932` while the viewport ended at 873 — only the top 20px of the 79px tab bar was visible; the rest sat outside the viewport, matching the user-reported "tab bar only appears while scrolling and snaps back on release".
  - v4.3.6 state (no `--pwa-h`): shell `bottom=873 = viewport height`, tab bar spans `794~873` — fully visible and flush with the layout-viewport bottom. The preview overlay measured `top=0 bottom=873` (full coverage via `inset:0`), and the html canvas background resolves to the tab-bar color `--bg2` (rgb(255,253,248)), turning black (rgb(13,12,11)) while the preview is open, so the strip below the viewport is seamless.
- The `--pwa-h` physical-height sizing introduced in v4.3.4 is fully removed from `mobile.css` and the bootstrap in `mobile.html`; the standalone detection class and the `display-mode` media-query fallback both keep the safe-area paddings and the canvas color rules.

## Requires device verification (after deploy)

- iPhone home-screen standalone: the bottom tab bar is fully visible on launch without any scrolling, and remains flush with the bottom of the visible screen (no background-colored band below it).
- Preview overlay: the Download / Save-to-Album buttons are fully visible above the Home Indicator without scrolling.
- Rotating the device between portrait and landscape keeps the tab bar visible.
