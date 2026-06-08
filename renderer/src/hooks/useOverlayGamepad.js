import { useEffect, useRef } from "react"

// Lightweight gamepad hook for overlay panels
// B button = close, D-pad up/down = scroll, LB/RB = tab/section switch
export function useOverlayGamepad({ onClose, onUp, onDown, onLeft, onRight, onConfirm, enabled = true }) {
  const lastInput = useRef(0)
  const DEADZONE    = 0.5
  const REPEAT_DELAY = 180

  useEffect(() => {
    if (!enabled) return
    let animFrame

    const poll = () => {
      const gp = navigator.getGamepads()[0]
      if (gp) {
        const now = Date.now()
        const canRepeat = now - lastInput.current > REPEAT_DELAY

        if (canRepeat) {
          // B button -- close overlay
          if (gp.buttons[1]?.pressed) {
            lastInput.current = now; onClose?.()
          }
          // A button -- confirm
          else if (gp.buttons[0]?.pressed) {
            lastInput.current = now; onConfirm?.()
          }
          // D-pad / left stick up
          else if (gp.axes[1] < -DEADZONE || gp.buttons[12]?.pressed) {
            lastInput.current = now; onUp?.()
          }
          // D-pad / left stick down
          else if (gp.axes[1] > DEADZONE || gp.buttons[13]?.pressed) {
            lastInput.current = now; onDown?.()
          }
          // D-pad left / LB
          else if (gp.axes[0] < -DEADZONE || gp.buttons[14]?.pressed || gp.buttons[4]?.pressed) {
            lastInput.current = now; onLeft?.()
          }
          // D-pad right / RB
          else if (gp.axes[0] > DEADZONE || gp.buttons[15]?.pressed || gp.buttons[5]?.pressed) {
            lastInput.current = now; onRight?.()
          }
        }
      }
      animFrame = requestAnimationFrame(poll)
    }

    animFrame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(animFrame)
  }, [enabled, onClose, onUp, onDown, onLeft, onRight, onConfirm])
}
