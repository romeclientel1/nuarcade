const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  launchGame: (profilePath) => ipcRenderer.invoke('launch-game', profilePath),
  runUpdater: () => ipcRenderer.invoke('run-updater'),
  scanGames: (teknoParrotPath, gamesFolderPath) =>
    ipcRenderer.invoke('scan-games', { teknoParrotPath, gamesFolderPath }),
  scanPinball: (tablesPath) => ipcRenderer.invoke('scan-pinball', tablesPath),
  addExclusions: (paths) => ipcRenderer.invoke('add-exclusions', paths),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  searchVideo: (gameTitle) => ipcRenderer.invoke('search-video', gameTitle),
  downloadVideo: (opts) => ipcRenderer.invoke('download-video', opts),
  getControllerOverride: (gameId) => ipcRenderer.invoke('get-controller-override', gameId),
  setControllerOverride: (gameId, controller) => ipcRenderer.invoke('set-controller-override', gameId, controller),
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
})