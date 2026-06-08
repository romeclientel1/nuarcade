# NuArcade

<div align="center">

**The ultimate arcade cabinet frontend for your game room PC**

[![Version](https://img.shields.io/badge/version-2.3.0-00ff88?style=flat-square)](https://github.com/romeclientel1/nuarcade)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue?style=flat-square)](https://github.com/romeclientel1/nuarcade)
[![Emulators](https://img.shields.io/badge/emulators-16-ff6600?style=flat-square)](https://github.com/romeclientel1/nuarcade)
[![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)](LICENSE)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?style=flat-square)](https://www.electronjs.org/)

**[Website](https://romeclientel1.github.io/nuarcade/) | Built by Rome Clientel**

</div>

---

## What is NuArcade?

NuArcade is a HyperSpin-style arcade cabinet frontend that unifies all your emulators into a single beautiful game wheel. One install. 16 emulators. Thousands of games. One interface.

Designed for dedicated arcade cabinet PCs running Windows 10/11. Guided setup wizard, auto folder creation, smart game scanning, live artwork fetching, and full gamepad support out of the box. No tinkering after setup. Just play.

---

## Supported Emulators (16)

| Emulator | System | Default Folder |
|----------|--------|----------------|
| **TeknoParrot** | Arcade (500+ modern arcade titles) | `F:\ArcadeGames\` |
| **MAME** | Arcade classics (10,000+ ROM titles) | `F:\MAME\roms\` |
| **Model 2 Emulator** | Sega Model 2 (Daytona USA, VF2, Sega Rally) | `F:\Model2Games\` |
| **Supermodel** | Sega Model 3 (Scud Race, VF3, Star Wars Trilogy) | `F:\Model3Games\` |
| **RetroArch** | NES, SNES, Genesis, GBA, N64, PS1 + 50 more systems | `F:\RetroArchGames\` |
| **Project64** | Nintendo 64 (GoldenEye, Zelda OOT, Smash Bros.) | `F:\N64Games\` |
| **DuckStation** | PlayStation 1 (Crash, FFVII, Metal Gear Solid) | `F:\PS1Games\` |
| **Flycast** | Sega Dreamcast / NAOMI arcade | `F:\DreamcastGames\` |
| **PPSSPP** | PlayStation Portable | `F:\PSPGames\` |
| **PCSX2** | PlayStation 2 | `F:\PS2Games\` |
| **RPCS3** | PlayStation 3 | `F:\PS3Games\` |
| **Xenia** | Xbox 360 | `F:\Xbox360Games\` |
| **Dolphin** | GameCube / Wii | `F:\GCWiiGames\` |
| **Cemu** | Wii U (Mario Kart 8, Zelda BOTW, Splatoon) | `F:\WiiUGames\` |
| **Ryujinx** | Nintendo Switch | `F:\SwitchGames\` |
| **Visual Pinball X** | Pinball tables (.vpx) | `F:\PinballTables\` |

---

## Features

### Library & Navigation
- **HyperSpin-style wheel** - perspective carousel with real arcade artwork
- **22 genre filter categories** - Arcade, Retro, Racing, Fighting, N64, PS1, Dreamcast, and more
- **Fuzzy search** - multi-term AND logic, searches title + system + ROM name
- **Sort options** - Default, Most Played, Top Rated, Recently Added, Name A-Z, System, Status
- **Favorites, Recently Played** - full library management
- **Collections** - create named lists (e.g. "2-Player Games", "Kids Picks", "Cabinet Favorites")
- **Random game picker** - keyboard R, gamepad X button, or toolbar button
- **Empty state guide** - first-run screen with step-by-step instructions and folder list

### Artwork
- **SteamGridDB integration** - hero images, capsule art, logos for modern titles
- **ScreenScraper integration** - retro and arcade artwork (MAME, NES, SNES, Genesis, N64, PS1, DC...)
- **Generated placeholder art** - unique styled card per game when no artwork is found (never a blank card)
- **Bulk artwork manager** - fetch art for all games at once with dual-source fallback
- **Marquee display** - second monitor shows current game artwork + title, auto-updates on navigation

### Game Detail & Ratings
- **Game Detail view** - artwork, system info, playtime, per-game controller override
- **Star ratings** - 1-5 stars per game, shown as indicator on wheel card
- **Personal notes** - auto-saved notes per game, preview shown on center card
- **Playtime tracking** - total session time per game

### Setup & Configuration
- **Setup wizard** - guided 7-step setup with auto-configuration
- **Auto folder creation** - full F: drive structure created on first run
- **Emulator setup guide** - built-in install instructions + download buttons for all 16 emulators
- **BIOS checker** - live disk scan detects missing BIOS files, shows exact filenames and folder paths
- **Emulator enable/disable toggles** - hide emulators you haven't installed
- **Smart game scanner** - auto-detects all games across all emulators on rescan
- **Per-emulator rescan breakdown** - shows game count per emulator after scan

### Cabinet & Controls
- **Full gamepad support** - D-pad/stick navigation, LB/RB category scrolling, A/B/X/Y/Start all mapped
- **Cabinet mode** - fullscreen, cursor hidden, gamepad-first
- **Attract mode** - INSERT COIN screensaver with game cycling
- **Auto-launch last played** - optional setting to resume the last game on startup
- **Controller mapping** - wheel, lightgun, or gamepad assigned by genre automatically
- **Marquee second monitor** - dedicated display for current game art

### Settings & Maintenance
- **Full backup/restore** - one JSON file covers config, favorites, ratings, notes, artwork, playtime, collections
- **Windows Defender exclusions** - auto-added for all emulator folders
- **Theme colors** - multiple accent color themes
- **CRT effect** - optional scanline overlay
- **Attract mode timeout** - configurable idle timer
- **Media Manager** - YouTube search + yt-dlp video snap download per game

---

## Requirements

- Windows 10 or 11 (64-bit)
- Each emulator installed separately (NuArcade's Setup Guide walks you through each one)
- F: drive or USB drive (256GB+ recommended for a full library)

---

## Installation

1. Download the latest installer from [GitHub Actions](https://github.com/romeclientel1/nuarcade/actions) → most recent **Build NuArcade** run → **NuArcade-Windows-Installer** artifact
2. Run `NuArcade-Windows-Installer.exe`
3. Complete the setup wizard (auto-creates your full folder structure)
4. Install the emulators you want (wizard has download links and step-by-step instructions)
5. Drop your games into the matching F: drive folders
6. Hit **Settings → Rescan** and your library populates automatically

---

## Folder Structure

NuArcade auto-creates this layout during wizard setup:

```
F:\
├── TeknoParrot\        # TeknoParrot install
├── ArcadeGames\        # TeknoParrot game folders
├── MAME\
│   └── roms\           # MAME ROM zips
├── Model2\             # Model 2 Emulator install
├── Model2Games\        # Model 2 ROM zips
├── Supermodel\         # Supermodel (Model 3) install
├── Model3Games\        # Model 3 ROM zips
├── RetroArch\          # RetroArch install
├── RetroArchGames\
│   ├── NES\
│   ├── SNES\
│   ├── Genesis\
│   ├── GBA\
│   ├── N64\
│   └── PS1\
├── Project64\          # Project64 install
├── N64Games\           # N64 ROM files (.z64 .n64 .v64)
├── DuckStation\        # DuckStation install
├── PS1Games\           # PS1 disc images (.bin/.cue .iso .chd)
├── Flycast\            # Flycast install
│   └── data\           # Dreamcast BIOS (dc_boot.bin)
├── DreamcastGames\     # Dreamcast GDI / CDI / CHD files
├── PPSSPP\             # PPSSPP install
├── PSPGames\           # PSP ISO / CSO files
├── PCSX2\
│   └── bios\           # PS2 BIOS files (required)
├── PS2Games\           # PS2 ISO / CHD files
├── RPCS3\              # RPCS3 install
├── PS3Games\           # PS3 game folders
├── Xenia\              # Xenia install
├── Xbox360Games\       # Xbox 360 ISO / XEX files
├── Dolphin\            # Dolphin install
├── GCWiiGames\         # GameCube / Wii ISOs or RVZ files
├── Cemu\               # Cemu install
├── WiiUGames\          # Wii U game folders (code/*.rpx) or .wud/.wux
├── Ryujinx\
│   └── system\         # prod.keys (required)
├── SwitchGames\        # Switch NSP / XCI files
├── vPinball\           # Visual Pinball X install
├── PinballTables\      # VPX table files
├── NuArcade\           # NuArcade install
└── Media\
    ├── Videos\         # Downloaded video snaps
    └── Artwork\        # Cached artwork
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Left / Right` | Navigate wheel |
| `Enter` | Open game detail |
| `Space` | Quick launch (skip detail) |
| `Escape` | Close / go back |
| `F` | Toggle favorite |
| `R` | Random game |
| `N` | Open Collections |
| `C` | Toggle cabinet mode |
| `S` | Screenshot mode |
| `?` | Help screen |

## Gamepad Controls

| Button | Action |
|--------|--------|
| D-pad / Left stick | Navigate wheel |
| **LB / RB** | Scroll category filter left / right |
| A | Open game detail |
| B | Back |
| X | Random game |
| Y | Toggle favorite |
| Start | Open Settings |

---

## Artwork Setup

NuArcade pulls artwork from two sources automatically:

**SteamGridDB** (modern titles — PS3, Xbox 360, Switch, PS2, GC/Wii)
- Free API key at [steamgriddb.com/profile/preferences](https://www.steamgriddb.com/profile/preferences)
- Add your key in Settings → SteamGridDB API Key

**ScreenScraper** (retro and arcade — MAME, NES, SNES, Genesis, N64, PS1, Dreamcast...)
- Free account at [screenscraper.fr](https://www.screenscraper.fr)
- Add your username/password in Settings → Artwork

Once credentials are set, open **Settings → Open Artwork Manager** to bulk-fetch art for your entire library.

---

## Development

```bash
git clone https://github.com/romeclientel1/nuarcade.git
cd nuarcade
npm install
cd renderer && npm install && cd ..
npm run dev
```

### Build Windows installer

Trigger the GitHub Actions workflow manually from the [Actions tab](https://github.com/romeclientel1/nuarcade/actions), or run locally:

```bash
cd renderer && npm run build && cd ..
npx electron-builder --win --publish never
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron |
| UI framework | React + Vite |
| Styling | CSS Modules |
| Packaging | electron-builder |
| Video snaps | yt-dlp |
| Artwork | SteamGridDB API + ScreenScraper API |
| CI/CD | GitHub Actions (Windows build) |

---

## License

MIT — free forever.

---

*Built by Rome Clientel*
