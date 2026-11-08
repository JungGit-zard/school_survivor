import { useEffect, useRef } from 'react'
import { acquireStreamingBgm, isStreamingBgmPlaying } from '../lib/streamingBgm.js'
import { MUSIC_ROOM_TRACKS } from '../lib/musicRoom.js'
import { LOBBY_BGM_URL, LOBBY_BGM_VOLUME, setLobbyBgmYielded } from '../lib/lobbyBgm.js'

// Music room player. Owner rule: BGM never stops, and two songs never sound together.
// - A picked song starts while the song before it (or the lobby music) keeps playing; the
//   old one steps back the moment the new one is sounding ('playing'). A slow stream never
//   leaves a gap, and a song that never loads leaves the old one playing.
// - A song skipped before it sounded is paused at once, so it can never stack on later.
// - Closing the room (or trackId -> null) releases the room song: streamingBgm keeps it as
//   a bridge until the lobby music sounds again.
function createMusicRoomDeck() {
  let current = null // { url, handle } sounding now; null: the lobby music is what plays
  let pending = null // { url, handle, onPlaying } started, not sounding yet

  // Pause before release, so the track is freed instead of bridging.
  const silence = ({ handle }) => {
    handle.setActive(false)
    handle.release()
  }
  const dropPending = () => {
    if (!pending) return
    pending.handle.audio.removeEventListener('playing', pending.onPlaying)
    silence(pending)
    pending = null
  }
  const promote = () => {
    const previous = current
    pending.handle.audio.removeEventListener('playing', pending.onPlaying)
    current = { url: pending.url, handle: pending.handle }
    pending = null
    setLobbyBgmYielded(current.url !== LOBBY_BGM_URL)
    if (previous) silence(previous)
  }
  const backToLobby = () => {
    dropPending()
    if (current) current.handle.release() // still sounding: bridges until the lobby sounds
    current = null
    setLobbyBgmYielded(false)
  }

  return {
    play(url) {
      if (!url) return backToLobby()
      if (url === current?.url) return dropPending()
      if (url === pending?.url) return undefined
      dropPending()
      // The lobby song, or a song still bridging, is already sounding: no 'playing' will come.
      const sounding = isStreamingBgmPlaying(url)
      const handle = acquireStreamingBgm(url, { volume: LOBBY_BGM_VOLUME, active: sounding })
      pending = { url, handle, onPlaying: () => { if (pending?.handle === handle) promote() } }
      if (sounding) return promote()
      handle.audio.addEventListener('playing', pending.onPlaying)
      handle.setActive(true) // start only once listening, so an instant 'playing' is not missed
      return undefined
    },
    close: backToLobby,
  }
}

export default function MusicRoomBgm({ trackId }) {
  const deckRef = useRef(null)
  const url = MUSIC_ROOM_TRACKS.find((track) => track.id === trackId)?.url ?? null

  useEffect(() => {
    const deck = createMusicRoomDeck()
    deckRef.current = deck
    return () => {
      deckRef.current = null
      try { deck.close() } catch { /* audio must never block closing the room */ }
    }
  }, [])

  useEffect(() => {
    try { deckRef.current?.play(url) } catch { /* audio must never break the room */ }
  }, [url])

  return null
}
