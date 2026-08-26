# Wallet generation service — docs

Design pack for a **decoupled** wallet service that can later **replace** in-process Pet Card generation in Platform.

## Reading order

1. [PDR.md](PDR.md) — problem, actors, CON-1309 success, CON-1297 as caller fields  
2. [USE-CASE-MAP.md](USE-CASE-MAP.md) — PM credential landscape (STR stay, lost pet, partners); not the HTTP contract  
3. [SDD.md](SDD.md) — canonical software design (**always required**)  
4. [ADR-001-wallet-generation-service-architecture.md](ADR-001-wallet-generation-service-architecture.md) — stack and hexagonal decision  
5. [specs/wallet-api.md](specs/wallet-api.md) — HTTP + template contract  
6. [specs/public-page.md](specs/public-page.md) — scanner HTML layout, slots, theme (P4)  
7. [DIAGRAMS.md](DIAGRAMS.md) — context, containers, use cases, sequences, open decisions  
8. [ROADMAP.md](ROADMAP.md) — feature phases (CON-1309 gate, then complete service, then callers)  
9. [WORKFLOW.md](WORKFLOW.md) — agentic loop (one phase, docs if contract moves, mock skill)  
10. [as-built/](as-built/) — production Platform Pet Card (**do not copy as the target API**)

## Naming (always)

This folder must keep **PDR** and **SDD**. Do not add ADRs that are only Platform implementation notes.

| Kind | Pattern | Rule |
| --- | --- | --- |
| Index | `README.md` | This file. |
| SDD | `SDD.md` | Canonical software design for *this* service. |
| PDR | `PDR.md` | Problem, actors, success from Jira. |
| ADR | `ADR-NNN-kebab-title.md` | Real decisions for **this** service only. Today: ADR-001. |
| Spec | `specs/kebab-title.md` | Target HTTP/template (and public-page visual) contract. Index: [specs/](specs/). |
| Diagrams | `DIAGRAMS.md` | All figures, in Mermaid. Update in the same PR as the change they describe. |
| Roadmap | `ROADMAP.md` | Feature phases. Update when a slice lands. |
| Workflow | `WORKFLOW.md` | Agentic loop. Agents follow this plus `.cursor/rules/sdd-workflow.mdc`. |
| As-built | `as-built/*` | Platform/STR production behavior. |

Statuses: `proposed` | `accepted` | `superseded` | `as-built` | `historical`.

## Documents

| File | Kind | Status |
| --- | --- | --- |
| [PDR.md](PDR.md) | PDR | accepted |
| [USE-CASE-MAP.md](USE-CASE-MAP.md) | Product landscape | accepted |
| [SDD.md](SDD.md) | SDD | accepted |
| [ADR-001-wallet-generation-service-architecture.md](ADR-001-wallet-generation-service-architecture.md) | ADR | accepted |
| [specs/wallet-api.md](specs/wallet-api.md) | Spec | accepted |
| [specs/public-page.md](specs/public-page.md) | Spec | accepted |
| [DIAGRAMS.md](DIAGRAMS.md) | Diagrams | accepted |
| [ROADMAP.md](ROADMAP.md) | Roadmap | accepted |
| [WORKFLOW.md](WORKFLOW.md) | Workflow | accepted |
| [as-built/SOURCE-MAP.md](as-built/SOURCE-MAP.md) | As-built | historical |
| [as-built/wallet-generation.md](as-built/wallet-generation.md) | As-built | historical |
| [as-built/public-page.md](as-built/public-page.md) | As-built | historical |
| [as-built/ADR-001-unified-save-url.md](as-built/ADR-001-unified-save-url.md) | As-built | historical |
| [as-built/ADR-002-apple-pkpass.md](as-built/ADR-002-apple-pkpass.md) | As-built | historical |
| [as-built/ADR-003-google-jwt.md](as-built/ADR-003-google-jwt.md) | As-built | historical |
| [as-built/ADR-004-public-page-is-fe.md](as-built/ADR-004-public-page-is-fe.md) | As-built | historical; superseded **for this service** by ADR-001 |

## Tickets

- [CON-1309](https://petscreening.atlassian.net/browse/CON-1309) — POC: decouple wallet into a shared service (formerly ET-20)  
- [CON-1297](https://petscreening.atlassian.net/browse/CON-1297) — Pet ID Wallet product baseline (Platform maps into `data`)  
- [CON-1129](https://petscreening.atlassian.net/browse/CON-1129) / [CON-1130](https://petscreening.atlassian.net/browse/CON-1130) — Google / Apple in Platform today  
- [INFRA-1732](https://petscreening.atlassian.net/browse/INFRA-1732) — wallet config  
- [CON-1056](https://petscreening.atlassian.net/browse/CON-1056) — Pet ID exploration  

## External product docs

- [Pet ID Wallet Access](https://petscreening.atlassian.net/wiki/spaces/PPT/pages/1420427274/Pet+ID+Wallet+Access)  
- [Wallet - Pet Card](https://petscreening.atlassian.net/wiki/spaces/PPT/pages/1248526339/Wallet+-+Pet+Card)  
