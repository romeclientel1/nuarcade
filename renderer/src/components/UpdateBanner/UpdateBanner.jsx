import styles from "./UpdateBanner.module.css"

export default function UpdateBanner({ newVersion, releaseUrl, releaseNotes, onDismiss }) {
  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <div className={styles.badge}>NEW</div>
        <div className={styles.text}>
          <span className={styles.title}>NuArcade {newVersion} is available</span>
          {releaseNotes && <span className={styles.notes}>{releaseNotes}</span>}
        </div>
      </div>
      <div className={styles.right}>
        
          className={styles.downloadBtn}
          href={releaseUrl}
          target="_blank"
          rel="noreferrer"
        >
          Download
        </a>
        <button className={styles.dismissBtn} onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  )
}
