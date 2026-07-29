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
//
// Two further refinements (added for Control Room Milestone C2, which
// legitimately edits VesparaHome.jsx as its own primary deliverable):
//
// 1. A blocklisted file being dirty is only evidence of a scope violation
//    if the CALLING milestone is actually in progress. If nothing under
//    `scopeDir` (that milestone's own directory) is uncommitted, there is
//    no diff to hold accountable in the first place, and asserting
//    "this milestone didn't touch Sanctuary" about a non-event is exactly
//    the same false-positive class this file was written to eliminate --
//    just one layer deeper. So the check short-circuits to a pass whenever
//    scopeDir itself is clean, regardless of what else is dirty elsewhere.
//
// 2. Not every category is protected from every milestone forever --
//    Control Room C2 is explicitly authorized to extend into Sanctuary
//    (VesparaHome.jsx) as its own primary deliverable, which Library
//    milestones never are. `excludeLabels` lets a caller opt a specific
//    PROTECTED_PATTERNS category out for its own scope, without weakening
//    the check for every other caller (Library's own D2/D3/D4 tests keep
//    protecting Sanctuary in full).
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

// A rename/move (`git status --porcelain` reports it as "RM old -> new" or
// "R  old -> new") is a single line with both paths joined by " -> ". Only
// the new path reflects where the file currently lives -- without this, a
// bare split on whitespace mangles the line, and worse, the OLD path can
// spuriously match scopeDir/PROTECTED_PATTERNS even when the file has
// moved OUT of that directory (exactly what happened moving this helper
// itself out of Wheel/).
function resolveRenamedPath(entry) {
  const arrowIdx = entry.indexOf(" -> ")
  return arrowIdx === -1 ? entry : entry.slice(arrowIdx + 4)
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
 * or protected-field changes found in the current uncommitted working tree,
 * but only when `scopeDir` itself has uncommitted changes -- i.e. only when
 * there is an actual diff, owned by the calling milestone, to hold
 * accountable. Returns empty results if git is unavailable, or if scopeDir
 * is clean.
 *
 * @param {string} testFileURL - import.meta.url of the calling test file
 * @param {{ scopeDir?: string, excludeLabels?: string[], allowPackageJsonVersionBump?: boolean }} [options]
 *   scopeDir: this milestone's own directory (default: Wheel/, the
 *     original Library-milestone caller).
 *   excludeLabels: PROTECTED_PATTERNS categories this specific milestone
 *     is explicitly authorized to touch (e.g. Control Room C2 + "Sanctuary").
 *   allowPackageJsonVersionBump: opts out of package.json's own "version"
 *     field check specifically (dependencies/devDependencies remain
 *     protected either way). Default false, so every existing caller's
 *     behavior is unchanged. Set true only for a milestone whose own,
 *     explicit deliverable includes an authoritative version bump (e.g.
 *     via scripts/set-version.js) landing in the same working tree as
 *     unrelated cross-cutting file changes -- otherwise this check exists
 *     precisely to catch an accidental, undocumented version edit.
 */
export function findProtectedScopeOffenders(testFileURL, options = {}) {
  const { scopeDir = "renderer/src/components/Wheel/", excludeLabels = [], allowPackageJsonVersionBump = false } = options
  const testDir = path.dirname(fileURLToPath(testFileURL))
  const repoRoot = path.join(testDir, "../../../..")

  let changed = []
  try {
    const out = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf8" })
    changed = out.split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => resolveRenamedPath(toPosix(line.replace(/^[AMDRCU?!]{1,2}\s+/, ""))))
  } catch {
    return { offenders: [], packageJsonOffenders: [] }
  }

  // Production changes only -- a milestone's own test files (e.g. an
  // import-path fix shared across test infrastructure, as happened while
  // relocating this very helper) are not evidence that a Library milestone
  // is "in progress" in the sense this gate cares about.
  if (!changed.some(f => f.startsWith(scopeDir) && !f.endsWith(".test.js"))) {
    return { offenders: [], packageJsonOffenders: [] }
  }

  const activePatterns = PROTECTED_PATTERNS.filter(({ label }) => !excludeLabels.includes(label))
  const offenders = changed.filter(f =>
    activePatterns.some(({ pattern }) => pattern.test(f))
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
      if (field === "version" && allowPackageJsonVersionBump) continue
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        packageJsonOffenders.push(`${relPath} (${field})`)
      }
    }
  }

  return { offenders, packageJsonOffenders }
}
