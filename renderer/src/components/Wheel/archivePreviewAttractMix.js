// Keeps the Library's Archive View videos silent while Attract Mode owns the
// soundscape. Only the preview that was active on entry may resume on wake;
// the inactive slot stays paused so it cannot compete with Attract ambience.
export function holdArchivePreviewWhileAttract(controller, video) {
  if (!controller?.isSuspended() || !video) return false
  video.pause?.()
  video.muted = true
  return true
}

export function createArchivePreviewAttractMixController({ getActiveSlot, getVideo }) {
  let suspended = false
  let snapshot = null

  const sourceOf = (video) => video?.currentSrc || video?.getAttribute?.("src") || video?.src || ""

  const silenceBoth = () => {
    for (const slot of ["a", "b"]) {
      const video = getVideo(slot)
      if (!video) continue
      video.pause?.()
      video.muted = true
    }
  }

  const enter = () => {
    if (suspended) return
    suspended = true

    const slot = getActiveSlot()
    const video = slot === "a" || slot === "b" ? getVideo(slot) : null
    snapshot = video ? {
      slot,
      video,
      source: sourceOf(video),
      requestId: video.dataset?.archiveRequest ?? null,
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : null,
      wasPlaying: !video.paused && !video.ended,
      muted: video.muted,
      volume: video.volume,
    } : null

    silenceBoth()

    // Capture the exact position after pause() has synchronously settled.
    if (snapshot && Number.isFinite(video.currentTime)) snapshot.currentTime = video.currentTime
  }

  const leave = () => {
    if (!suspended) return
    suspended = false
    const saved = snapshot
    snapshot = null

    // A late media event may have tried to play an inactive slot while the
    // overlay was open. Silence both again before restoring the one owner.
    silenceBoth()
    if (!saved) return

    const video = getVideo(saved.slot)
    if (
      video !== saved.video ||
      sourceOf(video) !== saved.source ||
      (video.dataset?.archiveRequest ?? null) !== saved.requestId
    ) return

    if (saved.currentTime != null && Number.isFinite(saved.currentTime)) {
      try { video.currentTime = saved.currentTime } catch { /* stale media cannot be restored */ }
    }
    video.volume = saved.volume
    video.muted = saved.muted
    if (saved.wasPlaying) Promise.resolve(video.play?.()).catch(() => {})
  }

  const cleanup = () => {
    suspended = false
    snapshot = null
    silenceBoth()
  }

  return { enter, leave, cleanup, isSuspended: () => suspended }
}
