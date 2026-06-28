import { useEffect, useRef } from 'react'

const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15, HOME: 16,
}

const STICK_DEADZONE = 0.6

// Get the first active gamepad across all slots (not just index 0)
function getActiveGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (let i = 0; i < pads.length; i++) {
    if (pads[i] && pads[i].connected) return pads[i]
  }
  return null
}

export function useGamepad(handlers) {
  const handlersRef  = useRef(handlers)
  const prevBtns     = useRef({})
  const rafId        = useRef(null)
  const repeatTimers = useRef({})
  const repeatDelay  = 400
  const repeatRate   = 120

  useEffect(() => { handlersRef.current = handlers }, [handlers])

  useEffect(() => {
    const poll = () => {
      const gp = getActiveGamepad()
      if (gp) {
        const h = handlersRef.current
        if (!h) { rafId.current = requestAnimationFrame(poll); return }

        const check = (btnIdx, handlerKey, repeatable = false) => {
          const pressed = gp.buttons[btnIdx]?.pressed ?? false
          const wasPressed = prevBtns.current[btnIdx] ?? false

          if (pressed && !wasPressed) {
            h[handlerKey]?.()
            if (repeatable) {
              repeatTimers.current[btnIdx] = setTimeout(() => {
                repeatTimers.current[btnIdx + '_i'] = setInterval(() => {
                  h[handlerKey]?.()
                }, repeatRate)
              }, repeatDelay)
            }
          }
          if (!pressed && wasPressed) {
            clearTimeout(repeatTimers.current[btnIdx])
            clearInterval(repeatTimers.current[btnIdx + '_i'])
          }
          prevBtns.current[btnIdx] = pressed
        }

        // Check left analog stick as well as dpad
        const ax = gp.axes[0] ?? 0
        const ay = gp.axes[1] ?? 0

        // D-pad buttons
        check(BTN.DPAD_UP,    'up',    true)
        check(BTN.DPAD_DOWN,  'down',  true)
        check(BTN.DPAD_LEFT,  'left',  true)
        check(BTN.DPAD_RIGHT, 'right', true)

        // Also check left stick (fire once per threshold cross using prevBtns slots 20-23)
        const stickUp    = ay < -STICK_DEADZONE
        const stickDown  = ay >  STICK_DEADZONE
        const stickLeft  = ax < -STICK_DEADZONE
        const stickRight = ax >  STICK_DEADZONE

        if (stickUp    && !prevBtns.current[20]) { h['up']?.();    prevBtns.current[20] = true  }
        if (!stickUp)                             { prevBtns.current[20] = false }
        if (stickDown  && !prevBtns.current[21]) { h['down']?.();  prevBtns.current[21] = true  }
        if (!stickDown)                           { prevBtns.current[21] = false }
        if (stickLeft  && !prevBtns.current[22]) { h['left']?.();  prevBtns.current[22] = true  }
        if (!stickLeft)                           { prevBtns.current[22] = false }
        if (stickRight && !prevBtns.current[23]) { h['right']?.(); prevBtns.current[23] = true  }
        if (!stickRight)                          { prevBtns.current[23] = false }

        // Buttons
        check(BTN.A,      'confirm')
        check(BTN.B,      'back')
        check(BTN.X,      'favorite')
        check(BTN.Y,      'detail')
        check(BTN.LB,     'filterLeft',  true)
        check(BTN.RB,     'filterRight', true)
        check(BTN.RT,     'launch')
        check(BTN.SELECT, 'random')
        check(BTN.START,  'settings')
      }

      rafId.current = requestAnimationFrame(poll)
    }

    // Start polling immediately
    rafId.current = requestAnimationFrame(poll)

    // Also restart poll on gamepadconnected in case pad wasn't visible at mount
    const onConnect = () => {
      cancelAnimationFrame(rafId.current)
      prevBtns.current = {}
      rafId.current = requestAnimationFrame(poll)
    }
    window.addEventListener('gamepadconnected', onConnect)

    return () => {
      cancelAnimationFrame(rafId.current)
      window.removeEventListener('gamepadconnected', onConnect)
      Object.values(repeatTimers.current).forEach(t => { clearTimeout(t); clearInterval(t) })
    }
  }, [])
}
