import { useEffect, useRef } from "react"

// Lightweight gamepad hook for overlay panels
// B=close, A=confirm, D-pad up/down=scroll, left/right=tab switch
export function useOverlayGamepad({ onClose, onUp, onDown, onLeft, onRight, onConfirm, enabled = true }) {
  const lastInput   = useRef(0)
  const handlersRef = useRef({})
  const enabledRef  = useRef(enabled)

  // Keep refs current every render -- no dep array needed on the RAF loop
  handlersRef.current = { onClose, onUp, onDown, onLeft, onRight, onConfirm }
  enabledRef.current  = enabled

  const DEADZONE     = 0.5
  const REPEAT_DELAY = 180

  useEffect(() => {
    let animFrame

    const poll = () => {
      if (enabledRef.current) {
        const gp = navigator.getGamepads()[0]
        const h  = handlersRef.current
        if (gp) {
          const now       = Date.now()
          const canRepeat = now - lastInput.current > REPEAT_DELAY
          if (canRepeat) {
            if      (gp.buttons[1]?.pressed)                                                       { lastInput.current = now; h.onClose?.() }
            else if (gp.buttons[0]?.pressed)                                                       { lastInput.current = now; h.onConfirm?.() }
            else if (gp.axes[1] < -DEADZONE || gp.buttons[12]?.pressed)                           { lastInput.current = now; h.onUp?.() }
            else if (gp.axes[1] >  DEADZONE || gp.buttons[13]?.pressed)                           { lastInput.current = now; h.onDown?.() }
            else if (gp.axes[0] < -DEADZONE || gp.buttons[14]?.pressed || gp.buttons[4]?.pressed) { lastInput.current = now; h.onLeft?.() }
            else if (gp.axes[0] >  DEADZONE || gp.buttons[15]?.pressed || gp.buttons[5]?.pressed) { lastInput.current = now; h.onRight?.() }
          }
        }
      }
      animFrame = requestAnimationFrame(poll)
    }

    animFrame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(animFrame)
  }, []) // stable loop -- handlers always read from ref
}
