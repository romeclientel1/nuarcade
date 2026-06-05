const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  launchGame: (profilePath) => ipcRenderer.invoke('launch-game', profilePath),
  runUpdater: () => ipcRenderer.invoke('run-updater'),
  scanGames: (teknoParrotPath, gamesFolderPath) =>
    ipcRenderer.invoke('scan-games', { teknoParrotPath, gamesFolderPath }),
  addExclusions: (paths) => ipcRenderer.invoke('add-exclusions', paths),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
})