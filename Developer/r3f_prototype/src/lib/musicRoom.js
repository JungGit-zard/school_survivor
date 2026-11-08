// Music room (lobby menu): every song the game plays, in game order. The URLs are the
// constants the playing screens use, so this list cannot drift from the game.
import { TITLE_BGM_URL } from './titleBgm.js'
import { LOBBY_BGM_URL } from './lobbyBgm.js'
import { getStageBgmUrl, STAGE1_BGM_URL, STAGE2_BGM_URL } from '../components/Stage1Bgm.jsx'

export const MUSIC_ROOM_TRACKS = Object.freeze([
  Object.freeze({ id: 'opening', url: TITLE_BGM_URL }),
  Object.freeze({ id: 'lobby', url: LOBBY_BGM_URL }),
  Object.freeze({ id: 'stageOdd', url: STAGE1_BGM_URL }),
  Object.freeze({ id: 'stageEven', url: STAGE2_BGM_URL }),
])

// Ascending stage numbers among `stageIds` whose stage music is this track. Opening and
// lobby are no stage's music, so they get [].
export function getTrackStageNumbers(trackId, stageIds) {
  const track = MUSIC_ROOM_TRACKS.find((entry) => entry.id === trackId)
  if (!track) return []
  const numbers = new Set()
  for (const stageId of stageIds ?? []) {
    const match = /^stage(\d+)$/.exec(String(stageId))
    if (match && getStageBgmUrl(stageId) === track.url) numbers.add(Number(match[1]))
  }
  return [...numbers].sort((a, b) => a - b)
}
