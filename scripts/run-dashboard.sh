#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_BIN="/opt/homebrew/bin/node"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export CODEXBAR_BIN="/opt/homebrew/bin/codexbar"

cd "$REPO_DIR"
corepack yarn vite build >/dev/null
exec env HOST=127.0.0.1 PORT=4329 "$NODE_BIN" server/index.js
