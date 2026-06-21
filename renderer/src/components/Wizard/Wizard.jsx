import { useState } from 'react'
import { useGamepad } from '../../hooks/useGamepad'
import styles from './Wizard.module.css'
import WelcomeScreen from './screens/WelcomeScreen'
import SecurityScreen from './screens/SecurityScreen'
import PathsScreen from './screens/PathsScreen'
import ControllersScreen from './screens/ControllersScreen'
import SetupGuideScreen from './screens/SetupGuideScreen'
import ScanScreen from './screens/ScanScreen'
import MediaScreen from './screens/MediaScreen'
import ReadyScreen from './screens/ReadyScreen'

const SCREENS = [
  'Welcome',
  'Security',
  'Emulators',
  'Paths',
  'Controllers',
  'Game Scan',
  'Media',
  'Ready',
]

export default function Wizard({ onComplete }) {
  const [step,        setStep       ] = useState(0)
  const [exitConfirm, setExitConfirm] = useState(false)
  const exitTimer = useRef(null)
  // Xbox controller: A=Next, B=Back in wizard

  const [config, setConfig] = useState({
    mode: 'arcade+pinball',
    teknoParrotPath: 'C:\\TeknoParrot\\',
    gamesFolderPath: 'C:\\ArcadeGames\\',
    rpcs3Path: 'C:\\RPCS3\\',
    ps3GamesPath: 'C:\\PS3Games\\',
    xeniaPath: 'C:\\Xenia\\',
    xbox360GamesPath: 'C:\\Xbox360Games\\',
    dolphinPath: 'C:\\Dolphin\\',
    gcWiiGamesPath: 'C:\\GCWiiGames\\',
    pcsx2Path: 'C:\\PCSX2\\',
    ps2GamesPath: 'C:\\PS2Games\\',
    ryujinxPath: 'C:\\Ryujinx\\',
    switchGamesPath: 'C:\\SwitchGames\\',
    pinballPath: 'C:\\vPinball\\',
    tablesPath: 'C:\\PinballTables\\',
    controllers: { wheel: null, lightgun: null, gamepad: null },
    ssUser: '',
    ssPass: '',
    sgdbKey: '',
    setupComplete: false,
  })

  const updateConfig = (updates) => setConfig(c => ({ ...c, ...updates }))

  const next = () => {
    if (step < SCREENS.length - 1) setStep(s => s + 1)
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

const handleExit = () => {
    if (exitConfirm) {
      window.nuarcade?.closeApp?.()
    } else {
      setExitConfirm(true)
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => setExitConfirm(false), 3000)
    }
  }

  useGamepad({
    confirm: next,
    back:    prev,
    right:   next,
    left:    prev,
    up:      prev,
    down:    next,
    select:  handleExit,
  })


  const finish = async () => {
    const finalConfig = { ...config, setupComplete: true }
    try {
      if (window.nuarcade?.setConfig) {
        await window.nuarcade.setConfig(finalConfig)
      }
    } catch (e) {
      console.warn('setConfig failed:', e)
    }
    onComplete()
  }

  const screenProps = { config, updateConfig, next, prev, finish, step }

  const renderScreen = () => {
    switch (step) {
      case 0: return <WelcomeScreen    {...screenProps} />
      case 1: return <SecurityScreen   {...screenProps} />
      case 2: return <SetupGuideScreen {...screenProps} />
      case 3: return <PathsScreen      {...screenProps} />
      case 4: return <ControllersScreen {...screenProps} />
      case 5: return <ScanScreen       {...screenProps} />
      case 6: return <MediaScreen      {...screenProps} />
      case 7: return <ReadyScreen      {...screenProps} />
      default: return <WelcomeScreen   {...screenProps} />
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.grid} />

      <div className={styles.header}>
          <button
            className={styles.exitBtn + (exitConfirm ? ' ' + styles.exitConfirm : '')}
            onClick={handleExit}
            title="Exit NuArcade"
          >
            {exitConfirm ? 'CONFIRM' : 'EXIT'}
          </button>
        <div className={styles.logo}>
          <span className={styles.logoNu}>Nu</span>
          <span className={styles.logoArcade}>Arcade</span>
        </div>
        <div className={styles.stepTrack}>
          {SCREENS.map((s, i) => (
            <div key={s} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${i < step ? styles.dotDone : i === step ? styles.dotActive : styles.dotWait}`}>
                {i < step ? 'v' : i + 1}
              </div>
              {i < SCREENS.length - 1 && (
                <div className={`${styles.stepLine} ${i < step ? styles.lineDone : ''}`} />
              )}
            </div>
          ))}
        </div>
        <div className={styles.stepLabel}>Step {step + 1} of {SCREENS.length}</div>
      </div>

      <div className={styles.body}>
        {renderScreen()}
      </div>
    </div>
  )
}
