# Available example templates

File-based only; there is no template-admin API.

## `GENERIC:v1`

Catalog: `src/templates/generic/v1/`. The two CON-1309 gate payloads remain
`demo-a.json` and `demo-b.json`.

## Input schema (Ajv)

Required: `title` (string), `fields` (object with string values). Optional: `subtitle`, `imageUrl`, `links` (array of `{ label, url }`), `ownerEmail` (must be `public: false`).

## Field flags

| Field | wallet | public |
| --- | --- | --- |
| title | true | true |
| subtitle | true | true |
| imageUrl | true | true |
| fields | true | true |
| links | true | true |
| ownerEmail | false | false |

## `PET_CARD:v1`

Catalog: `src/templates/pet-card/v1/`. The example
`payloads/pet-card.json` uses the `PET_CARD` id and simple Cooper data from the
[BetterPet prototype](https://click-love-58328216.figma.site/).

It uses the same generic rendering slots so both provider adapters and the
public page can consume it without product-domain types. It allows 3–8 display
fields. `ownerEmail` remains private.

The browser UI in the sibling `wallet-demo-browser` skill discovers both
templates directly from the file catalog.
