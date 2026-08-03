"""Gate UI changes on a docs/regression-checklist.md reference in PRs.

UI-visible changes (app/web/, app/api/, app/vault/) must reference the manual
regression checklist in the PR description so the manual verification baseline
stays tied to the change. Runs as a CI gate on pull requests; a no-op for
pushes and local runs.
"""
import os
import subprocess
import sys


UI_PATHS = ("app/web/", "app/api/", "app/vault/", "app/main.py", "app/config.py")
# Require a reference to the checklist document itself (not just the bare word),
# so placeholder/incidental mentions of the checklist name do not satisfy the gate.
DOC_REF = "regression-checklist.md"


def main() -> None:
    if os.environ.get("GITHUB_EVENT_NAME", "push") != "pull_request":
        print("SKIP: not a pull request event")
        return

    pr_body = os.environ.get("PR_BODY") or ""
    if DOC_REF in pr_body.lower():
        print(f"OK: PR description references docs/{DOC_REF}")
        return

    base = os.environ.get("GITHUB_BASE_REF") or "main"
    try:
        subprocess.run(
            ["git", "fetch", "origin", base, "--depth=1"],
            check=True,
            capture_output=True,
        )
        merge_base = subprocess.run(
            ["git", "merge-base", f"origin/{base}", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        changed = subprocess.run(
            ["git", "diff", "--name-only", merge_base, "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.splitlines()
    except subprocess.CalledProcessError as exc:
        # Fail closed: if we cannot compute the changed files we cannot prove the
        # gate is satisfied, so the job fails loudly instead of silently passing.
        print(f"FAIL: could not compute changed files against origin/{base} ({exc})")
        sys.exit(1)

    ui_changed = [f for f in changed if f.startswith(UI_PATHS)]
    if not ui_changed:
        print("OK: no UI files changed")
        return

    print("FAIL: UI files changed without a docs/regression-checklist.md reference:")
    for f in ui_changed:
        print(f"  - {f}")
    print("Reference the checklist in the PR description, e.g. 'Manual verification: walked docs/regression-checklist.md'.")
    sys.exit(1)


if __name__ == "__main__":
    main()
