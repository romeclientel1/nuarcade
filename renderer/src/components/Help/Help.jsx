import { useRef } from 'react'
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import styles from './Help.module.css'

const SHORTCUTS = [
  { key: 'Arrow Left / Right', desc: 'Navigate the game wheel' },
  { key: 'Enter', desc: 'Open game detail' },
  { key: 'Space', desc: 'Quick launch (skip detail screen)' },
  { key: 'Escape', desc: 'Close / go back' },
  { key: 'F', desc: 'Toggle favorite' },
  { key: 'R', desc: 'Pick a random game' },
  { key: 'N', desc: 'Open collections manager' },
  { key: 'T', desc: 'Open stats dashboard' },
  { key: 'A', desc: 'Open achievements' },
  { key: 'C', desc: 'Cabinet mode (hide UI chrome)' },
  { key: 'S', desc: 'Screenshot mode (hide all UI)' },
  { key: '?', desc: 'Show this help screen' },
]

const GAMEPAD = [
  { key: 'D-pad Left / Right', desc: 'Navigate the game wheel' },
  { key: 'Left Stick', desc: 'Navigate the game wheel' },
  { key: 'LB / RB (bumpers)', desc: 'Scroll category filter left / right' },
  { key: 'A button', desc: 'Open game detail / confirm' },
  { key: 'B button', desc: 'Go back / close' },
  { key: 'Y button', desc: 'Toggle favorite' },
  { key: 'X button', desc: 'Pick a random game' },
  { key: 'Start', desc: 'Open settings' },
]

const EMULATORS = [
  { icon: 'TP', name: 'TeknoParrot',    systems: 'Arcade (SEGA, Namco, Raw Thrills, Taito...)' },
  { icon: 'M',  name: 'MAME',           systems: 'Arcade classics (Pac-Man, Street Fighter, 10,000+ titles)' },
  { icon: 'M2', name: 'Model 2',        systems: 'Sega Model 2 (Daytona USA, Virtua Fighter 2, Sega Rally)' },
  { icon: 'M3', name: 'Supermodel',     systems: 'Sega Model 3 (Scud Race, VF3, Star Wars Trilogy)' },
  { icon: 'R',  name: 'RetroArch',      systems: 'NES, SNES, Genesis, GBA, N64, PS1, Game Boy + 50 more' },
  { icon: '64', name: 'Project64',      systems: 'Nintendo 64 (GoldenEye, Zelda OOT, Smash Bros.)' },
  { icon: 'DS', name: 'DuckStation',    systems: 'PlayStation 1 (Crash, FFVII, Metal Gear Solid)' },
  { icon: 'DC', name: 'Flycast',        systems: 'Dreamcast / NAOMI arcade' },
  { icon: 'XB', name: 'Xemu',            systems: 'Original Xbox (Halo, Fable, Jet Set Radio Future)' },
  { icon: 'XB', name: 'Cxbx-Reloaded',   systems: 'Original Xbox (fallback for titles Xemu struggles with)' },
  { icon: 'PSP',name: 'PPSSPP',         systems: 'PlayStation Portable' },
  { icon: 'PS2',name: 'PCSX2',          systems: 'PlayStation 2' },
  { icon: 'PS3',name: 'RPCS3',          systems: 'PlayStation 3' },
  { icon: 'X',  name: 'Xenia',          systems: 'Xbox 360' },
  { icon: 'GC', name: 'Dolphin',        systems: 'GameCube / Wii' },
  { icon: 'WU', name: 'Cemu',           systems: 'Wii U (Mario Kart 8, Zelda BOTW)' },
  { icon: 'NSW',name: 'Ryujinx',        systems: 'Nintendo Switch' },
  { icon: 'VPX',name: 'Visual Pinball', systems: 'Pinball tables (.vpx)' },
]

export default function Help({ onClose }) {
  const bodyRef = useRef(null)
  useOverlayGamepad({
    onClose,
    onUp:   () => bodyRef.current?.scrollBy({ top: -80, behavior: 'smooth' }),
    onDown: () => bodyRef.current?.scrollBy({ top:  80, behavior: 'smooth' }),
  })
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} ref={bodyRef}>
        <div className={styles.header}>
          <div className={styles.title}>NuArcade Help</div>
          <button className={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div className={styles.body} ref={bodyRef}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Keyboard Shortcuts</div>
            <div className={styles.list}>
              {SHORTCUTS.map((s, i) => (
                <div key={i} className={styles.row}>
                  <div className={styles.key}>{s.key}</div>
                  <div className={styles.desc}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Gamepad / Controller</div>
            <div className={styles.list}>
              {GAMEPAD.map((s, i) => (
                <div key={i} className={styles.row}>
                  <div className={styles.key}>{s.key}</div>
                  <div className={styles.desc}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Supported Emulators (16)</div>
            <div className={styles.emuGrid}>
              {EMULATORS.map((e, i) => (
                <div key={i} className={styles.emuRow}>
                  <span className={styles.emuIcon}>{e.icon}</span>
                  <div>
                    <div className={styles.emuName}>{e.name}</div>
                    <div className={styles.emuSystems}>{e.systems}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>Press ? or click anywhere to close</div>
      </div>
    </div>
  )
}
