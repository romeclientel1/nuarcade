import { useState, useEffect, useRef } from 'react'
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import styles from './HighScoreBoard.module.css'
import { useI18n } from '../../i18n/I18nContext.js'

const SCORES_KEY = (gameId) => 'nuarcade_scores_' + gameId
const MAX_PER_GAME = 10

export function saveScore(gameId, gameTitle, playerName, score) {
  try {
    const existing = JSON.parse(localStorage.getItem(SCORES_KEY(gameId)) || '[]')
    existing.push({ player: playerName || 'GUEST', score, date: Date.now(), gameTitle })
    existing.sort((a, b) => b.score - a.score)
    const top = existing.slice(0, MAX_PER_GAME)
    localStorage.setItem(SCORES_KEY(gameId), JSON.stringify(top))
    return top
  } catch { return [] }
}

export function getScores(gameId) {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY(gameId)) || '[]') } catch { return [] }
}

export function getAllScores(games) {
  const all = []
  for (const g of games) {
    const id = g.id || g.profile
    const scores = getScores(id)
    for (const s of scores) {
      all.push({ ...s, gameId: id, gameTitle: g.title || id })
    }
  }
  return all.sort((a, b) => b.score - a.score)
}

export default function HighScoreBoard({ games, onClose, activeProfile }) {
  const { t } = useI18n()
  const scrollRef = useRef(null)
  const [tab,       setTab      ] = useState('all')
  const [gameId,    setGameId   ] = useState(null)
  const [allScores, setAllScores] = useState([])
  const [gameScores,setGameScores] = useState([])
  const [newScore,  setNewScore ] = useState('')
  const [entering,  setEntering ] = useState(false)

  useOverlayGamepad({
    onClose,
    onUp:    () => scrollRef.current?.scrollBy({ top: -120, behavior: 'smooth' }),
    onDown:  () => scrollRef.current?.scrollBy({ top:  120, behavior: 'smooth' }),
    onLeft:  () => setTab('all'),
    onRight: () => setTab(activeProfile ? 'player' : 'all'),
  })

  useEffect(() => { setAllScores(getAllScores(games)) }, [games])
  useEffect(() => { if (gameId) setGameScores(getScores(gameId)) }, [gameId])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSaveScore = () => {
    const score = parseInt(newScore)
    if (!score || !gameId) return
    const g = games.find(g => (g.id || g.profile) === gameId)
    saveScore(gameId, g?.title || gameId, activeProfile?.name || 'GUEST', score)
    setGameScores(getScores(gameId))
    setAllScores(getAllScores(games))
    setNewScore('')
    setEntering(false)
  }

  const formatDate  = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatScore = (n)  => n.toLocaleString()

  const displayScores = tab === 'game' && gameId ? gameScores : allScores
  const playerFilter  = tab === 'player' && activeProfile ? activeProfile.name : null
  const filtered      = playerFilter ? displayScores.filter(s => s.player === playerFilter) : displayScores

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.badge}>{t("highScores.title")}</div>
          <div className={styles.tabs}>
            <button className={styles.tab + (tab === 'all'    ? ' ' + styles.tabActive : '')} onClick={() => setTab('all')}>{t("highScores.allTime")}</button>
            <button className={styles.tab + (tab === 'player' ? ' ' + styles.tabActive : '')} onClick={() => setTab('player')} disabled={!activeProfile}>
              {activeProfile ? activeProfile.name : t("highScores.myScores")}
            </button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>ESC</button>
        </div>
        <div className={styles.gameSelector}>
          <select
            className={styles.gameSelect}
            value={gameId || ''}
            onChange={e => { setGameId(e.target.value || null); if (e.target.value) setTab('game') }}
          >
            <option value="">{t("highScores.filterByGame")}</option>
            {games.filter(g => getScores(g.id || g.profile).length > 0).map(g => (
              <option key={g.id || g.profile} value={g.id || g.profile}>{g.title || g.id || g.profile}</option>
            ))}
          </select>
          {gameId && <button className={styles.addScoreBtn} onClick={() => setEntering(true)}>{t("highScores.addScore")}</button>}
        </div>
        {entering && (
          <div className={styles.entryRow}>
            <span className={styles.entryLabel}>{t("highScores.yourScore")}</span>
            <input className={styles.scoreInput} type="number" value={newScore}
              onChange={e => setNewScore(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveScore() }}
              placeholder="000000" autoFocus />
            <button className={styles.saveBtn} style={{ textTransform: 'uppercase' }} onClick={handleSaveScore}>{t("common.save")}</button>
            <button className={styles.cancelBtn} style={{ textTransform: 'uppercase' }} onClick={() => { setEntering(false); setNewScore('') }}>{t("common.cancel")}</button>
          </div>
        )}
        <div className={styles.board} ref={scrollRef}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {gameId ? t("highScores.noScoresForGame") : t("highScores.noScoresYet")}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rank}>#</th>
                  <th className={styles.playerCol}>{t("highScores.player")}</th>
                  {tab !== 'game' && <th className={styles.gameCol}>{t("highScores.game")}</th>}
                  <th className={styles.scoreCol}>{t("highScores.score")}</th>
                  <th className={styles.dateCol}>{t("highScores.date")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((s, i) => (
                  <tr key={i} className={i === 0 ? styles.topScore : ''}>
                    <td className={styles.rank}>{i === 0 ? '[1]' : i === 1 ? '[2]' : i === 2 ? '[3]' : i + 1}</td>
                    <td className={styles.playerCol} style={{ color: i < 3 ? '#00c8ff' : undefined }}>{s.player}</td>
                    {tab !== 'game' && <td className={styles.gameCol}>{s.gameTitle}</td>}
                    <td className={styles.scoreCol}>{formatScore(s.score)}</td>
                    <td className={styles.dateCol}>{formatDate(s.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.footer}>{t("highScores.footer")}</div>
      </div>
    </div>
  )
}
