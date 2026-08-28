#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${WALLET_DEMO_PORT:-3852}"
service_url="${WALLET_SERVICE_URL:-http://localhost:3000}"
dashboard_url="http://127.0.0.1:${port}"
pid_file="/tmp/mi-wallet-demo-browser-${port}.pid"
log_file="/tmp/mi-wallet-demo-browser-${port}.log"

if curl -fsS "${dashboard_url}/api/health" >/dev/null 2>&1; then
  echo "Wallet demo browser already running at ${dashboard_url}"
elif lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${port} is already in use by another process" >&2
  exit 1
else
  nohup python3 "${skill_dir}/dashboard/server.py" \
    --port "${port}" \
    --wallet-service-url "${service_url}" \
    >"${log_file}" 2>&1 &
  echo "$!" >"${pid_file}"

  for _ in {1..50}; do
    if curl -fsS "${dashboard_url}/api/health" >/dev/null 2>&1; then
      echo "Wallet demo browser running at ${dashboard_url}"
      break
    fi
    sleep 0.1
  done

  if ! curl -fsS "${dashboard_url}/api/health" >/dev/null 2>&1; then
    echo "Wallet demo browser failed to start; see ${log_file}" >&2
    exit 1
  fi
fi

if [[ "${1:-}" == "--open" ]]; then
  open "${dashboard_url}"
fi
