# Generic template (CON-1309)

File-based only. Key `GENERIC`, version `1`. Copy into the service template registry when P1 exists (path TBD by P1; typical: `src/templates/generic/v1/`).

POC payloads are **not** STR/LTR products. `demo-a` is stay-shaped and `demo-b` is pet-id-shaped so two callers look different; production templates (`STR_STAY`, lost-pet page, …) come from [USE-CASE-MAP](../../../docs/USE-CASE-MAP.md) after Wave A.

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

Apple/Google mappings land in P5; until then POST may persist and return `provider.status: FAILED`.
