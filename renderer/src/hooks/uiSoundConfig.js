// uiSoundConfig.js -- plain, framework-free normalization for the UI-sound
// Settings fields. No React/DOM/Audio import at all, specifically so it's
// directly importable and testable under native `node --test` (mirrors the
// launchSession/*.js and i18n/locale.js pattern already used throughout
// this codebase for exactly this reason).
//
// Two representations, one clear boundary:
//   - config-facing:  uiSoundVolume is a 0-100 integer percent, matching
//     the existing ambientVolume/musicVolume convention in Settings.
//   - engine-facing:  useArcadeSounds({ volume }) expects a 0-1 gain
//     scale. uiSoundVolumeToGainScale() is the single conversion point
//     between the two -- nothing else in the app should divide/multiply
//     by 100 for this setting.

export const DEFAULT_UI_SOUNDS_ENABLED = true
// 100 (i.e. gain scale 1.0) so a player who has never touched this setting
// hears exactly today's existing loudness -- not a silent behavior change.
export const DEFAULT_UI_SOUND_VOLUME = 100

// Malformed (non-boolean) stored values fall back to the default rather
// than being coerced -- a truthy non-boolean (e.g. a stray string) is not
// trusted as an intentional "on".
export function normalizeUiSoundsEnabled(value) {
  return typeof value === "boolean" ? value : DEFAULT_UI_SOUNDS_ENABLED
}

// Config-facing normalizer: always a 0-100 integer. Rejects non-numbers,
// NaN, and +/-Infinity; clamps everything else into range.
export function normalizeUiSoundVolume(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_UI_SOUND_VOLUME
  return Math.max(0, Math.min(100, Math.round(value)))
}

// The one boundary that converts the stored 0-100 percent into the 0-1
// gain scale useArcadeSounds actually multiplies tone gains by.
export function uiSoundVolumeToGainScale(value) {
  return normalizeUiSoundVolume(value) / 100
}

// Defensive engine-facing normalizer -- used inside useArcadeSounds itself
// in case `volume` is ever supplied directly as a 0-1 scale (not routed
// through uiSoundVolumeToGainScale). Same rejection rules, different range.
export function normalizeGainScale(value, fallback = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(1, value))
}
