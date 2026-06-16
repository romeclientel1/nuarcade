# NuArcade

A modern arcade cabinet frontend built for serious collectors and venue operators. NuArcade replaces HyperSpin and LaunchBox with a clean, fast, AI-powered experience that works out of the box.

## What it does

NuArcade is an Electron-based game launcher that manages your entire arcade library from a single interface. Scroll through your games on a 3D rotating wheel, watch gameplay videos play behind the cards, and get instant AI coaching on any game.

## Features

### Game Library
- **168+ games supported** across TeknoParrot, MAME, RPCS3 (PS3), Xenia (Xbox 360), Dolphin (GameCube/Wii), PCSX2 (PS2), Ryujinx/Ryubing (Switch), RetroArch, Visual Pinball X, Steam, and Dreamcast
- Auto-scans your emulator folders and builds the library automatically
- Collections, favorites, ratings, and personal notes per game
- Recently played, sort by title/rating/recently added

### 3D Wheel
- Cards rotate on the Y axis with depth and perspective -- near cards at 32 degrees, far cards at 48 degrees
- Center card floats with a gentle animation
- Gameplay video plays full-screen behind the wheel, crossfading as you scroll
- Background music player -- drop MP3s into F:/Media/Music/ and NuArcade shuffles them while you browse, auto-ducking when gameplay video plays

### AI Game Coach
- Press **C** on any game for instant AI-powered coaching
- Get history, tips, secrets, and a pro move for every game in your library
- Streams in real time -- no waiting, no setup, no API key needed
- Powered by Claude claude-sonnet-4-6 via a secure proxy server

### Video Snaps
- **Auto-fetch via YouTube** -- finds and downloads 40-second gameplay clips for every game in your library
- 4 parallel downloads at 480p -- 168 games done in ~20 minutes
- AI-refined search queries find the right clip even for obscure titles
- 3-attempt fallback ladder handles games with special characters or subtitles

### Artwork
- SteamGridDB integration for capsule art, hero images, and logos
- TeknoParrot thumbnail fallback
- Auto-generated placeholder art for games without artwork
- Bulk artwork download via Media Manager

### Player Profiles
- INSERT COIN screen between boot and wheel
- Each player has a color, avatar initial, playtime tracking, and game history
- Switch players mid-session from the top bar
- Up to unlimited profiles per cabinet

### Custom Intro Video
- Drop intro.mp4 into F:/Media/ for a custom branded intro with audio
- Skippable with any button
- Fades into the NuArcade boot screen

### Auto-Updater
- Checks GitHub releases every 6 hours
- One-click download and silent install -- no manual file management
- Progress bar shows download status

## Setup

1. Download the latest installer from [Releases](https://github.com/romeclientel1/nuarcade/releases)
2. Run the NSIS installer -- it handles everything
3. Open NuArcade and follow the 7-step setup wizard
4. Point it at your TeknoParrot, MAME, and other emulator folders
5. Hit Rescan -- your library populates automatically

## Media setup

```
F:/Media/
  Videos/     -- gameplay clips (auto-fetched via Media Manager)
  Music/       -- MP3s for background music
  intro.mp4   -- optional custom intro video
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Arrow keys / gamepad | Navigate wheel |
| Enter / A | Game detail |
| Space | Launch game |
| C | AI Game Coach |
| F | Favorite |
| R | Random game |
| K | Collections |
| S | Stats |
| A | Achievements |
| Search | Virtual keyboard |
| ? | Help |

## Tech stack

- **Electron 31** + React + Vite
- **yt-dlp** for video downloads (auto-installs)
- **Howler.js** for background music
- **SteamGridDB API** for artwork
- **Claude claude-sonnet-4-6** (via Railway proxy) for AI coaching
- **NSIS** installer via GitHub Actions

## Build

```bash
# Mac/Linux (builds Windows installer via GitHub Actions)
git push origin main
# Actions builds the NSIS .exe and attaches it to a GitHub release
```

## License

Private -- all rights reserved. Jerome Emanuel / Emanuel Industries LLC.
