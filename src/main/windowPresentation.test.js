// windowPresentation.test.js -------------------------------------------------
// Focused, dependency-free tests for the presentation contract used by
// src/main/index.js's startup, auto-launch, and second-instance paths.
// Uses plain fake window objects (no real Electron BrowserWindow) so these
// run instantly under `node --test` with no timers involved.

const { test } = require("node:test")
const assert = require("node:assert/strict")

const { presentWindow, detectAutoLaunch } = require("./windowPresentation.js")

function fakeWindow(overrides) {
  const calls = []
  const state = Object.assign({
    destroyed: false,
    minimized: false,
    visible: false,
    focused: false,
    fullscreen: false,
    alwaysOnTop: false,
  }, overrides)

  return {
    calls,
    state,
    isDestroyed: () => state.destroyed,
    isMinimized: () => state.minimized,
    isVisible: () => state.visible,
    isFocused: () => state.focused,
    isFullScreen: () => state.fullscreen,
    restore: () => { calls.push("restore"); state.minimized = false },
    show: () => { calls.push("show"); state.visible = true },
    focus: () => { calls.push("focus"); state.focused = true },
    setFullScreen: (v) => { calls.push("setFullScreen:" + v); state.fullscreen = v },
    setAlwaysOnTop: (v) => { calls.push("setAlwaysOnTop:" + v); state.alwaysOnTop = v },
  }
}

test("null window is a safe no-op", () => {
  assert.equal(presentWindow(null, { reason: "startup" }), false)
})

test("destroyed window is a safe no-op", () => {
  const win = fakeWindow({ destroyed: true })
  assert.equal(presentWindow(win, { reason: "startup" }), false)
  assert.deepEqual(win.calls, [])
})

test("minimized window is restored before being shown/focused", () => {
  const win = fakeWindow({ minimized: true })
  presentWindow(win, { reason: "startup" })
  assert.deepEqual(win.calls, ["restore", "show", "focus"])
})

test("hidden window is shown; already-visible window is not re-shown", () => {
  const hidden = fakeWindow({ visible: false })
  presentWindow(hidden, { reason: "startup" })
  assert.ok(hidden.calls.includes("show"))

  const visible = fakeWindow({ visible: true, focused: false })
  presentWindow(visible, { reason: "startup" })
  assert.ok(!visible.calls.includes("show"))
  assert.ok(visible.calls.includes("focus"))
})

test("focus happens only after (never before) show, and only when not already focused", () => {
  const win = fakeWindow()
  presentWindow(win, { reason: "startup" })
  assert.deepEqual(win.calls, ["show", "focus"])

  const alreadyFocused = fakeWindow({ visible: true, focused: true })
  presentWindow(alreadyFocused, { reason: "startup" })
  assert.deepEqual(alreadyFocused.calls, [])
})

test("explicit fullscreen intent is applied before show/focus when it differs from current state", () => {
  const win = fakeWindow({ fullscreen: false })
  presentWindow(win, { reason: "startup", fullscreen: true })
  assert.deepEqual(win.calls, ["setFullScreen:true", "show", "focus"])
})

test("fullscreen intent is skipped when already matching (no redundant toggle)", () => {
  const win = fakeWindow({ fullscreen: true, visible: true, focused: true })
  presentWindow(win, { reason: "startup", fullscreen: true })
  assert.equal(win.calls.includes("setFullScreen:true"), false)
})

test("omitted fullscreen intent preserves whatever state the window is currently in (second-instance)", () => {
  const win = fakeWindow({ fullscreen: false, visible: true, focused: true })
  presentWindow(win, { reason: "second-instance" })
  assert.equal(win.calls.some((c) => c.startsWith("setFullScreen")), false)
})

test("Windows foreground assist pulses always-on-top and always disables it afterward", () => {
  const win = fakeWindow()
  presentWindow(win, { reason: "auto-launch", foregroundAssist: true, platform: "win32" })
  assert.deepEqual(win.calls, ["setAlwaysOnTop:true", "show", "focus", "setAlwaysOnTop:false"])
  assert.equal(win.state.alwaysOnTop, false)
})

test("foreground assist is never engaged on non-Windows platforms even if requested", () => {
  const win = fakeWindow()
  presentWindow(win, { reason: "auto-launch", foregroundAssist: true, platform: "darwin" })
  assert.equal(win.calls.includes("setAlwaysOnTop:true"), false)
})

test("always-on-top is disabled even if focus() throws mid-pulse", () => {
  const win = fakeWindow()
  win.focus = () => { win.calls.push("focus-throw"); throw new Error("focus failed") }
  assert.throws(() => presentWindow(win, { reason: "auto-launch", foregroundAssist: true, platform: "win32" }))
  assert.equal(win.calls[win.calls.length - 1], "setAlwaysOnTop:false")
  assert.equal(win.state.alwaysOnTop, false)
})

test("ordinary manual presentation never engages the foreground-assist pulse", () => {
  const win = fakeWindow()
  presentWindow(win, { reason: "startup", foregroundAssist: false, platform: "win32" })
  assert.equal(win.calls.includes("setAlwaysOnTop:true"), false)
})

test("presentWindow completes synchronously -- no timers are used", () => {
  const { mock } = require("node:test")
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const win = fakeWindow()
    const result = presentWindow(win, { reason: "startup" })
    assert.equal(result, true)
    assert.deepEqual(win.calls, ["show", "focus"])
  } finally {
    mock.timers.reset()
  }
})

// -- detectAutoLaunch ---------------------------------------------------------

test("detectAutoLaunch: true when Electron reports wasOpenedAtLogin", () => {
  const app = { getLoginItemSettings: () => ({ wasOpenedAtLogin: true }) }
  assert.equal(detectAutoLaunch(app, []), true)
})

test("detectAutoLaunch: false when Electron reports normal launch and no startup flags present", () => {
  const app = { getLoginItemSettings: () => ({ wasOpenedAtLogin: false }) }
  assert.equal(detectAutoLaunch(app, ["node", "main.js"]), false)
})

test("detectAutoLaunch: falls back to a --startup argv flag if present", () => {
  const app = { getLoginItemSettings: () => ({ wasOpenedAtLogin: false }) }
  assert.equal(detectAutoLaunch(app, ["node", "main.js", "--startup"]), true)
})

test("detectAutoLaunch: safely false when getLoginItemSettings is unsupported/throws", () => {
  const app = { getLoginItemSettings: () => { throw new Error("unsupported") } }
  assert.equal(detectAutoLaunch(app, []), false)
})

test("detectAutoLaunch: safely false with no app and no argv", () => {
  assert.equal(detectAutoLaunch(null, undefined), false)
})
