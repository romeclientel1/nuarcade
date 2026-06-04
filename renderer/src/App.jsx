import { useState, useEffect } from 'react'
import Intro from './components/Intro/Intro'
import Wizard from './components/Wizard/Wizard'
import Wheel from './components/Wheel/Wheel'
import './index.css'

export default function App() {
  const [phase, setPhase] = useState('intro') // 'intro' | 'wizard' | 'wheel'

  useEffect(() => {
    // Check if setup is already complete
    const checkSetup = async () => {
      if (window.nuarcade) {
        const config = await window.nuarcade.getConfig()
        if (config.setupComplete) {
          // Skip wizard on subsequent launches
          return
        }
      }
    }
    checkSetup()
  }, [])

  const handleIntroComplete = async () => {
    // Check if setup wizard needs to run
    if (window.nuarcade && window.nuarcade.platform === 'win32') {
      const config = await window.nuarcade.getConfig()
      if (!config.setupComplete) {
        setPhase('wizard')
        return
      }
    }
    setPhase('wheel')
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && phase === 'intro') setPhase('wheel')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {phase === 'intro'  && <Intro onComplete={handleIntroComplete} />}
      {phase === 'wizard' && <Wizard onComplete={() => setPhase('wheel')} />}
      {phase === 'wheel'  && <Wheel />}
    </div>
  )
}