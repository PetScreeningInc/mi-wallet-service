# SPEC: Wallet HTTP and template contract

**Status:** accepted  
**Date:** 2026-08-25  
**Relates-to:** [SDD](SDD.md), [ADR-001](ADR-001-wallet-generation-service-architecture.md)

Target contract for **this** service. Platform GraphQL is [as-built](as-built/wallet-generation.md).

## `POST /v1/wallets`

Synchronous create. Success: **201 Created**. Do not use 202.

Headers:

- `Idempotency-Key` (required for production; same key must not create a second document)

**No application authentication.** This route is reachable only from the internal network (private ingress). The app does not return 401/403 for missing tokens.

Request:

```json
{
  "template": "PET_CARD",
  "templateVersion": 1,
  "provider": "APPLE",
  "source": "platform",
  "sourceReference": "optional-caller-key",
  "data": {
    "name": "Chai",
    "status": "ACTIVE"
  }
}
```

| Field | Rules |
| --- | --- |
| `template` | Required. Key in the template registry. |
| `templateVersion` | Optional. Default = current version of that key. Stored on the document; never reinterpreted later. |
| `provider` | Required. Exactly one of `APPLE` or `GOOGLE`. **Never both in one request.** |
| `data` | Required object. Validated with Ajv against the template JSON Schema. No Animal/GraphQL types. |
| `source`, `sourceReference` | Optional. Caller correlation; Platform may send an animal or occupancy id **as opaque strings**. |

Invalid template, schema failure, missing `provider`, or more than one provider: **400** before persist.

Response:

```json
{
  "id": "01J...",
  "publicUrl": "https://wallet.example.com/p/7FwNQ8s2JdKm",
  "provider": {
    "type": "APPLE",
    "status": "READY",
    "url": "https://wallet.example.com/v1/wallets/01J.../apple"
  }
}
```

Google example: `"type": "GOOGLE"` and `url` is the Save-to-Wallet link.

If generation fails after persist:

```json
{
  "id": "01J...",
  "publicUrl": "https://wallet.example.com/p/7FwNQ8s2JdKm",
  "provider": {
    "type": "GOOGLE",
    "status": "FAILED",
    "error": "PROVIDER_UNAVAILABLE"
  }
}
```

`publicUrl` is the QR/barcode destination on the generated pass.

Need Apple **and** Google? Platform (or the caller) issues **two** POSTs. Each request creates its own document unless a later attach-provider API exists.

CON-1309: the [mock skill](../.cursor/skills/con-1309-mock-wallet-call/SKILL.md) POSTs two distinct `data` bodies (`GENERIC` v1, one `provider` each). Product backends are out of scope until Wave C.

## `GET /v1/wallets/{id}/apple`

Download of the `.pkpass` (S3-backed). MIME `application/vnd.apple.pkpass`. **Same private ingress as create** — not on the public internet. Google has no equivalent file; clients use the save URL.

## `GET /p/{publicId}`

Public HTML. **Always** no login — not in the first slice and not later. Lookup by `publicId` only. Render **public**-flagged fields from the stored template version. 404 if unknown. This is the **only** route on the public ingress.

`publicId` must not be the document `id`, a Platform animal UUID, or a tag number.

HTML look and slots: [SPEC-public-page](SPEC-public-page.md). Scanner chrome only (no owner edit/save drawer). P4 uses the same theme for `GENERIC` v1 without Pet ID tabs.

## Template contract

Templates are versioned (`PET_CARD:v1`). Each version is immutable.

A version includes:

1. **JSON Schema** for `data` (Ajv).
2. **Field flags**, e.g.:

```json
{
  "fields": {
    "name": { "wallet": true, "public": true },
    "ownerEmail": { "wallet": false, "public": false }
  }
}
```

3. **Apple mapping** — PassKit generic fields, colors, assets (not hardcoded BetterPet strings in core).
4. **Google mapping** — generic class/object layout; class/object ids must not use tag numbers.
5. Assets (icons, logo, default image) referenced from S3 or HTTPS URLs.

Unknown keys in `data` that the schema rejects are 400. Keys allowed by the schema but not `public: true` never appear on `/p/{publicId}`.

### Platform / CON-1297 (caller mapping, not API types)

Platform may put in `data` (schema permitting) things such as: name, photo URL, SA disability/task copy, ESA expiry + letter URL, visa deep links, trust-signal flags. This spec does not enumerate them. A new Pet ID field = new template version + Platform mapper change.

## Errors (minimum)

| HTTP | When |
| --- | --- |
| 400 | Unknown template, schema fail, missing or invalid `provider` |
| 404 | Unknown `publicId` or wallet id |
| 201 | Document persisted; inspect `provider.status` |

The app does not use 401/403. Unreachable generate/download from the internet is enforced by DevOps (private vs public ingress), not by this API.
