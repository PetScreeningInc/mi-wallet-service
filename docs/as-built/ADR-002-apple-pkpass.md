# ADR-002: Apple Wallet as a signed PassKit zip stored privately

**Status:** as-built / historical (Platform / STR `mi-api`)  
**Date:** inferred from `AppleWalletProvider`  
**Relates-to:** [CON-1130](https://petscreening.atlassian.net/browse/CON-1130), [INFRA-1732](https://petscreening.atlassian.net/browse/INFRA-1732)  
**References:** [Apple — Building a Pass](https://developer.apple.com/documentation/walletpasses/building-a-pass)

Adapter notes for this service: keep a **generic** pass and CMS-signed zip. Do **not** hardcode BetterPet branding or bind serial numbers to Platform `tagNumber`. Field layout comes from the template, not `AnimalCardWalletData`.

## Decision (Platform)

Generate a **generic** pass (`pass.json` `generic` key), not boarding pass / event / store card.

Pipeline (`AppleWalletProvider`):

1. Build `pass.json` (`ApplePassJsonBuilder`).
2. Download brand assets from config URLs (icon, icon@2x, logo, background @1x/@2x/@3x). Failures are **logged and skipped** (pass may still generate without images).
3. Download pet photo; `ImageProcessor.cropToSquare(..., 90)` → `thumbnail.png`. Null/invalid image is allowed.
4. `ManifestBuilder`: SHA-1 hex of each file (Apple requirement; do not “upgrade” to SHA-256).
5. `PassSigner`: CMS/PKCS7 detached signature with BouncyCastle, `SHA256withRSA`, pass cert + private key + WWDR. PEM may be inline (`\n`-escaped), real newlines, or a filesystem path.
6. `PassBundler`: zip → `pet-card.pkpass`.
7. Upload to **private** S3 bucket (`WALLET_PASS`).

Availability: `AppleWalletConfig.isConfigured` requires pass type id, team id, pass cert, pass key, WWDR. `WalletProvider.isAvailable()` is **not** overridden (defaults true); the real gate is `check(config.isConfigured)` inside `generate`.

## Pass JSON (fixed branding in Platform)

| Field | Value |
| --- | --- |
| `formatVersion` | `1` |
| `organizationName` | `BetterPet Passport` |
| `description` | `Pet card` |
| `foregroundColor` / `labelColor` | `rgb(255, 255, 255)` |
| `backgroundColor` | `rgb(20, 47, 225)` (`#142FE1`) |
| `serialNumber` | **new UUID every generation** (no update-in-place) |
| `barcode` | `PKBarcodeFormatQR`, message = public Pet Card URL, `iso-8859-1` |

Layout:

- Primary: label = animal type (default `Household pet`), value = name
- Secondary: STATUS = `✓ Profile completed` / `✗ Profile incomplete`
- Auxiliary: breed, weight (`{n} lbs|oz`), age (`{n} year(s)`)
- Back: name, type, breed, weight, age, gender, Issued By

## Consequences for a new service

- Need Apple Developer pass type id + certs (see INFRA-1732).
- Image downloads at generate-time couple generation latency to CDN/S3 availability.
- Random serial numbers mean **cannot** push Apple pass updates without a new design.
- Branding is hardcoded in Platform — a reusable service injects org name, colors, and field template.
