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

describe('actual Lobby Stage1–4 release list', () => {
  it.each([false, true])('lists exactly 1,2,3,4 without bypassing account locks with developer unlock=%s', async (devAllStagesUnlocked) => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const onStartStage = vi.fn()
    await act(async () => root.render(<Lobby devAllStagesUnlocked={devAllStagesUnlocked} onStartStage={onStartStage} />))
    const cards = [...host.querySelectorAll('section[aria-label^="Stage "]')]
    expect(cards.map(card => card.getAttribute('aria-label').match(/^Stage (\d+) /)?.[1])).toEqual(['1', '2', '3', '4'])
    for (const card of cards.slice(1)) {
      expect([...card.querySelectorAll('button')].every(button => button.disabled)).toBe(true)
    }
    for (let i = 5; i <= 10; i++) expect(host.querySelector(`section[aria-label^="Stage ${i} "]`)).toBeNull()
    expect(onStartStage).not.toHaveBeenCalled()
  })
})
