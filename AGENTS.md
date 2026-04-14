# Repository Guidelines

## Project Structure & Module Organization

- `app/main.py`: FastAPI entrypoint and app wiring.
- `app/api/`: HTTP endpoints (`folders.py`, `items.py`).
- `app/vault/`: Eagle library parsing and in-memory indexing.
- `app/web/`: Frontend assets.
  - `index.html`: page shell
  - `styles.css`: all styles
  - `core.js`, `api.js`, `render.js`, `interactions.js`, `bootstrap.js`: frontend modules
- `docs/`: project notes and manual regression checklist.
- `README.md`: user-facing setup and API documentation.

There is no dedicated automated test directory yet. Treat `docs/regression-checklist.md` as the current manual verification baseline.

## Build, Test, and Development Commands

- `source ~/Envs/eagle-viewer/bin/activate`: activate the expected local virtualenv.
- `pip install -r requirements.txt`: install backend dependencies.
- `export EAGLE_VAULT_ROOT=/path/to/Design.library`: point the app at an Eagle library.
- `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`: run locally.
- `python -m compileall app`: quick backend syntax check.
- `node --check app/web/core.js app/web/render.js app/web/api.js app/web/interactions.js app/web/bootstrap.js`: quick frontend syntax check.

## Coding Style & Naming Conventions

- Use 4 spaces in Python and 2 spaces in HTML/CSS/JS, matching the current codebase.
- Keep frontend code framework-free and modular; prefer adding logic to the existing `app/web/*.js` modules rather than reintroducing large inline scripts.
- Prefer descriptive snake_case in Python and camelCase in JavaScript.
- Use ASCII by default.
- For searches, prefer `rg`; for file edits, use focused patches instead of broad rewrites.

## Testing Guidelines

- Run `python -m compileall app` and the `node --check ...` command before finishing changes.
- For UI changes, walk the relevant paths in `docs/regression-checklist.md`.
- If you add a bug fix, include the affected user flow in your manual verification notes.

## Commit & Pull Request Guidelines

- No stable commit convention is documented in this repository; use short, imperative commit messages, e.g. `Refactor frontend bootstrap flow`.
- PRs should include:
  - a brief problem/solution summary
  - touched areas (`app/api`, `app/web`, etc.)
  - manual verification performed
  - screenshots or short recordings for UI-visible changes

## Security & Configuration Tips

- Do not commit real library paths, passwords, or session secrets.
- Use `VIEWER_PASSWORD` and `VIEWER_SECRET_KEY` via environment variables.
- Keep the Eagle library mount read-only in Docker unless a task explicitly requires otherwise.
