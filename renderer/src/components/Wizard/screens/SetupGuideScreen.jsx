import { useState } from 'react'
import styles from './Screen.module.css'

const EMULATORS = [
  {
    id: 'teknoparrot',
    icon: '🕹️',
    name: 'TeknoParrot',
    system: 'Arcade',
    color: '#00ff88',
    url: 'https://teknoparrot.com',
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
    icon: '🎮',
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
    icon: '⚙️',
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
      'Add Xbox 360 ISO / XEX files to F:\\Xbox360Games\\',
    ],
    note: 'Easiest setup — no BIOS needed.',
  },
  {
    id: 'dolphin',
    icon: '🐬',
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
    note: 'RVZ format is recommended — smaller and faster than ISO.',
  },
  {
    id: 'pcsx2',
    icon: '💿',
    name: 'PCSX2',
    system: 'PlayStation 2',
    color: '#003791',
    url: 'https://pcsx2.net',
    folder: 'F:\\PCSX2\\',
    gamesFolder: 'F:\\PS2Games\\',
    bios: true,
    steps: [
      'Download PCSX2 from pcsx2.net',
      'Install to F:\\PCSX2\\',
      'Obtain PS2 BIOS files from your own console',
      'Place BIOS files in F:\\PCSX2\\bios\\',
      'Add PS2 ISOs or CHD files to F:\\PS2Games\\',
    ],
    note: '⚠️ Requires PS2 BIOS files from your own console.',
  },
  {
    id: 'ryujinx',
    icon: '🔴',
    name: 'Ryujinx',
    system: 'Nintendo Switch',
    color: '#e4000f',
    url: 'https://ryujinx.org',
    folder: 'F:\\Ryujinx\\',
    gamesFolder: 'F:\\SwitchGames\\',
    bios: true,
    steps: [
      'Download Ryujinx from ryujinx.org',
      'Extract to F:\\Ryujinx\\',
      'Obtain Switch firmware + prod.keys from your own console',
      'Install firmware via Tools → Install Firmware in Ryujinx',
      'Place prod.keys in F:\\Ryujinx\\system\\',
      'Add Switch NSP / XCI files to F:\\SwitchGames\\',
    ],
    note: '⚠️ Requires Switch firmware and prod.keys from your own console.',
  },
  {
    id: 'vpx',
    icon: '🎱',
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
    note: 'VPX tables often include their own assets — just drop the whole folder.',
  },
]

export default function SetupGuideScreen({ config, next, prev }) {
  const [expanded, setExpanded] = useState(null)

  const toggle = (id) => setExpanded(e => e === id ? null : id)

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 4 — Emulator Setup</div>
      <div className={styles.title}>Install your emulators</div>
      <div className={styles.sub}>
        NuArcade manages your library automatically — but each emulator needs
        to be installed separately. Tap any emulator below for setup instructions.
        You can always come back to this later via Settings.
      </div>

      <div className={styles.guideList}>
        {EMULATORS.map(emu => (
          <div key={emu.id} className={styles.guideCard}>
            <div
              className={styles.guideHeader}
              onClick={() => toggle(emu.id)}
            >
              <div className={styles.guideLeft}>
                <span className={styles.guideIcon}>{emu.icon}</span>
                <div>
                  <div className={styles.guideName} style={{ color: emu.color }}>
                    {emu.name}
                  </div>
                  <div className={styles.guideSystem}>{emu.system}</div>
                </div>
              </div>
              <div className={styles.guideRight}>
                {emu.bios && (
                  <span className={styles.biosTag}>BIOS req.</span>
                )}
                <span className={styles.guideChevron}>
                  {expanded === emu.id ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {expanded === emu.id && (
              <div className={styles.guideBody}>
                <div className={styles.guideSteps}>
                  {emu.steps.map((step, i) => (
                    <div key={i} className={styles.guideStep}>
                      <span className={styles.stepNum}>{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {emu.note && (
                  <div className={styles.guideNote}>{emu.note}</div>
                )}

                <div className={styles.guideFolders}>
                  <div className={styles.folderRow}>
                    <span className={styles.folderLabel}>Emulator</span>
                    <code className={styles.folderPath}>{emu.folder}</code>
                  </div>
                  <div className={styles.folderRow}>
                    <span className={styles.folderLabel}>Games</span>
                    <code className={styles.folderPath}>{emu.gamesFolder}</code>
                  </div>
                </div>

                
                  className={styles.guideLink}
                  href={emu.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  ↗ Download {emu.name}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>← Back</button>
        <button className={styles.btnNext} onClick={next}>
          Continue →
        </button>
      </div>
    </div>
  )
}
