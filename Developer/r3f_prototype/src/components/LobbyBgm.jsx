import { useEffect } from 'react'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'
import { isLobbyBgmYielded, LOBBY_BGM_URL, LOBBY_BGM_VOLUME, onLobbyBgmYieldChange } from '../lib/lobbyBgm.js'

export { LOBBY_BGM_URL, LOBBY_BGM_VOLUME }

// Lobby music is shared by URL: Lobby and the lobby-side sub screens (coin shop,
// ranking, missions) each mount <LobbyBgm />, and the deferred release in
// streamingBgm hands the same stream over without restarting it.
// While the music room plays another song, every holder steps back (lib/lobbyBgm.js).
export default function LobbyBgm() {
  useEffect(() => {
    let handle
    try {
      handle = acquireStreamingBgm(LOBBY_BGM_URL, { volume: LOBBY_BGM_VOLUME, active: !isLobbyBgmYielded() })
    } catch {
      return undefined
    }
    let resumeTimer = null
    const stopListening = onLobbyBgmYieldChange((yielded) => {
      clearTimeout(resumeTimer)
      resumeTimer = null
      // Stepping back, or back in while the room itself plays the lobby song: at once.
      if (yielded || !handle.audio.paused) { handle.setActive(!yielded); return }
      // Restarting the paused lobby waits a tick: if the room closed because the whole
      // lobby is leaving, this holder is released in the same commit and must not start
      // the lobby over the room song that is bridging into the next screen.
      resumeTimer = setTimeout(() => { resumeTimer = null; handle.setActive(true) }, 0)
    })
    return () => {
      stopListening()
      clearTimeout(resumeTimer)
      handle.release()
    }
  }, [])
  return null
}
