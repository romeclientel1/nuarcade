export function computeStats(games) {
  const pt       = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}") } catch { return {} } })()
  const lc       = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_launches")  || "{}") } catch { return {} } })()
  const ratings  = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_ratings")   || "{}") } catch { return {} } })()
  const cols     = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_collections")|| "{}") } catch { return {} } })()
  const launches = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_launches")   || "{}") } catch { return {} } })()

  const totalTimeSec    = Object.values(pt).reduce((s, v) => s + (v.total || 0), 0)
  const totalLaunches   = Object.values(lc).reduce((s, v) => s + (v.count || 0), 0)
  const gamesPlayed     = Object.values(pt).filter(v => v.total > 0).length
  const bestSession     = Math.max(0, ...Object.values(pt).map(v => v.best || 0))
  const maxGameLaunches = Math.max(0, ...Object.values(lc).map(v => v.count || 0))
  const gamesRated      = Object.values(ratings).filter(r => r > 0).length
  const perfectRatings  = Object.values(ratings).filter(r => r === 5).length
  const collections     = Object.keys(cols).length
  const collectionGames = Object.values(cols).reduce((s, c) => s + (c.games?.length || 0), 0)

  let launchedAfterMidnight = false
  let launchedBeforeSix = false
  Object.values(launches).forEach(v => {
    if (!v.last) return
    const h = new Date(v.last).getHours()
    if (h >= 0 && h < 3) launchedAfterMidnight = true
    if (h >= 4 && h < 6) launchedBeforeSix = true
  })

  const emulatorSet = new Set(games.filter(g => pt[g.id || g.profile]?.total > 0).map(g => g.emulator))
  const systemSet   = new Set(games.filter(g => pt[g.id || g.profile]?.total > 0).map(g => g.system))

  return {
    totalTimeSec, totalLaunches, gamesPlayed, bestSession, maxGameLaunches,
    gamesRated, perfectRatings, collections, collectionGames,
    launchedAfterMidnight, launchedBeforeSix,
    distinctEmulators: emulatorSet.size,
    distinctSystems:   systemSet.size,
  }
}
