import { useState, useEffect, useRef, useCallback } from "react"
import styles from "./VirtualKeyboard.module.css"

const ROWS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L","'"],
  ["Z","X","C","V","B","N","M","-",".",":"],
  ["SPACE","BACKSPACE","CLEAR","DONE"],
]

const KEY_W = { SPACE: 3, BACKSPACE: 2, CLEAR: 2, DONE: 2 }

export default function VirtualKeyboard({ value, onChange, onDone, onClose, resultCount }) {
  const [row, setRow] = useState(1)
  const [col, setCol] = useState(0)
  const lastInput = useRef(0)
  const REPEAT = 160

  const currentRow = ROWS[row]
  const currentKey = currentRow[col] || currentRow[0]

  const press = useCallback((key) => {
    if (key === "DONE")      { onDone?.(); return }
    if (key === "BACKSPACE") { onChange(value.slice(0, -1)); return }
    if (key === "CLEAR")     { onChange(""); return }
    if (key === "SPACE")     { onChange(value + " "); return }
    onChange(value + key.toLowerCase())
  }, [value, onChange, onDone])

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { onClose?.(); return }
      if (e.key === "Enter")  { onDone?.(); return }
      if (e.key === "Backspace") { onChange(value.slice(0, -1)); return }
      if (e.key.length === 1)    { onChange(value + e.key); return }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [value, onChange, onDone, onClose])

  // Gamepad polling
  useEffect(() => {
    let animFrame
    const poll = () => {
      const gp = navigator.getGamepads()[0]
      if (gp) {
        const now = Date.now()
        const canRepeat = now - lastInput.current > REPEAT
        if (canRepeat) {
          // D-pad / left stick navigation
          if (gp.axes[1] < -0.5 || gp.buttons[12]?.pressed) {
            lastInput.current = now
            setRow(r => {
              const nr = Math.max(0, r - 1)
              setCol(c => Math.min(c, ROWS[nr].length - 1))
              return nr
            })
          } else if (gp.axes[1] > 0.5 || gp.buttons[13]?.pressed) {
            lastInput.current = now
            setRow(r => {
              const nr = Math.min(ROWS.length - 1, r + 1)
              setCol(c => Math.min(c, ROWS[nr].length - 1))
              return nr
            })
          } else if (gp.axes[0] < -0.5 || gp.buttons[14]?.pressed) {
            lastInput.current = now
            setCol(c => Math.max(0, c - 1))
          } else if (gp.axes[0] > 0.5 || gp.buttons[15]?.pressed) {
            lastInput.current = now
            setCol(c => Math.min(currentRow.length - 1, c + 1))
          }
          // A = press key
          else if (gp.buttons[0]?.pressed) {
            lastInput.current = now
            press(currentKey)
          }
          // B = backspace
          else if (gp.buttons[1]?.pressed) {
            lastInput.current = now
            if (value.length > 0) onChange(value.slice(0, -1))
            else onClose?.()
          }
          // Y = clear
          else if (gp.buttons[3]?.pressed) {
            lastInput.current = now
            onChange("")
          }
          // Start / X = done
          else if (gp.buttons[2]?.pressed || gp.buttons[9]?.pressed) {
            lastInput.current = now
            onDone?.()
          }
        }
      }
      animFrame = requestAnimationFrame(poll)
    }
    animFrame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(animFrame)
  }, [currentKey, currentRow, value, onChange, onDone, onClose, press])

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        {/* Search display */}
        <div className={styles.searchBar}>
          <div className={styles.searchText}>
            {value || <span className={styles.placeholder}>Search games, systems, ROM names...</span>}
            <span className={styles.cursor}>|</span>
          </div>
          {value && (
            <div className={styles.resultBadge}>
              {resultCount} result{resultCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Gamepad hints */}
        <div className={styles.hints}>
          <span><kbd>A</kbd> Type</span>
          <span><kbd>B</kbd> Delete</span>
          <span><kbd>Y</kbd> Clear</span>
          <span><kbd>X</kbd> / <kbd>Start</kbd> Done</span>
        </div>

        {/* Keys */}
        <div className={styles.keyboard}>
          {ROWS.map((keys, ri) => (
            <div key={ri} className={styles.row}>
              {keys.map((key, ci) => {
                const isActive = ri === row && ci === col
                const w = KEY_W[key]
                return (
                  <button
                    key={key}
                    className={
                      styles.key +
                      (isActive ? " " + styles.keyActive : "") +
                      (key === "DONE" ? " " + styles.keyDone : "") +
                      (key === "BACKSPACE" ? " " + styles.keyDel : "") +
                      (key === "SPACE" ? " " + styles.keySpace : "")
                    }
                    style={w ? { flex: w } : {}}
                    onClick={() => press(key)}
                  >
                    {key === "BACKSPACE" ? "<" : key === "SPACE" ? "SPACE" : key}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <button className={styles.closeBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
