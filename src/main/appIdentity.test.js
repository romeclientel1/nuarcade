// appIdentity.test.js ---------------------------------------------------
// Focused tests for the Vespara Brand Identity Milestone 2 user-data-path
// safeguard: packaging's visible productName is now "Vespara" (see
// package.json's build.productName), but Electron's default userData
// directory is derived from app.getName(), which a packaged build
// resolves from productName unless explicitly overridden. src/main/
// index.js calls app.setName('NuArcade') as its very first statement
// (immediately after requiring 'electron', before requiring './config')
// specifically so every existing user's config/profile/metadata
// directory keeps resolving to the same path it always has.
//
// These tests intercept Module._load (same technique as index.test.js)
// with a call-order-tracking electron mock, so they can prove -- against
// the REAL committed src/main/index.js and src/main/config.js, not a
// restated copy -- that setName genuinely runs before the first
// getPath('userData') call config.js's own module-level CONFIG_PATH
// computation makes.

const { test } = require("node:test")
const assert = require("node:assert/strict")
const os = require("node:os")
const Module = require("node:module")

function createTrackingElectronMock(callLog) {
  return {
    app: {
      isPackaged: true,
      getPath: (name) => { callLog.push("getPath:" + name); return os.tmpdir() },
      getVersion: () => "0.0.0-test",
      getName: () => "NuArcade",
      setName: (name) => { callLog.push("setName:" + name) },
      whenReady: () => new Promise(() => {}), // never resolves -- no real window in tests
      on: () => {},
      dock: { setIcon: () => {} },
      quit: () => {},
      exit: () => {},
      relaunch: () => {},
      requestSingleInstanceLock: () => true,
      getLoginItemSettings: () => ({ wasOpenedAtLogin: false }),
    },
    BrowserWindow: class { static getAllWindows() { return [] } },
    ipcMain: {
      handle: () => {},
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

// Loads a fresh copy of src/main/index.js (and, transitively, the real
// src/main/config.js it requires) against a call-order-tracking electron
// mock -- delete both from require.cache first so this is a genuine
// from-scratch module evaluation, not a cached instance from another test
// file in this same process.
function loadFreshWithTracking() {
  const callLog = []
  const electronMock = createTrackingElectronMock(callLog)
  const originalLoad = Module._load
  Module._load = function(request, parent, isMain) {
    if (request === "electron") return electronMock
    return originalLoad.apply(this, arguments)
  }
  try {
    delete require.cache[require.resolve("./index.js")]
    delete require.cache[require.resolve("./config.js")]
    require("./index.js")
  } finally {
    Module._load = originalLoad
  }
  return callLog
}

test("app.setName('NuArcade') is called, and runs before config.js's own getPath('userData') module-load-time call", () => {
  const callLog = loadFreshWithTracking()
  const setNameIdx = callLog.indexOf("setName:NuArcade")
  const getPathIdx = callLog.indexOf("getPath:userData")
  assert.ok(setNameIdx !== -1, "app.setName('NuArcade') must be called")
  assert.ok(getPathIdx !== -1, "config.js's getPath('userData') call must have run")
  assert.ok(setNameIdx < getPathIdx, "setName must run before getPath('userData'), got order: " + callLog.join(", "))
})

test("setName is called with the technical identity 'NuArcade', not the visible productName 'Vespara'", () => {
  const callLog = loadFreshWithTracking()
  assert.ok(callLog.includes("setName:NuArcade"))
  assert.ok(!callLog.includes("setName:Vespara"), "must never override the app name to the visible brand -- that would move the userData directory")
})

test("the source itself places app.setName('NuArcade') before the './config' require, so the ordering is structural, not incidental", () => {
  const src = require("node:fs").readFileSync(require.resolve("./index.js"), "utf8")
  const setNameIdx = src.indexOf("app.setName('NuArcade')")
  const configRequireIdx = src.indexOf("require('./config')")
  assert.ok(setNameIdx > -1, "app.setName('NuArcade') must appear in src/main/index.js")
  assert.ok(configRequireIdx > -1, "require('./config') must appear in src/main/index.js")
  assert.ok(setNameIdx < configRequireIdx, "app.setName('NuArcade') must be textually before require('./config')")
})

test("config.js's CONFIG_PATH still resolves against 'nuarcade-config.json', unchanged by the brand pass", () => {
  const src = require("node:fs").readFileSync(require.resolve("./config.js"), "utf8")
  assert.match(src, /path\.join\(app\.getPath\('userData'\), 'nuarcade-config\.json'\)/)
})
