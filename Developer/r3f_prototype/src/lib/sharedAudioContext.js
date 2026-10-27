// One audio session for the whole app (2026-10-28, soundmini).
//
// Phone bug: stage music kept playing on level-up but ALWAYS stopped in dialogue.
// Level-up only plays Howler SFX on Howler's already-running AudioContext.
// Dialogue was the only place that created a SECOND AudioContext (dialogueVoice)
// and resumed it, outside any user gesture. Device: Galaxy Z Flip 6, Android app =
// TWA (Chrome runtime, android/.../MainActivity extends LauncherActivity). A second
// context opens a second native output stream next to the media element's, and the
// OS audio-focus / session layer (Android, and iOS Safari likewise) can pause the
// streaming <audio> element. The pause listener in streamingBgm is the safety net.
// Rules here:
//   1. Every WebAudio user shares Howler's context; a private one is a fallback
//      only when Howler is on its HTML5 path (no WebAudio).
//   2. Howler must not auto-suspend that context after 30 s of idle SFX: every
//      suspend -> resume pair is another session re-activation on iOS, and an idle
//      suspend would also cut a dialogue voice mid-line.
//   3. Pin the Audio Session API type (iOS 17+ Safari) so the session category does
//      not flip between "media" and "WebAudio" while both are sounding.
//      'playback' (not 'ambient'): 'ambient' obeys the iPhone silent switch and would
//      mute the music players already hear today. It is one constant to flip.
import { Howler } from 'howler'

export const AUDIO_SESSION_TYPE = 'playback'

let fallbackContext = null
const resumeListeners = new Set()
const watchedContexts = new WeakSet()

// Called whenever the shared context returns to 'running' (after an iOS
// 'interrupted' or a suspend), so the BGM can re-assert itself.
export function onSharedAudioResume(listener) {
  resumeListeners.add(listener)
  return () => resumeListeners.delete(listener)
}

function watchContext(context) {
  if (!context || watchedContexts.has(context) || typeof context.addEventListener !== 'function') return context
  watchedContexts.add(context)
  try {
    context.addEventListener('statechange', () => {
      if (context.state !== 'running') return
      for (const listener of [...resumeListeners]) { try { listener() } catch { /* ignore */ } }
    })
  } catch { /* ignore */ }
  return context
}

// Tests mock 'howler' in several shapes (some without Howler at all), so every
// Howler touch is guarded. Audio must never throw into gameplay.
function howlerGlobal() {
  try { return Howler ?? null } catch { return null }
}

export function configureAudioSession() {
  try {
    const session = typeof navigator !== 'undefined' ? navigator.audioSession : null
    if (session && 'type' in session && session.type !== AUDIO_SESSION_TYPE) session.type = AUDIO_SESSION_TYPE
  } catch { /* unsupported engine: keep the default */ }
  try {
    const howler = howlerGlobal()
    if (howler) howler.autoSuspend = false
  } catch { /* ignore */ }
}

export function getSharedAudioContext() {
  configureAudioSession()
  try {
    const howler = howlerGlobal()
    if (howler && howler.usingWebAudio !== false) {
      // Howler builds its context + master gain lazily; volume() with no value
      // only runs that setup and returns the current volume.
      if (!howler.ctx && typeof howler.volume === 'function') howler.volume()
      if (howler.ctx && howler.ctx.state !== 'closed') return watchContext(howler.ctx)
    }
  } catch { /* fall through to the single fallback context */ }
  if (fallbackContext && fallbackContext.state !== 'closed') return watchContext(fallbackContext)
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextCtor) return null
  try { fallbackContext = new AudioContextCtor() } catch { return null }
  return watchContext(fallbackContext)
}
