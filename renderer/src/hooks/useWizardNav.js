import { useState, useRef } from 'react'

// useWizardNav -- universal EXIT state for all wizard screens
// Each screen manages its own focusIdx but shares this EXIT logic.
//
// Usage in any wizard screen:
//   const { exitConfirm, handleExit } = useWizardNav()
//
// Then in JSX:
//   <button
//     className={wizStyles.exitBtn + (exitConfirm ? ' ' + wizStyles.exitConfirm : '') + (focused ? ' ' + wizStyles.exitFocused : '')}
//     onClick={handleExit}
//   >{exitConfirm ? 'CONFIRM' : 'EXIT'}</button>

export function useWizardNav() {
  const [exitConfirm, setExitConfirm] = useState(false)
  const exitTimer = useRef(null)

  const handleExit = () => {
    if (exitConfirm) {
      clearTimeout(exitTimer.current)
      window.nuarcade?.closeApp?.()
    } else {
      setExitConfirm(true)
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => setExitConfirm(false), 3000)
    }
  }

  return { exitConfirm, handleExit }
}
