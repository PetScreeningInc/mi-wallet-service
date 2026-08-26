# ADR-004: Public Pet Card page is Passport UI; Platform is the data API

**Status:** as-built / historical (Platform / STR `mi-api`); **superseded for this service** by [ADR-001-wallet-generation-service-architecture](../ADR-001-wallet-generation-service-architecture.md)  
**Date:** inferred from `publicAnimalByTagNumber` + Passport `pet-card` routes  
**Relates-to:** [CON-1309](https://petscreening.atlassian.net/browse/CON-1309) public-page POC, [CON-1297](https://petscreening.atlassian.net/browse/CON-1297) Pet ID public view

Platform chose **option A** (Passport hosts HTML; GraphQL supplies `PublicAnimal`). This wallet service chooses **option B**: persist the payload and serve `GET /p/{publicId}`. QR/barcode on generated wallets must point at that URL, not `passport.betterpet.com/pet-card/{tagNumber}`.

## Decision (Platform)

1. Wallet barcode / QR encodes `GOOGLE_WALLET_BARCODE_URL_PATTERN` default  
   `https://passport.betterpet.com/pet-card/%s` with `%s` = animal **tag number**.
2. Platform GraphQL `Query.publicAnimalByTagNumber(tagNumber)` returns `PublicAnimal` (subset of `Animal`).
3. Allowed roles: `GUEST_USER`, `PASSPORT_USER` — **not** a Spring “public-endpoints” unauthenticated HTTP page.
4. `AnimalPublicBatchLoader`:
   - Always: `tag_number IN (...)` and `deleted_at IS NULL`.
   - If DataLoader **auth mode** (query annotated `@AuthLoader`): guest token required; `animal.id = token.entityId`.

There is **no** Platform table for public-page versions, templates, or slugs for Pet Card. Friendly links (`go.betterpet.com/...`) are occupancy/property/SP redirects — see `mi-api/docs/features/friendly-links.md` — **not** Pet Card URLs.

`PublicVisa` / `publicVisaById` is a **different** public projection (screening visa), not the Pet Card page.

## Consequences

- Recreating “public page management” from Platform alone yields: **field whitelist + auth + lookup by tag**.
- HTML, routing, QR landing UX, “wallet without flow context” behavior live in Passport (CON tickets / Confluence).
- Guest-token scoping means today’s API is **not** “anyone with the tag number can load the animal” when auth mode is on.

## Related (product, outside this as-built note)

- CON work: wallet access without flow context; Chrome iOS `.pkpass` download (CON-1200, CON-1219).
- Confluence: [Pet ID Wallet Access](https://petscreening.atlassian.net/wiki/spaces/PPT/pages/1420427274/Pet+ID+Wallet+Access).
