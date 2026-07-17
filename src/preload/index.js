const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nuarcade', {
  platform: process.platform,

  // Config
  getConfig:   () => ipcRenderer.invoke('get-config'),
  resetSetup:  () => ipcRenderer.invoke('reset-setup'),
  quit:        () => ipcRenderer.invoke('quit-app'),
  restartApp:  () => ipcRenderer.invoke('restart-app'),
  findOrphanedMedia:  (validIds) => ipcRenderer.invoke('find-orphaned-media', validIds),
  getSystemLogos: () => ipcRenderer.invoke('get-system-logos'),
  deleteOrphanedMedia: (filePaths) => ipcRenderer.invoke('delete-orphaned-media', filePaths),
  setConfig:  (updates) => ipcRenderer.invoke('set-config', updates),

  // Browse
  browseFolder:    () => ipcRenderer.invoke('browse-folder'),
  openExternal:   (url) => ipcRenderer.invoke('open-url', url),

  // TP Folder Renamer
  analyzeFolders: (opts) => ipcRenderer.invoke('analyze-folders', opts),
  renameFolder:   (opts) => ipcRenderer.invoke('rename-folder', opts),
  suggestFolderMatches: (opts) => ipcRenderer.invoke('suggest-folder-matches', opts),
  scanEmuMoviesMedia: (opts) => ipcRenderer.invoke('scan-emumovies-media', opts),
  importEmuMoviesFile: (opts) => ipcRenderer.invoke('import-emumovies-file', opts),

  // Game launch
  launchGame:          (profilePath)  => ipcRenderer.invoke('launch-game', profilePath),
  launchPs3Game:       (gamePath)     => ipcRenderer.invoke('launch-ps3-game', gamePath),
  launchXbox360Game:   (gamePath)     => ipcRenderer.invoke('launch-xbox360-game', gamePath),
  launchGCWiiGame:     (gamePath)     => ipcRenderer.invoke('launch-gcwii-game', gamePath),
  launchPs2Game:       (gamePath)     => ipcRenderer.invoke('launch-ps2-game', gamePath),
  launchSwitchGame:    (gamePath)     => ipcRenderer.invoke('launch-switch-game', gamePath),
  launchMameGame:      (gamePath)     => ipcRenderer.invoke('launch-mame-game', gamePath),
  launchRetroArch:     ()             => ipcRenderer.invoke('launch-retroarch'),
  launchRetroArchGame: (gamePath, system) => ipcRenderer.invoke('launch-retroarch-game', gamePath, system),
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
  fetchBezelsForSystem: (system) => ipcRenderer.invoke('fetch-bezels-for-system', system),
  installLocalBezels: (dryRun) => ipcRenderer.invoke('install-local-bezels', dryRun),
  pruneMameArtwork: (dryRun) => ipcRenderer.invoke('prune-mame-artwork', dryRun),
  scanN64Games:         (n64GamesPath)        => ipcRenderer.invoke('scan-n64-games', n64GamesPath),
  scanPs1Games:         (ps1GamesPath)        => ipcRenderer.invoke('scan-ps1-games', ps1GamesPath),
  scanDreamcastGames:   (dreamcastGamesPath)  => ipcRenderer.invoke('scan-dreamcast-games', dreamcastGamesPath),
  scanModel2Games:      (model2GamesPath)  => ipcRenderer.invoke('scan-model2-games', model2GamesPath),
  scanModel3Games:      (model3GamesPath)  => ipcRenderer.invoke('scan-model3-games', model3GamesPath),
  scanPspGames:         (pspGamesPath)         => ipcRenderer.invoke('scan-psp-games', pspGamesPath),
  scanWiiUGames:        (wiiUGamesPath)        => ipcRenderer.invoke('scan-wiiu-games', wiiUGamesPath),
  scanSteamGames:       (steamGamesPath)      => ipcRenderer.invoke('scan-steam-games', steamGamesPath),
  scanPcGames:          (pcGamesPath)          => ipcRenderer.invoke('scan-pc-games', pcGamesPath),

  // TeknoParrot updater
  runUpdater: () => ipcRenderer.invoke('run-updater'),

  // Media
  getVideos:     ()      => ipcRenderer.invoke('get-videos'),
  getMusicTracks:  () => ipcRenderer.invoke('get-music-tracks'),
  gameCoach:       (opts) => ipcRenderer.invoke('game-coach', opts),
  onCoachChunk:    (cb) => ipcRenderer.on('coach-chunk', (_, data) => cb(data)),
  aiSearch:        (opts) => ipcRenderer.invoke('ai-search', opts),
  downloadUpdate:  (opts) => ipcRenderer.invoke('download-update', opts),
  installUpdate:   (opts) => ipcRenderer.invoke('install-update', opts),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, data) => cb(data)),
  ensureYtdlp:   ()      => ipcRenderer.invoke('ensure-ytdlp'),
  ytdlpSearch:   (opts)  => ipcRenderer.invoke('ytdlp-search', opts),   // { gameTitle, gameId, system, emulator, genre }
  ytdlpDownload: (opts)  => ipcRenderer.invoke('ytdlp-download', opts),

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

  // Path verification
  checkPath: (folderPath) => ipcRenderer.invoke('check-path', folderPath),
  findExeInFolder: (folderPath, keyword) => ipcRenderer.invoke('find-exe-in-folder', folderPath, keyword),

  // LED / external event hooks
  gameSelected:    (gameData) => ipcRenderer.invoke('game-selected',    gameData),
  gameLaunched:    (gameData) => ipcRenderer.invoke('game-launched',    gameData),
  getEventLogPath: ()         => ipcRenderer.invoke('get-event-log-path'),
  pixelcadePush:   (gameData) => ipcRenderer.invoke('pixelcade-push',  gameData),

  // Path verification
  checkPath: (p) => ipcRenderer.invoke('check-path', p),

  // Steam + PC games
  scanSteamGames:  (p) => ipcRenderer.invoke('scan-steam-games', p),
  launchSteamGame: (id) => ipcRenderer.invoke('launch-steam-game', id),
  scanPcGames:  (p) => ipcRenderer.invoke('scan-pc-games', p),
  launchPcGame: (p) => ipcRenderer.invoke('launch-pc-game', p),

  // BIOS checker
  checkBios: () => ipcRenderer.invoke('check-bios'),

  // TeknoParrot auto-configure
  tpAutoConfigure: () => ipcRenderer.invoke('tp-auto-configure'),

  // App control
  closeApp: () => ipcRenderer.invoke('close-app'),


  // Media system (v4.4.0)
  ensureMediaFolders: (customPath) => ipcRenderer.invoke('ensure-media-folders', customPath),
  scanMedia:          (games)      => ipcRenderer.invoke('scan-media', games),
  openUrl:            (url)        => ipcRenderer.invoke('open-url', url),
  pickFolder:         ()           => ipcRenderer.invoke('pick-folder'),
  linkSnapsFolder:    (src, sys)   => ipcRenderer.invoke('link-snaps-folder', src, sys),

  // App version -- sync call so it's available immediately
  version: ipcRenderer.sendSync('get-version'),
})
