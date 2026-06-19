import { useEffect, useRef } from 'react'

const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15, HOME: 16,
}

const STICK_DEADZONE = 0.4

export function useGamepad(handlers) {
  const handlersRef = useRef(handlers)
  const prevBtns = useRef({})
  const rafId = useRef(null)
  const repeatTimers = useRef({})
  const repeatDelay = 400
  const repeatRate = 120

  useEffect(() => { handlersRef.current = handlers }, [handlers])

  useEffect(() => {
    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const gp = gamepads[0]
      if (gp) {
        const h = handlersRef.current
        const check = (btnIdx, handlerKey, repeatable = false) => {
          const pressed = gp.buttons[btnIdx]?.pressed
          const wasPressed = prevBtns.current[btnIdx]
          if (pressed && !wasPressed) {
            h[handlerKey]?.()
            if (repeatable) {
              repeatTimers.current[btnIdx] = setTimeout(() => {
                repeatTimers.current[btnIdx + '_i'] = setInterval(() => { h[handlerKey]?.() }, repeatRate)
              }, repeatDelay)
            }
          }
          if (!pressed && wasPressed) {
            clearTimeout(repeatTimers.current[btnIdx])
            clearInterval(repeatTimers.current[btnIdx + '_i'])
          }
          prevBtns.current[btnIdx] = pressed
        }
        check(BTN.DPAD_UP, 'up', true)
        check(BTN.DPAD_DOWN, 'down', true)
        check(BTN.DPAD_LEFT, 'left', true)
        check(BTN.DPAD_RIGHT, 'right', true)
        check(BTN.A, 'confirm')
        check(BTN.B, 'back')
        check(BTN.X, 'favorite')
        check(BTN.Y, 'detail')
        check(BTN.LB, 'filterLeft')
        check(BTN.RB, 'filterRight')
        check(BTN.RT, 'launch')
        check(BTN.SELECT, 'random')
        check(BTN.START, 'settings')
        const ly = gp.axes[1]
        if (Math.abs(ly) > STICK_DEADZONE) {
          if (!prevBtns.current['sy']) {
            prevBtns.current['sy'] = true
            if (ly < 0) h.up?.()
            if (ly > 0) h.down?.()
            repeatTimers.current['sy'] = setTimeout(() => {
              repeatTimers.current['sy_i'] = setInterval(() => {
                if (ly < 0) h.up?.(); else h.down?.()
              }, repeatRate)
            }, repeatDelay)
          }
        } else if (prevBtns.current['sy']) {
          prevBtns.current['sy'] = false
          clearTimeout(repeatTimers.current['sy'])
          clearInterval(repeatTimers.current['sy_i'])
        }
      }
      rafId.current = requestAnimationFrame(poll)
    }
    rafId.current = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(rafId.current)
      Object.values(repeatTimers.current).forEach(t => { clearTimeout(t); clearInterval(t) })
    }
  }, [])
}
