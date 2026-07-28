# Vespara 5.8.4 Release Candidate

## Identity

- Release candidate: Vespara 5.8.4
- GitHub Actions run: #1144
- Branch: main
- Commit SHA: c04af36dadc7b0f831619fa0e752444b10408202
- Installer filename: Vespara Setup 5.8.4.exe
- Installer SHA-256: 1a8d5487116742c4c3d9af6676c0897c91da672f52200f1fb0d04a087c11797f
- Checksum filename: Vespara Setup 5.8.4.exe.sha256
- Validation date: 2026-07-28
- Validation machine: Falcon Windows validation PC
- Windows version: Windows 10 Pro, version 2009, build 19045, 64-bit
- Display resolution and scaling: 1366 x 768, 100%

## Automated validation

- Full test suite: 1145/1145 PASS
- GitHub Actions build-windows: PASS
- Public release job: SKIPPED
- Artifact integrity check: PASS

## Windows smoke test

- Installation/upgrade: PASS
- Vespara launch: PASS
- Executable identity: PASS
- Existing library and settings preserved: PASS
- Control Room direct stations: PASS
- Theme Color removed: PASS
- Card Art Type removed: PASS
- First-run guidance points to Control Room: PASS
- Library preview larger and uncropped: PASS
- Launch Game spacing: PASS
- Sanctuary ambience launch lifecycle: PASS
- Library game launch: PASS
- Recently Played game launch: PASS

## Known limitation

- Microsoft Defender-specific validation: BLOCKED
- Reason: Defender was disabled at the service and driver level by the existing host configuration.

## Decision

- Release candidate status: PASS
- Approved for Stage B public update-path validation: YES

