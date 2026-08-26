# Spec (as-built): Public Pet Card data API

**Status:** as-built / historical (Platform / STR `mi-api`)

Platform does **not** manage public pages. This spec is the **backend contract** Passport uses to render `pet-card/{tagNumber}`.

Target for this service: persist the snapshot and host HTML — [wallet-api](../specs/wallet-api.md) `GET /p/{publicId}`.

## URL (not implemented in Platform)

Default barcode / share URL:

```text
https://passport.betterpet.com/pet-card/{tagNumber}
```

Config: `google.wallet.barcodeUrlPattern` (`GOOGLE_WALLET_BARCODE_URL_PATTERN`).

## GraphQL

```graphql
publicAnimalByTagNumber(tagNumber: Int!): PublicAnimal
  @auth(roles: [GUEST_USER, PASSPORT_USER])
```

Controller: `AnimalController.publicAnimalByTagNumber` → `AnimalPublicBatchLoader` (`@AuthLoader`).

### `PublicAnimal` fields (whitelist)

From `animal.graphqls`:

- `name`
- `weight`, `weightUnit`
- `gender`, `neuteredSpayed`
- `assistanceAnimal`
- `primaryBreed`
- `documents(input: AnimalDocumentsFilterInput)`
- `vaccinations`
- `profilePicture`
- `age`

`Animal` implements `PublicAnimal`; extra Animal fields exist but clients of the **public** query should treat this interface as the contract.

Not on `PublicAnimal` (contrast with wallet pass): tag number is the **lookup key** but not listed on the interface; animal type on the pass comes from visa policy, while public animal uses `assistanceAnimal`.

## Loader rules

`AnimalPublicBatchLoader.getData`:

- Select all `ANIMAL` columns for requested tag numbers.
- `deleted_at IS NULL`.
- If auth mode: `RedisTokenService.getCurrentTokenData()` must be non-null; `ANIMAL.ID = token.entityId`. Else no row.

## What this is not

| Query | Purpose |
| --- | --- |
| `animalByTagNumber` | Full animal, `PASSPORT_USER` only |
| `lostAnimal(tagNumber, captchaToken)` | Lost & found; Cloudflare captcha; `GUEST_USER` |
| `publicVisaById` | Public visa / occupancy / rules — screening, not Pet Card |
| Friendly links | Occupancy / property / SP redirects (`mi-api/docs/features/friendly-links.md`) |
