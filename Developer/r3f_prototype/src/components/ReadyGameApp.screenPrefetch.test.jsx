// @vitest-environment jsdom
// 2026-11-01 "미션화면 에러나와": 배포 전에 열어 둔 탭이 배포 후 처음 미션 화면을 열면 옛 해시 청크
// (MissionCenter-<hash>.js)가 사라져 SPA 폴백 index.html을 받고 "Failed to fetch dynamically imported
// module"로 화면이 깨졌다. 접속 직후 모든 화면 청크를 미리 받아 두어 이후 배포와 무관하게 열리게 한다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const loaded = vi.hoisted(() => new Set())

vi.mock('./TitleScreen.jsx', () => ({ default: () => <div data-testid="title-screen" /> }))
vi.mock('./Lobby.jsx', () => { loaded.add('Lobby'); return { default: () => null } })
vi.mock('./MissionCenter.jsx', () => { loaded.add('MissionCenter'); return { default: () => null } })
vi.mock('./CoinShop.jsx', () => { loaded.add('CoinShop'); return { default: () => null } })
vi.mock('./UserRanking.jsx', () => { loaded.add('UserRanking'); return { default: () => null } })
vi.mock('./StageRanking.jsx', () => { loaded.add('StageRanking'); return { default: () => null } })
vi.mock('./RosariRoom.jsx', () => { loaded.add('RosariRoom'); return { default: () => null } })
vi.mock('./GameplayScreen.jsx', () => { loaded.add('GameplayScreen'); return { default: () => null } })
vi.mock('./HUD.jsx', () => { loaded.add('HUD'); return { default: () => null } })
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => { loaded.add('GameCanvas'); return { default: () => null } } }))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('../lib/firebaseAdminVisitors.js', () => ({ recordAdminVisitor: async () => ({ recorded: true }) }))
vi.mock('../lib/playtestLogger.js', () => ({ initPlaytestLogger: vi.fn() }))
vi.mock('../lib/keyboardInput.js', () => ({ initKeyboardInput: vi.fn() }))
vi.mock('../lib/mobileInput.js', () => ({ isMobileJoystickEnvironment: () => false }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => false, getFirebaseProgressRuntimeSnapshot: () => ({}) }))
vi.mock('../lib/titleSettings.js', () => ({ loadTitleSettings: () => ({ language: null }), applyLanguage: vi.fn() }))
vi.mock('../store/useGameStore.js', () => {
  const store = { phase: 'idle', gameKey: 0, retryRankingSubmission: vi.fn(async () => true), reconcileCloudProgress: vi.fn(async () => true) }
  return { useGameStore: Object.assign((selector) => selector(store), { getState: () => store, setState: () => {} }) }
})

const { default: ReadyGameApp, isStaleChunkError, DEFERRED_SCREEN_PREFETCH_DELAY_MS } = await import('./ReadyGameApp.jsx')

let root
let host
afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
  vi.useRealTimers()
})

describe('ReadyGameApp deferred screen prefetch', () => {
  it('downloads every screen chunk shortly after start, before the player opens them', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => { root.render(<ReadyGameApp authStatus="signedOut" authUser={null} progressStatus="idle" />); await vi.dynamicImportSettled() })

    // Only the title is up; the mission screen has not been opened.
    expect(host.querySelector('[data-testid="title-screen"]')).not.toBeNull()
    expect(loaded.has('MissionCenter')).toBe(false)

    await act(async () => { await vi.advanceTimersByTimeAsync(DEFERRED_SCREEN_PREFETCH_DELAY_MS); await vi.dynamicImportSettled() })

    expect([...loaded].sort()).toEqual(['CoinShop', 'GameCanvas', 'GameplayScreen', 'HUD', 'Lobby', 'MissionCenter', 'RosariRoom', 'StageRanking', 'UserRanking'])
  })

  it('recognises the stale-chunk errors browsers raise after a new deploy', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://escapezombie.com/assets/MissionCenter-BQgXoP9w.js'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new Error('shop exploded'))).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })
})
