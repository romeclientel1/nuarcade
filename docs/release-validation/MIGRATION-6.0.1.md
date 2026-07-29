# Vespara 6.0.1 — Update Path Migration Note

## What changed

6.0.1 fixes the in-app updater's release-asset naming so it can actually
find and download public GitHub Release assets.

Root cause: GitHub Releases normalizes uploaded asset filenames on
upload — spaces are rewritten to dots. electron-builder's previous
`artifactName` template (`${productName} Setup ${version}.${ext}`)
produced a space-separated local/CI filename (e.g. `Vespara Setup
6.0.0.exe`), but the asset GitHub actually stored and served back was
`Vespara.Setup.6.0.0.exe`. The updater's asset selection is intentionally
strict — exact name match only, no wildcard, no case-insensitive
fallback — so it correctly refused to select a differently-named file,
which meant every in-app update attempt against the public 5.8.4 and
6.0.0 releases failed silently.

6.0.1 changes the canonical convention itself to the dotted form
(`Vespara.Setup.${version}.exe` / `Vespara.Setup.${version}.exe.sha256`)
across package.json's `artifactName`, the release workflow's checksum
generation and publish-time validation, and the updater's own asset-name
construction — so what CI builds, what GitHub serves, and what the
updater looks for are now the same string, and GitHub's normalization is
a no-op.

## Impact on existing installs

- **Installed 5.8.4 or the original public 6.0.0 release:** the in-app
  updater in those builds still expects the old space-separated asset
  name and cannot select the 6.0.1 release assets. **One manual install
  of the 6.0.1 installer is required** to move off either of those
  versions — download it directly and run it; it upgrades in place over
  an existing installation the same way any manual install does (library,
  settings, profiles, artwork, and play history are preserved).
- **Installed 6.0.1 or later:** automatic in-app updating is fully
  supported going forward, since the build, the published release asset,
  and the updater's exact-match lookup all agree on the same naming
  convention from this release onward.

## Summary

| Installed version | Path to next version |
| --- | --- |
| 5.8.4 | Manual install of 6.0.1 required |
| 6.0.0 (original public release) | Manual install of 6.0.1 required |
| 6.0.1 or later | Automatic in-app update supported |
