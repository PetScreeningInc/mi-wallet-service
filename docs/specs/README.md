# Specs

Target **contracts** for this service. Design (PDR, SDD, ADRs, diagrams, roadmap) stays in [`docs/`](../). Platform as-built stays in [`docs/as-built/`](../as-built/).

New contract = new file here (`kebab-title.md`). If HTTP, templates, or public HTML change, update the matching spec in the same PR as the code.

| Spec | Binds |
| --- | --- |
| [wallet-api.md](wallet-api.md) | `POST /v1/wallets`, `GET /p/{publicId}`, template contract |
| [public-page.md](public-page.md) | Scanner HTML slots and theme for `GET /p/{publicId}` |
