const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron')
const path = require('path')
const { exec, spawn } = require('child_process')
const config = require('./config')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

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

// ── Browse folder dialog ────────────────────────────────────────────────────
ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select folder',
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

// ── Launch TeknoParrot game ─────────────────────────────────────────────────
ipcMain.handle('launch-game', async (event, profilePath) => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const teknoParrotExe = path.join(cfg.teknoParrotPath, 'TeknoParrotUi.exe')
    const args = [`--profile=${profilePath}`, '--startMinimized']
    const child = spawn(teknoParrotExe, args, { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// ── Launch RPCS3 game ───────────────────────────────────────────────────────
ipcMain.handle('launch-ps3-game', async (event, gamePath) => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const rpcs3Exe = path.join(cfg.rpcs3Path || 'F:\\RPCS3\\', 'rpcs3.exe')
    const child = spawn(rpcs3Exe, ['--no-gui', gamePath], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// ── Run TeknoParrot updater ─────────────────────────────────────────────────
ipcMain.handle('run-updater', async () => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const updaterPath = path.join(cfg.teknoParrotPath, 'ParrotPatcher.exe')
    exec(updaterPath, (error) => {
      resolve({ success: !error, error: error?.message })
    })
  })
})

// ── Scan TeknoParrot games ──────────────────────────────────────────────────
ipcMain.handle('scan-games', async (event, { teknoParrotPath, gamesFolderPath }) => {
  const { scanGames } = require('./scanner')
  return scanGames(teknoParrotPath, gamesFolderPath)
})

// ── Scan RPCS3 games ────────────────────────────────────────────────────────
ipcMain.handle('scan-ps3-games', async (event, ps3GamesPath) => {
  const { scanPs3Games } = require('./scanner')
  return scanPs3Games(ps3GamesPath)
})

// ── Scan pinball tables ─────────────────────────────────────────────────────
ipcMain.handle('scan-pinball', async (event, tablesPath) => {
  const { scanPinballTables } = require('./scanner')
  return scanPinballTables(tablesPath)
})

// ── yt-dlp helpers ──────────────────────────────────────────────────────────
async function ensureYtDlp() {
  const { execSync } = require('child_process')
  try {
    execSync('yt-dlp --version', { stdio: 'ignore' })
    return true
  } catch (e) {
    try {
      execSync('pip install yt-dlp --quiet', { stdio: 'ignore' })
      return true
    } catch (e2) {
      try {
        execSync('winget install yt-dlp --silent', { stdio: 'ignore' })
        return true
      } catch (e3) {
        return false
      }
    }
  }
}

ipcMain.handle('search-video', async (event, gameTitle) => {
  try {
    const query = encodeURIComponent(gameTitle + ' gameplay')
    const res = await fetch('https://www.youtube.com/results?search_query=' + query)
    const html = await res.text()
    const match = html.match(/"videoId":"([^"]+)".*?"title":{"runs":\[{"text":"([^"]+)"/)
    if (match) {
      return {
        videoId: match[1],
        title: match[2],
        url: 'https://www.youtube.com/watch?v=' + match[1],
        thumbnail: 'https://img.youtube.com/vi/' + match[1] + '/mqdefault.jpg'
      }
    }
    return null
  } catch (e) {
    return null
  }
})

ipcMain.handle('download-video', async (event, { videoUrl, outputPath, gameId }) => {
  return new Promise(async (resolve) => {
    const installed = await ensureYtDlp()
    if (!installed) {
      resolve({ success: false, error: 'yt-dlp not available' })
      return
    }
    const cfg = config.load()
    const videosDir = (cfg.mediaPath || 'F:\\Media\\') + 'Videos\\'
    const outputFile = videosDir + gameId + '.mp4'
    const cmd = 'yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/mp4" --merge-output-format mp4 -o "' + outputFile + '" "' + videoUrl + '"'
    exec(cmd, (error) => {
      if (error) {
        resolve({ success: false, error: error.message })
      } else {
        resolve({ success: true, outputFile })
      }
    })
  })
})


// ── Launch Xenia / Xbox 360 ─────────────────────────────────────────────────
ipcMain.handle('launch-xbox360-game', async (event, gamePath) => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const xeniaExe = path.join(cfg.xeniaPath || 'F:\\Xenia\\', 'xenia.exe')
    const child = spawn(xeniaExe, [gamePath], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// ── Launch Dolphin / GC+Wii ─────────────────────────────────────────────────
ipcMain.handle('launch-gcwii-game', async (event, gamePath) => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const dolphinExe = path.join(cfg.dolphinPath || 'F:\\Dolphin\\', 'Dolphin.exe')
    const child = spawn(dolphinExe, ['-e', gamePath, '--batch'], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// ── Launch PCSX2 / PS2 ──────────────────────────────────────────────────────
ipcMain.handle('launch-ps2-game', async (event, gamePath) => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const pcsx2Exe = path.join(cfg.pcsx2Path || 'F:\\PCSX2\\', 'pcsx2.exe')
    const child = spawn(pcsx2Exe, [gamePath, '--nogui'], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// ── Scan Xbox 360 games ─────────────────────────────────────────────────────
ipcMain.handle('scan-xbox360-games', async (event, xbox360GamesPath) => {
  const { scanXbox360Games } = require('./scanner')
  return scanXbox360Games(xbox360GamesPath)
})

// ── Scan GameCube/Wii games ─────────────────────────────────────────────────
ipcMain.handle('scan-gcwii-games', async (event, gcWiiGamesPath) => {
  const { scanGCWiiGames } = require('./scanner')
  return scanGCWiiGames(gcWiiGamesPath)
})

// ── Scan PS2 games ──────────────────────────────────────────────────────────
ipcMain.handle('scan-ps2-games', async (event, ps2GamesPath) => {
  const { scanPs2Games } = require('./scanner')
  return scanPs2Games(ps2GamesPath)
})


// ── Launch Ryujinx / Switch ──────────────────────────────────────────────────
ipcMain.handle('launch-switch-game', async (event, gamePath) => {
  return new Promise((resolve) => {
    const cfg = config.load()
    const ryujinxExe = path.join(cfg.ryujinxPath || 'F:\\Ryujinx\\', 'Ryujinx.exe')
    const child = spawn(ryujinxExe, [gamePath], { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// ── Scan Switch games ────────────────────────────────────────────────────────
ipcMain.handle('scan-switch-games', async (event, switchGamesPath) => {
  const { scanSwitchGames } = require('./scanner')
  return scanSwitchGames(switchGamesPath)
})


// ── Create F: drive folder structure ────────────────────────────────────────
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


// ── Backup config to file ────────────────────────────────────────────────────
ipcMain.handle('backup-config', async () => {
  const cfg = config.load()
  const result = await dialog.showSaveDialog({
    title: 'Save NuArcade Backup',
    defaultPath: 'nuarcade-backup-' + new Date().toISOString().slice(0,10) + '.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { success: false }
  const fs = require('fs')
  fs.writeFileSync(result.filePath, JSON.stringify({ config: cfg, version: '1.3.0', date: new Date().toISOString() }, null, 2))
  return { success: true, path: result.filePath }
})

// ── Restore config from file ─────────────────────────────────────────────────
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
      return { success: true, date: data.date }
    }
    return { success: false, error: 'Invalid backup file' }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ── Config & misc ───────────────────────────────────────────────────────────
ipcMain.handle('add-exclusions', async (event, paths) => {
  return new Promise((resolve) => {
    const ps = paths.map(p => `Add-MpPreference -ExclusionPath "${p}"`).join('; ')
    exec(`powershell -Command "${ps}"`, (error) => {
      resolve({ success: !error })
    })
  })
})

ipcMain.handle('get-config', () => config.load())

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
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../../assets/icons/icon.png'))
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
