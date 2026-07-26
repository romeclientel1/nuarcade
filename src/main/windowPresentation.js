// windowPresentation.js ------------------------------------------------------
// A small, explicit presentation contract for the single main BrowserWindow.
// Pure functions operating on a window-like object and an Electron `app`-like
// object -- no direct `require('electron')` here, so this module (and its
// behavior around minimized/hidden/destroyed windows, fullscreen intent, and
// the bounded Windows foreground-assist pulse) is testable with plain fake
// objects, without a real Electron runtime.

// Presents `win` according to `options`:
//   reason           - string, used only for logging ("startup",
//                       "auto-launch", "auto-launch-fallback", "second-instance")
//   fullscreen       - boolean|undefined. When a boolean, fullscreen state is
//                       applied only if it differs from the window's current
//                       state. When omitted, the window's current fullscreen
//                       state is left untouched (used for second-instance
//                       presentation, so a mid-game windowed state is never
//                       forced back to fullscreen).
//   foregroundAssist - boolean. When true AND platform is win32, a bounded
//                       temporary always-on-top pulse is used to overcome
//                       Windows' SetForegroundWindow restriction for
//                       processes launched without recent user input (e.g.
//                       at login). Always disabled again before returning,
//                       even if show()/focus() throw.
//   platform         - optional override of process.platform (testability).
//   log              - optional (message: string) => void.
//
// Returns true if presentation was attempted, false if the window was
// null/destroyed (safe no-op).
function presentWindow(win, options) {
  options = options || {}
  const reason = options.reason || 'manual'
  const log = options.log || function () {}
  const platform = options.platform || process.platform
  const hasFullscreenIntent = typeof options.fullscreen === 'boolean'
  const foregroundAssist = options.foregroundAssist === true && platform === 'win32'

  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    log('presentWindow: skipped, no live window (' + reason + ')')
    return false
  }

  if (win.isMinimized && win.isMinimized()) {
    win.restore()
    log('presentWindow: restored minimized window (' + reason + ')')
  }

  if (hasFullscreenIntent && (!win.isFullScreen || win.isFullScreen() !== options.fullscreen)) {
    win.setFullScreen(options.fullscreen)
    log('presentWindow: fullscreen set to ' + options.fullscreen + ' (' + reason + ')')
  }

  if (foregroundAssist) {
    try {
      win.setAlwaysOnTop(true)
      log('presentWindow: Windows foreground assist enabled (' + reason + ')')
      if (!win.isVisible || !win.isVisible()) win.show()
      win.focus()
    } finally {
      try { win.setAlwaysOnTop(false) } catch (e) { /* window may already be gone */ }
      log('presentWindow: Windows foreground assist disabled (' + reason + ')')
    }
    return true
  }

  if (!win.isVisible || !win.isVisible()) win.show()
  if (!win.isFocused || !win.isFocused()) win.focus()
  log('presentWindow: presented (' + reason + ')')
  return true
}

// Detects whether the current launch is a login/startup auto-launch rather
// than a manual double-click, using the strongest signal Electron exposes
// (`getLoginItemSettings().wasOpenedAtLogin`), falling back to existing CLI
// startup flags if present. Adds no new registry or startup mechanism --
// safely returns false when neither signal is available.
function detectAutoLaunch(app, argv) {
  try {
    if (app && typeof app.getLoginItemSettings === 'function') {
      const settings = app.getLoginItemSettings()
      if (settings && settings.wasOpenedAtLogin) return true
    }
  } catch (e) {
    // Unsupported on this platform/build -- fall through to the argv check.
  }
  const args = argv || []
  return args.indexOf('--startup') !== -1 || args.indexOf('--autostart') !== -1
}

module.exports = { presentWindow, detectAutoLaunch }
