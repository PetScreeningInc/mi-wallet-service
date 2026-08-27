# Diagrams

**Status:** accepted  
**Date:** 2026-08-25  
**Relates-to:** [PDR](PDR.md), [SDD](SDD.md), [ADR-001](ADR-001-wallet-generation-service-architecture.md), [wallet-api](specs/wallet-api.md)

Single source for figures. All diagrams are Mermaid (text, diffable) so they stay alive with the code and can be reviewed in a PR. Names must match [wallet-api](specs/wallet-api.md): `POST /v1/wallets`, `GET /p/{publicId}`.

Keep-alive rule: if a route, port, adapter, or datastore changes, update the affected figure **in the same PR** as the SPEC or SDD change. Do not add a figure that shows an undecided component as if it were decided — list it in [Open decisions](#open-decisions) instead.

## 1a. Who generates a wallet

Each product has its own pet owners and its own frontend. The owner never calls this service; the product **backend** does, after mapping its domain into `template` + `data`.

```mermaid
flowchart LR
  OwnerSTR[STR pet owner] --> PassportFE[Passport FE]
  PassportFE --> Platform[Platform BE]
  OwnerLTR[LTR pet owner] --> LtrFe[LTR frontend]
  LtrFe --> LtrBe[LTR BE]
  OwnerFTA[FTA pet owner] --> FtaFe[FTA frontend]
  FtaFe --> FtaBe[FTA BE]

  Platform -->|"POST /v1/wallets"| Wallet[Wallet service]
  LtrBe -.->|"later, same contract"| Wallet
  FtaBe -.->|"later, same contract"| Wallet
```

- STR pet owners are today's Pet ID / Pet Card users (CON-1297). Platform is the STR backend and the first real caller.
- LTR and FTA owners get the same capability through their own backends; dotted means not wired yet.
- CON-1309 uses the [mock skill](../.cursor/skills/con-1309-mock-wallet-call/SKILL.md) (two payloads, `source: con-1309-skill`), not product backends.
- See [PDR actors](PDR.md#actors).

## 1b. Network boundary

The app has **no authentication**. DevOps publishes two ingresses: `/v1/*` private, `GET /p/{publicId}` public.

```mermaid
flowchart LR
  subgraph public [Public internet]
    Scanner[Public scanner QR]
  end

  subgraph private [Internal network]
    Callers[Caller backends: Platform, LTR, FTA]
    Wallet[Wallet service]
  end

  Callers -->|"POST /v1/wallets"| Wallet
  Scanner -->|"GET /p/publicId"| Wallet
```

- Only the public page crosses the boundary. Generate and the `.pkpass` download stay private.
- Private vs public listeners (or equivalent path rules) are a **stack/DevOps** concern, not NestJS middleware.

## 2. Containers and persistence

```mermaid
flowchart TB
  Wallet["Wallet service (NestJS + Fastify)"]

  Dynamo[("DynamoDB: WalletDocument source of truth")]
  Redis[("Redis: public-page cache later slice")]
  Bucket[("S3: apple.pkpass and template assets")]
  Secrets[("Secrets Manager: Apple certs, Google SA key")]
  GoogleSave["Google save URL (JWT, no API write)"]

  Wallet -->|"WalletDocument by id / publicId"| Dynamo
  Wallet -.->|"GET /p/publicId cache"| Redis
  Wallet -->|"wallet-artifacts/documentId/apple.pkpass"| Bucket
  Wallet -->|"read at boot / on demand"| Secrets
  Wallet -->|"signed locally, returned to caller"| GoogleSave
```

- Apple `.pkpass` is built and signed in-process, then stored in S3. Google is a signed JWT save URL, so there is no Google object to persist.
- DynamoDB is the document store (PK `id`, GSI `publicId-index`). Redis is **decided** as the public-page cache and is drawn dashed because the first features may read DynamoDB only.
- Local DynamoDB is LocalStack (`docker compose --profile infra up -d localstack`). Nest stays on the host.

## 3. Use cases

```mermaid
flowchart LR
  CallerBE["Caller backend (Platform, LTR, FTA)"]
  Scanner["Public scanner"]
  Admin["Admin"]

  generateWallet(["generateWallet: POST /v1/wallets"])
  getPublicPage(["getPublicPage: GET /p/publicId"])
  createTemplate(["createTemplate (later, not in CON-1309)"])

  CallerBE --> generateWallet
  Scanner --> getPublicPage
  Admin -.-> createTemplate
```

In CON-1309 templates are **files in this repo** (`src/templates/{key}/v{n}/`), loaded by the template registry at boot. `createTemplate` as an API is future work ([SDD MVP vs later](SDD.md#mvp-vs-later)).

## 4. Sequence: generateWallet

```mermaid
sequenceDiagram
  participant Caller as Caller backend
  participant API as Wallet API
  participant App as Application
  participant Tpl as TemplateRegistry
  participant Repo as WalletDocumentRepository
  participant Apple as Apple adapter
  participant Google as Google adapter

  Caller->>API: "POST /v1/wallets (template, provider APPLE or GOOGLE, data, Idempotency-Key)"
  API->>App: createWallet command
  App->>Tpl: resolve template key and version
  Tpl-->>App: schema, field flags, mappings
  App->>App: "Ajv validate data (400 on failure)"
  App->>App: generate id and random publicId
  App->>Repo: save WalletDocument
  alt provider is APPLE
    App->>Apple: "generate(document, template)"
    Apple-->>App: "pkpass URL or FAILED"
  else provider is GOOGLE
    App->>Google: "generate(document, template)"
    Google-->>App: "save URL or FAILED"
  end
  App->>Repo: update provider state
  App-->>API: publicUrl and that provider status
  API-->>Caller: 201 Created
```

- Validation failure returns 400 **before** any persist (`code` is `UNKNOWN_TEMPLATE`, `SCHEMA_INVALID`, `INVALID_PROVIDER`, or `INVALID_REQUEST`).
- Exactly one adapter runs per request. Apple and Google are never generated together.
- If that adapter fails, the document and `publicUrl` can still return 201 with `status: FAILED`.
- The provider call has an explicit timeout and limited retries so the request cannot hang.
- **P3:** `Idempotency-Key` is accepted but not honored until P8. `publicUrl` is `{PUBLIC_BASE_URL}/p/{publicId}`.
- **P4:** `GET /p/{publicId}` serves HTML from public-flagged fields (DynamoDB; Redis is P7).
- **P5:** Google adapter signs a Save-to-Wallet JWT (no `objects.insert`); barcode is `publicUrl`. Apple still returns `FAILED` / `PROVIDER_UNAVAILABLE` until P6.

## 5. Sequence: getPublicPage

```mermaid
sequenceDiagram
  participant Scanner as Public scanner
  participant API as Wallet API
  participant App as Application
  participant Cache as Redis cache later
  participant Repo as WalletDocumentRepository
  participant Render as Public renderer

  Scanner->>API: "GET /p/publicId"
  API->>App: getPublicDocument
  App->>Cache: get by publicId
  alt cache miss or cache not wired yet
    App->>Repo: "findByPublicId (404 if missing)"
    Repo-->>App: WalletDocument
    App->>Cache: set
  end
  App->>Render: "document plus stored template version"
  Render-->>App: "HTML from public-flagged fields only, public-page spec slots"
  App-->>API: HTML
  API-->>Scanner: 200 OK
```

Always unauthenticated. The QR on the generated pass encodes this URL. Fields without `public: true` never reach the renderer. **P4** omits the cache steps and hits DynamoDB only.

## Open decisions

Do not draw these as settled components until an ADR or SDD update lands.

| Topic | State | Note |
| --- | --- | --- |
| Redis cache for `GET /p/{publicId}` | decided; later slice | Source of truth stays DynamoDB. First features may skip Redis. |
| Template admin API (`createTemplate`) | later | CON-1309 uses repo files. An API implies template lifecycle and versioning rules. If added, it belongs on the **private** ingress. |
| Caller authentication in the app | decided: none | Trust is network isolation. See [ADR-001](ADR-001-wallet-generation-service-architecture.md#network-isolation-no-application-authentication). |
| Public page auth | decided: none, permanently | `GET /p/{publicId}` is always public. Do not add auth later. Entropy of `publicId` + template `public` flags. |
| Exact private/public AWS wiring | DevOps | Internal ALB vs public ALB (or host/path split) is stack work, not this service’s code. |
