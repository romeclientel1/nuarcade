import { useState, useEffect } from 'react'
import Intro from './components/Intro/Intro'
import Wheel from './components/Wheel/Wheel'
import './index.css'

export default function App() {
  const [phase, setPhase] = useState('intro') // 'intro' | 'wheel'

  const handleIntroComplete = () => {
    setPhase('wheel')
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && phase === 'intro') {
        setPhase('wheel')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {phase === 'intro' && <Intro onComplete={handleIntroComplete} />}
      {phase === 'wheel' && <Wheel />}
    </div>
  )
}
