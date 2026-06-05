import { useEffect, useRef } from 'react'

export default function AttractMode({ games, onSelect, isActive, onWake }) {
  const timerRef = useRef(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!isActive) return

    timerRef.current = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % games.length
      onSelect(indexRef.current)
    }, 2500)

    return () => clearInterval(timerRef.current)
  }, [isActive, games])

  useEffect(() => {
    const wake = () => { if (isActive) onWake() }
    window.addEventListener('keydown', wake)
    window.addEventListener('click', wake)
    window.addEventListener('mousemove', wake)
    return () => {
      window.removeEventListener('keydown', wake)
      window.removeEventListener('click', wake)
      window.removeEventListener('mousemove', wake)
    }
  }, [isActive, onWake])

  return null
}