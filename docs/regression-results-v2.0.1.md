# v2.0.1 Regression Results

Date: 2026-07-21

## Automated checks

- `make check`: passed
- Version consistency, Ruff, pytest, Python compilation, and JavaScript syntax checks passed
- Pytest: 34 passed
- `git diff --check`: passed

## Mobile browser

- Verified with Playwright at a 390 x 844 viewport using `tests/fixtures/sample.library`
- Confirmed the document exactly matched the viewport at 390 x 844 with no horizontal overflow
- Confirmed the top toolbar occupied the full 390 px width and the bottom tab bar ended at the viewport edge
- Opened mobile Search and confirmed its search, filter, sort, and layout controls remained reachable
- Opened More and switched from dark to light theme successfully
- Confirmed the frontend reported version 2.0.1
- Browser console reported 0 errors and 0 warnings

## Notes

- Local verification URL: `http://127.0.0.1:8765`
- PWA shell cache advanced to `eagle-viewer-shell-v40` with static asset revision `1.94`
- API responses, thumbnails, and original Vault files remain network-only
