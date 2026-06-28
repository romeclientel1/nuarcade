import { useEffect, useRef } from 'react'

const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
}

const REPEAT_DELAY = 400  // ms before repeat starts
const REPEAT_RATE  = 120  // ms between repeats

function getActiveGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (let i = 0; i < pads.length; i++) {
    if (pads[i] && pads[i].connected) return pads[i]
  }
  return null
}

export function useGamepad(handlers) {
  const handlersRef = useRef(handlers)
  const stateRef    = useRef({})  // { [btnIdx]: { pressed, firstAt, lastRepeatAt } }
  const rafRef      = useRef(null)

  // Always keep handlers current without restarting the RAF
  useEffect(() => { handlersRef.current = handlers }, [handlers])

  useEffect(() => {
    const poll = () => {
      const h  = handlersRef.current || {}
      const now = Date.now()

      // Check enabled flag
      if (h.enabled === false) {
        rafRef.current = requestAnimationFrame(poll)
        return
      }

      const gp = getActiveGamepad()
      if (gp) {
        const fire = (key) => { if (h[key]) h[key]() }

        const check = (btnIdx, key, repeatable = false) => {
          const pressed = gp.buttons[btnIdx]?.pressed ?? false
          const prev    = stateRef.current[btnIdx] || { pressed: false, firstAt: 0, lastRepeatAt: 0 }

          if (pressed && !prev.pressed) {
            // Fresh press
            fire(key)
            stateRef.current[btnIdx] = { pressed: true, firstAt: now, lastRepeatAt: now }
          } else if (pressed && prev.pressed && repeatable) {
            // Hold repeat
            if (now - prev.firstAt > REPEAT_DELAY && now - prev.lastRepeatAt > REPEAT_RATE) {
              fire(key)
              stateRef.current[btnIdx] = { ...prev, lastRepeatAt: now }
            }
          } else if (!pressed && prev.pressed) {
            // Release
            stateRef.current[btnIdx] = { pressed: false, firstAt: 0, lastRepeatAt: 0 }
          }
        }

        // D-pad
        check(BTN.DPAD_LEFT,  'left',  true)
        check(BTN.DPAD_RIGHT, 'right', true)
        check(BTN.DPAD_UP,    'up',    true)
        check(BTN.DPAD_DOWN,  'down',  true)

        // Left analog stick (also fires nav)
        const ax = gp.axes[0] ?? 0
        const ay = gp.axes[1] ?? 0
        const DEAD = 0.5
        check({ pressed: ax < -DEAD, value: Math.abs(ax) }, 'left',  true)
        check({ pressed: ax >  DEAD, value: ax },           'right', true)
        check({ pressed: ay < -DEAD, value: Math.abs(ay) }, 'up',    true)
        check({ pressed: ay >  DEAD, value: ay },           'down',  true)

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

      rafRef.current = requestAnimationFrame(poll)
    }

    rafRef.current = requestAnimationFrame(poll)

    // Restart on new gamepad connection
    const onConnect = () => {
      stateRef.current = {}
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(poll)
    }
    window.addEventListener('gamepadconnected', onConnect)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('gamepadconnected', onConnect)
    }
  }, [])
}
