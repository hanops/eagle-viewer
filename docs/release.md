# Release Process

## Prepare

1. Update version values in:
   - `pyproject.toml`
   - `README.md`
   - `README.zh.md`
   - `app/web/core.js`
   - `docker-compose.yml`
   - `docker-compose.remote.example.yml`
   - `uv.lock`
   - `app/web/sw.js` cache name when static assets change
2. Update `CHANGELOG.md`.
3. When desktop static assets are added, removed, or split, keep their load order aligned in `app/web/index.html`, `app/web/sw.js`, and `tests/test_pwa_restore_contract.py`.
4. Run:

```bash
make check
```

5. If the release changes UI behavior, run the manual checklist in
   `docs/regression-checklist.md` and save notes under `docs/regression-results-vX.Y.Z.md`.

## Publish

Create a GitHub Release from `main`:

```bash
gh release create vX.Y.Z --target main --title "vX.Y.Z" --generate-notes
```

If using a token for `gh`, pass it only as a temporary environment variable and
rotate it after use.

## After Release

- Confirm the GitHub Release exists.
- Confirm the remote tag points at the intended commit.
- Keep `requirements.txt` in sync while Docker builds still use it.

## Docker Image Build

Tag convention: `eagle-viewer:vX.Y.Z` (do **not** use `:latest`).

```bash
docker build -t eagle-viewer:vX.Y.Z .
docker save eagle-viewer:vX.Y.Z -o images/eagle-viewer-vX.Y.Z.tar
```
