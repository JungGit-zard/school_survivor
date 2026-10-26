import { useEffect, useRef } from 'react'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'

// Owner attachments are already hosted byte-for-byte on Cloudflare R2/CDN.
// The legacy component name is retained to keep the existing gameplay mount unchanged.
// Stream without bundling or transcoding either attachment.
export const STAGE1_BGM_URL = 'https://music.escapezombie.com/zombie_3rd.mp3'
export const STAGE2_BGM_URL = 'https://music.escapezombie.com/zombie_2nd.mp3'
const STAGE_BGM_URLS = Object.freeze({ stage1: STAGE1_BGM_URL, stage2: STAGE2_BGM_URL })

// Music keeps playing through level-up card picks; only the pause menu,
// game over/clear and a hidden tab silence it.
const AUDIBLE_PHASES = new Set(['playing', 'levelup'])

export default function Stage1Bgm({ stageId, phase, gameKey }) {
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const handleRef = useRef(null)
  const bgmUrl = Object.hasOwn(STAGE_BGM_URLS, stageId) ? STAGE_BGM_URLS[stageId] : undefined
  const enabled = Boolean(bgmUrl) && phase !== 'gameover' && phase !== 'cleared'

  useEffect(() => {
    if (!enabled) return undefined
    let handle
    try {
      handle = acquireStreamingBgm(bgmUrl, { volume: 0.5, active: AUDIBLE_PHASES.has(phaseRef.current) })
    } catch {
      return undefined
    }
    handleRef.current = handle
    return () => {
      handleRef.current = null
      handle.release()
    }
  }, [enabled, bgmUrl, gameKey])

  useEffect(() => { handleRef.current?.setActive(AUDIBLE_PHASES.has(phase)) }, [phase])
  return null
}
