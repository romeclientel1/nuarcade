# NuArcade

<div align="center">

**The ultimate arcade cabinet frontend for your game room PC**

[![Version](https://img.shields.io/badge/version-1.2.0-00ff88?style=flat-square)](https://github.com/romeclientel1/nuarcade)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue?style=flat-square)](https://github.com/romeclientel1/nuarcade)
[![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)](LICENSE)
[![Electron](https://img.shields.io/badge/built%20with-Electron-47848F?style=flat-square)](https://www.electronjs.org/)

**[Website](https://romeclientel1.github.io/nuarcade/) | Built by Rome Clientel**

</div>

---

## What is NuArcade?

NuArcade is a HyperSpin-style arcade cabinet frontend that replaces the default emulator UIs with a beautiful, unified game wheel. One install, all your emulators, all your games, one interface.

Designed for dedicated arcade cabinet PCs running Windows 10/11. No tinkering after setup. Just play.

---

## Supported Emulators

| Emulator | System | Games Folder |
|----------|--------|--------------|
| **TeknoParrot** | Arcade (500+ titles) | F:\ArcadeGames\ |
| **RPCS3** | PlayStation 3 | F:\PS3Games\ |
| **Xenia** | Xbox 360 | F:\Xbox360Games\ |
| **Dolphin** | GameCube / Wii | F:\GCWiiGames\ |
| **PCSX2** | PlayStation 2 | F:\PS2Games\ |
| **Ryujinx** | Nintendo Switch | F:\SwitchGames\ |
| **Visual Pinball X** | Pinball Tables | F:\PinballTables\ |

---

## Features

- **HyperSpin-style wheel** - perspective carousel with real arcade artwork
- **7-emulator support** - TeknoParrot, RPCS3, Xenia, Dolphin, PCSX2, Ryujinx, VPX
- **Setup wizard** - 7-step guided setup with auto-configuration
- **Auto folder creation** - all F: drive folders created automatically on first run
- **Emulator setup guide** - built-in install instructions with download links for every emulator
- **Smart game scanner** - auto-detects all games across all emulators on rescan
- **Genre categories** - Racing, Fighting, Shooter, Rhythm, Flying, PS3, Xbox360, GCWii, PS2, Switch, Pinball
- **Smart controller mapping** - wheel, lightgun, or gamepad assigned by genre automatically
- **Media Manager** - YouTube search + yt-dlp video snap download per game
- **Attract mode** - INSERT COIN screensaver with animated logo
- **Search, Favorites, Recently Played** - full library management
- **Game Detail view** - artwork, system info, per-game controller override
- **Windows Defender exclusions** - auto-added for all emulator folders
- **Cabinet mode** - fullscreen, cursor hidden, gamepad-first navigation

---

## Requirements

- Windows 10 or 11 (64-bit)
- Each emulator installed separately (see Setup Guide in the wizard)
- F: drive or USB drive (256GB+ recommended)

---

## Installation

1. Download the latest installer from [GitHub Actions](https://github.com/romeclientel1/nuarcade/actions/workflows/build.yml)
2. Run NuArcade-Windows-Installer.exe
3. Complete the 7-step setup wizard
4. The wizard auto-creates your full folder structure on F:
5. Install your emulators into their F: drive folders
6. Drop games into the matching games folders
7. Hit Settings > Rescan Library and everything populates automatically

---

## Folder Structure

NuArcade auto-creates this layout on your F: drive during the wizard setup:

    F:\
    +-- TeknoParrot\        # TeknoParrot install
    +-- ArcadeGames\        # TeknoParrot game folders
    +-- RPCS3\              # RPCS3 install
    +-- PS3Games\           # PS3 game folders
    +-- Xenia\              # Xenia install
    +-- Xbox360Games\       # Xbox 360 ISO / XEX files
    +-- Dolphin\            # Dolphin install
    +-- GCWiiGames\         # GameCube / Wii ISOs or RVZ files
    +-- PCSX2\              # PCSX2 install
    |   +-- bios\           # PS2 BIOS files (required)
    +-- PS2Games\           # PS2 ISO / CHD files
    +-- Ryujinx\            # Ryujinx install
    |   +-- system\         # prod.keys (required)
    +-- SwitchGames\        # Switch NSP / XCI files
    +-- vPinball\           # Visual Pinball X install
    +-- PinballTables\      # VPX table files
    +-- NuArcade\           # NuArcade install
    +-- Media\
        +-- Videos\         # Downloaded video snaps

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Left / Right | Navigate wheel |
| Enter | Open game detail |
| Space | Quick launch |
| Escape | Close / go back |
| F | Toggle favorite |
| R | Random game picker |
| S | Screenshot mode |
| C | Toggle cabinet mode |
| ? | Show all shortcuts |

## Gamepad

| Button | Action |
|--------|--------|
| D-pad left / right | Navigate wheel |
| A | Open game detail |
| Hold A | Quick launch |
| B | Back |
| Y | Toggle favorite |
| Start | Random picker |

---

## Development

    git clone https://github.com/romeclientel1/nuarcade.git
    cd nuarcade
    npm install
    cd renderer && npm install && cd ..
    npm run dev

### Build Windows installer

    npm run build:win

Or trigger the GitHub Actions workflow manually from the Actions tab.

---

## Tech Stack

- **Electron** - desktop shell
- **React + Vite** - renderer / UI
- **electron-builder** - Windows installer packaging
- **yt-dlp** - video snap downloads
- **GitHub Actions** - CI/CD Windows build

---

## Roadmap

- EmuMovies API integration for artwork
- Per-game save state management
- Multi-monitor support (marquee display)
- LED controller integration
- Cloud sync for favorites and playtime

---

## License

MIT - free forever.

---

*Built by Rome Clientel*
