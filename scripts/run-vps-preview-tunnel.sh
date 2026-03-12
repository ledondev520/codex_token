#!/bin/zsh
set -euo pipefail

SSH_BIN="/usr/bin/ssh"
SSH_KEY="${SSH_KEY:-/Users/helena/.ssh/codex_vps_preview}"
VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-23.81.118.51}"
LOCAL_PORT="${LOCAL_PORT:-4329}"
REMOTE_BIND_HOST="${REMOTE_BIND_HOST:-127.0.0.1}"
REMOTE_BIND_PORT="${REMOTE_BIND_PORT:-14329}"

exec "$SSH_BIN" \
  -i "$SSH_KEY" \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=accept-new \
  -N \
  -R "${REMOTE_BIND_HOST}:${REMOTE_BIND_PORT}:127.0.0.1:${LOCAL_PORT}" \
  "${VPS_USER}@${VPS_HOST}"
