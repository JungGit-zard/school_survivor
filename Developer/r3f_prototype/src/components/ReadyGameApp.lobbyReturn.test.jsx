// @vitest-environment jsdom
// 2026-10-26 Terry 라이브 리포트 "로비로 무조건 가야함": 런이 어떻게 끝나든 플레이어는 로비에 도착해야 한다.
// - 게임오버 결과창 버튼이 타이틀로 보내던 경로
// - 로그인 유저의 클라우드 저장 실패/지연(오프라인)이 화면 전환을 막아 결과창에 갇히던 경로
// - 브라우저 뒤로가기가 SPA 밖(빈 화면/이전 사이트)으로 나가던 경로
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  gameStore: {
    gameKey: 0,
    phase: 'idle',
    resetGame: vi.fn(),
    submitRunToRanking: vi.fn(async () => {}),
    reconcileCloudProgress: vi.fn(async () => true),
    retryRankingSubmission: vi.fn(async () => true),
    startStage1Intro: vi.fn(),
    flushProgressBeforeTransition: vi.fn(async () => true),
    pauseGame: vi.fn(),
    quitPausedRun: vi.fn(() => true),
  },
}))

vi.mock('./TitleScreen.jsx', () => ({
  default: ({ onEnterLobby }) => <button data-testid="title-screen" onClick={onEnterLobby}>enter</button>,
}))
vi.mock('./Lobby.jsx', () => ({
  default: ({ onStartStage }) => <button type="button" data-testid="start-stage" onClick={() => onStartStage('stage1')}>start</button>,
}))
vi.mock('./GameplayScreen.jsx', () => ({
  default: (props) => (
    <section data-testid="gameplay-screen">
      <button type="button" data-testid="go-title" onClick={props.onGoToTitle}>title</button>
      <button type="button" data-testid="go-lobby" onClick={props.onGoToLobby}>lobby</button>
      <button type="button" data-testid="go-ranking" onClick={props.onGoToRanking}>ranking</button>
    </section>
  ),
}))
vi.mock('./UserRanking.jsx', () => ({
  default: ({ onBack }) => <button type="button" data-testid="ranking-back" onClick={onBack}>back</button>,
}))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
vi.mock('./VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./E2ERuntimePerformanceDiagnostics.jsx', () => ({ default: () => null }))
vi.mock('../lib/firebaseAdminVisitors.js', () => ({ recordAdminVisitor: async () => ({ recorded: true }) }))
vi.mock('../lib/playtestLogger.js', () => ({ initPlaytestLogger: vi.fn() }))
vi.mock('../lib/keyboardInput.js', () => ({ initKeyboardInput: vi.fn() }))
vi.mock('../lib/mobileInput.js', () => ({ isMobileJoystickEnvironment: () => false }))
vi.mock('../lib/firebaseProgress.js', () => ({ isFirebaseProgressHydrated: () => false }))
vi.mock('../lib/titleSettings.js', () => ({
  loadTitleSettings: () => ({ unlockAllStagesCheat: false, language: null }),
  applyLanguage: vi.fn(),
}))
vi.mock('../store/useGameStore.js', () => ({
  useGameStore: Object.assign(
    (selector) => selector(mocks.gameStore),
    { getState: () => mocks.gameStore, setState: (patch) => Object.assign(mocks.gameStore, patch) },
  ),
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { default: ReadyGameApp } = await import('./ReadyGameApp.jsx')

let view = null
beforeEach(() => {
  mocks.gameStore.phase = 'idle'
  mocks.gameStore.flushProgressBeforeTransition.mockReset().mockResolvedValue(true)
  mocks.gameStore.pauseGame.mockReset().mockImplementation(() => { mocks.gameStore.phase = 'paused' })
  mocks.gameStore.quitPausedRun.mockReset().mockImplementation(() => {
    if (mocks.gameStore.phase !== 'paused') return false
    mocks.gameStore.phase = 'gameover'
    return true
  })
  window.history.replaceState(null, '', '/game')
})
afterEach(() => {
  vi.useRealTimers()
  if (view) view.unmount()
  view = null
})

async function enterGame() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<ReadyGameApp authStatus="signedIn" authUser={{ uid: 'u1' }} progressStatus="ready" />)
    await vi.dynamicImportSettled()
  })
  const click = async (testId) => act(async () => {
    container.querySelector(`[data-testid="${testId}"]`).click()
    await vi.dynamicImportSettled()
  })
  await click('title-screen')
  await click('start-stage')
  expect(container.querySelector('[data-testid="gameplay-screen"]')).not.toBeNull()
  view = { container, click, unmount: () => act(() => { root.unmount(); container.remove() }) }
  return view
}

const has = (testId) => Boolean(view.container.querySelector(`[data-testid="${testId}"]`))
const flush = async () => act(async () => {
  await vi.dynamicImportSettled()
  for (let i = 0; i < 5; i++) await Promise.resolve()
})
const popState = async () => act(async () => {
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
  await vi.dynamicImportSettled()
  for (let i = 0; i < 5; i++) await Promise.resolve()
})

it('sends the game-over result "home" button to the lobby, never the title', async () => {
  await enterGame()
  mocks.gameStore.phase = 'gameover'
  await view.click('go-title')
  await flush()
  expect(has('start-stage')).toBe(true)
  expect(has('title-screen')).toBe(false)
})

it('reaches the lobby even when the cloud progress save fails (offline account)', async () => {
  await enterGame()
  mocks.gameStore.phase = 'gameover'
  mocks.gameStore.flushProgressBeforeTransition.mockResolvedValue(false)
  await view.click('go-lobby')
  await flush()
  expect(mocks.gameStore.flushProgressBeforeTransition).toHaveBeenCalled()
  expect(has('start-stage')).toBe(true)
})

it('reaches the lobby even when the progress flush throws', async () => {
  await enterGame()
  mocks.gameStore.phase = 'cleared'
  mocks.gameStore.flushProgressBeforeTransition.mockRejectedValue(new Error('network'))
  await view.click('go-lobby')
  await flush()
  expect(has('start-stage')).toBe(true)
})

it('reaches the lobby when the progress flush hangs, after a bounded wait', async () => {
  await enterGame()
  vi.useFakeTimers()
  mocks.gameStore.phase = 'gameover'
  mocks.gameStore.flushProgressBeforeTransition.mockImplementation(() => new Promise(() => {}))
  await view.click('go-lobby')
  expect(has('start-stage')).toBe(false)
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  await flush()
  expect(has('start-stage')).toBe(true)
})

it('pushes a history entry on game entry so browser back stays inside the app', async () => {
  const before = window.history.length
  await enterGame()
  expect(window.history.length).toBe(before + 1)
  expect(window.history.state?.ezsGame).toBe(true)
})

it('browser back on a finished run (result screen) goes to the lobby', async () => {
  await enterGame()
  mocks.gameStore.phase = 'gameover'
  await popState()
  expect(has('start-stage')).toBe(true)
  expect(has('title-screen')).toBe(false)
})

it('browser back during play pauses first, and a second back quits the run to the lobby', async () => {
  await enterGame()
  mocks.gameStore.phase = 'playing'
  await popState()
  expect(mocks.gameStore.pauseGame).toHaveBeenCalledWith('manual')
  expect(has('gameplay-screen')).toBe(true)
  expect(window.history.state?.ezsGame).toBe(true)
  await popState()
  expect(mocks.gameStore.quitPausedRun).toHaveBeenCalledTimes(1)
  expect(has('start-stage')).toBe(true)
})

it('browser back from the in-run ranking returns to the run, not out of the app', async () => {
  await enterGame()
  mocks.gameStore.phase = 'paused'
  await view.click('go-ranking')
  expect(has('ranking-back')).toBe(true)
  await popState()
  expect(view.container.querySelector('[data-testid="gameplay-screen"]').closest('[hidden]')).toBeNull()
  expect(has('ranking-back')).toBe(false)
})

it('ignores browser back once already in the lobby', async () => {
  await enterGame()
  mocks.gameStore.phase = 'gameover'
  await view.click('go-lobby')
  await flush()
  expect(has('start-stage')).toBe(true)
  await popState()
  expect(has('start-stage')).toBe(true)
})
