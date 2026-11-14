// 로자리의 방 라디오(2026-11-14 Terry: "로자리의 방에 라디오를 만들고 근처에 가면 게임에 들어간 음악을
// 모두 들을수있게 해"). soundmini 소관.
//
// 곡 목록: 화면들이 실제로 쓰는 URL 상수에서 만든다 — 타이틀, 로비(= 방 음악), 그리고 STAGE_CONFIGS의
// 모든 스테이지(잠긴 스테이지·초안 스테이지 포함)가 getStageBgmUrl로 받는 곡. 손으로 적은 목록이 아니라서
// 스테이지 곡이 늘면 라디오에도 저절로 들어온다(이름 키가 없으면 '스테이지 N 곡'으로 표시).
//
// 재생: 새 오디오 엔진을 만들지 않는다. streamingBgm(곡당 <audio loop> 1개 공유)을 그대로 잡고, 방 음악
// (ReadyGameApp이 rosariRoom 화면에 마운트하는 <LobbyBgm />)은 lobbyBgm.js의 양보 스위치로 물러나게 한다.
// 로비 음악실(MusicRoomBgm)과 같은 규칙이다.
// 운영 규칙(BGM never stops, 2026-10-27): 무음 구간 없음, 두 곡 동시 재생 없음.
//  - 고른 곡은 이전 곡(또는 방 음악)이 계속 들리는 동안 시작하고, 새 곡이 실제로 소리 나는 순간('playing')
//    이전 곡이 물러난다. 느린 스트림이어도 공백이 없고, 끝내 못 불러오면 이전 곡이 계속 나온다.
//  - 소리 나기 전에 건너뛴 곡은 즉시 멈춰서 나중에 겹쳐 나오지 않는다.
//  - 끄기(stop) / 방 나가기: 라디오 곡을 놓는다. streamingBgm이 그 곡을 다리(bridge)로 유지하다가 방 음악이
//    다시 소리 나는 순간 끊는다.
// 음량·음소거: streamingBgm이 설정의 음악 볼륨 배율을 그대로 적용한다(여기서 따로 만지지 않는다).
// 저장소: 쓰지 않는다(이 프로젝트는 Firebase 인증 외 브라우저 저장 금지). 방을 나가면 라디오는 꺼진다.
import { useSyncExternalStore } from 'react'
import { acquireStreamingBgm, isStreamingBgmPlaying } from './streamingBgm.js'
import { TITLE_BGM_URL } from './titleBgm.js'
import { LOBBY_BGM_URL, LOBBY_BGM_VOLUME, setLobbyBgmYielded } from './lobbyBgm.js'
import { STAGE_CONFIGS, VISIBLE_STAGE_IDS } from './stageConfig.js'
import {
  getStageBgmUrl,
  STAGE1_BGM_URL,
  STAGE2_BGM_URL,
  STAGE5_BGM_URL,
  STAGE6_BGM_URL,
} from '../components/Stage1Bgm.jsx'

// 방에서 라디오가 꺼져 있을 때 들리는 곡.
export const ROOM_MUSIC_TRACK_ID = 'lobby'

// URL → 라디오 곡 id. 여기 없는 새 스테이지 곡은 파일 이름에서 id를 만든다(아래 fallbackId).
const NAMED_TRACK_IDS = new Map([
  [TITLE_BGM_URL, 'opening'],
  [LOBBY_BGM_URL, 'lobby'],
  [STAGE1_BGM_URL, 'stageOdd'],
  [STAGE2_BGM_URL, 'stageEven'],
  [STAGE5_BGM_URL, 'stage5'],
  [STAGE6_BGM_URL, 'stage6'],
])

function fallbackId(url) {
  const file = String(url).split('/').pop() ?? ''
  return `song_${file.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '_')}`
}

function stageNumber(stageId) {
  const match = /^stage(\d+)$/.exec(String(stageId))
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

// 모든 스테이지 id(잠금·초안 포함)를 번호순으로.
export function listAllStageIds() {
  return Object.keys(STAGE_CONFIGS).sort((a, b) => stageNumber(a) - stageNumber(b))
}

// 게임이 재생하는 BGM URL 전부: 타이틀, 로비, 각 스테이지 곡(게임 순서, 중복 없음).
export function listGameBgmUrls(stageIds = listAllStageIds()) {
  const urls = [TITLE_BGM_URL, LOBBY_BGM_URL]
  for (const stageId of stageIds) {
    const url = getStageBgmUrl(stageId)
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

// 공개 스테이지 번호만 '쓰이는 곳'에 적는다(초안 스테이지 번호는 화면에 새지 않게). 곡 자체는 전부 싣는다.
function buildCatalog() {
  return Object.freeze(listGameBgmUrls().map((url) => {
    const id = NAMED_TRACK_IDS.get(url) ?? fallbackId(url)
    const stageNumbers = VISIBLE_STAGE_IDS
      .filter((stageId) => getStageBgmUrl(stageId) === url)
      .map(stageNumber)
      .sort((a, b) => a - b)
    return Object.freeze({ id, url, stageNumbers: Object.freeze(stageNumbers) })
  }))
}

export const ROOM_RADIO_TRACKS = buildCatalog()

export function getRoomRadioTrack(trackId) {
  return ROOM_RADIO_TRACKS.find((track) => track.id === trackId) ?? null
}

// ---------------------------------------------------------------------------
// 재생기(모듈 싱글톤: 방은 하나, 라디오도 하나).

let current = null // { id, url, handle } 지금 소리 나는 라디오 곡. null이면 방 음악이 나온다.
let pending = null // { id, url, handle, onPlaying } 시작했지만 아직 소리 나지 않은 곡
let state = Object.freeze({ trackId: null, soundingId: null })
const listeners = new Set()

function publish() {
  const next = Object.freeze({ trackId: pending?.id ?? current?.id ?? null, soundingId: current?.id ?? null })
  if (next.trackId === state.trackId && next.soundingId === state.soundingId) return
  state = next
  for (const listener of [...listeners]) {
    try { listener(state) } catch { /* UI 오류가 오디오를 막지 않는다 */ }
  }
}

// 풀기 전에 멈춰서, 다리로 남지 않고 바로 해제되게 한다.
function silence(entry) {
  entry.handle.setActive(false)
  entry.handle.release()
}

function dropPending() {
  if (!pending) return
  pending.handle.audio.removeEventListener('playing', pending.onPlaying)
  silence(pending)
  pending = null
}

function promote() {
  const previous = current
  pending.handle.audio.removeEventListener('playing', pending.onPlaying)
  current = { id: pending.id, url: pending.url, handle: pending.handle }
  pending = null
  // 방 음악(로비 곡)을 라디오로 고른 경우엔 방 홀더가 물러날 필요가 없다.
  setLobbyBgmYielded(current.url !== LOBBY_BGM_URL)
  if (previous) silence(previous)
}

function backToRoomMusic() {
  dropPending()
  if (current) current.handle.release() // 아직 소리 나는 중: 방 음악이 소리 날 때까지 다리로 남는다
  current = null
  setLobbyBgmYielded(false)
}

function start(track) {
  if (track.id === current?.id) { dropPending(); return }
  if (track.id === pending?.id) return
  dropPending()
  // 이미 소리 나는 곡(방 음악, 혹은 다리 중인 곡)은 새 'playing'이 오지 않는다.
  const sounding = isStreamingBgmPlaying(track.url)
  const handle = acquireStreamingBgm(track.url, { volume: LOBBY_BGM_VOLUME, active: sounding })
  pending = {
    id: track.id,
    url: track.url,
    handle,
    onPlaying: () => {
      if (pending?.handle !== handle) return
      try { promote() } catch { /* 오디오는 UI를 깨지 않는다 */ }
      publish()
    },
  }
  if (sounding) { promote(); return }
  handle.audio.addEventListener('playing', pending.onPlaying)
  handle.setActive(true) // 듣기 시작한 뒤에 재생해야 즉시 오는 'playing'을 놓치지 않는다
}

function safely(action) {
  try { action() } catch { /* 오디오는 방을 깨지 않는다 */ }
  publish()
  return state
}

export const roomRadio = {
  // 곡 재생. 모르는 id는 무시한다.
  play(trackId) {
    const track = getRoomRadioTrack(trackId)
    if (!track) return state
    return safely(() => start(track))
  },
  // 라디오 끄기: 방 음악으로 돌아간다(무음 없음).
  stop() {
    return safely(backToRoomMusic)
  },
  // 다음/이전 곡(끝에서 처음으로 돈다). 꺼져 있으면 지금 들리는 방 음악을 기준으로 한다.
  next() {
    return roomRadio.play(stepTrackId(1))
  },
  prev() {
    return roomRadio.play(stepTrackId(-1))
  },
  // { trackId: 고른 곡(불러오는 중 포함) | null(꺼짐), soundingId: 실제로 소리 나는 라디오 곡 | null }
  getState() {
    return state
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

function stepTrackId(step) {
  const baseId = state.trackId ?? ROOM_MUSIC_TRACK_ID
  const index = Math.max(0, ROOM_RADIO_TRACKS.findIndex((track) => track.id === baseId))
  const count = ROOM_RADIO_TRACKS.length
  return ROOM_RADIO_TRACKS[(index + step + count) % count].id
}

// React 훅: 라디오 상태를 구독한다.
export function useRoomRadio() {
  return useSyncExternalStore(roomRadio.subscribe, roomRadio.getState, roomRadio.getState)
}

// 테스트 전용: 재생기 상태를 비운다.
export function _resetRoomRadioForTests() {
  pending = null
  current = null
  listeners.clear()
  state = Object.freeze({ trackId: null, soundingId: null })
}
