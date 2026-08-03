"""Verify deploy artifacts are internally consistent and mechanically buildable.

Checks (all read-only, no docker dependency):
1. The Dockerfile pins its base image by digest.
2. The Dockerfile declares a HEALTHCHECK (own line, not in a comment).

Version/tag consistency between pyproject.toml and docker-compose.yml is owned by
scripts/check_versions.py (run by `make check` / CI), not duplicated here.

The companion CI job (deploy-check in .github/workflows/ci.yml) additionally
runs `docker build` to prove the image actually builds and tags correctly.
"""
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    base_match = re.search(r"^FROM\s+(\S+)", dockerfile, re.MULTILINE)
    if not base_match:
        raise SystemExit("Could not find FROM in Dockerfile")
    if "@sha256:" not in base_match.group(1):
        raise SystemExit(f"Base image is not digest-pinned: {base_match.group(1)}")
    if not re.search(r"^HEALTHCHECK", dockerfile, re.MULTILINE):
        raise SystemExit("Dockerfile has no HEALTHCHECK")

    print("Deploy check ok: FROM digest-pinned, HEALTHCHECK present")


if __name__ == "__main__":
    main()
