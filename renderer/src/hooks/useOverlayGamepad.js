import { useEffect, useRef } from "react"
import { isGamepadNeutral } from "./gamepadNeutral.js"

export function createOverlayGamepadInputGate() {
  let primed = false
  let lastInput = 0
  let waitingForNeutral = false

  return {
    suppress(now) {
      primed = false
      lastInput = now
      waitingForNeutral = true
    },

    process(gamepad, handlers, now) {
      if (waitingForNeutral) {
        if (isGamepadNeutral(gamepad)) {
          waitingForNeutral = false
          primed = true
          lastInput = 0
        }
        return
      }

      if (!gamepad) return

      if (!primed) {
        primed = true
        lastInput = now
        return
      }

      if (now - lastInput <= 180) return

      if      (gamepad.buttons[1]?.pressed)                                                    { lastInput = now; handlers.onClose?.() }
      else if (gamepad.buttons[0]?.pressed)                                                    { lastInput = now; handlers.onConfirm?.() }
      else if (gamepad.axes[1] < -0.5 || gamepad.buttons[12]?.pressed)                         { lastInput = now; handlers.onUp?.() }
      else if (gamepad.axes[1] >  0.5 || gamepad.buttons[13]?.pressed)                         { lastInput = now; handlers.onDown?.() }
      else if (gamepad.axes[0] < -0.5 || gamepad.buttons[14]?.pressed || gamepad.buttons[4]?.pressed) { lastInput = now; handlers.onLeft?.() }
      else if (gamepad.axes[0] >  0.5 || gamepad.buttons[15]?.pressed || gamepad.buttons[5]?.pressed) { lastInput = now; handlers.onRight?.() }
    },

    snapshot() {
      return { primed, lastInput, waitingForNeutral }
    },
  }
}

// Lightweight gamepad hook for overlay panels
// B=close, A=confirm, D-pad up/down=scroll, left/right=tab switch
// Primed ref prevents the button that OPENED the overlay from instantly firing a handler
export function useOverlayGamepad({ onClose, onUp, onDown, onLeft, onRight, onConfirm, enabled = true }) {
  const handlersRef = useRef({})
  const enabledRef  = useRef(enabled)
  const inputGateRef = useRef(null)
  if (!inputGateRef.current) inputGateRef.current = createOverlayGamepadInputGate()

  // Keep refs current every render -- stable RAF loop reads from here
  handlersRef.current = { onClose, onUp, onDown, onLeft, onRight, onConfirm }
  enabledRef.current  = enabled

  useEffect(() => {
    let animFrame

    const poll = () => {
      const now = Date.now()
      const departDialogActive =
        typeof document !== "undefined" &&
        document.querySelector('[data-vespara-depart-dialog="true"]')
      if (enabledRef.current && !departDialogActive) {
        const gp = navigator.getGamepads()[0]
        inputGateRef.current.process(gp, handlersRef.current, now)
      } else {
        // Depart and ordinary disabled transitions both require a full
        // neutral controller frame before this overlay can receive input.
        inputGateRef.current.suppress(now)
      }
      animFrame = requestAnimationFrame(poll)
    }

    animFrame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(animFrame)
  }, []) // stable loop -- handlers always read from ref
}
