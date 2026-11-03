// @vitest-environment jsdom
// 2026-11-03 Terry 승인: 런을 끝낸 적 없는 첫 플레이어는 타이틀 START에서 로비 없이 바로
// Stage 1 흐름(스토리 → 런)으로 들어가고, 돌아온 플레이어는 지금처럼 로비로 간다.
// 판단은 기존 진행도 records만 쓴다(브라우저 저장소 금지, AGENTS.md:38).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hydrated: false,
  runtime: { activity: null, progress: { records: {} } },
  gameStore: {
    gameKey: 0,
    phase: 'idle',
    resetGame: vi.fn(),
    flushProgressBeforeTransition: vi.fn(async () => true),
    reconcileCloudProgress: vi.fn(async () => true),
    retryRankingSubmission: vi.fn(async () => true),
    startStage1Intro: vi.fn(),
  },
}))

vi.mock('./TitleScreen.jsx', () => ({
  default: ({ onStart }) => <button data-testid="title-start" onClick={onStart}>start game</button>,
}))
vi.mock('./Lobby.jsx', () => ({
  default: ({ onStartStage }) => (
    <button type="button" data-testid="lobby" onClick={() => onStartStage('stage1')}>lobby</button>
  ),
}))
vi.mock('./GameplayScreen.jsx', () => ({
  default: ({ onGoToLobby }) => (
    <button type="button" data-testid="go-lobby" onClick={onGoToLobby}>lobby</button>
  ),
}))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
// The deferred screen prefetch (5s after start) would otherwise pull these real, heavy modules into jsdom.
vi.mock('./RosariRoom.jsx', () => ({ default: () => null }))
vi.mock('./StageRanking.jsx', () => ({ default: () => null }))
vi.mock('./HUD.jsx', () => ({ default: () => null }))
vi.mock('./MissionCenter.jsx', () => ({ default: () => null }))
vi.mock('./CoinShop.jsx', () => ({ default: () => null }))
vi.mock('./UserRanking.jsx', () => ({ default: () => null }))
vi.mock('./VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./E2ERuntimePerformanceDiagnostics.jsx', () => ({ default: () => null }))
vi.mock('../lib/firebaseAdminVisitors.js', () => ({ recordAdminVisitor: vi.fn(async () => ({ recorded: true })) }))
vi.mock('../lib/playtestLogger.js', () => ({ initPlaytestLogger: vi.fn() }))
vi.mock('../lib/keyboardInput.js', () => ({ initKeyboardInput: vi.fn() }))
vi.mock('../lib/mobileInput.js', () => ({ isMobileJoystickEnvironment: () => false }))
vi.mock('../lib/firebaseProgress.js', () => ({
  isFirebaseProgressHydrated: () => mocks.hydrated,
  getFirebaseProgressRuntimeSnapshot: () => mocks.runtime,
}))
vi.mock('../lib/titleSettings.js', () => ({
  loadTitleSettings: () => ({ unlockAllStagesCheat: false, language: null }),
  applyLanguage: vi.fn(),
}))
vi.mock('../store/useGameStore.js', () => ({
  useGameStore: Object.assign(
    (selector) => selector(mocks.gameStore),
    { getState: () => mocks.gameStore },
  ),
}))

const { default: ReadyGameApp } = await import('./ReadyGameApp.jsx')

async function renderTitle(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<ReadyGameApp authStatus={props.authUser ? 'signedIn' : 'signedOut'} {...props} />)
    await vi.dynamicImportSettled()
  })
  const click = async (testId) => {
    await act(async () => {
      container.querySelector(`[data-testid="${testId}"]`).click()
      await vi.dynamicImportSettled()
    })
  }
  const has = (testId) => !!container.querySelector(`[data-testid="${testId}"]`)
  return { click, has, unmount: () => act(() => { root.unmount(); container.remove() }) }
}

describe('title START routes first-time players straight into stage 1', () => {
  afterEach(() => {
    mocks.hydrated = false
    mocks.runtime = { activity: null, progress: { records: {} } }
    mocks.gameStore.resetGame.mockClear()
    mocks.gameStore.startStage1Intro.mockClear()
  })

  it('sends a first-time guest from START into the stage 1 story and run, skipping the lobby', async () => {
    const view = await renderTitle({ authUser: null, progressStatus: 'idle' })
    await view.click('title-start')
    expect(mocks.gameStore.resetGame).toHaveBeenCalledWith('stage1')
    expect(mocks.gameStore.startStage1Intro).toHaveBeenCalledTimes(1)
    expect(view.has('go-lobby')).toBe(true)
    expect(view.has('lobby')).toBe(false)
    view.unmount()
  })

  it('sends a hydrated account with no finished run into stage 1', async () => {
    mocks.hydrated = true
    const view = await renderTitle({ authUser: { uid: 'fresh' }, progressStatus: 'ready' })
    await view.click('title-start')
    expect(mocks.gameStore.resetGame).toHaveBeenCalledWith('stage1')
    expect(mocks.gameStore.startStage1Intro).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it.each([
    ['finished runs', { totalRuns: 2 }],
    ['a stage 1 clear', { stage1Clears: 1 }],
  ])('sends a returning account with %s to the lobby', async (_label, records) => {
    mocks.hydrated = true
    mocks.runtime = { activity: null, progress: { records } }
    const view = await renderTitle({ authUser: { uid: 'veteran' }, progressStatus: 'ready' })
    await view.click('title-start')
    expect(view.has('lobby')).toBe(true)
    expect(mocks.gameStore.resetGame).not.toHaveBeenCalled()
    view.unmount()
  })

  it('keeps a signed-in player whose progress has not loaded yet on the lobby path', async () => {
    mocks.hydrated = false
    const view = await renderTitle({ authUser: { uid: 'loading' }, progressStatus: 'loading' })
    await view.click('title-start')
    expect(view.has('lobby')).toBe(true)
    expect(mocks.gameStore.resetGame).not.toHaveBeenCalled()
    view.unmount()
  })

  it('lands the player in the normal lobby after the first run', async () => {
    const view = await renderTitle({ authUser: null, progressStatus: 'idle' })
    await view.click('title-start')
    await view.click('go-lobby')
    expect(view.has('lobby')).toBe(true)
    view.unmount()
  })
})
