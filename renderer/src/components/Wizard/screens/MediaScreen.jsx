import { useState } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'

import mStyles from './MediaScreen.module.css'


const EXIT_IDX      = 0
const FETCH_IDX     = 1
const FULL_IDX      = 2
const BACK_IDX      = 3
const CONTINUE_IDX  = 4

export default function MediaScreen({ config, games, next, prev }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [fetching,  setFetching ] = useState(false)
  const [fetchDone, setFetchDone] = useState(false)
  const [focusIdx,  setFocusIdx ] = useState(CONTINUE_IDX)

  const handleFetchArt = async () => {
    if (fetching) return
    setFetching(true)
    try {
      if (window.nuarcade?.fetchArt) await window.nuarcade.fetchArt()
      setFetchDone(true)
    } catch (e) {
      console.error('[MediaScreen] fetchArt error', e)
    } finally {
      setFetching(false)
    }
  }

  const confirmFocused = () => {
    if (focusIdx === EXIT_IDX)     { handleExit(); return }
    if (focusIdx === BACK_IDX)     { prev(); return }
    if (focusIdx === CONTINUE_IDX) { next(); return }
    if (focusIdx === FETCH_IDX)    { handleFetchArt(); return }
    // FULL_IDX -- requires mouse/keyboard, just open link
    if (window.nuarcade?.openExternal) window.nuarcade.openExternal('https://emumovies.com')
  }

  useGamepad({
    up: () => {
      if (focusIdx === CONTINUE_IDX || focusIdx === BACK_IDX) setFocusIdx(FETCH_IDX)
      else if (focusIdx === FETCH_IDX || focusIdx === FULL_IDX) setFocusIdx(EXIT_IDX)
    },
    down: () => {
      if (focusIdx === EXIT_IDX) setFocusIdx(FETCH_IDX)
      else if (focusIdx === FETCH_IDX || focusIdx === FULL_IDX) setFocusIdx(CONTINUE_IDX)
    },
    left: () => {
      if (focusIdx === FULL_IDX)      setFocusIdx(FETCH_IDX)
      else if (focusIdx === CONTINUE_IDX) setFocusIdx(BACK_IDX)
    },
    right: () => {
      if (focusIdx === FETCH_IDX) setFocusIdx(FULL_IDX)
      else if (focusIdx === BACK_IDX) setFocusIdx(CONTINUE_IDX)
    },
    confirm:     confirmFocused,
    back:        prev,
    filterRight: next,
  })

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[wizStyles.exitBtn, focusIdx===EXIT_IDX?wizStyles.exitFocused:'', exitConfirm?wizStyles.exitConfirm:''].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setFocusIdx(EXIT_IDX)}
      >{exitConfirm ? 'CONFIRM' : 'EXIT'}</button>

      <div className={styles.eyebrow}>Step 6 -- Media</div>
      <div className={styles.title}>Get Media</div>
      <div className={styles.sub}>
        Choose how to get artwork and video snaps for your games.
        You can always add more later.
      </div>

      <div className={styles.mediaGrid}>
        <div
          className={[styles.mediaCard, focusIdx===FETCH_IDX?styles.mediaCardFocused:''].join(' ')}
          onClick={() => { setFocusIdx(FETCH_IDX); handleFetchArt() }}
          onMouseEnter={() => setFocusIdx(FETCH_IDX)}
        >
          <div className={styles.mediaCardIcon}>A</div>
          <div className={styles.mediaCardTitle}>Fetch Art Now</div>
          <div className={styles.mediaCardSub}>
            Downloads hero artwork for your games from SteamGridDB.
            Works immediately, no account needed. Art shows on game cards right away.
          </div>
          {fetchDone && <div className={styles.mediaCardStatus}>Done -- {games?.length || 0} games have art</div>}
          {fetching  && <div className={styles.mediaCardStatus}>Fetching...</div>}
        </div>

        <div
          className={[styles.mediaCard, focusIdx===FULL_IDX?styles.mediaCardFocused:''].join(' ')}
          onClick={() => setFocusIdx(FULL_IDX)}
          onMouseEnter={() => setFocusIdx(FULL_IDX)}
        >
          <div className={styles.mediaCardIcon}>B</div>
          <div className={styles.mediaCardTitle}>Full Media Pack</div>
          <div className={styles.mediaCardSub}>
            Video snaps, box art, marquees, and wheel art via EmuMovies Sync.
            Requires a free account and the EmuMovies Sync 2.7.1 app.
          </div>
          <button className={styles.mediaShowSteps}
            onClick={e => { e.stopPropagation(); if (window.nuarcade?.openExternal) window.nuarcade.openExternal('https://emumovies.com') }}
          >Show Steps</button>
        </div>
      </div>

      <div className={styles.btnRow}>
        <button className={[styles.btnBack, focusIdx===BACK_IDX?styles.btnFocused:''].join(' ')}
          onClick={prev} onMouseEnter={() => setFocusIdx(BACK_IDX)}>Back</button>
        <button className={[styles.btn, focusIdx===CONTINUE_IDX?styles.btnFocused:''].join(' ')}
          onClick={next} onMouseEnter={() => setFocusIdx(CONTINUE_IDX)}>Continue</button>
      </div>

    </div>
  )
}
