import { describe, expect, it } from 'vitest'
import {
  B03_SHUTTLE_DAMAGE_PER_PASS,
  B03_SHUTTLE_TELEGRAPH_MS,
  B03_SHUTTLE_STUN_MS,
  advanceB03ShuttleRun,
  consumeB03ShuttleRunPassHit,
  createB03ShuttleRunState,
  getB03ShuttleRunTrigger,
  getB03ShuttleRunLaneZ,
  startB03ShuttleRun,
} from './b03ShuttleRun.js'

describe('B03 왕복 오래달리기', () => {
  it('HP 65%와 30%에서 chase 중 각 한 번만 시작하고 200초에는 시작하지 않는다', () => {
    const empty = createB03ShuttleRunState()
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.65, elapsedMs: 199_999, chargeState: 'chase', state: empty })).toBe('sixtyFive')
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.65, elapsedMs: 200_000, chargeState: 'chase', state: empty })).toBeNull()
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.65, elapsedMs: 199_999, chargeState: 'warn', state: empty })).toBeNull()
    const first = startB03ShuttleRun(empty, 'sixtyFive', { laneZ: 2, startX: -6.6, endX: 6.6 })
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.30, elapsedMs: 199_999, chargeState: 'chase', state: first })).toBeNull()
    const afterFirst = { ...empty, triggeredSixtyFive: true }
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.30, elapsedMs: 199_999, chargeState: 'chase', state: afterFirst })).toBe('thirty')
  })

  it('locks the telegraphed lane to player Z while keeping it inside stage bounds', () => {
    expect(getB03ShuttleRunLaneZ(4, 19.2)).toBe(4)
    expect(getB03ShuttleRunLaneZ(30, 19.2)).toBeCloseTo(18.2, 10)
    expect(getB03ShuttleRunLaneZ(-30, 19.2)).toBeCloseTo(-18.2, 10)
  })

  it('1.25초 예고 뒤 두 번 왕복하고 1.2초 경직으로 끝난다', () => {
    let state = startB03ShuttleRun(createB03ShuttleRunState(), 'sixtyFive', { laneZ: 0, startX: -6.6, endX: 6.6 })
    state = advanceB03ShuttleRun(state, B03_SHUTTLE_TELEGRAPH_MS)
    expect(state.phase).toBe('active')
    expect(state.passIndex).toBe(0)
    state = advanceB03ShuttleRun(state, state.passDurationMs * 2)
    expect(state.phase).toBe('stun')
    state = advanceB03ShuttleRun(state, B03_SHUTTLE_STUN_MS)
    expect(state.phase).toBe('idle')
  })

  it('각 pass 피해는 16 한 번으로 제한되어 시전 총 피해는 최대 32다', () => {
    const active = { ...createB03ShuttleRunState({ phase: 'active', laneZ: 0 }), passIndex: 0 }
    expect(consumeB03ShuttleRunPassHit(active, 0.61, 0, 0).damage).toBe(0)
    expect(consumeB03ShuttleRunPassHit(active, 0, 0.71, 0).damage).toBe(0)
    const first = consumeB03ShuttleRunPassHit(active, 0, 0, 0)
    expect(first.damage).toBe(B03_SHUTTLE_DAMAGE_PER_PASS)
    expect(consumeB03ShuttleRunPassHit(first.state, 0, 0, 0).damage).toBe(0)
    const second = consumeB03ShuttleRunPassHit({ ...first.state, passIndex: 1 }, 0, 0, 0)
    expect(second.damage).toBe(B03_SHUTTLE_DAMAGE_PER_PASS)
    expect(first.damage + second.damage).toBe(32)
  })
})
