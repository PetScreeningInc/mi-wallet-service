---
name: wallet-demo-browser
description: >-
  Starts and opens the local mi-wallet-service template browser. It lists
  file-based wallet templates, loads simple example data, and creates Apple or
  Google wallets through POST /v1/wallets. Use when the user asks to browse
  wallet templates, open the wallet demo, or request a sample wallet.
disable-model-invocation: true
---

# Wallet demo browser

Open the local dashboard that lists available templates and lets the user
request a wallet with editable JSON data.

## When invoked

1. Confirm mi-wallet-service is reachable at `http://localhost:3000/health`.
   If it is not, tell the user to start the app and LocalStack; the template
   browser can still open, but wallet creation will fail until the service is
   available.
2. Check existing terminals before starting a duplicate dashboard.
3. Start the dashboard:

   ```bash
   bash .cursor/skills/wallet-demo-browser/scripts/start.sh
   ```

4. Confirm `http://127.0.0.1:3852/api/health` returns 200.
5. Open `http://127.0.0.1:3852` with Cursor app control `open_resource`.
6. Report the dashboard URL and whether mi-wallet-service is reachable.

Default dashboard URL: `http://127.0.0.1:3852`.
Default wallet service URL: `http://localhost:3000`.

## Dashboard behavior

- Template cards come from `src/templates/{key}/v{n}/`.
- Example requests come from this repository's skill payloads.
- The user chooses one provider per request (`APPLE` or `GOOGLE`).
- The dashboard proxies creation to `POST /v1/wallets`; it does not add a
  template-admin API or application authentication.
- On success, it exposes the returned public and provider URLs so the user can
  open them in a new browser tab.
