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
//
// Owner rule (2026-10-27): music never goes silent mid-session. When the last
// holder of an audible track leaves (lobby -> stage, title -> lobby, stage ->
// results -> lobby), that track keeps playing as a "bridge" until the next track
// actually starts sounding ('playing'), so a lazy screen chunk or a slow CDN
// stream never leaves a silent gap. BRIDGE_MAX_MS caps a bridge into a screen
// that has no music of its own.
//
// Self-heal (2026-10-28, phone report "music always stops in dialogue"): the OS
// may pause the element from outside (iOS audio-session interruption when WebAudio
// starts, a call, another app). While the track is still wanted and the tab is
// visible we put it back: on the 'pause' event, on a slow watchdog (covers engines
// that pause without an event or refuse play() for a moment), when the shared
// AudioContext comes back to 'running', and on the next user gesture if autoplay
// is refused. A hidden tab is never fought: wanted() is false there.

import { configureAudioSession, onSharedAudioResume } from './sharedAudioContext.js'

const GESTURE_EVENTS = ['pointerdown', 'touchstart', 'keydown']
export const STALL_RECOVERY_MS = 6000
const MAX_ERROR_RETRY_MS = 30000
export const BRIDGE_MAX_MS = 15000
export const BGM_WATCHDOG_MS = 2000

const players = new Map()

function isHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function createPlayer(url, volume) {
  configureAudioSession()
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
  let bridgeTimer = null

  const wanted = () => !disposed && !isHidden() && (Boolean(bridgeTimer) || [...holders].some((h) => h.active))

  const clearBridge = () => { if (bridgeTimer) { clearTimeout(bridgeTimer); bridgeTimer = null } }

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
    playing: () => {
      clearStall()
      errorDelay = 1000
      // The next track is audible now: end every bridge still covering the gap.
      if (holders.size) for (const other of [...players.values()]) if (other !== player) other.endBridge()
    },
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
  const watchdog = setInterval(() => { if (wanted() && audio.paused) tryPlay() }, BGM_WATCHDOG_MS)

  const dispose = () => {
    disposed = true
    clearInterval(watchdog)
    clearStall()
    clearBridge()
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
    dispose,
    hold(handle) {
      if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null }
      clearBridge()
      holders.add(handle)
    },
    endBridge() {
      if (!bridgeTimer) return
      clearBridge()
      if (!holders.size) dispose()
    },
    drop(handle) {
      holders.delete(handle)
      if (holders.size) { sync(); return }
      // Audible and nobody left: bridge until the next track sounds (or the cap).
      if (!audio.paused && !isHidden() && !bridgeTimer) {
        bridgeTimer = setTimeout(() => { bridgeTimer = null; if (!holders.size) dispose() }, BRIDGE_MAX_MS)
        return
      }
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

// Re-assert every wanted track now (e.g. right after another audio source started).
// Never starts an unwanted or hidden-tab track.
export function resumeStreamingBgm() {
  for (const player of [...players.values()]) player.sync()
}
onSharedAudioResume(resumeStreamingBgm)

export function _streamingBgmPlayersForTests() {
  return players
}

// Tests only: drop every player at once (bridges included).
export function _resetStreamingBgmForTests() {
  for (const player of [...players.values()]) { player.holders.clear(); player.dispose() }
}
