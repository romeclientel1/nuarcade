import { useState, useEffect } from "react"
import styles from "./CRT.module.css"

export default function CRT({ enabled }) {
  if (!enabled) return null
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.scanlines} />
      <div className={styles.vignette} />
      <div className={styles.flicker} />
    </div>
  )
}
