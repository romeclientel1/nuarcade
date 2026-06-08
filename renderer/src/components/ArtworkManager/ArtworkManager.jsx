import { useState, useCallback } from "react"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"
import styles from "./ArtworkManager.module.css"

export default function ArtworkManager({ games, onClose, apiKey, onArtworkUpdate }) {
  const [status, setStatus] = useState("idle")
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState([])
  const [found, setFound] = useState(0)
  const { fetchArtworkForGame } = useSteamGridDB(apiKey)

  const addLog = (msg) => setLog(l => [...l.slice(-40), msg])

  const runDownload = useCallback(async () => {
    setStatus("running")
    setProgress(0)
    setLog([])
    setFound(0)

    const artwork = {}
    for (let i = 0; i < games.length; i++) {
      const game = games[i]
      setProgress(Math.round((i / games.length) * 100))
      addLog("Searching: " + game.title)
      try {
        const result = await fetchArtworkForGame(game.title)
        if (result && (result.hero || result.capsule || result.logo)) {
          artwork[game.id || game.profile] = result
          setFound(f => f + 1)
          addLog("Found art: " + game.title)
        } else {
          addLog("No art: " + game.title)
        }
      } catch (e) {
        addLog("Error: " + game.title)
      }
      await new Promise(r => setTimeout(r, 300))
    }

    try {
      localStorage.setItem("nuarcade_artwork", JSON.stringify(artwork))
    } catch (e) {}

    onArtworkUpdate?.(artwork)
    setProgress(100)
    setStatus("done")
  }, [games, fetchArtworkForGame, onArtworkUpdate])

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title}>Artwork Manager</div>
          <button className={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div className={styles.body}>
          <div className={styles.info}>
            Downloads box art, hero images, and logos from SteamGridDB for all {games.length} games in your library.
          </div>

          {!apiKey && (
            <div className={styles.noKey}>
              No SteamGridDB API key set. Add your key in Settings to enable artwork download.
              Get a free key at steamgriddb.com/profile/preferences
            </div>
          )}

          {status !== "idle" && (
            <>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: progress + "%" }} />
              </div>
              <div className={styles.stats}>
                {status === "done" ? "Done! Found artwork for " + found + " games." : "Scanning " + progress + "% - found " + found + " so far..."}
              </div>
              <div className={styles.logBox}>
                {log.map((l, i) => <div key={i} className={styles.logLine}>{l}</div>)}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          {status === "idle" && (
            <button
              className={styles.startBtn}
              onClick={runDownload}
              
            >
              Start artwork download
            </button>
          )}
          {status === "running" && (
            <button className={styles.startBtn} disabled style={{ opacity: 0.5 }}>
              Downloading...
            </button>
          )}
          {status === "done" && (
            <button className={styles.startBtn} onClick={onClose}>
              Done - close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
