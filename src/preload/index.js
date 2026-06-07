const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  platform: process.platform,

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),

  // Browse
  browseFolder: () => ipcRenderer.invoke('browse-folder'),

  // Game launch
  launchGame: (profilePath) => ipcRenderer.invoke('launch-game', profilePath),
  launchPs3Game: (gamePath) => ipcRenderer.invoke('launch-ps3-game', gamePath),

  // Scanning
  scanGames: (opts) => ipcRenderer.invoke('scan-games', opts),
  scanPs3Games: (ps3GamesPath) => ipcRenderer.invoke('scan-ps3-games', ps3GamesPath),
  scanPinball: (tablesPath) => ipcRenderer.invoke('scan-pinball', tablesPath),

  // TeknoParrot updater
  runUpdater: () => ipcRenderer.invoke('run-updater'),

  // Media
  searchVideo: (title) => ipcRenderer.invoke('search-video', title),
  downloadVideo: (opts) => ipcRenderer.invoke('download-video', opts),

  // Windows Defender exclusions
  addExclusions: (paths) => ipcRenderer.invoke('add-exclusions', paths),

  // Controller overrides
  getControllerOverride: (gameId) => ipcRenderer.invoke('get-controller-override', gameId),
  setControllerOverride: (gameId, controller) => ipcRenderer.invoke('set-controller-override', gameId, controller),

  // Displays
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Signal wizard complete (enables cursor hide)
  setupComplete: () => ipcRenderer.send('setup-complete'),
})
