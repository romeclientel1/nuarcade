import { useEffect, useLayoutEffect, useRef } from 'react'

const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
}

const REPEAT_DELAY = 400
const REPEAT_RATE  = 120
const STICK_DEAD   = 0.5

function getActiveGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (let i = 0; i < pads.length; i++) {
    if (pads[i] && pads[i].connected) return pads[i]
  }
  return null
}

export function useGamepad(handlers) {
  const handlersRef = useRef(handlers)
  const btnState    = useRef({})  // { [key]: { pressed, firstAt, lastRepeatAt } }
  const rafRef      = useRef(null)
  const primedRef   = useRef(false)  // first poll after mount seeds held-button state instead of firing

  // Sync handlers ref on every render -- no dependency array so RAF loop never restarts
  useLayoutEffect(() => { handlersRef.current = handlers })

  useEffect(() => {
    primedRef.current = false
    const poll = () => {
      const h   = handlersRef.current || {}
      const now = Date.now()

      if (h.enabled === false) {
        rafRef.current = requestAnimationFrame(poll)
        return
      }

      const gp = getActiveGamepad()
      if (gp) {
        // Timestamp-based press/repeat -- no timers, no leak
        const fire = (key, pressed, stateKey) => {
          const prev = btnState.current[stateKey] || { pressed: false, firstAt: 0, lastRepeatAt: 0 }
          const handler = h[key]

          if (!primedRef.current) {
            // Priming pass: record current physical state without firing handlers.
            // Prevents a button already held when this instance becomes active
            // (e.g. the same A press that opened a popup) from instantly firing again.
            btnState.current[stateKey] = pressed
              ? { pressed: true, firstAt: now, lastRepeatAt: now }
              : { pressed: false, firstAt: 0, lastRepeatAt: 0 }
            return
          }

          if (pressed && !prev.pressed) {
            // Fresh press
            if (handler) handler()
            btnState.current[stateKey] = { pressed: true, firstAt: now, lastRepeatAt: now }
          } else if (pressed && prev.pressed) {
            // Hold -- repeat after delay
            if (now - prev.firstAt > REPEAT_DELAY && now - prev.lastRepeatAt > REPEAT_RATE) {
              if (handler) handler()
              btnState.current[stateKey] = { ...prev, lastRepeatAt: now }
            }
          } else if (!pressed && prev.pressed) {
            // Release
            btnState.current[stateKey] = { pressed: false, firstAt: 0, lastRepeatAt: 0 }
          }
        }

        // D-pad buttons
        fire('left',  gp.buttons[BTN.DPAD_LEFT ]?.pressed ?? false, 'dpad_left')
        fire('right', gp.buttons[BTN.DPAD_RIGHT]?.pressed ?? false, 'dpad_right')
        fire('up',    gp.buttons[BTN.DPAD_UP   ]?.pressed ?? false, 'dpad_up')
        fire('down',  gp.buttons[BTN.DPAD_DOWN ]?.pressed ?? false, 'dpad_down')

        // Left analog stick -- separate state keys so dpad and stick don't conflict
        const ax = gp.axes[0] ?? 0
        const ay = gp.axes[1] ?? 0
        fire('left',  ax < -STICK_DEAD, 'stick_left')
        fire('right', ax >  STICK_DEAD, 'stick_right')
        fire('up',    ay < -STICK_DEAD, 'stick_up')
        fire('down',  ay >  STICK_DEAD, 'stick_down')

        // Face buttons -- no repeat
        fire('confirm',     gp.buttons[BTN.A     ]?.pressed ?? false, 'btn_a')
        fire('back',        gp.buttons[BTN.B     ]?.pressed ?? false, 'btn_b')
        fire('favorite',    gp.buttons[BTN.X     ]?.pressed ?? false, 'btn_x')
        fire('detail',      gp.buttons[BTN.Y     ]?.pressed ?? false, 'btn_y')
        fire('filterLeft',  gp.buttons[BTN.LB    ]?.pressed ?? false, 'btn_lb')
        fire('filterRight', gp.buttons[BTN.RB    ]?.pressed ?? false, 'btn_rb')
        fire('launch',      gp.buttons[BTN.RT    ]?.pressed ?? false, 'btn_rt')
        fire('random',      gp.buttons[BTN.SELECT]?.pressed ?? false, 'btn_sel')
        fire('settings',    gp.buttons[BTN.START ]?.pressed ?? false, 'btn_sta')
      }
      primedRef.current = true

      rafRef.current = requestAnimationFrame(poll)
    }

    rafRef.current = requestAnimationFrame(poll)

    const onConnect = () => {
      btnState.current = {}
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
