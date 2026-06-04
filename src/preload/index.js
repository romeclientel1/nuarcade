const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  // Game launching
  launchGame: (profilePath) => ipcRenderer.invoke('launch-game', profilePath),

  // TeknoParrot updater
  runUpdater: () => ipcRenderer.invoke('run-updater'),

  // Game library scan
  scanGames: (gamesPath) => ipcRenderer.invoke('scan-games', gamesPath),

  // Windows security exclusions
  addExclusions: (paths) => ipcRenderer.invoke('add-exclusions', paths),

  // Platform info
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
})
