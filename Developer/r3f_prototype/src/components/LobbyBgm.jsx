import { useEffect } from 'react'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'

export const LOBBY_BGM_URL = 'https://music.escapezombie.com/zombie_soft1.mp3'
export const LOBBY_BGM_VOLUME = 0.5

// Lobby music is shared by URL: Lobby and the lobby-side sub screens (coin shop,
// ranking, missions) each mount <LobbyBgm />, and the deferred release in
// streamingBgm hands the same stream over without restarting it.
export default function LobbyBgm() {
  useEffect(() => {
    let handle
    try {
      handle = acquireStreamingBgm(LOBBY_BGM_URL, { volume: LOBBY_BGM_VOLUME })
    } catch {
      return undefined
    }
    return () => handle.release()
  }, [])
  return null
}
