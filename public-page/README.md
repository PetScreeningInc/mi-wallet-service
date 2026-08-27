# Public page theme

Static tokens and components for `GET /p/{publicId}`. Contract: [docs/specs/public-page.md](../docs/specs/public-page.md).

| File | Use |
| --- | --- |
| `tokens.css` | CSS variables (color, type, radius, space) |
| `components.css` | `wp-*` layout (brand, hero, facts, tabs, rows, 404) |
| `preview.html` | Pet ID **slots** filled with prototype copy (Cooper). Not production data. |
| `preview-generic.html` | CON-1309 `GENERIC` v1 composition (P4 target) |

P4 inlines these styles on `GET /p/{publicId}` and fills slots from public-flagged template fields. Do not copy Cooper, visa names, or document titles into the renderer.

The published Figma Make prototype is the visual source. The STR FigJam is exploratory only. Existing `pet-screening-fe` supplies two useful references:

- `libs/hachiko/src/theme.css` — matching Passport-blue and neutral color scales.
- `apps/passport/src/assets/img/BetterPetPassportLogo.svg` — official production logo; the preview’s letter “b” is a placeholder.

Documents and visas resolve to caller-supplied public HTTPS URLs hosted by external services. The wallet service renders safe links; it does not proxy document content.

Open locally:

```bash
# from repo root
python3 -m http.server 4173 --directory public-page
# then http://127.0.0.1:4173/preview.html
```

Owner-only prototype screens (Add to Wallet drawer, field picker, native pass mock) are **not** in this folder.
