import { useState, useEffect } from 'react'

const SAMPLE_GAMES = [
  { id: 'WMMT5DX',      title: 'Wangan Midnight MT 5DX+',    genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WMMT5DX.xml',      icon: '🏎️' },
  { id: 'InitialD8',    title: 'Initial D Arcade Stage 8',   genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'InitialD8.xml',     icon: '🚗' },
  { id: 'HotD4',        title: 'House of the Dead 4',        genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Perfect', profile: 'HotD4.xml',         icon: '🧟' },
  { id: 'DOA5',         title: 'Dead or Alive 5 Ultimate',   genre: 'Fighting', system: 'SEGA RingEdge2', status: 'Perfect', profile: 'DOA5.xml',          icon: '⚔️' },
  { id: 'DaytonaUSA',   title: 'Daytona Championship USA',   genre: 'Racing',   system: 'SEGA PC',        status: 'Perfect', profile: 'DaytonaUSA.xml',    icon: '🏁' },
  { id: 'BBCF',         title: 'BlazBlue Central Fiction',   genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BBCF.xml',          icon: '🌀' },
  { id: 'ABC',          title: 'After Burner Climax',        genre: 'Flying',   system: 'SEGA Lindbergh', status: 'Perfect', profile: 'ABC.xml',           icon: '✈️' },
  { id: 'CruisnBlast',  title: "Cruis'n Blast",              genre: 'Racing',   system: 'Raw Thrills',    status: 'Perfect', profile: 'CruisnBlast.xml',   icon: '💥' },
  { id: 'Aliens',       title: 'Aliens Armageddon',          genre: 'Shooter',  system: 'Raw Thrills',    status: 'Perfect', profile: 'Aliens.xml',        icon: '👾' },
  { id: 'TC5',          title: 'Time Crisis 5',              genre: 'Shooter',  system: 'Namco 369',      status: 'Great',   profile: 'TC5.xml',           icon: '🎯' },
  { id: 'DBZB',         title: 'Dragon Ball Zenkai BR',      genre: 'Fighting', system: 'Namco 369',      status: 'Perfect', profile: 'DBZB.xml',          icon: '🐉' },
  { id: 'CrossbeatsRev',title: 'Crossbeats Rev Sunshine',    genre: 'Rhythm',   system: 'SEGA Nu',        status: 'Perfect', profile: 'CrossbeatsRev.xml', icon: '🎵' },
  { id: 'F0AX',         title: 'F-Zero AX',                  genre: 'Racing',   system: 'Sega Triforce',  status: 'Perfect', profile: 'FZeroAX.xml',       icon: '🚀' },
  { id: 'GhostSquad',   title: 'Ghost Squad Evolution',      genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Great',   profile: 'GhostSquadEvo.xml', icon: '🔫' },
  { id: 'Dariusburst',  title: 'Dariusburst Another Chron.', genre: 'Shooter',  system: 'Taito Type X2',  status: 'Perfect', profile: 'DariusBurst.xml',   icon: '🐟' },
]

export function useGameLibrary() {
  const [games, setGames] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    loadLibrary()
  }, [])

  const loadLibrary = async () => {
    setLoading(true)
    setError(null)

    try {
      if (window.nuarcade && window.nuarcade.platform === 'win32') {
        const cfg = await window.nuarcade.getConfig()
        setConfig(cfg)

        if (cfg.setupComplete) {
          const result = await window.nuarcade.scanGames(
            cfg.teknoParrotPath,
            cfg.gamesFolderPath
          )
          if (result.error) {
            setError(result.error)
            setGames(SAMPLE_GAMES)
          } else {
            setGames(result.games)
            setStats(result.stats)
          }
        } else {
          setGames(SAMPLE_GAMES)
        }
      } else {
        setGames(SAMPLE_GAMES)
        setStats({
          total: SAMPLE_GAMES.length,
          visible: SAMPLE_GAMES.length,
          hidden: 0,
          devMode: true,
        })
      }
    } catch (err) {
      setError(err.message)
      setGames(SAMPLE_GAMES)
    } finally {
      setLoading(false)
    }
  }

  const refreshLibrary = () => loadLibrary()

  return { games, stats, loading, error, config, refreshLibrary }
}