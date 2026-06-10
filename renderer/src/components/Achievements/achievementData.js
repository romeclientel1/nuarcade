// Using var (not const) so Rollup/esbuild never hits a TDZ initialization error
// regardless of module evaluation order in the bundle.
var ACHIEVEMENTS = [
  // Playtime
  { id: "first_launch",   icon: "?",  title: "First Launch",      desc: "Launch your first game",               check: (s) => s.totalLaunches >= 1 },
  { id: "hour_1",         icon: "?",  title: "First Hour",        desc: "Play for 1 total hour",                check: (s) => s.totalTimeSec >= 3600 },
  { id: "hour_10",        icon: "?",  title: "Dedicated",         desc: "Play for 10 total hours",              check: (s) => s.totalTimeSec >= 36000 },
  { id: "hour_50",        icon: "?",  title: "Veteran",           desc: "Play for 50 total hours",              check: (s) => s.totalTimeSec >= 180000 },
  { id: "hour_100",       icon: "?",  title: "Legend",            desc: "Play for 100 total hours",             check: (s) => s.totalTimeSec >= 360000 },
  { id: "session_30m",    icon: "?",  title: "In The Zone",       desc: "Play one game for 30+ minutes",        check: (s) => s.bestSession >= 1800 },
  { id: "session_2h",     icon: "?",  title: "Marathon",          desc: "Play one game for 2+ hours",           check: (s) => s.bestSession >= 7200 },
  // Launches
  { id: "launches_10",    icon: "?",  title: "Regular",           desc: "Launch games 10 times total",          check: (s) => s.totalLaunches >= 10 },
  { id: "launches_50",    icon: "?",  title: "Frequent Flyer",    desc: "Launch games 50 times total",          check: (s) => s.totalLaunches >= 50 },
  { id: "launches_200",   icon: "?",  title: "Cabinet Life",      desc: "Launch games 200 times total",         check: (s) => s.totalLaunches >= 200 },
  { id: "one_game_10",    icon: "?",  title: "Obsessed",          desc: "Launch one game 10+ times",            check: (s) => s.maxGameLaunches >= 10 },
  { id: "one_game_50",    icon: "?",  title: "Main Character",    desc: "Launch one game 50+ times",            check: (s) => s.maxGameLaunches >= 50 },
  // Library
  { id: "games_10",       icon: "?",  title: "Collector",         desc: "Play 10 different games",              check: (s) => s.gamesPlayed >= 10 },
  { id: "games_25",       icon: "?",  title: "Explorer",          desc: "Play 25 different games",              check: (s) => s.gamesPlayed >= 25 },
  { id: "games_50",       icon: "?",  title: "Connoisseur",       desc: "Play 50 different games",              check: (s) => s.gamesPlayed >= 50 },
  { id: "games_100",      icon: "?",  title: "Completionist",     desc: "Play 100 different games",             check: (s) => s.gamesPlayed >= 100 },
  // Ratings
  { id: "rated_1",        icon: "*",  title: "Critic",            desc: "Rate your first game",                 check: (s) => s.gamesRated >= 1 },
  { id: "rated_10",       icon: "*",  title: "Reviewer",          desc: "Rate 10 games",                        check: (s) => s.gamesRated >= 10 },
  { id: "rated_25",       icon: "*",  title: "Taste Maker",       desc: "Rate 25 games",                        check: (s) => s.gamesRated >= 25 },
  { id: "perfect_5",      icon: "*",  title: "Hall of Fame",      desc: "Give 5 games a perfect rating",        check: (s) => s.perfectRatings >= 5 },
  // Collections
  { id: "collection_1",   icon: "[]", title: "Curator",           desc: "Create your first collection",         check: (s) => s.collections >= 1 },
  { id: "collection_5",   icon: "[]", title: "Archivist",         desc: "Create 5 collections",                 check: (s) => s.collections >= 5 },
  { id: "col_game_10",    icon: "[]", title: "Organized",         desc: "Add 10 games to collections",          check: (s) => s.collectionGames >= 10 },
  // Special
  { id: "night_owl",      icon: "?",  title: "Night Owl",         desc: "Launch a game after midnight",         check: (s) => s.launchedAfterMidnight },
  { id: "early_bird",     icon: "?",  title: "Early Bird",        desc: "Launch a game before 6am",             check: (s) => s.launchedBeforeSix },
  { id: "all_emulators",  icon: "?",  title: "Omniplay",          desc: "Use all 16 emulators at least once",   check: (s) => s.distinctEmulators >= 16 },
  { id: "5_systems",      icon: "?",  title: "Multi-System",      desc: "Play games on 5 different systems",    check: (s) => s.distinctSystems >= 5 },
]

export { ACHIEVEMENTS }

// Function declaration (not arrow/const) -- hoisted fully, no TDZ risk
export function computeStats(games) {
  var pt       = (function() { try { return JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}") } catch(e) { return {} } })()
  var lc       = (function() { try { return JSON.parse(localStorage.getItem("nuarcade_launches")  || "{}") } catch(e) { return {} } })()
  var ratings  = (function() { try { return JSON.parse(localStorage.getItem("nuarcade_ratings")   || "{}") } catch(e) { return {} } })()
  var cols     = (function() { try { return JSON.parse(localStorage.getItem("nuarcade_collections")|| "{}") } catch(e) { return {} } })()
  var launches = (function() { try { return JSON.parse(localStorage.getItem("nuarcade_launches")   || "{}") } catch(e) { return {} } })()

  var totalTimeSec    = Object.values(pt).reduce(function(s, v) { return s + (v.total || 0) }, 0)
  var totalLaunches   = Object.values(lc).reduce(function(s, v) { return s + (v.count || 0) }, 0)
  var gamesPlayed     = Object.values(pt).filter(function(v) { return v.total > 0 }).length
  var bestSession     = Math.max.apply(null, [0].concat(Object.values(pt).map(function(v) { return v.best || 0 })))
  var maxGameLaunches = Math.max.apply(null, [0].concat(Object.values(lc).map(function(v) { return v.count || 0 })))
  var gamesRated      = Object.values(ratings).filter(function(r) { return r > 0 }).length
  var perfectRatings  = Object.values(ratings).filter(function(r) { return r === 5 }).length
  var collections     = Object.keys(cols).length
  var collectionGames = Object.values(cols).reduce(function(s, c) { return s + ((c.games && c.games.length) || 0) }, 0)

  var launchedAfterMidnight = false
  var launchedBeforeSix = false
  Object.values(launches).forEach(function(v) {
    if (!v.last) return
    var h = new Date(v.last).getHours()
    if (h >= 0 && h < 3)  launchedAfterMidnight = true
    if (h >= 4 && h < 6)  launchedBeforeSix = true
  })

  var emulatorSet = new Set(games.filter(function(g) { return pt[g.id || g.profile] && pt[g.id || g.profile].total > 0 }).map(function(g) { return g.emulator }))
  var systemSet   = new Set(games.filter(function(g) { return pt[g.id || g.profile] && pt[g.id || g.profile].total > 0 }).map(function(g) { return g.system }))

  return {
    totalTimeSec: totalTimeSec,
    totalLaunches: totalLaunches,
    gamesPlayed: gamesPlayed,
    bestSession: bestSession,
    maxGameLaunches: maxGameLaunches,
    gamesRated: gamesRated,
    perfectRatings: perfectRatings,
    collections: collections,
    collectionGames: collectionGames,
    launchedAfterMidnight: launchedAfterMidnight,
    launchedBeforeSix: launchedBeforeSix,
    distinctEmulators: emulatorSet.size,
    distinctSystems: systemSet.size,
  }
}
