import { useState, useCallback, useRef, useLayoutEffect } from "react"
import { useGamepad } from "../../hooks/useGamepad"
import styles from "./Collections.module.css"

const COLLECTIONS_KEY = "nuarcade_collections"

function loadCollections() {
  try { return JSON.parse(localStorage.getItem(COLLECTIONS_KEY) || "{}") } catch { return {} }
}
function saveCollections(data) {
  try { localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(data)) } catch {}
}

export function useCollections() {
  const getCollections = useCallback(() => loadCollections(), [])

  const createCollection = useCallback((name) => {
    if (!name.trim()) return false
    const cols = loadCollections()
    const id = "col_" + Date.now()
    cols[id] = { id, name: name.trim(), games: [], created: Date.now() }
    saveCollections(cols)
    return id
  }, [])

  const deleteCollection = useCallback((id) => {
    const cols = loadCollections()
    delete cols[id]
    saveCollections(cols)
  }, [])

  const addToCollection = useCallback((colId, game) => {
    const cols = loadCollections()
    if (!cols[colId]) return
    const gameId = game.id || game.profile
    if (!cols[colId].games.includes(gameId)) {
      cols[colId].games.push(gameId)
      saveCollections(cols)
    }
  }, [])

  const removeFromCollection = useCallback((colId, gameId) => {
    const cols = loadCollections()
    if (!cols[colId]) return
    cols[colId].games = cols[colId].games.filter(g => g !== gameId)
    saveCollections(cols)
  }, [])

  const renameCollection = useCallback((id, newName) => {
    if (!newName.trim()) return
    const cols = loadCollections()
    if (cols[id]) { cols[id].name = newName.trim(); saveCollections(cols) }
  }, [])

  return { getCollections, createCollection, deleteCollection, addToCollection, removeFromCollection, renameCollection }
}

export default function Collections({ games, currentGame, onClose }) {
  const { getCollections, createCollection, deleteCollection, addToCollection, removeFromCollection, renameCollection } = useCollections()

  // -- All state hooks in one block ------------------------------------------
  const [cols, setCols]         = useState(() => getCollections())
  const [newName, setNewName]   = useState("")
  const [activeCol, setActiveCol] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [renameVal, setRenameVal] = useState("")
  const [zone, setZone]         = useState(0)   // 0=sidebar, 1=main panel
  const [sideIdx, setSideIdx]   = useState(0)
  const [mainIdx, setMainIdx]   = useState(0)

  // -- All ref hooks in one block ---------------------------------------------
  const sideRef         = useRef(null)
  const mainRef         = useRef(null)
  const zoneRef         = useRef(0)
  const sideIdxRef      = useRef(0)
  const mainIdxRef      = useRef(0)
  const colListRef      = useRef([])
  const activeColRef    = useRef(null)
  const mainItemsRef    = useRef([])   // [{action}] flat list of focusable main-panel items

  // -- Helpers ----------------------------------------------------------------
  const refresh = () => setCols(getCollections())

  const handleCreate = () => {
    if (!newName.trim()) return
    createCollection(newName)
    setNewName("")
    refresh()
  }

  const handleToggleGame = (colId, game) => {
    const gameId = game.id || game.profile
    const col = cols[colId]
    if (col?.games?.includes(gameId)) removeFromCollection(colId, gameId)
    else addToCollection(colId, game)
    refresh()
  }

  const handleDelete = (id) => {
    deleteCollection(id)
    if (activeCol === id) setActiveCol(null)
    refresh()
  }

  const handleRename = (id) => {
    renameCollection(id, renameVal)
    setRenaming(null)
    setRenameVal("")
    refresh()
  }

  // -- Derived values (not hooks) ---------------------------------------------
  const colList = Object.values(cols).sort((a, b) => b.created - a.created)
  const activeColData = activeCol ? cols[activeCol] : null
  const activeGames = activeColData
    ? games.filter(g => activeColData.games.includes(g.id || g.profile))
    : []

  // Build flat list of confirm actions for main-panel items this render
  let mainItems = []
  if (!activeCol) {
    // Empty state: quick-add buttons (one per collection)
    mainItems = colList.map(col => ({
      action: () => { if (currentGame) handleToggleGame(col.id, currentGame) },
    }))
  } else {
    // Active collection: add/remove current game (if present) then each game in list
    if (currentGame) {
      mainItems.push({ action: () => handleToggleGame(activeCol, currentGame) })
    }
    activeGames.forEach(g => {
      mainItems.push({ action: () => handleToggleGame(activeCol, g) })
    })
  }

  // -- Sync all refs every render (useLayoutEffect, no deps, always before paint) --
  useLayoutEffect(() => {
    zoneRef.current    = zone
    sideIdxRef.current = sideIdx
    mainIdxRef.current = mainIdx
    colListRef.current = colList
    activeColRef.current = activeCol
    mainItemsRef.current = mainItems
  })

  // -- Gamepad: single instance, correct hook placement ----------------------
  useGamepad({
    up: () => {
      if (zoneRef.current === 0) setSideIdx(i => Math.max(0, i - 1))
      else setMainIdx(i => Math.max(0, i - 1))
    },
    down: () => {
      if (zoneRef.current === 0) setSideIdx(i => Math.min(Math.max(0, colListRef.current.length - 1), i + 1))
      else setMainIdx(i => Math.min(Math.max(0, mainItemsRef.current.length - 1), i + 1))
    },
    left:  () => { if (zoneRef.current === 1) setZone(0) },
    right: () => { if (zoneRef.current === 0 && activeColRef.current) setZone(1) },
    confirm: () => {
      if (zoneRef.current === 0) {
        const col = colListRef.current[sideIdxRef.current]
        if (col) {
          setActiveCol(col.id === activeColRef.current ? null : col.id)
          setZone(1)
          setMainIdx(0)
        }
      } else {
        const item = mainItemsRef.current[mainIdxRef.current]
        if (item) item.action()
      }
    },
    back: () => {
      if (zoneRef.current === 1) setZone(0)
      else onClose?.()
    },
    enabled: true,
  })

  // -- Render ----------------------------------------------------------------
  return (
    <div className={styles.overlay} onClick={onClose} ref={sideRef}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Collections</div>
          <button className={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            <div className={styles.newRow}>
              <input
                className={styles.newInput}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
                placeholder="New collection..."
              />
              <button className={styles.createBtn} onClick={handleCreate}>+</button>
            </div>
            <div className={styles.colList} ref={sideRef}>
              {colList.length === 0 && (
                <div className={styles.emptyHint}>No collections yet.</div>
              )}
              {colList.map((col, ci) => (
                <div
                  key={col.id}
                  className={
                    styles.colItem +
                    (activeCol === col.id ? " " + styles.colActive : "") +
                    (zone === 0 && sideIdx === ci ? " " + styles.gamepadFocused : "")
                  }
                  onClick={() => {
                    setActiveCol(col.id === activeCol ? null : col.id)
                    setSideIdx(ci)
                    setZone(1)
                    setMainIdx(0)
                  }}
                >
                  {renaming === col.id ? (
                    <input
                      className={styles.renameInput}
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleRename(col.id)
                        if (e.key === "Escape") { setRenaming(null); setRenameVal("") }
                      }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <div className={styles.colName}>{col.name}</div>
                  )}
                  <div className={styles.colMeta}>
                    <span className={styles.colCount}>{col.games.length}</span>
                    <button className={styles.renameBtn} onClick={e => { e.stopPropagation(); setRenaming(col.id); setRenameVal(col.name) }}>R</button>
                    <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); handleDelete(col.id) }}>X</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.main} ref={mainRef}>
            {!activeCol ? (
              <div className={styles.mainEmpty}>
                <div className={styles.mainEmptyIcon}>[]</div>
                <div className={styles.mainEmptyText}>Select a collection to manage its games</div>
                {currentGame && colList.length > 0 && (
                  <div className={styles.quickAdd}>
                    <div className={styles.quickAddLabel}>Quick-add "{currentGame.title}":</div>
                    {colList.map((col, qi) => {
                      const inCol = col.games.includes(currentGame.id || currentGame.profile)
                      return (
                        <button
                          key={col.id}
                          className={
                            styles.quickBtn +
                            (inCol ? " " + styles.quickBtnOn : "") +
                            (zone === 1 && mainIdx === qi ? " " + styles.gamepadFocused : "")
                          }
                          onClick={() => { handleToggleGame(col.id, currentGame) }}
                        >
                          {inCol ? "- " : "+ "}{col.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className={styles.mainTitle}>{activeColData?.name}</div>
                <div className={styles.mainSub}>{activeGames.length} game{activeGames.length !== 1 ? "s" : ""}</div>
                {currentGame && (
                  <button
                    className={
                      styles.addCurrentBtn +
                      (activeColData?.games?.includes(currentGame.id || currentGame.profile) ? " " + styles.addCurrentBtnOn : "") +
                      (zone === 1 && mainIdx === 0 ? " " + styles.gamepadFocused : "")
                    }
                    onClick={() => handleToggleGame(activeCol, currentGame)}
                  >
                    {activeColData?.games?.includes(currentGame.id || currentGame.profile)
                      ? "Remove \"" + currentGame.title + "\" from collection"
                      : "Add \"" + currentGame.title + "\" to collection"}
                  </button>
                )}
                <div className={styles.gameList}>
                  {activeGames.length === 0 && (
                    <div className={styles.mainEmptyText} style={{padding:"20px 0"}}>No games yet. Use the button above to add the current game.</div>
                  )}
                  {activeGames.map((g, gi) => {
                    const itemIdx = gi + (currentGame ? 1 : 0)
                    return (
                      <div
                        key={g.id || g.profile}
                        className={styles.gameRow + (zone === 1 && mainIdx === itemIdx ? " " + styles.gamepadFocused : "")}
                      >
                        <div className={styles.gameInfo}>
                          <div className={styles.gameTitle}>{g.title}</div>
                          <div className={styles.gameSystem}>{g.system}</div>
                        </div>
                        <button className={styles.removeBtn} onClick={() => handleToggleGame(activeCol, g)}>Remove</button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
