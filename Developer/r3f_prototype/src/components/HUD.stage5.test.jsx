// @vitest-environment jsdom
// Stage 5 「교무실 최종 돌파」 HUD(스펙 Part B §10-5, §5-7, §9): 형태 배너·12초 투사체 경고·호출 가이드·패시브 아이콘/이름.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { getLocale, setLocale } from '../lib/i18n.js'
import { STAGE5_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'
import { STAGE5_E04_INTRO_SEC } from '../lib/stage2ProjectileRules.js'
import { publishStage5CallLaneState, resetStage5CallLaneState } from '../lib/stage5CallLaneRuntime.js'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'

let root, container, originalState, originalLocale
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
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
  resetRuntimeTime()
  resetStage5CallLaneState()
  vi.unstubAllGlobals()
})

function renderStage5(elapsedMs, extra = {}) {
  setRuntimeElapsedMs(elapsedMs)
  act(() => {
    useGameStore.setState({ currentStageId: 'stage5', phase: 'playing', elapsedMs, bossSpawned: false, matildaSpawned: false, ...extra })
    root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
  })
}

describe('Stage 5 HUD', () => {
  it('shows each formation banner through t(labelKey) in ko and en', () => {
    renderStage5(58_000)
    expect(container.textContent).toContain('지각생들이 사방에서 몰려온다')
    act(() => setLocale('en'))
    act(() => useGameStore.setState({ elapsedMs: 58_100 }))
    expect(container.textContent).toContain('Late students rush in from every side')
    act(() => setLocale('ko'))
    for (const telegraph of STAGE5_SPAWN_TELEGRAPHS) {
      act(() => useGameStore.setState({ elapsedMs: (telegraph.sec - 1) * 1000 }))
      expect(container.textContent).toContain(telegraph.label)
    }
  })

  it('warns about flying printouts in the 3 s before the 12 s E04 gate', () => {
    expect(STAGE5_E04_INTRO_SEC).toBe(12)
    renderStage5(10_000)
    expect(container.textContent).toContain('프린트 탄환 주의')
    act(() => useGameStore.setState({ elapsedMs: 12_000 }))
    expect(container.textContent).not.toContain('프린트 탄환 주의')
  })

  it('mounts the call guide and yields to the higher-priority warning banners', () => {
    renderStage5(75_000)
    publishStage5CallLaneState(useGameStore.getState().gameKey, 0, 1, 'calling')
    setRuntimeElapsedMs(75_100)
    act(() => useGameStore.setState({ elapsedMs: 75_100 }))
    const guide = container.querySelector('[data-testid="stage5-call-guide"]')
    expect(guide.dataset.kind).toBe('calling')
    expect(guide.textContent).toBe('전교 호출 중! 파란 통로 양끝에서 몰려와요')
    // 형태 배너가 뜨는 동안에는 가이드를 숨긴다(Stage4HazardGuide와 같은 규칙).
    act(() => useGameStore.setState({ elapsedMs: 106_000 }))
    expect(container.querySelector('[data-testid="stage5-call-guide"]')).toBeNull()
  })
})

describe('boss passive slots', () => {
  it('shows the B10 / B05 icons and localizes every passive name and description', () => {
    act(() => {
      useGameStore.setState({ currentStageId: 'stage1', phase: 'playing', bossPassiveUnlocks: { b01SetSquare: true, b10ApprovalStamp: true, b05PrincipalMic: true } })
      root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
    })
    const bag = container.querySelector('[aria-controls="quest-inventory-panel"]')
    act(() => bag.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    const text = container.textContent
    expect(text).toContain('📝')
    expect(text).toContain('🎤')
    expect(text).toContain('교감 결재 도장')
    expect(text).toContain('교장 훈화 마이크')
    act(() => setLocale('en'))
    const enText = container.textContent
    expect(enText).toContain('Set Square')
    expect(enText).not.toContain('교감 결재 도장')
    expect(enText).not.toContain('삼각자')
  })
})
