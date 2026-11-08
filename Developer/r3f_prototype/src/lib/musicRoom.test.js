import { describe, expect, it } from 'vitest'
import { getTrackStageNumbers, MUSIC_ROOM_TRACKS } from './musicRoom.js'
import { TITLE_BGM_URL } from './titleBgm.js'
import { STAGE_CONFIGS } from './stageConfig.js'
import { LOBBY_BGM_URL } from '../components/LobbyBgm.jsx'
import { getStageBgmUrl, STAGE1_BGM_URL, STAGE2_BGM_URL } from '../components/Stage1Bgm.jsx'

describe('MUSIC_ROOM_TRACKS', () => {
  it('lists the four songs the game plays, in game order, with the screens\' own URLs', () => {
    expect(MUSIC_ROOM_TRACKS).toEqual([
      { id: 'opening', url: TITLE_BGM_URL },
      { id: 'lobby', url: LOBBY_BGM_URL },
      { id: 'stageOdd', url: STAGE1_BGM_URL },
      { id: 'stageEven', url: STAGE2_BGM_URL },
    ])
    expect(new Set(MUSIC_ROOM_TRACKS.map((track) => track.url)).size).toBe(4)
  })

  it('is frozen, entries included', () => {
    expect(Object.isFrozen(MUSIC_ROOM_TRACKS)).toBe(true)
    for (const track of MUSIC_ROOM_TRACKS) expect(Object.isFrozen(track)).toBe(true)
  })

  it('holds the song of every configured stage', () => {
    const urls = new Set(MUSIC_ROOM_TRACKS.map((track) => track.url))
    for (const stageId of Object.keys(STAGE_CONFIGS)) expect(urls.has(getStageBgmUrl(stageId))).toBe(true)
  })
})

describe('getTrackStageNumbers', () => {
  const stageIds = ['stage1', 'stage2', 'stage3', 'stage4']

  it('maps odd stages to stageOdd and even stages to stageEven', () => {
    expect(getTrackStageNumbers('stageOdd', stageIds)).toEqual([1, 3])
    expect(getTrackStageNumbers('stageEven', stageIds)).toEqual([2, 4])
  })

  it('gives [] for opening and lobby', () => {
    expect(getTrackStageNumbers('opening', stageIds)).toEqual([])
    expect(getTrackStageNumbers('lobby', stageIds)).toEqual([])
  })

  it('sorts ascending and skips duplicates and ids that are not stages', () => {
    expect(getTrackStageNumbers('stageOdd', ['stage9', 'stage1', 'stage5', 'stage1', 'bonus', null])).toEqual([1, 5, 9])
    expect(getTrackStageNumbers('stageEven', ['stage10', 'stage2', 'stage4'])).toEqual([2, 4, 10])
  })

  it('gives [] for an unknown track or no stage ids', () => {
    expect(getTrackStageNumbers('nope', stageIds)).toEqual([])
    expect(getTrackStageNumbers(undefined, stageIds)).toEqual([])
    expect(getTrackStageNumbers('stageOdd', undefined)).toEqual([])
    expect(getTrackStageNumbers('stageOdd', [])).toEqual([])
  })

  it('puts every configured stage under exactly one stage song', () => {
    const ids = Object.keys(STAGE_CONFIGS)
    const odd = getTrackStageNumbers('stageOdd', ids)
    const even = getTrackStageNumbers('stageEven', ids)
    expect(odd.length + even.length).toBe(ids.length)
    expect(odd.filter((n) => even.includes(n))).toEqual([])
  })
})
