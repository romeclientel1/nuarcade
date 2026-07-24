# Vespara Brand Assets

Original, repository-owned vector assets for the Vespara identity (Brand
Identity Milestone 2). All files are hand-authored SVG — vector-only, no
embedded raster data, no base64, no remote references, no external font
dependency. Every wordmark/endorsement letterform is custom-built from
straight-line paths (see the generation notes at the bottom), not system
type.

## Brand hierarchy

```
VESPARA
by NuArcade
```

**Vespara** is the visible world and product identity. **NuArcade** remains
the underlying platform/technical identity and developer attribution —
present as the quiet "by NuArcade" endorsement, never as the primary mark.

## Asset inventory

| File | Purpose | Recommended sizes / surfaces |
| --- | --- | --- |
| `vespara-symbol-primary.svg` | Detailed nested doorway/beacon, three arches + threshold light + flanking ornament | Startup presentation, large Sanctuary placement, About/identity surfaces, promotional lockups. 200px+ |
| `vespara-symbol-simplified.svg` | Reduced to two arches + light, thicker strokes | 64 / 48 / 32 / 24px UI use |
| `vespara-symbol-micro.svg` | Solid filled silhouette with a punched threshold-light circle | 16–24px UI, title/status use, small badges, favicon-style presentation |
| `vespara-wordmark.svg` | "VESPARA" custom vector lettering, warm gold | Any surface needing the primary wordmark alone |
| `vespara-wordmark-cream.svg` | Same lettering, Starlight cream | Use over warm-gold or busy backgrounds where gold-on-gold would lose contrast |
| `vespara-wordmark-mono.svg` | Same lettering, solid white | Single-color / mask contexts |
| `vespara-endorsement.svg` | "BY NUARCADE" small-caps endorsement, warm gold, 82% opacity | Beneath the wordmark, always subordinate |
| `vespara-endorsement-cream.svg` | Same, Starlight cream | Pairing with `vespara-wordmark-cream.svg` |
| `vespara-lockup-primary.svg` | Symbol (simplified) + VESPARA + by NuArcade, stacked | Startup screen, About surface, promotional/vertical placements |
| `vespara-lockup-horizontal.svg` | Symbol (simplified) beside a two-line VESPARA / by NuArcade stack | Headers, wide banners, horizontal placements |
| `vespara-icon-square.svg` | Symbol centered in a square viewBox with ~16% padding, transparent background | Square-safe app-icon source art |
| `vespara-icon-dark-field.svg` | Same icon composition over a rounded Sanctuary-Deep→Void square field | Icon preview / dark-field presentation |
| `vespara-icon-mono-mask.svg` | Micro mark, solid white fill, transparent background | Mask-ready / single-color icon derivation |

None of these are wired into the platform icon build (`assets/icons/icon.ico`
/ `.icns` / `.png`) — see the milestone report for why that step was
deliberately deferred.

## Approved colors

Defined as CSS custom properties in `renderer/src/index.css` (`:root`),
consolidating values already used throughout Wheel/GameCard/VesparaHome:

| Role | Variable | Value |
| --- | --- | --- |
| Vespara Void | `--vespara-void` | `#020505` |
| Sanctuary Deep | `--vespara-sanctuary-deep` | `#0a1414` |
| Threshold Gold | `--vespara-threshold-gold` | `#d6b274` |
| Horizon Gold | `--vespara-horizon-gold` | `#f3e2b8` |
| Starlight | `--vespara-starlight` | `#f8f0dc` |
| Quiet Teal | `--vespara-quiet-teal` | `#5ec4b4` |

The symbol/wordmark/lockup SVGs use the literal hex values directly (SVGs
opened outside the app have no access to the app's CSS variables), matching
this table exactly.

## Minimum clear space

Leave clear space around any lockup or symbol equal to at least the width
of the symbol's own flanking accent-line gap (roughly 8% of the asset's
total width on each side). Never crop the apex ornament or the threshold
light — both are load-bearing parts of the silhouette, not decoration that
can be trimmed.

## Incorrect usage to avoid

- Do not recolor the symbol or wordmark with any color outside the approved
  palette above (no cyan, no green, no arbitrary brand colors).
- Do not stretch or skew any asset — scale uniformly only.
- Do not place the primary or simplified symbol over busy artwork without a
  darkened/vignetted backing area; legibility comes from contrast against
  the deep teal-black field, not from an outline or drop shadow.
- Do not replace "THE LIBRARY" or other world-language destination names
  with the wordmark — the wordmark is a platform-identity mark, not a
  section label.
- Do not animate the symbol with pulsing, blinking, or spinning motion.
  Any motion applied to these assets in the app must be restrained (a tiny
  opacity/brightness shift at most) and must respect `prefers-reduced-motion`.
- Do not re-export these as raster images and then discard the SVGs — the
  SVG is the source of truth; raster derivatives belong in a build step,
  not committed alongside it.

## Letterform construction notes

`vespara-wordmark.svg` and `vespara-endorsement.svg` are built from a small
shared library of monoline geometric capital letterforms (straight-line
polylines only, cap-height 100 units, no bezier curves) covering the 12
unique letters needed for "VESPARA" and "BY NUARCADE." This was a
deliberate choice over `<text>` + a font reference (which would silently
fail to render correctly in any context that doesn't have that exact font
available, violating the "no external font reference" requirement) and
over freehand bezier lettering (higher risk of an uncorrectable visual
error without live rendering feedback during authoring). The angular,
faceted letter style this produces is intentional — it reads as part of
the same architectural/geometric language as the doorway symbol, not as a
generic sans-serif substitute.
