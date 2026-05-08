# Repository Guidelines

## Project Structure & Module Organization

- `app/main.py`: FastAPI entrypoint and app wiring.
- `app/api/`: HTTP endpoints (`folders.py`, `items.py`).
- `app/vault/`: Eagle library parsing and in-memory indexing.
- `app/web/`: Frontend assets.
  - `index.html`: page shell
  - `styles.css`: all styles
  - `core.js`, `api.js`, `render.js`, `interactions.js`, `bootstrap.js`: frontend modules
- `tests/`: pytest coverage and a minimal fake Eagle library fixture.
- `docs/`: project notes, release process, and manual regression checklist/results.
- `README.md`: user-facing setup and API documentation.

Automated tests live in `tests/`. Treat `docs/regression-checklist.md` as the manual verification baseline for UI-visible changes.

## Build, Test, and Development Commands

- `uv sync`: create/update the project-local `.venv` from `pyproject.toml` and `uv.lock`.
- `export EAGLE_VAULT_ROOT=/path/to/Design.library`: point the app at an Eagle library.
- `make dev`: run locally.
- `make check`: run version consistency, lint, pytest, and Python/JS syntax checks.
- `make test`: run pytest only.
- `uv run python -m compileall app`: quick backend syntax check.
- `node --check app/web/core.js app/web/render.js app/web/api.js app/web/interactions.js app/web/bootstrap.js app/web/sw.js`: quick frontend syntax check.

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
