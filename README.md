# NuArcade

A modern arcade cabinet frontend built for serious collectors and venue operators. NuArcade replaces HyperSpin and LaunchBox with a clean, fast, AI-powered experience built on Electron + React.

**Current version: v4.4.9**

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
3. Launch NuArcade -- the 8-step setup wizard opens automatically
4. Follow the wizard: download emulators, set paths, configure controllers, scan games, set up media
5. Your library populates automatically after the scan

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

### Main Wheel

| Button | Action |
|---|---|
| D-pad Up / Left Stick Up | Navigate up |
| D-pad Down / Left Stick Down | Navigate down |
| D-pad Left / LB | Previous category filter |
| D-pad Right / RB | Next category filter |
| A | Open game detail |
| B | Close overlay / go back |
| X | Toggle favorite |
| Y | Flip card (show game info on card back) |
| RT | Launch game |
| Select | Random game |
| Start | Settings |

### Setup Wizard

| Button | Action |
|---|---|
| A | Next step |
| B | Previous step |

---

## Media Setup

NuArcade supports two media sources:

### SteamGridDB (built-in, free)
Hero art and capsule images are fetched automatically from SteamGridDB. No setup needed -- just use the Get Media step in the wizard.

### EmuMovies Sync (recommended for video snaps)
1. Create a free account at [emumovies.com](https://emumovies.com)
2. Download EmuMovies Sync from the wizard (Step 7: Get Media)
3. Point EmuMovies Sync at `F:\Media\EmuMovies\[System Name]\`
4. EmuMovies Sync auto-renames files to match your ROMs

NuArcade creates all EmuMovies-compatible subfolders automatically on first launch:
`snap`, `title`, `background`, `banner`, `cabinet`, `marquee`, `logo`, `artwork_preview`, `controls`, `cp`, `icon`, `pcb`, `Video_MP4`, and more.

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

## Re-running the Setup Wizard

If you need to re-run setup after initial installation:

1. Open NuArcade
2. Click **Settings** in the top bar
3. Scroll to the bottom of Settings
4. Click **Re-run Setup Wizard**
5. NuArcade reloads into the wizard

This is useful after installing new emulators, moving your games folder, or after a major update.

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
