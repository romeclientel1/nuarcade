const { app, BrowserWindow, ipcMain, screen, dialog, shell } = require('electron')
const path = require('path')
const { exec, spawn } = require('child_process')
const config = require('./config')
const { scanMedia } = require('./mediaScanner')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWin = null

// Shared launcher -- minimizes NuArcade while a game runs, restores on exit
function launchWithReturn(exe, args, options) {
  args = args || []
  options = options || {}
  return new Promise(function(resolve, reject) {
    if (mainWin && !options.keepVisible) mainWin.minimize()
    var child = spawn(exe, args, Object.assign({
      cwd: options.cwd || path.dirname(exe),
      stdio: 'ignore',
      detached: false,
    }, options.spawnOpts || {}))
    child.on('exit', function() {
      if (mainWin) {
        mainWin.restore()
        setTimeout(function() { if (mainWin) mainWin.focus() }, 300)
      }
      resolve()
    })
    child.on('error', function(err) {
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
ipcMain.handle('launch-game', async (event, profilePath) => {
  const cfg = config.load()
  const teknoParrotExe = path.join(cfg.teknoParrotPath, 'TeknoParrotUi.exe')
  const profileName = path.basename(profilePath)
  const args = ['--profile=' + profileName, '--startGame']
  try {
    await launchWithReturn(teknoParrotExe, args, { spawnOpts: { cwd: cfg.teknoParrotPath } })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Launch RPCS3 game -------------------------------------------------------
ipcMain.handle('launch-ps3-game', async (event, gamePath) => {
  const { spawn } = require('child_process')
  return new Promise((resolve) => {
    const cfg = config.load()
    const rpcs3Exe = path.join(cfg.rpcs3Path || 'F:\\RPCS3\\', 'rpcs3.exe')
    const child = spawn(rpcs3Exe, ['--no-gui', gamePath], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
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
ipcMain.handle('launch-vpx-table', async (event, tablePath) => {
  const cfg = config.load()
  const vpxDir  = cfg.pinballPath || 'F:\\vPinball\\'
  const vpxExe  = require('path').join(vpxDir, 'VPinballX64.exe')
  const { spawn } = require('child_process')
  try {
    spawn(vpxExe, ['-play', tablePath], {
      detached: true, stdio: 'ignore',
      cwd: vpxDir,
    }).unref()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// -- Video via ScreenScraper --------------------------------------------------
ipcMain.handle('search-video', async (event, gameTitle) => {
  const cfg = config.load()
  const ssUser = cfg.screenscraper?.user || ''
  const ssPass = cfg.screenscraper?.pass || ''
  if (!ssUser || !ssPass) return { error: 'No ScreenScraper credentials set' }

  const base = 'https://www.screenscraper.fr/api2'
  // NuArcade registered dev credentials -- separate from user credentials
  const DEVID = 'nuarcade'
  const DEVPASS = 'nuarcade2024'
  const auth = `devid=${DEVID}&devpassword=${DEVPASS}&softname=nuarcade&output=json&ssid=${encodeURIComponent(ssUser)}&sspassword=${encodeURIComponent(ssPass)}`

  try {
    // Step 1: Search for the game
    const searchUrl = `${base}/jeuRecherche.php?${auth}&recherche=${encodeURIComponent(gameTitle)}`
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'NuArcade/1.0' }, signal: AbortSignal.timeout(8000) })
    const text = await res.text()

    // Check for API errors
    if (text.includes('API closed') || text.includes('Erreur') || text.includes('error')) {
      // Try to extract error message
      const errMatch = text.match(/"message"\s*:\s*"([^"]+)"/)
      return { error: 'SS API error: ' + (errMatch ? errMatch[1] : text.slice(0, 100)) }
    }

    let jeux = null
    try {
      const data = JSON.parse(text)
      jeux = data?.response?.jeux || data?.jeux
    } catch {
      return { error: 'SS search parse error. Response: ' + text.slice(0, 150) }
    }

    if (!jeux || jeux.length === 0) {
      return { error: 'No game found on ScreenScraper for: ' + gameTitle }
    }

    const gameId = jeux[0].id || jeux[0].jeuId
    if (!gameId) return { error: 'No game ID in SS response' }

    // Step 2: Get full game info with media
    const detailUrl = `${base}/jeuInfos.php?${auth}&gameid=${gameId}`
    const detailRes = await fetch(detailUrl, { headers: { 'User-Agent': 'NuArcade/1.0' }, signal: AbortSignal.timeout(8000) })
    const detailText = await detailRes.text()

    let jeu = null
    try {
      const detailData = JSON.parse(detailText)
      jeu = detailData?.response?.jeu
    } catch {
      return { error: 'SS detail parse error. Response: ' + detailText.slice(0, 150) }
    }

    if (!jeu) return { error: 'No game detail returned for ID: ' + gameId }

    // Step 3: Find video media
    const medias = jeu.medias || []
    const videoTypes = ['video', 'video-normalized', 'video-snap', 'video-hd']
    const videoMedia = medias.find(m => videoTypes.includes(m.type))

    if (!videoMedia) {
      const availableTypes = [...new Set(medias.map(m => m.type))].join(', ')
      return { error: `No video found for "${jeu.noms?.[0]?.text || gameTitle}" (ID: ${gameId}). Available media: ${availableTypes || 'none'}` }
    }

    // Build authenticated video URL
    const sep = videoMedia.url.includes('?') ? '&' : '?'
    const videoUrl = videoMedia.url + sep + `maxwidth=640&ssid=${encodeURIComponent(ssUser)}&sspassword=${encodeURIComponent(ssPass)}`

    return {
      videoId: String(gameId),
      title: (jeu.noms && jeu.noms[0]?.text) || gameTitle,
      url: videoUrl,
      thumbnail: null,
      source: 'screenscraper',
    }
  } catch (e) {
    return { error: 'SS fetch exception: ' + (e.message || String(e)) }
  }
})

ipcMain.handle('download-video', async (event, { videoUrl, gameId }) => {
  const fs = require('fs')
  return new Promise(async (resolve) => {
    try {
      const cfg = config.load()
      const videosDir = path.join(cfg.mediaPath || 'F:\\Media\\', 'Videos')
      if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true })
      const outputFile = path.join(videosDir, gameId + '.mp4')

      // Direct HTTP download -- ScreenScraper serves plain MP4s
      const ssUser = cfg.screenscraper?.user || ''
      const ssPass = cfg.screenscraper?.pass || ''
      const urlWithCreds = videoUrl.includes('screenscraper')
        ? videoUrl + `&ssid=${encodeURIComponent(ssUser)}&sspassword=${encodeURIComponent(ssPass)}`
        : videoUrl

      const res = await fetch(urlWithCreds)
      if (!res.ok) { resolve({ success: false, error: 'Download failed: ' + res.status }); return }

      const buffer = await res.arrayBuffer()
      fs.writeFileSync(outputFile, Buffer.from(buffer))

      // Store video path in config
      const videos = JSON.parse(fs.existsSync(path.join(cfg.mediaPath || 'F:\\Media\\', 'videos.json'))
        ? fs.readFileSync(path.join(cfg.mediaPath || 'F:\\Media\\', 'videos.json'), 'utf8')
        : '{}')
      videos[gameId] = outputFile
      fs.writeFileSync(path.join(cfg.mediaPath || 'F:\\Media\\', 'videos.json'), JSON.stringify(videos))

      resolve({ success: true, outputFile })
    } catch (e) {
      resolve({ success: false, error: e.message })
    }
  })
})


// -- Launch Xenia / Xbox 360 -------------------------------------------------
ipcMain.handle('launch-xbox360-game', async (event, gamePath) => {
  const cfg = config.load()
  const xeniaExe = path.join(cfg.xeniaPath || 'F:\\Xenia\\', 'xenia.exe')
  try {
    await launchWithReturn(xeniaExe, [gamePath])
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// -- Launch Dolphin / GC+Wii -------------------------------------------------
ipcMain.handle('launch-gcwii-game', async (event, gamePath) => {
  const { spawn } = require('child_process')
  return new Promise((resolve) => {
    const cfg = config.load()
    const dolphinExe = path.join(cfg.dolphinPath || 'F:\\Dolphin\\', 'Dolphin.exe')
    const child = spawn(dolphinExe, ['-e', gamePath, '--batch'], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// -- Launch PCSX2 / PS2 ------------------------------------------------------
ipcMain.handle('launch-ps2-game', async (event, gamePath) => {
  const { spawn } = require('child_process')
  return new Promise((resolve) => {
    const cfg = config.load()
    const pcsx2Exe = path.join(cfg.pcsx2Path || 'F:\\PCSX2\\', 'pcsx2.exe')
    const child = spawn(pcsx2Exe, [gamePath, '--nogui'], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
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
  return scanPs2Games(ps2GamesPath)
})


// -- Launch Ryujinx / Switch --------------------------------------------------
ipcMain.handle('launch-switch-game', async (event, gamePath) => {
  const { spawn } = require('child_process')
  return new Promise((resolve) => {
    const cfg = config.load()
    const ryujinxExe = path.join(cfg.ryujinxPath || 'F:\\Ryujinx\\', 'Ryujinx.exe')
    const child = spawn(ryujinxExe, [gamePath], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
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

ipcMain.handle('get-config', () => config.load())
ipcMain.handle('quit-app', () => { app.quit() })

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
ipcMain.handle('launch-mame-game', async (event, gamePath) => {
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

  const { spawn } = require('child_process')
  const romFile = path.basename(gamePath, path.extname(gamePath))
  const romsDir = path.dirname(gamePath)
  spawn(mameExe, [romFile, '-rompath', romsDir], {
    detached: true,
    stdio: 'ignore',
    cwd: mameDir,
  }).unref()
  return { launched: true }
})

ipcMain.handle('scan-mame-games', async (event, mameGamesPath) => {
  const { scanMameGames } = require('./scanner')
  return scanMameGames(mameGamesPath)
})

// -- RetroArch ---------------------------------------------------------------
ipcMain.handle('launch-retroarch', async () => {
  const cfg = config.load()
  const retroDir = cfg.retroarchPath || 'F:\\RetroArch\\'
  const retroExe = path.join(retroDir, 'retroarch.exe')
  if (!require('fs').existsSync(retroExe)) return { success: false, error: 'RetroArch not found at: ' + retroExe }
  try { await launchWithReturn(retroExe, [], { spawnOpts: { cwd: retroDir } }); return { success: true } }
  catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('launch-retroarch-game', async (event, gamePath) => {
  const fs = require('fs')
  const cfg = config.load()
  const retroDir = cfg.retroarchPath || 'F:\\RetroArch\\'
  const retroExe = path.join(retroDir, 'retroarch.exe')
  const { spawn } = require('child_process')
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

  const coreName = CORE_MAP[ext]
  const corePath = coreName ? path.join(retroDir, 'cores', coreName) : null

  const args = corePath && fs.existsSync(corePath)
    ? ['-f', '-L', corePath, gamePath]
    : ['-f', gamePath]

  spawn(retroExe, args, { detached: true, stdio: 'ignore' }).unref()
  return { launched: true, core: coreName || 'auto' }
})

ipcMain.handle('scan-retroarch-games', async (event, retroarchGamesPath) => {
  const { scanRetroArchGames } = require('./scanner')
  return scanRetroArchGames(retroarchGamesPath)
})

// -- Project64 / N64 ---------------------------------------------------------
ipcMain.handle('launch-n64-game', async (event, gamePath) => {
  const cfg = config.load()
  const p64Exe = path.join(cfg.project64Path || 'F:\\Project64\\', 'Project64.exe')
  const { spawn } = require('child_process')
  spawn(p64Exe, [gamePath], { detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
})

ipcMain.handle('scan-n64-games', async (event, n64GamesPath) => {
  const { scanN64Games } = require('./scanner')
  return scanN64Games(n64GamesPath)
})

// -- DuckStation / PS1 -------------------------------------------------------
ipcMain.handle('launch-ps1-game', async (event, gamePath) => {
  const cfg = config.load()
  const dsExe = path.join(cfg.duckstationPath || 'F:\\DuckStation\\', 'duckstation-qt-x64-ReleaseLTCG.exe')
  const { spawn } = require('child_process')
  spawn(dsExe, [gamePath], { detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
})

ipcMain.handle('scan-ps1-games', async (event, ps1GamesPath) => {
  const { scanPs1Games } = require('./scanner')
  return scanPs1Games(ps1GamesPath)
})

// -- Flycast / Dreamcast -----------------------------------------------------
ipcMain.handle('launch-flycast-game', async (event, gamePath) => {
  const cfg = config.load()
  const flyExe = path.join(cfg.flycastPath || 'F:\\Flycast\\', 'flycast.exe')
  const { spawn } = require('child_process')
  spawn(flyExe, [gamePath], { detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
})

ipcMain.handle('scan-dreamcast-games', async (event, dreamcastGamesPath) => {
  const { scanDreamcastGames } = require('./scanner')
  return scanDreamcastGames(dreamcastGamesPath)
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

  return results
})


// -- Model 2 Emulator --------------------------------------------------------
ipcMain.handle('launch-model2-game', async (event, gamePath) => {
  const cfg = config.load()
  const m2Exe = path.join(cfg.model2Path || 'F:\\Model2\\', 'emulator_multicpu.exe')
  const romName = path.basename(gamePath, path.extname(gamePath))
  const { spawn } = require('child_process')
  spawn(m2Exe, [romName], { cwd: path.dirname(m2Exe), detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
})

ipcMain.handle('scan-model2-games', async (event, model2GamesPath) => {
  const { scanModel2Games } = require('./scanner')
  return scanModel2Games(model2GamesPath)
})

// -- Model 3 / Supermodel ----------------------------------------------------
ipcMain.handle('launch-model3-game', async (event, gamePath) => {
  const cfg = config.load()
  const m3Exe = path.join(cfg.model3Path || 'F:\\Supermodel\\', 'Supermodel.exe')
  const { spawn } = require('child_process')
  spawn(m3Exe, [gamePath, '-fullscreen'], { detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
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
ipcMain.handle('launch-psp-game', async (event, gamePath) => {
  const cfg = config.load()
  const ppssppExe = path.join(cfg.ppssppPath || 'F:\\PPSSPP\\', 'PPSSPPWindows64.exe')
  const { spawn } = require('child_process')
  spawn(ppssppExe, [gamePath], { detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
})

ipcMain.handle('scan-psp-games', async (event, pspGamesPath) => {
  const { scanPspGames } = require('./scanner')
  return scanPspGames(pspGamesPath)
})

// -- Cemu / Wii U ------------------------------------------------------------
ipcMain.handle('launch-wiiu-game', async (event, gamePath) => {
  const cfg = config.load()
  const cemuExe = path.join(cfg.cemuPath || 'F:\\Cemu\\', 'Cemu.exe')
  const { spawn } = require('child_process')
  spawn(cemuExe, ['-f', '-g', gamePath], { detached: true, stdio: 'ignore' }).unref()
  return { launched: true }
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
ipcMain.handle('launch-steam-game', async (event, appId) => {
  const { exec } = require('child_process')
  exec('start steam://rungameid/' + appId)
  return { ok: true }
})

// -- PC / Non-Steam games ----------------------------------------------------
ipcMain.handle('scan-pc-games', async (event, pcGamesPath) => {
  const { scanPcGames } = require('./scanner')
  return scanPcGames(pcGamesPath)
})
ipcMain.handle('launch-pc-game', async (event, exePath) => {
  const path = require('path')
  const { spawn } = require('child_process')
  try {
    spawn(exePath, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exePath) }).unref()
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
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

    // Use a unique temp filename so parallel downloads don't collide.
    // yt-dlp downloads to tempFile, we rename to outputFile on success.
    const tempId = gameId + '_tmp_' + Date.now()
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
    ]

    let dlStderr = ''
    const dlProc = spawn(ytdlpExe, dlArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
    dlProc.stderr.on('data', d => { dlStderr += d.toString() })

    const dlTimer = setTimeout(() => {
      dlProc.kill()
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile) } catch {}
      resolve({ success: false, error: 'Download timed out after 3 minutes' })
    }, 180000)

    dlProc.on('error', (e) => {
      clearTimeout(dlTimer)
      resolve({ success: false, error: 'yt-dlp spawn error: ' + e.message })
    })

    dlProc.on('close', (code) => {
      clearTimeout(dlTimer)

      if (code !== 0) {
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile) } catch {}
        return resolve({ success: false, error: dlStderr.slice(-400) || 'yt-dlp exited with code ' + code })
      }

      // Find what yt-dlp actually wrote -- it may have sanitized the temp name too
      let foundFile = null

      if (fs.existsSync(tempFile)) {
        foundFile = tempFile
      } else {
        // Scan for any file starting with our tempId prefix
        try {
          const match = fs.readdirSync(videosDir)
            .filter(f => f.startsWith(tempId) && f.toLowerCase().endsWith('.mp4'))
          if (match.length > 0) foundFile = path.join(videosDir, match[0])
        } catch {}
      }

      if (!foundFile) {
        return resolve({ success: false, error: 'yt-dlp finished but temp file not found (tempId: ' + tempId + ')' })
      }

      // Rename temp -> final gameId path
      try {
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
        fs.renameSync(foundFile, outputFile)
      } catch (e) {
        // Rename failed -- use whatever path we have
        saveRegistry()
        return resolve({ success: true, outputFile: foundFile, startSec: 0 })
      }

      saveRegistry()
      resolve({ success: true, outputFile, startSec: 0 })
    })
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
  const gamesFolders  = cfg.arcadeGamesPath || 'F:\\ArcadeGames\\'
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
  const cfg = loadConfig()
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
  const cfg = loadConfig()
  const mediaRoot = cfg.mediaPath || 'F:\\Media'
  try {
    const patched = scanMedia(games, mediaRoot)
    return { success: true, games: patched }
  } catch (e) {
    return { success: false, error: e.message, games }
  }
})

ipcMain.handle('ensure-media-folders', async (event, customPath) => {
  const cfg = loadConfig()
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
    // --- STEP 1: NuArcade media folders (art/video per emulator system) ---
    // NuArcade internal subfolders
    const nuarcadeSubFolders = [
      'Images\\Box Art',
      'Images\\Cabinet Art',
      'Images\\Marquee',
      'Images\\Snap',
      'Images\\Wheel',
      'Images\\Title',
      'Images\\Background',
      'Images\\Banner',
      'Images\\Logo',
      'Video',
    ]

    const systems = [
      'MAME', 'TeknoParrot', 'RPCS3', 'Xenia', 'Dolphin',
      'PCSX2', 'Ryujinx', 'DuckStation', 'Flycast', 'PPSSPP',
      'Cemu', 'Model2', 'Model3', 'RetroArch', 'Steam', 'PC',
      // RetroArch sub-systems get their own media folders too
      'NES', 'SNES', 'N64', 'GBA', 'GBC', 'GB', 'NDS',
      'Genesis', 'Saturn', 'SegaCD', 'Sega32X', 'MasterSystem', 'GameGear',
      'PlayStation', 'PSP', 'Dreamcast',
      'NeoGeo', 'PCEngine', 'Atari2600', 'Atari7800', 'AtariJaguar', 'AtariLynx',
      'Amiga', 'C64', 'DOS', 'ScummVM', 'Arcade',
    ]

    ensure(mediaRoot)
    ensure(path.join(mediaRoot, 'Music'))
    ensure(path.join(mediaRoot, 'Themes'))

    for (const sys of systems) {
      for (const sub of nuarcadeSubFolders) {
        ensure(path.join(mediaRoot, sys, sub))
      }
    }

    // --- STEP 2: EmuMovies Sync compatible folders (exact naming match) ---
    // EmuMovies outputs: snap, title, background, banner, cabinet,
    // marquee, logo, artwork_preview, controls, cp, icon, pcb, Video_MP4
    const emumoviesSubFolders = [
      'snap',
      'title',
      'background',
      'banner',
      'cabinet',
      'marquee',
      'logo',
      'artwork_preview',
      'controls',
      'cp',
      'icon',
      'pcb',
      'score',
      'select',
      'gameover',
      'Video_MP4',
      'Video_FLV',
    ]

    const emumoviesSystems = [
      'MAME', 'TeknoParrot', 'RPCS3', 'Xenia', 'Dolphin',
      'PCSX2', 'Ryujinx', 'DuckStation', 'Flycast', 'PPSSPP',
      'Cemu', 'Model2', 'Model3', 'Steam', 'PC',
      // Common EmuMovies system names
      'Nintendo Entertainment System', 'Super Nintendo Entertainment System',
      'Nintendo 64', 'Game Boy Advance', 'Game Boy Color', 'Game Boy',
      'Nintendo DS', 'GameCube', 'Wii',
      'Sega Genesis', 'Sega Saturn', 'Sega CD', 'Sega 32X',
      'Sega Master System', 'Game Gear', 'Sega Dreamcast',
      'Sony Playstation', 'Sony Playstation 2', 'Sony PSP',
      'Neo Geo', 'TurboGrafx-16', 'Atari 2600', 'Atari 7800',
      'Atari Jaguar', 'Atari Lynx', 'Commodore Amiga', 'Commodore 64',
      'MAME 2003', 'MAME 2010',
    ]

    const emumoviesRoot = path.join(mediaRoot, 'EmuMovies')
    ensure(emumoviesRoot)

    for (const sys of emumoviesSystems) {
      for (const sub of emumoviesSubFolders) {
        ensure(path.join(emumoviesRoot, sys, sub))
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
    saveConfig(cfg)

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
