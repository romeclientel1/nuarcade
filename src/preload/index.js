const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  platform: process.platform,

  // Config
  getConfig:  () => ipcRenderer.invoke('get-config'),
  setConfig:  (updates) => ipcRenderer.invoke('set-config', updates),

  // Browse
  browseFolder: () => ipcRenderer.invoke('browse-folder'),

  // Game launch
  launchGame:          (profilePath)  => ipcRenderer.invoke('launch-game', profilePath),
  launchPs3Game:       (gamePath)     => ipcRenderer.invoke('launch-ps3-game', gamePath),
  launchXbox360Game:   (gamePath)     => ipcRenderer.invoke('launch-xbox360-game', gamePath),
  launchGCWiiGame:     (gamePath)     => ipcRenderer.invoke('launch-gcwii-game', gamePath),
  launchPs2Game:       (gamePath)     => ipcRenderer.invoke('launch-ps2-game', gamePath),
  launchSwitchGame:    (gamePath)     => ipcRenderer.invoke('launch-switch-game', gamePath),
  launchMameGame:      (gamePath)     => ipcRenderer.invoke('launch-mame-game', gamePath),
  launchRetroArchGame: (gamePath)     => ipcRenderer.invoke('launch-retroarch-game', gamePath),
  launchN64Game:       (gamePath)     => ipcRenderer.invoke('launch-n64-game', gamePath),
  launchPs1Game:       (gamePath)     => ipcRenderer.invoke('launch-ps1-game', gamePath),
  launchFlycastGame:   (gamePath)     => ipcRenderer.invoke('launch-flycast-game', gamePath),
  launchModel2Game:    (gamePath)     => ipcRenderer.invoke('launch-model2-game', gamePath),
  launchModel3Game:    (gamePath)     => ipcRenderer.invoke('launch-model3-game', gamePath),
  launchPspGame:       (gamePath)     => ipcRenderer.invoke('launch-psp-game', gamePath),
  launchWiiUGame:      (gamePath)     => ipcRenderer.invoke('launch-wiiu-game', gamePath),

  // Scanning
  scanGames:            (opts)                => ipcRenderer.invoke('scan-games', opts),
  scanPs3Games:         (ps3GamesPath)        => ipcRenderer.invoke('scan-ps3-games', ps3GamesPath),
  scanXbox360Games:     (xbox360Path)         => ipcRenderer.invoke('scan-xbox360-games', xbox360Path),
  scanGCWiiGames:       (gcWiiPath)           => ipcRenderer.invoke('scan-gcwii-games', gcWiiPath),
  scanPs2Games:         (ps2GamesPath)        => ipcRenderer.invoke('scan-ps2-games', ps2GamesPath),
  scanSwitchGames:      (switchGamesPath)     => ipcRenderer.invoke('scan-switch-games', switchGamesPath),
  scanPinball:          (tablesPath)          => ipcRenderer.invoke('scan-pinball', tablesPath),
  scanMameGames:        (mameGamesPath)       => ipcRenderer.invoke('scan-mame-games', mameGamesPath),
  scanRetroArchGames:   (retroarchGamesPath)  => ipcRenderer.invoke('scan-retroarch-games', retroarchGamesPath),
  scanN64Games:         (n64GamesPath)        => ipcRenderer.invoke('scan-n64-games', n64GamesPath),
  scanPs1Games:         (ps1GamesPath)        => ipcRenderer.invoke('scan-ps1-games', ps1GamesPath),
  scanDreamcastGames:   (dreamcastGamesPath)  => ipcRenderer.invoke('scan-dreamcast-games', dreamcastGamesPath),
  scanModel2Games:      (model2GamesPath)  => ipcRenderer.invoke('scan-model2-games', model2GamesPath),
  scanModel3Games:      (model3GamesPath)  => ipcRenderer.invoke('scan-model3-games', model3GamesPath),
  scanPspGames:         (pspGamesPath)         => ipcRenderer.invoke('scan-psp-games', pspGamesPath),
  scanWiiUGames:        (wiiUGamesPath)        => ipcRenderer.invoke('scan-wiiu-games', wiiUGamesPath),

  // TeknoParrot updater
  runUpdater: () => ipcRenderer.invoke('run-updater'),

  // Media
  searchVideo:   (title) => ipcRenderer.invoke('search-video', title),
  downloadVideo: (opts)  => ipcRenderer.invoke('download-video', opts),

  // Windows Defender exclusions
  addExclusions: (paths) => ipcRenderer.invoke('add-exclusions', paths),

  // Folder structure
  createFolderStructure: () => ipcRenderer.invoke('create-folder-structure'),

  // Backup / restore
  backupConfig:          () => ipcRenderer.invoke('backup-config'),
  backupLocalStorage:    (data) => ipcRenderer.invoke('backup-localstorage', data),
  restoreConfig:         () => ipcRenderer.invoke('restore-config'),

  // Marquee display
  openMarquee: () => ipcRenderer.invoke('open-marquee'),
  closeMarquee: () => ipcRenderer.invoke('close-marquee'),
  updateMarquee: (data) => ipcRenderer.invoke('update-marquee', data),

  // Controller overrides
  getControllerOverride: (gameId)             => ipcRenderer.invoke('get-controller-override', gameId),
  setControllerOverride: (gameId, controller) => ipcRenderer.invoke('set-controller-override', gameId, controller),

  // Displays
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Signal wizard complete (enables cursor hide)
  setupComplete: () => ipcRenderer.send('setup-complete'),

  // Save text file
  saveTxt: (opts) => ipcRenderer.invoke('save-txt', opts),

  // VPX pinball launch
  launchVpxTable: (tablePath) => ipcRenderer.invoke('launch-vpx-table', tablePath),

  // LED / external event hooks
  gameSelected:    (gameData) => ipcRenderer.invoke('game-selected',    gameData),
  gameLaunched:    (gameData) => ipcRenderer.invoke('game-launched',    gameData),
  getEventLogPath: ()         => ipcRenderer.invoke('get-event-log-path'),
  pixelcadePush:   (gameData) => ipcRenderer.invoke('pixelcade-push',  gameData),

  // BIOS checker
  checkBios: () => ipcRenderer.invoke('check-bios'),
})
