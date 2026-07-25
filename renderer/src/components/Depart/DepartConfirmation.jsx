import { useCallback, useEffect, useRef } from "react"
import { useGamepad } from "../../hooks/useGamepad"
import { acceptDepartOnce } from "./departInteraction.js"
import styles from "./DepartConfirmation.module.css"

export default function DepartConfirmation({
  eyebrow,
  title,
  hint,
  yesLabel,
  noLabel,
  choice,
  onChoiceChange,
  onConfirm,
  onCancel,
}) {
  const noButtonRef = useRef(null)
  const acceptedRef = useRef(false)

  const choose = useCallback((nextChoice) => {
    if (choice !== nextChoice) onChoiceChange(nextChoice)
  }, [choice, onChoiceChange])

  const confirmOnce = useCallback(() => {
    acceptDepartOnce(acceptedRef, onConfirm)
  }, [onConfirm])

  const acceptChoice = useCallback(() => {
    if (choice === 0) confirmOnce()
    else onCancel()
  }, [choice, confirmOnce, onCancel])

  useGamepad({
    departDialog: true,
    left: () => choose(0),
    right: () => choose(1),
    confirm: acceptChoice,
    back: onCancel,
  })

  useEffect(() => {
    noButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") choose(0)
      else if (event.key === "ArrowRight") choose(1)
      else if (event.key === "Enter") acceptChoice()
      else if (event.key === "Escape") onCancel()
      else return

      event.preventDefault()
      event.stopImmediatePropagation()
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [choose, acceptChoice, onCancel])

  return (
    <div
      className={styles.overlay}
      data-vespara-depart-dialog="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vespara-depart-title"
      aria-describedby="vespara-depart-hint"
    >
      <div className={styles.chamber}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <div className={styles.title} id="vespara-depart-title">{title}</div>
        <div className={styles.hint} id="vespara-depart-hint">{hint}</div>
        <div className={styles.choices}>
          <button
            className={`${styles.choice} ${choice === 0 ? styles.active : ""}`}
            aria-pressed={choice === 0}
            onClick={confirmOnce}
          >
            {yesLabel}
          </button>
          <button
            ref={noButtonRef}
            className={`${styles.choice} ${choice === 1 ? styles.active : ""}`}
            aria-pressed={choice === 1}
            onClick={onCancel}
          >
            {noLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
