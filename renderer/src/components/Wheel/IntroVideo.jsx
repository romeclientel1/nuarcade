import { useState, useEffect, useRef } from "react"
import styles from "./IntroVideo.module.css"
import { useI18n } from "../../i18n/I18nContext.js"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import vesparaSymbol from "../../assets/brand/vespara-symbol-simplified.svg"

const FADE_DURATION = 400

const buildVideoUrl = (mediaPath, fileName) => {
  if (!mediaPath) return ""
  const base = mediaPath
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")

  const url = new URL("file:///")
  url.pathname = `${base}/${fileName}`
  return url.href
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
      <div className={styles.brandMarkBacking} aria-hidden="true" />
      <div className={styles.brandLockup} aria-hidden="true">
        <img src={vesparaSymbol} alt="" className={styles.brandSymbol} />
        <div className={styles.brandText}>
          <div className={styles.brandName}>VESPARA</div>
          <div className={styles.brandSubtitle}>THE SANCTUARY</div>
        </div>
      </div>
      <div className={styles.skipHint}>{t("bootScreen.hint")}</div>
    </div>
  )
}
