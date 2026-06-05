import { useEffect, useRef } from 'react'

export function useGamepad({ onLeft, onRight, onConfirm, onBack, onFavorite, enabled = true }) {
  const lastInput = useRef(0)
  const DEADZONE = 0.5
  const REPEAT_DELAY = 200

  useEffect(() => {
    if (!enabled) return

    let animFrame

    const poll = () => {
      const gamepads = navigator.getGamepads()
      const gp = gamepads[0]

      if (gp) {
        const now = Date.now()
        const canRepeat = now - lastInput.current > REPEAT_DELAY

        if (canRepeat) {
          // Left stick or D-pad left
          if (gp.axes[0] < -DEADZONE || gp.buttons[14]?.pressed) {
            lastInput.current = now
            onLeft?.()
          }
          // Left stick or D-pad right
          else if (gp.axes[0] > DEADZONE || gp.buttons[15]?.pressed) {
            lastInput.current = now
            onRight?.()
          }
          // A button — confirm/launch
          else if (gp.buttons[0]?.pressed) {
            lastInput.current = now
            onConfirm?.()
          }
          // B button — back
          else if (gp.buttons[1]?.pressed) {
            lastInput.current = now
            onBack?.()
          }
          // Y button — favorite
          else if (gp.buttons[3]?.pressed) {
            lastInput.current = now
            onFavorite?.()
          }
        }
      }

      animFrame = requestAnimationFrame(poll)
    }

    animFrame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(animFrame)
  }, [enabled, onLeft, onRight, onConfirm, onBack, onFavorite])
}