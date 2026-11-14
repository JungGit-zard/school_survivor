// @vitest-environment jsdom
// 로자리의 방 라디오: 게임 음악 전부가 목록에 있고, 재생은 방 음악을 대체하며(무음 없음, 두 곡 동시 없음),
// 끄기/방 나가기에서 방 음악이 돌아온다. 실제 LobbyBgm(방 음악 홀더)과 실제 streamingBgm을 그대로 돌린다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ROOM_MUSIC_TRACK_ID,
  ROOM_RADIO_TRACKS,
  _resetRoomRadioForTests,
  listGameBgmUrls,
  roomRadio,
} from './roomRadio.js'
import { TITLE_BGM_URL } from './titleBgm.js'
import { LOBBY_BGM_URL, isLobbyBgmYielded, setLobbyBgmYielded } from './lobbyBgm.js'
import { STAGE_CONFIGS, VISIBLE_STAGE_IDS } from './stageConfig.js'
import { getStageBgmUrl, STAGE5_BGM_URL, STAGE6_BGM_URL } from '../components/Stage1Bgm.jsx'
import LobbyBgm from '../components/LobbyBgm.jsx'
import { BRIDGE_MAX_MS, _resetStreamingBgmForTests } from './streamingBgm.js'
import { _resetAudioSettingsForTests, setMusicVolume } from './audioSettings.js'
import { installFakeAudio } from './fakeStreamingAudio.testUtil.js'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

// ---------------------------------------------------------------------------
// 게임 소스에 적힌 음악 URL 전부(테스트 파일 제외). 새 BGM 상수가 어디에 생겨도 여기서 잡힌다.
const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const MUSIC_URL = /https:\/\/music\.escapezombie\.com\/[\w./-]+\.(?:mp3|ogg|m4a|wav|opus)/g

function sourceMusicUrls(dir = SRC_DIR, found = new Set()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'assets') sourceMusicUrls(path, found); continue }
    if (!/\.(jsx?|mjs)$/.test(entry.name) || /\.test\.|testUtil/.test(entry.name)) continue
    for (const url of readFileSync(path, 'utf8').match(MUSIC_URL) ?? []) found.add(url)
  }
  return found
}

describe('ROOM_RADIO_TRACKS (곡 목록)', () => {
  const urls = ROOM_RADIO_TRACKS.map((track) => track.url)

  it('비어 있지 않고 id·URL이 겹치지 않으며 얼어 있다', () => {
    expect(ROOM_RADIO_TRACKS.length).toBeGreaterThan(0)
    expect(new Set(urls).size).toBe(urls.length)
    expect(new Set(ROOM_RADIO_TRACKS.map((track) => track.id)).size).toBe(urls.length)
    expect(Object.isFrozen(ROOM_RADIO_TRACKS)).toBe(true)
    for (const track of ROOM_RADIO_TRACKS) expect(Object.isFrozen(track)).toBe(true)
  })

  it('게임 소스에 들어 있는 음악 URL을 하나도 빠뜨리지 않는다', () => {
    const inSource = [...sourceMusicUrls()]
    expect(inSource.length).toBeGreaterThan(0)
    expect(inSource.filter((url) => !urls.includes(url))).toEqual([])
  }, 30_000)

  it('타이틀·로비·모든 스테이지(잠김·초안 포함) 곡을 싣는다 — Stage 5·6 전용곡 포함', () => {
    expect(urls).toContain(TITLE_BGM_URL)
    expect(urls).toContain(LOBBY_BGM_URL)
    for (const stageId of Object.keys(STAGE_CONFIGS)) expect(urls).toContain(getStageBgmUrl(stageId))
    expect(urls).toContain(STAGE5_BGM_URL)
    expect(urls).toContain(STAGE6_BGM_URL)
    expect(urls).toEqual(listGameBgmUrls())
    expect(ROOM_RADIO_TRACKS.find((track) => track.id === ROOM_MUSIC_TRACK_ID)?.url).toBe(LOBBY_BGM_URL)
  })

  it('쓰이는 곳에는 공개 스테이지 번호만 적는다', () => {
    const visibleNumbers = VISIBLE_STAGE_IDS.map((id) => Number(id.slice(5)))
    const listed = ROOM_RADIO_TRACKS.flatMap((track) => track.stageNumbers)
    for (const number of listed) expect(visibleNumbers).toContain(number)
    expect([...listed].sort((a, b) => a - b)).toEqual(visibleNumbers)
  })

  it('모든 곡 이름이 ko·en·ja에 있다', () => {
    for (const track of ROOM_RADIO_TRACKS) {
      for (const dict of [ko, en, ja]) expect(dict[`roomRadio.track.${track.id}`], `${track.id}`).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// 재생 규칙. "소리 남" = 'playing'이 왔고 그 뒤로 멈추지 않음.
let fake, root, container

function installSoundingAudio() {
  const installed = installFakeAudio()
  const Base = globalThis.Audio
  vi.stubGlobal('Audio', class SoundingAudio extends Base {
    constructor() {
      super()
      this.sounding = false
      this.addEventListener('playing', () => { this.sounding = !this.paused })
      this.addEventListener('pause', () => { this.sounding = false })
    }
  })
  return installed
}

// 방 화면: ReadyGameApp이 rosariRoom 화면에 마운트하는 <LobbyBgm />(방 음악)만 있으면 된다.
const showRoom = (inRoom = true) => act(() => root.render(React.createElement(LobbyBgm, { key: inRoom ? 'room' : 'lobby' })))
const audioFor = (url) => fake.instances.find((audio) => audio.src === url)
const songs = () => fake.instances.filter((audio) => audio.sounding).map((audio) => audio.src)
const sound = (audio) => act(() => { audio.dispatchEvent(new Event('playing')) })
const tick = (ms = 0) => act(() => { vi.advanceTimersByTime(ms) })
const radio = (action) => act(() => action())
const url = (id) => ROOM_RADIO_TRACKS.find((track) => track.id === id).url

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installSoundingAudio()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  showRoom()
})
afterEach(() => {
  act(() => roomRadio.stop())
  act(() => root.unmount())
  container.remove()
  _resetRoomRadioForTests()
  setLobbyBgmYielded(false)
  _resetStreamingBgmForTests()
  _resetAudioSettingsForTests()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('roomRadio 재생', () => {
  it('켜기 전에는 방 음악만 나오고 상태는 꺼짐', () => {
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(roomRadio.getState()).toEqual({ trackId: null, soundingId: null })
  })

  it('고른 곡이 방 음악을 대체한다 — 새 곡이 소리 날 때까지 방 음악이 이어지고, 두 곡이 겹치지 않는다', () => {
    fake.setDeferPlaying(true)
    radio(() => roomRadio.play('opening'))
    const opening = audioFor(TITLE_BGM_URL)
    expect(opening.loop).toBe(true)
    expect(songs()).toEqual([LOBBY_BGM_URL]) // 불러오는 동안 무음 없음
    expect(roomRadio.getState()).toEqual({ trackId: 'opening', soundingId: null })
    sound(opening)
    expect(songs()).toEqual([TITLE_BGM_URL])
    expect(isLobbyBgmYielded()).toBe(true)
    expect(roomRadio.getState()).toEqual({ trackId: 'opening', soundingId: 'opening' })
  })

  it('곡을 바꾸면 이전 곡은 새 곡이 소리 날 때 물러난다', () => {
    radio(() => roomRadio.play('opening'))
    fake.setDeferPlaying(true)
    radio(() => roomRadio.play('stage5'))
    expect(songs()).toEqual([TITLE_BGM_URL])
    sound(audioFor(STAGE5_BGM_URL))
    expect(songs()).toEqual([STAGE5_BGM_URL])
  })

  it('소리 나기 전에 건너뛴 곡은 바로 멈춰서 나중에 겹치지 않는다(빠른 다음 곡 연타)', () => {
    fake.setDeferPlaying(true)
    radio(() => roomRadio.next()) // 로비 다음 곡
    radio(() => roomRadio.next())
    radio(() => roomRadio.next())
    const target = roomRadio.getState().trackId
    const skipped = fake.instances.filter((audio) => audio.src !== LOBBY_BGM_URL && audio.src !== url(target))
    expect(skipped.length).toBe(2)
    for (const audio of skipped) { expect(audio.paused).toBe(true); sound(audio) }
    expect(songs()).toEqual([LOBBY_BGM_URL])
    sound(audioFor(url(target)))
    expect(songs()).toEqual([url(target)])
  })

  it('끄면 방 음악이 무음 없이 돌아오고 라디오 곡은 그때 끊긴다', () => {
    radio(() => roomRadio.play('stage6'))
    expect(songs()).toEqual([STAGE6_BGM_URL])
    fake.setDeferPlaying(true)
    radio(() => roomRadio.stop())
    expect(isLobbyBgmYielded()).toBe(false)
    expect(songs()).toEqual([STAGE6_BGM_URL]) // 방 음악이 소리 나기 전까지 다리
    tick(0)
    sound(audioFor(LOBBY_BGM_URL))
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(roomRadio.getState()).toEqual({ trackId: null, soundingId: null })
  })

  it('방을 나가면(라디오 stop + 방 홀더 교체) 로비 음악으로 이어진다', () => {
    radio(() => roomRadio.play('stageOdd'))
    act(() => { roomRadio.stop(); root.render(React.createElement(LobbyBgm, { key: 'lobby' })) })
    tick(0)
    expect(songs()).toEqual([LOBBY_BGM_URL])
    tick(BRIDGE_MAX_MS * 2)
    expect(songs()).toEqual([LOBBY_BGM_URL])
  })

  it('방 음악(로비 테마)을 라디오로 골라도 끊기거나 새로 시작하지 않는다', () => {
    const lobby = audioFor(LOBBY_BGM_URL)
    radio(() => roomRadio.play('lobby'))
    expect(fake.instances).toHaveLength(1)
    expect(lobby.pause).not.toHaveBeenCalled()
    expect(isLobbyBgmYielded()).toBe(false)
    expect(roomRadio.getState()).toEqual({ trackId: 'lobby', soundingId: 'lobby' })
    radio(() => roomRadio.stop())
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(lobby.pause).not.toHaveBeenCalled()
  })

  it('이전/다음 곡은 목록 끝에서 처음으로 돈다', () => {
    radio(() => roomRadio.play(ROOM_RADIO_TRACKS[0].id))
    radio(() => roomRadio.prev())
    expect(roomRadio.getState().trackId).toBe(ROOM_RADIO_TRACKS.at(-1).id)
    radio(() => roomRadio.next())
    expect(roomRadio.getState().trackId).toBe(ROOM_RADIO_TRACKS[0].id)
  })

  it('모르는 곡 id는 무시한다', () => {
    radio(() => roomRadio.play('nope'))
    expect(roomRadio.getState().trackId).toBe(null)
    expect(songs()).toEqual([LOBBY_BGM_URL])
  })

  it('설정의 음악 볼륨을 따른다(0이면 음소거, 재생은 유지)', () => {
    radio(() => roomRadio.play('stage5'))
    const song = audioFor(STAGE5_BGM_URL)
    act(() => setMusicVolume(0))
    expect(song.muted).toBe(true)
    expect(song.paused).toBe(false)
  })

  it('구독자는 상태 변화를 받는다', () => {
    const seen = []
    const off = roomRadio.subscribe((state) => seen.push(state.trackId))
    radio(() => roomRadio.play('opening'))
    radio(() => roomRadio.stop())
    off()
    expect(seen).toEqual(['opening', null])
  })
})
