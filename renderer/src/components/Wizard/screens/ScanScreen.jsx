import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const SAMPLE_FOUND = [
  { title: 'WMMT 5DX+',        genre: 'Racing'   },
  { title: 'Initial D 8',      genre: 'Racing'   },
  { title: 'Cruis\'n Blast',   genre: 'Racing'   },
  { title: 'HotD 4 Special',   genre: 'Shooter'  },
  { title: 'BlazBlue CF',      genre: 'Fighting' },
  { title: 'Tekken 6',         genre: 'PS3'      },
  { title: 'Halo 3',           genre: 'Xbox360'  },
  { title: 'Mario Kart Wii',   genre: 'GCWii'    },
  { title: 'God of War II',    genre: 'PS2'      },
  { title: 'Zelda: TotK',      genre: 'Switch'   },
  { title: 'Medieval Madness', genre: 'Pinball'  },
]

const STATUS_STEPS = [
  { key: 'tp',        label: 'TeknoParrot arcade games'       },
  { key: 'mame',      label: 'MAME arcade classics'            },
  { key: 'ps3',       label: 'RPCS3 PlayStation 3 games'       },
  { key: 'xbox360',   label: 'Xenia Xbox 360 games'            },
  { key: 'gcwii',     label: 'Dolphin GameCube / Wii games'    },
  { key: 'ps2',       label: 'PCSX2 PlayStation 2 games'       },
  { key: 'switch',    label: 'Ryubing Switch games'            },
  { key: 'ps1',       label: 'DuckStation PlayStation 1 games' },
  { key: 'dreamcast', label: 'Flycast Dreamcast games'         },
  { key: 'model2',    label: 'Sega Model 2 games'              },
  { key: 'model3',    label: 'Sega Model 3 games'              },
  { key: 'retroarch', label: 'RetroArch games'                 },
  { key: 'psp',       label: 'PPSSPP PSP games'                },
  { key: 'wiiu',      label: 'Cemu Wii U games'                },
  { key: 'steam',     label: 'Steam games'                     },
  { key: 'pc',        label: 'PC games'                        },
  { key: 'pinball',   label: 'Visual Pinball X tables'         },
  { key: 'mame',       label: 'MAME arcade games scanned'         },
  { key: 'ps1',        label: 'DuckStation PS1 games scanned'     },
  { key: 'dreamcast',  label: 'Flycast Dreamcast games scanned'   },
  { key: 'model2',     label: 'Model 2 games scanned'             },
  { key: 'model3',     label: 'Model 3 games scanned'             },
  { key: 'retroarch',  label: 'RetroArch games scanned'           },
  { key: 'psp',        label: 'PPSSPP PSP games scanned'          },
  { key: 'wiiu',       label: 'Cemu Wii U games scanned'          },
  { key: 'steam',      label: 'Steam games scanned'               },
  { key: 'pc',         label: 'PC games scanned'                  },
]

export default function ScanScreen({ config, updateConfig, next, prev }) {
  const [progress,     setProgress    ] = useState(0)
  const [counts,       setCounts      ] = useState({ tp:0, ps3:0, xbox360:0, gcwii:0, ps2:0, switch:0, pinball:0, mame:0, ps1:0, dreamcast:0, model2:0, model3:0, retroarch:0, psp:0, wiiu:0, steam:0, pc:0 })
  const [completed,    setCompleted   ] = useState([])
  const [running,      setRunning     ] = useState(null)
  const [done,         setDone        ] = useState(false)
  const [visibleGames, setVisibleGames] = useState([])
  const [emptyState,   setEmptyState  ] = useState(false)

  useEffect(() => {
    // Small delay to ensure config has settled from previous step
    const timer = setTimeout(() => runScan(), 300)
    return () => clearTimeout(timer)
  }, [])

  const addCount = (key, n) => setCounts(c => ({ ...c, [key]: n }))

  const runScan = async () => {
    // Wait for Electron preload to be ready
    if (!window.nuarcade || !window.nuarcade.scanGames) {
      console.error('[ScanScreen] window.nuarcade not ready -- preload may not have loaded')
      setDone(true)
      setEmptyState(true)
      return
    }
    console.log('[ScanScreen] Starting scan with config:', JSON.stringify({
      teknoParrotPath: config.teknoParrotPath,
      gamesFolderPath: config.gamesFolderPath,
      xbox360GamesPath: config.xbox360GamesPath,
      ps3GamesPath: config.ps3GamesPath,
    }))
    setRunning(true)
    setProgress(5)

    // Timeout wrapper -- each scanner gets 30 seconds max
    const withTimeout = (promise, label, ms = 30000) => {
      const timer = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(label + ' timed out')), ms)
      )
      return Promise.race([promise, timer]).catch(e => {
        console.warn('[ScanScreen]', e.message)
        return { games: [] }
      })
    }

    try {
      // Run all scanners in parallel -- no more sequential blocking
      const [
        tp, ps3, x360, gcwii, ps2, sw, pb,
        mame, ps1, dc, m2, m3, ra, psp, wiiu, steam, pc
      ] = await Promise.all([
        withTimeout(window.nuarcade?.scanGames ? window.nuarcade.scanGames({ teknoParrotPath: config.teknoParrotPath, gamesFolderPath: config.gamesFolderPath }) : Promise.resolve({games:[]}), 'TeknoParrot', 120000),
        withTimeout(window.nuarcade?.scanPs3Games ? window.nuarcade.scanPs3Games(config.ps3GamesPath) : Promise.resolve({games:[]}), 'PS3'),
        withTimeout(window.nuarcade?.scanXbox360Games ? window.nuarcade.scanXbox360Games(config.xbox360GamesPath) : Promise.resolve({games:[]}), 'Xbox360'),
        withTimeout(window.nuarcade?.scanGCWiiGames ? window.nuarcade.scanGCWiiGames(config.gcWiiGamesPath) : Promise.resolve({games:[]}), 'Dolphin'),
        withTimeout(window.nuarcade?.scanPs2Games ? window.nuarcade.scanPs2Games(config.ps2GamesPath) : Promise.resolve({games:[]}), 'PS2'),
        withTimeout(window.nuarcade?.scanSwitchGames ? window.nuarcade.scanSwitchGames(config.switchGamesPath) : Promise.resolve({games:[]}), 'Switch'),
        withTimeout(window.nuarcade?.scanPinball ? window.nuarcade.scanPinball(config.tablesPath) : Promise.resolve({games:[]}), 'Pinball'),
        withTimeout(window.nuarcade?.scanMameGames ? window.nuarcade.scanMameGames(config.mameGamesPath) : Promise.resolve({games:[]}), 'MAME'),
        withTimeout(window.nuarcade?.scanPs1Games ? window.nuarcade.scanPs1Games(config.ps1GamesPath) : Promise.resolve({games:[]}), 'PS1'),
        withTimeout(window.nuarcade?.scanDreamcastGames ? window.nuarcade.scanDreamcastGames(config.dreamcastGamesPath) : Promise.resolve({games:[]}), 'Dreamcast'),
        withTimeout(window.nuarcade?.scanModel2Games ? window.nuarcade.scanModel2Games(config.model2GamesPath) : Promise.resolve({games:[]}), 'Model2'),
        withTimeout(window.nuarcade?.scanModel3Games ? window.nuarcade.scanModel3Games(config.model3GamesPath) : Promise.resolve({games:[]}), 'Model3'),
        withTimeout(window.nuarcade?.scanRetroArchGames ? window.nuarcade.scanRetroArchGames(config.retroarchGamesPath) : Promise.resolve({games:[]}), 'RetroArch'),
        withTimeout(window.nuarcade?.scanPspGames ? window.nuarcade.scanPspGames(config.pspGamesPath) : Promise.resolve({games:[]}), 'PSP'),
        withTimeout(window.nuarcade?.scanWiiUGames ? window.nuarcade.scanWiiUGames(config.wiiuGamesPath) : Promise.resolve({games:[]}), 'WiiU'),
        withTimeout(window.nuarcade.scanSteamGames ? window.nuarcade?.scanSteamGames(config.steamGamesPath) : Promise.resolve({games:[]}), 'Steam'),
        withTimeout(window.nuarcade.scanPcGames ? window.nuarcade?.scanPcGames(config.pcGamesPath) : Promise.resolve({games:[]}), 'PC'),
      ])

      setProgress(80)

      const allGames = [
        ...(tp?.games   || []),
        ...(ps3?.games  || []),
        ...(x360?.games || []),
        ...(gcwii?.games|| []),
        ...(ps2?.games  || []),
        ...(sw?.games   || []),
        ...(pb?.games   || []),
        ...(mame?.games || []),
        ...(ps1?.games  || []),
        ...(dc?.games   || []),
        ...(m2?.games   || []),
        ...(m3?.games   || []),
        ...(ra?.games   || []),
        ...(psp?.games  || []),
        ...(wiiu?.games || []),
        ...(steam?.games|| []),
        ...(pc?.games   || []),
      ]

      setCounts({
        tp:        tp?.games?.length        || 0,
        mame:      mame?.games?.length      || 0,
        ps3:       ps3?.games?.length       || 0,
        xbox360:   x360?.games?.length      || 0,
        gcwii:     gcwii?.games?.length     || 0,
        ps2:       ps2?.games?.length       || 0,
        switch:    sw?.games?.length        || 0,
        ps1:       ps1?.games?.length       || 0,
        dreamcast: dc?.games?.length        || 0,
        model2:    m2?.games?.length        || 0,
        model3:    m3?.games?.length        || 0,
        retroarch: ra?.games?.length        || 0,
        psp:       psp?.games?.length       || 0,
        wiiu:      wiiu?.games?.length      || 0,
        steam:     steam?.games?.length     || 0,
        pc:        pc?.games?.length        || 0,
        pinball:   pb?.games?.length        || 0,
      })

      setProgress(95)
      updateConfig({ scannedGames: allGames })
      setVisibleGames(allGames.slice(0, 10))
      setProgress(100)
      if (allGames.length === 0) setEmptyState(true)
      setDone(true)
    } catch (e) {
      console.error('Scan error:', e)
      setDone(true)
    }
  }

  const getStatus = (key) => {
    if (completed.includes(key)) return 'done'
    if (running === key) return 'running'
    return 'wait'
  }

  const totalFound = Object.values(counts).reduce((a, b) => a + b, 0)

  const dotColor = (genre) => {
    const map = { Racing:'#f59e0b', Shooter:'#ef4444', Fighting:'#8b5cf6',
      PS3:'#0070d1', Xbox360:'#107c10', GCWii:'#6b21a8', PS2:'#003791', Pinball:'#cc44ff' }
    return map[genre] || '#00ff88'
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 6 -- Game Scan</div>
      <div className={styles.title}>
        {done ? emptyState ? 'Ready -- add games anytime.' : `Found ${totalFound} game${totalFound !== 1 ? 's' : ''}!` : 'Scanning your library...'}
      </div>
      <div className={styles.sub}>
        {emptyState
          ? "No games found yet -- totally fine. Add games to your configured folders and rescan from Settings anytime."
          : 'Scanning all emulators and matching game files automatically.'}
      </div>

      <div className={styles.scanWrap}>
        <div className={styles.scanBarBg}>
          <div className={styles.scanBarFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.scanStats}>
          <div>TP <span>{counts.tp}</span></div>
          <div>MAME <span>{counts.mame}</span></div>
          <div>PS3 <span>{counts.ps3}</span></div>
          <div>X360 <span>{counts.xbox360}</span></div>
          <div>GC/Wii <span>{counts.gcwii}</span></div>
          <div>PS2 <span>{counts.ps2}</span></div>
          <div>Switch <span>{counts.switch}</span></div>
          <div>PS1 <span>{counts.ps1}</span></div>
          <div>DC <span>{counts.dreamcast}</span></div>
          <div>Model2 <span>{counts.model2}</span></div>
          <div>Model3 <span>{counts.model3}</span></div>
          <div>RetroArch <span>{counts.retroarch}</span></div>
          <div>PSP <span>{counts.psp}</span></div>
          <div>WiiU <span>{counts.wiiu}</span></div>
          <div>Steam <span>{counts.steam}</span></div>
          <div>PC <span>{counts.pc}</span></div>
          <div>Pinball <span>{counts.pinball}</span></div>
        </div>
      </div>

      {visibleGames.length > 0 && !emptyState && (
        <div className={styles.gamePreview}>
          {visibleGames.map((g, i) => (
            <div key={i} className={styles.gpCard}>
              <div className={styles.gpTitle}>{g.title}</div>
              <div className={styles.gpMeta}>
                <span className={styles.gpDot} style={{ background: dotColor(g.genre) }} />
                {g.genre}
              </div>
            </div>
          ))}
        </div>
      )}

      {emptyState && (
        <div className={styles.emptyHint}>
          <div className={styles.emptyIcon}>[ ]</div>
          <div className={styles.emptyText}>Add games to your configured folders, then rescan from Settings anytime.</div>
        </div>
      )}

      <div className={styles.statusList}>
        {STATUS_STEPS.map(s => {
          const status = getStatus(s.key)
          return (
            <div key={s.key} className={`${styles.statusItem} ${styles[status]}`}>
              {status === 'done'    && <span className={styles.siDone}>OK</span>}
              {status === 'running' && <div className={styles.spinner} />}
              {status === 'wait'    && <div style={{ width:16, height:16, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.15)' }} />}
              <span className={styles.siText}>{s.label}</span>
              {status === 'done' && <span className={styles.siVal}>{counts[s.key]} games</span>}
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnNext} onClick={next} disabled={!done}
          style={{ opacity: done ? 1 : 0.4, cursor: done ? 'pointer' : 'not-allowed' }}>
          {done ? 'Continue ->' : 'Scanning...'}
        </button>
      </div>
    </div>
  )
}

const delay = ms => new Promise(r => setTimeout(r, ms))
