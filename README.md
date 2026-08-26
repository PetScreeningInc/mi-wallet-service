# mi-wallet-service

Product-agnostic wallet generation: callers send `{ template, provider, data }`; this service issues **Apple or Google** (one `provider` per `POST`) and hosts the public scanner page.

POC ticket: [CON-1309](https://petscreening.atlassian.net/browse/CON-1309). Design starts in [docs/README.md](docs/README.md).

## Status

**P1** is in: file template registry, Ajv, `GENERIC` v1 (`src/templates/generic/v1/`). Invalid `data` fails without DynamoDB. Next slice is **P2** (WalletDocument) — [docs/ROADMAP.md](docs/ROADMAP.md).

`POST /v1/wallets` and `GET /p/{publicId}` are specified, not implemented yet.

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
