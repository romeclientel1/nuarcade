import { useRef, useCallback } from "react"

export function useNavSound(volume = 0.3) {
  const ctx = useRef(null)

  const playClick = useCallback(() => {
    try {
      if (!ctx.current) ctx.current = new AudioContext()
      const osc = ctx.current.createOscillator()
      const gain = ctx.current.createGain()
      osc.connect(gain)
      gain.connect(ctx.current.destination)
      osc.frequency.setValueAtTime(800, ctx.current.currentTime)
      osc.frequency.exponentialRampToValueAtTime(400, ctx.current.currentTime + 0.05)
      gain.gain.setValueAtTime(volume, ctx.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.current.currentTime + 0.08)
      osc.start(ctx.current.currentTime)
      osc.stop(ctx.current.currentTime + 0.08)
    } catch (e) {}
  }, [volume])

  const playSelect = useCallback(() => {
    try {
      if (!ctx.current) ctx.current = new AudioContext()
      const osc = ctx.current.createOscillator()
      const gain = ctx.current.createGain()
      osc.connect(gain)
      gain.connect(ctx.current.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(600, ctx.current.currentTime)
      osc.frequency.exponentialRampToValueAtTime(900, ctx.current.currentTime + 0.1)
      gain.gain.setValueAtTime(volume * 0.8, ctx.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.current.currentTime + 0.15)
      osc.start(ctx.current.currentTime)
      osc.stop(ctx.current.currentTime + 0.15)
    } catch (e) {}
  }, [volume])

  return { playClick, playSelect }
}
