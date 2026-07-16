# Changelog

## 1.6.0 - 2026-07-16

### Features

- Rework the browser into an Eagle-inspired remote workspace with richer navigation, filtering, inspection, review, comparison, batch output, and continuous preview workflows.
- Add an app-like iPhone PWA experience with safe-area layouts, bottom navigation, gesture-driven sheets, home-screen restore, offline snapshots, and mobile review controls.
- Add shared Viewer state for ratings, collections, saved views, workspaces, notes, and visual or timed review markers without modifying the mounted Eagle library.
- Add read-only Eagle smart-folder support, password-protected folder boundaries, palette exploration, similarity ranking, random discovery, and remote library change detection.
- Add bounded Quick Look previews for legacy Word, OOXML, XMind, fonts, and proprietary assets that already have an Eagle cached thumbnail.

### Fixes

- Clear private API, thumbnail, and local Viewer data on logout, and use network-first thumbnail authorization before falling back to offline data.
- Preserve Eagle smart-folder saved views when synchronizing Viewer state across devices.

### Testing

- Expand the sample library and automated coverage for authentication, protected folders, shared state, document previews, PWA restore, offline behavior, and desktop/mobile UI contracts.

## 1.5.1 - 2026-05-08

### Documentation

- Add MIT license, contribution guide, security policy, release process, issue templates, and pull request template.
- Clarify the split between public README content and agent-facing repository guidance.
- Show the current app version in the frontend toolbar.
- Add an inline favicon to avoid a missing icon request in browsers.

### Testing

- Add pytest coverage for Eagle library parsing and key list API behavior using a minimal fixture library.
- Use real PNG files in the fixture library instead of text placeholders.
- Add GitHub Actions CI, Makefile commands, version consistency checks, and local environment examples.

## 1.5.0 - 2026-05-08

### Features

- Add advanced filters, saved views, local collections, command palette, index stats, likely duplicate detection, and image preview zoom controls.
- Add incremental loading support for folder, tag, and search views.
- Add `uv` workflow with `pyproject.toml` and `uv.lock`.
- Add regression notes for real-vault and mobile checks.

### Fixes

- Ignore stale list responses when users switch views quickly.
- Read only the start of text files for snippet generation.

### Documentation

- Document v1.5.0 features, API changes, local development workflow, and regression checklist updates.

## 1.4.0 - 2026-04-13

### Features

- Add manual library reload, incremental loading for all/recent views, batch ZIP streaming, text snippets, tag search, quick filters, and frontend module split.

### Fixes

- Serve frontend static assets through `/static/*`.
