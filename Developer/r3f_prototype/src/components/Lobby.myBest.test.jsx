// @vitest-environment jsdom
// 2026-10-26 실측 버그: 게스트가 Stage1을 21초 플레이하고 로비로 돌아오면 랭킹 엔트리는 6개 버킷에
// 다 써졌는데 로비 카드는 "내 최고기록: 기록 없음"이었다. 로비가 게스트에게 빈 playerRecords({})만
// 읽었고, 0초는 무조건 '기록 없음'으로 바꿨기 때문이다.
// 정책(Terry): 0점이라도 랭킹에 등록하고 입장이력은 모두 등록한다 — 0점 기록은 0으로 보인다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import { fetchMyStageBests } from '../lib/firebaseRanking.js'

const state = vi.hoisted(() => ({
  auth: { user: null, progressStatus: 'idle' },
  game: { goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {}, rankingSubmission: null },
  records: {},
}))
vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('./WeaponModal.jsx', () => ({ default: () => null }))
vi.mock('./LobbySettingsModal.jsx', () => ({ default: () => null }))
vi.mock('./StageBossPreview.jsx', () => ({ default: () => <div /> }))
vi.mock('./StageLock.jsx', () => ({ StageLockPreview: () => <div /> }))
vi.mock('./gameCanvasLoader.js', () => ({ preloadGameCanvasChunk: vi.fn(async () => {}) }))
vi.mock('../lib/stageEntryPreload.js', () => ({ preloadStageEntryAssets: vi.fn() }))
vi.mock('../lib/sfxRegistry.js', () => ({ playSfx: vi.fn() }))
vi.mock('../lib/graphicsStudioConfig.js', () => ({ loadStageBossPreview: () => ({}), STAGE_BOSS_PREVIEW_EVENT: 'preview-test' }))
vi.mock('../lib/guestRankingIdentity.js', () => ({
  getGuestRankingNickname: () => 'Guest',
  getRankingUser: vi.fn(async () => ({ uid: 'anon-guest', isAnonymous: true })),
}))
vi.mock('../lib/firebaseRanking.js', () => ({
  getActiveSeason: () => ({ active: false }),
  fetchMyStageBests: vi.fn(async () => ({})),
}))
vi.mock('../lib/firebaseProgress.js', async () => ({
  ...(await vi.importActual('../lib/firebaseProgress.js')),
  isFirebaseProgressHydrated: () => state.auth.progressStatus === 'ready',
}))
vi.mock('../lib/playerRecords.js', () => ({ load: () => ({ ...state.records }) }))
vi.mock('../store/useAuthStore.js', () => {
  const useAuthStore = (selector) => selector(state.auth)
  useAuthStore.getState = () => state.auth
  return { useAuthStore }
})
vi.mock('../store/useGameStore.js', async () => {
  const { useSyncExternalStore } = await vi.importActual('react')
  const listeners = new Set()
  const useGameStore = (selector) => useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => selector(state.game),
  )
  useGameStore.setState = (patch) => { state.game = { ...state.game, ...patch }; listeners.forEach((listener) => listener()) }
  return { useGameStore }
})

let root
let host
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT

async function renderLobby() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<Lobby />))
  await act(async () => {})
}

function stage1Text() {
  return host.querySelector('section[aria-label^="Stage 1 "]').textContent
}

beforeEach(() => {
  state.auth = { user: null, progressStatus: 'idle' }
  state.game = { goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {}, rankingSubmission: null }
  state.records = {}
  vi.mocked(fetchMyStageBests).mockReset().mockResolvedValue({})
})

afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct
})

describe('lobby 내 최고기록 comes from the own ranking entry', () => {
  it('shows a guest best right after returning from a run', async () => {
    vi.mocked(fetchMyStageBests).mockResolvedValue({ stage1: { score: 21, timeMs: 21050, cleared: false } })
    await renderLobby()

    expect(fetchMyStageBests).toHaveBeenCalledWith(expect.objectContaining({ uid: 'anon-guest' }), expect.arrayContaining(['stage1']))
    expect(stage1Text()).toContain('내 최고기록: 0:21')
    expect(stage1Text()).not.toContain('기록 없음')
  })

  it('shows a 0-point entry as 0, not 기록 없음', async () => {
    vi.mocked(fetchMyStageBests).mockResolvedValue({ stage1: { score: 0, timeMs: 0, cleared: false } })
    await renderLobby()

    expect(stage1Text()).toContain('내 최고기록: 0:00')
    expect(stage1Text()).not.toContain('기록 없음')
  })

  it('still says 기록 없음 when there is no entry at all', async () => {
    await renderLobby()

    expect(stage1Text()).toContain('내 최고기록: 기록 없음')
  })

  it('shows a signed-in 0-point entry as 0 even though local best seconds are 0', async () => {
    state.auth = { user: { uid: 'google-user' }, progressStatus: 'ready' }
    state.records = { bestSurvivalSeconds: 0 }
    vi.mocked(fetchMyStageBests).mockResolvedValue({ stage1: { score: 0, timeMs: 0, cleared: false } })
    await renderLobby()

    expect(fetchMyStageBests).toHaveBeenCalledWith(expect.objectContaining({ uid: 'google-user' }), expect.arrayContaining(['stage1']))
    expect(stage1Text()).toContain('내 최고기록: 0:00')
  })

  it('keeps the larger local survival best for a signed-in user', async () => {
    state.auth = { user: { uid: 'google-user' }, progressStatus: 'ready' }
    state.records = { bestSurvivalSeconds: 95 }
    vi.mocked(fetchMyStageBests).mockResolvedValue({ stage1: { score: 30, timeMs: 30000, cleared: false } })
    await renderLobby()

    expect(stage1Text()).toContain('내 최고기록: 1:35')
  })

  it('re-reads when the run submission settles after the lobby already mounted', async () => {
    await renderLobby()
    expect(stage1Text()).toContain('기록 없음')

    vi.mocked(fetchMyStageBests).mockResolvedValue({ stage1: { score: 21, timeMs: 21050, cleared: false } })
    await act(async () => { (await import('../store/useGameStore.js')).useGameStore.setState({ rankingSubmission: { stageId: 'stage1', status: 'recorded' } }) })
    await act(async () => {})

    expect(stage1Text()).toContain('내 최고기록: 0:21')
  })
})
