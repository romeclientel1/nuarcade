# Vespara <sub>by NuArcade</sub>

A modern arcade cabinet frontend built for serious collectors and venue operators.

**Current version: v6.0.3**

---

## What Vespara is

Vespara is an Electron-based game launcher that manages your arcade library from a single interface: browse and launch games across 20 supported systems, get instant AI coaching on any game, and configure everything — emulators, paths, controllers, and media — from one place.

For full setup and day-to-day instructions, see the **[Owner's Manual](USER_MANUAL.md)**, verified against Vespara 6.0.3.

---

## First launch

Vespara opens with a short intro, then arrives at **Traveler Recognition** — pick an existing Traveler, create a new one, or continue as Guest. From there you arrive in **the Sanctuary**, Vespara's home screen.

---

## The Sanctuary

The Sanctuary is home base. It shows **Recently Played** — up to 8 games, scoped to the current Traveler — and four destinations:

| Destination | What it does |
|---|---|
| The Library | Browse and launch your game collection |
| The Control Room | Configure emulators, paths, controllers, and media |
| Switch Player | Return to Traveler Recognition |
| Depart | Close Vespara (confirm with **Depart**, or **Remain** to cancel) |

<!-- Screenshot: assets/docs/sanctuary-hero.png -->

---

## The Library

Browse by system, search by name, sort by most played/most launched/recently added/top rated/system, mark favorites, group games into your own Collections, jump to a random game, and check Stats and Achievements. Selecting a game opens its **Archive View** — artwork, a gameplay preview, and launch options.

The **AI Game Coach** (press `C`) gives move lists, tips, and strategy for the selected game, and supports natural-language search.

<!-- Screenshot: assets/docs/library-browse.png -->

See the [Owner's Manual](USER_MANUAL.md#3-the-library) for full detail.

---

## The Control Room

Reached from the Sanctuary, the Control Room holds all configuration in two wings:

- **Systems Wing** — Emulators, Game Paths, Controllers, Launch Behavior, Display & Performance, Preferences, Systems Archive.
- **Archives Wing** — Artwork, Videos, Scraping, Bezels, Media Restoration.

Opening any Archives Wing station takes you into a screen still titled **Media Manager** — that's expected, not a bug.

See the [Owner's Manual](USER_MANUAL.md#5-the-control-room) for a station-by-station breakdown.

---

## Supported systems

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

---

## Installation

- Requires Windows 10 or 11, 64-bit.
- Vespara does not include games, ROMs, BIOS files, firmware, keys, or emulator binaries — you provide and configure all of those yourself.
- Download the latest installer (`Vespara.Setup.<version>.exe`) from [Releases](https://github.com/romeclientel1/nuarcade/releases) and run it.
- Vespara does not require or assume any particular drive letter for your games or media.

See the [Owner's Manual](USER_MANUAL.md#6-setting-up-emulators-and-game-paths) for emulator and path setup.

---

## Updates

Vespara checks for an update once per session and installs it silently. After installing, Vespara may close and need to be reopened manually — just reopen it normally. See the [Owner's Manual](USER_MANUAL.md#9-updating-vespara) for detail.

---

## Quick controls

| Key | Action |
|---|---|
| Left / Right Arrow | Previous / next game |
| Enter | Open game detail (Archive View) |
| Space | Launch the selected game |
| F | Toggle favorite |
| C | AI Game Coach |
| Esc | Back / close overlay |

Full keyboard and controller reference, including Sanctuary and Control Room navigation, is in the [Owner's Manual](USER_MANUAL.md#11-keyboard-and-controller-reference).

---

## Documentation

- **[Owner's Manual](USER_MANUAL.md)** — the full guide, from a guest's quick start to owner setup, verified against Vespara 6.0.3.
- **[Releases](https://github.com/romeclientel1/nuarcade/releases)** — download installers and see release notes.

---

## License

This repository's `package.json` declares an MIT license, but no standalone `LICENSE` file currently exists in the repository.
