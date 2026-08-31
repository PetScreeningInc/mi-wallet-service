# mi-wallet-service

Repository: [PetScreeningInc/mi-wallet-service](https://github.com/PetScreeningInc/mi-wallet-service)

Product-agnostic wallet generation for PetScreening. Callers send `{ template, provider, data }`; this service validates the payload against a file template, persists a `WalletDocument`, issues **Apple or Google Wallet** (one `provider` per `POST`), and hosts the public scanner page.

This service does not own Animal, visa, tag number, or Pet ID identity. Product callers map their own models into `data`.

POC ticket: [CON-1309](https://petscreening.atlassian.net/browse/CON-1309). Design starts in [docs/README.md](docs/README.md).

Demo deploy (not production): inline app in `dev-hub` at `apps/mi-wallet-service` → `https://mi-wallet-service.devops.petscreening.com` (VPN).

## Purpose

Accept a static payload, validate it against a **template**, persist a `WalletDocument`, generate **one** Apple **or** Google wallet artifact **in the same request**, and host a public HTML page at `GET /p/{publicId}`. Adding a use case is a template version, not a domain change.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 20+ (LTS) |
| Language | TypeScript (strict) |
| Framework | NestJS + Fastify |
| Shape | Hexagonal (ports and adapters) |
| Validation | JSON Schema + Ajv |
| Documents | DynamoDB (source of truth) |
| Binaries / assets | S3 (Apple `.pkpass`) |
| Local AWS | LocalStack (DynamoDB + S3) |
| Public-page cache | Redis (decided; not in Wave A) |
| Secrets | AWS Secrets Manager in deployed envs; env/files locally |
| Observability | OpenTelemetry + Datadog (later slice) |
| Generation | Synchronous (no SQS on the create path) |

Canonical design: [docs/SDD.md](docs/SDD.md) (ADR-001).

## Status

Implementation status is tracked in [docs/ROADMAP.md](docs/ROADMAP.md). Wave A is templates, `WalletDocument`, `POST /v1/wallets`, `GET /p/{publicId}`, and Apple/Google adapters.

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env   # PORT=3000
npm run start:dev
```

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

| Script | What it does |
| --- | --- |
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm test` | Jest |

When `POST /v1/wallets` exists, use the CON-1309 mock skill (`.cursor/skills/con-1309-mock-wallet-call`), not Platform/LTR/FTA.

## Docs

| Doc | Role |
| --- | --- |
| [docs/PDR.md](docs/PDR.md) | Problem and success |
| [docs/SDD.md](docs/SDD.md) | Canonical design |
| [docs/specs/wallet-api.md](docs/specs/wallet-api.md) | HTTP + template contract |
| [docs/specs/public-page.md](docs/specs/public-page.md) | Public HTML theme |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | One phase at a time |
| [docs/as-built/](docs/as-built/) | Platform Pet Card today — not the target API |

## Constraints (do not reverse in code)

- No NestJS auth. Generate (`/v1/*`) is private ingress; `GET /p/{publicId}` is always public.
- One provider per request: `APPLE` **or** `GOOGLE`, never both.
- Domain stays free of PassKit, Google JWT, `Animal`, and `tagNumber`.
- Redis is decided for the public page cache; not Wave A.
