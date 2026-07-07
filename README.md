# NuArcade

A modern arcade cabinet frontend built for serious collectors and venue operators. NuArcade replaces HyperSpin and LaunchBox with a clean, fast, AI-powered experience built on Electron + React.

**Current version: v4.32.1**

---

## What it does

NuArcade is an Electron-based game launcher that manages your entire arcade library from a single interface. Navigate a curved 3D arc wheel, watch gameplay videos play behind the cards, launch games across 17+ emulators, and get instant AI coaching on any game -- all from a controller.

---

## Supported Systems

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
| PlayStation Portable | PPSSPP |
| Wii U | Cemu |
| Sega Model 2 | Model 2 Emulator |
| Sega Model 3 | Supermodel |
| Pinball | Visual Pinball X |
| Steam | Steam |
| PC Games | Direct launch |
| NES, SNES, N64, GBA, GBC, GB, NDS | RetroArch |
| Genesis, Saturn, Sega CD, 32X, Master System, Game Gear | RetroArch |
| PlayStation 1, PSP, Dreamcast | RetroArch |
| Neo Geo, PC Engine, Atari, Amiga, C64, DOS, ScummVM + more | RetroArch |

RetroArch games are organized by system subfolder -- only systems with ROMs present appear in your library.

---

## Installation

### Requirements
- Windows 10 or 11 (64-bit)
- Games stored on F:\ drive (recommended) or a path you configure
- Emulators installed separately (NuArcade links to them, it does not include ROMs or emulator binaries)

### Steps

1. Download the latest installer from [Releases](https://github.com/romeclientel1/nuarcade/releases)
2. Run `NuArcade-Setup-X.X.X.exe` -- the NSIS installer handles everything
3. Launch NuArcade -- it opens straight to the main wheel
4. Open **Settings** to point NuArcade at your emulators and game folders, configure controllers, and set up media sources
5. Use **Rescan** in Settings (or restart) after configuring paths to populate your library

### Default folder layout

NuArcade expects this structure on first launch (auto-created):

```
F:\
  ArcadeGames\          TeknoParrot games
  MAME\roms\            MAME ROMs
  PS3Games\             RPCS3 games
  Xbox360Games\         Xenia games
  GCWiiGames\           Dolphin games
  PS2Games\             PCSX2 games
  SwitchGames\          Ryubing games
  PS1Games\             DuckStation games
  DreamcastGames\       Flycast games
  PSPGames\             PPSSPP games
  WiiUGames\            Cemu games
  Model2Games\          Model 2 games
  Model3Games\          Model 3 games
  RetroArch\roms\       RetroArch ROMs (one subfolder per system)
    nes\
    snes\
    n64\
    gba\
    genesis\
    saturn\
    psx\
    ... (36 system folders auto-created)
  Media\                Artwork and videos (auto-created)
    Music\
    MAME\, TeknoParrot\, RPCS3\, ... (per-system art folders)
    EmuMovies\          EmuMovies Sync compatible folders
```

---

## Xbox Controller Mapping

NuArcade is fully playable with an Xbox controller. Plug it in before launching.

### INSERT COIN Screen

| Button | Action |
|---|---|
| D-pad Up | Move focus to EXIT button |
| D-pad Down | Move focus down (wraps from EXIT back to profiles) |
| D-pad Left / Right | Cycle between profiles, New Player, Play as Guest |
| A | Select focused item (profile, New Player, Guest, or EXIT) |
| B | Quick shortcut to Play as Guest |
| A on EXIT (x2) | First press shows CONFIRM, second press exits app |

### Main Wheel

| Button | Action |
|---|---|
| D-pad Left / Left Stick Left | Previous game |
| D-pad Right / Left Stick Right | Next game |
| D-pad Up | Previous system tab |
| D-pad Down | Next system tab |
| A | Open game detail screen |
| B | Close overlay / go back |
| Start | Open Settings |
| Select | Open Search |

### Game Detail Screen

| Button | Action |
|---|---|
| A | Launch the game |
| B | Close detail, return to wheel |

---

## Media Setup

NuArcade supports two media sources:

### SteamGridDB (built-in, free)
Hero art and capsule images are fetched automatically from SteamGridDB. Configure your API key in Settings -- no other setup needed.

### EmuMovies Sync (recommended for video snaps and box art)
1. Create an account at [emumovies.com](https://emumovies.com) -- a free account works, a supporting/lifetime membership unlocks video content
2. Download the official EmuMovies Sync desktop app from their site
3. In NuArcade, open **Media > EmuMovies tab > "Create folder structure"** -- this builds one folder per emulator NuArcade supports (matching the Emulators grid in Settings, minus RetroArch, since RetroArch spans many systems rather than being one itself)
4. Point EmuMovies Sync's destination folder at the specific emulator folder for whatever you're downloading (e.g. point it at `Xenia` when downloading Xbox 360 content)
5. In Sync, select the matching system from its own dropdown and run the download -- Sync creates its own system-named subfolder inside whatever folder you pointed it at
6. Back in NuArcade, click **"Scan EmuMovies folder"** -- it finds media regardless of whether Sync nested it directly or one level inside a per-emulator wrapper folder, and shows you a review list before anything imports

> **Step 6 is required, not automatic.** Downloading media with EmuMovies Sync only puts files on disk -- it doesn't do anything inside NuArcade by itself. Nothing shows up on the wheel until you go back into **Media > EmuMovies tab** and click "Scan EmuMovies folder" (then import from the results). It's easy to assume the videos and box art will "just work" once Sync finishes downloading -- they won't, until this step runs.

Each emulator folder gets a `README.txt` explaining what system(s) it plays and which EmuMovies system name to select -- see the table below for the full reference.

The real EmuMovies subfolder names (as of Sync v2.71): `Snap`, `Title`, `Background`, `Box`, `Box_25D`, `Box_3D`, `Box_Full`, `Box_Spine`, `BoxBack`, `Cart`, `Logos`, `Manual`, `System_Logo`, `Video_MP4`, `Video_MP4_HD`, `Video_MP4_HI_QUAL`, `Video_AVI`, `Video_AVI_HD`, `Video_AVI_HI_QUAL`. NuArcade's scanner prefers the highest available video quality tier automatically.

### Emulator to EmuMovies system mapping

Verified directly against EmuMovies Sync's own system dropdown (v2.71) -- these are the exact names to select in Sync for each NuArcade emulator.

| NuArcade emulator | Select this system in EmuMovies Sync |
|---|---|
| RPCS3 | Sony PlayStation 3 |
| Xenia | Microsoft Xbox 360 |
| Dolphin | Nintendo GameCube, Nintendo Wii |
| PCSX2 | Sony Playstation 2 |
| Ryubing | Nintendo Switch |
| MAME | MAME |
| Project64 | Nintendo N64 |
| DuckStation | Sony Playstation (PS1) |
| Flycast | Sega Dreamcast, Sega Naomi, Sammy Atomiswave |
| Model 2 Emulator | Sega Model 2 |
| Supermodel (M3) | Sega Model 3 |
| PPSSPP | Sony PSP |
| Cemu | Nintendo Wii U |
| Visual Pinball X | Visual Pinball (EmuMovies drops the "X") |

### A note on TeknoParrot

TeknoParrot isn't one system -- it runs many different arcade hardware platforms (SEGA Lindbergh, RingEdge, RingWide, ALL.Net/NU/ALLS, Namco System 357/369/ES-series, Taito Type X, and more). Checked against EmuMovies' own system list: **most of that hardware is not in EmuMovies' catalog at all.** That covers the bulk of TeknoParrot's library -- Initial D, Wangan Midnight, Mario Kart Arcade GP, House of the Dead, most racing and lightgun titles run on hardware EmuMovies simply doesn't have media for, regardless of which category you pick.

The one confirmed real match: select **Konami e-AMUSEMENT** in Sync for any Konami/Bemani-adjacent titles in your TeknoParrot library.

For everything else in TeknoParrot, use NuArcade's own YouTube video pipeline instead (**Media > Library tab**, "Find video" per game) -- it has real coverage for popular arcade titles that EmuMovies does not.

### System Logos (optional)

The category pills above your wheel can show a real system logo instead of plain text, once you add your own images.

1. Drop image files into `<your Media folder>\SystemLogos\` -- created automatically the first time this runs
2. Name each file to match the category exactly (lowercase, no spaces): `xbox360.png`, `ps1.png`, `ps2.png`, `dreamcast.png`, `n64.png`, `switch.png`, `wiiu.png`, `gcwii.png`, `pinball.png`, etc. -- `.png`, `.jpg`, `.jpeg`, `.webp`, and `.svg` all work
3. Restart NuArcade (same as any config/media change)

Any category without a matching logo just keeps showing its text label, so this can be done incrementally. NuArcade doesn't ship or generate any logo images itself -- since official console logos are trademarked, you'll need to source your own (fan art, icon packs, or your own designs all work).

---

## Features

### Arc Wheel
- Cards fan out on a curved arc across the full screen width
- Velocity-based momentum -- hold a direction to accelerate, release to coast
- Elastic overshoot -- wheel snaps with a satisfying spring feel
- System color-coded cards -- each emulator has its own color identity
- Card flip -- press Y or tap the center card to flip it and see game details on the back
- Background video crossfade per game
- Card shine sweep animation on selection

### AI Game Coach
- Press C (or hold A on controller) to open the coach for any game
- Powered by Claude via Railway proxy
- Gives move lists, tips, strategies, and combos
- Natural language search -- type what you want to play

### Operator Dashboard
- Press O to open the operator view
- 35-day activity heat map, playtime totals, system breakdown
- Launch counts and per-game stats

### Player Profiles
- INSERT COIN screen on boot
- Per-player playtime, game history, favorites, and ratings
- Switch players mid-session

### High Score Board
- Press H to view and log high scores per game
- Tracks initials, score, and date

### Controller Hints
- 2-second overlay on game launch showing the correct controller layout
- Covers TeknoParrot, MAME, Model 2, and Model 3

### Collections
- Press N to manage collections
- Group games into custom lists

### Auto-Updater
- Checks GitHub releases every 6 hours
- One-click download and silent install
- Progress bar shows download status

---

## Keyboard Shortcuts (Main Wheel)

| Key | Action |
|---|---|
| Arrow Up / W | Navigate up |
| Arrow Down / S | Navigate down |
| Enter / Space | Launch game |
| D | Open game detail |
| F | Toggle favorite |
| H | High score board |
| C | AI Game Coach |
| N | Collections |
| T | Stats |
| O | Operator dashboard |
| Tab | Flip center card |
| Esc | Back / close overlay |
| Ctrl+W | Quit |

---

## Folder Schema Versioning

NuArcade tracks which version of the media/ROM folder structure has been created on your cabinet. When a new version introduces new system support, folders are automatically created on next launch without any manual steps.

---

## Development

Built with Electron 31 + React + Vite. Railway proxy handles AI features.

```
git clone https://github.com/romeclientel1/nuarcade
cd nuarcade
npm install
npm run dev
```

Build (Windows NSIS installer via GitHub Actions):

```
# Push to main -- GitHub Actions builds NuArcade-Setup-X.X.X.exe automatically
# Or trigger manually: Actions > Build NuArcade > Run workflow
```

---

## License

MIT
