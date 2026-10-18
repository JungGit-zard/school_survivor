// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, getFirebaseProgressRuntimeSnapshot } from '../lib/firebaseProgress.js'
import { getRankingScore } from '../lib/rankingScorePolicy.js'
import { getLocale, setLocale } from '../lib/i18n.js'

let root, container, originalState, originalLocale
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  originalState = useGameStore.getState()
  originalLocale = getLocale()
  setLocale('ko')
  _resetFirebaseProgressForTests()
  useAuthStore.setState({ user: null, status: 'signedOut' })
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ phase: 'playing', elapsedMs: 240_000 })
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
})

function renderSuccess(props = {}) {
  act(() => {
    useGameStore.getState().clearStage()
    root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} {...props} />)
  })
}

describe('escape success choices', () => {
  it('waits for the choice and continues the cleared score without guest progress writes', async () => {
    const remoteBefore = getFirebaseProgressRuntimeSnapshot()
    renderSuccess()
    const score = getRankingScore({ stageId: 'stage1', survivalSeconds: 240, cleared: true })
    const actions = container.querySelector('[data-testid="result-primary-actions"]')
    expect([...actions.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
      '다음 스테이지 계속', '다른 스테이지 선택', '로비에서 쉬기',
    ])
    expect(container.querySelector('#escape-success-title').textContent).toBe('탈출 성공')
    expect(container.querySelector('[data-testid="escape-total-score"]').textContent).toContain(String(score))
    expect(container.querySelector('[data-testid="escape-success-screen"] img').getAttribute('src')).toContain('escape_success.png')
    expect(useGameStore.getState()).toMatchObject({ phase: 'cleared', currentStageId: 'stage1' })
    await act(async () => actions.querySelector('button').click())
    expect(useGameStore.getState()).toMatchObject({ phase: 'playing', currentStageId: 'stage2', continuousScoreBase: score })
    expect(container.querySelector('[data-testid="live-score"]').textContent).toContain(String(score + getRankingScore({ stageId: 'stage2' })))
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(remoteBefore)
  })

  it.each(['다른 스테이지 선택', '로비에서 쉬기'])('returns through the existing lobby callback for %s', (label) => {
    const onGoToLobby = vi.fn()
    renderSuccess({ onGoToLobby })
    const button = [...container.querySelector('[data-testid="result-primary-actions"]').querySelectorAll('button')].find((item) => item.textContent === label)
    act(() => button.click())
    expect(onGoToLobby).toHaveBeenCalledOnce()
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().continuousScoreBase).toBe(0)
  })

  it('continues Stage4 into the explicitly approved Stage5 and preserves cumulative score', async () => {
    useGameStore.getState().resetGame('stage4')
    useGameStore.setState({ phase: 'playing', elapsedMs: 100_000, continuousScoreBase: 500 })
    renderSuccess()
    const score = 500 + getRankingScore({ stageId: 'stage4', survivalSeconds: 100, cleared: true })
    const next = [...container.querySelector('[data-testid="result-primary-actions"]').querySelectorAll('button')].find((button) => button.textContent === '다음 스테이지 계속')
    expect(next).toBeDefined()
    expect(container.querySelector('[data-testid="escape-total-score"]').textContent).toContain(String(score))
    await act(async () => next.click())
    expect(useGameStore.getState()).toMatchObject({ phase: 'playing', currentStageId: 'stage5', continuousScoreBase: score })
  })

  it.each(['stage5', 'stage10'])('shows the cumulative final escape at %s without a nonexistent next stage', (stageId) => {
    useGameStore.getState().resetGame(stageId)
    useGameStore.setState({ phase: 'playing', elapsedMs: 100_000, continuousScoreBase: 500 })
    renderSuccess()
    expect(container.textContent).not.toContain('다음 스테이지 계속')
    expect(container.textContent).toContain('모든 스테이지를 탈출했습니다!')
    expect(container.querySelector('[data-testid="escape-total-score"]').textContent).toContain((500 + getRankingScore({ stageId, survivalSeconds: 100, cleared: true })).toLocaleString())
    expect(container.querySelector('section').style.overflowY).toBe('auto')
    expect(container.querySelector('section').style.maxHeight).toBe('100%')
    expect(container.querySelector('details').open).toBe(false)
  })
})
