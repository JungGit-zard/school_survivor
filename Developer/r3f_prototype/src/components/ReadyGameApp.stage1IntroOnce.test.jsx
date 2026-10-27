// @vitest-environment jsdom
// 스테이지1 스토리 컷은 처음 한 번만 나온다(Terry 2026-10-27 "스토리 컷은 처음 한 번만 나오게 해").
// 새 저장 키 없이 이미 저장되는 activity·records로 "이미 봤음"을 판단하고, 기록이 없는
// 게스트는 같은 세션 안에서만 한 번 본 것으로 기억한다.
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
  default: ({ onEnterLobby }) => <button data-testid="title-screen" onClick={onEnterLobby}>enter</button>,
}))
vi.mock('./Lobby.jsx', () => ({
  default: ({ onStartStage }) => (
    <button type="button" data-testid="start-stage" onClick={() => onStartStage('stage1')}>start</button>
  ),
}))
vi.mock('./GameplayScreen.jsx', () => ({
  default: ({ onGoToLobby }) => (
    <button type="button" data-testid="go-lobby" onClick={onGoToLobby}>lobby</button>
  ),
}))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
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

async function renderInLobby(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<ReadyGameApp authStatus="signedIn" {...props} />)
    await vi.dynamicImportSettled()
  })
  await act(async () => {
    container.querySelector('[data-testid="title-screen"]').click()
    await vi.dynamicImportSettled()
  })
  const click = async (testId) => {
    await act(async () => {
      container.querySelector(`[data-testid="${testId}"]`).click()
      await vi.dynamicImportSettled()
    })
  }
  return { click, unmount: () => act(() => { root.unmount(); container.remove() }) }
}

describe('stage1 story cut plays only the first time', () => {
  afterEach(() => {
    mocks.hydrated = false
    mocks.runtime = { activity: null, progress: { records: {} } }
    mocks.gameStore.resetGame.mockClear()
    mocks.gameStore.startStage1Intro.mockClear()
  })

  it('shows the story on the first stage1 entry and skips it on the second entry in the same session', async () => {
    const view = await renderInLobby({ authUser: null, progressStatus: 'idle' })

    await view.click('start-stage')
    expect(mocks.gameStore.resetGame).toHaveBeenCalledTimes(1)
    expect(mocks.gameStore.startStage1Intro).toHaveBeenCalledTimes(1)

    await view.click('go-lobby')
    await view.click('start-stage')
    expect(mocks.gameStore.resetGame).toHaveBeenCalledTimes(2)
    expect(mocks.gameStore.startStage1Intro).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('shows the story to a hydrated account with no prior play data', async () => {
    mocks.hydrated = true
    const view = await renderInLobby({ authUser: { uid: 'fresh' }, progressStatus: 'ready' })
    await view.click('start-stage')
    expect(mocks.gameStore.startStage1Intro).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it.each([
    ['a recorded stage entry', { activity: { lastStageId: 'stage1', lastStartedAt: '2026-10-26T00:00:00.000Z' }, progress: { records: {} } }],
    ['a finished run', { activity: null, progress: { records: { totalRuns: 3 } } }],
    ['a stage1 clear', { activity: null, progress: { records: { stage1Clears: 1 } } }],
  ])('skips the story on the first entry of a hydrated account with %s', async (_label, runtime) => {
    mocks.hydrated = true
    mocks.runtime = runtime
    const view = await renderInLobby({ authUser: { uid: 'veteran' }, progressStatus: 'ready' })
    await view.click('start-stage')
    expect(mocks.gameStore.resetGame).toHaveBeenCalledWith('stage1')
    expect(mocks.gameStore.startStage1Intro).not.toHaveBeenCalled()
    view.unmount()
  })
})
