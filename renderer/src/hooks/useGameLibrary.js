import { useState, useEffect } from 'react'

const SAMPLE_GAMES = [
  { id: 'WanganMidnightMaximumTune5DX',  title: 'Wangan Midnight MT 5DX+',    genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune5DX.xml',  icon: '🏎️' },
  { id: 'InitialDArcadeStage8InfinityPC', title: 'Initial D Arcade Stage 8',   genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'InitialDArcadeStage8InfinityPC.xml', icon: '🚗' },
  { id: 'HouseOfTheDead4Special',         title: 'House of the Dead 4',        genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Perfect', profile: 'HouseOfTheDead4Special.xml',         icon: '🧟' },
  { id: 'DeadOrAlive5UltimateArcade',     title: 'Dead or Alive 5 Ultimate',   genre: 'Fighting', system: 'SEGA RingEdge2', status: 'Perfect', profile: 'DeadOrAlive5UltimateArcade.xml',     icon: '⚔️' },
  { id: 'DaytonaChampionshipUSA',         title: 'Daytona Championship USA',   genre: 'Racing',   system: 'SEGA PC',        status: 'Perfect', profile: 'DaytonaChampionshipUSA.xml',         icon: '🏁' },
  { id: 'BlazBlueCentralFiction',         title: 'BlazBlue Central Fiction',   genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueCentralFiction.xml',         icon: '🌀' },
  { id: 'AfterBurnerClimax',              title: 'After Burner Climax',        genre: 'Flying',   system: 'SEGA Lindbergh', status: 'Perfect', profile: 'AfterBurnerClimax.xml',              icon: '✈️' },
  { id: 'CruisnBlast',                    title: "Cruis'n Blast",              genre: 'Racing',   system: 'Raw Thrills',    status: 'Perfect', profile: 'CruisnBlast.xml',                    icon: '💥' },
  { id: 'AliensArmageddon',               title: 'Aliens Armageddon',          genre: 'Shooter',  system: 'Raw Thrills',    status: 'Perfect', profile: 'AliensArmageddon.xml',               icon: '👾' },
  { id: 'TimeCrisis5',                    title: 'Time Crisis 5',              genre: 'Shooter',  system: 'Namco 369',      status: 'Great',   profile: 'TimeCrisis5.xml',                    icon: '🎯' },
  { id: 'DragonBallZenkaiBattleRoyale',   title: 'Dragon Ball Zenkai BR',      genre: 'Fighting', system: 'Namco 369',      status: 'Perfect', profile: 'DragonBallZenkaiBattleRoyale.xml',   icon: '🐉' },
  { id: 'crossbeatsREVSUNRISE',           title: 'Crossbeats Rev Sunrise',     genre: 'Rhythm',   system: 'SEGA Nu',        status: 'Perfect', profile: 'crossbeatsREVSUNRISE.xml',           icon: '🎵' },
  { id: 'FZeroAX',                        title: 'F-Zero AX',                  genre: 'Racing',   system: 'Sega Triforce',  status: 'Perfect', profile: 'FZeroAX.xml',                        icon: '🚀' },
  { id: 'GhostSquadEvolution',            title: 'Ghost Squad Evolution',      genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Great',   profile: 'GhostSquadEvolution.xml',            icon: '🔫' },
  { id: 'DariusBurstAnotherChronicle',    title: 'Dariusburst Another Chron.', genre: 'Shooter',  system: 'Taito Type X2',  status: 'Perfect', profile: 'DariusBurstAnotherChronicle.xml',    icon: '🐟' },
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