// @vitest-environment jsdom
// Stage 6 「운동장 최후의 조회」 HUD(스펙 Part C C-10): 형태 배너·원거리 경고·훈화·소환·정문 힌트·1부 결과 화면·엔딩 컷.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD, { PART1_ENDING_IDS } from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { getLocale, setLocale } from '../lib/i18n.js'
import { PART1_FINAL_STAGE_ID, getStageConfig } from '../lib/stageConfig.js'
import { STAGE6_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'
import { publishAssemblySpeechCue } from '../lib/stage6AssemblySpeech.js'
import { publishBossSummonWarning } from '../lib/expansionBossSummons.js'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'

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
  vi.unstubAllGlobals()
})

function renderStage6(elapsedMs, extra = {}) {
  setRuntimeElapsedMs(elapsedMs)
  act(() => {
    useGameStore.setState({ currentStageId: 'stage6', phase: 'playing', elapsedMs, bossSpawned: false, matildaSpawned: false, ...extra })
    root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
  })
}

// 신호 발행 뒤 HUD를 다시 그리게 한다(Stage6HudCues는 HUD가 다시 그릴 때·50ms 틱마다 신호를 읽는다).
function nudge(elapsedMs) {
  setRuntimeElapsedMs(elapsedMs)
  act(() => useGameStore.setState({ elapsedMs }))
}

describe('Stage 6 in-run HUD', () => {
  it('shows the stage6 formation banners from labelKey in the current language', () => {
    renderStage6(62_000)
    expect(container.textContent).toContain('앞뒤로 조회 줄이 선다')
    act(() => setLocale('en'))
    nudge(62_100)
    expect(container.textContent).toContain('Lines form front and back')
    expect(STAGE6_SPAWN_TELEGRAPHS.every((row) => row.labelKey?.startsWith('hud.stage6.formation.'))).toBe(true)
  })

  it('warns about stage6 ranged zombies before the 8 s E04 gate, with stage6 copy', () => {
    renderStage6(6_000)
    expect(container.textContent).toContain('운동장 저편에서 날아온다')
    nudge(8_000)
    expect(container.textContent).not.toContain('운동장 저편에서 날아온다')
  })

  it('shows the speech tutorial once, the short cue from the second cycle, and the track summon banner', () => {
    const gameKey = () => useGameStore.getState().gameKey
    renderStage6(27_000)
    expect(container.querySelector('[data-testid="stage6-speech-cue"]')).toBeNull()

    publishAssemblySpeechCue(gameKey(), 'tutorial', 0)
    nudge(27_500)
    expect(container.querySelector('[data-testid="stage6-speech-cue"]').dataset.kind).toBe('speechTutorial')
    expect(container.textContent).toContain('훈화 말씀 — 고리 선 위만 피하세요')
    // 첫 회차 preCue는 튜토리얼이 덮고 있으므로 짧은 경고로 바꾸지 않는다.
    publishAssemblySpeechCue(gameKey(), 'preCue', 0)
    nudge(29_000)
    expect(container.querySelector('[data-testid="stage6-speech-cue"]')).toBeNull()

    publishAssemblySpeechCue(gameKey(), 'preCue', 1)
    nudge(59_000)
    expect(container.querySelector('[data-testid="stage6-speech-cue"]').dataset.kind).toBe('speechShort')
    nudge(60_100)
    expect(container.querySelector('[data-testid="stage6-speech-cue"]')).toBeNull()

    publishBossSummonWarning(gameKey(), 'B05')
    nudge(161_000)
    expect(container.querySelector('[data-testid="stage6-track-summon"]').textContent).toContain('운동장 10바퀴!')
    nudge(162_300)
    expect(container.querySelector('[data-testid="stage6-track-summon"]')).toBeNull()
  })

  it('ignores cues published for another run', () => {
    renderStage6(27_000)
    publishAssemblySpeechCue(useGameStore.getState().gameKey + 99, 'tutorial', 0)
    nudge(27_500)
    expect(container.querySelector('[data-testid="stage6-speech-cue"]')).toBeNull()
  })

  it('points to the gate from 192 s until the exit opens, above the joystick area', () => {
    renderStage6(191_000)
    expect(container.querySelector('[data-testid="stage6-gate-hint"]')).toBeNull()
    nudge(195_000)
    const hint = container.querySelector('[data-testid="stage6-gate-hint"]')
    expect(hint.textContent).toContain('곧 정문이 열린다')
    expect(hint.textContent).toContain('↓')
    expect(hint.style.bottom).toContain('96px')
    act(() => useGameStore.setState({ escapePortalActive: true, elapsedMs: 195_100 }))
    expect(container.querySelector('[data-testid="stage6-gate-hint"]')).toBeNull()
  })

  it('adds the Matilda flavor line to the stage6 Matilda countdown only', () => {
    const matildaSec = getStageConfig('stage6').matildaSec ?? 210
    renderStage6((matildaSec - 2) * 1000)
    expect(container.querySelector('[data-testid="matilda-warning-flavor"]').textContent).toBe('교문 밖에서 마틸다가 들어온다!')
    act(() => useGameStore.setState({ currentStageId: 'stage1', elapsedMs: (getStageConfig('stage1').matildaSec - 2) * 1000 }))
    expect(container.querySelector('[data-testid="matilda-warning-flavor"]')).toBeNull()
  })
})

describe('Stage 6 escape = Part 1 complete', () => {
  function renderCleared(extra = {}) {
    act(() => {
      useGameStore.setState({ currentStageId: PART1_FINAL_STAGE_ID, phase: 'cleared', elapsedMs: 230_000, bossDefeated: true, ...extra })
      root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
    })
  }

  it('plays the 3-line ending over the result panel, tap to advance, then shows the Part 1 result', () => {
    renderCleared()
    const screen = container.querySelector('[data-testid="escape-success-screen"]')
    expect(screen.getAttribute('aria-hidden')).toBe('true')
    const line = () => container.querySelector('[data-testid="part1-ending-line"]')?.textContent
    expect(line()).toBe(getDialogueText(PART1_ENDING_IDS[0]))
    const catcher = container.querySelector('[data-testid="part1-ending-catcher"]')
    act(() => catcher.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(line()).toBe(getDialogueText(PART1_ENDING_IDS[1]))
    act(() => catcher.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(line()).toBe(getDialogueText(PART1_ENDING_IDS[2]))
    act(() => catcher.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(container.querySelector('[data-testid="part1-ending-catcher"]')).toBeNull()
    expect(screen.getAttribute('aria-hidden')).toBeNull()

    expect(container.querySelector('#escape-success-title').textContent).toBe('교문 탈출 성공')
    expect(container.querySelector('[data-testid="escape-continue-hint"]').textContent).toBe('1부 완결! 좀비학교를 빠져나왔습니다.')
    // 보스를 쓰러뜨렸어도 1부 마지막이라 이어 가기는 없다.
    expect(container.querySelector('[data-testid="escape-continue-next-stage"]')).toBeNull()
    const teaser = container.querySelector('[data-testid="part1-endless-teaser"]')
    expect(teaser.textContent).toBe('엔드리스 모드 — 준비 중')
    expect(teaser.getAttribute('aria-disabled')).toBe('true')
    expect(teaser.tagName).not.toBe('BUTTON')
    expect(teaser.style.pointerEvents).toBe('none')
  })

  it('always offers a 44px-class skip button that closes the ending at once', () => {
    renderCleared()
    const skip = container.querySelector('[data-testid="part1-ending-skip"]')
    expect(skip).not.toBeNull()
    act(() => skip.click())
    expect(container.querySelector('[data-testid="part1-ending-catcher"]')).toBeNull()
  })

  it('shows the ending again on the next Stage 6 escape (every escape, not once per account)', () => {
    renderCleared({ gameKey: 501 })
    act(() => container.querySelector('[data-testid="part1-ending-skip"]').click())
    act(() => useGameStore.setState({ phase: 'playing', gameKey: 502 }))
    act(() => useGameStore.setState({ phase: 'cleared' }))
    expect(container.querySelector('[data-testid="part1-ending-catcher"]')).not.toBeNull()
  })

  it('keeps the normal escape title and no ending outside Stage 6', () => {
    act(() => {
      useGameStore.setState({ currentStageId: 'stage4', phase: 'cleared', elapsedMs: 230_000 })
      root.render(<HUD onGoToTitle={() => {}} onOpenCoinShop={() => {}} />)
    })
    expect(container.querySelector('#escape-success-title').textContent).toBe('탈출 성공')
    expect(container.querySelector('[data-testid="part1-ending-catcher"]')).toBeNull()
    expect(container.querySelector('[data-testid="part1-endless-teaser"]')).toBeNull()
  })
})
