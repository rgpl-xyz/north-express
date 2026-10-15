#!/usr/bin/env bash
# Builds one commit of this repo from a clean export and publishes it to the
# rgpl VPS: the build goes to /var/www/north-express/releases/<commit>, then the
# /var/www/north-express/current symlink that nginx serves is switched atomically.
# A release is moved into place whole and never changed afterwards: a commit whose
# release is already on the server is switched to without rebuilding. The release it
# replaces becomes /var/www/north-express/previous, which nginx falls
# back to for hashed files that open tabs still request. Keeps the newest three
# releases for rollback (see deploy/README.md).
#
# Usage, from the repo root on a machine that can `ssh rgpl`:
#   deploy/deploy.sh [commit]    # default: origin/main
set -euo pipefail

APP=north-express
HOST=${DEPLOY_HOST:-rgpl}
SITE_ROOT=${DEPLOY_ROOT:-/var/www/$APP}
DIST=dist/north-express/browser
KEEP=3

git fetch --quiet origin main
commit=$(git rev-parse --verify "${1:-origin/main}^{commit}")
if ! git merge-base --is-ancestor "$commit" origin/main; then
  echo "Refusing to deploy $commit: it is not on origin/main." >&2
  exit 1
fi
release=$(git rev-parse --short=7 "$commit")
releases=$SITE_ROOT/releases

if ssh "$HOST" "test -d '$releases/$release'"; then
  echo "$release is already on $HOST; switching to it without rebuilding."
else
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  git archive "$commit" | tar -x -C "$work"
  (cd "$work" && npm ci --no-audit --no-fund && npx ng build)

  # Unpacked outside releases/ and moved in with one rename, so a release is either
  # complete or absent. An upload cut short leaves only incoming/, cleared next time.
  echo "Publishing $release to $HOST:$SITE_ROOT"
  tar -C "$work/$DIST" -czf - . | ssh "$HOST" "set -eu
    rm -rf '$SITE_ROOT/incoming'
    mkdir -p '$SITE_ROOT/incoming' '$releases'
    tar -xzf - --no-same-owner -C '$SITE_ROOT/incoming'
    mv -T '$SITE_ROOT/incoming' '$releases/$release'"
fi

ssh "$HOST" "set -eu
  live=\$(readlink '$SITE_ROOT/current' || true)
  if [ -n \"\$live\" ] && [ \"\$live\" != 'releases/$release' ]; then
    ln -sfn \"\$live\" '$SITE_ROOT/previous.next'
    mv -Tf '$SITE_ROOT/previous.next' '$SITE_ROOT/previous'
  fi
  ln -sfn 'releases/$release' '$SITE_ROOT/current.next'
  mv -Tf '$SITE_ROOT/current.next' '$SITE_ROOT/current'
  echo \"\$(date -u +%FT%TZ) $release\" >> '$SITE_ROOT/deploy-history'
  previous=\$(basename \"\$(readlink '$SITE_ROOT/previous' || echo none)\")
  cd '$releases'
  ls -1t | grep -vx -e '$release' -e \"\$previous\" | tail -n +\$(($KEEP - 1)) | xargs -r rm -rf --"

echo "Deployed $release: https://$APP.app.rgpl.xyz"
