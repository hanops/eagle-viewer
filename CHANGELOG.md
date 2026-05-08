# Changelog

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
