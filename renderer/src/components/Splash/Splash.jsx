import styles from "./Splash.module.css"

export default function Splash({ message = "Scanning game library..." }) {
  return (
    <div className={styles.stage}>
      <div className={styles.grid} />
      <div className={styles.vignette} />
      <div className={styles.content}>
        <div className={styles.logo}>
          <span className={styles.logoNu}>Nu</span>
          <span className={styles.logoArcade}>Arcade</span>
        </div>
        <div className={styles.barWrap}>
          <div className={styles.bar} />
        </div>
        <div className={styles.message}>{message}</div>
        <div className={styles.dots}>
          <div className={styles.dot} style={{animationDelay: "0s"}} />
          <div className={styles.dot} style={{animationDelay: "0.2s"}} />
          <div className={styles.dot} style={{animationDelay: "0.4s"}} />
        </div>
      </div>
    </div>
  )
}
