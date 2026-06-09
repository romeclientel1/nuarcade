import { useState } from 'react'
import styles from './Wizard.module.css'
import WelcomeScreen from './screens/WelcomeScreen'
import SecurityScreen from './screens/SecurityScreen'
import PathsScreen from './screens/PathsScreen'
import ControllersScreen from './screens/ControllersScreen'
import SetupGuideScreen from './screens/SetupGuideScreen'
import ScanScreen from './screens/ScanScreen'
import ReadyScreen from './screens/ReadyScreen'

const SCREENS = [
  'Welcome',
  'Security',
  'Paths',
  'Emulators',
  'Controllers',
  'Game Scan',
  'Ready',
]

export default function Wizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState({
    mode: 'arcade+pinball',
    teknoParrotPath: 'F:\\TeknoParrot\\',
    gamesFolderPath: 'F:\\ArcadeGames\\',
    rpcs3Path: 'F:\\RPCS3\\',
    ps3GamesPath: 'F:\\PS3Games\\',
    xeniaPath: 'F:\\Xenia\\',
    xbox360GamesPath: 'F:\\Xbox360Games\\',
    dolphinPath: 'F:\\Dolphin\\',
    gcWiiGamesPath: 'F:\\GCWiiGames\\',
    pcsx2Path: 'F:\\PCSX2\\',
    ps2GamesPath: 'F:\\PS2Games\\',
    ryujinxPath: 'F:\\Ryujinx\\',
    switchGamesPath: 'F:\\SwitchGames\\',
    pinballPath: 'F:\\vPinball\\',
    tablesPath: 'F:\\PinballTables\\',
    controllers: { wheel: null, lightgun: null, gamepad: null },
    setupComplete: false,
  })

  const updateConfig = (updates) => setConfig(c => ({ ...c, ...updates }))

  const next = () => {
    if (step < SCREENS.length - 1) setStep(s => s + 1)
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

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
      case 2: return <PathsScreen      {...screenProps} />
      case 3: return <SetupGuideScreen {...screenProps} />
      case 4: return <ControllersScreen {...screenProps} />
      case 5: return <ScanScreen       {...screenProps} />
      case 6: return <ReadyScreen      {...screenProps} />
      default: return <WelcomeScreen   {...screenProps} />
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.grid} />

      <div className={styles.header}>
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