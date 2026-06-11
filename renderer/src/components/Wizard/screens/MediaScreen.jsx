import { useState } from 'react'
import styles from './Screen.module.css'

export default function MediaScreen({ config, updateConfig, next, prev }) {
  const [ssUser, setSsUser]     = useState(config.screenscraper?.user || '')
  const [ssPass, setSsPass]     = useState(config.screenscraper?.pass || '')
  const [sgdbKey, setSgdbKey]   = useState(config.sgdbKey || '')
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showSgdb, setShowSgdb] = useState(false)

  const save = () => {
    updateConfig({ screenscraper: { user: ssUser, pass: ssPass }, sgdbKey })
  }

  const testLogin = async () => {
    if (!ssUser || !ssPass) {
      setTestResult({ ok: false, msg: 'Enter username and password first.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const url = `https://www.screenscraper.fr/api2/ssuserInfos.php?devid=nuarcade&devpassword=nuarcade123&softname=nuarcade&output=json&ssid=${encodeURIComponent(ssUser)}&sspassword=${encodeURIComponent(ssPass)}`
      const res  = await fetch(url)
      const text = await res.text()
      if (text.includes('"ssid"') || text.includes('maxthreads')) {
        setTestResult({ ok: true, msg: 'Login successful! Credentials saved.' })
        updateConfig({ screenscraper: { user: ssUser, pass: ssPass }, sgdbKey })
      } else if (text.includes('ACCES')) {
        setTestResult({ ok: false, msg: 'Wrong username or password.' })
      } else {
        setTestResult({ ok: true, msg: 'Connected -- credentials saved.' })
        updateConfig({ screenscraper: { user: ssUser, pass: ssPass }, sgdbKey })
      }
    } catch {
      setTestResult({ ok: false, msg: 'Could not reach ScreenScraper. Check your connection.' })
    }
    setTesting(false)
  }

  const handleContinue = () => {
    updateConfig({ screenscraper: { user: ssUser, pass: ssPass }, sgdbKey })
    next()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 7 -- Media Setup</div>
      <div className={styles.title}>Set up artwork and video previews.</div>
      <div className={styles.sub}>
        SteamGridDB works out of the box for box art and logos. Add a ScreenScraper account to unlock video previews and deeper retro game coverage.
      </div>

      <div className={styles.mediaPanel}>

        <div className={styles.mediaBlock}>
          <div className={styles.mediaBlockHeader}>
            <div className={styles.mediaBlockTitle}>ScreenScraper</div>
            <div className={styles.mediaBlockBadge}>Videos + Retro Art</div>
          </div>
          <div className={styles.mediaBlockSub}>
            Box art, screenshots, and video previews for MAME, PS1, PS2, PS3 and more. Free account at screenscraper.fr.
          </div>

          <div className={styles.mediaFields}>
            <div className={styles.mediaField}>
              <label className={styles.mediaLabel}>Username</label>
              <input
                className={styles.mediaInput}
                value={ssUser}
                onChange={e => { setSsUser(e.target.value); setTestResult(null) }}
                placeholder="Your screenscraper.fr username"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className={styles.mediaField}>
              <label className={styles.mediaLabel}>Password</label>
              <input
                className={styles.mediaInput}
                type="password"
                value={ssPass}
                onChange={e => { setSsPass(e.target.value); setTestResult(null) }}
                placeholder="Your screenscraper.fr password"
                autoComplete="off"
              />
            </div>
          </div>

          <div className={styles.mediaActions}>
            <button
              className={styles.mediaBtn}
              onClick={() => window.open('https://www.screenscraper.fr/index.php?p=newAccount', '_blank')}
            >
              Create Free Account
            </button>
            <button
              className={styles.mediaBtnPrimary}
              onClick={testLogin}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Login'}
            </button>
          </div>

          {testResult && (
            <div className={styles.mediaResult} style={{ color: testResult.ok ? '#00ff88' : '#ef4444' }}>
              {testResult.ok ? 'OK' : 'X'} {testResult.msg}
            </div>
          )}
        </div>

        <div className={styles.mediaDivider} />

        <div className={styles.mediaBlock}>
          <div className={styles.mediaBlockHeader}>
            <div className={styles.mediaBlockTitle}>SteamGridDB</div>
            <div className={styles.mediaBlockBadge} style={{ background: 'rgba(0,200,255,0.15)', color: '#00c8ff', borderColor: 'rgba(0,200,255,0.3)' }}>
              No account needed
            </div>
          </div>
          <div className={styles.mediaBlockSub}>
            Box art, hero banners, and logos for arcade and modern games. Works automatically with no setup required.
          </div>

          <button
            className={styles.mediaToggle}
            onClick={() => setShowSgdb(s => !s)}
          >
            {showSgdb ? 'v' : '>'} I have my own SteamGridDB API key
          </button>

          {showSgdb && (
            <div className={styles.mediaField} style={{ marginTop: 10 }}>
              <label className={styles.mediaLabel}>API Key (optional)</label>
              <input
                className={styles.mediaInput}
                value={sgdbKey}
                onChange={e => setSgdbKey(e.target.value)}
                placeholder="Leave blank to use built-in key"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          )}
        </div>

      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnSkip} onClick={handleContinue}>Skip for now</button>
        <button className={styles.btnNext} onClick={handleContinue}>Save and Continue -></button>
      </div>
    </div>
  )
}
