const { contextBridge, ipcRenderer } = require('electron')

// -- Launch lifecycle bridge --------------------------------------------------
// Factored out as a plain function (dependency-injected on ipcRenderer)
// so it's testable under Node's built-in test runner without contextBridge
// or a real Electron process -- see preload/index.test.js.
function createLaunchLifecycleBridge(ipc) {
  const listeners = new Map() // callback -> wrapped ipcRenderer listener

  function getLaunchLifecycleStatus(sessionId) {
    return ipc.invoke('get-launch-lifecycle-status', sessionId)
  }

  function onLaunchLifecycleTerminal(callback) {
    if (listeners.has(callback)) {
      // Already subscribed with this exact callback -- don't register a
      // second underlying listener; return an unsubscribe that still
      // correctly tears down the one shared listener.
      const existing = listeners.get(callback)
      return () => {
        ipc.removeListener('launch-lifecycle-terminal', existing)
        listeners.delete(callback)
      }
    }
    const listener = (_event, status) => callback(status)
    listeners.set(callback, listener)
    ipc.on('launch-lifecycle-terminal', listener)
    return () => {
      ipc.removeListener('launch-lifecycle-terminal', listener)
      listeners.delete(callback)
    }
  }

  return { getLaunchLifecycleStatus, onLaunchLifecycleTerminal }
}

const launchLifecycle = createLaunchLifecycleBridge(ipcRenderer)

contextBridge.exposeInMainWorld('nuarcade', {
  platform: process.platform,

  // Config
  getConfig:   () => ipcRenderer.invoke('get-config'),
  getBundledCinematicMediaPath: (fileName) => ipcRenderer.invoke('get-bundled-cinematic-media-path', fileName),
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

  // Game launch -- sessionId is an optional trailing arg, renderer-created
  // and forwarded verbatim to the matching main-process launch handler so
  // it can register/track this launch in the main-process launch registry.
  launchGame:          (profilePath, sessionId)  => ipcRenderer.invoke('launch-game', profilePath, sessionId),
  launchPs3Game:       (gamePath, sessionId)     => ipcRenderer.invoke('launch-ps3-game', gamePath, sessionId),
  launchXbox360Game:   (gamePath, sessionId)     => ipcRenderer.invoke('launch-xbox360-game', gamePath, sessionId),
  launchGCWiiGame:     (gamePath, sessionId)     => ipcRenderer.invoke('launch-gcwii-game', gamePath, sessionId),
  launchPs2Game:       (gamePath, sessionId)     => ipcRenderer.invoke('launch-ps2-game', gamePath, sessionId),
  launchSwitchGame:    (gamePath, sessionId)     => ipcRenderer.invoke('launch-switch-game', gamePath, sessionId),
  launchMameGame:      (gamePath, sessionId)     => ipcRenderer.invoke('launch-mame-game', gamePath, sessionId),
  launchRetroArch:     (sessionId)               => ipcRenderer.invoke('launch-retroarch', sessionId),
  launchRetroArchGame: (gamePath, system, sessionId) => ipcRenderer.invoke('launch-retroarch-game', gamePath, system, sessionId),
  launchN64Game:       (gamePath, sessionId)     => ipcRenderer.invoke('launch-n64-game', gamePath, sessionId),
  launchPs1Game:       (gamePath, sessionId)     => ipcRenderer.invoke('launch-ps1-game', gamePath, sessionId),
  launchFlycastGame:   (gamePath, sessionId)     => ipcRenderer.invoke('launch-flycast-game', gamePath, sessionId),
  launchXemuGame:      (gamePath, sessionId)     => ipcRenderer.invoke('launch-xemu-game', gamePath, sessionId),
  launchCxbxGame:      (gamePath, sessionId)     => ipcRenderer.invoke('launch-cxbx-game', gamePath, sessionId),
  launchModel2Game:    (gamePath, sessionId)     => ipcRenderer.invoke('launch-model2-game', gamePath, sessionId),
  launchModel3Game:    (gamePath, sessionId)     => ipcRenderer.invoke('launch-model3-game', gamePath, sessionId),
  launchPspGame:       (gamePath, sessionId)     => ipcRenderer.invoke('launch-psp-game', gamePath, sessionId),
  launchWiiUGame:      (gamePath, sessionId)     => ipcRenderer.invoke('launch-wiiu-game', gamePath, sessionId),

  // Launch lifecycle -- normalized main-process registry status/events.
  getLaunchLifecycleStatus: launchLifecycle.getLaunchLifecycleStatus,
  onLaunchLifecycleTerminal: launchLifecycle.onLaunchLifecycleTerminal,

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
  scanXboxGames:        (xboxGamesPath)       => ipcRenderer.invoke('scan-xbox-games', xboxGamesPath),
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
  launchVpxTable: (tablePath, sessionId) => ipcRenderer.invoke('launch-vpx-table', tablePath, sessionId),

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
  launchSteamGame: (id, sessionId) => ipcRenderer.invoke('launch-steam-game', id, sessionId),
  scanPcGames:  (p) => ipcRenderer.invoke('scan-pc-games', p),
  launchPcGame: (p, sessionId) => ipcRenderer.invoke('launch-pc-game', p, sessionId),

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

// Exported for focused tests only -- contextBridge/exposeInMainWorld above
// is the real runtime path; this is purely additive.
module.exports = { createLaunchLifecycleBridge }
