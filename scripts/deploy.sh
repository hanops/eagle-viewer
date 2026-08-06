#!/usr/bin/env bash
# deploy.sh — Build, publish, and prune eagle-viewer Docker images.
#
# USAGE: run on the dev box after SSH (sdev), from the repo checkout:
#   cd ~/docker-build/eagle-viewer
#   bash scripts/deploy.sh
#
# Prerequisites:
#   - The git tag referenced by docker-compose.yml must exist on the remote.
#   - sudo docker must work without a password prompt.
#   - /nas/ must be mounted and writable.
#
# What it does:
#   1. git pull --ff-only (first, so the tag is read from the released compose).
#   2. Reads TAG from docker-compose.yml (image: eagle-viewer:v<TAG>).
#   3. Runs version-check to confirm tag alignment.
#   4. sudo docker build -t eagle-viewer:$TAG .
#   5. sudo docker save → ./images/eagle-viewer-$TAG.tar.
#   6. sudo chown → cp to /nas/.
#   7. Prune old tars from ./images/ and /nas/, keeping the 3 newest.

set -euo pipefail

# ── 1. Pull latest from GitHub ───────────────────────────────────────────────
# Must happen before reading TAG: a release commit changes the compose tag,
# and building the pre-pull tag would mislabel the new code.
echo "==> Pulling latest code..."
git pull --ff-only

# ── 2. Read TAG from docker-compose.yml ──────────────────────────────────────
TAG=$(sed -n 's/.*image:\s*eagle-viewer:v\([^\s]*\).*/\1/p' docker-compose.yml | head -1)
if [ -z "$TAG" ]; then
  echo "ERROR: could not extract tag from docker-compose.yml" >&2
  exit 1
fi
echo "==> TAG=v${TAG}"

# ── 3. Version alignment check ───────────────────────────────────────────────
echo "==> Running version-check..."
if command -v make >/dev/null 2>&1; then
  make version-check
else
  # dev box has no make; check_versions.py only uses the stdlib
  python3 scripts/check_versions.py
fi

# ── 4. Build image ───────────────────────────────────────────────────────────
echo "==> Building eagle-viewer:v${TAG}..."
sudo docker build -t "eagle-viewer:v${TAG}" .

# ── 5. Save tar ──────────────────────────────────────────────────────────────
mkdir -p ./images
TAR_NAME="eagle-viewer-v${TAG}.tar"
echo "==> Saving to ./images/${TAR_NAME}..."
sudo docker save "eagle-viewer:v${TAG}" -o "./images/${TAR_NAME}"

# ── 6. Fix ownership and copy to NAS ─────────────────────────────────────────
echo "==> Fixing ownership..."
sudo chown "$(id -u):$(id -g)" "./images/${TAR_NAME}"

echo "==> Copying to /nas/..."
cp "./images/${TAR_NAME}" /nas/

echo "==> Published eagle-viewer:v${TAG}"

# ── 7. Prune old tars (keep 3 newest) ────────────────────────────────────────
echo "==> Pruning old images (keeping 3 newest)..."

# Build the keep-set from the 3 newest git tags.
KEEP_SET=""
for t in $(git tag --sort=-v:refname | head -3); do
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
      *) echo "    removing $dir/$base"; rm -f -- "$f" ;;
    esac
  done
}

prune_dir "./images"
prune_dir "/nas"

echo "==> Done."
