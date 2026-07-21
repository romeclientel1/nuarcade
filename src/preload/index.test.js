// index.test.js (preload) ----------------------------------------------------
// Focused tests for the preload launch-lifecycle bridge. 'electron' is
// stubbed via a Module._load interception (test-only; production code is
// untouched) so the real preload/index.js can be required without a real
// Electron renderer/contextBridge. The bridge's core logic
// (createLaunchLifecycleBridge) is dependency-injected on a fake
// ipcRenderer built from plain spies -- no real IPC transport involved.

const { test } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")

function createElectronMock() {
  return {
    contextBridge: { exposeInMainWorld: () => {} },
    ipcRenderer: {
      invoke: async () => null,
      on: () => {},
      removeListener: () => {},
      send: () => {},
      sendSync: () => "0.0.0-test",
    },
  }
}

function loadPreload() {
  const electronMock = createElectronMock()
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

const { createLaunchLifecycleBridge } = loadPreload()

function fakeIpcRenderer() {
  const invokeCalls = []
  const onCalls = []
  const removeListenerCalls = []
  return {
    invoke: (channel, ...args) => { invokeCalls.push([channel, ...args]); return Promise.resolve({ ok: true, channel, args }) },
    on: (channel, listener) => { onCalls.push([channel, listener]) },
    removeListener: (channel, listener) => { removeListenerCalls.push([channel, listener]) },
    invokeCalls, onCalls, removeListenerCalls,
  }
}

test("getLaunchLifecycleStatus maps to the 'get-launch-lifecycle-status' IPC channel with the sessionId", async () => {
  const ipc = fakeIpcRenderer()
  const bridge = createLaunchLifecycleBridge(ipc)
  const result = await bridge.getLaunchLifecycleStatus("session-abc")
  assert.equal(ipc.invokeCalls.length, 1)
  assert.deepEqual(ipc.invokeCalls[0], ["get-launch-lifecycle-status", "session-abc"])
  assert.deepEqual(result, { ok: true, channel: "get-launch-lifecycle-status", args: ["session-abc"] })
})

test("onLaunchLifecycleTerminal subscribes to the 'launch-lifecycle-terminal' channel and forwards normalized status", () => {
  const ipc = fakeIpcRenderer()
  const bridge = createLaunchLifecycleBridge(ipc)
  const received = []
  bridge.onLaunchLifecycleTerminal((status) => received.push(status))

  assert.equal(ipc.onCalls.length, 1)
  assert.equal(ipc.onCalls[0][0], "launch-lifecycle-terminal")

  // Simulate the main process pushing a terminal event -- ipcRenderer.on
  // callbacks are invoked with (event, ...args); the bridge must strip the
  // event and hand the callback only the normalized payload.
  const registeredListener = ipc.onCalls[0][1]
  const fakeStatus = { sessionId: "s1", outcome: "completed" }
  registeredListener({ /* fake IpcRendererEvent */ }, fakeStatus)

  assert.equal(received.length, 1)
  assert.deepEqual(received[0], fakeStatus)
})

test("onLaunchLifecycleTerminal returns an unsubscribe function that removes exactly the listener it added", () => {
  const ipc = fakeIpcRenderer()
  const bridge = createLaunchLifecycleBridge(ipc)
  const callback = () => {}
  const unsubscribe = bridge.onLaunchLifecycleTerminal(callback)

  assert.equal(ipc.onCalls.length, 1)
  const addedListener = ipc.onCalls[0][1]

  unsubscribe()

  assert.equal(ipc.removeListenerCalls.length, 1)
  assert.equal(ipc.removeListenerCalls[0][0], "launch-lifecycle-terminal")
  assert.equal(ipc.removeListenerCalls[0][1], addedListener)
})

test("subscribing with the same callback twice does not register a duplicate underlying listener", () => {
  const ipc = fakeIpcRenderer()
  const bridge = createLaunchLifecycleBridge(ipc)
  const callback = (status) => status

  bridge.onLaunchLifecycleTerminal(callback)
  bridge.onLaunchLifecycleTerminal(callback)

  assert.equal(ipc.onCalls.length, 1, "a second subscription with the same callback must not add a second ipcRenderer.on listener")
})

test("two independent callbacks each get their own listener, and unsubscribing one leaves the other intact", () => {
  const ipc = fakeIpcRenderer()
  const bridge = createLaunchLifecycleBridge(ipc)
  const callbackA = () => {}
  const callbackB = () => {}

  const unsubA = bridge.onLaunchLifecycleTerminal(callbackA)
  bridge.onLaunchLifecycleTerminal(callbackB)
  assert.equal(ipc.onCalls.length, 2)

  unsubA()
  assert.equal(ipc.removeListenerCalls.length, 1)
  assert.equal(ipc.removeListenerCalls[0][1], ipc.onCalls[0][1])
  // callback B's listener was never targeted
  assert.notEqual(ipc.removeListenerCalls[0][1], ipc.onCalls[1][1])
})

test("multiple query calls each map to the same correct channel with their own sessionId", async () => {
  const ipc = fakeIpcRenderer()
  const bridge = createLaunchLifecycleBridge(ipc)
  await bridge.getLaunchLifecycleStatus("s1")
  await bridge.getLaunchLifecycleStatus("s2")
  assert.equal(ipc.invokeCalls.length, 2)
  assert.deepEqual(ipc.invokeCalls[0], ["get-launch-lifecycle-status", "s1"])
  assert.deepEqual(ipc.invokeCalls[1], ["get-launch-lifecycle-status", "s2"])
})
