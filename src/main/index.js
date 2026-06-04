const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
const { exec, spawn } = require('child_process')

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

  // Hide cursor in fullscreen cabinet mode
  if (!isDev) {
    win.webContents.on('did-finish-load', () => {
      win.webContents.insertCSS('* { cursor: none !important; }')
    })
  }

  return win
}

// Launch a TeknoParrot game via its XML profile
ipcMain.handle('launch-game', async (event, profilePath) => {
  return new Promise((resolve, reject) => {
    const teknoParrotPath = 'C:\\TeknoParrot\\TeknoParrotUi.exe'
    const args = [`--profile=${profilePath}`, '--startMinimized']
    const child = spawn(teknoParrotPath, args, { detached: true, stdio: 'ignore' })
    child.unref()
    resolve({ success: true })
  })
})

// Run TeknoParrot updater silently
ipcMain.handle('run-updater', async () => {
  return new Promise((resolve) => {
    exec('C:\\TeknoParrot\\ParrotPatcher.exe', (error) => {
      resolve({ success: !error, error: error?.message })
    })
  })
})

// Scan games folder and read TeknoParrot profiles
ipcMain.handle('scan-games', async (event, gamesPath) => {
  const fs = require('fs')
  const xml2js = require('xml2js')
  // Returns list of found game executables — full implementation in next session
  return { games: [], count: 0 }
})

// Add Windows Defender exclusions via PowerShell
ipcMain.handle('add-exclusions', async (event, paths) => {
  return new Promise((resolve) => {
    const ps = paths
      .map(p => `Add-MpPreference -ExclusionPath "${p}"`)
      .join('; ')
    exec(`powershell -Command "${ps}"`, (error) => {
      resolve({ success: !error })
    })
  })
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
