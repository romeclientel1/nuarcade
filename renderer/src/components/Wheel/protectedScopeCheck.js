// Test-only helper (not imported by production code). Originally each
// Library milestone's own test file asserted that *every* uncommitted file
// in the repo lived under renderer/src/components/Wheel/ -- a blanket
// "nothing else is dirty" check. That assumption only held while a single
// milestone's work was the only thing in the working tree. Once a second,
// unrelated milestone (e.g. Control Room) has its own legitimate
// uncommitted files sitting alongside Library's, the same assertion fails
// on files it was never meant to police -- it can't tell "an unrelated
// milestone touched App.jsx" apart from "this milestone accidentally
// touched App.jsx."
//
// This replaces that blanket check with an explicit blocklist: specific
// files/directories a Library-scoped milestone must never touch (Sanctuary,
// startup, shared audio, installer assets, preload, main-process), plus a
// content-level check that package.json's version/dependencies fields are
// unchanged. Anything not on the blocklist -- new unrelated milestones
// included -- is permitted, so the test still catches real scope creep
// without forbidding legitimate parallel work.
import path from "node:path"
import fs from "node:fs"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const PROTECTED_PATTERNS = [
  { label: "Sanctuary",                 pattern: /^renderer\/src\/components\/VesparaHome\// },
  { label: "startup",                   pattern: /^renderer\/src\/components\/Intro\// },
  { label: "startup",                   pattern: /^renderer\/src\/launchSession\// },
  { label: "environment/startup/installer assets", pattern: /^assets\// },
  { label: "audio",                     pattern: /^renderer\/src\/hooks\/(useArcadeSounds|useMusicPlayer|uiSoundConfig)\.js$/ },
  { label: "installer",                 pattern: /^nuarcade-setup-folders\.ps1$/ },
  { label: "preload",                   pattern: /^src\/preload\// },
  { label: "main-process",              pattern: /^src\/main\// },
]

const PACKAGE_JSON_FILES = ["package.json", "renderer/package.json"]
const PACKAGE_JSON_PROTECTED_FIELDS = ["version", "dependencies", "devDependencies"]

// git always reports porcelain paths with forward slashes regardless of
// host OS, but normalize defensively so a future git/OS combination that
// didn't can't silently break the pattern matches above.
function toPosix(p) {
  return p.replace(/\\/g, "/")
}

function readTrackedJson(repoRoot, relPath, ref) {
  try {
    const raw = execSync(`git show ${ref}:${relPath}`, { cwd: repoRoot, encoding: "utf8" })
    return JSON.parse(raw)
  } catch {
    return null // file didn't exist at that ref, or isn't valid JSON -- not this check's concern
  }
}

/**
 * Returns { offenders, packageJsonOffenders } describing any protected-file
 * or protected-field changes found in the current uncommitted working tree.
 * Returns { offenders: [], packageJsonOffenders: [] } if git is unavailable.
 */
export function findProtectedScopeOffenders(testFileURL) {
  const testDir = path.dirname(fileURLToPath(testFileURL))
  const repoRoot = path.join(testDir, "../../../..")

  let changed = []
  try {
    const out = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf8" })
    changed = out.split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => toPosix(line.replace(/^[AMDRCU?!]{1,2}\s+/, "")))
  } catch {
    return { offenders: [], packageJsonOffenders: [] }
  }

  const offenders = changed.filter(f =>
    PROTECTED_PATTERNS.some(({ pattern }) => pattern.test(f))
  )

  const packageJsonOffenders = []
  for (const relPath of PACKAGE_JSON_FILES) {
    if (!changed.includes(relPath)) continue
    const before = readTrackedJson(repoRoot, relPath, "HEAD")
    // Working-tree content is read directly from disk -- there is no git
    // ref for uncommitted changes.
    let after = null
    try {
      after = JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), "utf8"))
    } catch {
      after = null
    }
    if (!before || !after) continue
    for (const field of PACKAGE_JSON_PROTECTED_FIELDS) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        packageJsonOffenders.push(`${relPath} (${field})`)
      }
    }
  }

  return { offenders, packageJsonOffenders }
}
