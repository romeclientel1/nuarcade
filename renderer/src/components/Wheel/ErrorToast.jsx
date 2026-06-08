import { useState, useCallback } from "react"
import styles from "./ErrorToast.module.css"

export function useErrorToast() {
  const [toasts, setToasts] = useState([])

  const showError = useCallback((message) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showError, dismiss }
}

export function ErrorToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <div key={t.id} className={styles.toast} onClick={() => onDismiss(t.id)}>
          <span className={styles.icon}>!</span>
          <span className={styles.message}>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
