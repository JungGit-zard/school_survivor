// @vitest-environment jsdom
// Stage 6 탈출구 클리어: 결승 테이프가 끊기는 동안(~0.7초) 결과창·1부 엔딩 컷을 미룬다(useStage6ClearPanelHold.js).
// store는 그대로 즉시 'cleared'가 된다 — 보이는 순간만 바뀐다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { getLocale, setLocale } from '../lib/i18n.js'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { STAGE6_FINISH_TAPE_SNAP_SECONDS } from './expansion/stage6FinishTape.js'
import { STAGE6_CLEAR_PANEL_HOLD_MS, resetStage6ClearPanelHoldLedger } from './useStage6ClearPanelHold.js'

let root, container, originalState, originalLocale
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  originalState = useGameStore.getState()
  originalLocale = getLocale()
  setLocale('ko')
  _resetFirebaseProgressForTests()
  useAuthStore.setState({ user: null, status: 'signedOut' })
  useGameStore.getState().resetGame('stage1')
  resetStage6ClearPanelHoldLedger()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container.remove()
  useGameStore.setState(originalState, true)
  _seedHydratedFirebaseProgressForTests()
  setLocale(originalLocale)
  resetRuntimeTime()
  document.documentElement.removeAttribute('data-reduced-effects')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const q = (id) => container.querySelector(`[data-testid="${id}"]`)

function renderPlaying(stageId, extra = {}) {
  setRuntimeElapsedMs(230_000)
  act(() => {
    useGameStore.setState({ currentStageId: stageId, phase: 'playing', pauseSource: null, elapsedMs: 230_000, bossDefeated: false, escapePortalActive: true, ...extra })
    root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
  })
}

function clearRun() {
  act(() => useGameStore.setState({ phase: 'cleared', pauseSource: null }))
}

function advance(ms) {
  act(() => { vi.advanceTimersByTime(ms) })
}

describe('Stage 6 exit clear holds the result panel for the finish-tape snap', () => {
  it('derives the hold from the tape snap time (~0.7 s)', () => {
    expect(STAGE6_CLEAR_PANEL_HOLD_MS).toBe(Math.round(STAGE6_FINISH_TAPE_SNAP_SECONDS * 1000) + 100)
    expect(STAGE6_CLEAR_PANEL_HOLD_MS).toBeGreaterThanOrEqual(650)
    expect(STAGE6_CLEAR_PANEL_HOLD_MS).toBeLessThanOrEqual(750)
  })

  it('keeps the run cleared at once but shows the panel and the ending only after the hold', () => {
    renderPlaying('stage6', { gameKey: 701 })
    clearRun()
    expect(useGameStore.getState().phase).toBe('cleared')
    expect(q('escape-success-screen')).toBeNull()
    expect(q('part1-ending-catcher')).toBeNull()
    expect(q('escape-finish-hold')).not.toBeNull()

    advance(STAGE6_CLEAR_PANEL_HOLD_MS - 50)
    expect(q('escape-success-screen')).toBeNull()
    expect(q('escape-finish-hold')).not.toBeNull()

    advance(50)
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).not.toBeNull()
    expect(q('part1-ending-catcher')).not.toBeNull()
  })

  it('blocks touches during the hold and the pause button cannot reopen the run', () => {
    renderPlaying('stage6', { gameKey: 702 })
    clearRun()
    const hold = q('escape-finish-hold')
    expect(hold.style.position).toBe('absolute')
    expect(hold.style.pointerEvents).toBe('auto')
    expect(hold.textContent).toBe('')
    const pause = q('bottom-right-pause')
    if (pause) act(() => pause.click())
    expect(useGameStore.getState().phase).toBe('cleared')
    advance(STAGE6_CLEAR_PANEL_HOLD_MS)
    expect(q('escape-success-screen')).not.toBeNull()
  })

  it('does not restart the hold when the HUD remounts mid-hold', () => {
    renderPlaying('stage6', { gameKey: 703 })
    clearRun()
    advance(400)
    act(() => root.unmount())
    root = createRoot(container)
    act(() => root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />))
    expect(q('escape-finish-hold')).not.toBeNull()
    advance(STAGE6_CLEAR_PANEL_HOLD_MS - 400)
    expect(q('escape-success-screen')).not.toBeNull()
  })
})

describe('everything else keeps today\'s timing', () => {
  it.each(['stage1', 'stage4', 'stage5'])('shows the escape panel at once on %s', (stageId) => {
    renderPlaying(stageId, { gameKey: 710 })
    clearRun()
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).not.toBeNull()
  })

  it('shows the Stage 6 panel and ending at once for a clear without the exit portal', () => {
    renderPlaying('stage6', { gameKey: 711, escapePortalActive: false })
    clearRun()
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).not.toBeNull()
    expect(q('part1-ending-catcher')).not.toBeNull()
  })

  it('never holds on game over', () => {
    renderPlaying('stage6', { gameKey: 712 })
    act(() => useGameStore.setState({ phase: 'gameover', deathCause: 'zombie' }))
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).toBeNull()
  })

  it('does not hold with the reduced-effects setting', () => {
    document.documentElement.setAttribute('data-reduced-effects', '')
    renderPlaying('stage6', { gameKey: 713 })
    clearRun()
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).not.toBeNull()
    expect(q('part1-ending-catcher')).not.toBeNull()
  })

  it('does not hold with OS prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query === '(prefers-reduced-motion: reduce)', media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    renderPlaying('stage6', { gameKey: 714 })
    clearRun()
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).not.toBeNull()
  })
})

describe('timer cleanup', () => {
  function holdTimerIds(setSpy) {
    return setSpy.mock.calls
      .map((call, index) => (call[1] === STAGE6_CLEAR_PANEL_HOLD_MS ? setSpy.mock.results[index].value : null))
      .filter((id) => id != null)
  }

  it('restart during the hold clears the timer and the next escape holds the full time again', () => {
    const setSpy = vi.spyOn(window, 'setTimeout')
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    renderPlaying('stage6', { gameKey: 720 })
    clearRun()
    const [timerId] = holdTimerIds(setSpy)
    expect(timerId).toBeDefined()

    advance(300)
    act(() => useGameStore.setState({ phase: 'playing', gameKey: 721 }))
    expect(clearSpy.mock.calls.some(([id]) => id === timerId)).toBe(true)
    expect(q('escape-finish-hold')).toBeNull()
    expect(q('escape-success-screen')).toBeNull()
    advance(STAGE6_CLEAR_PANEL_HOLD_MS)
    expect(useGameStore.getState().phase).toBe('playing')
    expect(q('escape-success-screen')).toBeNull()

    clearRun()
    expect(q('escape-finish-hold')).not.toBeNull()
    advance(STAGE6_CLEAR_PANEL_HOLD_MS - 50)
    expect(q('escape-success-screen')).toBeNull()
    advance(50)
    expect(q('escape-success-screen')).not.toBeNull()
  })

  it('restart after the hold starts the next run cleanly', () => {
    renderPlaying('stage6', { gameKey: 722 })
    clearRun()
    advance(STAGE6_CLEAR_PANEL_HOLD_MS)
    expect(q('escape-success-screen')).not.toBeNull()
    act(() => useGameStore.setState({ phase: 'playing', gameKey: 723 }))
    expect(q('escape-success-screen')).toBeNull()
    expect(q('escape-finish-hold')).toBeNull()
  })

  it('unmount during the hold clears the timer', () => {
    const setSpy = vi.spyOn(window, 'setTimeout')
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    renderPlaying('stage6', { gameKey: 724 })
    clearRun()
    const [timerId] = holdTimerIds(setSpy)
    expect(timerId).toBeDefined()
    act(() => root.unmount())
    root = null
    expect(clearSpy.mock.calls.some(([id]) => id === timerId)).toBe(true)
  })
})
