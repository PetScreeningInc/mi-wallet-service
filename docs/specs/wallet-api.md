# SPEC: Wallet HTTP and template contract

**Status:** accepted  
**Date:** 2026-08-25  
**Relates-to:** [SDD](../SDD.md), [ADR-001](../ADR-001-wallet-generation-service-architecture.md)

Target contract for **this** service. Platform GraphQL is [as-built](../as-built/wallet-generation.md).

## `POST /v1/wallets`

Synchronous create. Success: **201 Created**. Do not use 202.

Headers:

- `Idempotency-Key` (required for production; same key must not create a second document). **Wave A (P3) ignores this header**; honor it in [P8](../ROADMAP.md).

**No application authentication.** This route is reachable only from the internal network (private ingress). The app does not return 401/403 for missing tokens.

Request (Wave A / CON-1309 uses `GENERIC`; `PET_CARD` is a later product template):

```json
{
  "template": "GENERIC",
  "templateVersion": 1,
  "provider": "APPLE",
  "source": "con-1309-skill",
  "sourceReference": "demo-a",
  "data": {
    "title": "Stay with Pico",
    "subtitle": "Demo reservation card",
    "fields": {
      "guest": "Alex Rivera",
      "dates": "12–15 Sep",
      "unit": "Cabin 4"
    }
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

`publicUrl` is `{PUBLIC_BASE_URL}/p/{publicId}` (local default `http://localhost:3000`). Until P4, that path is not served.

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

CON-1309: the [mock skill](../../.cursor/skills/con-1309-mock-wallet-call/SKILL.md) POSTs two distinct `data` bodies (`GENERIC` v1, one `provider` each). Product backends are out of scope until Wave C.

## `GET /v1/wallets/{id}/apple`

Download of the `.pkpass` (S3-backed). MIME `application/vnd.apple.pkpass`. **Same private ingress as create** — not on the public internet. Google has no equivalent file; clients use the save URL.

## `GET /p/{publicId}`

Public HTML. **Always** no login — not in the first slice and not later. Lookup by `publicId` only. Render **public**-flagged fields from the stored template version. 404 if unknown. This is the **only** route on the public ingress.

`publicId` must not be the document `id`, a Platform animal UUID, or a tag number.

HTML look and slots: [public-page](public-page.md). Scanner chrome only (no owner edit/save drawer). P4 uses the same theme for `GENERIC` v1 without Pet ID tabs.

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

### CON-1309 `GENERIC` v1

File catalog: `src/templates/{key}/v{n}/` (`template.json` + JSON Schema). No template admin API.

| Field | Required | wallet | public |
| --- | --- | --- | --- |
| `title` | yes | true | true |
| `subtitle` | no | true | true |
| `imageUrl` | no (URI if present) | true | true |
| `fields` | yes (object, 3–5 string values) | true | true |
| `links` | no (`{ label, url }[]`) | true | true |
| `ownerEmail` | no | false | false |

Additional properties are rejected. Apple/Google mapping files are not part of this version; they land with the first adapter (P5).

### Platform / CON-1297 (caller mapping, not API types)

Platform may put in `data` (schema permitting) things such as: name, photo URL, SA disability/task copy, ESA expiry + letter URL, visa deep links, trust-signal flags. This spec does not enumerate them. A new Pet ID field = new template version + Platform mapper change.

## Errors (minimum)

| HTTP | When |
| --- | --- |
| 400 | Unknown template, schema fail, missing or invalid `provider` |
| 404 | Unknown `publicId` or wallet id |
| 201 | Document persisted; inspect `provider.status` |

400 body:

```json
{
  "code": "UNKNOWN_TEMPLATE",
  "message": "Unknown template"
}
```

| `code` | When |
| --- | --- |
| `UNKNOWN_TEMPLATE` | Registry has no matching key/version |
| `SCHEMA_INVALID` | Ajv rejected `data` (`issues` is the Ajv path/message list) |
| `INVALID_PROVIDER` | Missing `provider`, or not exactly `APPLE` or `GOOGLE` |
| `INVALID_REQUEST` | Missing `template` or `data`, or wrong types on the envelope |

Schema example: `{ "code": "SCHEMA_INVALID", "message": "data does not match the template schema", "issues": [{ "path": "/title", "message": "must have required property 'title'" }] }`.

P3 (stub adapter): a valid create still returns **201** with `provider.status: FAILED` and `error: "PROVIDER_UNAVAILABLE"`. Inspect `provider.status`; do not treat FAILED as HTTP 5xx.

The app does not use 401/403. Unreachable generate/download from the internet is enforced by DevOps (private vs public ingress), not by this API.
