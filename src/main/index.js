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
