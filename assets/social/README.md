# Helicon social assets

Profile pictures, headers, banners, and link-preview images, each in
**light** and **dark** variants following `apps/web/src/theme.css`
(cool neutrals + the one blue accent). Type is DM Sans Bold for display
(headings, `Helicon` lockups), Inter for supporting text, JetBrains Mono
for the OG footer.

## Files

| File | Use | Size |
| --- | --- | --- |
| `pfp-1024-{light,dark}.png` | Master avatar (downscale for anywhere) | 1024 × 1024 |
| `pfp-400-{light,dark}.png` | X / Twitter profile picture | 400 × 400 |
| `pfp-300-{light,dark}.png` | LinkedIn company logo | 300 × 300 |
| `x-header-{light,dark}.png` | X / Twitter header | 1500 × 500 |
| `linkedin-personal-{light,dark}.png` | LinkedIn profile background | 1584 × 396 |
| `linkedin-company-{light,dark}.png` | LinkedIn company page cover | 1128 × 191 |
| `og-{light,dark}.png` | Open Graph / link preview (also fits GitHub social preview) | 1200 × 630 |
| `../docs/assets/readme-hero-{light,dark}.png` | README hero banner (auto light/dark via `<picture>`) | 1600 × 400 |
| `helicon-logo-black.svg` / `helicon-logo-white.svg` | The mark for print, web, press | vector |
| `helicon-mark-2048.png` | Mark master the generator paints from | 2048 × 2048 |

Notes:

- PFPs carry no text: the blue mark alone, kept inside the circle
  crop so it survives X's circular mask. Light uses `#0A6DDD`, dark
  uses `#4DA3FF`.
- The OG footer states the project is an unofficial community project;
  keep that line on anything describing the product.

## Regenerating

Everything is painted by `generate.py` from the vendored mark + fonts,
so a logo or copy tweak is one re-run. It needs Pillow only
(`fontTools` adds a glyph-coverage check):

```bash
python3 -m venv .venv
.venv/bin/pip install pillow fonttools
.venv/bin/python assets/social/generate.py
```

`fonts/` holds static TTF cuts: Inter 400/500 and JetBrains Mono 500
instantiated from the repo's own `@fontsource-variable` packages (SIL
Open Font License 1.1; see the `LICENSE` file in each
`node_modules/@fontsource-variable/*/` package), plus DM Sans Bold at
optical size 40 from the `google/fonts` repo (OFL 1.1, see
`fonts/OFL-DMSans.txt`). `Inter-700.ttf` is kept as an unused fallback
so the display face can be flipped back with one constant.
