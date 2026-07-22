import { useState, useEffect, useRef } from "react"
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import ControllerTest from "../ControllerTest/ControllerTest"
import { usePlaytime } from "../../hooks/usePlaytime"
import ArtworkManager from "../ArtworkManager/ArtworkManager"
import styles from "./Settings.module.css"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { THEMES } from "../../hooks/useTheme"
import { useI18n } from "../../i18n/I18nContext.js"

// Path/emulator config keys that require an app restart to take effect
// (game library only re-scans on next launch, per the cache design)
const RESTART_KEYS = new Set([
  'teknoParrotPath', 'gamesFolderPath', 'mamePath', 'mameGamesPath',
  'model2Path', 'model2GamesPath', 'model3Path', 'model3GamesPath',
  'retroarchPath', 'retroarchGamesPath', 'project64Path', 'n64GamesPath',
  'duckstationPath', 'ps1GamesPath', 'flycastPath', 'dreamcastGamesPath',
  'xemuPath', 'cxbxPath', 'xboxGamesPath',
  'ppssppPath', 'pspGamesPath', 'pcsx2Path', 'ps2GamesPath',
  'rpcs3Path', 'ps3GamesPath', 'xeniaPath', 'xbox360GamesPath',
  'dolphinPath', 'gcWiiGamesPath', 'cemuPath', 'wiiUGamesPath',
  'ryujinxPath', 'switchGamesPath', 'pinballPath', 'tablesPath',
  'steamPath', 'pcGamesPath', 'mediaPath',
])

// Real exe filename for each emulator -- used to verify actual installation via filesystem check
const EMULATOR_EXE_KEYWORDS = {
  teknoParrotPath: 'teknoparrot',
  rpcs3Path: 'rpcs3',
  xeniaPath: 'xenia',
  dolphinPath: 'dolphin',
  pcsx2Path: 'pcsx2',
  ryujinxPath: 'ryu',
  mamePath: 'mame',
  retroarchPath: 'retroarch',
  project64Path: 'project64',
  duckstationPath: 'duckstation',
  flycastPath: 'flycast',
  xemuPath: 'xemu',
  cxbxPath: 'cxbx',
  model2Path: 'model2',
  model3Path: 'supermodel',
  ppssppPath: 'ppsspp',
  cemuPath: 'cemu',
  pinballPath: 'vpinball',
}

export default function Settings({ games = [], onClose, onCRTChange, crtEnabled, themeId, onThemeChange }) {
  const { t, locale, setLocale, supportedLocales } = useI18n()
  const scrollRef = useRef(null)
  const saveRef    = useRef(null)
  useOverlayGamepad({
    onClose,
    onUp:      () => scrollRef.current?.scrollBy({ top: -200, behavior: 'smooth' }),
    onDown:    () => scrollRef.current?.scrollBy({ top:  200, behavior: 'smooth' }),
    onConfirm: () => saveRef.current?.click(),
  })

  const [config, setConfig] = useState(null)
  const [restartNeeded, setRestartNeeded] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const changedPathKeysRef = useRef(new Set())
  const [installedMap, setInstalledMap] = useState({})
  // -- Orphaned media cleanup state --
  const [orphanScanning, setOrphanScanning] = useState(false)
  const [orphanResult, setOrphanResult] = useState(null)
  const [cleaningOrphans, setCleaningOrphans] = useState(false)
  const [orphanCleanupDone, setOrphanCleanupDone] = useState(null)
  // -- TeknoParrot Folder Renamer state --
  const [folderScan, setFolderScan] = useState(null)       // null = not yet scanned
  const [scanningFolders, setScanningFolders] = useState(false)
  const [renamedFolders, setRenamedFolders] = useState({}) // folderName -> 'done' | 'error'
  const [manualPick, setManualPick] = useState({})         // folderName -> chosen target key

  const handleScanFolders = async () => {
    if (!window.nuarcade?.suggestFolderMatches) return
    setScanningFolders(true)
    setFolderScan(null)
    try {
      const result = await window.nuarcade.suggestFolderMatches({
        teknoParrotPath: config.teknoParrotPath,
        gamesFolderPath: config.gamesFolderPath,
      })
      setFolderScan(result)
    } catch (e) {
      setFolderScan({ suggestions: [], error: e.message })
    }
    setScanningFolders(false)
  }

  const handleRenameFolder = async (folderName, targetKey) => {
    if (!targetKey || !window.nuarcade?.renameFolder) return
    const ok = await window.nuarcade.renameFolder({
      gamesFolder: config.gamesFolderPath,
      from: folderName,
      to: targetKey,
    })
    setRenamedFolders(prev => ({ ...prev, [folderName]: ok ? 'done' : 'error' }))
    if (ok) {
      changedPathKeysRef.current.add('gamesFolderPath')
      // Renamed folders need a fresh scan -- clear the cache immediately so a
      // restart (with or without clicking Save) actually picks up the change
      try {
        localStorage.removeItem('nuarcade_game_cache')
        localStorage.removeItem('nuarcade_game_cache_ts')
      } catch {}
      setRestartNeeded(true)
    }
  }

  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { updateAvailable, remoteVersion, handleUpdateNow, installing, progress } = useVersionCheck()
const { getAllPlaytime, formatTime } = usePlaytime()
const [showControllerTest, setShowControllerTest] = useState(false)
const [rescanning, setRescanning] = useState(false)
const [backingUp, setBackingUp] = useState(false)
const [restoring, setRestoring] = useState(false)
  const [artPref, setArtPref] = useState(() => localStorage.getItem('nuarcade_art_pref') || 'sgdb')
  const updateArtPref = (val) => { setArtPref(val); localStorage.setItem('nuarcade_art_pref', val) }
const [rescanResult, setRescanResult] = useState(null)
const [pruneFetching, setPruneFetching] = useState(false)
const [pruneResult, setPruneResult] = useState(null)
const [localBezelFetching, setLocalBezelFetching] = useState(false)
const [localBezelResult, setLocalBezelResult] = useState(null)
const [tpConfiguring, setTpConfiguring] = useState(false)
const [tpResult, setTpResult] = useState(null)
const [showArtworkMgr, setShowArtworkMgr] = useState(false)
const [biosResult, setBiosResult] = useState(null)
const [checkingBios, setCheckingBios] = useState(false)
const [marqueeOpen, setMarqueeOpen] = useState(false)
const [ytdlpStatus, setYtdlpStatus] = useState(null) // null=unchecked, 'present', 'missing', 'installing', 'error'
const [ytdlpError, setYtdlpError] = useState(null)

  // Check real filesystem existence for every emulator exe -- runs once config loads and after save
  useEffect(() => {
    if (!config || !window.nuarcade?.checkPath) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        Object.entries(EMULATOR_EXE_KEYWORDS).map(async ([pathKey, keyword]) => {
          const folder = config[pathKey]
          if (!folder) return [pathKey, false]
          try {
            const result = await window.nuarcade.findExeInFolder(folder, keyword)
            return [pathKey, !!result?.found]
          } catch {
            return [pathKey, false]
          }
        })
      )
      if (!cancelled) setInstalledMap(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [config, saved])

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    if (window.nuarcade) {
      const cfg = await window.nuarcade.getConfig()
      setConfig(cfg)
      // Check if yt-dlp is already present
      if (window.nuarcade.checkPath && cfg.ytdlpPath) {
        window.nuarcade.checkPath(cfg.ytdlpPath)
          .then(r => setYtdlpStatus(r?.exists ? 'present' : 'missing'))
          .catch(() => setYtdlpStatus('missing'))
      }
    } else {
      setConfig({
        teknoParrotPath: "F:/TeknoParrot/",
        gamesFolderPath: "F:/ArcadeGames/",
        steamPath:       "C:/Program Files (x86)/Steam/steamapps",
        pcGamesPath:     "F:/PCGames/",
        pinballPath:     "F:/vPinball/",
        tablesPath:      "F:/PinballTables/",
        mediaPath:       "F:/Media/",
        displayMode:     "fullscreen",
        attractTimeout:  120,
        ambientVolume:   35,
        crtEffect:       false,
        autoLaunchLast:  false,
      })
    }
  }

  const handleMarquee = async () => {
  if (marqueeOpen) {
    await window.nuarcade?.closeMarquee()
    setMarqueeOpen(false)
  } else {
    await window.nuarcade?.openMarquee()
    setMarqueeOpen(true)
  }
}

const handleRescan = async () => {
  if (!window.nuarcade) return
  setRescanning(true)
  setRescanResult(null)
  try {
    const cfg = config
    const results = []
    const scan = async (label, fn) => {
      try {
        const r = await fn()
        const n = r.games?.length || 0
        results.push({ label, count: n, error: null, skippedCount: r.skippedCount || 0 })
        return n
      } catch (e) {
        results.push({ label, count: 0, error: e.message, skippedCount: 0 })
        return 0
      }
    }
    await scan("TeknoParrot", () => window.nuarcade.scanGames({ teknoParrotPath: cfg.teknoParrotPath, gamesFolderPath: cfg.gamesFolderPath }))
    await scan("MAME",        () => window.nuarcade.scanMameGames(cfg.mameGamesPath))
    await scan("Model 2",     () => window.nuarcade.scanModel2Games(cfg.model2GamesPath))
    await scan("Model 3",     () => window.nuarcade.scanModel3Games(cfg.model3GamesPath))
    await scan("RetroArch",   () => window.nuarcade.scanRetroArchGames(cfg.retroarchGamesPath))
    await scan("Project64",   () => window.nuarcade.scanN64Games(cfg.n64GamesPath))
    await scan("DuckStation", () => window.nuarcade.scanPs1Games(cfg.ps1GamesPath))
    await scan("Flycast",     () => window.nuarcade.scanDreamcastGames(cfg.dreamcastGamesPath))
    await scan("Xbox",         () => window.nuarcade.scanXboxGames(cfg.xboxGamesPath))
    await scan("PPSSPP",      () => window.nuarcade.scanPspGames(cfg.pspGamesPath))
    await scan("PCSX2",       () => window.nuarcade.scanPs2Games(cfg.ps2GamesPath))
    await scan("RPCS3",       () => window.nuarcade.scanPs3Games(cfg.ps3GamesPath))
    await scan("Xenia",       () => window.nuarcade.scanXbox360Games(cfg.xbox360GamesPath))
    await scan("Dolphin",     () => window.nuarcade.scanGCWiiGames(cfg.gcWiiGamesPath))
    await scan("Cemu",        () => window.nuarcade.scanWiiUGames(cfg.wiiUGamesPath))
    await scan("Ryujinx",     () => window.nuarcade.scanSwitchGames(cfg.switchGamesPath))
    await scan("Pinball",     () => window.nuarcade.scanPinball(cfg.tablesPath))
    await scan("Steam",       () => window.nuarcade.scanSteamGames(cfg.steamPath))
    await scan("PC Games",    () => window.nuarcade.scanPcGames(cfg.pcGamesPath))
    const total = results.reduce((s, r) => s + r.count, 0)
    // Clear game cache so library rescans on next launch
      localStorage.removeItem('nuarcade_game_cache')
      localStorage.removeItem('nuarcade_game_cache_ts')
      setRescanResult({ total, results })
  } catch (e) { setRescanResult({ total: 0, results: [], error: e.message }) }
  setRescanning(false)
}

const handlePruneMameArtwork = async (dryRun) => {
  if (!window.nuarcade) return
  setPruneFetching(true)
  if (dryRun) setPruneResult(null)
  try {
    const r = await window.nuarcade.pruneMameArtwork(dryRun)
    setPruneResult(r)
  } catch (e) {
    setPruneResult({ success: false, error: e.message })
  }
  setPruneFetching(false)
}

const handleInstallLocalBezels = async (dryRun) => {
  if (!window.nuarcade) return
  setLocalBezelFetching(true)
  if (dryRun) setLocalBezelResult(null)
  try {
    const r = await window.nuarcade.installLocalBezels(dryRun)
    setLocalBezelResult(r)
  } catch (e) {
    setLocalBezelResult({ success: false, error: e.message })
  }
  setLocalBezelFetching(false)
}

const handleFindOrphans = async () => {
  if (!window.nuarcade) return
  setOrphanScanning(true)
  setOrphanResult(null)
  setOrphanCleanupDone(null)
  try {
    const cfg = config
    const validIds = new Set()
    const collect = async (fn) => {
      try {
        const r = await fn()
        for (const g of (r.games || [])) validIds.add(g.id || g.profile)
      } catch (e) {}
    }
    await collect(() => window.nuarcade.scanGames({ teknoParrotPath: cfg.teknoParrotPath, gamesFolderPath: cfg.gamesFolderPath }))
    await collect(() => window.nuarcade.scanMameGames(cfg.mameGamesPath))
    await collect(() => window.nuarcade.scanModel2Games(cfg.model2GamesPath))
    await collect(() => window.nuarcade.scanModel3Games(cfg.model3GamesPath))
    await collect(() => window.nuarcade.scanRetroArchGames(cfg.retroarchGamesPath))
    await collect(() => window.nuarcade.scanN64Games(cfg.n64GamesPath))
    await collect(() => window.nuarcade.scanPs1Games(cfg.ps1GamesPath))
    await collect(() => window.nuarcade.scanDreamcastGames(cfg.dreamcastGamesPath))
    await collect(() => window.nuarcade.scanXboxGames(cfg.xboxGamesPath))
    await collect(() => window.nuarcade.scanPspGames(cfg.pspGamesPath))
    await collect(() => window.nuarcade.scanPs2Games(cfg.ps2GamesPath))
    await collect(() => window.nuarcade.scanPs3Games(cfg.ps3GamesPath))
    await collect(() => window.nuarcade.scanXbox360Games(cfg.xbox360GamesPath))
    await collect(() => window.nuarcade.scanGCWiiGames(cfg.gcWiiGamesPath))
    await collect(() => window.nuarcade.scanWiiUGames(cfg.wiiUGamesPath))
    await collect(() => window.nuarcade.scanSwitchGames(cfg.switchGamesPath))
    await collect(() => window.nuarcade.scanPinball(cfg.tablesPath))
    await collect(() => window.nuarcade.scanSteamGames(cfg.steamPath))
    await collect(() => window.nuarcade.scanPcGames(cfg.pcGamesPath))

    // Also check artwork localStorage entries with no matching game at all
    let orphanedArtworkKeys = []
    try {
      const artwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}')
      orphanedArtworkKeys = Object.keys(artwork).filter(k => !validIds.has(k))
    } catch (e) {}

    const media = await window.nuarcade.findOrphanedMedia([...validIds])
    setOrphanResult({ ...media, orphanedArtworkKeys, validCount: validIds.size })
  } catch (e) {
    setOrphanResult({ error: e.message })
  }
  setOrphanScanning(false)
}

const handleCleanupOrphans = async () => {
  if (!orphanResult || cleaningOrphans) return
  setCleaningOrphans(true)
  try {
    const allFiles = [
      ...(orphanResult.orphanedVideos || []),
      ...(orphanResult.staleFragments || []),
      ...(orphanResult.orphanedArtwork || []),
    ]
    const result = await window.nuarcade.deleteOrphanedMedia(allFiles)

    if (orphanResult.orphanedArtworkKeys?.length) {
      try {
        const artwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}')
        for (const k of orphanResult.orphanedArtworkKeys) delete artwork[k]
        localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork))
      } catch (e) {}
    }

    setOrphanCleanupDone(result)
    setOrphanResult(null)
  } catch (e) {
    setOrphanCleanupDone({ deleted: 0, errors: [{ error: e.message }] })
  }
  setCleaningOrphans(false)
}

const LS_BACKUP_KEYS = [
  "nuarcade_favorites", "nuarcade_recent", "nuarcade_artwork",
  "nuarcade_ratings", "nuarcade_notes", "nuarcade_first_seen",
  "nuarcade_playtime", "nuarcade_launches", "nuarcade_last_game_count", "nuarcade_collections",
]

const handleBackup = async () => {
  setBackingUp(true)
  try {
    const lsData = {}
    LS_BACKUP_KEYS.forEach(key => {
      const val = localStorage.getItem(key)
      if (val) lsData[key] = val
    })
    const result = await window.nuarcade?.backupLocalStorage(lsData)
    if (result?.success) alert("Full backup saved to " + result.path + "\n\nIncludes: config, favorites, ratings, notes, playtime, artwork, collections.")
  } catch (e) { alert("Backup failed: " + e.message) }
  setBackingUp(false)
}

const handleRestore = async () => {
  setRestoring(true)
  try {
    const result = await window.nuarcade?.restoreConfig()
    if (result?.success) {
      // Restore localStorage keys if present in backup
      if (result.localStorage) {
        Object.entries(result.localStorage).forEach(([key, val]) => {
          if (LS_BACKUP_KEYS.includes(key)) localStorage.setItem(key, val)
        })
      }
      const keys = Object.keys(result.localStorage || {})
      alert(
        "Restored from backup dated " + new Date(result.date).toLocaleDateString() +
        (keys.length ? "\n\nAlso restored: " + keys.map(k => k.replace("nuarcade_","")).join(", ") : "")
      )
      loadConfig()
    } else if (result?.error) {
      alert("Restore failed: " + result.error)
    }
  } catch (e) { alert("Restore failed: " + e.message) }
  setRestoring(false)
}

const handleSave = async () => {
    if (window.nuarcade) await window.nuarcade.setConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (changedPathKeysRef.current.size > 0) {
      setRestartNeeded(true)
      changedPathKeysRef.current.clear()
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const playtime = JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}")
      const launches = JSON.parse(localStorage.getItem("nuarcade_launches")  || "{}")
      const ratings  = JSON.parse(localStorage.getItem("nuarcade_ratings")   || "{}")
      const notes    = JSON.parse(localStorage.getItem("nuarcade_notes")     || "{}")
      const favs     = JSON.parse(localStorage.getItem("nuarcade_favorites") || "[]")

      const sorted = [...games].sort((a, b) => {
        const at = playtime[a.id||a.profile]?.total || 0
        const bt = playtime[b.id||b.profile]?.total || 0
        if (bt !== at) return bt - at
        return a.title.localeCompare(b.title)
      })

      const lines = [
        "NuArcade Game Library",
        "Generated: " + new Date().toLocaleString(),
        "Total games: " + sorted.length,
        "=".repeat(70),
        "",
        ...sorted.map((g, i) => {
          const id    = g.id || g.profile
          const secs  = playtime[id]?.total || 0
          const mins  = Math.round(secs / 60)
          const h     = Math.floor(mins / 60)
          const m     = mins % 60
          const time  = secs > 0 ? (h > 0 ? h + "h " + m + "m" : m + "m") : "-"
          const lc    = launches[id]?.count || 0
          const stars = "*".repeat(ratings[id] || 0) || "-"
          const fav   = favs.includes(id) ? " [FAV]" : ""
          const note  = notes[id] ? "\n   Note: " + notes[id].slice(0, 100) : ""
          return (i+1) + ". " + g.title + fav +
            "\n   System: " + (g.system||g.genre||"-") + " | Emulator: " + (g.emulator||"-") +
            "\n   Playtime: " + time + " | Launched: " + lc + "x | Rating: " + stars +
            note
        })
      ]
      const text = lines.join("\n")
      if (window.nuarcade?.saveTxt) {
        await window.nuarcade.saveTxt({ content: text, defaultName: "nuarcade-library.txt" })
      } else {
        console.log(text)
      }
    } catch (e) { console.error(e) }
    setTimeout(() => setExporting(false), 1000)
  }

  const update = (key, val) => {
    setConfig(c => ({ ...c, [key]: val }))
    if (key === "crtEffect") onCRTChange?.(val)
    if (RESTART_KEYS.has(key)) changedPathKeysRef.current.add(key)
  }

  if (!config) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>{t("settings.title")}</div>
            <div className={styles.sub}>{t("settings.subtitle")}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title={t("common.close") + " (B)"}>X</button>
        </div>

        <div className={styles.body} ref={scrollRef}>

          {restartNeeded && (
            <div className={styles.updateBanner} style={{
              background: '#2a1f00', borderColor: '#ffaa00',
              position: 'sticky', top: 0, zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <span>{t("settings.restartRequired")}</span>
              <button className={styles.updateBtn} style={{ background: '#ffaa00' }} onClick={() => setShowRestartConfirm(true)}>
                {t("settings.restartNow")}
              </button>
            </div>
          )}

          {updateAvailable && (
            <div className={styles.updateBanner}>
              <span>{t("settings.updateAvailable", { version: remoteVersion })}</span>
              <button className={styles.updateLink} onClick={handleUpdateNow} disabled={installing}>
                {installing ? (progress != null ? t("settings.installing", { progress }) : t("settings.installingEllipsis")) : t("settings.updateNow")}
              </button>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.section}>
        <div className={styles.sectionTitle}>{t("settings.sectionEmulators")}</div>
        <div className={styles.pathsNote}>
          {t("settings.emulatorsNote")}
        </div>
        <div className={styles.emulatorGrid}>
          {[
            { name: 'TeknoParrot',          url: 'https://teknoparrot.com/',                                            pathKey: 'teknoParrotPath' },
            { name: 'RPCS3',                url: 'https://rpcs3.net',                                                   pathKey: 'rpcs3Path' },
            { name: 'Xenia',                url: 'https://xenia.jp',                                                    pathKey: 'xeniaPath' },
            { name: 'Dolphin',              url: 'https://dolphin-emu.org',                                             pathKey: 'dolphinPath' },
            { name: 'PCSX2',               url: 'https://pcsx2.net',                                                    pathKey: 'pcsx2Path' },
            { name: 'Ryubing',              url: 'https://ryujinx.app/download',                                        pathKey: 'ryujinxPath' },
            { name: 'MAME',                url: 'https://www.mamedev.org',                                              pathKey: 'mamePath' },
            { name: 'RetroArch',           url: 'https://www.retroarch.com',                                            pathKey: 'retroarchPath' },
            { name: 'Project64',           url: 'https://www.pj64-emu.com',                                             pathKey: 'project64Path' },
            { name: 'DuckStation',         url: 'https://www.duckstation.org',                                          pathKey: 'duckstationPath' },
            { name: 'Flycast',             url: 'https://github.com/flyinghead/flycast/releases',                       pathKey: 'flycastPath' },
            { name: 'Xemu',                url: 'https://xemu.app',                                                     pathKey: 'xemuPath' },
            { name: 'Cxbx-Reloaded',        url: 'https://github.com/Cxbx-Reloaded/Cxbx-Reloaded/releases',             pathKey: 'cxbxPath' },
            { name: 'Model 2 Emulator',    url: 'https://emulation.gametechwiki.com/index.php/Model_2_Emulator',        pathKey: 'model2Path' },
            { name: 'Supermodel (M3)',      url: 'https://github.com/trzy/Supermodel/releases',                        pathKey: 'model3Path' },
            { name: 'PPSSPP',              url: 'https://www.ppsspp.org',                                               pathKey: 'ppssppPath' },
            { name: 'Cemu',                url: 'https://cemu.info',                                                    pathKey: 'cemuPath' },
            { name: 'Visual Pinball X',     url: 'https://github.com/vpinball/vpinball/releases',                      pathKey: 'pinballPath' },
          ].map(e => {
            const installed = !!installedMap[e.pathKey]
            return (
              <button
                key={e.name}
                className={styles.emulatorBtn + (installed ? '' : ' ' + styles.emulatorBtnDim)}
                onClick={() => window.open(e.url, '_blank')}
                title={installed ? t("settings.emulatorDetected") : t("settings.emulatorNotDetected")}
              >
                {installed && <span style={{ color: '#00ff88', marginRight: 6 }}>&#10003;</span>}
                {e.name}
                <span className={styles.emulatorArrow}>&#8599;</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.sectionTitle}>{t("settings.sectionPaths")}</div>
            <div className={styles.pathsNote}>
              {t("settings.pathsNote")}
            </div>
            {[
              { key: "teknoParrotPath",    label: "TeknoParrot",         sub: "Folder containing TeknoParrotUi.exe" },
              { key: "gamesFolderPath",    label: "Arcade Games",         sub: "Folder containing your TP game subfolders" },
              { key: "mamePath",           label: "MAME",                 sub: "Folder containing mame.exe" },
              { key: "mameGamesPath",      label: "MAME ROMs",            sub: "Folder containing .zip ROM files" },
              { key: "bezelSourcePath",     label: "Bezel Source Folder",  sub: "Your own EmuMovies Sync / Hyperspin bezel downloads (optional)" },
              { key: "model2Path",         label: "Model 2",              sub: "Folder containing Model2Emulator.exe" },
              { key: "model2GamesPath",    label: "Model 2 Games",        sub: "Folder containing Model 2 game folders" },
              { key: "model3Path",         label: "Supermodel (M3)",      sub: "Folder containing Supermodel.exe" },
              { key: "model3GamesPath",    label: "Model 3 Games",        sub: "Folder containing Model 3 ROM files" },
              { key: "retroarchPath",      label: "RetroArch",            sub: "Folder containing retroarch.exe" },
              { key: "retroarchGamesPath", label: "RetroArch Games",      sub: "Folder containing your ROM files" },
              { key: "project64Path",      label: "Project64",            sub: "Folder containing Project64.exe" },
              { key: "n64GamesPath",       label: "N64 Games",            sub: "Folder containing .n64 / .z64 ROMs" },
              { key: "duckstationPath",    label: "DuckStation",          sub: "Folder containing duckstation-qt-x64-RelWithDebInfo.exe" },
              { key: "ps1GamesPath",       label: "PS1 Games",            sub: "Folder containing .bin/.cue/.iso files" },
              { key: "flycastPath",        label: "Flycast",              sub: "Folder containing flycast.exe" },
              { key: "dreamcastGamesPath", label: "Dreamcast Games",      sub: "Folder containing .gdi/.cdi/.chd files" },
              { key: "xemuPath",           label: "Xemu",                 sub: "Folder containing xemu.exe" },
              { key: "cxbxPath",           label: "Cxbx-Reloaded",        sub: "Folder containing cxbxr-ldr.exe" },
              { key: "xboxGamesPath",      label: "Xbox Games",           sub: ".iso files for Xemu, or extracted folders with a .xbe for Cxbx-Reloaded" },
              { key: "ppssppPath",         label: "PPSSPP",               sub: "Folder containing PPSSPPWindows64.exe" },
              { key: "pspGamesPath",       label: "PSP Games",            sub: "Folder containing .iso/.cso files" },
              { key: "pcsx2Path",          label: "PCSX2",                sub: "Folder containing pcsx2-qt.exe" },
              { key: "ps2GamesPath",       label: "PS2 Games",            sub: "Folder containing .iso/.bin files" },
              { key: "rpcs3Path",          label: "RPCS3",                sub: "Folder containing rpcs3.exe" },
              { key: "ps3GamesPath",       label: "PS3 Games",            sub: "Folder containing PS3_GAME subfolders" },
              { key: "xeniaPath",          label: "Xenia",                sub: "Folder containing xenia.exe" },
              { key: "xbox360GamesPath",   label: "Xbox 360 Games",       sub: "Folder containing .iso/.xex files" },
              { key: "dolphinPath",        label: "Dolphin",              sub: "Folder containing Dolphin.exe" },
              { key: "gcWiiGamesPath",     label: "GC/Wii Games",         sub: "Folder containing .iso/.rvz/.gcm files" },
              { key: "cemuPath",           label: "Cemu",                 sub: "Folder containing Cemu.exe" },
              { key: "wiiUGamesPath",      label: "Wii U Games",          sub: "Folder containing .rpx game folders" },
              { key: "ryujinxPath",        label: "Ryujinx",              sub: "Folder containing Ryujinx.exe" },
              { key: "switchGamesPath",    label: "Switch Games",         sub: "Folder containing .nsp/.xci files" },
              { key: "pinballPath",        label: "VPX Engine",           sub: "Folder containing VPinballX64.exe" },
              { key: "tablesPath",         label: "Pinball Tables",       sub: "Folder containing .vpx table files" },
              { key: "steamPath",          label: "Steam",                sub: "steamapps folder (e.g. Steam/steamapps)" },
              { key: "pcGamesPath",        label: "PC Games",             sub: "Folder containing PC game subfolders" },
              { key: "mediaPath",          label: "Media folder",         sub: "Folder for downloaded artwork/videos" },
            ].map(p => (
              <div key={p.key} className={styles.inputRow}>
                <div className={styles.inputLabelStack}>
                  <label className={styles.inputLabel}>{p.label}</label>
                  {p.sub && <span className={styles.inputSub}>{p.sub}</span>}
                </div>
                <input
                  className={styles.input}
                  value={config[p.key] || ""}
                  onChange={e => update(p.key, e.target.value)}
                  spellCheck={false}
                />
                <button className={styles.browseBtn} onClick={async () => {
                  const result = await window.nuarcade?.browseFolder()
                  if (result) update(p.key, result)
                }}>{t("settings.browse")}</button>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionTpFolderRenamer")}</div>
        <div className={styles.pathsNote}>
          {t("settings.tpRenamerNote")}
        </div>

        <button
          className={styles.exportBtn}
          onClick={handleScanFolders}
          disabled={scanningFolders || !config.teknoParrotPath || !config.gamesFolderPath}
          style={{ marginBottom: 12 }}
        >
          {scanningFolders ? t("common.scanning") : t("settings.scanUnmatchedFolders")}
        </button>

        {folderScan?.error && (
          <div style={{ color: '#ff8888', fontSize: 12, padding: '6px 0' }}>{folderScan.error}</div>
        )}

        {folderScan && !folderScan.error && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
            {folderScan.suggestions.length === 0
              ? t("settings.tpRenamerAllMatched")
              : t("settings.tpRenamerNeedAttention", { count: folderScan.suggestions.length, total: folderScan.totalFolders })}
          </div>
        )}

        {folderScan?.suggestions?.map(s => {
          const renameState = renamedFolders[s.folderName]
          const chosen = manualPick[s.folderName] ?? s.topMatch?.key ?? ''
          return (
            <div key={s.folderName} style={{
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: 10, marginBottom: 8,
              background: renameState === 'done' ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: '#fff', marginBottom: 6 }}>
                {s.folderName}
              </div>
              {renameState === 'done' ? (
                <div style={{ color: '#00ff88', fontSize: 12 }}>{t("settings.tpRenamedTo", { name: chosen })}</div>
              ) : renameState === 'error' ? (
                <div style={{ color: '#ff4444', fontSize: 12 }}>{t("settings.tpRenameFailed")}</div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {(s.topMatch || s.alternates?.length) ? (
                    <select
                      className={styles.input}
                      style={{ flex: 1, minWidth: 200 }}
                      value={chosen}
                      onChange={e => setManualPick(prev => ({ ...prev, [s.folderName]: e.target.value }))}
                    >
                      {s.topMatch && (
                        <option value={s.topMatch.key}>
                          {s.topMatch.gameName} ({Math.round(s.topMatch.score * 100)}% match{s.confident ? ', confident' : ''})
                        </option>
                      )}
                      {s.alternates?.map(alt => (
                        <option key={alt.key} value={alt.key}>
                          {alt.gameName} ({Math.round(alt.score * 100)}% match)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, flex: 1 }}>{t("settings.tpNoMatch")}</div>
                  )}
                  <button
                    className={styles.exportBtn}
                    disabled={!chosen}
                    onClick={() => handleRenameFolder(s.folderName, chosen)}
                  >
                    {t("settings.tpRename")}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <div className={styles.sectionTitle}>{t("settings.sectionDisplay")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.mode")}</label>
              <div className={styles.toggleGroup}>
                {["fullscreen", "windowed"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (config.displayMode === m ? " " + styles.toggleActive : "")}
                    onClick={() => update("displayMode", m)}
                  >
                    {m === "fullscreen" ? t("settings.fullscreen") : t("settings.windowed")}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.crtEffect")}</label>
              <div className={styles.toggleGroup}>
                {["off", "on"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (!!config.crtEffect === (m === "on") ? " " + styles.toggleActive : "")}
                    onClick={() => update("crtEffect", m === "on")}
                    style={{ textTransform: 'uppercase' }}
                  >
                    {m === "on" ? t("common.on") : t("common.off")}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.autoLaunchLast")}</label>
              <div className={styles.toggleGroup}>
                {["off", "on"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (!!config.autoLaunchLast === (m === "on") ? " " + styles.toggleActive : "")}
                    onClick={() => update("autoLaunchLast", m === "on")}
                    style={{ textTransform: 'uppercase' }}
                  >
                    {m === "on" ? t("common.on") : t("common.off")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.language")}</div>
            <div className={styles.toggleGroup}>
              {supportedLocales.map(l => (
                <button
                  key={l}
                  className={styles.toggleBtn + (locale === l ? " " + styles.toggleActive : "")}
                  onClick={() => setLocale(l)}
                >
                  {l === "en" ? t("settings.languageEnglish") : t("settings.languageSpanish")}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionTheme")}</div>
            <div className={styles.themeGrid}>
              {Object.entries(THEMES).map(([id, t]) => (
                <button
                  key={id}
                  className={styles.themeBtn + (themeId === id ? " " + styles.themeBtnActive : "")}
                  style={{ borderColor: themeId === id ? t.accent : "rgba(255,255,255,0.1)", color: t.accent }}
                  onClick={() => onThemeChange?.(id)}
                >
                  <span className={styles.themeDot} style={{ background: t.accent }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionAudio")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.videoVolume")}</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={config.ambientVolume ?? 35}
                  onChange={e => update("ambientVolume", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.ambientVolume ?? 35}%</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionCardArt")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.cardArtLabel")}</label>
              <div className={styles.toggleGroup}>
                {['snap','boxart','sgdb','none'].map(opt => (
                  <button
                    key={opt}
                    className={styles.toggleBtn + (artPref === opt ? ' ' + styles.toggleBtnActive : '')}
                    onClick={() => updateArtPref(opt)}
                  >
                    {opt === 'snap' ? 'SNAP' : opt === 'boxart' ? 'BOX' : opt === 'sgdb' ? 'SGDB' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionMusic")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.music")}</label>
              <div className={styles.toggleRow}>
                {["on","off"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (((config.musicEnabled !== false) === (m === "on")) ? " " + styles.toggleActive : "")}
                    onClick={() => update("musicEnabled", m === "on")}
                    style={{ textTransform: 'uppercase' }}
                  >{m === "on" ? t("common.on") : t("common.off")}</button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.musicVolume")}</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={config.musicVolume ?? 60}
                  onChange={e => update("musicVolume", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.musicVolume ?? 60}%</span>
              </div>
            </div>
            <div className={styles.emuNote}>
              {t("settings.musicNote")}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionAttract")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.idleTimeout")}</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range" min="30" max="600" step="30"
                  value={config.attractTimeout || 120}
                  onChange={e => update("attractTimeout", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.attractTimeout || 120}s</span>
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.cycleSpeed")}</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range" min="2" max="15" step="1"
                  value={config.attractCycleSpeed || 6}
                  onChange={e => update("attractCycleSpeed", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.attractCycleSpeed || 6}s</span>
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.preferArtwork")}</label>
              <div className={styles.toggleGroup}>
                {["yes", "no"].map(m => (
                  <button key={m}
                    className={styles.toggleBtn + ((config.attractPreferArt !== false) === (m === "yes") ? " " + styles.toggleActive : "")}
                    onClick={() => update("attractPreferArt", m === "yes")}
                    style={{ textTransform: 'uppercase' }}
                  >{m === "yes" ? t("common.yes") : t("common.no")}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionPixelcade")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.enable")}</label>
              <div className={styles.toggleGroup}>
                {["off", "on"].map(m => (
                  <button key={m}
                    className={styles.toggleBtn + (!!config.pixelcade?.enabled === (m === "on") ? " " + styles.toggleActive : "")}
                    onClick={() => update("pixelcade", { ...config.pixelcade, enabled: m === "on" })}
                    style={{ textTransform: 'uppercase' }}
                  >{m === "on" ? t("common.on") : t("common.off")}</button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.ipAddress")}</label>
              <input
                className={styles.input}
                value={config.pixelcade?.ip || "192.168.1.100"}
                onChange={e => update("pixelcade", { ...config.pixelcade, ip: e.target.value })}
                placeholder="192.168.1.100"
                spellCheck={false}
              />
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.port")}</label>
              <input
                className={styles.input}
                value={config.pixelcade?.port || 8080}
                onChange={e => update("pixelcade", { ...config.pixelcade, port: parseInt(e.target.value) || 8080 })}
                placeholder="8080"
                spellCheck={false}
              />
            </div>
            <div className={styles.emuNote}>
              {t("settings.pixelcadeNote")}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionLinks")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>GitHub</label>
              <button className={styles.communityLink} onClick={() => window.open('https://github.com/romeclientel1/nuarcade', '_blank')}>
                romeclientel1/nuarcade
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.website")}</label>
              <button className={styles.communityLink} onClick={() => window.open('https://romeclientel1.github.io/nuarcade/', '_blank')}>
                romeclientel1.github.io/nuarcade
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.reportBug")}</label>
              <button className={styles.communityLink} onClick={() => window.open('https://github.com/romeclientel1/nuarcade/issues', '_blank')}>
                GitHub Issues
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionEmulators")}</div>
            
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.autoConfigureTp")}</label>
              <button
                className={styles.exportBtn}
                disabled={tpConfiguring}
                onClick={async () => {
                  setTpConfiguring(true)
                  setTpResult(null)
                  try {
                    const r = await window.nuarcade.tpAutoConfigure()
                    setTpResult(r)
                  } catch (e) {
                    setTpResult({ success: false, error: e.message })
                  }
                  setTpConfiguring(false)
                }}
              >
                {tpConfiguring ? t("common.scanning") : t("settings.findWireGames")}
              </button>
            </div>
            {tpResult && (
              <div className={styles.rescanResult}>
                {tpResult.error ? (
                  <div style={{ color: '#ef4444', fontSize: 11 }}>{tpResult.error}</div>
                ) : (
                  <div className={styles.rescanTotal}>
                    {t("settings.gamesConfigured", { count: tpResult.configured })}
                    {tpResult.notFound > 0 ? " " + t("settings.notFoundCheckPath", { count: tpResult.notFound, path: "F:\\ArcadeGames\\" }) : " " + t("settings.hitRescanToLoad")}
                  </div>
                )}
              </div>
            )}
            <div className={styles.emuToggles}>
              {[
                { id: 'teknoparrot', label: 'TeknoParrot' },
                { id: 'mame',        label: 'MAME' },
                { id: 'retroarch',   label: 'RetroArch' },
                { id: 'project64',   label: 'Project64 (N64)' },
                { id: 'duckstation', label: 'DuckStation (PS1)' },
                { id: 'flycast',     label: 'Flycast (DC)' },
                { id: 'xemu',        label: 'Xemu (Xbox)' },
                { id: 'cxbx',        label: 'Cxbx-Reloaded (Xbox)' },
                { id: 'model2',      label: 'Model 2 (Sega)' },
                { id: 'model3',      label: 'Model 3 (Supermodel)' },
                { id: 'ppsspp',      label: 'PPSSPP (PSP)' },
                { id: 'pcsx2',       label: 'PCSX2 (PS2)' },
                { id: 'rpcs3',       label: 'RPCS3 (PS3)' },
                { id: 'xenia',       label: 'Xenia (Xbox 360)' },
                { id: 'dolphin',     label: 'Dolphin (GC/Wii)' },
                { id: 'cemu',        label: 'Cemu (Wii U)' },
                { id: 'ryujinx',     label: 'Ryujinx (Switch)' },
                { id: 'vpx',         label: 'Visual Pinball X' },
                { id: 'steam',       label: 'Steam' },
                { id: 'pc',          label: 'PC Games' },
              ].map(emu => {
                const enabled = config.enabledEmulators?.[emu.id] !== false
                return (
                  <button
                    key={emu.id}
                    className={styles.emuToggle + (enabled ? " " + styles.emuToggleOn : "")}
                    onClick={() => {
                      const cur = config.enabledEmulators || {}
                      update("enabledEmulators", { ...cur, [emu.id]: !enabled })
                    }}
                  >
                    <span className={styles.emuDot} style={{ background: enabled ? "var(--accent, #00ff88)" : "rgba(255,255,255,0.15)" }} />
                    {emu.label}
                  </button>
                )
              })}
            </div>
            <div className={styles.emuNote}>
              {t("settings.disabledEmulatorsNote")}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionArtwork")}</div>
            <div className={styles.pathsNote} style={{ marginBottom: 8 }}>
              This section configures box art/video sources. To find or download a video for a specific game,
              close Settings and open <strong>Media</strong> from the main menu -- the Library tab there has
              per-game "Find video" and "YT" buttons.
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>yt-dlp path</label>
              <input
                className={styles.textInput}
                value={config.ytdlpPath || "F:/Tools/yt-dlp.exe"}
                onChange={e => update("ytdlpPath", e.target.value)}
                placeholder="F:/Tools/yt-dlp.exe"
              />
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.ytdlpStatus")}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: ytdlpStatus === 'present' ? 'rgba(0,255,136,0.4)' : ytdlpStatus === 'installing' ? 'rgba(0,200,255,0.4)' : 'rgba(255,170,0,0.4)',
                  color: ytdlpStatus === 'present' ? '#00ff88' : ytdlpStatus === 'installing' ? '#00c8ff' : '#ffaa00',
                  background: ytdlpStatus === 'present' ? 'rgba(0,255,136,0.08)' : ytdlpStatus === 'installing' ? 'rgba(0,200,255,0.08)' : 'rgba(255,170,0,0.08)',
                }}>
                  {ytdlpStatus === 'present' ? t("settings.installed") : ytdlpStatus === 'installing' ? t("settings.downloadingEllipsis") : ytdlpStatus === 'error' ? t("common.error") : ytdlpStatus === 'missing' ? t("settings.notInstalled") : t("common.checking")}
                </span>
                <button
                  className={styles.exportBtn}
                  disabled={ytdlpStatus === 'installing'}
                  onClick={async () => {
                    setYtdlpStatus('installing')
                    setYtdlpError(null)
                    try {
                      const r = await window.nuarcade.ensureYtdlp()
                      setYtdlpStatus(r.success ? 'present' : 'error')
                      if (!r.success) setYtdlpError(r.error || t("settings.unknownError"))
                    } catch (e) { setYtdlpStatus('error'); setYtdlpError(e.message || String(e)) }
                  }}
                >
                  {ytdlpStatus === 'present' ? t("settings.redownload") : t("settings.installNow")}
                </button>
              </div>
            </div>
            {ytdlpError && (
              <div style={{ fontSize: 11, color: '#ff8888', marginTop: -4, marginBottom: 8 }}>{t("common.error")}: {ytdlpError}</div>
            )}
            <div className={styles.emuNote}>
              {t("settings.ytdlpNote")}
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Anthropic API key</label>
              <input
                className={styles.textInput}
                type="password"
                value={config.anthropicApiKey || ""}
                onChange={e => update("anthropicApiKey", e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
            <div className={styles.emuNote}>
              {t("settings.apiKeyNote")}
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.bulkFetch")}</label>
              <button className={styles.exportBtn} onClick={() => setShowArtworkMgr(true)}>
                {t("settings.openArtworkManager")}
              </button>
              <button
                className={styles.exportBtn}
                style={{ marginTop: 8 }}
                onClick={() => window.open('https://www.emumovies.com', '_blank')}
              >
                {t("settings.openEmuMovies")}
              </button>
            </div>
          </div>

          {showArtworkMgr && (
            <ArtworkManager
              games={games}
              apiKey={config?.sgdbApiKey}
              onClose={() => setShowArtworkMgr(false)}
              onArtworkUpdate={() => {}}
            />
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionLibrary")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.rescanGames")}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.exportBtn} onClick={handleRescan} disabled={rescanning}>
                  {rescanning ? t("common.scanning") : t("settings.rescanAllEmulators")}
                </button>
                <button className={styles.exportBtn} style={{ borderColor: 'rgba(255,170,0,0.4)', color: '#ffaa00' }} onClick={() => {
                  localStorage.removeItem('nuarcade_game_cache')
                  localStorage.removeItem('nuarcade_game_cache_ts')
                  alert(t("settings.cacheClearedAlert"))
                }}>
                  {t("settings.clearCache")}
                </button>
              </div>
            </div>

            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.hideNotWorkingMame")}</label>
              <div className={styles.toggleGroup}>
                {["yes", "no"].map(m => (
                  <button key={m}
                    className={styles.toggleBtn + ((config.hideNotWorkingMame !== false) === (m === "yes") ? " " + styles.toggleActive : "")}
                    onClick={() => update("hideNotWorkingMame", m === "yes")}
                    style={{ textTransform: 'uppercase' }}
                  >{m === "yes" ? t("common.yes") : t("common.no")}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                Excludes ROMs MAME itself flags as "preliminary" (crashes, no video, etc.) plus BIOS/device entries that were never real games -- checked against MAME's own driver database, cached until MAME is updated. Applies to both standalone MAME and MAME games found under RetroArchGames. "Imperfect" ROMs (playable with minor issues) are kept.
              </div>
            </div>

            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>MAME artwork cleanup</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.exportBtn} onClick={() => handlePruneMameArtwork(true)} disabled={pruneFetching}>
                  {pruneFetching ? '...' : 'Preview MAME bezel cleanup'}
                </button>
                {pruneResult && !pruneResult.error && pruneResult.dryRun && pruneResult.removed > 0 && (
                  <button className={styles.exportBtn} style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }} onClick={() => handlePruneMameArtwork(false)} disabled={pruneFetching}>
                    Confirm delete {pruneResult.removed} unused bezels
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                Compares installed MAME artwork against your actual owned ROM library and removes zips that don't match anything you own. Preview first -- nothing is deleted until you confirm.
              </div>
            </div>
            {pruneResult && (
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                {pruneResult.error ? (
                  <div style={{ color: '#ef4444' }}>{pruneResult.error}</div>
                ) : pruneResult.dryRun ? (
                  <div style={{ color: '#00ff88' }}>
                    {pruneResult.total} artwork zips found -- {pruneResult.kept} match your library, {pruneResult.removed} would be removed
                  </div>
                ) : (
                  <div style={{ color: '#00ff88' }}>
                    Done -- removed {pruneResult.removed} unused artwork zips, kept {pruneResult.kept}
                  </div>
                )}
              </div>
            )}

            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Local bezel folder</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.exportBtn} onClick={() => handleInstallLocalBezels(true)} disabled={localBezelFetching}>
                  {localBezelFetching ? '...' : 'Preview local bezel install'}
                </button>
                {localBezelResult && !localBezelResult.error && localBezelResult.dryRun && localBezelResult.installed > 0 && (
                  <button className={styles.exportBtn} style={{ borderColor: 'rgba(0,255,136,0.5)', color: '#00ff88' }} onClick={() => handleInstallLocalBezels(false)} disabled={localBezelFetching}>
                    Confirm install {localBezelResult.installed} bezels
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                Fills bezel gaps in three passes: native MAME artwork from your Bezel Source Folder (set above in Paths -- from your own EmuMovies Sync or Hyperspin downloads, never fetched or redistributed by NuArcade), RetroArch-style overlays in that same folder converted automatically, then NuArcade's own bundled placeholder art as a last resort. Never overwrites existing artwork. Preview first -- nothing installs until you confirm.
              </div>
            </div>
            {localBezelResult && (
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                {localBezelResult.error ? (
                  <div style={{ color: '#ef4444' }}>{localBezelResult.error}</div>
                ) : localBezelResult.dryRun ? (
                  <div style={{ color: '#00ff88' }}>
                    {localBezelResult.totalOwned} ROMs owned -- {localBezelResult.skippedHasArt} already have artwork, {localBezelResult.installed} would be installed ({localBezelResult.installedNative} native, {localBezelResult.installedConverted} converted, {localBezelResult.installedFallback} placeholder art), {localBezelResult.notFound} with no bezel available
                    {localBezelResult.conversionFailed > 0 ? ` (${localBezelResult.conversionFailed} overlay${localBezelResult.conversionFailed === 1 ? '' : 's'} found but not auto-convertible, fell back to placeholder art)` : ''}
                  </div>
                ) : (
                  <div style={{ color: '#00ff88' }}>
                    Done -- installed {localBezelResult.installed} bezels ({localBezelResult.installedNative} native, {localBezelResult.installedConverted} converted, {localBezelResult.installedFallback} placeholder art)
                  </div>
                )}
              </div>
            )}

            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Orphaned media</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.exportBtn} onClick={handleFindOrphans} disabled={orphanScanning}>
                  {orphanScanning ? "Scanning..." : "Find orphaned media"}
                </button>
              </div>
            </div>
            {orphanResult && !orphanResult.error && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                Checked against {orphanResult.validCount} currently-scanned games.
                Found {orphanResult.orphanedVideos?.length || 0} orphaned video(s),{' '}
                {orphanResult.staleFragments?.length || 0} stale download fragment(s),{' '}
                {orphanResult.orphanedArtwork?.length || 0} orphaned artwork file(s), and{' '}
                {orphanResult.orphanedArtworkKeys?.length || 0} orphaned artwork entr(y/ies) with no matching game.
                {(orphanResult.orphanedVideos?.length || orphanResult.staleFragments?.length ||
                  orphanResult.orphanedArtwork?.length || orphanResult.orphanedArtworkKeys?.length) ? (
                  <div style={{ marginTop: 8 }}>
                    <button className={styles.exportBtn} style={{ borderColor: 'rgba(255,68,68,0.4)', color: '#ff6666' }}
                      onClick={handleCleanupOrphans} disabled={cleaningOrphans}>
                      {cleaningOrphans ? "Cleaning up..." : "Clean up now"}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 6, color: '#00ff88' }}>Nothing to clean up -- everything matches a real game.</div>
                )}
              </div>
            )}
            {orphanCleanupDone && (
              <div style={{ fontSize: 12, color: '#00ff88', marginBottom: 10 }}>
                Cleaned up {orphanCleanupDone.deleted} file(s).
                {orphanCleanupDone.errors?.length > 0 && (' ' + orphanCleanupDone.errors.length + ' could not be removed.')}
              </div>
            )}
            {rescanResult && (
              <div className={styles.rescanResult}>
                {rescanResult.error ? (
                  <div style={{ color: "#ef4444", fontSize: 11 }}>Scan error: {rescanResult.error}</div>
                ) : (
                  <>
                    <div className={styles.rescanTotal}>{rescanResult.total} games found</div>
                    <div className={styles.rescanGrid}>
                      {rescanResult.results?.map(r => (
                        <div key={r.label} className={styles.rescanRow}>
                          <span className={styles.rescanLabel}>{r.label}</span>
                          <span className={styles.rescanCount + (r.count > 0 ? " " + styles.rescanCountHit : "")}>
                            {r.error ? "ERR" : r.count}
                          </span>
                          {r.skippedCount > 0 && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>
                              ({r.skippedCount} skipped -- not games)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.backup")}</label>
              <button className={styles.exportBtn} onClick={handleBackup} disabled={backingUp}>
                {backingUp ? t("settings.saving") : t("settings.saveFullBackup")}
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.restore")}</label>
              <button className={styles.exportBtn} onClick={handleRestore} disabled={restoring}>
                {restoring ? t("settings.restoring") : t("settings.restoreFromBackup")}
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.exportGameList")}</label>
              <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
                {exporting ? t("settings.exporting") : t("settings.exportToTxt")}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionBios")}</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>{t("settings.checkBiosFiles")}</label>
              <button className={styles.exportBtn} onClick={async () => {
                setCheckingBios(true)
                setBiosResult(null)
                try { setBiosResult(await window.nuarcade.checkBios()) }
                catch (e) { setBiosResult({ error: e.message }) }
                setCheckingBios(false)
              }} disabled={checkingBios}>
                {checkingBios ? t("common.checking") : t("settings.checkBios")}
              </button>
            </div>
            {biosResult && !biosResult.error && (
              <div className={styles.biosGrid}>
                {[
                  { key: "pcsx2",      label: "PCSX2 (PS2)",      note: ".bin files in bios/" },
                  { key: "duckstation",label: "DuckStation (PS1)", note: "scph*.bin in bios/" },
                  { key: "flycast",    label: "Flycast (DC)",      note: "dc_boot.bin in data/" },
                  { key: "xemu",       label: "Xemu (Xbox)",       note: "MCPX + BIOS .bin in Xemu folder" },
                  { key: "ryujinx",   label: "Ryujinx (Switch)",  note: "prod.keys in system/" },
                ].map(({ key, label, note }) => {
                  const b = biosResult[key]
                  if (!b) return null
                  return (
                    <div key={key} className={styles.biosRow}>
                      <div className={styles.biosLeft}>
                        <span className={b.found ? styles.biosOk : styles.biosMissing}>
                          {b.found ? t("common.ok") : t("settings.missing")}
                        </span>
                        <span className={styles.biosLabel}>{label}</span>
                      </div>
                      <div className={styles.biosRight}>
                        {b.found
                          ? <span className={styles.biosFiles}>{b.files.join(", ")}</span>
                          : <span className={styles.biosNote}>{note}</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {biosResult?.error && (
              <div style={{ fontSize: 10, color: "#ef4444", marginTop: 6 }}>{t("common.error")}: {biosResult.error}</div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t("settings.sectionAbout")}</div>

            <div className={styles.aboutGrid}>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>{t("settings.version")}</span>
                <span className={styles.aboutVal}>{window.nuarcade?.version || 'v4.0.7'} {updateAvailable ? '(v' + remoteVersion + ' ' + t("settings.available") + ')' : '(' + t("settings.latest") + ')'}</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>{t("settings.platform")}</span>
                <span className={styles.aboutVal}>{window.nuarcade?.platform || "mac (dev)"}</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>{t("settings.builtBy")}</span>
                <span className={styles.aboutVal}>Rome Clientel</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>GitHub</span>
                <span className={styles.aboutVal}>romeclientel1/nuarcade</span>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={() => {
            if (window.confirm(t("settings.resetConfirm"))) loadConfig()
          }}>
            {t("settings.resetToDefaults")}
          </button>
          <button className={styles.saveBtn} ref={saveRef} onClick={handleSave}>
            {saved ? t("settings.saved") : t("settings.save")}
          </button>
        </div>

      </div>

      {showRestartConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, flexDirection: 'column', gap: 20,
        }}>
          <div style={{ color: '#ffaa00', fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: 3 }}>NUARCADE</div>
          <div style={{ color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 20, letterSpacing: 2 }}>{t("settings.restartConfirmTitle")}</div>
          <div style={{ color: '#aaa', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, textAlign: 'center', maxWidth: 360 }}>
            {t("settings.restartConfirmBody")}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <button style={{ padding: '10px 32px', background: '#ffaa00', color: '#000', border: 'none', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}
              onClick={() => window.nuarcade?.restartApp?.()}>{t("common.yes")}</button>
            <button style={{ padding: '10px 32px', background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer', textTransform: 'uppercase' }}
              onClick={() => setShowRestartConfirm(false)}>{t("common.no")}</button>
          </div>
        </div>
      )}
    </div>
  )
}
