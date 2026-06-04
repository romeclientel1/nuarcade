const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  // Game launching
  launchGame: (profilePath) => ipcRenderer.invoke('launch-game', profilePath),

  // TeknoParrot updater
  runUpdater: () => ipcRenderer.invoke('run-updater'),

  // Game library scan
  scanGames: (teknoParrotPath, gamesFolderPath) =>
    ipcRenderer.invoke('scan-games', { teknoParrotPath, gamesFolderPath }),

  // Windows security exclusions
  addExclusions: (paths) => ipcRenderer.invoke('add-exclusions', paths),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),

  // Display/monitor detection
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Platform info
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
})