import { useEffect, useRef } from 'react'
import { Howl } from 'howler'

// Owner attachments are already hosted byte-for-byte on Cloudflare R2/CDN.
// The legacy component name is retained to keep the existing gameplay mount unchanged.
// Stream without bundling or transcoding either attachment.
export const STAGE1_BGM_URL = 'https://music.escapezombie.com/zombie_3rd.mp3'
export const STAGE2_BGM_URL = 'https://music.escapezombie.com/zombie_2nd.mp3'
const STAGE_BGM_URLS = Object.freeze({ stage1: STAGE1_BGM_URL, stage2: STAGE2_BGM_URL })

export default function Stage1Bgm({ stageId, phase, gameKey }) {
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const syncRef = useRef(null)
  const bgmUrl = Object.hasOwn(STAGE_BGM_URLS, stageId) ? STAGE_BGM_URLS[stageId] : undefined
  const enabled = Boolean(bgmUrl) && phase !== 'gameover' && phase !== 'cleared'

  useEffect(() => {
    if (!enabled) return undefined
    let audio
    let disposed = false
    let pending = false
    let playing = false
    let voiceId
    const canPlay = () => !disposed && phaseRef.current === 'playing' && document.visibilityState !== 'hidden'
    const sync = () => {
      if (disposed) return
      if (!canPlay()) {
        pending = false
        playing = false
        try { audio.pause() } catch { /* Music must not block gameplay. */ }
        return
      }
      if (pending || playing) return
      pending = true
      try {
        if (audio.state() === 'unloaded') audio.load()
        const id = audio.play(voiceId)
        if (typeof id === 'number') voiceId = id
      } catch { pending = false }
    }
    try {
      audio = new Howl({
        src: [bgmUrl],
        format: ['mp3'],
        html5: true,
        loop: true,
        preload: true,
        volume: 0.5,
        onplay: (id) => {
          if (disposed) return
          voiceId = id
          pending = false
          playing = true
          if (!canPlay()) sync()
        },
        onplayerror: () => { if (!disposed) { pending = false; playing = false } },
        onloaderror: () => { if (!disposed) { pending = false; playing = false } },
      })
    } catch {
      return undefined
    }
    syncRef.current = sync
    for (const event of ['pointerdown', 'touchstart', 'keydown']) window.addEventListener(event, sync)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      disposed = true
      syncRef.current = null
      for (const event of ['pointerdown', 'touchstart', 'keydown']) window.removeEventListener(event, sync)
      document.removeEventListener('visibilitychange', sync)
      try { audio.stop() } catch { /* Always attempt unload too. */ }
      try { audio.unload() } catch { /* Leaving the stage must remain available. */ }
    }
  }, [enabled, bgmUrl, gameKey])

  useEffect(() => { syncRef.current?.() }, [phase])
  return null
}
