// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMissionProgressState, reconcileMissionProgress } from '../lib/missionProgress.js'

const state = vi.hoisted(() => ({ auth: { user: null, progressStatus: 'idle' }, game: {} }))

vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('./WeaponModal.jsx', () => ({ default: () => null }))
vi.mock('./LobbySettingsModal.jsx', () => ({ default: () => null }))
vi.mock('./StageBossPreview.jsx', () => ({ default: () => <div /> }))
vi.mock('./StageLock.jsx', () => ({ StageLockPreview: () => <div /> }))
vi.mock('./gameCanvasLoader.js', () => ({ preloadGameCanvasChunk: vi.fn(async () => {}) }))
vi.mock('../lib/stageEntryPreload.js', () => ({ preloadStageEntryAssets: vi.fn() }))
vi.mock('../lib/sfxRegistry.js', () => ({ playSfx: vi.fn() }))
vi.mock('../lib/graphicsStudioConfig.js', () => ({ loadStageBossPreview: () => ({}), STAGE_BOSS_PREVIEW_EVENT: 'preview-test' }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getGuestRankingNickname: () => 'Guest', getRankingUser: vi.fn(async () => ({ uid: 'guest' })) }))
vi.mock('../lib/firebaseRanking.js', () => ({ getActiveSeason: () => ({ active: false }), fetchMyStageBests: async () => ({}) }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: Object.assign((selector) => selector(state.auth), { getState: () => state.auth }) }))
vi.mock('../store/useGameStore.js', () => ({ useGameStore: (selector) => selector(state.game) }))

import Lobby from './Lobby.jsx'

let root
let host
afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
})

async function renderLobby() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<Lobby />))
  return host
}

// 교과서·레벨업(시작 미션) 2개 완료 + 골드 코인(아직 숨은 미션) 완료 → 배지는 보이는 것만 센다.
const progress = reconcileMissionProgress(createMissionProgressState({
  counters: { 'pickup.xpTextbook.count': 1, 'upgrade.choice.count': 1, 'pickup.goldCoin.count': 1 },
}))

describe('Lobby mission badge', () => {
  it('shows the count of claimable visible missions for a signed-in player', async () => {
    state.auth = { user: { uid: 'badge-user' }, progressStatus: 'ready' }
    state.game = { goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {}, missionProgress: progress }
    const view = await renderLobby()
    expect(view.querySelector('[data-testid="mission-nav-badge"]').textContent).toBe('2')
  })

  it('shows no badge to a guest', async () => {
    state.auth = { user: null, progressStatus: 'idle' }
    state.game = { goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {}, missionProgress: progress }
    const view = await renderLobby()
    expect(view.querySelector('[data-testid="mission-nav-badge"]')).toBeNull()
  })
})
