# Eagle Vault Viewer — Manual Regression Checklist

## Environment

- Use `tests/fixtures/sample.library` or a test vault with no private data.
- Desktop: verify at least Chrome; mobile: verify at least 390×844 viewport.
- Walk the main paths once per theme (light and dark).
- No unhandled browser console errors during testing.

## Login & Homepage

- With no password configured, the app loads directly; with password, login and error display work correctly.
- Homepage shows All Items; folder tree, tags, total asset count, and vault status are correct.
- Light / dark themes cover toolbar, sidebar, canvas, Inspector, overlays, and mobile sheet consistently; body text and buttons have sufficient contrast.
- Desktop body/filename text ≥ 12px, mobile search input ≥ 16px, primary touch buttons ≥ 40px height.
- Password-protected folders and their descendants are excluded from indexing, search, thumbnails, and file endpoints.

## Streamlined Navigation

- Desktop sidebar shows only: All Items, Recent Additions, Folders, and Tags.
- Desktop sidebar does **not** show: pending review, done, workspaces, smart views, Eagle smart folders, or tool sections.
- Top bar does **not** show: advanced filters, saved views, statistics, duplicates, command palette, or list export.
- Cards, list, Inspector, context menu, and fullscreen preview do **not** show: ratings, pending/done markers, workspaces, Viewer notes, review markers, or similar assets.
- Legacy `smart`, `eagle-smart`, `duplicates`, `colors`, `random` and non-folder collection URLs fall back safely to All Items.
- Reload library, canvas layout, theme, sidebar toggle, and Inspector toggle still work.

## Search & Navigation

- Search supports name, tag, and note matching.
- All Items, Recent Additions, Folders, Tags, and Search views switch correctly.
- Folder tree can expand, collapse, drag to resize, and hide; counts include child folders.
- Sorting works by: modified, created, name, size, format.
- Type filter works by: Image, Video, Document, Audio, Other.
- Current folder, tag, search, sort, type, and open asset are recoverable from the URL hash.
- Opening a folder or tag updates the breadcrumb, sidebar highlight, and asset results.

## Gallery & Canvas

- Waterfall and list views switch without overlap or horizontal overflow.
- Thumbnail density and fill/fit display settings take effect immediately.
- Desktop hover shows preview and detail actions only.
- Single-click opens Inspector; double-click or preview button opens fullscreen.
- Images, video, audio, PDF, and plain text preview inline; other formats show a download prompt.
- Failed thumbnails show a placeholder or fallback without breaking the grid.

## Inspector & Preview

- Inspector shows: preview, format, dimensions, file size, folder path, tags, source URL, Eagle notes, and asset ID.
- Inspector supports previous / next navigation; closing returns to and highlights the current asset.
- On desktop, clicking empty space in the main gallery closes the Inspector without affecting cards or toolbar controls.
- Preview, copy link, and download are accessible from the Inspector.
- Fullscreen preview supports previous / next navigation for previewable assets in the current view.
- Image zoom-to-fit, fit-to-window, and zoom-in work correctly; video/audio native player controls work.
- Offline downloads clearly indicate that a Vault connection is required.

## Multi-Select & Output

- Selection and deselection work correctly without accidentally opening details.
- Batch bar shows count, total size, type breakdown, and thumbnail previews.
- Batch bar does **not** show: pending review, done markers, workspaces, or queue management.
- Multi-select copy links work; no batch download, Markdown/HTML reference, CSV/JSON export, or image comparison surface.

## Mobile

- Bottom navigation shows only: Library, Folders, and Search tabs; active state is accurate.
- Search sheet on empty input shows only Recent 7 Days as browsing entry points.
- More sheet shows only: connection status, sidebar toggle, canvas settings, refresh, theme, and other basic settings.
- Search and More sheets do **not** show: organization queues, workspaces, smart views, Eagle smart folders, advanced filters, duplicates, color spectrum, random walk, statistics, or command palette.
- Long-press action sheet groups into: Open, Actions, and Output — only shows select, copy link, download, and contextual navigation.
- Mobile Inspector and fullscreen preview do **not** show: pending/done markers, workspaces, Viewer notes, or review markers.
- Sheets close on swipe-down; Inspector supports half-screen / full-screen toggle, left/right swipe, and safe-area insets.
- No horizontal overflow; bottom actions are not obscured by the Home Indicator.
- Safari and home-screen standalone mode fill the viewport with dynamic viewport sizing; the top search and navigation have sufficient touch height; the three-tab bottom bar leaves no excess whitespace after Home Indicator avoidance.
- In home-screen standalone mode the full-screen preview overlay reaches the physical screen bottom (no blank band under it), and its top close/share buttons show their icons in both themes.
- Paginated directory and search results (>120 items) hydrate thumbnails correctly on scroll, never showing a blank canvas (verify `setupInfinite` does not kill the lazy-hydration observer `__hio`).

## PWA & Cache

- Manifest quick links only include: All Items and Search Vault.
- Service Worker upgrade fetches the latest static assets without blocking current sheets.
- Only the static shell is cached; no offline data management or snapshot UI is shown.
- Cache does **not** include any `/api` requests, thumbnails, or originals.
- When the remote Vault reconnects, the current view refreshes gracefully.

## Refresh & Cache

- Manual library reload completes without errors; the current view recovers to a reasonable state.
- When a remote Vault update is detected, a prompt appears; after confirmation, the tree, tags, and current results refresh.
- Switching between background and foreground does not break preview, Inspector, or multi-select state.
- After a static asset version upgrade, the browser does not serve stale UI for an extended period.

## Minimum Pass Criteria

- No white screen, no main-path console errors.
- All Items, Recent, Folders, Tags, Search, detail, multi-select, download, and preview each work at least once.
- Desktop and mobile surfaces show no traces of removed features (organization queues, smart views, smart folders, tools).
- No obvious layout breakage, low-contrast text, or interaction regressions.
