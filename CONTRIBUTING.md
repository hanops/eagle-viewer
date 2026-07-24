# Contributing to Eagle Vault Viewer

Thanks for helping improve Eagle Vault Viewer!

## Code of Conduct

This project is governed by the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold its standards. Report unacceptable behavior to `opsnote@gmail.com`.

## Local Setup

```bash
uv sync
cp .env.example .env
export EAGLE_VAULT_ROOT=/path/to/Design.library
make dev
```

The app will start at `http://localhost:8000`.

## Running Checks

Always run the full check suite before opening a pull request:

```bash
make check
```

This runs version consistency, Ruff linting, pytest, Python `compileall`, and JavaScript `node --check`.

For UI-visible changes, also walk the relevant items in [`docs/regression-checklist.md`](docs/regression-checklist.md) and attach notes or screenshots to your PR.

## Pull Request Process

1. **Fork & branch**: Create a feature branch from `main`.
2. **One change per PR**: Keep focused. If you have multiple unrelated changes, open separate PRs.
3. **Test coverage**: Add or update tests for new backend functionality. Bug fixes should include a test that reproduces the issue.
4. **Commit messages**: Use short, imperative messages. Conventional prefixes (`feat:`, `fix:`, `docs:`, `refactor:`) are welcome but optional.
5. **Documentation**: Update the [README](README.md), API docs, or regression checklist when behavior changes.
6. **Review**: Request a review from a maintainer. Automated CI must pass before merging.

## Guidelines

- **Frontend**: Vanilla HTML/CSS/JS only. No frameworks. Keep logic in the existing `app/web/*.js` modules.
- **Backend**: FastAPI. New endpoints should follow the existing patterns in `app/api/`.
- **Styles**: 4-space indentation for Python, 2-space for HTML/CSS/JS. Match the existing codebase.
- **Security**: Never commit real vault paths, passwords, tokens, or private library data. Keep the Eagle library mount read-only unless a task explicitly requires otherwise.
- **Mobile**: `mobile.html` uses a separate `mobile.css`. Changes to `styles.css` do not affect mobile.
- **PWA**: Service Worker must **never** cache `/api` responses. The SW cache contract is enforced by `tests/test_pwa_restore_contract.py`.

## Reporting Issues

- **Bug reports**: Include steps to reproduce, expected vs. actual behavior, browser/OS version, and console errors if any.
- **Feature requests**: Describe the use case and how it fits within the [product boundaries](README.md#product-boundaries).
- **Security vulnerabilities**: Do **not** open a public issue. Email `opsnote@gmail.com` instead (see [`SECURITY.md`](SECURITY.md)).

## Getting Help

- Open a [GitHub Discussion](https://github.com/hanops/eagle-viewer/discussions) for questions.
- For urgent security matters, email the maintainer directly.
