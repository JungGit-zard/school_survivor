import { useEffect } from 'react'
import { Howl } from 'howler'

export const LOBBY_BGM_URL = 'https://music.escapezombie.com/zombie_soft1.mp3'
export const LOBBY_BGM_VOLUME = 0.5

// HTML5 streaming avoids Web Audio's cross-origin fetch/CORS requirement.
// Own one instance only while the stage-selection lobby is mounted.
export default function LobbyBgm() {
  useEffect(() => {
    let audio
    let disposed = false
    let pending = false
    let playing = false
    const tryPlay = () => {
      if (disposed || pending || playing || document.visibilityState === 'hidden') return
      pending = true
      try { audio.play() } catch { pending = false }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pending = false
        playing = false
        try { audio.pause() } catch { /* Music must not block navigation. */ }
      } else {
        tryPlay()
      }
    }
    try {
      audio = new Howl({
        src: [LOBBY_BGM_URL],
        format: ['mp3'],
        html5: true,
        loop: true,
        preload: true,
        volume: LOBBY_BGM_VOLUME,
        onplay: () => {
          if (disposed) return
          pending = false
          playing = true
          if (document.visibilityState === 'hidden') onVisibility()
        },
        onplayerror: () => { if (!disposed) { pending = false; playing = false } },
        onloaderror: () => { if (!disposed) { pending = false; playing = false } },
      })
    } catch {
      return undefined
    }
    // Retry only on gestures/foreground events. A numeric Howler voice ID is
    // not proof of playback; pending is cleared by the callbacks above.
    for (const event of ['pointerdown', 'touchstart', 'keydown']) {
      window.addEventListener(event, tryPlay)
    }
    document.addEventListener('visibilitychange', onVisibility)
    tryPlay()
    return () => {
      disposed = true
      for (const event of ['pointerdown', 'touchstart', 'keydown']) {
        window.removeEventListener(event, tryPlay)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      try { audio.stop() } catch { /* Continue releasing the instance. */ }
      try { audio.unload() } catch { /* Navigation remains available. */ }
    }
  }, [])
  return null
}
