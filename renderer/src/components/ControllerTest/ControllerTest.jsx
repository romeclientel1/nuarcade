import { useState, useEffect } from "react"
import styles from "./ControllerTest.module.css"

const BUTTON_LABELS = {
  0: "A", 1: "B", 2: "X", 3: "Y",
  4: "LB", 5: "RB", 6: "LT", 7: "RT",
  8: "Back", 9: "Start", 10: "LS", 11: "RS",
  12: "Up", 13: "Down", 14: "Left", 15: "Right",
  16: "Home"
}

export default function ControllerTest({ onClose }) {
  const [pads, setPads] = useState([])
  const [pressed, setPressed] = useState({})
  const [axes, setAxes] = useState({})

  useEffect(() => {
    let raf
    const poll = () => {
      const gamepads = navigator.getGamepads?.() || []
      const connected = []
      const newPressed = {}
      const newAxes = {}
      for (const gp of gamepads) {
        if (!gp) continue
        connected.push({ id: gp.id, index: gp.index })
        gp.buttons.forEach((btn, i) => {
          if (btn.pressed) newPressed[gp.index + "_" + i] = true
        })
        gp.axes.forEach((val, i) => {
          newAxes[gp.index + "_" + i] = val
        })
      }
      setPads(connected)
      setPressed(newPressed)
      setAxes(newAxes)
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title}>Controller Test</div>
          <button className={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        {pads.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>[ ]</div>
            <div className={styles.emptyText}>No controllers detected</div>
            <div className={styles.emptySub}>Plug in a gamepad and press any button</div>
          </div>
        ) : (
          <div className={styles.body}>
            {pads.map(pad => (
              <div key={pad.index} className={styles.padSection}>
                <div className={styles.padName}>{pad.id.slice(0, 40)}</div>
                <div className={styles.btnGrid}>
                  {Object.entries(BUTTON_LABELS).map(([idx, label]) => (
                    <div key={idx} className={styles.btn + (pressed[pad.index + "_" + idx] ? " " + styles.btnActive : "")}>
                      {label}
                    </div>
                  ))}
                </div>
                <div className={styles.axesGrid}>
                  {[0,1,2,3].map(i => (
                    <div key={i} className={styles.axisRow}>
                      <span className={styles.axisLabel}>Axis {i}</span>
                      <div className={styles.axisTrack}>
                        <div className={styles.axisThumb} style={{ left: ((axes[pad.index + "_" + i] || 0) + 1) / 2 * 100 + "%" }} />
                      </div>
                      <span className={styles.axisVal}>{(axes[pad.index + "_" + i] || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.hint}>Button presses light up green in real time</div>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
