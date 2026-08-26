# SPEC: Public page visual contract

**Status:** accepted  
**Date:** 2026-08-26  
**Relates-to:** [SPEC-wallet-api](SPEC-wallet-api.md), [SDD](SDD.md), [ROADMAP](ROADMAP.md) P4  
**Visual source:** [Figma Make Pet ID](https://click-love-58328216.figma.site/) (captured 2026-08-26)  
**Exploration only:** [STR User Flow FigJam](https://www.figma.com/board/zMO0UdV9yB7OnJ35KbEiLP/STR-User-Flow---AA?node-id=536-13993)

Visual and information-architecture contract for `GET /p/{publicId}`. HTTP rules stay in [SPEC-wallet-api](SPEC-wallet-api.md): always unauthenticated; **public**-flagged fields only; 404 if unknown.

Tokens and markup live in [`public-page/`](../public-page/). Agents must follow [`.cursor/rules/public-page-theme.mdc`](../.cursor/rules/public-page-theme.mdc) when rendering HTML.

## Source precedence

1. The published Figma Make prototype defines the intended composition and visual treatment.
2. `pet-screening-fe` is the reference for existing BetterPet brand assets, Hachiko color tokens, and safe external-document behavior.
3. The FigJam contains broader product ideas (Animal Profile, Wallet ID, visa detail, custom drawer). It provides context but must not add features to this public page.

## What this page is

A **read-only consultation surface**: someone opened the QR/barcode or a previously shared URL. It is not Passport signed-in UX and it does not initiate sharing.

| In scope (`GET /p/{publicId}`) | Out of scope (Passport / owner) |
| --- | --- |
| Brand header, identity hero, public facts | Edit profile, Share action/profile, kebab menu |
| Flip card (front = identity, back = trust) | “Choose what to include” drawer |
| Segmented tabs when the template supplies those groups | Any Apple/Google save or wallet action |
| Definition rows, document rows, visa/link rows | Tag number, animal UUID, `ownerEmail`, any non-`public` field |
| 404 empty state | Analytics, visa application flows |

The prototype mixes **owner** chrome (`Add to Wallet`, field picker, native-pass mock) with the **public** card. Only the read-only public composition is the target for this service. This is a permanent product rule, not merely a Wave A limitation.

## Layout (mobile first)

Max content width **390px**, centered on larger viewports. Page background `#F9FAFB`. Horizontal padding **24px**. Vertical rhythm **20px** between blocks.

```
┌─────────────────────────────────┐
│ Brand: mark + betterpet PASSPORT│
│ Hero card (flip)                │
│   Front: photo, name, subtitle, │
│          2 highlights, badges,  │
│          behavior tags          │
│   Back: trust + privacy + verify│
│ Segmented: Profile | Documents  │
│            | Visas              │
│ Active panel (white card/list)  │
└─────────────────────────────────┘
```

Omit a tab (and the control) when that group has no public items. If the template is `GENERIC` v1, there is no Documents/Visas grouping: render **Profile** as a definition list of `fields` plus `links`. Do not invent Pet ID tabs for CON-1309 demos.

## Slots vs template data

Domain stays generic. The renderer binds **slots**, not `Animal` types.

| Slot | Prototype example | `GENERIC` v1 | Later `PET_CARD` (caller `data`) |
| --- | --- | --- | --- |
| `photo` | Cooper image | `imageUrl` | photo URL |
| `title` | Cooper | `title` | name |
| `subtitle` | Australian Shepherd | `subtitle` | breed / species line |
| `highlights` (max 2) | 4 yo / 60 lbs | optional; do not guess | age, weight |
| `badges` | achievements (emoji + title + meta) | omit if absent | trust signals / statuses |
| `tags` | behavior chips | omit if absent | affirmations |
| `facts` | Profile definition list | `fields` key/value | breed, coat, gender, … |
| `documents` | grouped file rows | omit | vaccination / letter links |
| `links` / visas | property + dates | `links[]` | visa deep links |

Never render `ownerEmail` or keys with `public: false`.

## Hero — front

- White card, **24px** radius, **1px** `#E5E7EB`, padding **20px**, gap **16px**.
- Photo **72×72**, circle, `object-cover`, 4px ring `#F3F4F6`. Fallback fill `#E8B762` + initial, never a broken image icon.
- Title: Archivo Bold **18px**, `#101828`.
- Subtitle: TT Hoves / Inter Regular **14px**, `#6A7282`.
- Two highlights in a row: value Archivo Bold **18px** `#101828`; label 11px `#99A1AF`.
- Section label “Achievement”: TT Hoves DemiBold **13px** `#4A5565`.
- Badge chips: horizontal scroll, white, 12px radius, light shadow, emoji **20px**, title 12px `#1E2939`, meta 10.5px `#6A7282`.
- Behavior chips: pill, gray track `#F3F4F6`, emoji + 13px label.
- “Tap to flip”: 12px Medium, brand blue `#1B42F5`, with rotate icon.

## Hero — back

Dark brand panel (`#1B42F5` → `#142FE1`), same radius. White copy. Three notices:

1. **Information you can trust** — “Pet information is self-reported by the pet parent.”
2. **Your privacy matters** — “Share only what you choose. You’re in control.”
3. **Verify this Pet ID** — “Scan the QR code or visit **betterpet.com/verify**.”

Footer: “Tap to flip back”. Do not put private owner emails or document binaries on this face.

## Tabs and lists

- Segmented control: track `#F3F4F6`, **4px** padding, full-width, pill. Selected: white + dual 1px shadow. Label 13px Medium; selected `#101828`, idle `#6A7282`.
- Profile facts: white **16px** radius card, hairline `#E5E7EB`, shadow `0 1px 2px rgba(0,15,55,0.06)`. Each row: term 13px muted, description 15px Semibold `#101828`, divider `#F3F4F6`.
- Document row: tinted file glyph (purple vaccination, blue medical), title 15px Archivo Semibold, meta 13px muted, chevron.
- Visa/link row: 44px circular thumbnail (gradient `#DBEAFE` → `#FEF3C7` if no image), title, location, dates. Entire row is a link when `url` is present.

### External public links

- Document, letter, and visa URLs are public HTTPS links supplied by the caller and hosted by the responsible external service (for example, the document/CDN or visa service). This service does not proxy or store their binaries.
- Render only links allowed by the stored template version and marked `public: true`.
- Open external links in a new browsing context with `target="_blank"` and `rel="noopener noreferrer"`. Send no authentication token or private identifier in generated query parameters.
- Inline PDF/image preview is optional. If implemented, use `referrerpolicy="no-referrer"` and a restrictive iframe sandbox; always keep “Open in new tab” as the fallback. This follows the existing `pet-screening-fe` public document behavior.
- Reject or suppress non-HTTPS schemes in production (`javascript:`, `data:`, `file:`, and similar).

## Motion and a11y

- Flip: `transform-style: preserve-3d`, `rotateY(180deg)`, **600ms**, `cubic-bezier(0.4, 0, 0.2, 1)`. `prefers-reduced-motion: reduce` → instant swap, no 3D.
- Tabs: `role="tablist"` / `tab` / `tabpanel`. Flip control is a `<button>`.
- Contrast: body text on white ≥ `#4A5565`; white on brand blue is the reverse-card default.
- Language: English chrome from the prototype until a template supplies locale. Do not hardcode the Cooper demo in the renderer.

## 404

Same page chrome (brand + centered card). Title “This Pet ID is unavailable.” Body: the link may be wrong or expired. No field dump.

## Theme tokens

Canonical CSS: [`public-page/tokens.css`](../public-page/tokens.css). Do not introduce a second blue or a purple BetterPet accent on this surface (Passport-blue `#1B42F5` is the product direction). The matching scale is already defined by `pet-screening-fe/libs/hachiko/src/theme.css`.

**Type:** Archivo (wordmark, titles, fact values) + Inter as the open substitute for **TT Hoves** (labels, meta, tabs). TT Hoves is what the prototype loads; do not vendor those files unless legal clears a license. If TT Hoves is added later, point `--font-text` at it without changing sizes.

**Brand asset:** use the official BetterPet Passport SVG from `pet-screening-fe/apps/passport/src/assets/img/BetterPetPassportLogo.svg` when the asset is brought into this service. The letter “b” in the static preview is only a placeholder and is not the production logo.

## P4 vs later templates

- **P4 / CON-1309 `GENERIC`:** one column, hero (photo + title + subtitle), facts from `fields`, links list. No fake achievements or visa tabs.
- **P12 `PET_CARD`:** bind CON-1297-shaped public keys into badges, documents, and visa rows. Mapping still belongs to the caller; this spec only describes how those slots look.
