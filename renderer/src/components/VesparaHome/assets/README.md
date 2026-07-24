# Sanctuary Home environment

## `sanctuary-arrival-hall.png`

- Purpose: decorative production background plate for Vespara Sanctuary Home.
- Provenance: generated with OpenAI's built-in image-generation tool on
  2026-07-24 for Sanctuary Arrival Milestone 1.0.
- Source dimensions: 1672 × 941 pixels, RGB PNG.
- Native-detail statement: this is the original generated raster output. It
  has not been upscaled and is not represented as native-detail 4K.
- Integration: Vite-bundled local import; responsive `object-fit: cover`.
- Content contract: environment only. No live UI, game cards, buttons,
  Traveler identity, branding, readable text, remote resources, or base64.
- Prompt direction: a cinematic ancient-futurist celestial sanctuary arrival
  concourse with dark stone-and-bronze arches, a grounded reflective floor,
  broad central steps, a luminous gold horizon, and unlabelled architectural
  wings suggesting Library, living space, and systems space. Deep teal-black
  and restrained Vespara gold; crisp structure; no people, signage, logos,
  UI, cards, cyberpunk neon, arcade HUD, excessive bloom, or heavy fog.

The four previous Home-owned SVG wallpaper layers (`starField.svg`,
`planet.svg`, `sun.svg`, and `moon.svg`) were removed when this plate became
active so the repository does not retain a duplicate unused background.

## `sanctuary-ambience.mp3`

- Purpose: low-level environmental room tone for Sanctuary Home.
- Provenance: approved user-supplied production encode copied byte-for-byte
  from `vespara-sanctuary-ambience.mp3` on 2026-07-24.
- SHA-256:
  `7569e9c2ed71cd27d46ba1e8f6d75e1bfc536aa67e5d8f4662f2d1e87d248507`.
- Format: MP3, 60.000 seconds, stereo, 48 kHz, 192 kbps.
- Loop preparation: the supplied production file includes a 5-second circular
  boundary blend. The repository does not re-encode or otherwise modify it.
- Measured decoded program level: -20.7 LUFS integrated, 4.2 LU loudness range,
  and -8.2 dBTP true peak. No edge silence was detected at -50 dBFS.
- Integration: Vite-bundled local import, looping HTML5 Howler playback through
  the existing Sanctuary ambience lifecycle.
- Source master: `vespara-sanctuary-ambience-source.wav` remains unchanged
  outside the repository and is not packaged. This repository has no policy
  requiring source masters in the application bundle.
