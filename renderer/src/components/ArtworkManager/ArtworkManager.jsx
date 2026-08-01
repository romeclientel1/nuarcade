import { useState, useCallback } from "react"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"
import styles from "./ArtworkManager.module.css"

export default function ArtworkManager({ games, onClose, apiKey, onArtworkUpdate }) {
  const [status,   setStatus  ] = useState("idle")
  const [progress, setProgress] = useState(0)
  const [log,      setLog     ] = useState([])
  const [found,    setFound   ] = useState(0)
  const [skipped,  setSkipped ] = useState(0)
  const [systemFilter, setSystemFilter] = useState("all")
  const { fetchArtworkForGame } = useSteamGridDB(apiKey)

  const gameSystemLabel = (g) => g.system || g.genre || g.emulator || 'Other'
  const availableSystems = [...new Set(games.map(gameSystemLabel))].sort()
  const filteredGames = systemFilter === "all" ? games : games.filter(g => gameSystemLabel(g) === systemFilter)

  const addLog = (msg, type = "info") => setLog(l => [...l.slice(-60), { msg, type }])

  const runDownload = useCallback(async () => {
    setStatus("running")
    setProgress(0)
    setLog([])
    setFound(0)
    setSkipped(0)

    // Load existing artwork so we don't re-fetch what we already have
    let artwork = {}
    try { artwork = JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}") } catch {}

    let foundCount = 0
    let skippedCount = 0

    for (let i = 0; i < filteredGames.length; i++) {
      const game = filteredGames[i]
      const key = game.id || game.profile
      setProgress(Math.round((i / filteredGames.length) * 100))

      // Skip if we already have artwork for this game -- checking both
      // capsule and hero so an EmuMovies-imported hero (with no capsule)
      // doesn't get silently overwritten by a later bulk fetch here.
      if (artwork[key]?.capsule || artwork[key]?.hero) {
        skippedCount++
        setSkipped(skippedCount)
        continue
      }

      addLog("Searching: " + game.title)

      let result = null

      if (apiKey) {
        try {
          result = await fetchArtworkForGame(game.title)
          if (result?.capsule || result?.hero) {
            result.source = "sgdb"
          } else {
            result = null
          }
        } catch (e) { result = null }
        await new Promise(r => setTimeout(r, 200))
      }

      if (result) {
        artwork[key] = { ...(artwork[key] || {}), ...result }
        foundCount++
        setFound(foundCount)
        addLog("Found: " + game.title, "ok")
      } else {
        addLog("No art found: " + game.title, "miss")
      }

      // Save incrementally every 10 games
      if (i % 10 === 0) {
        try { localStorage.setItem("nuarcade_artwork", JSON.stringify(artwork)) } catch {}
      }
    }

    try { localStorage.setItem("nuarcade_artwork", JSON.stringify(artwork)) } catch {}
    onArtworkUpdate?.(artwork)
    setProgress(100)
    setStatus("done")
    addLog("Complete! " + foundCount + " found, " + skippedCount + " already had art.", "ok")
  }, [filteredGames, fetchArtworkForGame, apiKey, onArtworkUpdate])

  const canRun = !!apiKey

  return (
    <>
    <div className={styles.body}>
          <div className={styles.info}>
            Fetches box art and hero images for {systemFilter === "all" ? "all " + games.length : filteredGames.length} games using SteamGridDB.
            Already-fetched games are skipped automatically.
          </div>

          <div className={styles.scopeRow}>
            <label className={styles.scopeLabel} htmlFor="artwork-system-scope">System scope</label>
            <select
              id="artwork-system-scope"
              className={styles.systemFilterSelect}
              value={systemFilter}
              onChange={e => setSystemFilter(e.target.value)}
            >
              <option value="all">All systems ({games.length})</option>
              {availableSystems.map(sys => (
                <option key={sys} value={sys}>
                  {sys} ({games.filter(g => gameSystemLabel(g) === sys).length})
                </option>
              ))}
            </select>
          </div>

          {!canRun && (
            <div className={styles.noKey}>
              Add a SteamGridDB API key in Settings to enable artwork download.
            </div>
          )}

          <div className={styles.sourceRow}>
            <div className={styles.sourceChip} style={{ opacity: apiKey ? 1 : 0.3 }}>
              SteamGridDB {apiKey ? "ready" : "no key"}
            </div>
          </div>

          {status !== "idle" && (
            <>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: progress + "%" }} />
              </div>
              <div className={styles.stats}>
                {status === "done"
                  ? "Done! " + found + " games got new artwork, " + skipped + " already had art."
                  : progress + "% -- " + found + " found, " + skipped + " skipped"}
              </div>
              <div className={styles.logBox}>
                {log.map((l, i) => (
                  <div key={i} className={styles.logLine + " " + (l.type === "ok" ? styles.logOk : l.type === "miss" ? styles.logMiss : "")}>
                    {l.msg}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          {status === "idle" && (
            <button className={styles.startBtn} onClick={runDownload} disabled={!canRun} style={{ opacity: canRun ? 1 : 0.4 }}>
              Fetch artwork for {systemFilter === "all" ? "all " + games.length : filteredGames.length} games
            </button>
          )}
          {status === "running" && (
            <button className={styles.startBtn} disabled style={{ opacity: 0.5 }}>
              Downloading... {progress}%
            </button>
          )}
          {status === "done" && (
            <button className={styles.startBtn} onClick={onClose}>
              Done - close
            </button>
          )}
    </div>
    </>
  )
}
