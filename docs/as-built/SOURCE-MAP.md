# Source map — Platform files to port or re-read

**Status:** as-built / historical

Paths below are the production Pet Card implementation this service may later **replace**, not the target API.

## Wallet generation (copy-candidate)

| Path | Role |
| --- | --- |
| `mi-api/src/main/resources/graphql/wallet.graphqls` | Public API |
| `mi-api/src/main/kotlin/com/petscreening/offleash/controllers/WalletController.kt` | Mutation + S3 upload for Apple |
| `mi-api/src/main/kotlin/com/petscreening/offleash/services/wallet/WalletService.kt` | Animal → DTO mapping + dispatch |
| `mi-api/src/main/kotlin/com/petscreening/offleash/services/wallet/WalletProvider.kt` | SPI |
| `mi-api/src/main/kotlin/com/petscreening/offleash/services/wallet/WalletPassRequest.kt` | Generic request (T unused by builders) |
| `mi-api/src/main/kotlin/com/petscreening/offleash/services/wallet/WalletPassResult.kt` | Link vs binary |
| `mi-api/src/main/kotlin/com/petscreening/offleash/models/AnimalCardWalletData.kt` | **Actual** pass DTO |
| `mi-api/src/main/kotlin/com/petscreening/offleash/services/wallet/apple/*` | PassKit pipeline |
| `mi-api/src/main/kotlin/com/petscreening/offleash/services/wallet/google/*` | JWT + generic class/object |
| `mi-api/src/main/kotlin/com/petscreening/offleash/data/authorization/CreateAnimalWalletCardDataAuth.kt` | Ownership check |
| `mi-api/src/main/java/com/petscreening/offleash/services/DocumentService.java` | `uploadWalletPass` |
| `mi-api/src/main/java/com/petscreening/offleash/services/S3Service.java` | Private bucket + disposition |
| `mi-api/src/main/resources/db/migration/schema/V202606151000__add_wallet_pass_document_type.sql` | Enums |
| `mi-api/src/main/resources/application.properties` | `google.wallet.*` / `apple.wallet.*` |
| `.env.example` | Wallet env placeholders |

## Public page data (not page hosting)

| Path | Role |
| --- | --- |
| `mi-api/src/main/resources/graphql/animal.graphqls` | `PublicAnimal`, `publicAnimalByTagNumber` |
| `mi-api/src/main/java/com/petscreening/offleash/controllers/AnimalController.java` | Query mapping |
| `mi-api/src/main/java/com/petscreening/offleash/repository/loader/AnimalPublicBatchLoader.java` | Tag lookup + guest entity scope |
| `mi-api/src/main/resources/graphql/publicVisa.graphqls` | Do **not** confuse with Pet Card |

## Adjacent docs / rules

| Path | Why |
| --- | --- |
| `mi-api/docs/features/friendly-links.md` | Different URL system |
| `.cursor/rules/s3-document-upload-pattern.mdc` | WALLET_PASS bucket, LocalStack presign gap |
| `.cursor/rules/spring-mvc-controller-conventions.mdc` | Unauthenticated HTTP must be in `petscreening.public-endpoints` (Pet Card GraphQL is **not** that) |

## Tests

- `mi-api/src/test/kotlin/com/petscreening/offleash/services/wallet/`
- `mi-api/src/test/kotlin/com/petscreening/offleash/controllers/WalletControllerTest.kt`
- `mi-api/src/test/kotlin/com/petscreening/offleash/data/authorization/CreateAnimalWalletCardDataAuthTest.kt`
- `mi-api/src/test/java/com/petscreening/offleash/repository/loader/AnimalPublicBatchLoaderTest.java`

## Do not expect in this repo

- Passport `pet-card` React/routes
- Apple/Google merchant / issuer console runbooks (INFRA-1732 / Confluence)
