# ADR-003: Google Wallet via Save-to-Wallet JWT (no objects.insert)

**Status:** as-built / historical (Platform / STR `mi-api`)  
**Date:** inferred from `GoogleWalletProvider`  
**Relates-to:** [CON-1129](https://petscreening.atlassian.net/browse/CON-1129), [INFRA-1732](https://petscreening.atlassian.net/browse/INFRA-1732)

Adapter notes for this service: keep Save-to-Wallet JWT (no `objects.insert`). Do **not** bind Google object ids to animal **tag number**. Class/object ids and branding come from the template + document `id` / `publicId`.

## Decision (Platform)

Do **not** call Google Wallet REST to pre-create class/object. Build a JWT signed with the issuer **service account RSA private key** (`io.jsonwebtoken`, RS256) and return:

```text
https://pay.google.com/gp/v/save/{jwt}
```

JWT claims:

| Claim | Value |
| --- | --- |
| `iss` | `google.wallet.saEmail` |
| `aud` | `google` |
| `typ` | `savetowallet` |
| `origins` | `google.wallet.origins` (allowlist of sites that may embed Save) |
| `payload` | `{ genericClasses: [...], genericObjects: [...] }` |

## Class / object ids (Platform)

- Class: `{issuerId}.betterpet-pet-card-v1.1` (version in the id)
- Object: `{issuerId}.betterpet-pet-card-{animalCardId}` where `animalCardId` is the animal **tag number**

Object `state`: `ACTIVE`. Brand: issuer name `BetterPet Passport`, `hexBackgroundColor` `#142FE1`.

Generic class template: two rows — three items (breed, weight, age) + one item (profile status). Object text modules + messages (Gender, Issued By). Barcode `QR_CODE` with public Pet Card URL.

Logo from `google.wallet.logoUrl`. Hero image from animal `imageUrl` (`imageModulesData`); omitted if null.

## Configuration gate

`GoogleWalletConfig.isConfigured`: non-blank `saEmail`, `privateKey`, `issuerId`. Private key PEM is stripped and Base64-decoded as PKCS8.

## Consequences

- Save works without a prior Google API write; Google materializes class/object on save.
- `origins` must include every frontend origin that hosts the Save button (Passport URLs are in `.env.example`).
- Object id is **stable per tag number** in Platform (unlike Apple serial). Re-saving may update the same object.
- Title on the card comes from `google.wallet.title` (default `BETTERPET PASSPORT`), not from Apple’s organization name field.
- Default photo URL is a SendGrid CDN PNG if the animal has no `primaryPictureId`.
- CON-1297 notes desktop Google save when the user is signed into a Google account — that is caller/UX, not this JWT shape.
