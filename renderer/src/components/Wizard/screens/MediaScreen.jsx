import styles from './Screen.module.css'

const OPTIONS = [
  {
    key: 'steamgriddb',
    label: 'A',
    title: 'Vespara Built-In',
    source: 'SteamGridDB',
    lines: [
      'Downloads hero artwork for your games automatically.',
      'No account needed -- works right now, no setup required.',
      'Art appears on your game cards immediately after fetching.',
      'Run anytime from Settings > Media > Fetch Art.',
    ],
    note: null,
  },
  {
    key: 'emumovies',
    label: 'B',
    title: 'EmuMovies Sync',
    source: 'emumovies.com',
    lines: [
      'Full media packs -- box art, video snaps, marquees, wheel art.',
      'Requires a free EmuMovies account and their Sync desktop app.',
    ],
    note: 'Free account: 250MB/day limit, artwork only -- no videos. Paid account: unlimited downloads including video snaps.',
  },
]

export default function MediaScreen({ next, prev }) {
  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 6 -- Media</div>
      <div className={styles.title}>Get artwork for your games.</div>
      <div className={styles.sub}>
        You don't need to do this now. Both options are available
        anytime from Settings -- come back once your games are added.
      </div>

      <div className={styles.mediaGrid}>
        {OPTIONS.map(o => (
          <div key={o.key} className={styles.mediaCard}>
            <div className={styles.mediaCardLabel}>{o.label}</div>
            <div className={styles.mediaCardTitle}>{o.title}</div>
            <div className={styles.mediaCardSource}>{o.source}</div>
            <ul className={styles.mediaCardList}>
              {o.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
            {o.note && (
              <div className={styles.mediaCardNote}>{o.note}</div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next}>Continue</button>
      </div>
    </div>
  )
}
