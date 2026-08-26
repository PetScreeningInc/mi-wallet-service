# Spec (as-built): Wallet generation

**Status:** as-built / historical (Platform / STR `mi-api`)  
**API:** GraphQL mutation `createAnimalWalletCard`  
**Schema:** `mi-api/src/main/resources/graphql/wallet.graphqls`

Do **not** copy this contract into the new service. Target API: [SPEC-wallet-api](../SPEC-wallet-api.md).

## Input

```graphql
input AnimalWalletInput {
  animalId: UUID!
  provider: WalletProvider!  # GOOGLE | APPLE
}
```

## Auth

- Role: `PASSPORT_USER`
- Data: `existsAnimalPersonId(animalId, currentPersonId)` or deny

## Domain mapping (`WalletService.createAnimalWalletCard`)

Load animal or throw `Animal not found`.

| Wallet field | Source |
| --- | --- |
| `animalCardId` | `animal.tagNumber` |
| `name` | `animal.name` |
| `animalType` | Last approved visa `policyType` → `Service animal` / `Support animal` / `Household pet`; else `null` (UI defaults to Household pet) |
| `isProfileCompleted` | **Always `true`** (not computed) |
| `breed` | `animal.primaryBreedId` → breed name |
| `age` | `animal.age` |
| `weight` | `animal.weight.toInt()` |
| `weightUnit` | `POUNDS` → `lbs`, else `oz` |
| `gender` | `animal.gender.literal` |
| `imageUrl` | Processed `primaryPictureId` URL, else `google.wallet.defaultProfilePictureUrl` |
| `title` | `google.wallet.title` (also used for Google `cardTitle`; Apple uses hardcoded org name) |
| `barcodeValue` | `google.wallet.barcodeUrlPattern.format(tagNumber)` |

Last approved visa: `VisaRepository.getLastAnimalApprovedAtVisa(animalId)` — `approved_at IS NOT NULL`, not deleted, latest `approved_at`.

## Output

```graphql
type WalletCreatePayload {
  saveUrl: String
}
```

Errors: unknown provider; provider unavailable / not configured; generation failures wrapped as `IllegalStateException` for Apple.

## Google payload (generic)

See [ADR-003](ADR-003-google-jwt.md). Text modules: breed, weight (`{n} {unit.lowercase()}`), age, profileStatus. Weight unit lowercased on Google only.

## Apple payload (generic)

See [ADR-002](ADR-002-apple-pkpass.md). Weight unit not lowercased (`lbs` / `oz`).

## Persistence

- Google: none in Platform.
- Apple: `document` row type `WALLET_PASS`, created by `Elf.SUPER_USER_ID`, S3 private bucket, MIME `application/vnd.apple.pkpass`.
- Migration: `V202606151000__add_wallet_pass_document_type.sql` (`WALLET_PASS` + mime `PKPASS`).

## Env (see `.env.example` “Wallet”)

Google: `GOOGLE_WALLET_SA_EMAIL`, `GOOGLE_WALLET_SA_PRIVATE_KEY`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_LOGO_URL`, `GOOGLE_WALLET_ORIGINS`, optional title / barcode pattern / default picture.

Apple: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERTIFICATE`, `APPLE_PASS_KEY`, `APPLE_WWDR_CERTIFICATE`, icon/logo/background URLs.

## Tests to port as behavioral specs

- `WalletServiceTest` — mapping of policy types, default photo, barcode omit if pattern null
- `WalletControllerTest` — link vs upload
- `CreateAnimalWalletCardDataAuthTest`
- `AppleWalletComponentsTest`, `WalletUtilsTest` — crop 90px, SHA-1 manifest, pass JSON
- `DocumentServiceTest` / `S3ServiceTest` — pkpass upload + Content-Disposition
