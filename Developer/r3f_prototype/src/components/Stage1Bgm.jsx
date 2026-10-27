import { useEffect } from 'react'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'

// Owner attachments are already hosted byte-for-byte on Cloudflare R2/CDN.
// The legacy component name is retained to keep the existing gameplay mount unchanged.
// Stream without bundling or transcoding either attachment.
export const STAGE1_BGM_URL = 'https://music.escapezombie.com/zombie_3rd.mp3'
export const STAGE2_BGM_URL = 'https://music.escapezombie.com/zombie_2nd.mp3'
const STAGE_BGM_URLS = Object.freeze({ stage1: STAGE1_BGM_URL, stage2: STAGE2_BGM_URL })

// Stages 3+ have no owner-assigned track yet and no other music system, so no
// stage is ever silent: odd stages reuse zombie_3rd, even stages zombie_2nd.
export function getStageBgmUrl(stageId) {
  if (Object.hasOwn(STAGE_BGM_URLS, stageId)) return STAGE_BGM_URLS[stageId]
  const match = /^stage(\d+)$/.exec(String(stageId ?? ''))
  if (!match) return undefined
  return Number(match[1]) % 2 === 1 ? STAGE1_BGM_URL : STAGE2_BGM_URL
}

// Owner rule (2026-10-27): stage music never stops for the story intro, NPC
// dialogue, quest inventory, the pause menu, level-up or the results screen.
// The track is held for the whole stage visit, so `phase` is intentionally not
// read here; only a hidden tab silences it (inside streamingBgm).
export default function Stage1Bgm({ stageId, gameKey }) {
  const bgmUrl = getStageBgmUrl(stageId)

  useEffect(() => {
    if (!bgmUrl) return undefined
    let handle
    try {
      handle = acquireStreamingBgm(bgmUrl, { volume: 0.5 })
    } catch {
      return undefined
    }
    return () => handle.release()
  }, [bgmUrl, gameKey])

  return null
}
