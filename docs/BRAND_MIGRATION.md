# Vespara Brand Identity Migration — Milestone 2 Report

Source-controlled record of the production rebrand and integration pass.
Written at the time of the change; treat as historical record, not living
documentation — see `renderer/src/assets/brand/README.md` for the current
asset reference.

## Brand decision

```
VESPARA
by NuArcade
```

Vespara is the visible world/product identity. NuArcade is the underlying
platform, technical identity, compatibility layer, and developer
attribution — always subordinate, never the primary mark.

## Visible surfaces changed

- Electron packaging `productName` (`NuArcade` → `Vespara`)
- Renderer window `<title>` (`renderer/index.html`)
- Startup cinematic (`IntroVideo.jsx`) — new quiet corner brand mark
- Attract-mode idle loop bottom bar (`AttractMode.jsx`) — VESPARA / by NuArcade
- Boot rotator brand text (`BootScreen.jsx`, currently unused/dead code —
  updated for consistency in case it's reactivated)
- Sanctuary header (`VesparaHome.jsx`) — new threshold seal above the
  existing "VESPARA" world-name text (that text was already Vespara from
  an earlier milestone)
- Library header (`Wheel.jsx`) — new Collection Hall seal above "THE
  LIBRARY" place name
- Help title, Settings subtitle/restart/update-available/cache-cleared
  copy, Library exit/empty-state copy, update banner copy (en + es)
- App-level render-error boundary text (`App.jsx`)
- Settings export-file header line ("Vespara Game Library")
- MediaManager "about" copy and restart-required dialog
- Konami-code Easter egg tag line (`Wheel.jsx`)
- Main-process marquee (second-display cabinet marquee) title/brand/fallback
- Main-process backup/restore native dialog titles
- Main-process EmuMovies-folder generated `README.txt` instructional text
- `README.md` public title and introduction paragraph
- `docs/index.html` public marketing page (title, hero mark, nav logo,
  feature/step copy, footer) — GitHub URLs left untouched
- Select Wizard onboarding copy (Welcome/Ready/Security/Paths/
  SetupGuide/Scan/Media screens, and the Exit-Wizard button title)

## Technical identifiers deliberately preserved

- Package name: `nuarcade`
- `appId`: `com.nuarcade.app`
- `window.nuarcade` (preload API surface) and all its methods
- All IPC channel names
- All `localStorage` keys (`nuarcade_*`)
- Config/DB filenames (`nuarcade-config.json`, `nuarcade-events.json`,
  `mame-driver-status.json`, etc.)
- GitHub repository path (`romeclientel1/nuarcade`) everywhere it appears
  (release URLs, docs footer link, `scripts/set-version.js` comments)
- HTTP `User-Agent` strings sent to SteamGridDB/other external APIs
  (`NuArcade/1.0`, `NuArcade/{version}`) — external-facing API identity,
  not a user-visible surface
- `SS_SOFTNAME` in `useScreenScraper.js` — a ScreenScraper API identity
  parameter, not user-visible
- The internal `|||NUARCADE|||` yt-dlp output delimiter in
  `src/main/index.js` — a parsing sentinel, never rendered to a user
- Code comments referencing "NuArcade" as the technical program name
  throughout `src/main/index.js` and `src/main/scanner.js`
- `USER_MANUAL.md` — left untouched this milestone (Category D: evaluated
  individually, not blindly replaced; extremely high volume of
  instructional NuArcade mentions throughout, better handled as its own
  focused pass)
- The suggested `C:\NuArcade\` folder-path example in
  `SecurityScreen.jsx` — a cosmetic suggestion string, not a real default
  path; left alone to avoid implying a technical convention that doesn't
  exist
- `renderer/src/data/controllerHints.js` file-header comment — internal,
  non-visible

## `app.setName('NuArcade')` placement and why it is safe

Placed as the **first statement in `src/main/index.js`** immediately after
`const { app, ... } = require('electron')` and **before**
`const config = require('./config')`.

This ordering is load-bearing: `src/main/config.js` computes
`CONFIG_PATH = path.join(app.getPath('userData'), 'nuarcade-config.json')`
at **module-load time** (a top-level `const`, evaluated synchronously the
instant `require('./config')` runs). Electron's default `userData`
directory resolves from `app.getName()`, which a packaged build derives
from `productName` unless overridden. Since `productName` is now
`"Vespara"`, if `setName('NuArcade')` ran even one line later (e.g. inside
`app.whenReady()`, which is the far more common pattern), `config.js`
would have already locked in a `userData` path resolved against
`"Vespara"` before the override ever took effect — silently moving every
existing user's config/profile/metadata to a new, empty directory.

Verified by `src/main/appIdentity.test.js`, which intercepts both
`app.setName` and `app.getPath` with a call-order-tracking mock, requires
the real `index.js`/`config.js` fresh, and asserts `setName` fires before
`config.js`'s own `getPath('userData')` call — against the actual
committed source, not a restated copy.

No user-data migration, copy, or rename was performed or is needed — the
directory the app resolves to is unchanged.

## Packaging metadata changed

- `build.productName`: `NuArcade` → `Vespara`
- `build.executableName`: added, pinned to `NuArcade` — keeps the
  installed `.exe` filename unchanged even though the visible product name
  changed, so existing Windows Firewall rules, antivirus/Defender
  exclusions (the Wizard's own Security screen sets these up), taskbar
  pins, and any external tool integration that references the executable
  by name all keep working without user action.
- `description`: updated to mention both names ("Vespara by NuArcade —
  ...")

## Packaging metadata deliberately preserved

- `appId: com.nuarcade.app` — unchanged. This is the key NSIS/Squirrel-style
  installers use to recognize "is this an upgrade of an existing install,"
  independent of `productName`. Preserving it is what keeps a Vespara-
  branded build recognized as an upgrade of an existing NuArcade install
  rather than a parallel installation.
- No installer GUID, `publish`/update-channel block, or repository-
  targeting field exists in this config today, and none was added —
  verified by `scripts/packagingIdentity.test.js`.
- `nsis.installerIcon` / `installerHeaderIcon` / `include` (folders.nsh) —
  unchanged.
- The auto-update flow (`useVersionCheck.js` → GitHub Releases API →
  `downloadUrl`) fetches the real asset URL dynamically from whatever
  electron-builder actually publishes; it never hardcodes an expected
  filename, so the `productName` change carries no update-download risk.
  The two local, self-referential temp-file names used only to cache the
  downloaded installer (`src/main/index.js`'s `download-update` handler
  and `UpdateBanner.jsx`'s matching display string) were renamed together,
  from `NuArcade-Setup-{version}.exe` to `Vespara-Setup-{version}.exe` —
  purely an internal scratch filename both ends of that flow already
  computed independently; not tied to the real electron-builder artifact
  name in any way.

## Startup integration

`IntroVideo.jsx` gained one new `<img>` — the horizontal lockup SVG,
positioned as a small (28px-tall), 55%-opacity mark in the bottom-left
corner (the skip hint already occupies the bottom-right). It is
`aria-hidden`, `pointer-events: none`, has no `inset:0` (so it can never
become a full-screen splash), and touches nothing about the `<video>`
element's `src`, `autoPlay`, `onEnded`/`onError` finish wiring, or the
existing keyboard/mouse/gamepad skip listeners — all verified by
`Wheel/brandIntegration.test.js`. `FADE_DURATION` and `buildVideoUrl` are
untouched.

## Sanctuary integration

`VesparaHome.jsx`'s header gained one new `<img>` (the simplified symbol)
rendered above the existing "VESPARA" title text inside `.worldIdentity` —
additive, not a replacement (that title text already read "VESPARA" from
an earlier milestone). It is `aria-hidden`, sits inside `.worldIdentity`
(no separate `pointer-events` rule needed — the seal itself carries
`pointer-events: none`), carries no animation/transition of its own, and
`ACTIONS`/`runAction`/focus-zone state/Recently Played/restoration are all
verified unchanged by `VesparaHome/brandIntegration.test.js`.

## Library integration

`Wheel.jsx`'s header gained one new `<img>` (the micro mark) rendered
above "THE LIBRARY" place name inside `.placeIdentity` — the same
already-`pointer-events: none`, already-decorative container the game
count/status badges live in. **Deliberately not** added to the Library
Console trigger button: that trigger's own CSS already carries an explicit
design comment ("Quiet architectural bracket framing -- not an icon, not
a kebab/hamburger") from the prior Console milestone, and a compact
11px-text single-line button is the wrong place to add a second visual
element without risking exactly the clutter this milestone's own Library
Integration section warns against. `topMenuActions`, `TOP_MENU_MAX`,
`CONSOLE_ACTION_INDICES`, the controller-focus model, and carousel/search/
category behavior are all verified unchanged by `Wheel/brandIntegration.test.js`.

## Localization

English and Spanish both updated in lockstep for every visible-copy key
touched (`settings.subtitle`, `settings.restartConfirmBody`,
`settings.updateAvailable(Tooltip)`, `settings.musicNote`,
`settings.cacheClearedAlert`, `wheel.exitTitle`, `wheel.confirmExitTitle`,
`wheel.libraryEmptySub`, `help.title`, `updateBanner.available`,
`updateBanner.readyToInstall`, `updateBanner.installingRestart`).
"Vespara" and "NuArcade" are never translated in either locale (Spanish
strings insert them as literal brand tokens, matching existing convention
for `wheel.libraryPlaceName`/etc from prior milestones). Existing
i18n tests (`coverage.test.js`, `coverage2.test.js`) were updated in
lockstep so their exact-string assertions match the new copy; no
unrelated translation was touched. World-language destination names
(Sanctuary, The Library, Collection Hall, Return to Sanctuary, Depart,
etc.) were not touched.

## Documentation created

- `renderer/src/assets/brand/README.md` — asset inventory, recommended
  sizes/surfaces, approved colors, minimum clear space, incorrect usage
- `docs/BRAND_MIGRATION.md` — this report

## Tests added

- `src/main/appIdentity.test.js` (4 tests) — `app.setName` ordering proof
- `scripts/packagingIdentity.test.js` (7 tests) — productName/appId/
  executableName/package-name compatibility guarantees
- `renderer/src/assets/brand/brandAssets.test.js` (48 tests) — every SVG
  is vector-only, no raster/base64/remote/font references, full inventory
  present, palette variables declared
- `renderer/src/components/Wheel/brandIntegration.test.js` (10 tests) —
  startup mark + Library seal integration, Console/carousel/search
  untouched
- `renderer/src/components/VesparaHome/brandIntegration.test.js` (7 tests)
  — Sanctuary seal integration, Home behavior contracts untouched
- Updated in place: `src/main/index.test.js` (electron mock gained
  `app.setName`), `renderer/src/i18n/coverage.test.js` and `coverage2.test.js`
  (exact-string assertions updated to match new copy)

## Test totals

- Main-process + scripts (`src/main/*.test.js src/preload/*.test.js
  scripts/*.test.js`): **65/65 passing**
- Renderer (`renderer && npm test`, now also covering
  `src/assets/brand/*.test.js`): **679/679 passing**
- Renderer build: succeeds
- `git diff --check`: clean

## Remaining NuArcade occurrences, classified

**B — Technical/API identity (preserve):** `window.nuarcade`, all IPC
channel names, all `nuarcade_*` localStorage keys, `nuarcade-config.json`/
`nuarcade-events.json`/`mame-driver-status.json`, the GitHub repo path,
the `User-Agent: NuArcade...` strings, `SS_SOFTNAME`, the
`|||NUARCADE|||` parsing delimiter, `package.json`'s `name`/`appId`/
`executableName` fields.

**C — Developer/platform attribution (preserve or "by NuArcade"):** the
"by NuArcade" endorsement itself everywhere it appears; code comments
identifying the app as "NuArcade" internally.

**D — Historical/high-volume documentation (evaluated, deferred):**
`USER_MANUAL.md` in full — dozens of instructional mentions throughout a
long document; touching it correctly deserves its own focused pass rather
than a mechanical find-and-replace risking broken instructions. README's
changelog entries below the intro ("What's New in X.X" sections, setup
instructions, troubleshooting) — left as the historical/technical record
of what the app did under its prior name at each version, per this
milestone's own "evaluate individually rather than blindly replacing"
guidance for historical documentation.

## Icon and platform work — deliberately deferred

No platform icon binaries (`assets/icons/icon.ico` / `.icns` / `.png`)
were regenerated or touched. The repository has `png2icons` and `svg2img`
as devDependencies but **no committed script** that orchestrates them into
a deterministic icon-generation workflow — per the milestone's own
instruction ("do not generate platform icon binaries unless the
repository already has a deterministic, tested icon-generation workflow"),
this was inspected and explicitly not used. `vespara-icon-square.svg`,
`vespara-icon-dark-field.svg`, and `vespara-icon-mono-mask.svg` are
prepared as source art for whenever that workflow is built.

## Recommended future branding milestones

1. Build and commit a deterministic SVG→ICO/ICNS/PNG icon-generation
   script (using the already-present `png2icons`/`svg2img` deps), then
   regenerate `assets/icons/*` from `vespara-icon-square.svg`.
2. A focused `USER_MANUAL.md` rebrand pass, read start-to-finish rather
   than mechanically replaced.
3. Consider whether the Wizard's remaining body-copy sentences (there are
   a few dozen across screens) should read "Vespara" consistently
   end-to-end vs. the representative subset updated this milestone.
4. A real Windows install/upgrade test: install the last NuArcade-branded
   build, then install a Vespara-branded build over it, and confirm (a)
   no parallel install directory is created, (b) existing config/profiles
   survive, (c) the Start Menu/desktop shortcut updates in place rather
   than duplicating, (d) no firewall/Defender re-prompt occurs. This
   milestone's packaging changes were reasoned through carefully but not
   verified against a real NSIS upgrade run.
5. Consider whether `docs/index.html`'s remaining cyan/green accent
   palette should migrate to the Vespara teal/gold palette for visual
   consistency with the in-app identity, or stay as a deliberately
   distinct "developer/marketing site" look.

## Risks / decisions requiring Windows review

- **Executable filename pinning via `build.executableName`**: this repo's
  `electron-builder` devDependency is pinned to `^24.13.3`. I could not
  verify against a real build that this version of electron-builder
  honors `executableName` as documented — this should be confirmed with
  an actual `npm run build:win` before shipping.
- **NSIS upgrade-in-place behavior**: reasoned through via `appId`
  preservation, but not verified against a real prior-version-installed
  Windows machine (see recommended milestone #4 above).
- **Install directory rename**: NSIS's default per-user install directory
  name is typically derived from `productName`, which did change. Even
  with `appId` correctly triggering upgrade detection, the physical
  install folder name will differ from a prior NuArcade install; this is
  expected/intentional but worth confirming NSIS cleans up the old
  directory rather than leaving an orphaned one behind.
