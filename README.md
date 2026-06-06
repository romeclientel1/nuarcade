# NuArcade

> Modern arcade frontend for TeknoParrot and Visual Pinball X

**[Website](https://romeclientel1.github.io/nuarcade/)** | Built by Rome Clientel

---

## What is NuArcade?

NuArcade is a HyperSpin-style arcade cabinet frontend that replaces TeknoParrot's default UI with a beautiful, modern game wheel. Supports 500+ TeknoParrot arcade games and Visual Pinball X tables in one unified interface.

## Features

- HyperSpin-style wheel with real arcade artwork
- Auto-configuration — finds all games automatically
- Smart controller mapping by genre
- Visual Pinball X pinball tables
- Search, Favorites, Recently Played
- Attract mode with INSERT COIN
- Video previews via EmuMovies
- TeknoParrot auto-updater on launch

## Requirements

- Windows 10/11 x64
- TeknoParrot installed
- Node.js 22+
- Git

## Quick Start

    git clone https://github.com/romeclientel1/nuarcade.git
    cd nuarcade
    npm install
    cd renderer && npm install && cd ..
    npm run dev

Or double-click update.bat to pull, build, and install automatically.

## Default Paths

    F:/TeknoParrot/        TeknoParrot installation
    F:/ArcadeGames/        Game files
    F:/vPinball/           Visual Pinball X engine
    F:/PinballTables/      VPX table files
    F:/Media/Videos/       Gameplay video previews

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Left/Right | Navigate wheel |
| Enter | Open game detail |
| Space | Quick launch |
| Escape | Close / go back |
| F | Toggle favorite |
| ? | Keyboard shortcuts |

## Gamepad

| Button | Action |
|--------|--------|
| D-pad left/right | Navigate |
| A | Open detail |
| Hold A | Quick launch |
| B | Back |
| Y | Toggle favorite |

## Building

    npm run build:win
    Output: dist/NuArcade Setup 1.0.0.exe

## License

MIT - Free forever.

---

*Built by Rome Clientel*
