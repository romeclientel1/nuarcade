import { useState, useEffect, useRef } from 'react'
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import { useArcadeSounds } from '../../hooks/useArcadeSounds'
import { useI18n } from '../../i18n/I18nContext.js'
import styles from './PlayerSelect.module.css'

const MAX_NAME_LEN = 12

// Focus indices -- no wizard button
const EXIT_IDX   = 0
const NEW_P_IDX  = 1
const GUEST_IDX  = 2

export default function PlayerSelect({ profiles, onSelect, onGuest, onAdd, onDelete, uiSoundsEnabled, uiSoundVolume }) {
  // Raw config passthrough -- useArcadeSounds is the single normalization/
  // conversion boundary (0-100 percent -> 0-1 gain scale), matching the
  // Home/Wheel wiring. Pre-converting here would be a second, redundant
  // conversion.
  const snd = useArcadeSounds({ enabled: uiSoundsEnabled, volume: uiSoundVolume })
  const { t } = useI18n()

  const [adding,    setAdding   ] = useState(false)
  const [name,      setName     ] = useState('')
  const [focusIdx,  setFocusIdx ] = useState(NEW_P_IDX)
  const focusRef = useRef(NEW_P_IDX)
  const inputRef = useRef(null)
  const [exitConfirm, setExitConfirm] = useState(false)

  // Keep focusRef in sync
  useEffect(() => { focusRef.current = focusIdx }, [focusIdx])

  // Play coin sound on mount
  useEffect(() => { snd.coin() }, [])

  // Profile slots: EXIT(0), profiles(1..N), NewPlayer(N+1), Guest(N+2)
  const profileEnd = profiles.length
  const newPIdx    = profileEnd + 1
  const guestIdx   = profileEnd + 2
  const maxIdx     = guestIdx

  // Native-focus / focusIdx reconciliation -- one bounded ref map plus one
  // effect. Keyboard- and controller-driven focus changes move real DOM
  // focus to match focusIdx (so Tab continuation, :focus-visible, and
  // screen readers all agree with the visual target); mouse-hover-driven
  // changes deliberately do NOT steal real focus (hover stays the weaker,
  // non-focus-stealing indicator the milestone calls for), and are
  // suppressed via a one-shot ref flag consumed by the same effect. While
  // the add-player input is open, its own autoFocus owns real focus and
  // this effect stands down entirely; the moment it closes, focus returns
  // to the current slot.
  const slotRefs = useRef({})
  const registerSlot = (idx) => (el) => { slotRefs.current[idx] = el }
  const suppressNativeFocusRef = useRef(false)

  useEffect(() => {
    if (adding) return
    if (suppressNativeFocusRef.current) { suppressNativeFocusRef.current = false; return }
    slotRefs.current[focusIdx]?.focus?.({ preventScroll: true })
  }, [focusIdx, adding])

  const hoverFocus = (idx) => {
    if (focusRef.current === idx) return
    suppressNativeFocusRef.current = true
    setFocusIdx(idx)
  }

  // Shared bounded movement -- the single place "previous"/"next" is
  // resolved for both keyboard and controller, so they cannot drift into
  // separate clamping or sound rules. Clamps to EXIT_IDX/maxIdx, plays
  // snd.navigate() only when the clamped result actually differs from the
  // current index (so repeated input at a boundary stays silent), and
  // always returns the resulting index through the functional setFocusIdx
  // form -- never a stale outer-scope value.
  const moveFocus = (direction) => {
    if (adding) return
    setFocusIdx(i => {
      const next = direction < 0 ? Math.max(EXIT_IDX, i - 1) : Math.min(maxIdx, i + 1)
      if (next !== i) snd.navigate()
      return next
    })
  }

  const syncFromNativeFocus = (idx) => () => {
    if (focusRef.current !== idx) setFocusIdx(idx)
  }

  const handleExit = () => {
    if (exitConfirm) {
      window.nuarcade?.quit?.()
    } else {
      setExitConfirm(true)
      setTimeout(() => setExitConfirm(false), 3000)
    }
  }

  const confirmFocused = () => {
    if (adding) return
    snd.select()
    const cur = focusRef.current
    if (cur === EXIT_IDX)  { handleExit(); return }
    if (cur >= 1 && cur <= profileEnd) {
      const p = profiles[cur - 1]
      onSelect(p); return
    }
    if (cur === newPIdx)   { setAdding(true); return }
    if (cur === guestIdx)  { onGuest(); return }
  }

  useOverlayGamepad({
    onUp:      () => moveFocus(-1),
    onDown:    () => moveFocus(1),
    onLeft:    () => moveFocus(-1),
    onRight:   () => moveFocus(1),
    onConfirm: () => confirmFocused(),
    onClose:   () => { if (adding) { setAdding(false); setName('') } },
    enabled:   true,
  })

  // Keyboard parity -- routes through the exact same moveFocus() helper
  // the controller uses above, so the two can't drift into separate
  // clamping or sound rules. Ordinary text-input keys (letters, digits,
  // cursor keys, editing keys) inside the add-player field are never seen
  // by this handler: the INPUT/TEXTAREA guard below returns before any of
  // the navigation branches run, so the field's own onKeyDown (Enter
  // submits, Escape cancels) remains the sole handler for that element --
  // no double-processing of the same keydown event.
  //
  // Enter on a natively-focused <button> is deliberately left to the
  // browser's own default activation (which fires that button's onClick)
  // rather than also calling confirmFocused() here -- both would
  // otherwise fire for the same keypress. confirmFocused() remains the
  // path for Enter when nothing has native focus yet (e.g. before the
  // native-focus-sync effect has run), matching what onConfirm from the
  // gamepad already does unconditionally.
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (tag === "BUTTON" && e.key === "Enter") return
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        moveFocus(-1)
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        moveFocus(1)
      } else if (e.key === "Enter") {
        confirmFocused()
      } else if (e.key === "Escape") {
        // No back destination exists from the main Player Select screen --
        // Escape only ever cancels the inline add-player state.
        if (adding) { setAdding(false); setName('') }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [adding, maxIdx, snd])

  const isFocused = (idx) => focusIdx === idx

  return (
    <div className={styles.overlay}>
      <div className={styles.grid} />
      <div className={styles.scanlines} />

      {/* Spinning coin animation */}
      <div className={styles.coin} aria-hidden="true">
        <div className={styles.coinFace}>Nu</div>
      </div>

      {/* Running pixel character */}
      <div className={styles.runner} aria-hidden="true">
        <div className={styles.runnerHead} />
        <div className={styles.runnerVisor} />
        <div className={styles.runnerBody} />
        <div className={styles.runnerLegL} />
        <div className={styles.runnerLegR} />
        <div className={styles.runnerArmL} />
        <div className={styles.runnerArmR} />
      </div>

      {/* EXIT button top-left */}
      <button
        ref={registerSlot(EXIT_IDX)}
        className={[styles.exitBtn, exitConfirm ? styles.exitConfirm : '', isFocused(EXIT_IDX) ? styles.focused : ''].join(' ')}
        onClick={() => { snd.back(); handleExit() }}
        onMouseEnter={() => hoverFocus(EXIT_IDX)}
        onFocus={syncFromNativeFocus(EXIT_IDX)}
      >
        {exitConfirm ? t("playerSelect.confirmExit") : t("playerSelect.exit")}
      </button>

      <div className={styles.content}>

        {/* Brand + Headline */}
        <div className={styles.brand}>NuArcade</div>
        <div className={styles.headline}>{t("playerSelect.headline")}</div>
        <div className={styles.sub}>{t("playerSelect.sub")}</div>

        {/* Existing profiles */}
        {profiles.length > 0 && (
          <div className={styles.profileRow}>
            {profiles.map((p, i) => (
              <button
                key={p.id}
                ref={registerSlot(1 + i)}
                className={[styles.profileBtn, isFocused(1 + i) ? styles.profileBtnActive : ''].join(' ')}
                onClick={() => { snd.select(); onSelect(p) }}
                onMouseEnter={() => hoverFocus(1 + i)}
                onFocus={syncFromNativeFocus(1 + i)}
              >
                <span className={styles.profileIcon}>{p.name[0].toUpperCase()}</span>
                <span className={styles.profileName}>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Add new player */}
        {adding ? (
          <div className={styles.addRow}>
            <input
              ref={inputRef}
              className={styles.nameInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("playerSelect.namePlaceholder")}
              maxLength={MAX_NAME_LEN}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) { snd.select(); onAdd(name.trim()); setAdding(false); setName('') }
                if (e.key === 'Escape') { setAdding(false); setName('') }
              }}
              autoFocus
            />
            <button className={styles.confirmBtn} onClick={() => {
              if (name.trim()) { snd.select(); onAdd(name.trim()); setAdding(false); setName('') }
            }}>{t("playerSelect.confirm")}</button>
            <button className={styles.cancelBtn} onClick={() => { setAdding(false); setName('') }}>{t("playerSelect.cancel")}</button>
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button
              ref={registerSlot(newPIdx)}
              className={[styles.btnNewPlayer, isFocused(newPIdx) ? styles.focused : ''].join(' ')}
              onClick={() => setAdding(true)}
              onMouseEnter={() => hoverFocus(newPIdx)}
              onFocus={syncFromNativeFocus(newPIdx)}
            >
              <span className={styles.btnIcon}>+</span>
              {t("playerSelect.addPlayer")}
            </button>
            <button
              ref={registerSlot(guestIdx)}
              className={[styles.btnGuest, isFocused(guestIdx) ? styles.focused : ''].join(' ')}
              onClick={onGuest}
              onMouseEnter={() => hoverFocus(guestIdx)}
              onFocus={syncFromNativeFocus(guestIdx)}
            >
              {t("playerSelect.guest")}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
