import { useEffect } from 'react'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'
import { TITLE_BGM_URL } from '../lib/titleBgm.js'

// Title-side screens (Rosari's room) hold the title song too. streamingBgm shares
// one stream by URL, so title -> Rosari's room -> title never restarts or stops
// it (owner rule 2026-10-27: music never goes silent mid-session).
export default function TitleBgm() {
  useEffect(() => {
    let handle
    try {
      handle = acquireStreamingBgm(TITLE_BGM_URL, { volume: 0.5 })
    } catch {
      return undefined
    }
    return () => handle.release()
  }, [])
  return null
}
