// useMusicPlayer -- background music player using Howler
// Scans F:/Media/Music/ for mp3/ogg/wav files, shuffles and plays them.
// Fades down when gameplay video is active, fades back up after.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'

const FADE_MS       = 800   // fade duration in ms
const DUCK_VOLUME   = 0.08  // volume when bg video is playing (8%)

export function useMusicPlayer({ enabled, volume, hasBgVideo }) {
  const [tracks,      setTracks     ] = useState([])
  const [trackIndex,  setTrackIndex ] = useState(0)
  const [nowPlaying,  setNowPlaying ] = useState(null)
  const [ready,       setReady      ] = useState(false)

  const howlRef     = useRef(null)
  const orderRef    = useRef([])
  const positionRef = useRef(0)
  const targetVol   = useRef(volume / 100)
  const enabledRef  = useRef(enabled)
  const mountedRef  = useRef(true)

  // Shuffle helper
  const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Load track list on mount
  useEffect(() => {
    if (!window.nuarcade?.getMusicTracks) return
    window.nuarcade.getMusicTracks().then(result => {
      const t = result.tracks || []
      if (t.length === 0) return
      setTracks(t)
      orderRef.current = shuffle(t.map((_, i) => i))
      setReady(true)
    }).catch(() => {})

    return () => { mountedRef.current = false }
  }, [])

  // Play a specific track
  const playTrack = useCallback((track) => {
    if (!track || !mountedRef.current) return

    // Stop existing
    if (howlRef.current) {
      howlRef.current.stop()
      howlRef.current.unload()
      howlRef.current = null
    }

    const vol = enabledRef.current ? targetVol.current : 0

    const howl = new Howl({
      src: [track.path],
      volume: 0,
      html5: true,
      onload: () => {
        if (!mountedRef.current) return
        howl.fade(0, vol, FADE_MS)
        setNowPlaying(track.name)
      },
      onend: () => {
        if (!mountedRef.current) return
        // Advance to next in shuffle order
        positionRef.current = (positionRef.current + 1) % orderRef.current.length
        if (positionRef.current === 0) {
          // Re-shuffle when we cycle through all tracks
          orderRef.current = shuffle(tracks.map((_, i) => i))
        }
        const nextIdx = orderRef.current[positionRef.current]
        setTrackIndex(nextIdx)
      },
      onloaderror: () => {
        if (!mountedRef.current) return
        // Skip bad track
        positionRef.current = (positionRef.current + 1) % orderRef.current.length
        const nextIdx = orderRef.current[positionRef.current]
        setTrackIndex(nextIdx)
      },
    })

    howl.play()
    howlRef.current = howl
  }, [tracks])

  // Start playing when ready and enabled
  useEffect(() => {
    if (!ready || !enabled || tracks.length === 0) return
    const idx = orderRef.current[positionRef.current] ?? 0
    playTrack(tracks[idx])
  }, [ready, enabled])

  // Advance to next track
  useEffect(() => {
    if (!ready || !enabled || tracks.length === 0) return
    const idx = orderRef.current[positionRef.current] ?? trackIndex
    playTrack(tracks[idx])
  }, [trackIndex])

  // Volume changes
  useEffect(() => {
    enabledRef.current = enabled
    targetVol.current = volume / 100
    if (!howlRef.current) return
    if (!enabled) {
      howlRef.current.fade(howlRef.current.volume(), 0, FADE_MS)
    } else if (!hasBgVideo) {
      howlRef.current.fade(howlRef.current.volume(), targetVol.current, FADE_MS)
    }
  }, [enabled, volume])

  // Duck when bg video plays, restore when it stops
  useEffect(() => {
    if (!howlRef.current || !enabled) return
    const target = hasBgVideo ? DUCK_VOLUME : targetVol.current
    howlRef.current.fade(howlRef.current.volume(), target, FADE_MS)
  }, [hasBgVideo, enabled])

  const skip = useCallback(() => {
    positionRef.current = (positionRef.current + 1) % orderRef.current.length
    const nextIdx = orderRef.current[positionRef.current]
    setTrackIndex(nextIdx)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (howlRef.current) {
        howlRef.current.stop()
        howlRef.current.unload()
      }
    }
  }, [])

  return { nowPlaying, trackCount: tracks.length, skip }
}
