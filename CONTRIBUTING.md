# Contributing

Thanks for helping improve Eagle Vault Viewer.

## Local Setup

```bash
uv sync
cp .env.example .env
export EAGLE_VAULT_ROOT=/path/to/Design.library
make dev
```

## Checks

Run the full local check before opening a pull request:

```bash
make check
```

For UI-visible changes, also walk the relevant items in
`docs/regression-checklist.md` and include notes or screenshots in the PR.

## Guidelines

- Keep the Eagle library read-only unless a task explicitly changes that policy.
- Do not commit real vault paths, passwords, tokens, or private library data.
- Prefer small, focused changes that match the existing framework-free frontend style.
- Update README, regression notes, or API docs when behavior changes.
