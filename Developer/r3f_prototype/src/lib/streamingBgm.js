// Shared streaming BGM player for CDN music (music.escapezombie.com).
//
// Why not Howler html5: Howler loops html5 audio with a setTimeout sized to the
// track duration, then stop()+play(). While a streamed track stalls on the
// network, playback falls behind that wall-clock timer, so the song jumps back
// to 0 mid-phrase (or gaps at the seam). A native <audio loop> follows the real
// playhead and loops without a timer.
//
// One player per URL is shared by every holder. Release is deferred by a tick,
// so when one screen unmounts and the next mounts in the same React commit with
// the same track (lobby -> coin shop, StrictMode remount), the music continues.

const GESTURE_EVENTS = ['pointerdown', 'touchstart', 'keydown']
export const STALL_RECOVERY_MS = 6000
const MAX_ERROR_RETRY_MS = 30000

const players = new Map()

function isHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function createPlayer(url, volume) {
  const audio = new Audio()
  audio.preload = 'auto'
  audio.loop = true
  audio.volume = volume
  audio.src = url

  const holders = new Set()
  let releaseTimer = null
  let stallTimer = null
  let errorTimer = null
  let errorDelay = 1000
  let lastTime = 0
  let disposed = false

  const wanted = () => !disposed && !isHidden() && [...holders].some((h) => h.active)

  const clearStall = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null } }

  const tryPlay = () => {
    if (!wanted() || !audio.paused) return
    try {
      const result = audio.play()
      if (result && typeof result.catch === 'function') result.catch(() => { /* gesture retry */ })
    } catch { /* gesture retry */ }
  }

  const sync = () => {
    if (disposed) return
    if (wanted()) {
      tryPlay()
    } else {
      clearStall()
      try { audio.pause() } catch { /* never block navigation */ }
    }
  }

  // Reload the stream and resume where it stopped.
  const reload = () => {
    if (disposed) return
    clearStall()
    const resumeAt = audio.currentTime || lastTime || 0
    const onMeta = () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      try { if (resumeAt > 0 && (!audio.duration || resumeAt < audio.duration)) audio.currentTime = resumeAt } catch { /* start over */ }
      sync()
    }
    audio.addEventListener('loadedmetadata', onMeta)
    try { audio.load() } catch { /* error handler retries */ }
    sync()
  }

  const armStallWatch = () => {
    if (stallTimer || !wanted()) return
    const startedAt = audio.currentTime
    stallTimer = setTimeout(() => {
      stallTimer = null
      if (wanted() && audio.currentTime === startedAt) reload()
    }, STALL_RECOVERY_MS)
  }

  const handlers = {
    playing: () => { clearStall(); errorDelay = 1000 },
    timeupdate: () => { lastTime = audio.currentTime; clearStall() },
    waiting: armStallWatch,
    stalled: armStallWatch,
    error: () => {
      if (disposed || errorTimer) return
      errorTimer = setTimeout(() => { errorTimer = null; reload() }, errorDelay)
      errorDelay = Math.min(errorDelay * 2, MAX_ERROR_RETRY_MS)
    },
    // loop=true should never end; this covers engines that ignore loop on streams.
    ended: () => {
      try { audio.currentTime = 0 } catch { /* ignore */ }
      sync()
    },
    // An OS interruption (call, other media) can pause us while still wanted.
    pause: () => { if (wanted()) setTimeout(sync, 0) },
  }
  for (const [event, handler] of Object.entries(handlers)) audio.addEventListener(event, handler)
  const onVisibility = () => sync()
  const onGesture = () => tryPlay()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onVisibility)
  window.addEventListener('focus', onVisibility)
  for (const event of GESTURE_EVENTS) window.addEventListener(event, onGesture)

  const dispose = () => {
    disposed = true
    clearStall()
    if (errorTimer) clearTimeout(errorTimer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onVisibility)
    window.removeEventListener('focus', onVisibility)
    for (const event of GESTURE_EVENTS) window.removeEventListener(event, onGesture)
    for (const [event, handler] of Object.entries(handlers)) audio.removeEventListener(event, handler)
    try { audio.pause() } catch { /* ignore */ }
    try { audio.removeAttribute('src'); audio.load() } catch { /* ignore */ }
    if (players.get(url) === player) players.delete(url)
  }

  const player = {
    audio,
    holders,
    sync,
    hold(handle) {
      if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null }
      holders.add(handle)
    },
    drop(handle) {
      holders.delete(handle)
      if (holders.size) { sync(); return }
      // Defer so a same-track holder mounting in this commit keeps the music going.
      if (!releaseTimer) releaseTimer = setTimeout(() => { releaseTimer = null; if (!holders.size) dispose() }, 0)
    },
  }
  return player
}

/**
 * Acquire the shared looping stream for `url`. Returns a handle:
 *   setActive(bool) - whether this holder wants the music audible now
 *   release()       - drop the hold (the player is freed a tick later if unused)
 */
export function acquireStreamingBgm(url, { volume = 0.5, active = true } = {}) {
  let player = players.get(url)
  if (!player) {
    player = createPlayer(url, volume)
    players.set(url, player)
  }
  const handle = { active }
  player.hold(handle)
  player.sync()
  let released = false
  return {
    audio: player.audio,
    setActive(next) {
      if (released) return
      handle.active = Boolean(next)
      player.sync()
    },
    release() {
      if (released) return
      released = true
      player.drop(handle)
    },
  }
}

export function _streamingBgmPlayersForTests() {
  return players
}
