// index.test.js -------------------------------------------------------------
// Focused tests for the main-process launch-lifecycle integration wired
// into src/main/index.js. Runs under Node's built-in test runner with NO
// real Electron window: 'electron' itself is stubbed out via a Module._load
// interception (test-only, production code is untouched) so the real
// index.js can be required and its exported helpers exercised directly.
// Fake children are plain EventEmitters -- lifecycle events (spawn/error/
// exit) are emitted manually rather than launching a real OS process,
// per the "dependency injection/mocks rather than a full Electron window"
// brief. setTimeout is mocked for the duration of any launchWithReturn call
// since that function unconditionally schedules a few focus-nudge timers
// (existing, untouched behavior) that would otherwise leave the test
// process waiting on real wall-clock timers.

const { test, mock, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const os = require("node:os")
const Module = require("node:module")
const { EventEmitter } = require("node:events")

const NORMALIZED_KEYS = [
  "error", "exitCode", "exitedAt", "outcome", "processStarted",
  "running", "sessionId", "signal", "startedAt", "success", "trackedToExit",
].sort()

function createElectronMock(appOverrides) {
  return {
    app: Object.assign({
      isPackaged: true,
      getPath: () => os.tmpdir(),
      getVersion: () => "0.0.0-test",
      whenReady: () => new Promise(() => {}), // never resolves -- no real window in tests
      on: () => {},
      dock: { setIcon: () => {} },
      quit: () => {},
      exit: () => {},
      relaunch: () => {},
      setName: () => {},
      requestSingleInstanceLock: () => true,
      getLoginItemSettings: () => ({ wasOpenedAtLogin: false }),
    }, appOverrides || {}),
    BrowserWindow: class { static getAllWindows() { return [] } },
    ipcMain: {
      handle: (name, fn) => { ipcHandlers.set(name, fn) },
      on: () => {},
      once: () => {},
      removeListener: () => {},
    },
    screen: {
      getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }),
      getAllDisplays: () => ([{ workAreaSize: { width: 1920, height: 1080 } }]),
    },
    dialog: {
      showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
      showSaveDialog: async () => ({ canceled: true }),
    },
    shell: { openExternal: async () => {} },
    globalShortcut: { register: () => {}, unregister: () => {} },
    session: {
      defaultSession: {
        setPermissionCheckHandler: () => {},
        setPermissionRequestHandler: () => {},
      },
    },
    ipcRenderer: { sendSync: () => null, on: () => {}, invoke: async () => null, removeListener: () => {} },
    net: {},
  }
}

const ipcHandlers = new Map()

function loadMainIndex(appOverrides) {
  const electronMock = createElectronMock(appOverrides)
  const originalLoad = Module._load
  Module._load = function(request, parent, isMain) {
    if (request === "electron") return electronMock
    return originalLoad.apply(this, arguments)
  }
  try {
    delete require.cache[require.resolve("./index.js")]
    return require("./index.js")
  } finally {
    Module._load = originalLoad
  }
}

const mainIndex = loadMainIndex()
const launchRegistry = require("./launchRegistry.js")

function fakeChild() {
  const emitter = new EventEmitter()
  emitter.stdout = null
  emitter.stderr = null
  emitter.pid = 4242
  emitter.unref = () => {}
  return emitter
}

beforeEach(() => {
  launchRegistry._internal._clear()
  mainIndex._internal.setMainWindowForTest(null)
})

test("tracked registration happens before spawn is invoked", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sessionId = "order-1"
    let statusAtSpawnTime = null
    const child = fakeChild()
    const spawnImpl = () => {
      statusAtSpawnTime = launchRegistry.getStatus(sessionId)
      return child
    }
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl }).catch(() => {})
    assert.ok(statusAtSpawnTime, "spawnImpl should have been invoked synchronously")
    assert.equal(statusAtSpawnTime.trackedToExit, true)
    assert.equal(statusAtSpawnTime.processStarted, null)
  } finally {
    mock.timers.reset()
  }
})

test("process-start recording: a real 'spawn' event marks the session started and running", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sessionId = "start-1"
    const child = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl: () => child }).catch(() => {})
    child.emit("spawn")
    const status = launchRegistry.getStatus(sessionId)
    assert.equal(status.processStarted, true)
    assert.equal(status.running, true)
    assert.equal(status.trackedToExit, true)
    assert.equal(status.outcome, "uncertain")
  } finally {
    mock.timers.reset()
  }
})

test("spawn-failure recording: an 'error' event before spawn confirmation marks failed-before-start", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sessionId = "fail-1"
    const child = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl: () => child }).catch(() => {})
    child.emit("error", new Error("ENOENT: not found"))
    const status = launchRegistry.getStatus(sessionId)
    assert.equal(status.processStarted, false)
    assert.equal(status.outcome, "failed-before-start")
    assert.equal(status.success, false)
    assert.equal(status.error, "ENOENT: not found")
  } finally {
    mock.timers.reset()
  }
})

test("terminal exit recording: 'exit' event records exitCode/signal", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sessionId = "exit-1"
    const child = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl: () => child }).catch(() => {})
    child.emit("spawn")
    child.emit("exit", 0, null)
    const status = launchRegistry.getStatus(sessionId)
    assert.equal(status.outcome, "completed")
    assert.equal(status.exitCode, 0)
    assert.equal(status.signal, null)
    assert.equal(status.running, false)
  } finally {
    mock.timers.reset()
  }
})

test("terminal push is emitted exactly once, even if 'exit' fires twice", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sessionId = "push-1"
    const sent = []
    mainIndex._internal.setMainWindowForTest({
      isDestroyed: () => false,
      setFullScreen: () => {},
      minimize: () => {},
      restore: () => {},
      focus: () => {},
      webContents: { send: (channel, payload) => sent.push([channel, payload]) },
    })
    const child = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl: () => child }).catch(() => {})
    child.emit("spawn")
    child.emit("exit", 0, null)
    child.emit("exit", 137, "SIGKILL") // duplicate/delayed -- must not push again
    assert.equal(sent.length, 1)
    assert.equal(sent[0][0], "launch-lifecycle-terminal")
    assert.equal(sent[0][1].sessionId, sessionId)
    assert.equal(sent[0][1].outcome, "completed")
    assert.equal(sent[0][1].exitCode, 0)
  } finally {
    mock.timers.reset()
  }
})

test("status query handler returns the exact 11-key normalized shape", async () => {
  const sessionId = "status-1"
  launchRegistry.registerLaunch({ sessionId, trackedToExit: true, processStarted: true, startedAt: 0 })
  const handler = ipcHandlers.get("get-launch-lifecycle-status")
  assert.equal(typeof handler, "function")
  const status = await handler({}, sessionId)
  assert.deepEqual(Object.keys(status).sort(), NORMALIZED_KEYS)
  assert.equal(status.sessionId, sessionId)
  assert.equal(status.trackedToExit, true)
})

test("status query handler normalizes an unknown session conservatively", async () => {
  const handler = ipcHandlers.get("get-launch-lifecycle-status")
  const status = await handler({}, "never-registered")
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.success, false)
  assert.equal(status.trackedToExit, false)
})

test("duplicate terminal handling remains stable across repeated status reads", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sessionId = "dup-1"
    const child = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl: () => child }).catch(() => {})
    child.emit("spawn")
    child.emit("exit", 1, null)
    const first = launchRegistry.getStatus(sessionId)
    child.emit("exit", 0, "SIGKILL") // duplicate/delayed -- must not overwrite
    const second = launchRegistry.getStatus(sessionId)
    assert.deepEqual(second, first)
    assert.equal(second.exitCode, 1)
    assert.equal(second.outcome, "abnormal-exit")
  } finally {
    mock.timers.reset()
  }
})

test("untracked (fire-and-forget) launch reports trackedToExit: false and stays uncertain", () => {
  const sessionId = "detached-1"
  const child = fakeChild()
  mainIndex.launchDetachedFireAndForget("fake-exe", [], {}, sessionId, () => child)
  child.emit("spawn")
  const status = launchRegistry.getStatus(sessionId)
  assert.equal(status.trackedToExit, false)
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.running, false)
  assert.equal(status.processStarted, true)
})

test("untracked launch ignores a stray exit event -- exit is never wired for trackedToExit: false", () => {
  const sessionId = "detached-2"
  const child = fakeChild()
  mainIndex.launchDetachedFireAndForget("fake-exe", [], {}, sessionId, () => child)
  child.emit("spawn")
  child.emit("exit", 0, null) // no listener attached for untracked -- must be a no-op
  const status = launchRegistry.getStatus(sessionId)
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.exitedAt, null)
})

test("a shell-command (Steam-style) fire-and-forget launch records spawn failure on error", () => {
  const sessionId = "shell-1"
  const fakeExec = (command, cb) => { cb(new Error("steam not installed")) }
  mainIndex.launchViaShellCommand("start steam://rungameid/1", sessionId, fakeExec)
  const status = launchRegistry.getStatus(sessionId)
  assert.equal(status.processStarted, false)
  assert.equal(status.outcome, "failed-before-start")
  assert.equal(status.trackedToExit, false)
  assert.equal(status.error, "steam not installed")
})

test("a shell-command fire-and-forget launch records process start when the command succeeds", () => {
  const sessionId = "shell-2"
  const fakeExec = (command, cb) => { cb(null) }
  mainIndex.launchViaShellCommand("start steam://rungameid/1", sessionId, fakeExec)
  const status = launchRegistry.getStatus(sessionId)
  assert.equal(status.processStarted, true)
  assert.equal(status.trackedToExit, false)
  assert.equal(status.outcome, "uncertain")
})

// -- Backward compatibility: the currently deployed renderer never sends a
// sessionId at all (not even `undefined` explicitly -- the IPC channel
// simply receives one fewer argument). Every one of these must launch
// exactly as before, never throw, preserve the existing result shape, and
// leave the launch registry completely untouched.

test("legacy tracked invocation (no sessionId) via the real IPC handler still launches, preserves the {success:...} shape, and never throws", async () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const handler = ipcHandlers.get("launch-ps3-game")
    const sizeBefore = launchRegistry._internal._size()
    const result = await handler({}, "SomeGame.iso") // exactly the legacy 2-arg call -- no sessionId
    assert.equal(typeof result, "object")
    assert.equal(typeof result.success, "boolean")
    if (!result.success) assert.equal(typeof result.error, "string")
    assert.equal(launchRegistry._internal._size(), sizeBefore, "no registry entry should be created for a legacy call")
    assert.equal(launchRegistry._internal._has(undefined), false)
  } finally {
    mock.timers.reset()
  }
})

test("legacy tracked invocation (no sessionId) still resolves under the prior contract on a clean exit past the trust window", async () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const child = fakeChild()
    const promise = mainIndex.launchWithReturn("fake-exe", [], { spawnImpl: () => child }) // no sessionId at all
    child.emit("exit", 0)
    await assert.doesNotReject(promise)
  } finally {
    mock.timers.reset()
  }
})

test("legacy tracked invocation (no sessionId) still rejects under the prior contract on a fast nonzero exit", async () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const child = fakeChild()
    const promise = mainIndex.launchWithReturn("fake-exe", [], { spawnImpl: () => child }) // no sessionId at all
    child.emit("exit", 1) // fast + nonzero -- the pre-existing <4000ms reject path, untouched
    await assert.rejects(promise)
  } finally {
    mock.timers.reset()
  }
})

test("legacy untracked invocation (no sessionId) via the real IPC handler still launches and returns the existing {ok:true} shape", async () => {
  const handler = ipcHandlers.get("launch-pc-game")
  const sizeBefore = launchRegistry._internal._size()
  const result = await handler({}, "/definitely/not/a/real/executable")
  assert.deepEqual(result, { ok: true })
  assert.equal(launchRegistry._internal._size(), sizeBefore, "no registry entry should be created for a legacy call")
  assert.equal(launchRegistry._internal._has(undefined), false)
})

test("no lifecycle push is emitted for any legacy (no-sessionId) invocation, tracked or untracked", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const sent = []
    mainIndex._internal.setMainWindowForTest({
      isDestroyed: () => false,
      setFullScreen: () => {}, minimize: () => {}, restore: () => {}, focus: () => {},
      webContents: { send: (channel, payload) => sent.push([channel, payload]) },
    })

    const trackedChild = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { spawnImpl: () => trackedChild }).catch(() => {})
    trackedChild.emit("spawn")
    trackedChild.emit("exit", 0, null)
    trackedChild.emit("error", new Error("also should not push"))

    const untrackedChild = fakeChild()
    mainIndex.launchDetachedFireAndForget("fake-exe", [], {}, undefined, () => untrackedChild)
    untrackedChild.emit("spawn")
    untrackedChild.emit("error", new Error("should not push either"))

    assert.equal(sent.length, 0)
  } finally {
    mock.timers.reset()
  }
})

test("supplying a valid sessionId (vs. omitting it) is what activates the new registry behavior", () => {
  mock.timers.enable({ apis: ["setTimeout"] })
  try {
    const legacyChild = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { spawnImpl: () => legacyChild }).catch(() => {})
    legacyChild.emit("spawn")
    legacyChild.emit("exit", 0, null)
    assert.equal(launchRegistry._internal._size(), 0, "legacy call must not create any registry entry")

    const sessionId = "activated-1"
    const trackedChild = fakeChild()
    mainIndex.launchWithReturn("fake-exe", [], { sessionId, spawnImpl: () => trackedChild }).catch(() => {})
    trackedChild.emit("spawn")
    trackedChild.emit("exit", 0, null)
    const status = launchRegistry.getStatus(sessionId)
    assert.equal(status.outcome, "completed")
    assert.equal(status.processStarted, true)
    assert.equal(launchRegistry._internal._has(sessionId), true)
  } finally {
    mock.timers.reset()
  }
})

test("a successful untracked launch is explicitly processStarted: true, trackedToExit: false, outcome: uncertain, with no terminal exit event ever recorded", () => {
  const sent = []
  mainIndex._internal.setMainWindowForTest({
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => sent.push([channel, payload]) },
  })
  const sessionId = "untracked-success-1"
  const child = fakeChild()
  mainIndex.launchDetachedFireAndForget("fake-exe", [], {}, sessionId, () => child)
  child.emit("spawn")
  // No exit listener is ever wired for an untracked launch -- emitting one
  // must have no effect at all, proving there is structurally no way for
  // this session to ever be marked terminal via exit.
  child.emit("exit", 0, null)

  const status = launchRegistry.getStatus(sessionId)
  assert.equal(status.processStarted, true)
  assert.equal(status.trackedToExit, false)
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.exitedAt, null)
  assert.equal(status.running, false)
  assert.equal(sent.length, 0, "no terminal push for a successful untracked launch")
})

test("all 21 launch IPC channels are registered, plus the lifecycle status channel", () => {
  const expectedChannels = [
    "launch-game", "launch-ps3-game", "launch-xbox360-game", "launch-gcwii-game",
    "launch-ps2-game", "launch-switch-game", "launch-mame-game", "launch-retroarch",
    "launch-retroarch-game", "launch-n64-game", "launch-ps1-game", "launch-flycast-game",
    "launch-xemu-game", "launch-cxbx-game", "launch-model2-game", "launch-model3-game",
    "launch-psp-game", "launch-wiiu-game",
    "launch-vpx-table", "launch-steam-game", "launch-pc-game",
    "get-launch-lifecycle-status",
  ]
  for (const channel of expectedChannels) {
    assert.ok(ipcHandlers.has(channel), `expected an ipcMain.handle for '${channel}'`)
  }
  assert.equal(expectedChannels.length, 22)
})

// -- Single-instance lock and second-instance presentation -------------------

test("app.setName('NuArcade') remains the first executable statement after importing electron", () => {
  const source = require("node:fs").readFileSync(require.resolve("./index.js"), "utf8")
  const statements = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
  assert.equal(statements[0], "const { app, BrowserWindow, ipcMain, screen, dialog, shell, globalShortcut } = require('electron')")
  assert.equal(statements[1], "app.setName('NuArcade')")
})

test("primary instance: lock is acquired and reported via the test-only accessor", () => {
  assert.equal(mainIndex._internal.getSingleInstanceLockAcquired(), true)
})

test("a losing second instance never creates a window: lock denied quits immediately, whenReady is a guarded no-op", async () => {
  let quitCalled = false
  const losing = loadMainIndex({
    requestSingleInstanceLock: () => false,
    quit: () => { quitCalled = true },
  })
  assert.equal(losing._internal.getSingleInstanceLockAcquired(), false)
  assert.equal(quitCalled, true)
})

test("second-instance presents the existing window instead of creating a new one (no reload/remount)", () => {
  const calls = []
  mainIndex._internal.setMainWindowForTest({
    isDestroyed: () => false,
    isMinimized: () => false,
    isVisible: () => false,
    isFocused: () => false,
    isFullScreen: () => true,
    restore: () => calls.push("restore"),
    show: () => calls.push("show"),
    focus: () => calls.push("focus"),
    setFullScreen: (v) => calls.push("setFullScreen:" + v),
    setAlwaysOnTop: (v) => calls.push("setAlwaysOnTop:" + v),
  })
  mainIndex.handleSecondInstance()
  assert.deepEqual(calls, ["show", "focus"])
  // No setFullScreen call at all -- second-instance preserves whatever
  // fullscreen state the existing window is already in.
  assert.equal(calls.some((c) => c.startsWith("setFullScreen")), false)
})

test("second-instance restores a minimized existing window and re-focuses it", () => {
  const calls = []
  mainIndex._internal.setMainWindowForTest({
    isDestroyed: () => false,
    isMinimized: () => true,
    isVisible: () => true,
    isFocused: () => false,
    isFullScreen: () => true,
    restore: () => calls.push("restore"),
    show: () => calls.push("show"),
    focus: () => calls.push("focus"),
    setFullScreen: () => calls.push("setFullScreen"),
    setAlwaysOnTop: () => calls.push("setAlwaysOnTop"),
  })
  mainIndex.handleSecondInstance()
  assert.deepEqual(calls, ["restore", "focus"])
})

test("second-instance with no window yet (never created) is a safe no-op", () => {
  mainIndex._internal.setMainWindowForTest(null)
  assert.doesNotThrow(() => mainIndex.handleSecondInstance())
})
