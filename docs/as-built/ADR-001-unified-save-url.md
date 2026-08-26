# ADR-001: One GraphQL mutation, one `saveUrl` for Apple and Google

**Status:** as-built / historical (Platform / STR `mi-api`)  
**Date:** inferred from `wallet.graphqls` + `WalletController`  
**Relates-to:** production Pet Card in Platform; not a decision for this service  

This document records the **particular Platform/STR solution**. Target ingest for this repo is REST `POST /v1/wallets` — see [ADR-001 (this service)](../ADR-001-wallet-generation-service-architecture.md).

## Context

Clients need to add a Pet Card to either Google Wallet or Apple Wallet. The two platforms produce different artifacts (JWT save link vs signed `.pkpass` bytes).

## Decision

- Single mutation: `createAnimalWalletCard(input: { animalId, provider })`.
- Single payload type: `WalletCreatePayload { saveUrl: String }`.
- `WalletService.generate` dispatches to a `WalletProvider` list by `WalletProviderType`.
- Controller maps:
  - `LinkResult` → `saveUrl` as-is (Google).
  - `BinaryResult` → upload via `DocumentService.uploadWalletPass` → `saveUrl` = document URL (Apple, typically S3 presigned).

Auth: GraphQL `@auth(roles: [PASSPORT_USER])` plus `CreateAnimalWalletCardDataAuth` (animal must belong to the current person).

## Consequences

- Frontend does not handle `.pkpass` bytes on the GraphQL response; it always navigates/downloads a URL.
- Apple depends on S3, `EnumDocumentType.WALLET_PASS`, MIME `application/vnd.apple.pkpass`, and `Content-Disposition: attachment; filename="pet-card.pkpass"`.
- LocalStack: presigned URLs do not work (see `.cursor/rules/s3-document-upload-pattern.mdc`). Do not use `saveUrl` to verify Apple locally.
- A decoupled service can keep **one ingest API, two result kinds**, but should not assume GraphQL or Platform document rows.

## Alternatives considered (not in Platform)

- Return base64 `.pkpass` in GraphQL — not implemented.
- Separate mutations per platform — not implemented.
