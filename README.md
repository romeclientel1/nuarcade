# NuArcade

Modern arcade frontend for TeknoParrot and Visual Pinball X.

Built with Electron + React + Vite.

---

## Quick start (Mac development)

```bash
# 1. Clone the repo
git clone https://github.com/romeclientel1/nuarcade.git
cd nuarcade

# 2. Install root dependencies (Electron etc.)
npm install

# 3. Install renderer dependencies
cd renderer && npm install && cd ..

# 4. Drop your sound files in:
#    renderer/public/sounds/coin.mp3
#    renderer/public/sounds/arcade-ambient.mp3

# 5. Start dev mode
npm run dev
```

This opens a windowed version on your Mac for development.
On Windows it runs fullscreen automatically.

---

## Sound files needed

Place these in `renderer/public/sounds/`:

- `coin.mp3` — arcade coin insert sound
- `arcade-ambient.mp3` — looping arcade room ambience

Both available free at freesound.org.

---

## Project structure

```
nuarcade/
├── src/
│   ├── main/
│   │   └── index.js          ← Electron main process
│   └── preload/
│       └── index.js          ← Secure IPC bridge
├── renderer/                 ← React/Vite frontend
│   ├── public/
│   │   └── sounds/           ← coin.mp3, arcade-ambient.mp3
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── Intro/        ← Coin drop intro sequence
│           └── Wheel/        ← HyperSpin-style game wheel
├── assets/
│   ├── sounds/
│   ├── fonts/
│   └── icons/
└── package.json
```

---

## Building for Windows

```bash
npm run build:win
```

Outputs a Windows installer `.exe` to `dist/`.

---

## What's built so far

- [x] Electron shell (fullscreen on Windows, windowed on Mac for dev)
- [x] Coin drop intro sequence with sound + logo animation
- [x] HyperSpin-style perspective wheel
- [x] Category filtering (Racing, Fighting, Shooter, Rhythm, Flying, Pinball)
- [x] Keyboard navigation (arrow keys + Enter to launch)
- [x] Game launch via TeknoParrotUi.exe --profile=
- [x] IPC bridge for Windows system calls

## Coming next

- [ ] Setup wizard (security exclusions, path config, controller mapping)
- [ ] TeknoParrot XML scanner (auto game detection)
- [ ] Controller auto-assignment
- [ ] Arcade ambient audio with ducking
- [ ] Game artwork + video previews
- [ ] Visual Pinball X integration
- [ ] Auto-updater (TeknoParrot + NuArcade)
