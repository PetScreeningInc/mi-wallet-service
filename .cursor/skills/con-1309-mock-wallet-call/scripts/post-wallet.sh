#!/usr/bin/env bash
set -euo pipefail

base="${1:?usage: post-wallet.sh BASE_URL PROVIDER PAYLOAD_JSON}"
provider="${2:?APPLE or GOOGLE}"
payload="${3:?path to json}"

if [[ "$provider" != "APPLE" && "$provider" != "GOOGLE" ]]; then
  echo "provider must be APPLE or GOOGLE" >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
python3 - "$payload" "$provider" "$tmp" <<'PY'
import json, sys
path, provider, out = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    body = json.load(f)
body["provider"] = provider
with open(out, "w") as f:
    json.dump(body, f)
PY

curl -sS -X POST "$base/v1/wallets" \
  -H "content-type: application/json" \
  -H "Idempotency-Key: con-1309-$(basename "$payload" .json)-$provider" \
  --data @"$tmp"
echo
