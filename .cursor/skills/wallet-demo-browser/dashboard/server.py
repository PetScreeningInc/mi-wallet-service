#!/usr/bin/env python3
import argparse
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SKILL_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SKILL_DIR.parents[2]
DASHBOARD_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = REPO_ROOT / "src" / "templates"
PAYLOADS_DIR = REPO_ROOT / ".cursor" / "skills" / "con-1309-mock-wallet-call" / "payloads"


def read_json(path: Path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def examples_by_template():
    examples = {}
    if not PAYLOADS_DIR.exists():
        return examples
    for path in sorted(PAYLOADS_DIR.glob("*.json")):
        try:
            payload = read_json(path)
        except (OSError, json.JSONDecodeError):
            continue
        key = payload.get("template")
        if isinstance(key, str):
            examples.setdefault(key, payload)
    return examples


def template_catalog():
    examples = examples_by_template()
    catalog = []
    for manifest_path in sorted(TEMPLATES_DIR.glob("*/v*/template.json")):
        try:
            manifest = read_json(manifest_path)
            schema = read_json(manifest_path.with_name("schema.json"))
        except (OSError, json.JSONDecodeError):
            continue
        key = manifest.get("key")
        version = manifest.get("version")
        if not isinstance(key, str) or not isinstance(version, int):
            continue
        sample = examples.get(key)
        catalog.append(
            {
                "key": key,
                "version": version,
                "current": manifest.get("current") is True,
                "fields": manifest.get("fields", {}),
                "schema": schema,
                "example": sample
                or {
                    "template": key,
                    "templateVersion": version,
                    "provider": "APPLE",
                    "source": "wallet-demo-browser",
                    "sourceReference": f"{key.lower()}-demo",
                    "data": {},
                },
            }
        )
    return catalog


class DashboardHandler(SimpleHTTPRequestHandler):
    wallet_service_url = "http://localhost:3000"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)

    def log_message(self, format, *args):
        print(f"[wallet-demo] {self.address_string()} {format % args}", flush=True)

    def send_json(self, status, body):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path == "/api/health":
            self.send_json(
                200,
                {
                    "status": "ok",
                    "walletServiceUrl": self.wallet_service_url,
                    "repoRoot": str(REPO_ROOT),
                },
            )
            return
        if self.path == "/api/templates":
            self.send_json(200, {"templates": template_catalog()})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/wallets":
            self.send_json(404, {"message": "Not found"})
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 1_000_000:
                raise ValueError("Request body must be between 1 byte and 1 MB")
            body = json.loads(self.rfile.read(content_length))
            if not isinstance(body, dict):
                raise ValueError("Request body must be a JSON object")
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(400, {"message": str(error)})
            return

        provider = body.get("provider")
        if provider not in ("APPLE", "GOOGLE"):
            self.send_json(400, {"message": "provider must be APPLE or GOOGLE"})
            return

        request = Request(
            f"{self.wallet_service_url}/v1/wallets",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Idempotency-Key": (
                    f"wallet-demo-{body.get('template', 'template').lower()}-"
                    f"{provider.lower()}-{os.urandom(6).hex()}"
                ),
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=30) as response:
                response_body = json.loads(response.read().decode("utf-8"))
                self.send_json(response.status, response_body)
        except HTTPError as error:
            raw = error.read().decode("utf-8")
            try:
                response_body = json.loads(raw)
            except json.JSONDecodeError:
                response_body = {"message": raw or error.reason}
            self.send_json(error.code, response_body)
        except (URLError, TimeoutError) as error:
            self.send_json(
                502,
                {
                    "message": f"Wallet service unavailable at {self.wallet_service_url}",
                    "detail": str(error),
                },
            )


def main():
    parser = argparse.ArgumentParser(description="Local wallet template browser")
    parser.add_argument("--port", type=int, default=3852)
    parser.add_argument(
        "--wallet-service-url",
        default=os.environ.get("WALLET_SERVICE_URL", "http://localhost:3000"),
    )
    args = parser.parse_args()
    DashboardHandler.wallet_service_url = args.wallet_service_url.rstrip("/")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), DashboardHandler)
    print(f"Wallet demo browser running at http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
