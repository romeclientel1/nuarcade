import { useState, useRef } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'



// Focus zones: 'exit' | 'scroll' | 'back' | 'continue'
// rowIdx = which path row Browse button is focused

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [paths,    setPaths  ] = useState(() => {
    const saved = config.paths || {}
    return PATH_FIELDS.map(f => ({ ...f, value: saved[f.key] || f.default }))
  })
  const [zone,    setZone   ] = useState('continue')
  const [rowIdx,  setRowIdx ] = useState(PATH_FIELDS.length - 1)
  const scrollRef = useRef(null)

  const handleBrowse = async (idx) => {
    try {
      const result = await window.nuarcade?.browsePath?.()
      if (result) {
        setPaths(prev => prev.map((p, i) => i === idx ? { ...p, value: result } : p))
      }
    } catch (e) { console.error('[PathsScreen] browse error', e) }
  }

  const scrollToRow = (idx) => {
    if (!scrollRef.current) return
    const rows = scrollRef.current.querySelectorAll('[data-pathrow]')
    rows[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const confirmFocused = () => {
    if (zone === 'exit')     { handleExit(); return }
    if (zone === 'back')     { prev(); return }
    if (zone === 'continue') {
      const saved = {}
      paths.forEach(p => { saved[p.key] = p.value })
      updateConfig({ paths: saved })
      next()
      return
    }
    handleBrowse(rowIdx)
  }

  useGamepad({
    up: () => {
      if (zone === 'continue' || zone === 'back') {
        setZone('scroll')
        const last = paths.length - 1
        setRowIdx(last); scrollToRow(last)
      } else if (zone === 'scroll') {
        if (rowIdx > 0) { const n = rowIdx - 1; setRowIdx(n); scrollToRow(n) }
        else setZone('exit')
      }
    },
    down: () => {
      if (zone === 'exit') { setZone('scroll'); setRowIdx(0) }
      else if (zone === 'scroll') {
        if (rowIdx < paths.length - 1) { const n = rowIdx + 1; setRowIdx(n); scrollToRow(n) }
        else setZone('continue')
      }
    },
    left:  () => { if (zone === 'continue') setZone('back') },
    right: () => { if (zone === 'back') setZone('continue') },
    confirm:     confirmFocused,
    back:        prev,
    filterRight: next,
  })

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[wizStyles.exitBtn, zone==='exit'?wizStyles.exitFocused:'', exitConfirm?wizStyles.exitConfirm:''].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setZone('exit')}
      >{exitConfirm ? 'CONFIRM' : 'EXIT'}</button>

      <div className={styles.eyebrow}>Step 3 -- Paths</div>
      <div className={styles.title}>Where are your files?</div>
      <div className={styles.sub}>
        Point NuArcade to each emulator and its games folder. All paths
        default to your F: drive -- browse or type to update.
      </div>

      <div className={styles.pathList} ref={scrollRef}>
        {paths.map((p, i) => {
          const isRowFocused = zone === 'scroll' && rowIdx === i
          return (
            <div key={p.key} data-pathrow={i}
              className={[styles.pathRow, isRowFocused ? styles.pathRowFocused : ''].join(' ')}
              onMouseEnter={() => { setZone('scroll'); setRowIdx(i) }}
            >
              <div className={styles.pathLabel}>{p.label}</div>
              <input
                className={styles.pathInput}
                value={p.value}
                onChange={e => setPaths(prev => prev.map((x, j) => j===i ? {...x, value: e.target.value} : x))}
                readOnly
              />
              <button
                className={[styles.pathBtn, isRowFocused ? styles.btnFocused : ''].join(' ')}
                onClick={() => handleBrowse(i)}
                onMouseEnter={() => { setZone('scroll'); setRowIdx(i) }}
              >Browse</button>
            </div>
          )
        })}
      </div>

      <div className={styles.infoBar}>
        Only install the emulators you plan to use -- empty folders are fine
        and can be set up later via Settings &gt; Rescan.
      </div>

      <div className={styles.btnRow}>
        <button className={[styles.btnBack, zone==='back'?styles.btnFocused:''].join(' ')}
          onClick={prev} onMouseEnter={() => setZone('back')}>Back</button>
        <button className={[styles.btn, zone==='continue'?styles.btnFocused:''].join(' ')}
          onClick={() => confirmFocused()} onMouseEnter={() => setZone('continue')}>Continue</button>
      </div>

    </div>
  )
}
