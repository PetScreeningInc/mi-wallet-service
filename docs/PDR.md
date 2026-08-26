# PDR: Shared wallet generation service

**Status:** accepted  
**Date:** 2026-08-26  
**Tickets:** [CON-1309](https://petscreening.atlassian.net/browse/CON-1309), [CON-1297](https://petscreening.atlassian.net/browse/CON-1297)

CON-1309 is the POC spike (moved from ET-20; same issue). Product landscape: [USE-CASE-MAP](USE-CASE-MAP.md).

## Today

Pet ID / Pet Card already ships in the Guest/Passport (CON) stack:

- Apple Wallet `.pkpass` — [CON-1130](https://petscreening.atlassian.net/browse/CON-1130)
- Google Wallet save URL — [CON-1129](https://petscreening.atlassian.net/browse/CON-1129)
- Public profile rendered by **Passport FE**; Platform only exposes `publicAnimalByTagNumber`
- Config / certs — [INFRA-1732](https://petscreening.atlassian.net/browse/INFRA-1732)

That pipeline is coupled to `Animal`, tag number, last approved visa, GraphQL `createAnimalWalletCard`, and Passport URLs. Platform **implements** Apple/Google itself. As-built detail: [as-built/](as-built/).

Product docs: [Pet ID Wallet Access](https://petscreening.atlassian.net/wiki/spaces/PPT/pages/1420427274/Pet+ID+Wallet+Access), [Wallet - Pet Card](https://petscreening.atlassian.net/wiki/spaces/PPT/pages/1248526339/Wallet+-+Pet+Card). Initiative map: [USE-CASE-MAP](USE-CASE-MAP.md) (Passport profile vs Pet ID vs wallet vs visa; STR stay + lost pet as the product wedge).

## Problem ([CON-1309](https://petscreening.atlassian.net/browse/CON-1309))

Wallet + public-page behavior is a **product feature inside Platform**, not a shared capability. If LTR, STR, and FTA each embed pass generation, we duplicate Apple/Google signing, templates, and public URLs, and we cannot evolve one contract for all callers. The PM map is a **credential system** (many passes, counterparties, validity windows) — that is why this service is template-driven, not Pet Card–hardcoded.

CON-1309 is a **timeboxed viability POC** (2–3 days) for a **product-agnostic Wallet service**. Existing CON Pet Card is the **reference implementation**, not the target to migrate in the POC.

## Product baseline ([CON-1297](https://petscreening.atlassian.net/browse/CON-1297))

CON-1297 describes **Pet ID Wallet** as a full Passport feature. Those requirements are the **field and link baseline Platform will send** in `data`. They are not types in this service.

From the epic:

1. Pet ID is a **universal pet identifier**, not tied to a specific visa. Visas can be reached from it; the ID itself should not expire with a visa.
2. Any number of animals (Platform loops and calls once per animal).
3. Any visa-type flow should be able to surface Pet ID.
4. Status must be reflectable even when it is not used in every context:
   - **Service animal:** permanent; copy that the animal is required because of a disability, plus the task the animal is trained to perform (user input).
   - **ESA:** expire when the ESA letter expires; Pet ID should link to the letter.
5. Desktop save (Google account on desktop → wallet on mobile).
6. No-visa flow: user comes to Passport only for Pet ID (after onboarding).
7. Pet ID should lead to existing visas so a guest can show a visa and a host can see it.
8. Trust signals (not necessarily PetScreening-validated): vaccines up to date, friendly with animals/people, insured, and similar affirmations.

Success for CON-1297 is product adoption (owners and businesses) — measured in Passport/analytics, not in this service’s core.

Platform owns Animal, visa, ESA letter URLs, and trust-signal mapping. This service stores whatever JSON the template accepts and renders wallets + public page from that snapshot.

## Target

A caller (first: **Platform**) POSTs `{ template, provider, data }` with `provider` exactly `APPLE` or `GOOGLE`. This service:

- Does **not** query Platform, LTR, or FTA databases.
- Validates `data` against a versioned template (JSON Schema).
- Persists a normalized `WalletDocument`.
- Generates **one** Apple **or** Google artifact **synchronously** (not both in one request).
- Hosts a public page at `GET /p/{publicId}` and encodes that URL in the pass QR.

The same contract is how this service can **later replace** in-process `WalletService` in Platform: Platform stops signing passes and only assembles `data` (including CON-1297 fields, then STR stay / lost-pet projections from the [use-case map](USE-CASE-MAP.md)) for a versioned template.

LTR and FTA backends may call the same API later. For CON-1309, the caller is a **repo skill** ([con-1309-mock-wallet-call](../.cursor/skills/con-1309-mock-wallet-call/SKILL.md)): add a file template if needed, POST two static payloads, open `publicUrl`. Not a product integration.

## Actors

| Actor | Role |
| --- | --- |
| STR pet owner | Today's Pet ID / Pet Card user. Sees the wallet CTA in Passport (CON-1297). |
| LTR pet owner | Same need in the LTR product; reaches it through the LTR frontend. |
| FTA pet owner | Same need in the FTA product; reaches it through the FTA frontend. |
| Passport | CON-1297 UX (Pet ID / wallet entry in the guest app). Does not call this service. |
| Platform | STR backend and first real caller. Maps Animal / visa / Pet ID into template `data` and POSTs it. Today also generates wallets; target is payload-only. |
| LTR / FTA backends | Future callers, same HTTP contract, their own field mapping. |
| CON-1309 mock skill | Mini caller in-repo: template file + two POSTs. Not STR/LTR/FTA. |
| Public scanner | Opens `/p/{publicId}` with no login. This page stays public permanently. |

No pet owner ever calls this service directly; each product backend does. See [DIAGRAMS 1a](DIAGRAMS.md#1a-who-generates-a-wallet).

## Success ([CON-1309](https://petscreening.atlassian.net/browse/CON-1309))

**Go if, within the timebox, 2/2 with the same payload contract:**

1. **Public page:** submitting a static payload yields a reachable public URL whose visible fields match the payload (required fields present; no product DB).
2. **Wallet:** that payload yields a pass that opens in Apple Wallet **or** Google Wallet on a real device/simulator (not only a file on disk).

**Numeric gate:** 2 skill payloads × 1 shared contract × (1 public URL + 1 wallet platform) = 2 successful end-to-end demos.

Stretch (does not block go): the other wallet platform in a **second** `POST` (still one provider per request).

**Go / no-go write-up:** is a shared Wallet service viable, and what is the smallest production slice? Replacement of Platform generation is **out of the POC timebox** but must remain unblocked by the design.

## Non-goals (POC and first service slice)

From CON-1309 unless noted:

- Application-level authentication (JWT, API keys, mTLS in the NestJS app). Generate stays **internal-network only** via DevOps ingress; see [SDD access control](SDD.md#access-control-and-replacement).
- Production hardening / deploying to prod as part of the CON-1309 timebox (stack wiring of private vs public listeners is required for a real environment, not for the local POC)
- Migrating existing Pet Card / Pet ID off Platform in the POC
- Real LTR / FTA integrations
- Live-updating passes (Apple pass updates / Google object PATCH)
- Payments (Apple Pay / Google Pay)
- Full design system, analytics, or QR attribution
- Animal / visa / person tables in this service
- CON-1297 UI, onboarding, or visa flows (stay in Passport + Platform)

## Deliverables (CON-1309)

- Runnable POC (local or ephemeral) + sample payloads
- Contract sketch (this PDR + [SPEC-wallet-api](SPEC-wallet-api.md) + [SDD](SDD.md) + [ROADMAP](ROADMAP.md) + [USE-CASE-MAP](USE-CASE-MAP.md))
- Written go / no-go
