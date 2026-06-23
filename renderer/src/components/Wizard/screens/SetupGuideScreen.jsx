import { useState } from 'react'
import styles from './Screen.module.css'

const EMULATORS = [
  {
    id: 'teknoparrot',
    icon: 'ARC',
    name: 'TeknoParrot',
    system: 'Arcade',
    color: '#00ff88',
    url: 'https://teknoparrot.com/',
    folder: 'F:\\TeknoParrot\\',
    gamesFolder: 'F:\\ArcadeGames\\',
    bios: false,
    steps: [
      'Download TeknoParrot from teknoparrot.com',
      'Extract to F:\\TeknoParrot\\',
      'Run TeknoParrotUi.exe once to initialize',
      'Add game folders to F:\\ArcadeGames\\',
    ],
    note: null,
  },
  {
    id: 'rpcs3',
    icon: 'PS3',
    name: 'RPCS3',
    system: 'PlayStation 3',
    color: '#0070d1',
    url: 'https://rpcs3.net',
    folder: 'F:\\RPCS3\\',
    gamesFolder: 'F:\\PS3Games\\',
    bios: false,
    steps: [
      'Download RPCS3 from rpcs3.net',
      'Extract to F:\\RPCS3\\',
      'Run rpcs3.exe once to initialize settings',
      'Install PS3 game folders to F:\\PS3Games\\',
    ],
    note: 'Most arcade PS3 titles run without a firmware dump.',
  },
  {
    id: 'xenia',
    icon: 'X360',
    name: 'Xenia',
    system: 'Xbox 360',
    color: '#107c10',
    url: 'https://xenia.jp',
    folder: 'F:\\Xenia\\',
    gamesFolder: 'F:\\Xbox360Games\\',
    bios: false,
    steps: [
      'Download Xenia from xenia.jp',
      'Extract to F:\\Xenia\\',
      'No BIOS or firmware required',
      'Add Xbox 360 ISO or XEX files to F:\\Xbox360Games\\',
    ],
    note: 'Easiest setup - no BIOS needed.',
  },
  {
    id: 'dolphin',
    icon: 'GCN',
    name: 'Dolphin',
    system: 'GameCube / Wii',
    color: '#6b21a8',
    url: 'https://dolphin-emu.org',
    folder: 'F:\\Dolphin\\',
    gamesFolder: 'F:\\GCWiiGames\\',
    bios: false,
    steps: [
      'Download Dolphin from dolphin-emu.org',
      'Install or extract to F:\\Dolphin\\',
      'No BIOS required for most titles',
      'Add GCN / Wii ISOs or RVZ files to F:\\GCWiiGames\\',
    ],
    note: 'RVZ format is recommended - smaller and faster than ISO.',
  },
  {
    id: 'pcsx2',
    icon: 'PS2',
    name: 'PCSX2',
    system: 'PlayStation 2',
    color: '#003791',
    url: 'https://pcsx2.net',
    folder: 'F:\\PCSX2\\',
    gamesFolder: 'F:\\PS2Games\\',
    bios: true,
    biosFolder: 'F:\\PCSX2\\bios\\',
    biosFiles: ['Any PS2 BIOS .bin file (e.g. SCPH-70012.bin)'],
    steps: [
      'Download PCSX2 from pcsx2.net',
      'Install to F:\\PCSX2\\',
      'Obtain PS2 BIOS files from your own console',
      'Place BIOS files in F:\\PCSX2\\bios\\',
      'Add PS2 ISOs or CHD files to F:\\PS2Games\\',
    ],
    note: 'Requires PS2 BIOS files from your own console.',
  },
  {
    id: 'ryujinx',
    icon: 'NSW',
    name: 'Ryubing (Ryujinx fork)',
    system: 'Nintendo Switch',
    color: '#e4000f',
    url: 'https://ryujinx.app/download',
    folder: 'F:\\Ryujinx\\',
    gamesFolder: 'F:\\SwitchGames\\',
    bios: true,
    biosFolder: 'F:\\Ryujinx\\system\\',
    biosFiles: ['prod.keys', 'title.keys (optional)', 'Firmware via Tools > Install Firmware'],
    steps: [
      'Download Ryujinx from ryujinx.org',
      'Extract to F:\\Ryujinx\\',
      'Obtain Switch firmware and prod.keys from your own console',
      'Install firmware via Tools > Install Firmware in Ryujinx',
      'Place prod.keys in F:\\Ryujinx\\system\\',
      'Add Switch NSP or XCI files to F:\\SwitchGames\\',
    ],
    note: 'Requires Switch firmware and prod.keys from your own console.',
  },
  {
    id: 'mame',
    icon: 'M',
    name: 'MAME',
    system: 'Arcade Classics',
    color: '#ff6600',
    url: 'https://www.mamedev.org',
    folder: 'F:\\MAME\\',
    gamesFolder: 'F:\\MAME\\roms\\',
    bios: false,
    steps: [
      'Download MAME from mamedev.org',
      'Extract to F:\\MAME\\',
      'Add ROM zip files to F:\\MAME\\roms\\',
      'Run mame.exe once to generate mame.ini',
    ],
    note: 'Pac-Man, Galaga, Street Fighter, Mortal Kombat and 10,000+ titles.',
  },
  {
    id: 'retroarch',
    icon: 'R',
    name: 'RetroArch',
    system: 'NES / SNES / Genesis / GBA / N64 / PS1',
    color: '#1a1a2e',
    url: 'https://www.retroarch.com',
    folder: 'F:\\RetroArch\\',
    gamesFolder: 'F:\\RetroArchGames\\',
    bios: false,
    steps: [
      'Download RetroArch from retroarch.com',
      'Install to F:\\RetroArch\\',
      'Launch RetroArch and download cores via Online Updater',
      'Organize ROMs into F:\\RetroArchGames\\NES, SNES, Genesis, etc.',
    ],
    note: 'One frontend for 50+ systems. Use Online Updater to grab cores.',
  },
  {
    id: 'project64',
    icon: '64',
    name: 'Project64',
    system: 'Nintendo 64',
    color: '#e4000f',
    url: 'https://www.pj64-emu.com',
    folder: 'F:\\Project64\\',
    gamesFolder: 'F:\\N64Games\\',
    bios: false,
    steps: [
      'Download Project64 from pj64-emu.com',
      'Install to F:\\Project64\\',
      'No BIOS required',
      'Add N64 ROM files (.z64, .n64, .v64) to F:\\N64Games\\',
    ],
    note: 'GoldenEye, Ocarina of Time, Smash Bros. No BIOS needed.',
  },
  {
    id: 'duckstation',
    icon: 'DS',
    name: 'DuckStation',
    system: 'PlayStation 1',
    color: '#003791',
    url: 'https://www.duckstation.org',
    folder: 'F:\\DuckStation\\',
    gamesFolder: 'F:\\PS1Games\\',
    bios: true,
    biosFolder: 'F:\\DuckStation\\bios\\',
    biosFiles: ['SCPH-1001.bin or any PlayStation BIOS .bin'],
    steps: [
      'Download DuckStation from duckstation.org',
      'Extract to F:\\DuckStation\\',
      'Obtain PS1 BIOS files from your own console',
      'Point DuckStation to your BIOS folder in Settings',
      'Add PS1 disc images (.bin/.cue, .iso, .chd) to F:\\PS1Games\\',
    ],
    note: 'Requires PS1 BIOS from your own console. CHD format recommended.',
  },
  {
    id: 'flycast',
    icon: 'DC',
    name: 'Flycast',
    system: 'Dreamcast / NAOMI',
    color: '#ff6600',
    url: 'https://github.com/flyinghead/flycast/releases',
    folder: 'F:\\Flycast\\',
    gamesFolder: 'F:\\DreamcastGames\\',
    bios: true,
    biosFolder: 'F:\\Flycast\\data\\',
    biosFiles: ['dc_boot.bin', 'dc_flash.bin (recommended)'],
    steps: [
      'Download Flycast from GitHub releases',
      'Extract to F:\\Flycast\\',
      'Obtain Dreamcast BIOS (dc_boot.bin) from your own console',
      'Place BIOS in F:\\Flycast\\data\\',
      'Add Dreamcast GDI, CDI, or CHD files to F:\\DreamcastGames\\',
    ],
    note: 'Also emulates NAOMI arcade hardware. GDI in subfolders is supported.',
  },
  {
    id: 'model2',
    icon: 'M2',
    name: 'Model 2 Emulator',
    system: 'Sega Model 2',
    color: '#003366',
    url: 'https://emulation.gametechwiki.com/index.php/Model_2_Emulator',
    folder: 'F:\\Model2\\',
    gamesFolder: 'F:\\Model2Games\\',
    bios: false,
    steps: [
      'Download Model 2 Emulator from GitHub releases',
      'Extract to F:\\Model2\\',
      'Place ROM zips in F:\\Model2Games\\',
      'Run emulator_multicpu.exe once to configure',
    ],
    note: 'Daytona USA, Sega Rally, Virtua Fighter 2, Virtua Cop. No BIOS needed.',
  },
  {
    id: 'model3',
    icon: 'M3',
    name: 'Supermodel (Model 3)',
    system: 'Sega Model 3',
    color: '#003366',
    url: 'https://github.com/trzy/Supermodel/releases',
    folder: 'F:\\Supermodel\\',
    gamesFolder: 'F:\\Model3Games\\',
    bios: false,
    steps: [
      'Download Supermodel from supermodel3.com',
      'Extract to F:\\Supermodel\\',
      'Place ROM zips in F:\\Model3Games\\',
      'Launch via Supermodel.exe <rom.zip> -fullscreen',
    ],
    note: 'Scud Race, Star Wars Trilogy, Virtua Fighter 3, Daytona USA 2. No BIOS needed.',
  },
  {
    id: 'ppsspp',
    icon: 'PSP',
    name: 'PPSSPP',
    system: 'PlayStation Portable',
    color: '#0057a8',
    url: 'https://www.ppsspp.org',
    folder: 'F:\\PPSSPP\\',
    gamesFolder: 'F:\\PSPGames\\',
    bios: false,
    steps: [
      'Download PPSSPP from ppsspp.org',
      'Extract to F:\\PPSSPP\\',
      'No BIOS required',
      'Add PSP ISO or CSO files to F:\\PSPGames\\',
    ],
    note: 'God of War, Monster Hunter, Gran Turismo, GTA. No BIOS needed.',
  },
  {
    id: 'cemu',
    icon: 'WU',
    name: 'Cemu',
    system: 'Wii U',
    color: '#009ac7',
    url: 'https://cemu.info',
    folder: 'F:\\Cemu\\',
    gamesFolder: 'F:\\WiiUGames\\',
    bios: false,
    steps: [
      'Download Cemu from cemu.info',
      'Extract to F:\\Cemu\\',
      'No BIOS required',
      'Add Wii U game folders (with code/*.rpx) to F:\\WiiUGames\\',
      'Or add .wud / .wux disc images to F:\\WiiUGames\\',
    ],
    note: 'Mario Kart 8, Smash Bros., Splatoon, Zelda BOTW. No BIOS needed.',
  },
  {
    id: 'vpx',
    icon: 'PIN',
    name: 'Visual Pinball X',
    system: 'Pinball',
    color: '#cc44ff',
    url: 'https://github.com/vpinball/vpinball/releases',
    folder: 'F:\\vPinball\\',
    gamesFolder: 'F:\\PinballTables\\',
    bios: false,
    steps: [
      'Download VPX installer from GitHub releases',
      'Install to F:\\vPinball\\',
      'Download VPX tables (.vpx files) from vpuniverse.com',
      'Place table files in F:\\PinballTables\\',
    ],
    note: 'VPX tables often include their own assets - drop the whole folder.',
  },
]

export default function SetupGuideScreen({ config, updateConfig, next, prev }) {
  const [collapsed, setCollapsed] = useState({})

  const toggleCollapse = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }))
  const openDownload = (url) => window.open(url, '_blank')

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 2 -- Emulator Setup</div>
      <div className={styles.title}>Install your emulators.</div>
      <div className={styles.sub}>
        NuArcade manages your library automatically -- but each emulator
        needs to be installed separately. You can skip this and come back
        via Settings anytime.
      </div>

      <div className={styles.emuList}>
        {EMULATORS.map(emu => {
          const isCollapsed = collapsed[emu.id]
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
                    {emu.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                  {emu.note && <div className={styles.emuNote}>{emu.note}</div>}
                  <div className={styles.emuPaths}>
                    <span>EMULATOR {emu.folder}</span>
                    {emu.gamesFolder && <span>GAMES {emu.gamesFolder}</span>}
                  </div>
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
