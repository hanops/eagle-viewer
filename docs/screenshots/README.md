# Screenshots

> Add screenshots here following the naming convention below. Generate them by running the app with `tests/fixtures/sample.library` and capturing the browser.

| File | Content |
|------|---------|
| `desktop-gallery.png` | Desktop, Gallery theme (light terracotta, default) — All Items view with folder tree |
| `desktop-workbench.png` | Desktop, Workbench theme (dark + blue accent) — All Items view |
| `desktop-carbon.png` | Desktop, Carbon theme (dark + green accent) — a folder view |
| `desktop-inspector.png` | Desktop — Inspector panel open on an asset |
| `mobile-library.png` | Mobile (390×844) — Library tab showing assets |
| `mobile-folders.png` | Mobile — Folders tab with tree expanded |
| `mobile-search.png` | Mobile — Search tab with results |
| `mobile-inspector.png` | Mobile — Asset detail / Inspector view |

## Generating screenshots

```bash
# Start the dev server with the sample library
export EAGLE_VAULT_ROOT=$(pwd)/tests/fixtures/sample.library
make dev &

# Then capture using your browser's dev tools or a tool like Playwright:
# npx playwright install chromium
# node scripts/capture-screenshots.js
```

Screenshots should be in PNG format, 1440×900 for desktop and 390×844 for mobile (iPhone 14 size).
