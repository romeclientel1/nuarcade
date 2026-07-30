# Website assets

This folder holds the screenshots referenced by `website/index.html`. None of
them exist yet — the site currently renders a styled placeholder (see
`.screenshot-placeholder` in `website/styles.css`) wherever each one belongs,
so there are no broken image paths in the meantime.

## Screenshots still needed

| File | Used in | Should show |
|---|---|---|
| `sanctuary-hero.png` | Hero section | The Sanctuary, Vespara's home screen, ideally with Recently Played visible |
| `traveler-recognition.png` | Experience section, after the "Traveler Recognition" step | Traveler Recognition, the profile-selection screen |
| `library-browse.png` | Library section | The Library's system-based browsing view, category tabs visible |
| `control-room-wings.png` | Control Room section | The Control Room, ideally showing both the Systems Wing and Archives Wing |
| `media-manager.png` | Media section | The Media Manager screen reached from an Archives Wing station |
| `depart-confirm.png` | Sanctuary section, after the destination cards | The Depart confirmation, showing both Remain and Depart |

All six already have a labeled placeholder and figure caption in `index.html` —
nothing is missing structurally, only the actual image files.

## Adding a screenshot

1. Capture the real screen from a running Vespara install (no mockups, no
   fabricated UI).
2. Save it as a `.png` into this folder using the exact filename from the
   table above.
3. In `website/index.html`, find the matching `<figure class="screenshot-frame">`
   block and replace the `.screenshot-placeholder` `<div>` with an `<img>`
   pointing at `assets/<filename>.png`, keeping a descriptive `alt` attribute.
4. Remove the corresponding row from the table above once it's in place.

Please don't commit screenshots that include real personal library contents,
account names, or file paths you wouldn't want public — crop or redact first
if needed.
