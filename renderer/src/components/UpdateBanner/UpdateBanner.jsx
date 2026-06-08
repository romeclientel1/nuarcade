import styles from "./UpdateBanner.module.css"

export default function UpdateBanner({ newVersion, releaseUrl, onDismiss }) {
  const handleDownload = () => {
    if (window.nuarcade?.platform === "win32") {
      require("electron").shell.openExternal(releaseUrl)
    } else {
      window.open(releaseUrl, "_blank")
    }
  }

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <div className={styles.badge}>NEW</div>
        <div className={styles.text}>
          <span className={styles.title}>NuArcade {newVersion} is available</span>
          <span className={styles.notes}>A new version is ready to download</span>
        </div>
      </div>
      <div className={styles.right}>
        <button className={styles.downloadBtn} onClick={handleDownload}>
          Download
        </button>
        <button className={styles.dismissBtn} onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  )
}
