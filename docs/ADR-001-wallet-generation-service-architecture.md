# ADR-001: Wallet generation service architecture

**Status:** accepted  
**Date:** 2026-08-25  
**Decision Owners:** Engineering  
**Scope:** This service only (not Platform/STR as-built)  
**Relates-to:** [SDD](SDD.md), [PDR](PDR.md), [wallet-api](specs/wallet-api.md), [CON-1309](https://petscreening.atlassian.net/browse/CON-1309)

This is the **only** ADR for this repo. Platform Pet Card decisions are historical under [as-built/](as-built/). First caller is Platform; it maps domain data into `template` + `data`. Public page is hosted here, superseding [as-built ADR-004](as-built/ADR-004-public-page-is-fe.md).

## Context

We need a production-ready, decoupled, and domain-agnostic service responsible for generating digital wallets.

The service must:

- Accept payloads from different upstream systems without depending on their internal domain models.
- Validate incoming data against supported wallet templates.
- Map the payload into a normalized internal wallet document.
- Generate **one** Apple Wallet **or** Google Wallet artifact synchronously per request.
- Expose a public page containing the relevant public information from the wallet document.
- Include the public page URL as the QR/barcode destination inside the generated wallet.
- Persist the normalized document so the public page remains independently accessible.
- Support additional wallet templates and potentially additional wallet providers without requiring changes to the core domain.
- Keep provider-specific concepts isolated from the main application.

The consuming service expects the generated wallet information as part of the same request. Therefore, asynchronous generation through SQS or another queue is not required for the initial architecture.

---

## Decision

We will implement the Wallet Generation Service using:

| Concern | Decision |
|---|---|
| Runtime | Node.js LTS |
| Language | TypeScript with strict mode |
| Framework | NestJS |
| HTTP engine | Fastify |
| Architecture | Hexagonal Architecture / Ports and Adapters |
| Input validation | JSON Schema + Ajv |
| Persistence | DynamoDB (source of truth) |
| Public-page cache | **Redis** (later slice; not required for first features) |
| Artifact and asset storage | Amazon S3 |
| Apple Wallet | Apple provider adapter |
| Google Wallet | Google provider adapter |
| Public pages | Server-side rendered by the same service |
| Secrets | AWS Secrets Manager |
| Observability | OpenTelemetry + Datadog |
| Generation model | **Synchronous** |
| Messaging/queue | Not required for the initial implementation |
| Application auth | **None.** Callers are not authenticated in the app. |
| Access control | **DevOps / network:** `POST /v1/*` is not reachable from the public internet. Only `GET /p/{publicId}` is published publicly. |

---

## Architecture

The service will use a normalized `WalletDocument` as its main domain entity.

Provider-specific objects such as Apple PassKit structures and Google Wallet objects will **not** be part of the core domain model.

```text
                   External Service
                         |
                         |
                  POST /v1/wallets
                         |
                         v
              +----------------------+
              | Wallet Application   |
              |                      |
              | Validate payload     |
              | Resolve template     |
              | Normalize document   |
              | Persist document     |
              +----------+-----------+
                         |
                +--------+--------+
                |                 |
                v                 v
          Apple Adapter      Google Adapter
                |                 |
                v                 v
             .pkpass        Google Wallet
                |             Save URL
                +--------+--------+
                         |
                         v
                  HTTP Response


Public User
    |
    | QR / Barcode
    v
GET /p/{publicId}
    |
    v
Wallet Application
    |
    v
DynamoDB
    |
    v
Public Template Renderer
```

---

## Synchronous Wallet Generation

Wallet generation will occur during the original API request.

Example:

```http
POST /v1/wallets
```

```json
{
  "template": "PET_CARD",
  "provider": "APPLE",
  "data": {
    "name": "Chai",
    "status": "ACTIVE"
  }
}
```

The application will:

1. Resolve the requested template.
2. Validate the incoming payload.
3. Normalize it into a `WalletDocument`.
4. Generate a cryptographically random `publicId`.
5. Persist the normalized document.
6. Generate **exactly one** provider artifact (`APPLE` or `GOOGLE`, from `provider`).
7. Return the generated wallet URL.

Example response:

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

A request must not ask for both platforms. Callers that need Apple and Google issue two POSTs.

A successful synchronous creation should normally return:

```http
201 Created
```

`202 Accepted` should not be used because wallet generation has not been deferred.

---

## Provider Failure Handling

Each request generates **one** provider. If that adapter fails, the other platform is not attempted in the same call.

Failure of generation must not necessarily delete the persisted document or public page.

For example:

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

Provider calls must have explicit timeout policies.

Retry behavior during the synchronous request should be intentionally limited to avoid creating long-running API requests.

Long-term asynchronous retry can be introduced later if business requirements require automatic recovery from provider outages.

---

## Domain Model

A normalized wallet document will contain information independent from Apple or Google.

Conceptually:

```ts
interface WalletDocument {
  id: string;
  publicId: string;

  templateKey: string;
  templateVersion: number;

  source?: string;
  sourceReference?: string;

  data: Record<string, unknown>;

  providers: {
    apple?: ProviderState;
    google?: ProviderState;
  };

  status: WalletDocumentStatus;

  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}
```

The core domain must not contain structures such as:

```text
passTypeIdentifier
primaryFields
secondaryFields
genericObject
genericClass
textModulesData
```

These belong exclusively to provider adapters.

---

## Provider Abstraction

The application layer will interact with wallet providers through a port.

```ts
interface WalletProvider {
  generate(
    document: WalletDocument,
    template: WalletTemplate
  ): Promise<GeneratedWallet>;
}
```

Provider-specific implementations will include:

```text
AppleWalletProvider
GoogleWalletProvider
```

This ensures that adding another provider does not require changing the core wallet creation flow.

```text
WalletDocument
      |
      +------ Apple Mapper ------> Apple Wallet
      |
      +------ Google Mapper -----> Google Wallet
      |
      +------ Future Mapper -----> Future Provider
```

---

## Template Model

Wallet behavior will be template-driven instead of hardcoded into application services.

Templates will be identified by a key and immutable version.

Examples:

```text
PET_CARD:v1
PET_CARD:v2
VISA:v1
RESERVATION:v1
MEMBERSHIP:v1
```

Each wallet document stores the exact template version used during generation.

```json
{
  "templateKey": "PET_CARD",
  "templateVersion": 2
}
```

A new version of a template must not change the interpretation of previously created documents.

Each template can define:

- Input validation schema.
- Public fields.
- Apple mapping.
- Google mapping.
- Required fields.
- Optional fields.
- Visual configuration.
- Assets.

---

## Validation

Incoming payloads will be validated against the selected template using **JSON Schema and Ajv**.

This enables templates to define their own input contract without adding source-system-specific DTOs to the application.

Conceptually:

```text
Incoming Payload
       |
       v
Resolve Template
       |
       v
JSON Schema
       |
       v
Ajv Validation
       |
       v
Normalized WalletDocument
```

Invalid payloads will be rejected before document generation.

---

## Persistence

### DynamoDB

DynamoDB will be used to persist wallet documents.

The primary expected access patterns are:

```text
Get wallet by document ID
Get wallet by public ID
Get wallet by source + external reference
Update provider generation state
Retrieve template/version
```

The public page is particularly optimized for a key-based lookup:

```text
publicId
   |
   v
WalletDocument
```

The service should not depend directly on DynamoDB from the application layer.

A repository port will be defined:

```ts
interface WalletDocumentRepository {
  save(document: WalletDocument): Promise<void>;

  findById(id: string): Promise<WalletDocument | null>;

  findByPublicId(
    publicId: string
  ): Promise<WalletDocument | null>;
}
```

DynamoDB will be an infrastructure adapter implementing this interface.

This preserves storage independence at the application level.

### Redis (public-page cache)

Redis will cache public-page reads keyed by `publicId`. DynamoDB remains the source of truth.

The cache is a **decided** adapter, not an open question. It is **not** required in the first feature slices: `GET /p/{publicId}` may read DynamoDB directly until the cache adapter is wired. Invalidation (or short TTL) must follow document updates when the cache is introduced.

The application should depend on a cache port (or a repository decorator), not on Redis clients in the domain.

---

## S3

S3 will be used for binary files and large assets rather than DynamoDB.

Examples include:

```text
Template images
Apple Wallet icons
Apple Wallet logos
Generated .pkpass files
Background images
Other wallet assets
```

Generated Apple passes can conceptually use:

```text
wallet-artifacts/
  {documentId}/
    apple.pkpass
```

---

## Public Page

The Wallet Generation Service will expose the public page directly:

```http
GET /p/{publicId}
```

The QR or barcode inside Apple and Google wallets will reference this URL.

Example:

```text
https://wallet.example.com/p/7FwNQ8s2JdKm
```

The `publicId` must:

- Not expose an internal database ID.
- Not expose a source-system entity ID.
- Be cryptographically random.
- Have sufficient entropy to prevent enumeration.

The public page will retrieve the normalized `WalletDocument` and render it using its corresponding template.

```text
QR
 |
 v
/p/{publicId}
 |
 v
WalletDocument
 |
 v
Public Template
 |
 v
HTML
```

The public page is therefore considered another presentation adapter of the same domain document, alongside Apple and Google.

`GET /p/{publicId}` is **always public**. There is no authentication on this route now or later. Protection is `publicId` entropy plus template `public` field flags.

---

## Public Data Protection

The full incoming payload must **not** automatically become publicly visible.

Templates must explicitly define which information can be exposed publicly.

Conceptually:

```json
{
  "fields": {
    "name": {
      "wallet": true,
      "public": true
    },
    "ownerEmail": {
      "wallet": false,
      "public": false
    }
  }
}
```

This prevents accidental exposure of sensitive or internal payload fields.

---

## Network isolation (no application authentication)

The application does **not** implement caller authentication (no JWT, API keys, mTLS in-app, or IAM auth on the NestJS handlers).

Trust is established by **infrastructure**:

- `POST /v1/wallets` and other `/v1/*` routes (including Apple `.pkpass` download) are bound only to a **private** ingress (internal ALB / security groups / no public DNS). Platform, LTR, and FTA reach them from the internal network.
- `GET /p/{publicId}` is the only route on the **public** ingress. It stays unauthenticated **permanently**. Entropy of `publicId` plus template `public` flags is the protection for that page.

This is a DevOps / stack concern, not application code. The service must remain deployable so those two listeners (or equivalent path rules) can be wired independently.

**Not selected:** service-to-service tokens in the app. They would duplicate what the network already enforces and contradict the “no auth in the service” requirement.

---

## Why We Are Not Using SQS

SQS is not required for the initial generation flow.

The consuming application requires the wallet result immediately after submitting the payload.

Adding SQS would change the contract to:

```text
Request
   |
   v
202 PROCESSING
   |
   v
Queue
   |
   v
Generation
   |
   v
Polling / Webhook
```

This introduces:

- Eventual consistency.
- Workers.
- Queue infrastructure.
- DLQ management.
- Polling or callback contracts.
- Additional provider state management.
- More complex client behavior.

These trade-offs are not currently justified.

Instead:

```text
Request
   |
   v
Generate
   |
   v
201 READY
```

The architecture will nevertheless keep generation behind application ports so the same generation use case can later be triggered by an SQS consumer without redesigning the domain.

---

## Idempotency

The create operation should support idempotency.

Example:

```http
Idempotency-Key: <caller-generated-key>
```

This protects against upstream retries caused by timeouts or network errors.

Repeated requests using the same idempotency key must not generate duplicate wallet documents.

---

## Technology Alternatives Considered

### Fastify without NestJS

**Advantages**

- Less framework overhead.
- Excellent performance.
- Simpler runtime model.
- Lower framework coupling.

**Disadvantages**

- More application conventions need to be defined internally.
- Less built-in dependency injection and modular structure.

**Decision**

Not selected because the service is expected to contain multiple domain concerns, providers, templates, repositories, and infrastructure adapters. NestJS provides useful organizational structure while Fastify remains the HTTP engine.

---

### Express

**Advantages**

- Mature ecosystem.
- Widely understood.
- Simple.

**Disadvantages**

- Less optimized TypeScript experience.
- Less structured validation.
- Lower performance than Fastify for this use case.

**Decision**

Not selected.

---

### MongoDB

**Advantages**

- Flexible document model.
- Rich querying.
- Strong cloud portability.

**Disadvantages**

- More capabilities than needed for the expected key-based access patterns.
- Additional database operational considerations.

**Decision**

Not selected initially.

MongoDB remains a reasonable alternative if arbitrary querying over dynamic payload fields becomes an important requirement.

---

### PostgreSQL with JSONB

**Advantages**

- Mature relational database.
- Transactions.
- Excellent querying.
- Flexible JSONB payloads.
- High portability.

**Disadvantages**

- The primary service access pattern does not currently require relational capabilities.
- Requires database connection management and scaling considerations for a highly read-oriented public endpoint.

**Decision**

Not selected initially.

---

### SQS-Based Generation

**Advantages**

- Strong provider isolation.
- Native retries.
- Dead-letter queues.
- Better behavior during provider outages.
- Appropriate for bulk processing.

**Disadvantages**

- Cannot immediately return generated wallets.
- Requires eventual consistency.
- Adds workers and state transitions.
- Requires polling or webhook mechanisms.

**Decision**

Not selected for the primary wallet creation flow.

It can be introduced later for background regeneration or provider recovery without changing the core architecture.

---

## Consequences

### Positive

- Upstream services remain independent from Apple and Google concepts.
- Apple and Google implementations remain isolated.
- New wallet templates can be added without creating new API contracts.
- New providers can be introduced through adapters.
- Public pages and wallet providers share the same normalized data source.
- Wallet creation remains simple for callers.
- No queue or polling infrastructure is required.
- Document persistence supports long-lived QR/public-page access.
- Template versioning protects previously generated wallets from future configuration changes.

### Negative

- Provider latency contributes directly to API response time.
- Provider outages fail that request’s Apple **or** Google generation (not both in one call).
- API timeout management becomes important.
- Large-volume/bulk wallet generation may eventually require asynchronous processing.
- DynamoDB introduces AWS-specific infrastructure coupling at the adapter level.

### Mitigations

- Explicit provider timeouts.
- Provider `READY` / `FAILED` on that request’s single adapter.
- Idempotent creation.
- Hexagonal architecture around storage and provider integrations.
- Provider-specific retries limited within the synchronous request.
- Ability to introduce SQS workers later without changing the core use case.

---

## Future Considerations

The following capabilities are intentionally not required for the first implementation but should remain possible:

- Asynchronous provider retries.
- SQS-based bulk generation.
- Wallet refresh/update events.
- Template administration API.
- Template lifecycle states.
- Wallet revocation.
- Public-link expiration.
- Provider webhooks.
- Additional wallet providers.
- Additional persistence implementations.

---

## Final Decision

The Wallet Generation Service will be implemented as a **synchronous, template-driven wallet platform**.

The core application will operate on a provider-agnostic `WalletDocument`.

Apple Wallet, Google Wallet, persistence, public-page rendering, and infrastructure services will be implemented as adapters around the core application.

The initial technology stack will be:

> **Node.js LTS + TypeScript + NestJS/Fastify + DynamoDB + S3, using Hexagonal Architecture and synchronous Apple/Google wallet generation.** Redis is the public-page cache (wired after the first slices).

SQS will **not** be part of the initial wallet generation path. The architecture will keep generation queue-compatible so asynchronous processing can be introduced later if operational requirements justify it.