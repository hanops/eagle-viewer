#!/usr/bin/env bash
# release.sh — Minimal release automation for eagle-viewer.
#
# USAGE:
#   bash scripts/release.sh          # pre-flight checks + build + save + transfer + prune
#   REMOTE=1 bash scripts/release.sh # also SSH to dev box and run deploy.sh there
#
# What it does:
#   1. Reads TAG from docker-compose.yml.
#   2. Runs version-check (pyproject ↔ README ↔ core.js ↔ compose alignment).
#   3. Runs deploy-check (Dockerfile digest-pinned + HEALTHCHECK).
#   4. Builds Docker image.
#   5. Saves tar to ./images/.
#   6. Copies tar to /nas/ (with ownership fix).
#   7. Prunes old tars, keeping the 3 newest.
#
# Environment:
#   REMOTE  — if "1", SSH to dev box and run deploy.sh after local steps.
#   DRY_RUN — if "1", print commands without executing.

set -euo pipefail

REMOTE="${REMOTE:-0}"
DRY_RUN="${DRY_RUN:-0}"
KEEP_COUNT=3

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

# ── 1. Read TAG ──────────────────────────────────────────────────────────────
TAG=$(sed -n 's/.*image:\s*eagle-viewer:v\([^\s]*\).*/\1/p' docker-compose.yml | head -1)
if [ -z "$TAG" ]; then
  echo "ERROR: could not extract tag from docker-compose.yml" >&2
  exit 1
fi
echo "==> Release eagle-viewer:v${TAG}"

# ── 2. Version alignment check ───────────────────────────────────────────────
echo "==> [1/4] Version alignment check..."
make version-check

# ── 3. Deploy artifact check ─────────────────────────────────────────────────
echo "==> [2/4] Deploy artifact check..."
make deploy-check

# ── 4. Build image ───────────────────────────────────────────────────────────
IMAGE_TAG="eagle-viewer:v${TAG}"
echo "==> [3/4] Building ${IMAGE_TAG}..."
run sudo docker build -t "${IMAGE_TAG}" .

# ── 5. Save tar ──────────────────────────────────────────────────────────────
mkdir -p ./images
TAR_NAME="eagle-viewer-v${TAG}.tar"
echo "==> Saving to ./images/${TAR_NAME}..."
run sudo docker save "${IMAGE_TAG}" -o "./images/${TAR_NAME}"

# ── 6. Transfer to NAS ──────────────────────────────────────────────────────
echo "==> [4/4] Transferring to /nas/..."
run sudo chown "$(id -u):$(id -g)" "./images/${TAR_NAME}"
run cp "./images/${TAR_NAME}" /nas/

# ── 7. Prune old tars (keep N newest) ────────────────────────────────────────
echo "==> Pruning old images (keeping ${KEEP_COUNT} newest)..."

KEEP_SET=""
for t in $(git tag --sort=-v:refname | head -"${KEEP_COUNT}"); do
  KEEP_SET="$KEEP_SET eagle-viewer-$t.tar"
done
echo "    keeping:${KEEP_SET}"

prune_dir() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  for f in "$dir"/eagle-viewer-*.tar "$dir"/eagle-viewer-image-*.tar; do
    [ -e "$f" ] || continue
    local base
    base=$(basename "$f")
    case " $KEEP_SET " in
      *" $base "*) ;;
      *) echo "    removing $dir/$base"; run rm -f -- "$f" ;;
    esac
  done
}

prune_dir "./images"
prune_dir "/nas"

echo "==> Released eagle-viewer:v${TAG}"

# ── 8. Optional remote deploy ────────────────────────────────────────────────
if [ "$REMOTE" = "1" ]; then
  echo "==> Deploying on dev box..."
  run ssh -p 18422 guoyin@dev.local \
    "cd ~/docker-build/eagle-viewer && bash scripts/deploy.sh"
  echo "==> Remote deploy complete."
fi
