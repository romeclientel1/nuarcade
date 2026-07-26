# Vespara Control Room environment

## `vespara-control-room.png`

- Purpose: decorative architectural plate for the live Vespara Control Room UI.
- Dimensions: 1672 x 941, RGB PNG (~16:9 -- 1.7768:1). Same working
  resolution as the Library plate (`Wheel/assets/vespara-library-overlook.png`).
- Resolution: supplied at this size as-is. Not verified or claimed as
  upscaled from a larger source, and not native 4K (3840x2160) -- 1672x941
  is the actual, full resolution of this file.
- Source: supplied directly by the project owner as a generated concept
  image (`ChatGPT Image Jul 26, 2026, 06_42_45 AM.png`), already an
  environment-only composition -- no image-editing pass was needed or
  performed to strip UI, because visual inspection (multiple close crops
  across the header band, both side wings, the center dais, and the
  instrument panels) found no baked text, buttons, menus, title lockups,
  focus outlines, embedded screenshots, or version strings anywhere in the
  source. The blue circular dials and instrument faces throughout are
  abstract gauge art (no legible glyphs), consistent with the "restrained
  blue active-system light" and "instrumentation" requirements, not UI.
- SHA-256 (both the supplied source file and this copy -- identical, copied
  byte-for-byte): `8664bf7d3f7e5cece568245cbf54c857aff64f4717dac43348a5a4ba3b2f3ba6`
- Composition: symmetric mechanical observatory chamber -- dark carved
  metal/stone walls, brass pillars and instrument stacks with blue gauge
  faces along both sides (left/right wings), a central raised dais with a
  glowing blue star-map dial, twin staircases, and a great arched window
  onto a distant skyline at the back.
- Integration: local Vite import (`ControlRoom.jsx`) rendered as a
  decorative, `aria-hidden` `<img>` with `object-fit: cover` (crops to fill,
  never stretches) and `object-position: center`. All Control Room
  identity, navigation, wing stations, and controls remain live HTML/CSS;
  this file is not a flattened interface mockup.
- Superseded asset: `vespara-control-room.svg` (a hand-authored placeholder
  vector, used only for the initial C1 pass before this plate was
  supplied) has been removed -- nothing in the codebase referenced it once
  `ControlRoom.jsx` was repointed at this PNG.
