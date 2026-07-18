# NuArcade User Manual

This manual covers everything from a guest walking up to your cabinet, to configuring emulator paths and media sources as the owner. If you only need the basics, read the Quick Start below and stop there.

---

## Quick Start (For Guests)

You don't need to know anything about setup to play. Here's all of it:

1. **Turn on the cabinet.** NuArcade opens straight to a player-select screen.
2. **Pick a player, or just tap "Play as Guest."** No account needed for guests.
3. **Browse games.** Move left/right on the D-pad or left stick to spin through the wheel. Move up/down to switch between systems (Arcade, PS1, Xbox 360, etc.) shown as tabs above the wheel.
4. **Press A** on the game you want to see more info, or just **press A twice** (or hold) to launch it directly, depending on what's set up.
5. **To exit a game and come back to the wheel**, use the emulator's own exit combo (varies by game/emulator -- ask the owner if unsure).
6. **Press B** to back out of any menu or screen.

That's genuinely all you need. Everything below is for the owner.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Player Profiles](#2-player-profiles)
3. [Navigating the Wheel](#3-navigating-the-wheel)
4. [Controls Reference](#4-controls-reference)
5. [Setting Up Emulators](#5-setting-up-emulators)
6. [Media & Artwork](#6-media--artwork)
7. [Features](#7-features)
8. [Settings Reference](#8-settings-reference)
9. [Troubleshooting](#9-troubleshooting)
10. [Keeping NuArcade Updated](#10-keeping-nuarcade-updated)

---

## 1. Getting Started

### Requirements
- Windows 10 or 11 (64-bit)
- Games stored on a drive you control (F:\ is the default NuArcade expects, but any path works once configured)
- Emulators installed separately -- NuArcade launches them, it doesn't include ROMs or emulator software

### First Launch
1. Download and run the installer from [Releases](https://github.com/romeclientel1/nuarcade/releases)
2. Launch NuArcade -- it opens to the wheel with an empty or default library
3. Open **Settings** (Start button on controller, or the Settings icon in the top bar) to point NuArcade at your emulators and game folders
4. After changing any paths, use **Rescan** in Settings (or restart the app) to actually pick up the changes -- setting a path alone doesn't refresh the library automatically

### Default Folder Layout
NuArcade auto-creates this structure on first launch if it doesn't exist:

```
F:\
  ArcadeGames\          TeknoParrot games
  MAME\roms\            MAME ROMs
  PS3Games\             RPCS3 games
  Xbox360Games\         Xenia games
  GCWiiGames\           Dolphin games
  PS2Games\             PCSX2 games
  SwitchGames\          Ryubing (Ryujinx fork) games
  PS1Games\             DuckStation games
  DreamcastGames\       Flycast games
  XboxGames\            Xemu / Cxbx-Reloaded games (.iso for Xemu, extracted folders with a .xbe for Cxbx-Reloaded)
  PSPGames\             PPSSPP games
  WiiUGames\            Cemu games
  Model2Games\          Model 2 games
  Model3Games\          Model 3 games
  RetroArchGames\       One folder per system, ROM files directly inside:
    nes\
    snes\
    genesis\
    psx\
    ... (many more, auto-created)
  Media\                Artwork, videos, music (auto-created)
    Music\              Drop .mp3 files here for background music
    SystemLogos\        Your own logo images for the category strip
    EmuMovies\          EmuMovies Sync compatible folders
```

**Important for RetroArch specifically:** unlike every other emulator in NuArcade, RetroArch doesn't use one folder per game. It uses one folder per *system* (like `nes`, `snes`, `genesis`), with ROM files sitting directly inside that folder. If you put individual game folders at the top level instead, NuArcade will misread them as unrecognized "systems" and won't find anything.

---

## 2. Player Profiles

- NuArcade shows a player-select screen on boot
- Create a new profile, pick an existing one, or play as guest
- Each profile tracks its own playtime, favorites, and game history separately
- Switch players mid-session from the top bar (the button showing your current initials)

---

## 3. Navigating the Wheel

- Games fan out on a curved arc across the screen. The center card is your current selection.
- **Category tabs** above the wheel filter by system (Arcade, MAME, PS1, Xbox 360, RetroArch, etc.) -- only categories that actually have games in them show up
- **Sort options** (accessible from the top bar) let you reorder by most played, most launched, recently added, top rated, or system
- Each card shows box art with a dark gradient at the bottom for the title -- press or select a card to see full details before launching
- A background video plays behind the selected game if one's available, muted or at your configured ambient volume

---

## 4. Controls Reference

### Keyboard (verified against the actual code, not assumed)

| Key | Action |
|---|---|
| Left / Right Arrow | Move to previous / next game |
| Enter | Open game detail view |
| Space | Launch the selected game |
| F | Toggle favorite |
| C | Open AI Game Coach |
| O | Open Operator Dashboard |
| N | Toggle Collections |
| T | Toggle Stats |
| A | Toggle Achievements |
| R | Jump to a random game |
| S | Toggle screenshot mode (hides UI chrome for clean screenshots) |
| ? | Toggle help overlay |
| Esc | Close whatever's open / go back |

### Xbox Controller

**INSERT COIN Screen**

| Button | Action |
|---|---|
| D-pad Left / Right | Cycle between profiles, New Player, Play as Guest |
| A | Select the focused item |
| B | Quick shortcut to Play as Guest |

**Main Wheel**

| Button | Action |
|---|---|
| D-pad Left/Right or Left Stick | Previous / next game |
| D-pad Up/Down | Switch category tab |
| A | Open game detail screen |
| B | Close overlay / go back |
| Start | Open Settings |

**Top bar (controller-navigable):** Sort, Random, Collections, Stats, Achievements, Switch Player, Media Manager, Settings, Help, Exit -- cycle through these with the shoulder buttons or D-pad depending on focus zone, select with A.

**Bottom hint bar:** Favorite, AI Coach, Operator Dashboard -- same navigation pattern as the top bar.

---

## 5. Setting Up Emulators

Open **Settings > Emulators** to point NuArcade at each emulator's install folder, and **Settings > Paths** for each system's game folder.

Every scanner needs both pieces: where the *emulator* lives, and where the *games* live. After changing paths, click **Rescan** (in Settings) or restart the app -- the library only refreshes on one of those two actions.

### Supported Systems

| System | Emulator |
|---|---|
| Arcade (TeknoParrot) | TeknoParrot |
| Arcade Classics | MAME |
| PlayStation 3 | RPCS3 |
| Xbox 360 | Xenia |
| GameCube / Wii | Dolphin |
| PlayStation 2 | PCSX2 |
| Nintendo Switch | Ryubing (Ryujinx fork) |
| PlayStation 1 | DuckStation |
| Dreamcast / NAOMI | Flycast |
| Original Xbox | Xemu / Cxbx-Reloaded |
| PlayStation Portable | PPSSPP |
| Wii U | Cemu |
| Sega Model 2 | Model 2 Emulator |
| Sega Model 3 | Supermodel |
| Pinball | Visual Pinball X |
| Steam | Steam |
| PC Games | Direct launch |
| NES, SNES, N64, GBA, GBC, GB, NDS, Genesis, Saturn, Sega CD, 32X, Master System, Game Gear, PS1, PSP, Dreamcast, Neo Geo, PC Engine, Atari, Amiga, C64, DOS, ScummVM + more | RetroArch |

### TeknoParrot Folder Renamer

Settings includes a tool to bulk-rename TeknoParrot game folders to match a cleaner naming convention -- useful if your folder names don't match what NuArcade expects for title matching against EmuMovies or SteamGridDB.

### BIOS Status

Settings shows a live check of which emulators are missing required BIOS files, so you can spot compatibility issues before a game fails to launch.

---

## 6. Media & Artwork

NuArcade pulls artwork and video from two sources: **SteamGridDB** (automatic, built-in) and **EmuMovies Sync** (better quality, requires manual setup). You can also fetch gameplay videos directly from YouTube.

### The Fast Path: Auto-fill Everything

If you don't want to think about any of this, open **Media Manager > Library tab** and click **"Auto-fill Everything."** It runs a priority chain automatically:
1. Scans and imports every EmuMovies match first (best quality, if you've set up EmuMovies Sync)
2. SteamGridDB fills in artwork for anything EmuMovies didn't cover
3. YouTube fills in gameplay video for anything still missing

Click it again while it's running to cancel. On large libraries this can take a while -- it shows live progress ("Importing 1,847 / 3,100...") so you can tell it's actually working rather than stuck.

### SteamGridDB (automatic, free)
Add your API key in Settings and it fetches hero art and capsule images automatically. No other setup needed.

### EmuMovies Sync (better quality video and box art)
1. Create a free account at [emumovies.com](https://emumovies.com) -- a paid membership unlocks video content
2. Download the EmuMovies Sync desktop app from their site
3. In NuArcade, go to **Media > EmuMovies tab > "Create folder structure"** -- builds one folder per emulator
4. Point Sync's destination folder at the specific emulator folder you're downloading for (e.g. point it at the `Xenia` folder for Xbox 360 content)
5. In Sync, select the matching system and run the download
6. **Back in NuArcade, click "Scan EmuMovies folder"** -- this step is required. Downloading with Sync only puts files on disk; nothing appears in NuArcade until you scan and import
7. Review the matches, then **Import All** (or import individually)

Each auto-created emulator folder includes a README.txt telling you exactly which system to select in Sync.

**A note on TeknoParrot:** it covers many different arcade hardware platforms, and most of that hardware isn't in EmuMovies' catalog at all. The one confirmed match is **Konami e-AMUSEMENT** for Konami/Bemani-adjacent titles. For everything else in TeknoParrot, use NuArcade's own YouTube pipeline instead (**Media > Library tab**, per-game video fetch).

### System Logos
Category tabs can show a real logo instead of plain text:
1. Drop image files into `<your Media folder>\SystemLogos\`
2. Name each file to exactly match the category, lowercase, no spaces: `xbox360.png`, `ps1.png`, `arcade.png`, `retroarch.png`, etc. (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg` all work)
3. Restart NuArcade

Categories without a matching logo just keep showing text, so this can be done gradually. NuArcade doesn't ship logo images itself since official console logos are trademarked -- source your own.

### Manual Fetching (Media Manager)
If you'd rather control things per-system instead of running Auto-fill Everything:
- **Library tab:** rescan, bulk YouTube video fetch (2 concurrent downloads by default), filter by system
- **Artwork tab:** SteamGridDB fetch, filter by system so you can target just one platform at a time
- **EmuMovies tab:** scan and review matches before importing, with a live diagnostic log visible from any tab

---

## 7. Features

### AI Game Coach
Press **C** (or the Coach button on the hint bar) on any game to open the coach. Gives move lists, tips, strategies, and combos. Also supports natural-language search -- type what you want to play instead of browsing.

### Operator Dashboard
Press **O** to open. Shows a 35-day activity heat map, playtime totals, system breakdown, and per-game launch counts.

### Collections
Press **N** to manage. Group games into custom lists of your own.

### Stats
Press **T** to view play statistics.

### Achievements
Press **A** to view.

### Attract Mode
When the cabinet sits idle, it automatically cycles through games to draw attention. Configurable in Settings: idle timeout before it kicks in, cycle speed, and whether it prefers games with artwork.

### CRT Effect & Themes
Settings lets you toggle a CRT scanline overlay and pick an accent theme color for the whole UI. Both persist across restarts.

### Background Music
Drop .mp3 files into `F:\Media\Music\` and NuArcade shuffles them while you browse. Music fades automatically when a gameplay preview video is playing. Click the Now Playing badge to skip tracks.

### Pixelcade Integration
If you have a Pixelcade LED marquee device, enable it in Settings and enter its IP and port. It receives game art automatically as you navigate and launch games.

### Controller Hints
A brief overlay shows the correct controller layout when launching certain games, covering TeknoParrot, MAME, Model 2, and Model 3 titles.

---

## 8. Settings Reference

| Section | What it controls |
|---|---|
| Emulators | Install paths for each emulator |
| Paths | Game folder locations for each system |
| TeknoParrot Folder Renamer | Bulk-rename tool for TeknoParrot game folders |
| Display | CRT effect toggle |
| Theme color | Accent color for the whole UI |
| Audio | Gameplay video volume |
| Card art type | What shows on wheel cards -- snap, box art, SteamGridDB art, or none |
| Background music | On/off, volume, and where to drop music files |
| Attract mode | Idle timeout, cycle speed, artwork preference |
| Pixelcade | Enable, IP address, port |
| Links | Quick links to emulator downloads and related sites |
| Artwork | SteamGridDB API key and related settings |
| Library | Rescan, orphaned media cleanup, and library maintenance tools |
| BIOS Status | Live check for missing required BIOS files per emulator |
| About | Current version and update status |

---

## 9. Troubleshooting

**Newly downloaded EmuMovies media isn't showing up.** You still need to click "Scan EmuMovies folder" and import the results -- downloading with Sync alone doesn't do anything inside NuArcade.

**I changed a path in Settings but nothing changed.** Click Rescan or restart the app. Changing a path alone doesn't refresh the library.

**RetroArch games aren't being found.** Confirm your structure is one folder per *system* (`nes`, `snes`, `genesis`) with ROM files directly inside -- not individual game folders. Also confirm you've restarted after adding files.

**Artwork looks stale or doesn't match what I just imported.** Restart the app. Some artwork changes require a fresh session to fully refresh.

**A game says the file wasn't found.** The drive may be offline, or the file was moved/renamed since the last scan. Rescan after confirming the file exists at the expected path.

**Sound from a game preview keeps playing after I launch a game.** This was a real bug, fixed in v5.0.1 and later -- if you're on an older version, update.

---

## 10. Keeping NuArcade Updated

An amber "UPDATE" badge appears in the top bar of the main wheel whenever a new version is available -- click it to go to the download page. The same status is also shown in **Settings > About**. NuArcade checks for updates once per session; there's no background polling or silent auto-install -- you'll always need to download and run the new installer yourself.

---

*This manual reflects NuArcade v5.0.1. Some details may drift from the app as new versions ship -- if something here doesn't match what you're seeing, the in-app behavior is the source of truth.*
