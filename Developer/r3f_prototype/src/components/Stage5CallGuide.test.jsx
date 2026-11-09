// @vitest-environment jsdom
// Stage 5 전교 호출 방송 보조 문구(스펙 Part B §10-5).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stage5CallGuide, { stage5GuideKind } from './Stage5CallGuide.jsx'
import { publishStage5CallLaneState, resetStage5CallLaneState } from '../lib/stage5CallLaneRuntime.js'
import { publishBossSummonWarning } from '../lib/expansionBossSummons.js'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { setLocale } from '../lib/i18n.js'

const base = { stageId: 'stage5', phase: 'playing', gameKey: 7, bossDefeated: false, escapePortalActive: false, callState: { gameKey: 7, phase: 'idle' }, summonActive: false }

describe('stage5GuideKind priority', () => {
  it('orders chime > calling > bossSummon > bossIntro > orientation > bossDefeated/escape', () => {
    expect(stage5GuideKind({ ...base, elapsedMs: 70_500, callState: { gameKey: 7, phase: 'chiming' } })).toBe('chime')
    expect(stage5GuideKind({ ...base, elapsedMs: 75_000, callState: { gameKey: 7, phase: 'calling' } })).toBe('calling')
    expect(stage5GuideKind({ ...base, elapsedMs: 75_000, callState: { gameKey: 7, phase: 'calling' }, summonActive: true })).toBe('calling')
    expect(stage5GuideKind({ ...base, elapsedMs: 151_000, summonActive: true })).toBe('bossSummon')
    expect(stage5GuideKind({ ...base, elapsedMs: 151_000 })).toBe('bossIntro')
    expect(stage5GuideKind({ ...base, elapsedMs: 1_000 })).toBe('orientation')
    expect(stage5GuideKind({ ...base, elapsedMs: 4_000 })).toBe('lanes')
    expect(stage5GuideKind({ ...base, elapsedMs: 7_000 })).toBe('callRule')
    expect(stage5GuideKind({ ...base, elapsedMs: 20_000 })).toBeNull()
    expect(stage5GuideKind({ ...base, elapsedMs: 200_000, bossDefeated: true })).toBe('bossDefeated')
    expect(stage5GuideKind({ ...base, elapsedMs: 215_000, bossDefeated: true, escapePortalActive: true })).toBe('escape')
  })

  it('ignores another run\'s call state, other stages and non-playing phases', () => {
    expect(stage5GuideKind({ ...base, elapsedMs: 75_000, callState: { gameKey: 6, phase: 'calling' } })).toBeNull()
    expect(stage5GuideKind({ ...base, stageId: 'stage4', elapsedMs: 1_000 })).toBeNull()
    expect(stage5GuideKind({ ...base, phase: 'paused', elapsedMs: 1_000 })).toBeNull()
  })
})

describe('Stage5CallGuide render', () => {
  let root, container
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    setLocale('ko')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    resetStage5CallLaneState()
    resetRuntimeTime()
    setLocale('ko')
    vi.unstubAllGlobals()
  })

  const render = (props = {}) => act(() => root.render(<Stage5CallGuide stageId="stage5" phase="playing" gameKey={7} {...props} />))
  const guide = () => container.querySelector('[data-testid="stage5-call-guide"]')

  it('shows the chime and calling copy from the published lane state, styled like the stage4 band in blue', () => {
    setRuntimeElapsedMs(70_500)
    publishStage5CallLaneState(7, 0, 2, 'chiming')
    render()
    expect(guide().dataset.kind).toBe('chime')
    expect(guide().textContent).toBe('딩동댕동! 파란 통로에서 벗어나요')
    expect(guide().getAttribute('role')).toBe('status')
    expect(guide().style.pointerEvents).toBe('none')
    expect(guide().style.maxHeight).toBe('44px')
    expect(guide().style.fontSize).toBe('12px')

    setRuntimeElapsedMs(75_000)
    publishStage5CallLaneState(7, 0, 2, 'calling')
    render()
    expect(guide().dataset.kind).toBe('calling')
  })

  it('shows orientation at 1 s, nothing on stage4, nothing when hidden', () => {
    setRuntimeElapsedMs(1_000)
    render()
    expect(guide().dataset.kind).toBe('orientation')
    render({ stageId: 'stage4' })
    expect(guide()).toBeNull()
    render({ hidden: true })
    expect(guide()).toBeNull()
  })

  it('shows the staff-meeting summon line for 2 s of game time after a summon warning for this run', () => {
    setRuntimeElapsedMs(160_000)
    render()
    expect(guide()).toBeNull()
    publishBossSummonWarning(7, 'B10')
    render()
    expect(guide().dataset.kind).toBe('bossSummon')
    setRuntimeElapsedMs(162_100)
    render()
    expect(guide()).toBeNull()
  })

  it('keeps the longest English line inside two 16px lines at a 390px phone width', () => {
    setLocale('en')
    setRuntimeElapsedMs(75_000)
    publishStage5CallLaneState(7, 0, 1, 'calling')
    render()
    // 390 폭: 왼쪽 14 + 116 + 8, 오른쪽 14 → 띠 폭 238px, 안쪽 222px. 12px 글꼴 평균 글자폭 ≈ 6.2px → 한 줄 ≈ 35자.
    const text = guide().textContent
    expect(text.length).toBeLessThanOrEqual(70)
  })
})
