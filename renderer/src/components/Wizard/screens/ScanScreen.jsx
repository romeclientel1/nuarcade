import { useState, useEffect, useRef } from 'react'
import styles from './Screen.module.css'

const SCANNERS = [
  // TeknoParrot
  { pathKey: 'teknoparrot',    fn: 'scanGames',           system: 'TeknoParrot',   opts: (p, all) => ({ teknoParrotPath: p, gamesFolderPath: all.arcadeGames || '' }) },
  // PS3
  { pathKey: 'ps3Games',       fn: 'scanPs3Games',        system: 'PS3',           opts: (p) => p },
  // Xbox 360
  { pathKey: 'xbox360Games',   fn: 'scanXbox360Games',    system: 'Xbox 360',      opts: (p) => p },
  // GameCube / Wii
  { pathKey: 'gcGames',        fn: 'scanGCWiiGames',      system: 'GameCube/Wii',  opts: (p) => p },
  // PS2
  { pathKey: 'ps2Games',       fn: 'scanPs2Games',        system: 'PS2',           opts: (p) => p },
  // Switch
  { pathKey: 'switchGames',    fn: 'scanSwitchGames',     system: 'Switch',        opts: (p) => p },
  // Dreamcast
  { pathKey: 'dreamcastGames', fn: 'scanDreamcastGames',  system: 'Dreamcast',     opts: (p) => p },
  // PSP
  { pathKey: 'pspGames',       fn: 'scanPspGames',        system: 'PSP',           opts: (p) => p },
  // Wii U
  { pathKey: 'wiiuGames',      fn: 'scanWiiUGames',       system: 'Wii U',         opts: (p) => p },
  // MAME
  { pathKey: 'mame',           fn: 'scanMameGames',       system: 'MAME',          opts: (p) => p },
  // Sega Model 2
  { pathKey: 'model2',         fn: 'scanModel2Games',     system: 'Sega Model 2',  opts: (p) => p },
  // Sega Model 3
  { pathKey: 'model3',         fn: 'scanModel3Games',     system: 'Sega Model 3',  opts: (p) => p },
  // Pinball
  { pathKey: 'pinball',        fn: 'scanPinball',         system: 'Pinball',       opts: (p) => p },
  // Steam
  { pathKey: 'steam',          fn: 'scanSteamGames',      system: 'Steam',         opts: (p) => p },
]

export default function ScanScreen({ config, next, prev }) {
  const [running,   setRunning  ] = useState(false)
  const [systems,   setSystems  ] = useState([])  // { system, ready, found, unmatched }
  const [errors,    setErrors   ] = useState([])
  const [done,      setDone     ] = useState(false)
  const [progress,  setProgress ] = useState('')
  const [expanded,  setExpanded ] = useState({})
  const scrollRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => runScan(), 300)
    return () => clearTimeout(timer)
  }, [])

  const runScan = async () => {
    setRunning(true)
    setErrors([])
    setSystems([])

    const paths = config?.paths || {}
    const allErrors = []
    const allSystems = []

    for (const scanner of SCANNERS) {
      const folderPath = paths[scanner.pathKey]
      if (!folderPath || folderPath.trim() === '') continue

      setProgress('Scanning ' + scanner.system + '...')

      try {
        const fn = window.nuarcade?.[scanner.fn]
        if (!fn) continue

        const opts = scanner.opts(folderPath, paths)
        const r = await fn(opts)

        const games = Array.isArray(r) ? r
          : Array.isArray(r?.games) ? r.games
          : []

        games.forEach(g => { if (!g.system) g.system = scanner.system })

        const ready     = games.filter(g => ['ready','configured','Playable','Perfect','Unverified'].includes(g.status))
        const found     = games.filter(g => g.status === 'discovered')
        const missing   = games.filter(g => g.status === 'path-missing')
        const unmatched = r?.unmatched || []

        if (games.length > 0 || unmatched.length > 0 || (Array.isArray(r) && r.length > 0)) {
          allSystems.push({ system: scanner.system, ready, found, missing, unmatched })
        }

        if (r?.error && r.error !== 'Folder not found') {
          allErrors.push(scanner.system + ': ' + r.error)
        }
      } catch (e) {
        const msg = e.message || ''
        if (!msg.includes('not found') && !msg.includes('no such file')) {
          allErrors.push(scanner.system + ': ' + msg)
        }
      }
    }

    setSystems(allSystems)
    setErrors(allErrors)
    setRunning(false)
    setDone(true)
    setProgress('')
  }

  const totalReady = systems.reduce((n, s) => n + s.ready.length, 0)
  const totalFound = systems.reduce((n, s) => n + s.found.length, 0)
  const totalUnmatched = systems.reduce((n, s) => n + s.unmatched.length, 0)
  const totalGames = totalReady + totalFound

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 5 -- Game Scan</div>
      <div className={styles.title}>
        {running ? progress || 'Scanning...' : done ? 'Scan complete.' : 'Preparing scan...'}
      </div>
      <div className={styles.sub}>
        {done && totalGames > 0
          ? totalReady + ' ready, ' + totalFound + ' found on disk, ' + totalUnmatched + ' unrecognized folders.' + (totalUnmatched > 0 ? ' Use the Folder Renamer in Settings to fix these.' : '')
          : done
          ? 'No games found. Configure your paths in Step 3 and rescan from Settings.'
          : 'Scanning configured game folders...'}
      </div>

      {errors.length > 0 && (
        <div className={styles.scanError}>
          <div className={styles.scanErrorLabel}>SCAN WARNINGS</div>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      <div className={styles.scanScroll} ref={scrollRef}>
        {systems.map(sys => (
          <div key={sys.system} className={styles.scanGroup}>
            <div className={styles.scanGroupTitle}>
              {sys.system} -- {sys.ready.length + sys.found.length} game{sys.ready.length + sys.found.length !== 1 ? 's' : ''}
              {sys.unmatched.length > 0 && (
                <span className={styles.scanGroupUnmatched}> + {sys.unmatched.length} unrecognized</span>
              )}
            </div>

            {/* READY games */}
            {sys.ready.length > 0 && (
              <div className={styles.scanSubGroup}>
                <div
                  className={styles.scanSubHeader}
                  onClick={() => toggle(sys.system + '_ready')}
                >
                  <span className={styles.scanStatusDot} style={{ background: 'rgba(0,255,136,0.7)' }} />
                  READY ({sys.ready.length})
                  <span className={styles.scanChevron}>{expanded[sys.system + '_ready'] ? 'v' : '>'}</span>
                </div>
                {expanded[sys.system + '_ready'] && sys.ready.map((g, i) => (
                  <div key={i} className={styles.scanItem}>
                    <span className={styles.scanDot} />
                    <span className={styles.scanItemTitle}>{g.title || g.name || g.file}</span>
                    <span className={styles.scanItemBadge}>READY</span>
                  </div>
                ))}
              </div>
            )}

            {/* FOUND -- needs TP setup */}
            {sys.found.length > 0 && (
              <div className={styles.scanSubGroup}>
                <div
                  className={styles.scanSubHeader}
                  onClick={() => toggle(sys.system + '_found')}
                >
                  <span className={styles.scanStatusDot} style={{ background: 'rgba(0,200,255,0.7)' }} />
                  {sys.system === 'TeknoParrot' ? 'FOUND ON DISK -- NEEDS SETUP' : 'FOUND ON DISK'} ({sys.found.length})
                  <span className={styles.scanChevron}>{expanded[sys.system + '_found'] ? 'v' : '>'}</span>
                </div>
                {expanded[sys.system + '_found'] && sys.found.map((g, i) => (
                  <div key={i} className={styles.scanItemExpanded}>
                    <div className={styles.scanItemRow}>
                      <span className={styles.scanDot} />
                      <span className={styles.scanItemTitle}>{g.title || g.name || g.file}</span>
                      <span className={styles.scanItemBadge}>{g.executableName || 'FOUND'}</span>
                    </div>
                    {g.gamePath && (
                      <div className={styles.scanItemPath}>{g.gamePath}</div>
                    )}
                    <div className={styles.scanItemHint}>
                      {sys.system === 'TeknoParrot'
                        ? 'Open TeknoParrot, click Add Game, select this title, point to the exe above.'
                        : sys.system === 'Xbox 360'
                        ? 'Open Xenia, load the game from the folder above.'
                        : sys.system === 'PS3'
                        ? 'Open RPCS3, add the game folder above.'
                        : (sys.system === 'GameCube/Wii' || sys.system === 'GameCube' || sys.system === 'Nintendo Wii')
                        ? 'Open Dolphin, load the game from the folder above.'
                        : (sys.system === 'PS2' || sys.system === 'PlayStation 2')
                        ? 'Open PCSX2, add the ISO or folder above.'
                        : (sys.system === 'Switch' || sys.system === 'Nintendo Switch')
                        ? 'Open Ryujinx, add the game file above.'
                        : sys.system === 'Pinball'
                        ? 'Open Visual Pinball X and load the table above.'
                        : sys.system === 'Dreamcast'
                        ? 'Open Redream or Demul and load the game from the folder above.'
                        : sys.system === 'PSP'
                        ? 'Open PPSSPP and load the ISO/CSO above.'
                        : sys.system === 'Wii U'
                        ? 'Open Cemu and load the game from the folder above.'
                        : sys.system === 'MAME'
                        ? 'MAME games launch directly -- configure inputs in MAME.'
                        : sys.system === 'Sega Model 2'
                        ? 'Open M2Emulator and load the ROM above.'
                        : sys.system === 'Sega Model 3'
                        ? 'Open Supermodel and load the ROM above.'
                        : sys.system === 'Steam'
                        ? 'Launch via Steam -- game will open in your Steam library.'
                        : 'Open the emulator and load the game from the path above.'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PATH MISSING */}
            {sys.missing && sys.missing.length > 0 && (
              <div className={styles.scanSubGroup}>
                <div
                  className={styles.scanSubHeader}
                  onClick={() => toggle(sys.system + '_missing')}
                >
                  <span className={styles.scanStatusDot} style={{ background: 'rgba(255,200,0,0.7)' }} />
                  PATH MISSING ({sys.missing.length})
                  <span className={styles.scanChevron}>{expanded[sys.system + '_missing'] ? 'v' : '>'}</span>
                </div>
                {expanded[sys.system + '_missing'] && sys.missing.map((g, i) => (
                  <div key={i} className={styles.scanItemExpanded}>
                    <div className={styles.scanItemRow}>
                      <span className={styles.scanDot} />
                      <span className={styles.scanItemTitle}>{g.title || g.name}</span>
                      <span className={styles.scanItemBadgeWarn}>PATH MISSING</span>
                    </div>
                    {g.gamePath && (
                      <div className={styles.scanItemPath}>{g.gamePath}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* UNMATCHED folders */}
            {sys.unmatched.length > 0 && (
              <div className={styles.scanSubGroup}>
                <div
                  className={styles.scanSubHeader}
                  onClick={() => toggle(sys.system + '_unmatched')}
                >
                  <span className={styles.scanStatusDot} style={{ background: 'rgba(255,255,255,0.2)' }} />
                  NOT RECOGNIZED ({sys.unmatched.length})
                  <span className={styles.scanChevron}>{expanded[sys.system + '_unmatched'] ? 'v' : '>'}</span>
                </div>
                {expanded[sys.system + '_unmatched'] && (
                  <>
                    <div className={styles.scanUnmatchedNote}>
                      These folders exist on disk but don't match any TeknoParrot game profile.
                      Vespara can rename them automatically to match what TP expects.
                    </div>
                    <div className={styles.scanUnmatchedAction}>
                      Go to Settings -- Game Library -- TeknoParrot Folder Renamer to fix these automatically.
                    </div>
                    {sys.unmatched.map((name, i) => (
                      <div key={i} className={styles.scanItem}>
                        <span className={styles.scanDot} style={{ background: 'rgba(255,255,255,0.2)' }} />
                        <span className={styles.scanItemTitle} style={{ color: 'rgba(255,255,255,0.35)' }}>{name}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {done && totalGames === 0 && errors.length === 0 && (
          <div className={styles.scanEmpty}>
            No games found. Check your configured paths in Step 3 and rescan from Settings.
          </div>
        )}
        {running && (
          <div className={styles.scanEmpty}>{progress || 'Scanning...'}</div>
        )}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next} disabled={running}>Continue</button>
      </div>
    </div>
  )
}
