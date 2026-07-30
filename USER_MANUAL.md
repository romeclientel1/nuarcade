# Vespara Owner's Manual

Verified against Vespara 6.0.2. Requires Windows 10 or 11, 64-bit. Vespara does not include games, ROMs, BIOS files, or emulator binaries — you provide and configure all of those yourself.

This manual covers everything from a guest walking up to the cabinet, to configuring emulator paths and media sources as the owner. If you only need the basics, read the Quick Start below and stop there.

---

## Table of Contents

1. [Quick Start for Guests](#1-quick-start-for-guests)
2. [The Sanctuary](#2-the-sanctuary)
3. [The Library](#3-the-library)
4. [Traveler Recognition and Profiles](#4-traveler-recognition-and-profiles)
5. [The Control Room](#5-the-control-room)
6. [Setting Up Emulators and Game Paths](#6-setting-up-emulators-and-game-paths)
7. [Media, Artwork, Videos, Metadata, and Bezels](#7-media-artwork-videos-metadata-and-bezels)
8. [Storage, Backups, Upgrades, and Uninstalling](#8-storage-backups-upgrades-and-uninstalling)
9. [Updating Vespara](#9-updating-vespara)
10. [Troubleshooting](#10-troubleshooting)
11. [Keyboard and Controller Reference](#11-keyboard-and-controller-reference)
12. [Supported Systems](#12-supported-systems)
13. [Version and Documentation Status](#13-version-and-documentation-status)

---

## 1. Quick Start for Guests

You don't need to know anything about setup to play. Here's all of it:

1. **Turn on the cabinet.** Vespara plays a short intro, then arrives at Traveler Recognition.
2. **Pick a Traveler, or tap "Enter as Guest."** No account needed for guests.
3. **You'll arrive in the Sanctuary** — Vespara's home screen. From here you can jump into your Recently Played games or enter the Library.
4. **In the Library**, move left/right to browse, and select a game to see its details before launching.
5. **To leave a game and come back**, use the emulator's own in-game exit combo (this varies by game/emulator — ask the owner if unsure).
6. **When you're done**, choose Depart from the Sanctuary to close Vespara, or Switch Player to hand the cabinet to someone else.

That's genuinely all you need. Everything below is for the owner.

---

## 2. The Sanctuary

The Sanctuary is Vespara's home screen — the first thing you see after Traveler Recognition, and where every session both starts and can return to.

**Recently Played** shows up to 8 games, scoped to the current Traveler (a different Traveler sees their own recent games, not yours). Select one to jump straight back into it.

**The four Sanctuary destinations:**

| Destination | What it does |
|---|---|
| The Library | Browse, search, and launch your full game collection |
| The Control Room | Configure emulators, paths, controllers, display, and media |
| Switch Player | Return to Traveler Recognition to hand off or switch profiles |
| Depart | Close Vespara |

**Depart** opens a confirmation with two choices: **Remain** and **Depart**. Remain cancels and returns you to the Sanctuary — nothing happens. Depart closes the application. Choosing Depart does not delete, reset, or affect any saved data, profiles, favorites, or playtime history; it simply exits the program the same way closing any other application would.

---

## 3. The Library

The Library is where you browse and launch games.

- Games are organized by system, shown as category tabs — only systems that actually have games in them appear.
- Selecting a game opens its detail view (called the **Archive View**), showing artwork, a gameplay preview video where available, and launch options.
- **Search** lets you find a game by name.
- **Sort** options reorder the list by most played, most launched, recently added, top rated, or system.
- **Favorites** let you mark games for quick access.
- **Collections** let you group games into your own custom lists.
- **Stats** shows play statistics; **Achievements** shows unlocked achievements.
- **Random** jumps to a random game in the current filter.
- A background gameplay video plays behind the selected game where one is available.

### AI Game Coach

Press **C** on any game to open the AI Game Coach. It offers move lists, tips, strategies, and combos for that game, and supports natural-language search — you can type what you want to play instead of browsing manually. It works without any API key configured.

### Operator Dashboard

Press **O** to open the Operator Dashboard: a 35-day activity heat map, playtime totals, a breakdown by system, and per-game launch counts.

---

## 4. Traveler Recognition and Profiles

Traveler Recognition is the profile-selection screen shown at the start of every session and whenever you use Switch Player from the Sanctuary.

- Create a new Traveler, pick an existing one, or continue as Guest.
- Each Traveler tracks their own favorites, playtime, and recently played history separately — a Guest's activity is not saved to any Traveler's profile.
- Recently Played on the Sanctuary is always scoped to whichever Traveler (or Guest) is currently active.

---

## 5. The Control Room

The Control Room is reached from the Sanctuary and holds all of Vespara's configuration, organized into two wings.

### Systems Wing — makes the worlds playable

| Station | What it's for |
|---|---|
| Emulators | Detected emulators and their install paths |
| Game Paths | The folders Vespara scans for each system |
| Controllers | Test connected gamepads |
| Launch Behavior | Attract mode, idle timing, auto-launch behavior |
| Display & Performance | Fullscreen, CRT scanline effect, theme |
| Preferences | Language, audio, and about/version info |
| Systems Archive | Rescan, cache, and library maintenance tools |

### Archives Wing — makes the collection come alive

| Station | What it's for |
|---|---|
| Artwork | Box art and marquee management |
| Videos | Per-game and bulk gameplay video fetching |
| Scraping | Import media from EmuMovies |
| Bezels | Fetch bezel artwork by system |
| Media Restoration | Backup, restore, and orphaned-media cleanup |

**Note:** opening any Archives Wing station takes you into a screen still titled **Media Manager**. This is expected — Media Manager is the actual screen behind every Archives station, not a separate or misnamed tool.

---

## 6. Setting Up Emulators and Game Paths

Vespara does not include or bundle any emulator, ROM, BIOS file, or firmware. You install emulators yourself and tell Vespara where to find them and where your games live.

For each system you want to play:

1. Install the emulator to a folder you control.
2. In the Control Room, open **Emulators** and point Vespara at that install folder.
3. Open **Game Paths** and point Vespara at the folder where that system's games live — for example, `<your games folder>\PS2Games\`, or any location you prefer.
4. After changing any path, **rescan** from the Systems Archive station (or restart Vespara) — changing a path alone does not refresh the library automatically.

Vespara does not require a particular drive letter. Initial configurations may contain C:\-based example paths — owners can replace those with folders on any drive they control.

**RetroArch is structured differently from every other emulator Vespara supports:** it uses one folder per *system* (for example `nes`, `snes`, `genesis`), with ROM files placed directly inside that folder — not one folder per game. Placing individual game folders at the top level instead will cause Vespara to misread them as unrecognized systems.

**TeknoParrot Folder Renamer** (in the Control Room's Emulators area) can bulk-rename TeknoParrot game folders to a cleaner, more consistent naming convention, which helps title-matching against EmuMovies and SteamGridDB.

**BIOS Status** (also in the Control Room) runs a live check for required BIOS files for the three emulators that need them and that Vespara can verify directly: PCSX2 (looks for `.bin` files in its `bios/` folder), DuckStation (looks for a PlayStation BIOS `.bin` in its `bios/` folder), and Xemu (looks for an MCPX boot ROM plus a BIOS `.bin` in its install folder). For every other emulator that requires BIOS, firmware, or keys — including Ryujinx/Switch — consult that emulator's own documentation for what it needs and where to place it.

**One consolidated legal note:** you are responsible for providing your own legally obtained games, firmware, encryption keys, and BIOS files wherever an emulator requires them. Vespara does not provide, fetch, or redistribute any of these.

---

## 7. Media, Artwork, Videos, Metadata, and Bezels

Vespara can pull artwork and video from two sources: **SteamGridDB** (automatic, built into Vespara) and **EmuMovies Sync** (higher quality, requires a separate account and desktop app). Gameplay videos can also be fetched directly from YouTube.

### The fast path: Auto-fill Everything

From Media Manager's Library tab, **Auto-fill Everything** runs a priority chain automatically:

1. Imports every EmuMovies match first (best quality, if EmuMovies Sync is set up).
2. Fills in artwork from SteamGridDB for anything EmuMovies didn't cover.
3. Fills in gameplay video from YouTube for anything still missing.

Click it again while it's running to cancel. On a large library this can take a while; it shows live progress so you can tell it's working.

### SteamGridDB (automatic)

Add your API key in the Control Room's Artwork station and Vespara fetches hero art and capsule images automatically.

### EmuMovies Sync (higher quality video and box art)

1. Create an account at EmuMovies — a paid membership unlocks video content.
2. Download the EmuMovies Sync desktop app from EmuMovies.
3. In Media Manager's Scraping tab, use "Create folder structure" — this builds one folder per emulator inside your configured Media folder.
4. Point Sync's destination at the specific emulator folder you're downloading for.
5. In Sync, select the matching system and run the download.
6. **Back in Vespara, click "Scan EmuMovies folder"** — this step is required. Downloading with Sync only places files on disk; nothing appears in Vespara until you scan and import.
7. Review the matches, then import all (or import individually).

**A note on TeknoParrot:** it covers many different arcade hardware platforms, and most of that hardware isn't in EmuMovies' catalog. The best-confirmed match is Konami e-AMUSEMENT titles. For everything else under TeknoParrot, use Vespara's own YouTube fetch instead (Media Manager's Library tab, per-game).

### System logos

Category tabs in the Library can show a real logo instead of plain text:

1. Place image files in `<your Media folder>\SystemLogos\`.
2. Name each file to exactly match the category tab, lowercase. **Spaces and hyphens in a tab's name are kept, not stripped** — for example `virtual boy.png`, `sega cd.png`, `pc-fx.png`, as well as the more familiar `xbox360.png`, `ps1.png`, `arcade.png`. PNG, JPG, JPEG, WEBP, and SVG all work.
3. No restart or manual rescan is needed. Vespara reloads the SystemLogos folder every time you enter the Library, so leaving and coming back (or opening the Library for the first time after adding files) is enough.

Categories without a matching logo simply keep showing text, so this can be done gradually. Vespara does not ship logo images itself, since official console logos are trademarked — source your own.

Matching is **case-insensitive** either way — `Xbox360.PNG` and `xbox360.png` both work, since Vespara lowercases both the filename and the tab name before comparing them.

Collections (the custom groups you build yourself in the Library) never show a logo, regardless of filename — they always display your chosen collection name as text.

A few tab names never actually appear in a real library today, so a logo for them would never be seen: **Retro** and **Pinball** are listed among the app's built-in tab names but nothing currently populates either one with games. Original Xbox games (Xemu/Cxbx-Reloaded) have no dedicated tab at all — they only show up under **All** — so there is no logo filename for Xbox to add.

The table below is the complete, verified list of every tab that can currently show a custom logo, its required filename (shown here as `.png`, though the other four extensions above work identically), and notes on how it's populated.

**Built-in tabs**

| Library tab | Filename | Notes |
|---|---|---|
| All | `all.png` | Always present. |
| Favorites | `favorites.png` | Shown once you have at least one favorite. |
| Recent | `recent.png` | Shown once you have at least one recently-played game. |
| Arcade | `arcade.png` | Populated by TeknoParrot titles (default genre) and MAME titles; also shared with a RetroArch `arcade` folder if you use one. |
| MAME | `mame.png` | Populated by the dedicated MAME scanner; also shared with a RetroArch `mame` folder. |
| Racing | `racing.png` | Only from TeknoParrot titles whose own metadata tags them as a racing genre. |
| Fighting | `fighting.png` | From TeknoParrot titles tagged as fighting, and from RetroArch Saturn, Neo Geo, NGP, FBA, or Atomiswave folders (those systems default to a "Fighting" genre). |
| Shooter | `shooter.png` | Only from TeknoParrot titles tagged as a shooter genre. |
| Rhythm | `rhythm.png` | Only from TeknoParrot titles tagged as a rhythm/music genre. |
| Flying | `flying.png` | Only from TeknoParrot titles tagged as a flying genre. |
| Sports | `sports.png` | Only from TeknoParrot titles tagged as a sports genre. |
| N64 | `n64.png` | Populated by the dedicated Project64 scanner; also shared with a RetroArch `n64` folder. |
| PS1 | `ps1.png` | Populated by the dedicated DuckStation scanner; also shared with a RetroArch `psx` or `ps1` folder. |
| PSP | `psp.png` | Populated by the dedicated PPSSPP scanner; also shared with a RetroArch `psp` folder. |
| Dreamcast | `dreamcast.png` | Populated by the dedicated Flycast scanner; also shared with a RetroArch `dreamcast` folder. |
| Model2 | `model2.png` | Populated by the dedicated Model 2 Emulator scanner. |
| Model3 | `model3.png` | Populated by the dedicated Supermodel (Model 3) scanner. |
| PS3 | `ps3.png` | Populated by the dedicated RPCS3 scanner. |
| Xbox360 | `xbox360.png` | Populated by the dedicated Xenia scanner. |
| GCWii | `gcwii.png` | Populated by the dedicated Dolphin scanner (both GameCube and Wii titles). |
| WiiU | `wiiu.png` | Populated by the dedicated Cemu scanner. |
| PS2 | `ps2.png` | Populated by the dedicated PCSX2 scanner; also shared with a RetroArch `ps2` folder. |
| Switch | `switch.png` | Populated by the dedicated Ryujinx scanner. |
| PC | `pc.png` | Populated by both the Steam-library scanner and the direct PC-games scanner. |
| Retro | `retro.png` | Listed in the app's built-in tab names, but no scanner currently produces a game that populates it. It cannot appear in a real library right now. |
| Pinball | `pinball.png` | The Pinball scan handler calls a function that isn't implemented, so the tab never receives games in the current build. It cannot appear in a real library right now. |

**RetroArch per-system tabs** (one tab per non-empty folder under your RetroArch games path; filename is the system name shown, lowercase, spaces/hyphens kept)

| System | Filename | System | Filename |
|---|---|---|---|
| NES | `nes.png` | Neo Geo | `neo geo.png` |
| SNES | `snes.png` | NGP | `ngp.png` |
| GBA | `gba.png` | FBA | `fba.png` |
| GBC | `gbc.png` | DOS | `dos.png` |
| GB | `gb.png` | ScummVM | `scummvm.png` |
| NDS | `nds.png` | CPC | `cpc.png` |
| Virtual Boy | `virtual boy.png` | ZX Spectrum | `zx spectrum.png` |
| GameCube | `gamecube.png` | C64 | `c64.png` |
| Wii | `wii.png` | Amiga | `amiga.png` |
| Genesis | `genesis.png` | Vectrex | `vectrex.png` |
| Master System | `master system.png` | WonderSwan | `wonderswan.png` |
| Game Gear | `game gear.png` | 3DO | `3do.png` |
| SG-1000 | `sg-1000.png` | Atomiswave | `atomiswave.png` |
| Saturn | `saturn.png` | Atari 2600 | `atari 2600.png` |
| Sega CD | `sega cd.png` | Atari 7800 | `atari 7800.png` |
| 32X | `32x.png` | Jaguar | `jaguar.png` |
| PC Engine | `pc engine.png` | Lynx | `lynx.png` |
| PC-FX | `pc-fx.png` | | |

`Genesis` covers both a `genesis` and a `megadrive` folder name, `PS1` covers both `psx` and `ps1`, and `PC Engine` covers both `pcengine` and `pce` — each pair shares the one logo file for its shared label. Vespara also recognizes a number of fuller EmuMovies-style folder names (e.g. "Nintendo NES", "Sony PlayStation") as aliases for these same short names, so those resolve to the identical logo too — see `RA_SYSTEM_ALIASES` in `src/main/scanner.js` for the full alias list. N64, PS1, PS2, PSP, MAME, Arcade, and Dreamcast above are the same tabs (and same logo files) listed in the built-in table — a RetroArch folder with one of those names feeds the same tab as its dedicated emulator.

### Manual, per-system fetching

If you'd rather not use Auto-fill Everything:

- **Library tab:** rescan, bulk YouTube video fetch, filter by system.
- **Artwork tab:** SteamGridDB fetch, filterable by system.
- **Scraping tab (EmuMovies):** scan and review matches before importing.

### Bezels

The Bezels station fills bezel gaps in three passes: native MAME artwork from your own Bezel Source Folder (set in Game Paths — your own EmuMovies Sync or Hyperspin downloads; Vespara never fetches or redistributes bezel art itself), RetroArch-style overlays converted automatically from that same folder, then Vespara's own bundled placeholder art as a last resort. Existing artwork is never overwritten, and nothing installs until you preview and confirm.

---

## 8. Storage, Backups, Upgrades, and Uninstalling

**Legacy technical names.** Vespara's user-facing name changed from NuArcade, but several internal, technical identifiers were deliberately kept unchanged for compatibility with existing installs, and should not be renamed manually:

- The installed program is still `NuArcade.exe`.
- Your configuration and library data live under `%APPDATA%\NuArcade\`.
- The main configuration file is `nuarcade-config.json`.
- An internal event log is stored as `nuarcade-events.json`.

These names are intentional and stable across versions — do not rename these files or folders yourself, and don't be concerned that they say "NuArcade" rather than "Vespara."

**What survives an update.** In the validated 6.0.1 → 6.0.2 update, the existing library, settings, configured paths, profiles, artwork, and play history were all preserved after the update completed.

**What uninstalling does.** This has not been independently confirmed from source — whether uninstalling removes `%APPDATA%\NuArcade\` is not guaranteed either way by this manual. Treat it as unconfirmed rather than assuming your data will or won't be removed.

**Before uninstalling or making any major system change, back up:**

- `%APPDATA%\NuArcade\` (your configuration, profiles, and library data)
- your configured Media folder (artwork, videos, and any music you've added)

Copy both to an external drive or cloud folder before proceeding. This is the single most important habit in this manual — it costs a few minutes and protects everything else described here.

---

## 9. Updating Vespara

Vespara checks for an available update once per session. When an update is found, it downloads and installs **silently** — you won't see the installer wizard.

**After the update installs, Vespara may close and need to be reopened manually.** This was the observed behavior during the validated 6.0.1 → 6.0.2 update: the update installed successfully, the running app closed, and the user reopened it themselves from the desktop or Start Menu. Vespara does not promise or guarantee an automatic relaunch after an update — if it doesn't reopen on its own, just start it again the normal way.

---

## 10. Troubleshooting

**Games are missing after adding or changing a path.** Rescan from the Control Room's Systems Archive station, or restart Vespara. Setting a path alone does not refresh the library.

**The wrong emulator path is configured, or a game won't launch.** Re-check the emulator's install path in the Control Room's Emulators station, and the game folder in Game Paths.

**An emulator needs BIOS or firmware files.** Use BIOS Status (Control Room) for PCSX2, DuckStation, and Xemu. For any other emulator, check that emulator's own documentation for what it needs.

**A controller isn't detected.** Open the Control Room's Controllers station to test connected gamepads.

**Artwork or video is missing.** Try Auto-fill Everything from Media Manager's Library tab, or fetch manually per-system from the Artwork/Videos tabs.

**EmuMovies content was downloaded but isn't showing up in Vespara.** Downloading with EmuMovies Sync only places files on disk. You still need to click "Scan EmuMovies folder" in Media Manager's Scraping tab and import the results.

**An update isn't appearing.** Updates are checked once per session — restart Vespara to trigger a fresh check, or check the Control Room's Preferences station for current version/update status.

**Vespara didn't reopen on its own after an update.** Vespara may need to be reopened manually after an update — this occurred during the validated 6.0.1 → 6.0.2 update. Reopening it normally, from the desktop or Start Menu, is sufficient (see Chapter 9).

**Restoring from a backup.** If you backed up `%APPDATA%\NuArcade\` and your Media folder as recommended in Chapter 8, replace the current versions of those folders with your backup copies while Vespara is closed, then relaunch.

---

## 11. Keyboard and Controller Reference

Keyboard and controller behave differently on the Library screen — they are not two labels for the same input scheme, so both are listed in full below.

### Keyboard (Library)

| Key | Action |
|---|---|
| Left / Right Arrow | Move to previous / next game |
| Enter | Open the selected game's Archive View |
| Space | Launch the selected game |
| F | Toggle favorite |
| C | Open AI Game Coach |
| O | Open Operator Dashboard |
| N | Toggle Collections |
| T | Toggle Stats |
| A | Toggle Achievements |
| R | Jump to a random game |
| S | Toggle screenshot mode (hides UI chrome) |
| ? | Toggle help overlay |
| Backspace | Return to the Sanctuary |
| Esc | Close whatever's open, or go back |

### Controller (Library)

The Library's controller navigation moves between five distinct zones: the top menu (Home / Tools), the category tabs, the game wheel itself, the Launch button, and the bottom hint bar (Favorite / Coach / Operator). D-pad up/down moves between zones; left/right moves within the current zone; A confirms; B closes or backs out.

| Button | Action |
|---|---|
| D-pad Left/Right or Left Stick | Move within the current zone (games, tabs, or hint bar items) |
| D-pad Up/Down | Move between zones |
| A | Confirm / select the focused item |
| B | Close overlay, or back out |

### Sanctuary and Control Room

Both screens use the same pattern: D-pad/stick moves between focusable items, A confirms, B/Escape backs out or cancels. Sanctuary has two focus areas (Recently Played, and the four destinations); the Control Room has a header area (Return / Depart) and its station list.

### A note on unverified claims

Some older documentation claimed the AI Game Coach could be opened by holding the controller's A button. This manual does not repeat that claim — it could not be confirmed in the current source, so it has been left out rather than restated as fact.

---

## 12. Supported Systems

| System | Emulator |
|---|---|
| Arcade (TeknoParrot) | TeknoParrot |
| Arcade Classics | MAME |
| PlayStation 3 | RPCS3 |
| Xbox 360 | Xenia |
| GameCube / Wii | Dolphin |
| PlayStation 2 | PCSX2 |
| Nintendo Switch | Ryujinx |
| Nintendo 64 | Project64 |
| PlayStation 1 | DuckStation |
| Dreamcast / NAOMI | Flycast |
| Original Xbox | Xemu |
| Original Xbox (fallback for specific titles) | Cxbx-Reloaded |
| PlayStation Portable | PPSSPP |
| Wii U | Cemu |
| Sega Model 2 | Model 2 Emulator |
| Sega Model 3 | Supermodel |
| Pinball | Visual Pinball X |
| Steam | Launched via Steam |
| PC Games | Direct launch |
| NES, SNES, Genesis, GBA, and many other classic systems | RetroArch |

Original Xbox is intentionally listed twice: Xemu is the primary emulator, and Cxbx-Reloaded is kept as a fallback for specific titles that run better on it.

---

## 13. Version and Documentation Status

Verified against Vespara 6.0.2 on 2026-07-30.

If something in this manual doesn't match what you're seeing in the app, the in-app behavior is the source of truth — this manual should be re-verified against source and updated in the same change that bumps Vespara's version.
