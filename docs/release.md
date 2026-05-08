# Release Process

## Prepare

1. Update version values in:
   - `pyproject.toml`
   - `README.md`
   - `app/web/core.js`
   - `app/web/sw.js` cache name when static assets change
2. Update `CHANGELOG.md`.
3. Run:

```bash
make check
```

4. If the release changes UI behavior, run the manual checklist in
   `docs/regression-checklist.md` and save notes under `docs/regression-results-vX.Y.Z.md`.

## Publish

Create a GitHub Release from `main`:

```bash
gh release create vX.Y.Z --target main --title "vX.Y.Z" --generate-notes --notes-start-tag vPREVIOUS
```

If using a token for `gh`, pass it only as a temporary environment variable and
rotate it after use.

## After Release

- Confirm the GitHub Release exists.
- Confirm the remote tag points at the intended commit.
- Keep `requirements.txt` in sync while Docker builds still use it.
