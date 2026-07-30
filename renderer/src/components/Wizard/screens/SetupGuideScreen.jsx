import { useState } from 'react'
import styles from './Screen.module.css'

// Each entry intentionally holds only what this screen needs to give a
// concise, non-volatile first-run orientation: identity (id/icon/name/
// system/color), an existing working download link (url, preserved
// mechanically from the prior version of this screen -- see the cleanup
// report for any naming/URL pairs left unchanged but flagged as
// questionable), whether the emulator commonly needs firmware/BIOS
// (bios), and an optional short, source-grounded, non-promotional
// compatibility note (compatNote). No install/games/BIOS folder paths and
// no exact BIOS/firmware/key filenames are stored here anymore -- both are
// owner-specific and belong in the Owner's Manual / the emulator's own
// documentation, not hard-coded into the shipped app.
const EMULATORS = [
  {
    id: 'teknoparrot',
    icon: 'ARC',
    name: 'TeknoParrot',
    system: 'Arcade',
    color: '#00ff88',
    url: 'https://teknoparrot.com/',
    bios: false,
    compatNote: null,
  },
  {
    id: 'rpcs3',
    icon: 'PS3',
    name: 'RPCS3',
    system: 'PlayStation 3',
    color: '#0070d1',
    url: 'https://rpcs3.net',
    bios: false,
    compatNote: 'Most arcade-style PS3 titles run without a firmware dump.',
  },
  {
    id: 'xenia',
    icon: 'X360',
    name: 'Xenia',
    system: 'Xbox 360',
    color: '#107c10',
    url: 'https://xenia.jp',
    bios: false,
    compatNote: null,
  },
  {
    id: 'dolphin',
    icon: 'GCN',
    name: 'Dolphin',
    system: 'GameCube / Wii',
    color: '#6b21a8',
    url: 'https://dolphin-emu.org',
    bios: false,
    compatNote: 'RVZ format is generally smaller and faster to load than ISO.',
  },
  {
    id: 'pcsx2',
    icon: 'PS2',
    name: 'PCSX2',
    system: 'PlayStation 2',
    color: '#003791',
    url: 'https://pcsx2.net',
    bios: true,
    compatNote: null,
  },
  {
    id: 'ryujinx',
    icon: 'NSW',
    name: 'Ryubing (Ryujinx fork)',
    system: 'Nintendo Switch',
    color: '#e4000f',
    url: 'https://ryujinx.app/download',
    bios: true,
    compatNote: null,
  },
  {
    id: 'mame',
    icon: 'M',
    name: 'MAME',
    system: 'Arcade Classics',
    color: '#ff6600',
    url: 'https://www.mamedev.org',
    bios: false,
    compatNote: null,
  },
  {
    id: 'retroarch',
    icon: 'R',
    name: 'RetroArch',
    system: 'NES / SNES / Genesis / GBA / N64 / PS1',
    color: '#1a1a2e',
    url: 'https://www.retroarch.com',
    bios: false,
    compatNote: 'One frontend covering many classic systems -- install cores via its own Online Updater.',
  },
  {
    id: 'project64',
    icon: '64',
    name: 'Project64',
    system: 'Nintendo 64',
    color: '#e4000f',
    url: 'https://www.pj64-emu.com',
    bios: false,
    compatNote: null,
  },
  {
    id: 'duckstation',
    icon: 'DS',
    name: 'DuckStation',
    system: 'PlayStation 1',
    color: '#003791',
    url: 'https://www.duckstation.org',
    bios: true,
    compatNote: 'CHD format is generally recommended over raw bin/cue.',
  },
  {
    id: 'flycast',
    icon: 'DC',
    name: 'Flycast',
    system: 'Dreamcast / NAOMI',
    color: '#ff6600',
    url: 'https://github.com/flyinghead/flycast/releases',
    bios: true,
    compatNote: 'Also covers NAOMI arcade hardware.',
  },
  {
    id: 'xemu',
    icon: 'XBX',
    name: 'Xemu',
    system: 'Original Xbox',
    color: '#107c10',
    url: 'https://xemu.app',
    bios: true,
    // Original Xbox distinction (preserved, kept neutral -- see requirement
    // to avoid claiming either emulator is universally better): Xemu
    // handles disc-image formats; Cxbx-Reloaded (below) handles games
    // already extracted with an executable.
    compatNote: 'Works with disc-image formats (e.g. .iso/.xiso). See Cxbx-Reloaded below for already-extracted games.',
  },
  {
    id: 'cxbx',
    icon: 'XBX',
    name: 'Cxbx-Reloaded',
    system: 'Original Xbox',
    color: '#5cb85c',
    url: 'https://github.com/Cxbx-Reloaded/Cxbx-Reloaded/releases',
    bios: false,
    compatNote: 'Has its own built-in Xbox kernel implementation, so no BIOS dump is needed. Works with games already extracted to a folder with their executable, rather than disc images -- see Xemu above for disc images.',
  },
  {
    id: 'model2',
    icon: 'M2',
    name: 'Model 2 Emulator',
    system: 'Sega Model 2',
    color: '#003366',
    url: 'https://emulation.gametechwiki.com/index.php/Model_2_Emulator',
    bios: false,
    compatNote: null,
  },
  {
    id: 'model3',
    icon: 'M3',
    name: 'Supermodel (Model 3)',
    system: 'Sega Model 3',
    color: '#003366',
    url: 'https://github.com/trzy/Supermodel/releases',
    bios: false,
    compatNote: null,
  },
  {
    id: 'ppsspp',
    icon: 'PSP',
    name: 'PPSSPP',
    system: 'PlayStation Portable',
    color: '#0057a8',
    url: 'https://www.ppsspp.org',
    bios: false,
    compatNote: null,
  },
  {
    id: 'cemu',
    icon: 'WU',
    name: 'Cemu',
    system: 'Wii U',
    color: '#009ac7',
    url: 'https://cemu.info',
    bios: false,
    compatNote: null,
  },
  {
    id: 'vpx',
    icon: 'PIN',
    name: 'Visual Pinball X',
    system: 'Pinball',
    color: '#cc44ff',
    url: 'https://github.com/vpinball/vpinball/releases',
    bios: false,
    compatNote: 'Table files often include their own assets -- keep them together in the same folder.',
  },
]

// Neutral, path-free setup summary shared by every emulator -- see the
// module doc comment above for why no drive letters, install folders, or
// exact BIOS/firmware filenames appear anywhere on this screen.
function buildSteps(emu) {
  const steps = [
    `Install ${emu.name} in a folder you control.`,
  ]
  if (emu.bios) {
    steps.push('Obtain any required firmware or BIOS files from your own hardware.')
  }
  steps.push("Point Vespara at the emulator's executable or install folder in the Control Room's Emulators station.")
  steps.push(`Choose the folder containing your ${emu.system} games in Game Paths.`)
  steps.push('Rescan after changing paths.')
  return steps
}

export default function SetupGuideScreen({ config, updateConfig, next, prev }) {
  const [collapsed, setCollapsed] = useState({})

  const toggleCollapse = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }))
  const openDownload = (url) => window.open(url, '_blank')

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 2 -- Emulator Setup</div>
      <div className={styles.title}>Install your emulators.</div>
      <div className={styles.sub}>
        Vespara manages your library automatically -- but each emulator
        needs to be installed separately. You can skip this and come back
        via the Control Room anytime.
      </div>
      <div className={styles.sub}>
        Vespara does not include games, ROMs, firmware, keys, BIOS files,
        or emulator binaries. You must provide legally obtained copies of
        anything an emulator requires.
      </div>
      <div className={styles.sub}>
        See the Vespara Owner's Manual for detailed emulator, firmware, and
        folder setup.
      </div>

      <div className={styles.emuList}>
        {EMULATORS.map(emu => {
          const isCollapsed = collapsed[emu.id]
          const steps = buildSteps(emu)
          const requirementNote = emu.bios
            ? "Requires firmware or BIOS obtained from your own hardware. See the Owner's Manual and the emulator's official documentation."
            : 'No BIOS normally required.'
          return (
            <div key={emu.id} className={styles.emuRow}>
              <div className={styles.emuHeader}>
                <span className={styles.emuBadge} style={{ background: emu.color }}>{emu.icon}</span>
                <div className={styles.emuMeta}>
                  <div className={styles.emuName}>{emu.name}</div>
                  <div className={styles.emuUrl}>{emu.system} -- {emu.url}</div>
                </div>
                <button className={styles.emuDownload} onClick={() => openDownload(emu.url)}>
                  Download
                </button>
                <button className={styles.emuCollapse} onClick={() => toggleCollapse(emu.id)}>
                  {isCollapsed ? '>' : 'v'}
                </button>
              </div>
              {!isCollapsed && (
                <div className={styles.emuBody}>
                  <ol className={styles.emuSteps}>
                    {steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                  <div className={styles.emuNote}>{requirementNote}</div>
                  {emu.compatNote && (
                    <div className={styles.emuPaths}>
                      <span>{emu.compatNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next}>Continue</button>
      </div>
    </div>
  )
}
