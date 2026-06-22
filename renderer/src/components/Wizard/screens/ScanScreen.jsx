import { useState, useEffect, useRef } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'


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


// Focus zones: 'exit' | 'scroll' | 'back' | 'continue'
// Starts in 'scroll' -- read-only screen, nothing to select

export default function ScanScreen({ config, next, prev }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [running,  setRunning ] = useState(null)
  const [results,  setResults ] = useState([])
  const [done,     setDone    ] = useState(false)
  const [zone,     setZone    ] = useState('scroll')
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ top: dir * 120, behavior: 'smooth' })
  }

  // Auto-run scan on mount
  useEffect(() => {
    const timer = setTimeout(() => runScan(), 300)
    return () => clearTimeout(timer)
  }, [])

  const runScan = async () => {
    if (!window.nuarcade?.scanGames) { setDone(true); return }
    setRunning(true)
    try {
      const r = await window.nuarcade.scanGames(config)
      setResults(Array.isArray(r) ? r : [])
    } catch (e) {
      console.error('[ScanScreen] Fatal error:', e)
    } finally {
      setRunning(false)
      setDone(true)
    }
  }

  useGamepad({
    up: () => {
      if (zone === 'continue' || zone === 'back') setZone('scroll')
      else if (zone === 'scroll') { scroll(-1) }
    },
    down: () => {
      if (zone === 'exit') setZone('scroll')
      else if (zone === 'scroll') scroll(1)
    },
    left:  () => { if (zone === 'continue') setZone('back') },
    right: () => { if (zone === 'back') setZone('continue') },
    confirm: () => {
      if (zone === 'exit')     { handleExit(); return }
      if (zone === 'back')     { prev(); return }
      if (zone === 'continue' || done) next()
    },
    back:        prev,
    filterRight: next,
  })

  // Group results by system for display
  const bySystem = results.reduce((acc, g) => {
    const sys = g.system || 'Other'
    if (!acc[sys]) acc[sys] = []
    acc[sys].push(g)
    return acc
  }, {})

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[wizStyles.exitBtn, zone==='exit'?wizStyles.exitFocused:'', exitConfirm?wizStyles.exitConfirm:''].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setZone('exit')}
      >{exitConfirm ? 'CONFIRM' : 'EXIT'}</button>

      <div className={styles.eyebrow}>Step 5 -- Game Scan</div>
      <div className={styles.title}>
        {running ? 'Scanning your library...' : done ? 'Ready -- add games anytime.' : 'Preparing scan...'}
      </div>
      <div className={styles.sub}>
        No games found yet -- totally fine. Add games to your configured
        folders and rescan from Settings anytime.
      </div>

      <div
        className={[styles.scanScroll, zone==='scroll'?styles.scanScrollFocused:''].join(' ')}
        ref={scrollRef}
        onMouseEnter={() => setZone('scroll')}
        style={{ cursor: 'default' }}
      >
        {Object.entries(bySystem).map(([sys, games]) => (
          <div key={sys} className={styles.scanGroup}>
            <div className={styles.scanGroupTitle}>{sys} -- {games.length} game{games.length !== 1 ? 's' : ''}</div>
            {games.map((g, i) => (
              <div key={i} className={styles.scanItem}>
                <span className={styles.scanDot} />
                {g.title || g.name || g.file}
              </div>
            ))}
          </div>
        ))}
        {results.length === 0 && done && (
          <div className={styles.scanEmpty}>[ ] Add games to your configured folders, then rescan from Settings anytime.</div>
        )}
      </div>

      <div className={styles.btnRow}>
        <button className={[styles.btnBack, zone==='back'?styles.btnFocused:''].join(' ')}
          onClick={prev} onMouseEnter={() => setZone('back')}>Back</button>
        <button
          className={[styles.btn, zone==='continue'?styles.btnFocused:'', !done?styles.btnDisabled:''].join(' ')}
          onClick={done ? next : undefined}
          onMouseEnter={() => setZone('continue')}
        >Continue</button>
      </div>

    </div>
  )
}
