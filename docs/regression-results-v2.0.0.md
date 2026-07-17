# v2.0.0 Regression Results

Date: 2026-07-17

## Automated checks

- `make check`: passed
- Version consistency, Ruff, pytest, Python compilation, and JavaScript syntax checks passed
- Pytest: 33 passed
- `git diff --check`: passed

## Desktop browser

- Loaded the sample Vault without a blank screen
- Confirmed waterfall grid and list layouts
- Switched between dark and light themes
- Searched for `Alpha` and received the expected single result
- Opened the result Inspector and confirmed metadata, source link, preview, and download actions
- Confirmed removed organize, smart, tool, adaptive gallery, and advanced preview entries were absent

## Mobile browser

- Verified at a 390 x 844 viewport
- Confirmed the four tabs: Library, Favorites, Search, and More
- Opened mobile Search and confirmed plain keyword search, grid/list layout choices, and basic type/sort controls
- Confirmed special `#tag` and `/folder` syntax shortcuts and adaptive gallery were absent
- Browser console reported 0 errors and 0 warnings

## Notes

- Test Vault: `tests/fixtures/sample.library`
- Local verification URL: `http://127.0.0.1:8765`
- The PWA service worker caches only the static shell; API responses, thumbnails, and original files remain network-only
