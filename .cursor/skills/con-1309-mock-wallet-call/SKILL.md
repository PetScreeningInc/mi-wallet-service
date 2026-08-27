---
name: con-1309-mock-wallet-call
description: >-
  Runs the CON-1309 mock caller for mi-wallet-service: pick or add a file-based
  template, POST /v1/wallets with static data, and open the public URL. Use when
  the user wants a local wallet demo, a mock create, sample payloads, CON-1309
  gate, ET-20 (old key), or a mini call without Platform, LTR, or FTA.
---

# CON-1309 mock wallet call

This is the **only** CON-1309 POC caller. It is not Platform, LTR, or FTA. Do not call those APIs or invent Animal/tagNumber payloads.

Contract: [docs/specs/wallet-api.md](../../../docs/specs/wallet-api.md). One `provider` per POST (`APPLE` or `GOOGLE`).

Default base URL: `http://localhost:3000` unless the user says otherwise.

## When the service is not up yet

Say so. Do not fake a 201. Point at [docs/ROADMAP.md](../../../docs/ROADMAP.md) Wave A (need P3+ for POST, P4 for the page, P5 for a real pass).

## Workflow

1. Confirm the app is reachable: `GET {base}/health` (P0+).
2. Ensure a **file template** exists (CON-1309 has no `createTemplate` API). `GENERIC` v1 lives at `src/templates/generic/v1/`. If the registry is empty, add a generic template from [templates.md](templates.md) (do not invent Animal types).
3. Run **two** POSTs with the two payloads in `payloads/` (distinct `data`, same contract). That is the CON-1309 numeric gate.
4. Print `id`, `publicUrl`, and `provider`. Open or curl `GET {publicUrl}` and check public fields only.
5. For a device-openable Google pass, POST with `"provider": "GOOGLE"` and set `GOOGLE_WALLET_SA_EMAIL`, `GOOGLE_WALLET_SA_PRIVATE_KEY`, and `GOOGLE_WALLET_ISSUER_ID`. Apple stays `FAILED` until P6.
6. If `provider.status` is `FAILED` and Google env is unset (or the request is `APPLE`), that is expected until that adapter is configured.

Prefer the script over ad-hoc curl:

```bash
./.cursor/skills/con-1309-mock-wallet-call/scripts/post-wallet.sh \
  http://localhost:3000 \
  APPLE \
  .cursor/skills/con-1309-mock-wallet-call/payloads/demo-a.json
```

Second call: same host and provider, `payloads/demo-b.json`.

`source` on both payloads is `con-1309-skill`. Never `platform` / `ltr` / `fta`.

## Do not

- Wire GraphQL, Passport, or product databases.
- Send both Apple and Google in one request.
- Put private fields (`ownerEmail`) on the public page check.
