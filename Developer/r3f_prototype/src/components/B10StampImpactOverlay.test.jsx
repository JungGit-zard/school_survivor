// @vitest-environment jsdom
// Stage 5 B10 교감 좀비 「결재 도장」 타격 순간 화면 도장 자국(2026-11-22 Terry).
// 실제 확장 공격 런타임(stepExpansionAttack)으로 windup → active를 돌려, 피해가 나는 그 프레임에만 찍히는지 본다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import B10StampImpactOverlay, { B10_STAMP_IMPACT_OVERLAY } from './B10StampImpactOverlay.jsx'
import { createB10StampImpactTracker, publishB10StampImpact, stepB10StampImpact, subscribeB10StampImpact } from '../lib/b10StampImpact.js'
import { clearExpansionAttacks, createExpansionAttackState, stepExpansionAttack } from '../lib/expansionAttackRuntime.js'

// expansionAttackRuntime.test.js와 같은 배치: 보스 (0,0), 플레이어 (1.5,0.5), 실제 stage5 장애물.
const base = { x: 0, z: 0, playerX: 1.5, playerZ: 0.5, playing: true, alive: true, gameKey: 0, hpRatio: 1, deltaMs: 0, stageId: 'stage5', halfX: 9.36, halfZ: 16 }

describe('B10 stamp impact signal on the real attack runtime', () => {
  afterEach(() => clearExpansionAttacks())

  it('fires on the active (damage) frame, never during the windup telegraph, and once per stamp', () => {
    const state = createExpansionAttackState('B10', 'b10', 0)
    const tracker = createB10StampImpactTracker()
    const events = []
    const off = subscribeB10StampImpact((event) => events.push(event))
    const frame = (deltaMs) => {
      const out = stepExpansionAttack(state, { ...base, deltaMs })
      const fired = stepB10StampImpact(tracker, state.snapshot, 0)
      return { damage: out.damage, fired, phase: state.snapshot?.phase ?? null }
    }

    // 첫 공격 대기 2.5s → b10_p1 windup 생성. windup 1,300ms 동안 16ms 프레임으로 돌려도 한 번도 안 뜬다.
    expect(frame(2500)).toMatchObject({ fired: false, phase: 'windup' })
    expect(state.snapshot.patternId).toBe('b10_p1')
    for (let ms = 0; ms + 16 < 1300; ms += 16) {
      expect(frame(16)).toMatchObject({ fired: false, damage: 0, phase: 'windup' })
    }
    expect(events).toHaveLength(0)

    // active로 넘어가는 프레임 = 피해 18이 들어가는 프레임 = 도장 자국 1회.
    const impact = frame(32)
    expect(impact).toEqual({ damage: 18, fired: true, phase: 'active' })
    expect(events).toHaveLength(1)
    expect(events[0].gameKey).toBe(0)

    // active 나머지·recovery 동안 다시 뜨지 않는다.
    for (let i = 0; i < 20; i += 1) expect(frame(16).fired).toBe(false)
    expect(events).toHaveLength(1)
    off()
  })

  it('still stamps when the player dodged (visual follows the stamp, not the hit)', () => {
    const state = createExpansionAttackState('B10', 'b10-dodge', 0)
    const tracker = createB10StampImpactTracker()
    stepExpansionAttack(state, { ...base, deltaMs: 2500 })
    const out = stepExpansionAttack(state, { ...base, deltaMs: 1300, playerX: 1.5 + 1.9 })
    expect(out.damage).toBe(0)
    expect(stepB10StampImpact(tracker, state.snapshot, 0)).toBe(true)
  })

  it('ignores the ledger swing (b10_p2) active phase', () => {
    const tracker = createB10StampImpactTracker()
    expect(stepB10StampImpact(tracker, { patternId: 'b10_p2', phase: 'active', attackId: 'b10:1' }, 0)).toBe(false)
    expect(stepB10StampImpact(tracker, { patternId: 'b10_p1', phase: 'windup', attackId: 'b10:2' }, 0)).toBe(false)
    expect(stepB10StampImpact(tracker, { patternId: 'b10_p1', phase: 'active', attackId: 'b10:2' }, 0)).toBe(true)
    expect(stepB10StampImpact(tracker, { patternId: 'b10_p1', phase: 'recovery', attackId: 'b10:2' }, 0)).toBe(false)
    expect(stepB10StampImpact(tracker, null, 0)).toBe(false)
  })
})

describe('B10StampImpactOverlay', () => {
  let container
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  const render = (props) => act(() => root.render(<B10StampImpactOverlay gameKey={3} phase="playing" {...props} />))
  const stamps = () => container.querySelectorAll('[data-testid="b10-stamp-impact"]')

  it('renders nothing until an impact is published', () => {
    render()
    expect(container.innerHTML).toBe('')
  })

  it('shows exactly one stamp per impact, with the 決 glyph', () => {
    render()
    act(() => { publishB10StampImpact(3) })
    expect(stamps()).toHaveLength(1)
    expect(container.textContent).toContain('決')
    // 다음 타격은 같은 한 장을 새로 찍는다(겹쳐 쌓이지 않는다).
    const firstId = stamps()[0].dataset.impactId
    act(() => { publishB10StampImpact(3) })
    expect(stamps()).toHaveLength(1)
    expect(stamps()[0].dataset.impactId).not.toBe(firstId)
  })

  it('ignores impacts from another run (gameKey)', () => {
    render()
    act(() => { publishB10StampImpact(2) })
    expect(stamps()).toHaveLength(0)
  })

  it('clears itself after the fade-out', () => {
    render()
    act(() => { publishB10StampImpact(3) })
    expect(stamps()).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(B10_STAMP_IMPACT_OVERLAY.totalMs - 1) })
    expect(stamps()).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(1) })
    expect(stamps()).toHaveLength(0)
    expect(container.innerHTML).toBe('')
  })

  it('fades over 0.6-0.8s after a short punchy 1.3x entry', () => {
    expect(B10_STAMP_IMPACT_OVERLAY.startScale).toBe(1.3)
    expect(B10_STAMP_IMPACT_OVERLAY.fadeMs).toBeGreaterThanOrEqual(600)
    expect(B10_STAMP_IMPACT_OVERLAY.fadeMs).toBeLessThanOrEqual(800)
  })

  it('never takes pointer events and is hidden from assistive tech', () => {
    render()
    act(() => { publishB10StampImpact(3) })
    const wrap = container.querySelector('[data-testid="b10-stamp-impact-overlay"]')
    expect(wrap.style.pointerEvents).toBe('none')
    expect(stamps()[0].style.pointerEvents).toBe('none')
    expect(wrap.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0)
  })

  it('drops the stamp on restart and stays off outside play', () => {
    render()
    act(() => { publishB10StampImpact(3) })
    expect(stamps()).toHaveLength(1)
    render({ gameKey: 4 })
    expect(stamps()).toHaveLength(0)
    act(() => { publishB10StampImpact(4) })
    render({ gameKey: 4, phase: 'gameover' })
    expect(stamps()).toHaveLength(0)
  })
})
