// @vitest-environment jsdom
// Stage 3 탈출 컷(Terry 2026-11-22): 니쿠오가 슬테라를 몰고 와 '타라'고 한다 → 탑니다/타지 않습니다.
// 타지 않습니다 = 로비, 탑니다 = 슬테라 코스트 런(iframe) → exit 메시지 → 로비. 레이서 자체는 아무 것도 저장하지 않는다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD from './HUD.jsx'
import { NIKUO_CUT_LINES, NIKUO_CUT_STAGE_ID, NIKUO_WHITEOUT_MS } from './NikuoCut.jsx'
import { SLTERA_RUN_EXIT_MESSAGE, SLTERA_RUN_SRC, readSlteraRunResult } from './SlteraRunOverlay.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { getLocale, setLocale } from '../lib/i18n.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'

let root, container, originalState, originalLocale
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  originalState = useGameStore.getState()
  originalLocale = getLocale()
  setLocale('ko')
  _resetFirebaseProgressForTests()
  useAuthStore.setState({ user: null, status: 'signedOut' })
  useGameStore.getState().resetGame('stage1')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  useGameStore.setState(originalState, true)
  _seedHydratedFirebaseProgressForTests()
  setLocale(originalLocale)
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const q = (id) => container.querySelector(`[data-testid="${id}"]`)
const tap = () => act(() => q('nikuo-cut-catcher').dispatchEvent(new Event('pointerdown', { bubbles: true })))

function renderCleared(stageId, extra = {}, props = {}) {
  const onGoToLobby = props.onGoToLobby ?? vi.fn()
  act(() => {
    useGameStore.setState({ currentStageId: stageId, phase: 'cleared', elapsedMs: 200_000, bossDefeated: true, ...extra })
    root.render(<HUD onGoToTitle={() => {}} onGoToLobby={onGoToLobby} onOpenCoinShop={() => {}} />)
  })
  // 탈출 직후 화이트아웃이 다 하얘질 때까지 기다린다.
  if (!props.holdWhiteout) act(() => vi.advanceTimersByTime(NIKUO_WHITEOUT_MS))
  return onGoToLobby
}

function advanceToChoice() {
  for (let i = 0; i < NIKUO_CUT_LINES.length; i += 1) tap()
}

describe('Stage 3 clear: Nikuo arrives in the Sltera', () => {
  it('whites out the screen first; the Nikuo dialogue appears right after the whiteout', () => {
    renderCleared(NIKUO_CUT_STAGE_ID, {}, { holdWhiteout: true })
    expect(q('nikuo-whiteout')).not.toBeNull()
    expect(q('nikuo-cut-catcher')).toBeNull()
    expect(q('escape-success-screen').style.visibility).toBe('hidden')
    act(() => vi.advanceTimersByTime(NIKUO_WHITEOUT_MS - 1))
    expect(q('nikuo-cut-catcher')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(q('nikuo-cut-line').textContent).toBe(getDialogueText(NIKUO_CUT_LINES[0].id))
    // 흰 층은 대사 뒤에 계속 깔린다.
    expect(q('nikuo-whiteout')).not.toBeNull()
    // 보스를 안 잡고 탈출해도 똑같다.
    act(() => useGameStore.setState({ phase: 'playing', gameKey: useGameStore.getState().gameKey + 1 }))
    renderCleared(NIKUO_CUT_STAGE_ID, { bossDefeated: false }, { holdWhiteout: true })
    expect(q('nikuo-whiteout')).not.toBeNull()
    expect(q('nikuo-cut-catcher')).toBeNull()
    act(() => vi.advanceTimersByTime(NIKUO_WHITEOUT_MS))
    expect(q('nikuo-cut-catcher')).not.toBeNull()
  })

  it('plays the Nikuo lines with Nikuo as speaker and his Sltera portrait over the result screen', () => {
    renderCleared(NIKUO_CUT_STAGE_ID)
    expect(q('escape-success-screen').getAttribute('aria-hidden')).toBe('true')
    expect(q('nikuo-cut-portrait').dataset.speaker).toBe('nikuo')
    expect(q('nikuo-cut-portrait').getAttribute('alt')).toBe('슬테라를 탄 니쿠오')
    expect(q('nikuo-cut-portrait').getAttribute('src')).toContain('nikuo_sltera')
    expect(q('nikuo-cut-line').textContent).toBe(getDialogueText(NIKUO_CUT_LINES[0].id))
    expect(q('nikuo-cut-line').textContent).toBe('어이, 거기 꼬맹이! 꾸물대지 말고 타라!')
    tap()
    // 로자리 반응 한 줄: 초상이 Stage 1 인트로와 같은 로자리 초상으로 바뀐다.
    expect(q('nikuo-cut-portrait').dataset.speaker).toBe('rosari')
    expect(q('nikuo-cut-portrait').getAttribute('src')).toContain('rosari_intro')
    tap()
    expect(q('nikuo-cut-portrait').dataset.speaker).toBe('nikuo')
  })

  it('uses the same dialogue UI as the Stage 1 Rosari intro (box, portrait frame, line, hint, skip)', () => {
    act(() => {
      useGameStore.setState({ currentStageId: 'stage1', phase: 'paused', pauseSource: 'intro', introDialogue: { index: 0 }, introStageId: 'stage1' })
      root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
    })
    const intro = q('stage-intro-catcher')
    const introBox = intro.querySelector('[role="dialog"]')
    const introLine = q('stage-intro-line')
    const introFrame = q('stage-intro-portrait').parentElement
    const introSkip = q('stage-intro-skip')
    const pick = (el, keys) => Object.fromEntries(keys.map((k) => [k, el.style[k]]))
    const boxKeys = ['background', 'border', 'borderRadius', 'padding', 'maxWidth', 'width', 'textAlign']
    const frameKeys = ['width', 'height', 'borderRadius', 'border', 'background']
    const lineKeys = ['fontSize', 'color', 'lineHeight', 'flex', 'minWidth']
    const skipKeys = ['position', 'top', 'right', 'minHeight', 'background', 'fontSize']
    const introStyle = { box: pick(introBox, boxKeys), frame: pick(introFrame, frameKeys), line: pick(introLine, lineKeys), skip: pick(introSkip, skipKeys), background: intro.style.background }
    act(() => useGameStore.setState({ introDialogue: null }))
    renderCleared(NIKUO_CUT_STAGE_ID)
    const cut = q('nikuo-cut-catcher')
    expect({
      box: pick(cut.querySelector('[role="dialog"]'), boxKeys),
      frame: pick(q('nikuo-cut-portrait').parentElement, frameKeys),
      line: pick(q('nikuo-cut-line'), lineKeys),
      skip: pick(q('nikuo-cut-skip'), skipKeys),
      background: cut.style.background,
    }).toEqual(introStyle)
    expect(cut.textContent).toContain('화면을 탭하면 계속')
  })

  it('does not appear on other stages', () => {
    for (const stageId of ['stage1', 'stage2', 'stage4', 'stage5', 'stage6']) {
      act(() => useGameStore.setState({ phase: 'playing', gameKey: useGameStore.getState().gameKey + 1 }))
      renderCleared(stageId)
      expect(q('nikuo-cut-catcher')).toBeNull()
    }
  })

  it('asks 「슬테라에 타시겠습니까?」 after the last line; skip jumps to the question, never past it', () => {
    renderCleared(NIKUO_CUT_STAGE_ID)
    act(() => q('nikuo-cut-skip').click())
    expect(q('nikuo-cut-line').textContent).toBe('슬테라에 타시겠습니까?')
    expect(q('nikuo-cut-yes').textContent).toBe('탑니다')
    expect(q('nikuo-cut-no').textContent).toBe('타지 않습니다')
    expect(q('nikuo-cut-skip')).toBeNull()
    // 빈 곳 탭으로는 선택지가 넘어가지 않는다.
    tap()
    expect(q('nikuo-cut-choice')).not.toBeNull()
    // 큰 터치 타깃
    expect(parseInt(q('nikuo-cut-yes').style.minHeight, 10)).toBeGreaterThanOrEqual(44)
    expect(parseInt(q('nikuo-cut-no').style.minHeight, 10)).toBeGreaterThanOrEqual(44)
  })

  it('「타지 않습니다」 goes straight to the lobby with 0 racer kills and opens no racer', () => {
    const finalize = vi.fn()
    act(() => useGameStore.setState({ finalizeDeferredStageResult: finalize }))
    const onGoToLobby = renderCleared(NIKUO_CUT_STAGE_ID)
    advanceToChoice()
    act(() => q('nikuo-cut-no').click())
    expect(q('nikuo-cut-catcher')).toBeNull()
    expect(q('sltera-run-overlay')).toBeNull()
    expect(finalize).toHaveBeenCalledWith({ racerKills: 0 })
    expect(onGoToLobby).toHaveBeenCalledTimes(1)
  })

  it('「탑니다」 opens the full-screen racer; its exit message returns to the lobby and passes only the kill count on', () => {
    const finalize = vi.fn()
    act(() => useGameStore.setState({ finalizeDeferredStageResult: finalize }))
    const onGoToLobby = renderCleared(NIKUO_CUT_STAGE_ID)
    const before = useGameStore.getState()
    const watched = ['goldTotal', 'goldSession', 'runKills', 'escapeResult', 'rankingRun', 'missionProgress', 'phase']
    const snapshot = Object.fromEntries(watched.map((key) => [key, before[key]]))
    advanceToChoice()
    act(() => q('nikuo-cut-yes').click())
    const frame = q('sltera-run-frame')
    expect(frame).not.toBeNull()
    expect(frame.getAttribute('src')).toBe(SLTERA_RUN_SRC)
    expect(SLTERA_RUN_SRC).toContain('course=gym-to-cafeteria')
    expect(SLTERA_RUN_SRC).toContain('embed=1')
    expect(q('escape-success-screen').getAttribute('aria-hidden')).toBe('true')
    expect(onGoToLobby).not.toHaveBeenCalled()

    // 다른 출처·다른 타입 메시지는 무시한다.
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { type: SLTERA_RUN_EXIT_MESSAGE, kills: 9 }, origin: 'https://evil.example' })))
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'other' }, origin: window.location.origin })))
    expect(q('sltera-run-overlay')).not.toBeNull()

    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: { type: SLTERA_RUN_EXIT_MESSAGE, kills: 12, arrived: true },
      origin: window.location.origin,
    })))
    expect(q('sltera-run-overlay')).toBeNull()
    expect(finalize).toHaveBeenCalledTimes(1)
    expect(finalize).toHaveBeenCalledWith({ racerKills: 12 })
    expect(onGoToLobby).toHaveBeenCalledTimes(1)
    // 레이서 경로 자체는 스토어의 점수·골드·기록·미션 상태를 한 칸도 바꾸지 않는다.
    const after = useGameStore.getState()
    for (const key of watched) expect(after[key]).toBe(snapshot[key])
  })

  it('cleans up racer kill values from the message', () => {
    expect(readSlteraRunResult({ kills: 7.9, arrived: true })).toEqual({ kills: 7, arrived: true })
    expect(readSlteraRunResult({ kills: -3 })).toEqual({ kills: 0, arrived: false })
    expect(readSlteraRunResult({ kills: 'x', arrived: 'yes' })).toEqual({ kills: 0, arrived: false })
    expect(readSlteraRunResult(undefined)).toEqual({ kills: 0, arrived: false })
  })

  it('works without the deferred-result API (no-op until the store exposes it)', () => {
    act(() => useGameStore.setState({ finalizeDeferredStageResult: undefined }))
    const onGoToLobby = renderCleared(NIKUO_CUT_STAGE_ID)
    advanceToChoice()
    act(() => q('nikuo-cut-no').click())
    expect(onGoToLobby).toHaveBeenCalledTimes(1)
  })
})
