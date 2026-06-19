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

  useEffect(() => { runScan() }, [])

  const addCount = (key, n) => setCounts(c => ({ ...c, [key]: n }))

  const runScan = async () => {
    let allGames = []

    if (window.nuarcade && window.nuarcade.platform === 'win32') {
      try {
        // TeknoParrot
        setRunning('tp')
        const tp = await window.nuarcade.scanGames(config.teknoParrotPath, config.gamesFolderPath)
        if (tp.games?.length) { allGames = [...allGames, ...tp.games]; addCount('tp', tp.games.length) }
        setCompleted(c => [...c, 'tp']); setRunning(null)

        // RPCS3
        setRunning('ps3')
        if (config.mode !== 'pinball' && config.ps3GamesPath) {
          const ps3 = await window.nuarcade.scanPs3Games(config.ps3GamesPath)
          if (ps3.games?.length) { allGames = [...allGames, ...ps3.games]; addCount('ps3', ps3.games.length) }
        }
        setCompleted(c => [...c, 'ps3']); setRunning(null)

        // Xenia
        setRunning('xbox360')
        if (config.mode !== 'pinball' && config.xbox360GamesPath) {
          const x360 = await window.nuarcade.scanXbox360Games(config.xbox360GamesPath)
          if (x360.games?.length) { allGames = [...allGames, ...x360.games]; addCount('xbox360', x360.games.length) }
        }
        setCompleted(c => [...c, 'xbox360']); setRunning(null)

        // Dolphin
        setRunning('gcwii')
        if (config.mode !== 'pinball' && config.gcWiiGamesPath) {
          const gcwii = await window.nuarcade.scanGCWiiGames(config.gcWiiGamesPath)
          if (gcwii.games?.length) { allGames = [...allGames, ...gcwii.games]; addCount('gcwii', gcwii.games.length) }
        }
        setCompleted(c => [...c, 'gcwii']); setRunning(null)

        // PCSX2
        setRunning('ps2')
        if (config.mode !== 'pinball' && config.ps2GamesPath) {
          const ps2 = await window.nuarcade.scanPs2Games(config.ps2GamesPath)
          if (ps2.games?.length) { allGames = [...allGames, ...ps2.games]; addCount('ps2', ps2.games.length) }
        }
        setCompleted(c => [...c, 'ps2']); setRunning(null)

        // Ryujinx
        setRunning('switch')
        if (config.mode !== 'pinball' && config.switchGamesPath) {
          const sw = await window.nuarcade.scanSwitchGames(config.switchGamesPath)
          if (sw.games?.length) { allGames = [...allGames, ...sw.games]; addCount('switch', sw.games.length) }
        }
        setCompleted(c => [...c, 'switch']); setRunning(null)

        // Pinball
        setRunning('pinball')
        if (config.mode !== 'arcade' && config.tablesPath) {
          const pb = await window.nuarcade.scanPinball(config.tablesPath)
    const mame = await window.nuarcade.scanMameGames(config.mameGamesPath)
    const ps1 = await window.nuarcade.scanDuckStationGames(config.ps1GamesPath)
    const dc = await window.nuarcade.scanFlycastGames(config.dreamcastGamesPath)
    const m2 = await window.nuarcade.scanModel2Games(config.model2GamesPath)
    const m3 = await window.nuarcade.scanModel3Games(config.model3GamesPath)
    const ra = await window.nuarcade.scanRetroArchGames(config.retroarchGamesPath)
    const psp = await window.nuarcade.scanPspGames(config.pspGamesPath)
    const wiiu = await window.nuarcade.scanCemuGames(config.wiiuGamesPath)
    const steam = await window.nuarcade.scanSteamGames(config.steamGamesPath)
    const pc = await window.nuarcade.scanPcGames(config.pcGamesPath)
          if (pb.games?.length) { allGames = [...allGames, ...pb.games]; addCount('pinball', pb.games.length) }
        }
        setCompleted(c => [...c, 'pinball']); setRunning(null)

        updateConfig({ scannedGames: allGames })
        setVisibleGames(allGames.slice(0, 10))
        setProgress(100)
        if (allGames.length === 0) setEmptyState(true)
        setDone(true)
        return
      } catch (e) { console.error('Scan error:', e) }
    }

    // ?? Demo animation ????????????????????????????????????????
    for (let i = 0; i <= 100; i += 2) {
      await delay(30)
      setProgress(i)
      setVisibleGames(SAMPLE_FOUND.slice(0, Math.floor((i / 100) * SAMPLE_FOUND.length)))
    }
    for (let i = 0; i < STATUS_STEPS.length; i++) {
      setRunning(STATUS_STEPS[i].key)
      await delay(500)
      setCompleted(c => [...c, STATUS_STEPS[i].key])
      setRunning(null)
    }
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
    setDone(true)
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
          ? "No games found yet -- totally fine. Add games to your F: drive folders and rescan from Settings anytime."
          : 'Scanning all emulators and matching game files automatically.'}
      </div>

      <div className={styles.scanWrap}>
        <div className={styles.scanBarBg}>
          <div className={styles.scanBarFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.scanStats}>
          <div>TP <span>{counts.tp}</span></div>
          <div>PS3 <span>{counts.ps3}</span></div>
          <div>X360 <span>{counts.xbox360}</span></div>
          <div>GC/Wii <span>{counts.gcwii}</span></div>
          <div>PS2 <span>{counts.ps2}</span></div>
          <div>Switch <span>{counts.switch}</span></div>
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
          <div className={styles.emptyText}>Add games to your F: drive folders, then rescan from Settings anytime.</div>
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
