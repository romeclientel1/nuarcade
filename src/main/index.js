const { app, BrowserWindow, ipcMain, screen, dialog, shell, globalShortcut } = require('electron')
const path = require('path')
const { exec, spawn } = require('child_process')
const config = require('./config')
const { scanMedia } = require('./mediaScanner')
const launchRegistry = require('./launchRegistry')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWin = null

// -- Launch lifecycle registry integration -----------------------------------
// Wires the in-memory main-process launch registry (launchRegistry.js) into
// the real child_process lifecycle. The registry is the single source of
// truth for whether a process actually started, whether it's tracked to
// exit, and its raw exit facts -- no 4000ms trust policy lives here; that
// stays in the renderer's launchEvidence.js, which decides whether the raw
// evidence this module reports is trustworthy.

function emitLaunchLifecycleTerminal(status) {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('launch-lifecycle-terminal', status)
  }
}

function registerLaunchSession(sessionId, trackedToExit) {
  if (!sessionId) return null
  return launchRegistry.registerLaunch({ sessionId: sessionId, trackedToExit: trackedToExit === true })
}

// Attaches spawn/error/exit listeners that record raw lifecycle facts onto
// an already-registered session, and emits exactly one terminal push the
// moment (and only the moment) the session actually becomes terminal.
// Safe against duplicate/delayed 'exit' or 'error' events because
// launchRegistry's recordExit/recordSpawnFailure are themselves idempotent
// (first terminal write wins) -- reportTerminal only pushes when this
// specific call is the one that flipped exitedAt from null.
//
// The 'error' listener is attached UNCONDITIONALLY, sessionId or not: for
// the fire-and-forget (detached) launchers this is the only 'error'
// listener a child ever gets, and Node's EventEmitter throws on an 'error'
// event with zero listeners -- bailing out here entirely for a legacy
// (no-sessionId) call would silently reintroduce that crash risk. Only the
// registry bookkeeping itself is conditional on sessionId being present.
function trackLaunchLifecycle(child, sessionId, trackedToExit) {
  function reportTerminal(mutate) {
    if (!sessionId) return
    var before = launchRegistry.getStatus(sessionId)
    mutate()
    var after = launchRegistry.getStatus(sessionId)
    if (before.exitedAt == null && after.exitedAt != null) emitLaunchLifecycleTerminal(after)
  }

  child.on('spawn', function() {
    if (!sessionId) return
    launchRegistry.recordProcessStarted(sessionId, { startedAt: Date.now() })
  })
  child.on('error', function(err) {
    reportTerminal(function() {
      launchRegistry.recordSpawnFailure(sessionId, { error: err && err.message, exitedAt: Date.now() })
    })
  })
  if (trackedToExit) {
    child.on('exit', function(code, signal) {
      reportTerminal(function() {
        launchRegistry.recordExit(sessionId, { exitCode: code, signal: signal || null, exitedAt: Date.now() })
      })
    })
  }
}

// Fire-and-forget launchers (VPX, Steam, direct PC) can never report an
// exit -- registered trackedToExit: false, so they remain 'uncertain' by
// construction (see launchRegistry.js) no matter what happens after spawn.
// spawnImpl is an optional test-only seam (defaults to the real spawn);
// production call sites never pass it.
function launchDetachedFireAndForget(exe, args, spawnOptions, sessionId, spawnImpl) {
  registerLaunchSession(sessionId, false)
  var doSpawn = spawnImpl || spawn
  var child = doSpawn(exe, args, spawnOptions)
  trackLaunchLifecycle(child, sessionId, false)
  child.unref()
  return child
}

// execImpl is an optional test-only seam (defaults to the real exec);
// production call sites never pass it.
function launchViaShellCommand(command, sessionId, execImpl) {
  registerLaunchSession(sessionId, false)
  var doExec = execImpl || exec
  doExec(command, function(error) {
    if (!sessionId) return
    if (error) {
      var before = launchRegistry.getStatus(sessionId)
      launchRegistry.recordSpawnFailure(sessionId, { error: error.message, exitedAt: Date.now() })
      var after = launchRegistry.getStatus(sessionId)
      if (before.exitedAt == null && after.exitedAt != null) emitLaunchLifecycleTerminal(after)
    } else {
      launchRegistry.recordProcessStarted(sessionId, { startedAt: Date.now() })
    }
  })
}

// Shared launcher -- minimizes NuArcade while a game runs, restores on exit.
// options.spawnImpl is an optional test-only seam (defaults to the real
// spawn); production call sites (all 18 tracked launch handlers) never
// pass it.
function launchWithReturn(exe, args, options) {
  args = args || []
  options = options || {}
  var sessionId = options.sessionId || null
  var doSpawn = options.spawnImpl || spawn
  registerLaunchSession(sessionId, true)
  return new Promise(function(resolve, reject) {
    if (mainWin && !options.keepVisible) {
      mainWin.setFullScreen(false)
      mainWin.minimize()
    }
    var startedAt = Date.now()
    var stderrBuf = ''
    var child = doSpawn(exe, args, Object.assign({
      cwd: options.cwd || path.dirname(exe),
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: false,
    }, options.spawnOpts || {}))
    trackLaunchLifecycle(child, sessionId, true)
    if (child.stderr) {
      child.stderr.on('data', function(chunk) {
        stderrBuf += chunk.toString()
        if (stderrBuf.length > 4000) stderrBuf = stderrBuf.slice(-4000)
      })
    }
    function nudgeFocus() {
      try {
        require('child_process').exec('powershell -NoProfile -WindowStyle Hidden -Command "(New-Object -ComObject WScript.Shell).AppActivate(' + child.pid + ')"', function() {})
      } catch (e) {}
    }
    setTimeout(nudgeFocus, 1500)
    setTimeout(nudgeFocus, 4000)
    setTimeout(nudgeFocus, 8000)
    try {
      globalShortcut.register('Escape', function() {
        try { exec('taskkill /PID ' + child.pid + ' /T /F', function() {}) } catch (e) {}
      })
    } catch (e) {}
    child.on('exit', function(code) {
      try { globalShortcut.unregister('Escape') } catch (e) {}
      if (mainWin) {
        mainWin.restore()
        setTimeout(function() {
          if (mainWin) {
            mainWin.focus()
            if (!options.keepVisible) mainWin.setFullScreen(true)
          }
        }, 300)
      }
      var elapsed = Date.now() - startedAt
      if (elapsed < 4000 && code !== 0) {
        reject(new Error('Exited immediately (code ' + code + ')' + (stderrBuf ? ': ' + stderrBuf.trim().slice(-300) : '')))
      } else {
        resolve()
      }
    })
    child.on('error', function(err) {
      try { globalShortcut.unregister('Escape') } catch (e) {}
      if (mainWin) { mainWin.restore(); mainWin.focus() }
      reject(err)
    })
  })
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    width,
    height,
    fullscreen: !isDev,
    frame: isDev,
    backgroundColor: '#000000',
    show: false,
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })

  mainWin = win
  win.once('ready-to-show', () => {
    win.show()
    if (!isDev) win.setFullScreen(true)
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'))
  }

  // Cursor: hidden in production, visible during wizard setup
  let cursorHidden = false
  const hideCursor = () => {
    if (!cursorHidden) {
      win.webContents.insertCSS('body.cabinet-mode * { cursor: none !important; }')
      cursorHidden = true
    }
  }

  if (!isDev) {
    // Hide cursor only after setup wizard completes
    ipcMain.once('setup-complete', () => hideCursor())
    // Also hide if app restarts with setup already done
    const cfg = config.load()
    if (cfg.setupComplete) {
      win.webContents.on('did-finish-load', () => hideCursor())
    }
  }

  return win
}

// -- Browse folder dialog ----------------------------------------------------
ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select folder',
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

// -- Launch TeknoParrot game -------------------------------------------------
ipcMain.handle('launch-game', async (event, profilePath, sessionId) => {
  const cfg = config.load()
  const teknoParrotExe = path.join(cfg.teknoParrotPath, 'TeknoParrotUi.exe')
  const profileName = path.basename(profilePath)
  const args = ['--profile=' + profileName, '--startGame']
  try {
    await launchWithReturn(teknoParrotExe, args, { spawnOpts: { cwd: cfg.teknoParrotPath }, sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Launch RPCS3 game -------------------------------------------------------
ipcMain.handle('launch-ps3-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const rpcs3Exe = path.join(cfg.rpcs3Path || 'F:\\RPCS3\\', 'rpcs3.exe')
  try {
    await launchWithReturn(rpcs3Exe, ['--no-gui', gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Run TeknoParrot updater -------------------------------------------------
ipcMain.handle('run-updater', async () => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const updaterPath = path.join(cfg.teknoParrotPath, 'ParrotPatcher.exe')
    exec(updaterPath, (error) => {
      resolve({ success: !error, error: error?.message })
    })
  })
})

// -- Scan TeknoParrot games --------------------------------------------------
ipcMain.handle('scan-games', async (event, { teknoParrotPath, gamesFolderPath }) => {
  const { scanGames } = require('./scanner')
  const cfg = config.load()
  const timeout = new Promise(resolve =>
    setTimeout(() => resolve({ games: [], stats: {}, error: 'scan timed out' }), 25000)
  )
  return await Promise.race([scanGames(teknoParrotPath, gamesFolderPath, cfg.retroarchPath), timeout])
})

// -- Scan RPCS3 games --------------------------------------------------------
ipcMain.handle('scan-ps3-games', async (event, ps3GamesPath) => {
  const { scanPs3Games } = require('./scanner')
  return scanPs3Games(ps3GamesPath)
})

// -- Scan pinball tables -----------------------------------------------------
ipcMain.handle('scan-pinball', async (event, tablesPath) => {
  const { scanPinballTables } = require('./scanner')
  return scanPinballTables(tablesPath)
})

// -- VPX launch --------------------------------------------------------------
ipcMain.handle('launch-vpx-table', async (event, tablePath, sessionId) => {
  const cfg = config.load()
  const vpxDir  = cfg.pinballPath || 'F:\\vPinball\\'
  const vpxExe  = require('path').join(vpxDir, 'VPinballX64.exe')
  try {
    launchDetachedFireAndForget(vpxExe, ['-play', tablePath], {
      detached: true, stdio: 'ignore',
      cwd: vpxDir,
    }, sessionId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('launch-xbox360-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const xeniaExe = path.join(cfg.xeniaPath || 'F:\\Xenia\\', 'xenia.exe')
  try {
    await launchWithReturn(xeniaExe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Launch Dolphin / GC+Wii -------------------------------------------------
ipcMain.handle('launch-gcwii-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const dolphinExe = path.join(cfg.dolphinPath || 'F:\\Dolphin\\', 'Dolphin.exe')
  try {
    await launchWithReturn(dolphinExe, ['-e', gamePath, '--batch'], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Launch PCSX2 / PS2 ------------------------------------------------------
ipcMain.handle('launch-ps2-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const pcsx2Exe = path.join(cfg.pcsx2Path || 'F:\\PCSX2\\', 'pcsx2-qt.exe')
  try {
    await launchWithReturn(pcsx2Exe, ['-nogui', '--', gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Scan Xbox 360 games -----------------------------------------------------
ipcMain.handle('scan-xbox360-games', async (event, xbox360GamesPath) => {
  const { scanXbox360Games } = require('./scanner')
  return scanXbox360Games(xbox360GamesPath)
})

// -- Scan GameCube/Wii games -------------------------------------------------
ipcMain.handle('scan-gcwii-games', async (event, gcWiiGamesPath) => {
  const { scanGCWiiGames } = require('./scanner')
  return scanGCWiiGames(gcWiiGamesPath)
})

// -- Scan PS2 games ----------------------------------------------------------
ipcMain.handle('scan-ps2-games', async (event, ps2GamesPath) => {
  const { scanPs2Games } = require('./scanner')
  const cfg = config.load()
  return scanPs2Games(ps2GamesPath, cfg.pcsx2Path)
})


// -- Launch Ryujinx / Switch --------------------------------------------------
ipcMain.handle('launch-switch-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const ryujinxExe = path.join(cfg.ryujinxPath || 'F:\\Ryujinx\\', 'Ryujinx.exe')
  try {
    await launchWithReturn(ryujinxExe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Scan Switch games --------------------------------------------------------
ipcMain.handle('scan-switch-games', async (event, switchGamesPath) => {
  const { scanSwitchGames } = require('./scanner')
  return scanSwitchGames(switchGamesPath)
})


// -- Create F: drive folder structure ----------------------------------------
ipcMain.handle('create-folder-structure', async () => {
  const fs = require('fs')
  const folders = [
    'F:\\TeknoParrot',
    'F:\\ArcadeGames',
    'F:\\RPCS3',
    'F:\\PS3Games',
    'F:\\Xenia',
    'F:\\Xbox360Games',
    'F:\\Dolphin',
    'F:\\GCWiiGames',
    'F:\\PCSX2',
    'F:\\PCSX2\\bios',
    'F:\\PS2Games',
    'F:\\Ryujinx',
    'F:\\Ryujinx\\system',
    'F:\\SwitchGames',
    'F:\\MAME',
    'F:\\MAME\\roms',
    'F:\\RetroArch',
    'F:\\RetroArchGames',
    'F:\\RetroArchGames\\NES',
    'F:\\RetroArchGames\\SNES',
    'F:\\RetroArchGames\\Genesis',
    'F:\\RetroArchGames\\GBA',
    'F:\\RetroArchGames\\N64',
    'F:\\RetroArchGames\\PS1',
    'F:\\Project64',
    'F:\\N64Games',
    'F:\\DuckStation',
    'F:\\PS1Games',
    'F:\\Flycast',
    'F:\\DreamcastGames',
    'F:\\Model2',
    'F:\\Model2Games',
    'F:\\Supermodel',
    'F:\\Model3Games',
    'F:\\PPSSPP',
    'F:\\PSPGames',
    'F:\\Cemu',
    'F:\\WiiUGames',
    'F:\\vPinball',
    'F:\\PinballTables',
    'F:\\NuArcade',
    'F:\\Media',
    'F:\\Media\\Videos',
    'F:\\Media\\Artwork',
  ]
  const results = []
  for (const folder of folders) {
    try {
      fs.mkdirSync(folder, { recursive: true })
      results.push({ folder, created: true })
    } catch (e) {
      results.push({ folder, created: false, error: e.message })
    }
  }
  return { success: true, results }
})


// -- Backup config to file ----------------------------------------------------
ipcMain.handle('backup-config', async () => {
  const cfg = config.load()
  const result = await dialog.showSaveDialog({
    title: 'Save NuArcade Backup',
    defaultPath: 'nuarcade-backup-' + new Date().toISOString().slice(0,10) + '.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { success: false }
  const fs = require('fs')
  // Config is stored in electron userData -- localStorage keys are sent from renderer
  const backup = {
    version: '2.2.0',
    date: new Date().toISOString(),
    config: cfg,
    // localStorage data is passed via a separate IPC call before backup
    localStorage: {},
  }
  fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2))
  return { success: true, path: result.filePath }
})

// Store localStorage snapshot for backup
ipcMain.handle('backup-localstorage', async (event, data) => {
  const cfg = config.load()
  const result = await dialog.showSaveDialog({
    title: 'Save NuArcade Full Backup',
    defaultPath: 'nuarcade-backup-' + new Date().toISOString().slice(0,10) + '.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { success: false }
  const fs = require('fs')
  const backup = {
    version: '2.2.0',
    date: new Date().toISOString(),
    config: cfg,
    localStorage: data || {},
  }
  fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2))
  return { success: true, path: result.filePath }
})

// -- Restore config from file -------------------------------------------------
ipcMain.handle('restore-config', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Restore NuArcade Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths.length) return { success: false }
  const fs = require('fs')
  try {
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'))
    if (data.config) {
      config.save(data.config)
      return {
        success: true,
        date: data.date,
        version: data.version,
        localStorage: data.localStorage || {},
      }
    }
    return { success: false, error: 'Invalid backup file' }
  } catch (e) {
    return { success: false, error: e.message }
  }
})


// -- Marquee display (second monitor) ----------------------------------------
let marqueeWin = null

ipcMain.handle('open-marquee', async () => {
  const displays = screen.getAllDisplays()
  const secondary = displays.find(d => d.id !== screen.getPrimaryDisplay().id)
  const display = secondary || screen.getPrimaryDisplay()

  if (marqueeWin && !marqueeWin.isDestroyed()) {
    marqueeWin.focus()
    return { success: true }
  }

  marqueeWin = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    fullscreen: true,
    frame: false,
    backgroundColor: "#000000",
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    }
  })

  marqueeWin.loadURL("data:text/html," + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #000; overflow: hidden; width: 100vw; height: 100vh; font-family: system-ui, sans-serif; }
      @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
      #marquee { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; position: relative; }
      #hero { width: 100%; height: 65%; object-fit: cover; object-position: center top; opacity: 0; transition: opacity 0.8s ease; }
      #hero.loaded { opacity: 1; }
      #capsule { max-height: 70%; max-width: 55%; object-fit: contain; opacity: 0; transition: opacity 0.8s ease; }
      #capsule.loaded { opacity: 1; }
      #textblock { display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 2; }
      #title { font-size: 2.8rem; font-weight: 900; color: #fff; text-align: center; letter-spacing: -0.02em; text-shadow: 0 2px 40px rgba(0,0,0,0.9); padding: 0 32px; }
      #system { font-size: 1rem; color: rgba(255,255,255,0.45); letter-spacing: 0.14em; text-transform: uppercase; }
      #logo { max-width: 55%; max-height: 28%; object-fit: contain; opacity: 0; transition: opacity 0.8s ease; }
      #logo.loaded { opacity: 1; }
      #accent { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #00ff88; transition: background 0.6s ease; }
      .brand { position: absolute; bottom: 18px; right: 20px; font-size: 0.7rem; color: rgba(255,255,255,0.12); letter-spacing: 0.1em; }
    </style>
    </head>
    <body>
    <div id="marquee">
      <img id="hero" src="" style="display:none" />
      <img id="capsule" src="" style="display:none" />
      <div id="textblock">
        <div id="title">NuArcade</div>
        <div id="system">Insert Coin</div>
        <img id="logo" src="" style="display:none" />
      </div>
      <div id="now-playing" style="display:none; position:absolute; top:20px; left:24px; align-items:center; gap:8px; background:rgba(0,255,136,0.15); border:1px solid rgba(0,255,136,0.4); border-radius:20px; padding:6px 14px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#00ff88;animation:pulse 1s ease-in-out infinite;"></div>
        <span style="font-size:11px;font-weight:700;color:#00ff88;letter-spacing:0.12em;text-transform:uppercase;">Now Playing</span>
      </div>
      <div id="accent"></div>
    </div>
    <div class="brand">NuArcade</div>
    <script>
      const { ipcRenderer } = require("electron")
      ipcRenderer.on("marquee-update", (e, data) => {
        const title      = document.getElementById("title")
        const system     = document.getElementById("system")
        const hero       = document.getElementById("hero")
        const capsule    = document.getElementById("capsule")
        const logo       = document.getElementById("logo")
        const nowBadge   = document.getElementById("now-playing")
        const accent     = document.getElementById("accent")

        title.textContent  = data.title  || "NuArcade"
        system.textContent = data.system || ""

        // Now Playing badge
        if (nowBadge) {
          nowBadge.style.display = data.nowPlaying ? "flex" : "none"
        }

        // Reset media
        hero.className    = ""; hero.style.display    = "none"
        capsule.className = ""; capsule.style.display = "none"
        logo.className    = ""; logo.style.display    = "none"

        if (data.hero) {
          hero.src = data.hero; hero.style.display = "block"
          hero.onload = () => hero.classList.add("loaded")
          if (data.logo) {
            logo.src = data.logo; logo.style.display = "block"
            logo.onload = () => logo.classList.add("loaded")
          }
        } else if (data.capsule) {
          capsule.src = data.capsule; capsule.style.display = "block"
          capsule.onload = () => capsule.classList.add("loaded")
        }
      })
    </script>
    </body>
    </html>
  `))

  marqueeWin.on("closed", () => { marqueeWin = null })
  return { success: true }
})

ipcMain.handle('close-marquee', () => {
  if (marqueeWin && !marqueeWin.isDestroyed()) marqueeWin.close()
  return { success: true }
})

ipcMain.handle('update-marquee', (event, data) => {
  if (marqueeWin && !marqueeWin.isDestroyed()) {
    marqueeWin.webContents.send("marquee-update", data)
  }
  return { success: true }
})

// -- Config & misc -----------------------------------------------------------
ipcMain.handle('add-exclusions', async (event, paths) => {
  return new Promise((resolve) => {
    const ps = paths.map(p => `Add-MpPreference -ExclusionPath "${p}"`).join('; ')
    exec(`powershell -Command "${ps}"`, (error) => {
      resolve({ success: !error })
    })
  })
})

// -- Bundled Vespara cinematics ----------------------------------------------
// The renderer may request only these product-owned files. Returning the
// containing directory lets the existing video component preserve its
// filename-based external-override behavior.
const BUNDLED_CINEMATIC_FILES = new Set([
  'intro.mp4',
  'sanctuary-entry.mp4',
])

function getBundledCinematicMediaPath(fileName) {
  if (!BUNDLED_CINEMATIC_FILES.has(fileName)) return null

  const fs = require('fs')
  const mediaPath = app.isPackaged
    ? path.join(process.resourcesPath, 'cinematics')
    : path.join(__dirname, '..', '..', 'assets', 'cinematics')
  const filePath = path.join(mediaPath, fileName)

  try {
    return fs.existsSync(filePath) ? mediaPath : null
  } catch (e) {
    return null
  }
}

ipcMain.handle('get-bundled-cinematic-media-path', (event, fileName) => {
  return getBundledCinematicMediaPath(fileName)
})

ipcMain.handle('get-config', () => config.load())
ipcMain.handle('quit-app', () => { app.quit() })

// Restart the app cleanly -- used after path/emulator config changes that require a fresh scan on next launch
ipcMain.handle('restart-app', () => {
  app.relaunch()
  app.exit(0)
})

ipcMain.handle('reset-setup', () => {
  config.update({ setupComplete: false })
  return { ok: true }
})

ipcMain.handle('get-controller-override', (event, gameId) => {
  const cfg = config.load()
  return cfg.gameControllerOverrides?.[gameId] || null
})

ipcMain.handle('set-controller-override', (event, gameId, controller) => {
  const cfg = config.load()
  if (!cfg.gameControllerOverrides) cfg.gameControllerOverrides = {}
  if (controller === null) {
    delete cfg.gameControllerOverrides[gameId]
  } else {
    cfg.gameControllerOverrides[gameId] = controller
  }
  return config.save(cfg)
})

ipcMain.handle('set-config', (event, updates) => config.update(updates))

ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    index: i,
    width: d.bounds.width,
    height: d.bounds.height,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
})

app.whenReady().then(() => {
  ensureCabinetFolders()
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../../assets/icons/icon.png'))
  }
  createWindow()

  // Grant gamepad permission -- required in Electron 31+ for getGamepads() to work
  const { session } = require('electron')
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'gamepad') return true
    return true
  })
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'gamepad') { callback(true); return }
    callback(true)
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// -- MAME --------------------------------------------------------------------
ipcMain.handle('launch-mame-game', async (event, gamePath, sessionId) => {
  const fs = require('fs')
  const cfg = config.load()
  const mameDir = cfg.mamePath || 'F:\\MAME\\'

  // Find mame exe -- could be mame.exe, mame64.exe, mame0270.exe etc
  let mameExe = path.join(mameDir, 'mame.exe')
  if (!fs.existsSync(mameExe)) {
    try {
      const entries = fs.readdirSync(mameDir)
      const mameFile = entries.find(f =>
        f.toLowerCase().startsWith('mame') && f.toLowerCase().endsWith('.exe')
      )
      if (mameFile) mameExe = path.join(mameDir, mameFile)
    } catch {}
  }

  const romFile = path.basename(gamePath, path.extname(gamePath))
  const romsDir = path.dirname(gamePath)
  try {
    await launchWithReturn(mameExe, [romFile, '-rompath', romsDir, '-nowindow'], { cwd: mameDir, sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-mame-games', async (event, mameGamesPath) => {
  const { scanMameGames } = require('./scanner')
  return scanMameGames(mameGamesPath)
})

// -- RetroArch ---------------------------------------------------------------
ipcMain.handle('launch-retroarch', async (event, sessionId) => {
  const cfg = config.load()
  const retroDir = cfg.retroarchPath || 'F:\\RetroArch\\'
  const retroExe = path.join(retroDir, 'retroarch.exe')
  if (!require('fs').existsSync(retroExe)) return { success: false, error: 'RetroArch not found at: ' + retroExe }
  try { await launchWithReturn(retroExe, [], { spawnOpts: { cwd: retroDir }, sessionId }); return { success: true } }
  catch (e) { return { success: false, error: e.message } }
})

// -- RetroArch core selection (shared by launch + bezel matching) -----------
// System-aware core candidates -- scans the actual cores folder and picks the
// first installed candidate for the game's system, rather than assuming one
// exact filename. Works for any RetroArch setup, not just one specific machine.
const SYSTEM_CORE_CANDIDATES = {
  nes: ['nestopia_libretro.dll', 'fceumm_libretro.dll', 'quicknes_libretro.dll', 'mesen_libretro.dll'],
  snes: ['snes9x_libretro.dll', 'bsnes_libretro.dll', 'snes9x2010_libretro.dll'],
  n64: ['mupen64plus_next_libretro.dll', 'parallel_n64_libretro.dll'],
  genesis: ['genesis_plus_gx_libretro.dll', 'picodrive_libretro.dll'],
  megadrive: ['genesis_plus_gx_libretro.dll', 'picodrive_libretro.dll'],
  mastersystem: ['genesis_plus_gx_libretro.dll', 'picodrive_libretro.dll'],
  gamegear: ['genesis_plus_gx_libretro.dll', 'picodrive_libretro.dll'],
  sega32x: ['picodrive_libretro.dll'],
  sg1000: ['genesis_plus_gx_wide_libretro.dll', 'genesis_plus_gx_libretro.dll'],
  segacd: ['genesis_plus_gx_libretro.dll', 'picodrive_libretro.dll'],
  saturn: ['yabause_libretro.dll', 'mednafen_saturn_libretro.dll', 'yabasanshiro_libretro.dll'],
  pcfx: ['mednafen_pcfx_libretro.dll'],
  atomiswave: ['reicast_libretro.dll', 'flycast_libretro.dll', 'redream_libretro.dll'],
  dreamcast: ['flycast_libretro.dll', 'reicast_libretro.dll', 'redream_libretro.dll'],
  gba: ['mgba_libretro.dll', 'vba_next_libretro.dll', 'vbam_libretro.dll'],
  gbc: ['gambatte_libretro.dll', 'mgba_libretro.dll', 'gearboy_libretro.dll'],
  gb: ['gambatte_libretro.dll', 'mgba_libretro.dll', 'gearboy_libretro.dll', 'sameboy_libretro.dll'],
  psx: ['pcsx_rearmed_libretro.dll', 'swanstation_libretro.dll', 'mednafen_psx_libretro.dll', 'mednafen_psx_hw_libretro.dll'],
  ps1: ['pcsx_rearmed_libretro.dll', 'swanstation_libretro.dll', 'mednafen_psx_libretro.dll', 'mednafen_psx_hw_libretro.dll'],
  '3do': ['opera_libretro.dll', '4do_libretro.dll'],
  pce: ['mednafen_pce_libretro.dll', 'mednafen_pce_fast_libretro.dll', 'mednafen_supergrafx_libretro.dll'],
  pcengine: ['mednafen_pce_libretro.dll', 'mednafen_pce_fast_libretro.dll', 'mednafen_supergrafx_libretro.dll'],
  neogeopocket: ['mednafen_ngp_libretro.dll'],
  wonderswan: ['mednafen_wswan_libretro.dll'],
  atari2600: ['stella_libretro.dll', 'stella2014_libretro.dll'],
  atari7800: ['prosystem_libretro.dll'],
  atarilynx: ['handy_libretro.dll'],
  atarijaguar: ['virtualjaguar_libretro.dll'],
  mame: ['mame_libretro.dll', 'mame2003_plus_libretro.dll', 'fbneo_libretro.dll'],
  fba: ['fbneo_libretro.dll', 'fbalpha_libretro.dll'],
  arcade: ['mame_libretro.dll', 'fbneo_libretro.dll'],
  neogeo: ['fbneo_libretro.dll', 'fbalpha2012_neogeo_libretro.dll', 'mame_libretro.dll'],
  vectrex: ['vecx_libretro.dll'],
}

function findInstalledCore(retroDir, system) {
  const fs = require('fs')
  const candidates = SYSTEM_CORE_CANDIDATES[system]
  if (!candidates) return null
  let installed
  try {
    installed = new Set(fs.readdirSync(path.join(retroDir, 'cores')).map(function(f) { return f.toLowerCase() }))
  } catch (e) {
    return null
  }
  for (const candidate of candidates) {
    if (installed.has(candidate.toLowerCase())) return candidate
  }
  return null
}

// -- Bezel Project integration ------------------------------------------------
// Maps an installed core filename to (a) the GitHub repo suffix and (b) the
// exact core-folder name Bezel Project (and RetroArch itself) use for
// per-core config/overlay paths. These are RetroArch's own core display
// names, verified directly against the real repos -- not guesses.
const BEZEL_SYSTEM_REPO = {
  psx: 'PSX',
  ps1: 'PSX',
  nes: 'NES',
  snes: 'SNES',
  genesis: 'MegaDrive',
  megadrive: 'MegaDrive',
  n64: 'N64',
  saturn: 'Saturn',
  gba: 'GBA',
  gbc: 'GBC',
  gb: 'GB',
  atomiswave: 'Atomiswave',
  '3do': '3DO',
  pce: 'PCEngine',
  pcengine: 'PCEngine',
  mastersystem: 'MasterSystem',
  gamegear: 'GameGear',
  segacd: 'SegaCD',
  sega32x: 'Sega32X',
  atari2600: 'Atari2600',
  atari7800: 'Atari7800',
  atarilynx: 'AtariLynx',
  atarijaguar: 'AtariJaguar',
  neogeopocket: 'NGP',
  wonderswan: 'WonderSwan',
  vectrex: 'GCEVectrex',
}
const BEZEL_CORE_FOLDER_MAP = {
  'pcsx_rearmed_libretro.dll': 'PCSX-ReARMed',
  'swanstation_libretro.dll': 'SwanStation',
  'mednafen_psx_libretro.dll': 'Beetle PSX',
  'mednafen_psx_hw_libretro.dll': 'Beetle PSX HW',
  'nestopia_libretro.dll': 'Nestopia',
  'fceumm_libretro.dll': 'FCEUmm',
  'quicknes_libretro.dll': 'QuickNES',
  'mesen_libretro.dll': 'Mesen',
  'snes9x_libretro.dll': 'Snes9x',
  'bsnes_libretro.dll': 'bsnes',
  'snes9x2010_libretro.dll': 'Snes9x 2010',
  'genesis_plus_gx_libretro.dll': 'Genesis Plus GX',
  'picodrive_libretro.dll': 'PicoDrive',
  'mupen64plus_next_libretro.dll': 'Mupen64Plus-Next',
  'parallel_n64_libretro.dll': 'ParaLLEl N64',
  'yabause_libretro.dll': 'Yabause',
  'mednafen_saturn_libretro.dll': 'Beetle Saturn',
  'yabasanshiro_libretro.dll': 'YabaSanshiro',
  'mgba_libretro.dll': 'mGBA',
  'vba_next_libretro.dll': 'VBA Next',
  'vbam_libretro.dll': 'VBA-M',
  'gambatte_libretro.dll': 'Gambatte',
  'gearboy_libretro.dll': 'Gearboy',
  'sameboy_libretro.dll': 'SameBoy',
  'reicast_libretro.dll': 'Reicast',
  'flycast_libretro.dll': 'Flycast',
  'opera_libretro.dll': 'Opera',
  '4do_libretro.dll': '4DO',
  'mednafen_pce_libretro.dll': 'Beetle PCE',
  'mednafen_pce_fast_libretro.dll': 'Beetle PCE Fast',
  'mednafen_supergrafx_libretro.dll': 'Beetle SuperGrafx',
  'stella_libretro.dll': 'Stella',
  'stella2014_libretro.dll': 'Stella 2014',
  'prosystem_libretro.dll': 'ProSystem',
  'handy_libretro.dll': 'Handy',
  'virtualjaguar_libretro.dll': 'Virtual Jaguar',
  'mednafen_ngp_libretro.dll': 'Beetle NeoPop',
  'mednafen_wswan_libretro.dll': 'Beetle WonderSwan',
  'vecx_libretro.dll': 'VecX',
}

ipcMain.handle('launch-retroarch-game', async (event, gamePath, system, sessionId) => {
  const fs = require('fs')
  const cfg = config.load()
  const retroDir = cfg.retroarchPath || 'F:\\RetroArch\\'
  const retroExe = path.join(retroDir, 'retroarch.exe')
  const ext = path.extname(gamePath).toLowerCase()

  // Extension -> core dll mapping (most common cores)
  const CORE_MAP = {
    '.nes':  'nestopia_libretro.dll',
    '.fds':  'nestopia_libretro.dll',
    '.sfc':  'snes9x_libretro.dll',
    '.smc':  'snes9x_libretro.dll',
    '.md':   'genesis_plus_gx_libretro.dll',
    '.gen':  'genesis_plus_gx_libretro.dll',
    '.smd':  'genesis_plus_gx_libretro.dll',
    '.32x':  'picodrive_libretro.dll',
    '.gg':   'genesis_plus_gx_libretro.dll',
    '.sms':  'genesis_plus_gx_libretro.dll',
    '.gba':  'mgba_libretro.dll',
    '.gbc':  'gambatte_libretro.dll',
    '.gb':   'gambatte_libretro.dll',
    '.n64':  'mupen64plus_next_libretro.dll',
    '.z64':  'mupen64plus_next_libretro.dll',
    '.v64':  'mupen64plus_next_libretro.dll',
    '.bin':  'pcsx_rearmed_libretro.dll',
    '.cue':  'pcsx_rearmed_libretro.dll',
    '.iso':  'pcsx_rearmed_libretro.dll',
    '.chd':  'pcsx_rearmed_libretro.dll',
    '.pce':  'mednafen_pce_libretro.dll',
    '.ngp':  'mednafen_ngp_libretro.dll',
    '.ngc':  'mednafen_ngp_libretro.dll',
    '.ws':   'mednafen_wswan_libretro.dll',
    '.wsc':  'mednafen_wswan_libretro.dll',
    '.a26':  'stella_libretro.dll',
    '.a78':  'prosystem_libretro.dll',
    '.lnx':  'handy_libretro.dll',
    '.col':  'bluemsx_libretro.dll',
    '.vec':  'vecx_libretro.dll',
  }

  const coreName = (system && findInstalledCore(retroDir, system)) || CORE_MAP[ext]
  const corePath = coreName ? path.join(retroDir, 'cores', coreName) : null

  const args = corePath && fs.existsSync(corePath)
    ? ['-f', '-L', corePath, gamePath]
    : ['-f', gamePath]

  // If a Bezel Project-installed override exists for this exact game, force-load
  // it directly via --appendconfig -- more reliable than RetroArch's own
  // auto-override detection, which silently does nothing if certain settings
  // (auto_overrides_enable, game_specific_options) aren't already turned on.
  const coreFolder = coreName && BEZEL_CORE_FOLDER_MAP[coreName.toLowerCase()]
  if (coreFolder) {
    const romTitle = path.basename(gamePath, path.extname(gamePath))
    const overridePath = path.join(retroDir, 'config', coreFolder, romTitle + '.cfg')
    if (fs.existsSync(overridePath)) {
      args.push('--appendconfig', overridePath)
    }
  }

  try {
    await launchWithReturn(retroExe, args, { sessionId })
    return { success: true, core: coreName || 'auto' }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('prune-mame-artwork', async (event, dryRun) => {
  const cfg = config.load()
  const { pruneMameArtwork } = require('./scanner')
  const artworkPath = path.join(cfg.mamePath || 'F:\\MAME\\', 'artwork')
  try {
    const result = await pruneMameArtwork(cfg.mameGamesPath, artworkPath, dryRun)
    return { success: true, total: result.total, kept: result.kept, removed: result.removed, removedNames: result.removedNames, dryRun: result.dryRun }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('install-local-bezels', async (event, dryRun) => {
  const cfg = config.load()
  const { installLocalBezels } = require('./scanner')
  const artworkPath = path.join(cfg.mamePath || 'F:\\MAME\\', 'artwork')
  try {
    const result = await installLocalBezels(cfg.mameGamesPath, artworkPath, cfg.bezelSourcePath, cfg.mamePath, dryRun)
    return {
      success: true,
      totalOwned: result.totalOwned,
      installed: result.installed,
      installedNative: result.installedNative,
      installedConverted: result.installedConverted,
      installedFallback: result.installedFallback,
      skippedHasArt: result.skippedHasArt,
      conversionFailed: result.conversionFailed,
      notFound: result.notFound,
      installedNames: result.installedNames,
      dryRun: result.dryRun,
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('fetch-bezels-for-system', async (event, system) => {
  const cfg = config.load()
  const fs = require('fs')
  const retroDir = cfg.retroarchPath || 'F:\\RetroArch\\'
  const repo = BEZEL_SYSTEM_REPO[system]
  if (!repo) return { success: false, error: 'Bezel matching not yet supported for "' + system + '"' }

  const coreName = findInstalledCore(retroDir, system)
  const coreFolder = coreName && BEZEL_CORE_FOLDER_MAP[coreName.toLowerCase()]
  if (!coreFolder) {
    return { success: false, error: 'No supported installed core found for "' + system + '" -- checked: ' + (SYSTEM_CORE_CANDIDATES[system] || []).join(', ') }
  }

  const { scanRetroArchGames, fetchBezelProjectIndex, buildBezelIndexMaps, matchBezelTitle, installBezelForGame } = require('./scanner')

  const raScan = await scanRetroArchGames(cfg.retroarchGamesPath)
  const targets = raScan.games.filter(function(g) {
    return g.core === system && g.emulator === 'retroarch'
  })

  let index
  try {
    index = await fetchBezelProjectIndex(repo, coreFolder, path.join(retroDir, '.nuarcade-bezel-cache'))
  } catch (e) {
    return { success: false, error: 'Could not fetch Bezel Project index: ' + e.message }
  }
  const maps = buildBezelIndexMaps(index)

  let installed = 0, exact = 0, fuzzy = 0, missed = 0
  const missedTitles = []
  for (const game of targets) {
    const localTitle = path.basename(game.romPath, path.extname(game.romPath))
    const m = matchBezelTitle(localTitle, index, maps.normMap, maps.exactSet)
    if (m.status === 'none') { missed++; missedTitles.push(localTitle); continue }
    if (m.status === 'exact') exact++; else fuzzy++
    try {
      await installBezelForGame({
        repo: repo,
        coreFolder: coreFolder,
        matchedTitle: m.title,
        retroarchPath: retroDir,
        systemFolder: repo,
      })
      installed++
    } catch (e) {
      missed++
      missedTitles.push(localTitle + ' (fetch failed: ' + e.message + ')')
    }
  }

  return {
    success: true,
    total: targets.length,
    installed: installed,
    exact: exact,
    fuzzy: fuzzy,
    missed: missed,
    missedTitles: missedTitles.slice(0, 30),
    core: coreName,
    coreFolder: coreFolder,
  }
})

ipcMain.handle('scan-retroarch-games', async (event, retroarchGamesPath) => {
  const { scanRetroArchGames } = require('./scanner')
  return scanRetroArchGames(retroarchGamesPath)
})

// -- Project64 / N64 ---------------------------------------------------------
ipcMain.handle('launch-n64-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const p64Exe = path.join(cfg.project64Path || 'F:\\Project64\\', 'Project64.exe')
  try {
    await launchWithReturn(p64Exe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-n64-games', async (event, n64GamesPath) => {
  const { scanN64Games } = require('./scanner')
  return scanN64Games(n64GamesPath)
})

// -- DuckStation / PS1 -------------------------------------------------------
ipcMain.handle('launch-ps1-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const dsExe = path.join(cfg.duckstationPath || 'F:\\DuckStation\\', 'duckstation-qt-x64-ReleaseLTCG.exe')
  try {
    await launchWithReturn(dsExe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-ps1-games', async (event, ps1GamesPath) => {
  const { scanPs1Games } = require('./scanner')
  return scanPs1Games(ps1GamesPath)
})

// -- Flycast / Dreamcast -----------------------------------------------------
ipcMain.handle('launch-flycast-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const flyExe = path.join(cfg.flycastPath || 'F:\\Flycast\\', 'flycast.exe')
  try {
    await launchWithReturn(flyExe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-dreamcast-games', async (event, dreamcastGamesPath) => {
  const { scanDreamcastGames } = require('./scanner')
  return scanDreamcastGames(dreamcastGamesPath)
})

ipcMain.handle('launch-xemu-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const xemuExe = path.join(cfg.xemuPath || 'F:\\Xemu\\', 'xemu.exe')
  try {
    await launchWithReturn(xemuExe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Cxbx-Reloaded's executable name has varied across releases (older builds
// used Cxbx.exe, current ones use cxbxr-ldr.exe) -- scan for it defensively
// rather than assuming one fixed filename, same pattern as findMameExe.
function findCxbxExe(cxbxDir) {
  const preferred = path.join(cxbxDir, 'cxbxr-ldr.exe')
  if (fs.existsSync(preferred)) return preferred
  try {
    const entries = fs.readdirSync(cxbxDir)
    const match = entries.find(function(f) {
      return f.toLowerCase().startsWith('cxbx') && f.toLowerCase().endsWith('.exe')
    })
    if (match) return path.join(cxbxDir, match)
  } catch (e) {}
  return null
}

ipcMain.handle('launch-cxbx-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const cxbxDir = cfg.cxbxPath || 'F:\\Cxbx-Reloaded\\'
  const cxbxExe = findCxbxExe(cxbxDir)
  if (!cxbxExe) return { success: false, error: 'Cxbx-Reloaded executable not found in ' + cxbxDir }
  try {
    await launchWithReturn(cxbxExe, ['/load', gamePath], { cwd: cxbxDir, sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-xbox-games', async (event, xboxGamesPath) => {
  const { scanXboxGames } = require('./scanner')
  return scanXboxGames(xboxGamesPath)
})


// -- BIOS file checker -------------------------------------------------------
// Returns which BIOS files are present/missing for each emulator that needs them
ipcMain.handle('check-bios', async () => {
  const fs = require('fs')
  const cfg = config.load()
  const results = {}

  // PCSX2 - needs any file in bios folder
  const pcsx2Bios = path.join(cfg.pcsx2Path || 'F:\\PCSX2\\', 'bios')
  try {
    const files = fs.readdirSync(pcsx2Bios).filter(f => f.toLowerCase().endsWith('.bin'))
    results.pcsx2 = { found: files.length > 0, files, folder: pcsx2Bios }
  } catch (e) { results.pcsx2 = { found: false, files: [], folder: pcsx2Bios } }

  // Ryujinx - needs prod.keys in system folder
  const ryujinxSystem = path.join(cfg.ryujinxPath || 'F:\\Ryujinx\\', 'system')
  const prodKeys = path.join(ryujinxSystem, 'prod.keys')
  results.ryujinx = { found: fs.existsSync(prodKeys), files: fs.existsSync(prodKeys) ? ['prod.keys'] : [], folder: ryujinxSystem }

  // DuckStation - needs any .bin in a bios subfolder or scph*.bin anywhere under duckstation path
  const dsPath = cfg.duckstationPath || 'F:\\DuckStation\\'
  const dsBios = path.join(dsPath, 'bios')
  try {
    const files = fs.readdirSync(dsBios).filter(f => f.toLowerCase().endsWith('.bin'))
    results.duckstation = { found: files.length > 0, files, folder: dsBios }
  } catch (e) {
    // Try root of DuckStation folder
    try {
      const files = fs.readdirSync(dsPath).filter(f => f.toLowerCase().match(/scph.*\.bin/))
      results.duckstation = { found: files.length > 0, files, folder: dsPath }
    } catch (e2) { results.duckstation = { found: false, files: [], folder: dsBios } }
  }

  // Flycast - needs dc_boot.bin in data folder
  const flycastData = path.join(cfg.flycastPath || 'F:\\Flycast\\', 'data')
  const dcBoot = path.join(flycastData, 'dc_boot.bin')
  results.flycast = { found: fs.existsSync(dcBoot), files: fs.existsSync(dcBoot) ? ['dc_boot.bin'] : [], folder: flycastData }

  // Xemu - needs an MCPX boot ROM + BIOS flash file, both obtained from a
  // real Xbox. Xemu lets these be named/placed anywhere via its own
  // xemu.toml, so this checks its install folder for anything that looks
  // right rather than one fixed filename like the checks above.
  const xemuPath = cfg.xemuPath || 'F:\\Xemu\\'
  let xemuFiles = []
  try { xemuFiles = fs.readdirSync(xemuPath).filter(f => f.toLowerCase().endsWith('.bin')) } catch (e) {}
  const hasMcpx = xemuFiles.some(f => f.toLowerCase().includes('mcpx'))
  results.xemu = { found: hasMcpx && xemuFiles.length >= 2, files: xemuFiles, folder: xemuPath }

  return results
})


// -- Model 2 Emulator --------------------------------------------------------
ipcMain.handle('launch-model2-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const m2Exe = path.join(cfg.model2Path || 'F:\\Model2\\', 'emulator_multicpu.exe')
  const romName = path.basename(gamePath, path.extname(gamePath))
  try {
    await launchWithReturn(m2Exe, [romName], { cwd: path.dirname(m2Exe), sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-model2-games', async (event, model2GamesPath) => {
  const { scanModel2Games } = require('./scanner')
  return scanModel2Games(model2GamesPath)
})

// -- Model 3 / Supermodel ----------------------------------------------------
ipcMain.handle('launch-model3-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const m3Exe = path.join(cfg.model3Path || 'F:\\Supermodel\\', 'Supermodel.exe')
  try {
    await launchWithReturn(m3Exe, [gamePath, '-fullscreen'], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-model3-games', async (event, model3GamesPath) => {
  const { scanModel3Games } = require('./scanner')
  return scanModel3Games(model3GamesPath)
})

// -- Save text file (used by Export game list) --------------------------------
ipcMain.handle('save-txt', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Game List',
    defaultPath: defaultName || 'nuarcade-games.txt',
    filters: [{ name: 'Text File', extensions: ['txt'] }]
  })
  if (result.canceled || !result.filePath) return { success: false }
  const fs = require('fs')
  fs.writeFileSync(result.filePath, content, 'utf8')
  return { success: true, path: result.filePath }
})


// -- PPSSPP / PSP ------------------------------------------------------------
ipcMain.handle('launch-psp-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const ppssppExe = path.join(cfg.ppssppPath || 'F:\\PPSSPP\\', 'PPSSPPWindows64.exe')
  try {
    await launchWithReturn(ppssppExe, [gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-psp-games', async (event, pspGamesPath) => {
  const { scanPspGames } = require('./scanner')
  return scanPspGames(pspGamesPath)
})

// -- Cemu / Wii U ------------------------------------------------------------
ipcMain.handle('launch-wiiu-game', async (event, gamePath, sessionId) => {
  const cfg = config.load()
  const cemuExe = path.join(cfg.cemuPath || 'F:\\Cemu\\', 'Cemu.exe')
  try {
    await launchWithReturn(cemuExe, ['-f', '-g', gamePath], { sessionId })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('scan-wiiu-games', async (event, wiiUGamesPath) => {
  const { scanWiiUGames } = require('./scanner')
  return scanWiiUGames(wiiUGamesPath)
})


// -- Path verification -------------------------------------------------------
ipcMain.handle('check-path', async (event, folderPath) => {
  const fs = require('fs')
  try {
    return { exists: fs.existsSync(folderPath) }
  } catch (e) {
    return { exists: false }
  }
})

// -- Fuzzy emulator executable detection --------------------------------------
// Exact .exe filenames drift across emulator releases and forks (DuckStation's
// build name has changed over versions; Ryujinx was discontinued and forked
// into things like Ryubing) -- rather than requiring an exact match, this
// checks whether ANY .exe in the folder contains the given keyword, so
// detection survives those renames instead of silently going stale.
ipcMain.handle('find-exe-in-folder', async (event, folderPath, keyword) => {
  const fs = require('fs')
  const path = require('path')
  try {
    if (!folderPath || !fs.existsSync(folderPath)) return { found: false }
    const files = fs.readdirSync(folderPath)
    const kw = String(keyword).toLowerCase().replace(/[^a-z0-9]/g, '')
    const match = files.find(f => {
      if (path.extname(f).toLowerCase() !== '.exe') return false
      const norm = f.toLowerCase().replace(/[^a-z0-9]/g, '')
      return norm.includes(kw)
    })
    return { found: !!match, exeName: match || null }
  } catch (e) {
    return { found: false, error: e.message }
  }
})
// Creates all required F: drive folders on first launch if they don't exist.
// Mirrors the NSIS installer script as a belt-and-suspenders fallback.
function ensureCabinetFolders() {
  const fs = require('fs')
  if (!fs.existsSync('F:\\')) return // not a cabinet PC
  const folders = [
    'F:\\TeknoParrot', 'F:\\MAME', 'F:\\MAME\\roms',
    'F:\\Model2', 'F:\\Supermodel',
    'F:\\RetroArch', 'F:\\RetroArch\\system',
    'F:\\Project64', 'F:\\DuckStation', 'F:\\Flycast',
    'F:\\PPSSPP', 'F:\\PCSX2', 'F:\\RPCS3',
    'F:\\Xenia', 'F:\\Dolphin', 'F:\\Cemu', 'F:\\Ryujinx',
    'F:\\vPinball',
    'F:\\ArcadeGames', 'F:\\RetroArchGames',
    'F:\\N64Games', 'F:\\PS1Games', 'F:\\DreamcastGames',
    'F:\\PSPGames', 'F:\\PS2Games', 'F:\\PS3Games',
    'F:\\Xbox360Games', 'F:\\GCWiiGames', 'F:\\WiiUGames',
    'F:\\SwitchGames', 'F:\\Model2Games', 'F:\\Model3Games',
    'F:\\PinballTables',
    'F:\\Media', 'F:\\Media\\Videos', 'F:\\Media\\Artwork',
  ]
  folders.forEach(f => {
    try { fs.mkdirSync(f, { recursive: true }) } catch (e) {}
  })
}


// -- Pixelcade integration ---------------------------------------------------
// Sends game metadata to a local Pixelcade device via HTTP on game select/launch
// Pixelcade API: http://<ip>:<port>/api/v1/game (POST)
ipcMain.handle('pixelcade-push', async (event, gameData) => {
  const cfg = config.load()
  if (!cfg.pixelcade?.enabled || !cfg.pixelcade?.ip) return { ok: false, reason: 'disabled' }

  const url = `http://${cfg.pixelcade.ip}:${cfg.pixelcade.port || 8080}/api/v1/game`
  try {
    const http = require('http')
    const body = JSON.stringify({
      name:       gameData.title    || '',
      system:     gameData.system   || gameData.genre || '',
      emulator:   gameData.emulator || '',
      marqueeUrl: gameData.hero     || gameData.capsule || '',
    })
    await new Promise((resolve, reject) => {
      const req = http.request(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 1500,
      }, (res) => { res.resume(); resolve({ ok: true, status: res.statusCode }) })
      req.on('error',   reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
      req.write(body)
      req.end()
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
})


// -- Steam games -------------------------------------------------------------
ipcMain.handle('scan-steam-games', async (event, steamPath) => {
  const { scanSteamGames } = require('./scanner')
  return scanSteamGames(steamPath)
})
ipcMain.handle('launch-steam-game', async (event, appId, sessionId) => {
  launchViaShellCommand('start steam://rungameid/' + appId, sessionId)
  return { ok: true }
})

// -- PC / Non-Steam games ----------------------------------------------------
ipcMain.handle('scan-pc-games', async (event, pcGamesPath) => {
  const { scanPcGames } = require('./scanner')
  return scanPcGames(pcGamesPath)
})
ipcMain.handle('launch-pc-game', async (event, exePath, sessionId) => {
  const path = require('path')
  try {
    launchDetachedFireAndForget(exePath, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exePath) }, sessionId)
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

// -- Launch lifecycle status query --------------------------------------------
// Single source of truth query: the same normalized 11-key shape the
// 'launch-lifecycle-terminal' push event carries. Unknown/evicted sessions
// normalize conservatively (see launchRegistry.js) rather than throwing.
ipcMain.handle('get-launch-lifecycle-status', (event, sessionId) => {
  return launchRegistry.getStatus(sessionId)
})


// -- LED / External Event Hooks -----------------------------------------------
// These IPC handlers fire when games are selected or launched.
// External scripts (Pixelcade, LedBlinky, stream overlays) can subscribe
// by reading the event log file or via a local HTTP webhook if configured.

const EVENT_LOG_PATH = require('path').join(require('electron').app.getPath('userData'), 'nuarcade-events.json')

function writeEvent(type, payload) {
  try {
    const fs = require('fs')
    const event = { type, timestamp: new Date().toISOString(), ...payload }
    fs.writeFileSync(EVENT_LOG_PATH, JSON.stringify(event, null, 2), 'utf8')
  } catch (e) {}
}

// Fired when user navigates to a game on the wheel
ipcMain.handle('game-selected', async (event, gameData) => {
  writeEvent('game-selected', {
    title:    gameData.title,
    system:   gameData.system,
    genre:    gameData.genre,
    emulator: gameData.emulator,
    id:       gameData.id || gameData.profile,
  })
  return { ok: true }
})

// Fired when a game is launched
ipcMain.handle('game-launched', async (event, gameData) => {
  writeEvent('game-launched', {
    title:    gameData.title,
    system:   gameData.system,
    genre:    gameData.genre,
    emulator: gameData.emulator,
    id:       gameData.id || gameData.profile,
  })
  return { ok: true }
})

// Returns path to the event log file (for external scripts to watch)
ipcMain.handle('get-event-log-path', () => EVENT_LOG_PATH)


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('close-app', () => {
  app.quit()
})

// -- Video library scan -------------------------------------------------------
// Returns { [gameId]: filePath } for every .mp4 found in the Videos folder.
// Also merges in anything recorded in videos.json from prior downloads.
ipcMain.handle('get-videos', async () => {
  try {
    const fs = require('fs')
    const cfg = config.load()
    const videosDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'Videos')
    const result = {}

    // Merge persisted download registry
    const registryPath = path.join(cfg.mediaPath || 'F:\\Media\\', 'videos.json')
    if (fs.existsSync(registryPath)) {
      try {
        const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
        Object.assign(result, reg)
      } catch {}
    }

    // Scan folder for .mp4 files -- skip yt-dlp fragment files (*.fNNN.mp4)
    // but DO NOT delete anything. Attract mode proves files exist and work.
    if (fs.existsSync(videosDir)) {
      const files = fs.readdirSync(videosDir)
      files.forEach(f => {
        if (!f.toLowerCase().endsWith('.mp4')) return
        // Skip fragment files like AAA.f397.mp4, ActionDeka.f135.mp4
        // These have a format code (.fNNN) before the .mp4 extension
        if (/\.f\d+\.mp4$/i.test(f)) return

        let gameId = f.slice(0, -4) // strip .mp4
        // Strip _tmp_TIMESTAMP suffix if present
        gameId = gameId.replace(/_tmp_\d+$/, '')

        const fullPath = path.join(videosDir, f)
        if (!result[gameId]) result[gameId] = fullPath
      })
    }

    return { videos: result }
  } catch (e) {
    return { videos: {}, error: e.message }
  }
})

// -- Orphaned media cleanup ---------------------------------------------------
// Finds video/artwork files and artwork localStorage entries whose gameId no
// longer matches any currently-scanned game -- e.g. left over after a scanner
// fix stops recognizing folders that were never real games in the first place.
// Read-only: only reports what it finds, never deletes anything by itself.
ipcMain.handle('find-orphaned-media', async (event, validIds) => {
  const fs = require('fs')
  const cfg = config.load()
  const validSet = new Set(validIds)

  const videosDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'Videos')
  const artworkDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'Artwork')

  const orphanedVideos = []
  const staleFragments = []
  const orphanedArtwork = []

  try {
    if (fs.existsSync(videosDir)) {
      for (const f of fs.readdirSync(videosDir)) {
        if (!f.toLowerCase().endsWith('.mp4')) continue
        const fullPath = path.join(videosDir, f)
        // Leftover yt-dlp fragment files from failed/interrupted downloads
        if (/\.f\d+\.mp4$/i.test(f)) {
          staleFragments.push(fullPath)
          continue
        }
        const gameId = f.replace(/\.mp4$/i, '')
        if (!validSet.has(gameId)) orphanedVideos.push(fullPath)
      }
    }
  } catch (e) { /* non-fatal */ }

  try {
    if (fs.existsSync(artworkDir)) {
      for (const f of fs.readdirSync(artworkDir)) {
        // Only touch files that actually match our own naming pattern --
        // stray non-artwork files (Thumbs.db, .DS_Store, etc.) shouldn't be
        // flagged as orphaned game art just because they don't match a
        // valid game id.
        if (!/_(capsule|hero)\.[a-z0-9]+$/i.test(f)) continue
        const fullPath = path.join(artworkDir, f)
        const gameId = f.replace(/_(capsule|hero)\.[^.]+$/i, '')
        if (!validSet.has(gameId)) orphanedArtwork.push(fullPath)
      }
    }
  } catch (e) { /* non-fatal */ }

  return { orphanedVideos, staleFragments, orphanedArtwork }
})

// -- Delete orphaned media ----------------------------------------------------
// Deletes exactly the file paths handed in from a prior find-orphaned-media
// call -- never re-computes what's "orphaned" itself, so there's no chance of
// deleting something the person didn't actually see and approve.
ipcMain.handle('delete-orphaned-media', async (event, filePaths) => {
  const fs = require('fs')
  let deleted = 0
  const errors = []
  for (const p of (filePaths || [])) {
    try {
      fs.unlinkSync(p)
      deleted++
    } catch (e) {
      errors.push({ path: p, error: e.message })
    }
  }
  return { deleted, errors }
})

// -- System logos for the category strip --------------------------------------
// Reads any image files dropped into SystemLogos/ and maps them by filename
// (minus extension, lowercased) to a system/category name -- e.g.
// SystemLogos/xbox360.png shows up for the "Xbox360" category pill. Never
// creates or ships any logo images itself, just loads what's already there.
ipcMain.handle('get-system-logos', async () => {
  const fs = require('fs')
  const cfg = config.load()
  const logosDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'SystemLogos')
  const logos = {}

  try {
    if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true })
    const IMG_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']
    for (const f of fs.readdirSync(logosDir)) {
      const ext = path.extname(f).toLowerCase()
      if (!IMG_EXTS.includes(ext)) continue
      const key = path.basename(f, ext).toLowerCase()
      logos[key] = 'file:///' + path.join(logosDir, f).replace(/\\/g, '/')
    }
  } catch (e) { /* non-fatal */ }

  return { logos, logosDir }
})

// -- yt-dlp: search YouTube for a game video preview --------------------------
// Returns { title, videoId, thumbnail, duration } or { error }
// -- yt-dlp: auto-download the exe if missing ---------------------------------
// Downloads yt-dlp.exe from GitHub releases into the configured path.
// Returns { success, path } or { success: false, error }
ipcMain.handle('ensure-ytdlp', async (event) => {
  const fs = require('fs')
  const https = require('https')
  const cfg = config.load()
  const ytdlpExe = cfg.ytdlpPath || 'F:\\Tools\\yt-dlp.exe'

  // Already present -- nothing to do
  if (fs.existsSync(ytdlpExe)) {
    return { success: true, path: ytdlpExe, alreadyPresent: true }
  }

  // Make sure the parent folder exists
  try {
    fs.mkdirSync(path.dirname(ytdlpExe), { recursive: true })
  } catch (e) {
    return { success: false, error: 'Could not create folder ' + path.dirname(ytdlpExe) + ': ' + e.message }
  }

  const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'

  // Download via https.get (follows redirects, works in Electron main process)
  const downloadFile = (url, destPath, redirectCount = 0) => new Promise((resolve, reject) => {
    if (redirectCount > 5) { reject(new Error('Too many redirects')); return }
    https.get(url, { headers: { 'User-Agent': 'NuArcade/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        resolve(downloadFile(res.headers.location, destPath, redirectCount + 1))
        return
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
      const out = fs.createWriteStream(destPath)
      res.pipe(out)
      out.on('finish', () => out.close(resolve))
      out.on('error', reject)
      res.on('error', reject)
    }).on('error', reject)
  })

  try {
    await downloadFile(YTDLP_URL, ytdlpExe)
    return { success: true, path: ytdlpExe, alreadyPresent: false }
  } catch (e) {
    return { success: false, error: 'Download failed: ' + (e.message || String(e)) }
  }
})

// -- yt-dlp: AI-refined YouTube search ---------------------------------------
// Uses Anthropic API (claude-haiku-4-5) to generate the optimal search query
// for the game, then searches YouTube and returns the top result metadata.
// Falls back to a basic query if the API call fails or is not configured.
// Returns { title, videoId, thumbnail, duration, query } or { error }
ipcMain.handle('ytdlp-search', async (event, { gameTitle, gameId, system, emulator, genre }) => {
  const fs = require('fs')
  const https = require('https')
  const { spawn } = require('child_process')
  const cfg = config.load()
  const ytdlpExe = cfg.ytdlpPath || 'F:\\Tools\\yt-dlp.exe'

  // Auto-download yt-dlp if missing
  if (!fs.existsSync(ytdlpExe)) {
    const ensureResult = await new Promise((resolve) => {
      try {
        fs.mkdirSync(path.dirname(ytdlpExe), { recursive: true })
      } catch (e) { resolve({ success: false, error: e.message }); return }

      const downloadFile = (url, dest, hops = 0) => {
        if (hops > 5) { resolve({ success: false, error: 'Too many redirects' }); return }
        https.get(url, { headers: { 'User-Agent': 'NuArcade/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            downloadFile(res.headers.location, dest, hops + 1); return
          }
          if (res.statusCode !== 200) { resolve({ success: false, error: 'HTTP ' + res.statusCode }); return }
          const out = fs.createWriteStream(dest)
          res.pipe(out)
          out.on('finish', () => out.close(() => resolve({ success: true })))
          out.on('error', e => resolve({ success: false, error: e.message }))
          res.on('error', e => resolve({ success: false, error: e.message }))
        }).on('error', e => resolve({ success: false, error: e.message }))
      }
      downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', ytdlpExe)
    })
    if (!ensureResult.success) {
      return { error: 'Could not auto-download yt-dlp: ' + ensureResult.error }
    }
  }

  // -- AI query refinement ---------------------------------------------------
  // Use claude-haiku-4-5 to generate the optimal YouTube search string.
  // An 8-second timeout ensures this never blocks the search.
  // Default query -- system context helps narrow results even without AI
  const systemHint = system && system !== 'MAME' ? ' ' + system : system === 'MAME' ? ' MAME arcade' : ' arcade'
  let searchQuery = gameTitle + systemHint + ' gameplay'

  const anthropicKey = cfg.anthropicApiKey || ''
  if (anthropicKey) {
    try {
      const systemContext = [
        system   ? 'System: ' + system   : null,
        emulator ? 'Emulator: ' + emulator : null,
        genre    ? 'Genre: ' + genre     : null,
      ].filter(Boolean).join(', ')

      const prompt = 'Generate a YouTube search query to find authentic arcade gameplay footage of this game.\n\nGame: "' + gameTitle + '"' + (systemContext ? '\n' + systemContext : '') + '\n\nRules:\n- Include the game title and platform/system if it helps\n- Include "gameplay" or "arcade" \n- Do NOT include: review, unboxing, reaction, speedrun, tutorial\n- 4-8 words maximum\n- No quotation marks\n\nRespond with ONLY the search query, nothing else.'

      const apiResult = await new Promise((resolve) => {
        const body = JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 60,
          messages: [{ role: 'user', content: prompt }],
        })

        const req = https.request({
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(body),
          },
        }, (res) => {
          let data = ''
          res.on('data', d => { data += d })
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data)
              const text = (parsed && parsed.content && parsed.content[0] && parsed.content[0].text || '').trim()
              resolve({ success: true, query: text || null })
            } catch (e) {
              resolve({ success: false })
            }
          })
        })

        req.on('error', () => resolve({ success: false }))
        req.setTimeout(8000, () => { req.destroy(); resolve({ success: false }) })
        req.write(body)
        req.end()
      })

      if (apiResult.success && apiResult.query && apiResult.query.length > 3) {
        searchQuery = apiResult.query
      }
    } catch (e) {
      // Fall through to default query -- never block the search
    }
  }

  // -- YouTube search with automatic fallback retry -------------------------
  // Attempt up to 3 queries with progressively simpler terms.
  // This handles games where the full title returns no valid result.

  // Build fallback query ladder
  const buildFallbacks = (title, sys) => {
    // Fallback 1: strip subtitles (after : - / |), version numbers, region codes
    const stripped = title
      .replace(/[:\-/|].*$/, '')          // remove subtitle
      .replace(/\b(v\d+|\d+st|\d+nd|\d+rd|\d+th|edition|ver\.?\s*\d+)\b/gi, '')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')     // remove special chars
      .replace(/\s+/g, ' ')
      .trim()
    const fb1 = (stripped || title) + ' arcade gameplay'

    // Fallback 2: first two significant words only + "game"
    const words = (stripped || title)
      .split(' ')
      .filter(w => w.length > 2 && !/^(the|and|for|of|in|on|at|to|a|an)$/i.test(w))
    const fb2 = words.slice(0, 2).join(' ') + ' game gameplay'

    return [fb1, fb2].filter(Boolean)
  }

  const fallbacks = buildFallbacks(gameTitle, system)
  const queryLadder = [searchQuery, ...fallbacks].filter((q, i, arr) => arr.indexOf(q) === i) // dedupe

  // Run one yt-dlp search attempt
  const runSearch = (query) => new Promise((resolve) => {
    const DELIM = '|||NUARCADE|||'
    const args = [
      'ytsearch1:' + query,
      '--print', '%(id)s' + DELIM + '%(title)s' + DELIM + '%(thumbnail)s' + DELIM + '%(duration_string)s',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '15',
    ]

    let stdout = ''
    let stderr = ''
    const proc = spawn(ytdlpExe, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    proc.stdout.on('data', d => { stdout += d.toString() })
    proc.stderr.on('data', d => { stderr += d.toString() })

    const timer = setTimeout(() => { proc.kill(); resolve(null) }, 20000)

    proc.on('close', () => {
      clearTimeout(timer)
      const line = stdout.trim().split('\n')[0] || ''
      const parts = line.split(DELIM)
      if (parts.length < 2 || !parts[0]) { resolve(null); return }
      const rawId = parts[0].trim()
      if (!/^[a-zA-Z0-9_-]{11}$/.test(rawId)) { resolve(null); return }
      resolve({
        videoId:   rawId,
        title:     (parts[1] || gameTitle).trim(),
        thumbnail: (parts[2] || '').trim() || null,
        duration:  (parts[3] || '').trim() || null,
      })
    })

    proc.on('error', () => { clearTimeout(timer); resolve(null) })
  })

  // Try each query in the ladder until one returns a valid result
  for (let attempt = 0; attempt < queryLadder.length; attempt++) {
    const q = queryLadder[attempt]
    const result = await runSearch(q)
    if (result) {
      return {
        ...result,
        query: q,
        attempt: attempt + 1,
      }
    }
  }

  return { error: 'No valid YouTube result found after ' + queryLadder.length + ' attempts for: ' + gameTitle }
})

// -- yt-dlp: download and trim a YouTube video to 40s -------------------------
// Returns { success, outputFile } or { success: false, error }
ipcMain.handle('ytdlp-download', async (event, { videoId, gameId }) => {
  const fs = require('fs')
  const { spawn } = require('child_process')
  const cfg = config.load()

  // Validate video ID before doing anything -- prevents "Unsupported URL" errors
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { success: false, error: 'Invalid video ID: "' + String(videoId).slice(0, 20) + '"' }
  }
  const ytdlpExe = cfg.ytdlpPath || 'F:\\Tools\\yt-dlp.exe'
  const videosDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'Videos')
  const outputFile = path.join(videosDir, gameId + '.mp4')

  // Auto-download yt-dlp if missing using https.get
  if (!fs.existsSync(ytdlpExe)) {
    const dlResult = await new Promise((resolve) => {
      try { fs.mkdirSync(path.dirname(ytdlpExe), { recursive: true }) }
      catch (e) { resolve({ success: false, error: e.message }); return }
      const https = require('https')
      const downloadFile = (url, dest, hops = 0) => {
        if (hops > 5) { resolve({ success: false, error: 'Too many redirects' }); return }
        https.get(url, { headers: { 'User-Agent': 'NuArcade/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            downloadFile(res.headers.location, dest, hops + 1); return
          }
          if (res.statusCode !== 200) { resolve({ success: false, error: 'HTTP ' + res.statusCode }); return }
          const out = fs.createWriteStream(dest)
          res.pipe(out)
          out.on('finish', () => out.close(() => resolve({ success: true })))
          out.on('error', e => resolve({ success: false, error: e.message }))
          res.on('error', e => resolve({ success: false, error: e.message }))
        }).on('error', e => resolve({ success: false, error: e.message }))
      }
      downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', ytdlpExe)
    })
    if (!dlResult.success) return { success: false, error: 'Could not auto-download yt-dlp: ' + dlResult.error }
  }

  try {
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true })
  } catch (e) {
    return { success: false, error: 'Could not create Videos folder: ' + e.message }
  }

  // -- Download: 480p + trim to 40s via yt-dlp's bundled ffmpeg ---------------
  // --download-sections requires a standalone ffmpeg install -- not reliable
  // on cabinet PCs. --postprocessor-args 'ffmpeg:-t 40' uses yt-dlp's own
  // bundled ffmpeg for the merge/trim, which is always present.

  const saveRegistry = () => {
    try {
      const registryPath = path.join(cfg.mediaPath || 'F:\\Media\\', 'videos.json')
      const videos = JSON.parse(fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '{}')
      videos[gameId] = outputFile
      fs.writeFileSync(registryPath, JSON.stringify(videos))
    } catch {}
  }

  return new Promise((resolve) => {
    const url = 'https://www.youtube.com/watch?v=' + videoId

    // Attempts one download. useCookies pulls an already-logged-in browser
    // session's cookies, which is the standard 2026 fix for YouTube's
    // "Sign in to confirm you're not a bot" bot-detection wall -- but it
    // only helps if the person is actually logged into YouTube in that
    // browser on this same machine, and if the browser/profile isn't found
    // yt-dlp can hard-fail rather than gracefully skip it. So: try with
    // cookies first, and if that whole attempt fails for any reason, retry
    // once without cookies -- this never makes a working case worse.
    const attemptDownload = (useCookies) => new Promise((attemptResolve) => {
      const tempId = gameId + '_tmp_' + Date.now() + '_' + (useCookies ? 'c' : 'n')
      const tempFile = path.join(videosDir, tempId + '.mp4')

      const dlArgs = [
        url,
        '--format', 'bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/best[ext=mp4][height<=480]/best[height<=480]/best',
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'ffmpeg:-t 40',
        '--output', tempFile,
        '--no-playlist',
        '--no-warnings',
        '--socket-timeout', '20',
        '--retries', '2',
        ...(useCookies ? ['--cookies-from-browser', 'chrome'] : []),
      ]

      let dlStderr = ''
      const dlProc = spawn(ytdlpExe, dlArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
      dlProc.stderr.on('data', d => { dlStderr += d.toString() })

      const dlTimer = setTimeout(() => {
        dlProc.kill()
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile) } catch {}
        attemptResolve({ success: false, error: 'Download timed out after 3 minutes' })
      }, 180000)

      dlProc.on('error', (e) => {
        clearTimeout(dlTimer)
        attemptResolve({ success: false, error: 'yt-dlp spawn error: ' + e.message })
      })

      dlProc.on('close', (code) => {
        clearTimeout(dlTimer)

        if (code !== 0) {
          try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile) } catch {}
          return attemptResolve({ success: false, error: dlStderr.slice(-400) || 'yt-dlp exited with code ' + code })
        }

        let foundFile = null
        if (fs.existsSync(tempFile)) {
          foundFile = tempFile
        } else {
          try {
            const match = fs.readdirSync(videosDir)
              .filter(f => f.startsWith(tempId) && f.toLowerCase().endsWith('.mp4'))
            if (match.length > 0) foundFile = path.join(videosDir, match[0])
          } catch {}
        }

        if (!foundFile) {
          return attemptResolve({ success: false, error: 'yt-dlp finished but temp file not found (tempId: ' + tempId + ')' })
        }

        attemptResolve({ success: true, foundFile })
      })
    })

    ;(async () => {
      let result = await attemptDownload(true)
      if (!result.success) {
        result = await attemptDownload(false)
      }

      if (!result.success) {
        resolve(result)
        return
      }

      // Rename temp -> final gameId path
      try {
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
        fs.renameSync(result.foundFile, outputFile)
      } catch (e) {
        saveRegistry()
        resolve({ success: true, outputFile: result.foundFile, startSec: 0 })
        return
      }

      saveRegistry()
      resolve({ success: true, outputFile, startSec: 0 })
    })()
  })
})


// -- Music: scan F:/Media/Music/ for mp3 files ----------------------------
ipcMain.handle('get-music-tracks', async () => {
  const fs = require('fs')
  const cfg = config.load()
  const musicDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'Music')
  if (!fs.existsSync(musicDir)) return { tracks: [], dir: musicDir }
  try {
    const files = fs.readdirSync(musicDir)
    const tracks = files
      .filter(f => /\.(mp3|ogg|wav|flac|m4a)$/i.test(f))
      .map(f => ({
        name: f.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
        path: 'file:///' + path.join(musicDir, f).replace(/\\/g, '/'),
      }))
    return { tracks, dir: musicDir }
  } catch (e) {
    return { tracks: [], dir: musicDir, error: e.message }
  }
})

// -- Auto-updater: download installer and run it ----------------------------
ipcMain.handle('download-update', async (event, { version, downloadUrl }) => {
  const fs = require('fs')
  const https = require('https')
  const os = require('os')

  const tmpDir = os.tmpdir()
  const installerPath = path.join(tmpDir, 'NuArcade-Setup-' + version + '.exe')

  // If already downloaded, skip
  if (fs.existsSync(installerPath)) {
    return { success: true, installerPath, cached: true }
  }

  return new Promise((resolve) => {
    const downloadFile = (url, dest, hops = 0) => {
      if (hops > 5) { resolve({ success: false, error: 'Too many redirects' }); return }
      https.get(url, { headers: { 'User-Agent': 'NuArcade/' + app.getVersion() } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadFile(res.headers.location, dest, hops + 1); return
        }
        if (res.statusCode !== 200) {
          resolve({ success: false, error: 'HTTP ' + res.statusCode }); return
        }
        const out = fs.createWriteStream(dest)
        let downloaded = 0
        const total = parseInt(res.headers['content-length'] || '0')
        res.on('data', chunk => {
          downloaded += chunk.length
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100)
            event.sender.send('update-progress', { pct, downloaded, total })
          }
        })
        res.pipe(out)
        out.on('finish', () => out.close(() => resolve({ success: true, installerPath: dest })))
        out.on('error', e => resolve({ success: false, error: e.message }))
        res.on('error', e => resolve({ success: false, error: e.message }))
      }).on('error', e => resolve({ success: false, error: e.message }))
    }
    downloadFile(downloadUrl, installerPath)
  })
})

ipcMain.handle('install-update', async (event, { installerPath }) => {
  const fs = require('fs')
  const { spawn } = require('child_process')
  if (!fs.existsSync(installerPath)) {
    return { success: false, error: 'Installer not found at ' + installerPath }
  }
  // Run installer with /S for silent install -- NSIS silent flag
  // The installer will close NuArcade as part of install process
  spawn(installerPath, ['/S'], {
    detached: true,
    stdio: 'ignore',
  }).unref()
  // Give the installer a moment to start, then quit so it can replace files
  setTimeout(() => app.quit(), 1500)
  return { success: true }
})

// -- AI Natural Language Search ----------------------------------------------
const SEARCH_API_URL = 'https://nuarcade-coach-api-production.up.railway.app/search'

ipcMain.handle('ai-search', async (event, { query, games }) => {
  const { net } = require('electron')
  const body = JSON.stringify({ query, games })

  return new Promise((resolve) => {
    const req = net.request({ method: 'POST', url: SEARCH_API_URL })
    req.setHeader('Content-Type', 'application/json')
    req.setHeader('x-nuarcade-secret', 'f4254611727ff019d5fe9fb1042967ba433e5c3c0451e96991687d33e31d48f7')

    req.on('response', (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve({ error: 'Invalid response', results: [] }) }
      })
      res.on('error', e => resolve({ error: e.message, results: [] }))
    })
    req.on('error', e => resolve({ error: e.message, results: [] }))
    req.write(body)
    req.end()
  })
})

// -- AI Game Coach -----------------------------------------------------------
// Calls Railway proxy (non-streaming JSON) - no SSE, no socket issues
const COACH_API_URL = 'https://nuarcade-coach-api-production.up.railway.app/coach'
const COACH_SECRET  = 'f4254611727ff019d5fe9fb1042967ba433e5c3c0451e96991687d33e31d48f7'

ipcMain.handle('game-coach', async (event, { gameTitle, system, genre, emulator }) => {
  const https = require('https')
  const body = JSON.stringify({ gameTitle, system, genre, emulator })
  const url = new URL(COACH_API_URL)

  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-nuarcade-secret': COACH_SECRET,
      },
    }
    let data = ''
    const req = https.request(options, (res) => {
      console.log('[COACH] HTTP status:', res.statusCode)
      res.on('data', c => { data += c })
      res.on('end', () => {
        console.log('[COACH] Raw response:', data.slice(0, 300))
        try {
          const parsed = JSON.parse(data)
          console.log('[COACH] text length:', parsed.text && parsed.text.length, 'error:', parsed.error)
          if (parsed.error) return resolve({ error: parsed.error })
          resolve({ success: true, text: parsed.text || '' })
        } catch (e) {
          console.log('[COACH] parse error:', e.message)
          resolve({ error: e.message })
        }
      })
      res.on('error', e => { console.log('[COACH] res error:', e.message); resolve({ error: e.message }) })
    })
    req.setTimeout(30000, () => { req.destroy(); resolve({ error: 'Request timed out' }) })
    req.on('error', e => resolve({ error: e.message }))
    req.write(body)
    req.end()
  })
})

// -- App version --------------------------------------------------------------
ipcMain.on('get-version', (event) => {
  event.returnValue = 'v' + app.getVersion()
})
ipcMain.handle('tp-auto-configure', async () => {
  const fs = require('fs')
  const cfg = config.load()
  const tpPath        = cfg.teknoParrotPath || 'F:\\TeknoParrot\\'
  const gamesFolders  = cfg.gamesFolderPath || 'F:\\ArcadeGames\\'
  const profilesDir   = path.join(tpPath, 'GameProfiles')
  const userProfiles  = path.join(tpPath, 'UserProfiles')

  if (!fs.existsSync(profilesDir)) {
    return { success: false, error: 'GameProfiles folder not found at: ' + profilesDir }
  }

  // Helper: recursively find a file by name under a root folder (depth-limited)
  function findFile(root, name, depth) {
    if (depth > 5) return null
    let entries
    try { entries = fs.readdirSync(root, { withFileTypes: true }) } catch { return null }
    for (const e of entries) {
      const full = path.join(root, e.name)
      if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return full
      if (e.isDirectory()) {
        const found = findFile(full, name, depth + 1)
        if (found) return found
      }
    }
    return null
  }

  const xmlFiles = fs.readdirSync(profilesDir).filter(f => f.toLowerCase().endsWith('.xml'))
  const { XMLParser } = require('fast-xml-parser')
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true })

  const results = []
  let configured = 0
  let skipped = 0
  let notFound = 0

  for (const xmlFile of xmlFiles) {
    const xmlPath = path.join(profilesDir, xmlFile)
    let raw, data, profile
    try {
      raw = fs.readFileSync(xmlPath, 'utf8')
      data = parser.parse(raw)
      profile = data?.GameProfile || data?.UserProfile
    } catch { skipped++; continue }
    if (!profile) { skipped++; continue }

    const exeName = profile.ExecutableName || profile.Executable || ''
    const title   = profile.GameName || profile.Description || xmlFile
    if (!exeName) { skipped++; continue }

    // Search ArcadeGames folder for this exe
    const exePath = findFile(gamesFolders, exeName, 0)
    if (!exePath) { notFound++; results.push({ title, status: 'not_found', exe: exeName }); continue }

    // Write the path into UserProfiles XML (create if missing, update if exists)
    const userProfilePath = path.join(userProfiles, xmlFile)
    let userRaw
    try {
      userRaw = fs.existsSync(userProfilePath)
        ? fs.readFileSync(userProfilePath, 'utf8')
        : raw  // start from GameProfile as template
    } catch { userRaw = raw }

    // Update or insert GamePath using regex on raw XML string
    const gameDir = path.dirname(exePath)
    if (/<GamePath>/i.test(userRaw)) {
      userRaw = userRaw.replace(/<GamePath>.*?<\/GamePath>/i, `<GamePath>${exePath}<\/GamePath>`)
    } else if (/<ExecutablePath>/i.test(userRaw)) {
      userRaw = userRaw.replace(/<ExecutablePath>.*?<\/ExecutablePath>/i, `<ExecutablePath>${exePath}<\/ExecutablePath>`)
    } else {
      // Insert before closing tag
      userRaw = userRaw.replace(/<\/(GameProfile|UserProfile)>/, `  <GamePath>${exePath}<\/GamePath>\n<\/$1>`)
    }

    // Also update GameLocation if present
    if (/<GameLocation>/i.test(userRaw)) {
      userRaw = userRaw.replace(/<GameLocation>.*?<\/GameLocation>/i, `<GameLocation>${gameDir}<\/GameLocation>`)
    }

    try {
      if (!fs.existsSync(userProfiles)) fs.mkdirSync(userProfiles, { recursive: true })
      fs.writeFileSync(userProfilePath, userRaw, 'utf8')
      configured++
      results.push({ title, status: 'configured', exe: exeName, path: exePath })
    } catch (e) {
      results.push({ title, status: 'error', error: e.message })
    }
  }

  return { success: true, configured, notFound, skipped, results }
})


// --- Media utility IPC handlers ---
ipcMain.handle('open-url', async (event, url) => {
  await shell.openExternal(url)
  return { success: true }
})

ipcMain.handle('pick-folder', async (event) => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('link-snaps-folder', async (event, srcFolder) => {
  const fs = require('fs')
  const cfg = config.load()
  const mediaRoot = cfg.mediaPath || 'F:\\Media'
  const systems = [
    'MAME', 'TeknoParrot', 'RPCS3', 'Xenia', 'Dolphin',
    'PCSX2', 'Ryujinx', 'DuckStation', 'Flycast', 'PPSSPP',
    'Cemu', 'Model2', 'Model3', 'RetroArch', 'Steam', 'PC'
  ]
  let copied = 0
  for (const sys of systems) {
    const destSnap = path.join(mediaRoot, sys, 'Images', 'Snap')
    if (!fs.existsSync(destSnap)) continue
    const srcSys = path.join(srcFolder, sys)
    if (!fs.existsSync(srcSys)) continue
    try {
      for (const f of fs.readdirSync(srcSys)) {
        const ext = path.extname(f).toLowerCase()
        if (!['.png','.jpg','.jpeg'].includes(ext)) continue
        fs.copyFileSync(path.join(srcSys, f), path.join(destSnap, f))
        copied++
      }
    } catch (e) { /* skip */ }
  }
  return { success: true, copied }
})

// STEP 1: Ensure media folder structure -- STEP 2: Scan media folders and patch game objects
ipcMain.handle('scan-media', async (event, games) => {
  const cfg = config.load()
  const mediaRoot = cfg.mediaPath || 'F:\\Media'
  try {
    const patched = scanMedia(games, mediaRoot)
    return { success: true, games: patched }
  } catch (e) {
    return { success: false, error: e.message, games }
  }
})

ipcMain.handle('ensure-media-folders', async (event, customPath) => {
  const fs = require('fs')
  const cfg = config.load()
  const mediaRoot = customPath || cfg.mediaPath || 'F:\\Media'
  const FOLDER_SCHEMA_VERSION = '4.4.7'

  // Version-stamped: re-run whenever schema version advances
  const storedVersion = cfg.mediaFoldersVersion || '0'
  const alreadyDone = storedVersion === FOLDER_SCHEMA_VERSION

  const created = []
  const skipped = []

  const ensure = (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      created.push(dir)
    } else {
      skipped.push(dir)
    }
  }

  try {
    // Dead-code note: an earlier "Images\\Box Art" / "Images\\Cabinet Art"
    // per-system folder scheme used to be built here (Step 1), using its own
    // stale systems list that included individual RetroArch sub-systems like
    // NES/SNES/Amiga. Confirmed nothing anywhere in the codebase ever reads
    // from that structure -- it was pure dead weight, and the direct source
    // of confusing extra folders. Removed. Only the root folder itself needs
    // creating before the real EmuMovies-compatible structure below.
    ensure(mediaRoot)

    // Real EmuMovies Sync folder names (confirmed against the live Sync app's
    // "Available Media" dropdown). Sync uses underscores in place of spaces
    // throughout its own system folder names (e.g. Microsoft_Xbox_360).
    const emumoviesSubFolders = [
      'Video_MP4_HI_QUAL',
      'Video_MP4_HD',
      'Video_MP4',
      'Video_AVI_HI_QUAL',
      'Video_AVI_HD',
      'Video_AVI',
      'Snap',
      'Title',
      'Background',
      'Box',
      'Box_25D',
      'Box_3D',
      'Box_Full',
      'Box_Spine',
      'BoxBack',
      'Cart',
      'Logos',
      'Manual',
      'System_Logo',
    ]

    // One folder per emulator NuArcade actually knows how to launch --
    // matches the exact names shown in Settings' Emulators grid, so what
    // Rome sees here lines up with what he sees there. RetroArch and MAME
    // excluded: MAME's own arcade catalog lives entirely inside RetroArch,
    // and RetroArch itself is multi-system by nature -- EmuMovies media for
    // those older/retro systems should live under the specific console
    // folders instead, not a single "RetroArch" or "MAME" bucket. Folder
    // names include every system each emulator actually plays, verified
    // against each emulator's own documentation, so it's clear at a glance
    // what belongs in each folder without needing to open a README first.
    const emumoviesSystems = [
      'TeknoParrot', 'RPCS3 - PS3', 'Xenia - Xbox 360', 'Dolphin - GameCube - Wii - Triforce',
      'PCSX2 - PS2', 'Ryubing - Switch', 'Project64 - N64', 'DuckStation - PS1',
      'Flycast - Dreamcast - Naomi - Atomiswave', 'Model 2 - Sega Model 2', 'Supermodel - Sega Model 3',
      'PPSSPP - PSP', 'Cemu - Wii U', 'Visual Pinball X',
    ]

    const emumoviesRoot = path.join(mediaRoot, 'EmuMovies')
    ensure(emumoviesRoot)

    // What system(s) each emulator actually plays -- written into a README
    // inside each folder so it's obvious which one to point EmuMovies Sync
    // at, without needing to remember or look it up separately.
    const emumoviesSystemDescriptions = {
      'RPCS3 - PS3':                              'Sony PlayStation 3',
      'Xenia - Xbox 360':                         'Microsoft Xbox 360',
      'Dolphin - GameCube - Wii - Triforce':      'Nintendo GameCube, Nintendo Wii, and the Sega/Namco Triforce arcade system',
      'PCSX2 - PS2':                              'Sony Playstation 2',
      'Ryubing - Switch':                         'Nintendo Switch',
      'Project64 - N64':                          'Nintendo N64',
      'DuckStation - PS1':                        'Sony Playstation (PS1)',
      'Flycast - Dreamcast - Naomi - Atomiswave': 'Sega Dreamcast, Sega Naomi, Sega Naomi 2, and Sammy Atomiswave arcade',
      'Model 2 - Sega Model 2':                   'Sega Model 2 arcade games',
      'Supermodel - Sega Model 3':                'Sega Model 3 arcade games',
      'PPSSPP - PSP':                             'Sony PSP',
      'Cemu - Wii U':                             'Nintendo Wii U',
      'Visual Pinball X':                         'Visual Pinball (EmuMovies drops the "X" in its own system name)',
    }

    // TeknoParrot is not one system, and EmuMovies genuinely does not catalog
    // most of the arcade hardware it actually runs (SEGA Lindbergh, RingEdge,
    // RingWide, ALL.Net/NU/ALLS, Namco System 357/369/ES-series, Taito Type X
    // are all absent from EmuMovies' system list as of this writing). The one
    // confirmed real match is "Konami e-AMUSEMENT" for Bemani-adjacent titles.
    // For everything else in the TeknoParrot library, use NuArcade's YouTube
    // video pipeline (Media > Library tab) instead -- EmuMovies won't have it.
    const teknoParrotReadme = 'TeknoParrot runs many different arcade hardware platforms, not one system.\r\n\r\n' +
      'Checked against EmuMovies Sync\'s own system list: most of what TeknoParrot\r\n' +
      'actually emulates -- SEGA Lindbergh, RingEdge, RingWide, ALL.Net/NU/ALLS,\r\n' +
      'Namco System 357/369/ES-series, Taito Type X -- is NOT in EmuMovies\' catalog.\r\n' +
      'That covers most racing, lightgun, and rhythm titles (Initial D, Wangan\r\n' +
      'Midnight, Mario Kart Arcade GP, House of the Dead, etc.) -- EmuMovies simply\r\n' +
      'will not have media for these regardless of which category you pick.\r\n\r\n' +
      'The one confirmed real match: select "Konami e-AMUSEMENT" in Sync for any\r\n' +
      'Konami/Bemani-adjacent titles in your TeknoParrot library.\r\n\r\n' +
      'For everything else, use NuArcade\'s own YouTube video pipeline instead --\r\n' +
      'open Media > Library tab and use "Find video" per game. That has real\r\n' +
      'coverage for popular arcade racing/lightgun titles EmuMovies does not.'

    for (const sys of emumoviesSystems) {
      for (const sub of emumoviesSubFolders) {
        ensure(path.join(emumoviesRoot, sys, sub))
      }
      const readmePath = path.join(emumoviesRoot, sys, 'README.txt')
      if (!fs.existsSync(readmePath)) {
        let readmeText
        if (sys === 'TeknoParrot') {
          readmeText = teknoParrotReadme
        } else {
          const description = emumoviesSystemDescriptions[sys] || 'See NuArcade Settings for details.'
          readmeText = sys + ' plays: ' + description + '.\r\n\r\n' +
            'How to use this folder:\r\n' +
            '1. Point EmuMovies Sync\'s destination folder here.\r\n' +
            '2. In Sync, select the matching system and run a download.\r\n' +
            '   Sync creates its own system-named subfolder inside this one --\r\n' +
            '   that is normal, Sync always names things its own way.\r\n' +
            '3. In NuArcade, go to Media > EmuMovies tab and click "Scan EmuMovies\r\n' +
            '   folder". NuArcade finds whatever Sync created and shows a review\r\n' +
            '   list -- click Import per item. No manual file copying needed;\r\n' +
            '   NuArcade handles moving the right file to the right place for you.'
        }
        try { fs.writeFileSync(readmePath, readmeText) } catch (e) { /* non-fatal */ }
      }
    }

    // --- STEP 3: RetroArch roms folder structure ---
    const retroarchRoms = cfg.retroarchGamesPath || 'F:\\RetroArch\\roms'
    const raSystems = [
      'nes', 'snes', 'n64', 'gba', 'gbc', 'gb', 'nds', 'virtualboy',
      'gamecube', 'wii', 'genesis', 'megadrive', 'mastersystem', 'gamegear',
      'saturn', 'segacd', 'sega32x', 'psx', 'psp', 'atari2600', 'atari7800',
      'atarijaguar', 'atarilynx', 'pcengine', 'neogeo', 'neogeopocket',
      'arcade', 'fba', 'dos', 'scummvm', 'amstradcpc', 'zxspectrum',
      'c64', 'amiga', 'vectrex', 'wonderswan'
    ]
    ensure(retroarchRoms)
    for (const sys of raSystems) {
      ensure(path.join(retroarchRoms, sys))
    }

    // --- Save version stamp and config ---
    cfg.mediaPath = mediaRoot
    cfg.mediaFoldersVersion = FOLDER_SCHEMA_VERSION
    config.save(cfg)

    return {
      success: true,
      mediaRoot,
      created: created.length,
      skipped: skipped.length,
      version: FOLDER_SCHEMA_VERSION
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
})


// -- TP Folder Renamer --------------------------------------------------
ipcMain.handle('analyze-folders', async (event, { gamesFolder, tpFolder }) => {
  const fs   = require('fs')
  const path = require('path')

  if (!fs.existsSync(gamesFolder)) return { unmatched: [], profileKeys: [] }
  if (!fs.existsSync(tpFolder))    return { unmatched: [], profileKeys: [] }

  const gameProfilesDir = path.join(tpFolder, 'GameProfiles')
  const userProfilesDir = path.join(tpFolder, 'UserProfiles')

  // Get all GameProfile XML filenames as profile keys
  let profileKeys = []
  if (fs.existsSync(gameProfilesDir)) {
    profileKeys = fs.readdirSync(gameProfilesDir)
      .filter(f => f.toLowerCase().endsWith('.xml'))
      .map(f => path.basename(f, '.xml'))
  }

  // Get configured UserProfile keys to exclude
  const configured = new Set()
  if (fs.existsSync(userProfilesDir)) {
    fs.readdirSync(userProfilesDir)
      .filter(f => f.toLowerCase().endsWith('.xml'))
      .forEach(f => configured.add(path.basename(f, '.xml')))
  }

  // Get unmatched game subfolders
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
  const profileNorms = new Set(profileKeys.map(k => norm(k)))

  const folders = fs.readdirSync(gamesFolder, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => {
      if (configured.has(name)) return false
      return !profileNorms.has(norm(name)) // only unmatched
    })

  return { unmatched: folders, profileKeys }
})

// Suggest likely TeknoParrot GameProfile matches for unmatched game folders
// Scan EmuMovies Sync folders for video/artwork and suggest matches to games
ipcMain.handle('scan-emumovies-media', async (event, { mediaPath, games }) => {
  const { scanEmuMoviesMedia } = require('./scanner')
  const timeout = new Promise(resolve =>
    setTimeout(() => resolve({ suggestions: [], error: 'scan timed out' }), 30000)
  )
  return await Promise.race([scanEmuMoviesMedia(mediaPath, games), timeout])
})

// Copy a matched EmuMovies file into NuArcade's expected video/artwork location
ipcMain.handle('import-emumovies-file', async (event, opts) => {
  const { importEmuMoviesFile } = require('./scanner')
  return await importEmuMoviesFile(opts)
})

ipcMain.handle('suggest-folder-matches', async (event, { teknoParrotPath, gamesFolderPath }) => {
  const { suggestFolderMatches } = require('./scanner')
  const timeout = new Promise(resolve =>
    setTimeout(() => resolve({ suggestions: [], error: 'scan timed out' }), 20000)
  )
  return await Promise.race([suggestFolderMatches(teknoParrotPath, gamesFolderPath), timeout])
})

ipcMain.handle('rename-folder', async (event, { gamesFolder, from, to }) => {
  const fs   = require('fs')
  const path = require('path')
  const fromPath = path.join(gamesFolder, from)
  const toPath   = path.join(gamesFolder, to)
  if (!fs.existsSync(fromPath)) return false
  if (fs.existsSync(toPath))   return false  // don't overwrite
  try {
    fs.renameSync(fromPath, toPath)
    return true
  } catch (e) {
    console.error('[rename-folder]', e)
    return false
  }
})

// Exported for focused tests only -- Electron itself never reads
// module.exports from its main entry point, so this is purely additive.
module.exports = {
  launchWithReturn,
  launchDetachedFireAndForget,
  launchViaShellCommand,
  registerLaunchSession,
  trackLaunchLifecycle,
  emitLaunchLifecycleTerminal,
  _internal: {
    setMainWindowForTest: (win) => { mainWin = win },
  },
}
