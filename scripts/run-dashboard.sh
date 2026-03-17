#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_BIN="/opt/homebrew/bin/node"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export CODEXBAR_BIN="/opt/homebrew/bin/codexbar"

cd "$REPO_DIR"

# Launchd can be restarted while a separate build/test run is still active.
# If a fresh client bundle already exists, start the server immediately instead
# of blocking on another build and leaving port 4329 dark.
if ! ls public/assets/index-*.js >/dev/null 2>&1; then
  corepack yarn vite build >/dev/null
fi

exec env HOST=127.0.0.1 PORT=4329 "$NODE_BIN" server/index.js
