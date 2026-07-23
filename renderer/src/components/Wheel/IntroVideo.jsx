import { useState, useEffect, useRef } from "react"
import styles from "./IntroVideo.module.css"
import { useI18n } from "../../i18n/I18nContext.js"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"

const FADE_DURATION = 400

const buildVideoUrl = (mediaPath, fileName) => {
  const base = (mediaPath || "C:\\Media\\")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")

  return `file:///${base}/${fileName}`
}

export default function IntroVideo({
  mediaPath,
  fileName = "intro.mp4",
  onComplete,
}) {
  const { t } = useI18n()
  const videoRef = useRef(null)
  const completionTimerRef = useRef(null)
  const doneRef = useRef(false)
  const [visible, setVisible] = useState(true)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    setVisible(false)
    completionTimerRef.current = setTimeout(onComplete, FADE_DURATION)
  }

  useOverlayGamepad({
    onClose: finish,
    onUp: finish,
    onDown: finish,
    onLeft: finish,
    onRight: finish,
    onConfirm: finish,
    enabled: true,
  })

  useEffect(() => {
    window.addEventListener("keydown", finish)
    window.addEventListener("click", finish)

    return () => {
      window.removeEventListener("keydown", finish)
      window.removeEventListener("click", finish)
      clearTimeout(completionTimerRef.current)
    }
  }, [])

  const videoPath = buildVideoUrl(mediaPath, fileName)

  return (
    <div
      className={styles.overlay}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_DURATION}ms ease`,
      }}
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={videoPath}
        autoPlay
        playsInline
        onEnded={finish}
        onError={finish}
      />
      <div className={styles.skipHint}>{t("bootScreen.hint")}</div>
    </div>
  )
}
