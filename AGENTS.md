# Repository Guidelines

## Project Structure & Module Organization

- `app/main.py`: FastAPI entrypoint and app wiring.
- `app/api/`: HTTP endpoints (`folders.py`, `items.py`).
- `app/vault/`: Eagle library parsing and in-memory indexing.
- `app/web/`: Frontend assets.
  - `index.html`: page shell
  - `styles*.css`: all styles (`styles.css` plus per-surface files: `styles-collection.css`, `styles-desktop.css`, `styles-detail.css`, `styles-formats.css`, `styles-mobile-*.css`, `styles-polish.css`)
  - JS modules (classic scripts loaded via `<script>` tags; they share globals through the `EagleViewer` namespace):
    - `core.js`, `api.js`, `bootstrap.js`: state/i18n/helpers, API client, bootstrapping
    - `render*.js`: rendering (`render.js`, `render-collection.js`, `render-content.js`, `render-hover.js`, `render-inspector.js`, `render-preview.js`, `render-preview-documents.js`, `render-preview-media.js`, `render-preview-navigation.js`, `render-selection.js`)
    - `interactions*.js`: interactions (`interactions.js`, `interactions-actions.js`, `interactions-bindings.js`, `interactions-filters.js`, `interactions-install.js`, `interactions-items.js`, `interactions-layout.js`, `interactions-mobile.js`, `interactions-remote.js`)
    - `mobile.js`, `sw.js`: mobile surface and service worker
- `tests/`: pytest coverage and a minimal fake Eagle library fixture.
- `docs/`: project notes, release process, and manual regression checklist/results.
- `README.md`: user-facing setup and API documentation.

Automated tests live in `tests/`. Treat `docs/regression-checklist.md` as the manual verification baseline for UI-visible changes.

## Build, Test, and Development Commands

- `uv sync`: create/update the project-local `.venv` from `pyproject.toml` and `uv.lock`.
- `export EAGLE_VAULT_ROOT=/path/to/Design.library`: point the app at an Eagle library.
- `make dev`: run locally.
- `make check`: run version consistency, lint, pytest, Python/JS syntax checks, and JS behavior tests (`tests/js/`).
- `make test`: run pytest only.
- `make deploy-check`: verify deploy artifacts (compose tag, Dockerfile digest pin and healthcheck).
- `uv run python -m compileall app`: quick backend syntax check.
- `node --check app/web/*.js`: quick frontend syntax check (all files in `app/web/`; glob covers new modules automatically).

## Deploy: build the image and publish to the NAS

There is no CI for deployment — images are built on the dev box and shipped to a NAS share as a `.tar`, then `docker load`ed where they run.

- `sdev` is a local shell alias for `ssh -p 18422 guoyin@dev.local`. The build checkout on that host is `~/docker-build/eagle-viewer` (a clone of the GitHub origin), **not** the dev home root.
- Release first (so the tag exists on the GitHub origin), then on the dev box:

  ```bash
  sdev
  cd ~/docker-build/eagle-viewer
  bash scripts/deploy.sh
  ```

  The script automates the full ritual: read TAG from `docker-compose.yml`, run `make version-check`, `git pull --ff-only`, `sudo docker build`, `sudo docker save`, `chown`, copy to `/nas/`, and prune old tars (keeping the 3 newest).

- **Image tag = compose tag.** `docker-compose.yml` pins `image: eagle-viewer:<version>`; build/save/`/nas` tar must all use that exact tag or the running compose won't pick the new image up. `scripts/check_versions.py` (run by `make check` / CI) keeps the compose tag in lockstep with `pyproject.toml`, so the version you release is the tag you build.
- **`sudo` is required**: `guoyin` is not in the `docker` group on the dev box (sudo is passwordless for docker there).
- **Build context is lean** (`.dockerignore`); the `Dockerfile` pins a multi-platform `python:3.12-slim-bookworm` base by digest. Build is normally fast (most layers cached).
- **`/nas/` is a world-writable NAS mount.** The `chown` restores the tar to `guoyin:guoyin` after `docker save` writes it as root.
- **Old `.tar`s are pruned by `scripts/deploy.sh`** — retention standard: keep the three latest versions. The script scopes the prune to this project's files only (`eagle-viewer-*.tar` and `eagle-viewer-image-*.tar`), never touching other projects' tars in the shared `/nas/`.
- **Consumer side** (not observed in `history`): `docker load -i /nas/eagle-viewer-$TAG.tar` then `docker compose up -d`.

## Coding Style & Naming Conventions

- Use 4 spaces in Python and 2 spaces in HTML/CSS/JS, matching the current codebase.
- Keep frontend code framework-free and modular; prefer adding logic to the existing `app/web/*.js` modules rather than reintroducing large inline scripts.
- Prefer descriptive snake_case in Python and camelCase in JavaScript.
- Use ASCII by default.
- For searches, prefer `rg`; for file edits, use focused patches instead of broad rewrites.

## Testing Guidelines

- Run `make check` before finishing changes.
- Tests use `tests/fixtures/sample.library`; do not depend on a private local Eagle library for automated tests.
- For UI changes, walk the relevant paths in `docs/regression-checklist.md`.
- If you add a bug fix, include the affected user flow in your manual verification notes.

## Commit & Pull Request Guidelines

- Use short, imperative commit messages. Conventional prefixes are welcome when helpful, e.g. `feat: add saved views` or `docs: update release notes`.
- PRs should include:
  - a brief problem/solution summary
  - touched areas (`app/api`, `app/web`, etc.)
  - manual verification performed
  - screenshots or short recordings for UI-visible changes

## Security & Configuration Tips

- Do not commit real library paths, passwords, or session secrets.
- Use `VIEWER_PASSWORD` and `VIEWER_SECRET_KEY` via environment variables.
- Keep the Eagle library mount read-only in Docker unless a task explicitly requires otherwise.
