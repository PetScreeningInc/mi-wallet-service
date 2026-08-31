#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${WALLET_DEMO_PORT:-3852}"
service_url="${WALLET_SERVICE_URL:-http://localhost:3000}"
service_url="${service_url%/}"
dashboard_url="http://127.0.0.1:${port}"
pid_file="/tmp/mi-wallet-demo-browser-${port}.pid"
log_file="/tmp/mi-wallet-demo-browser-${port}.log"

running_service_url() {
  curl -fsS "${dashboard_url}/api/health" 2>/dev/null |
    python3 -c 'import json,sys; print(json.load(sys.stdin).get("walletServiceUrl",""))' 2>/dev/null
}

start_dashboard() {
  nohup python3 "${skill_dir}/dashboard/server.py" \
    --port "${port}" \
    --wallet-service-url "${service_url}" \
    >"${log_file}" 2>&1 &
  echo "$!" >"${pid_file}"

  for _ in {1..50}; do
    if curl -fsS "${dashboard_url}/api/health" >/dev/null 2>&1; then
      echo "Wallet demo browser running at ${dashboard_url} -> ${service_url}"
      return 0
    fi
    sleep 0.1
  done

  echo "Wallet demo browser failed to start; see ${log_file}" >&2
  return 1
}

current="$(running_service_url)"

if [[ -n "${current}" ]]; then
  if [[ "${current}" == "${service_url}" ]]; then
    echo "Wallet demo browser already running at ${dashboard_url} -> ${current}"
  else
    # A dashboard answered /api/health, so the listener is ours: restart it so the
    # requested WALLET_SERVICE_URL takes effect instead of the stale one.
    echo "Restarting wallet demo browser: ${current} -> ${service_url}"
    listener="$(lsof -ti "tcp:${port}" -sTCP:LISTEN | head -n1 || true)"
    if [[ -n "${listener}" ]]; then
      kill "${listener}" 2>/dev/null || true
      for _ in {1..50}; do
        kill -0 "${listener}" 2>/dev/null || break
        sleep 0.1
      done
    fi
    start_dashboard
  fi
elif lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${port} is already in use by another process" >&2
  exit 1
else
  start_dashboard
fi

if [[ "${1:-}" == "--open" ]]; then
  open "${dashboard_url}"
fi
