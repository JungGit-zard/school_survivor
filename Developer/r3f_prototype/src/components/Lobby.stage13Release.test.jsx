// @vitest-environment jsdom
// Fresh release-boundary coverage; the historical Lobby suite/harness is unchanged.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'

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
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: selector => selector({ user: null, progressStatus: 'idle' }) }))
vi.mock('../store/useGameStore.js', () => ({ useGameStore: selector => selector({ goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {} }) }))

let root
let host
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT
afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
  vi.useRealTimers()
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct
})

// 2026-11-08 Terry: Stage 5·6 공개, 7~10 비노출. 5·6은 이전 스테이지 보스 처치 전까지 잠김.
describe('actual Lobby Stage1–6 release list', () => {
  it.each([false, true])('lists exactly 1-6 without bypassing account locks with developer unlock=%s', async (devAllStagesUnlocked) => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const onStartStage = vi.fn()
    await act(async () => root.render(<Lobby devAllStagesUnlocked={devAllStagesUnlocked} onStartStage={onStartStage} />))
    const cards = [...host.querySelectorAll('section[aria-label^="Stage "]')]
    expect(cards.map(card => card.getAttribute('aria-label').match(/^Stage (\d+) /)?.[1])).toEqual(['1', '2', '3', '4', '5', '6'])
    for (const card of cards.slice(1)) {
      expect([...card.querySelectorAll('button')].every(button => button.disabled)).toBe(true)
    }
    for (let i = 7; i <= 10; i++) expect(host.querySelector(`section[aria-label^="Stage ${i} "]`)).toBeNull()
    // 신규 계정: Stage 5·6 카드는 이전 보스 처치 조건 문구를 보이고, 탭해도 런이 시작되지 않는다.
    expect(cards[4].textContent).toContain('Stage 4 보스 처치 시 열림')
    expect(cards[5].textContent).toContain('Stage 5 보스 처치 시 열림')
    for (const card of cards.slice(4)) act(() => { card.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    act(() => { vi.advanceTimersByTime(2_000) })
    expect(onStartStage).not.toHaveBeenCalled()
  })
})
