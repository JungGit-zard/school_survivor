// Lobby music: the track every lobby-side screen streams (LobbyBgm.jsx) and the music room's
// yield switch. Kept in lib, like titleBgm.js, so the music room still works when a test
// mocks the LobbyBgm component.
export const LOBBY_BGM_URL = 'https://music.escapezombie.com/zombie_soft1.mp3'
export const LOBBY_BGM_VOLUME = 0.5

// Music room (MusicRoomBgm): while it plays another song, every lobby holder steps back so
// two songs never sound together. The room sets this only once its song is sounding, so
// the lobby never leaves a gap. Outside the room it is always false.
let yielded = false
const listeners = new Set()

export function isLobbyBgmYielded() {
  return yielded
}

export function setLobbyBgmYielded(next) {
  const value = Boolean(next)
  if (value === yielded) return
  yielded = value
  for (const listener of [...listeners]) {
    try { listener(value) } catch { /* audio must never throw into UI */ }
  }
}

export function onLobbyBgmYieldChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
