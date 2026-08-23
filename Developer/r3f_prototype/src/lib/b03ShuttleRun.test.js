import { describe, expect, it } from 'vitest'
import {
  B03_SHUTTLE_BASE_SPEED,
  B03_SHUTTLE_PLAYER_DAMAGE_RATIO,
  B03_SHUTTLE_SPEED_MULTIPLIER,
  B03_SHUTTLE_TELEGRAPH_MS,
  B03_SHUTTLE_STUN_MS,
  advanceB03ShuttleRun,
  consumeB03ShuttleRunPassHit,
  createB03ShuttleRunState,
  getB03ShuttleRunPassDurationMs,
  getB03ShuttleRunPlayerDamage,
  getB03ShuttleRunTrigger,
  getB03ShuttleRunLaneZ,
  getB03ShuttleRunX,
  startB03ShuttleRun,
} from './b03ShuttleRun.js'

// stage3 실전 좌표: mapHalfX 7.5 - edgeInset 0.9 → 레인 양끝 ±6.6, 편도 13.2 units.
const STAGE3_START_X = -6.6
const STAGE3_END_X = 6.6

describe('B03 왕복 오래달리기', () => {
  it('HP 65%와 30%에서 chase 중 각 한 번만 시작하고, 경과 시간은 막지 않는다', () => {
    const empty = createB03ShuttleRunState()
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.65, chargeState: 'chase', state: empty })).toBe('sixtyFive')
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.65, elapsedMs: 600_000, chargeState: 'chase', state: empty })).toBe('sixtyFive')
    expect(getB03ShuttleRunTrigger({ hpRatio: 0.65, chargeState: 'warn', state: empty })).toBeNull()
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
    let state = startB03ShuttleRun(createB03ShuttleRunState(), 'sixtyFive', {
      laneZ: 0, startX: STAGE3_START_X, endX: STAGE3_END_X, baseSpeed: B03_SHUTTLE_BASE_SPEED,
    })
    state = advanceB03ShuttleRun(state, B03_SHUTTLE_TELEGRAPH_MS)
    expect(state.phase).toBe('active')
    expect(state.passIndex).toBe(0)
    state = advanceB03ShuttleRun(state, state.passDurationMs * 2)
    expect(state.phase).toBe('stun')
    state = advanceB03ShuttleRun(state, B03_SHUTTLE_STUN_MS)
    expect(state.phase).toBe('idle')
  })

  // 2026-08-23 사용자 지시 최종본: "평소 이동속도의 10배로 왕복 달리기".
  // 고정 duration 상수로는 이 사양을 지킬 수 없다 — 레인 길이에서 역산해야 한다.
  it('편도 소요시간은 레인 길이 ÷ (기본속도 × 10)으로 역산된다', () => {
    expect(B03_SHUTTLE_SPEED_MULTIPLIER).toBe(10)
    const distance = Math.abs(STAGE3_END_X - STAGE3_START_X)
    const expectedMs = (distance / (B03_SHUTTLE_BASE_SPEED * B03_SHUTTLE_SPEED_MULTIPLIER)) * 1000
    const state = startB03ShuttleRun(createB03ShuttleRunState(), 'sixtyFive', {
      laneZ: 0, startX: STAGE3_START_X, endX: STAGE3_END_X, baseSpeed: B03_SHUTTLE_BASE_SPEED,
    })
    expect(state.passDurationMs).toBeCloseTo(expectedMs, 6)
    // stage3 실측: 13.2 / 5.225 ≈ 2.526초 편도 → 왕복 ≈ 5.05초.
    expect(state.passDurationMs).toBeCloseTo(2526.32, 1)
    // 실효 이동속도가 정확히 기본속도의 10배인지 X 보간으로 직접 확인한다.
    const active = advanceB03ShuttleRun(state, B03_SHUTTLE_TELEGRAPH_MS)
    const oneSecondIn = advanceB03ShuttleRun(active, 1000)
    const travelled = getB03ShuttleRunX(oneSecondIn) - STAGE3_START_X
    expect(travelled).toBeCloseTo(B03_SHUTTLE_BASE_SPEED * 10, 6)
  })

  it('레인이 길어져도 달리기 속도는 10배로 고정된다(길이에 비례해 시간만 늘어난다)', () => {
    const short = getB03ShuttleRunPassDurationMs(-6.6, 6.6, B03_SHUTTLE_BASE_SPEED)
    const long = getB03ShuttleRunPassDurationMs(-13.2, 13.2, B03_SHUTTLE_BASE_SPEED)
    expect(long / short).toBeCloseTo(2, 10)
    // 길이 0이어도 advance의 나눗셈이 터지지 않도록 하한을 지킨다.
    expect(getB03ShuttleRunPassDurationMs(0, 0)).toBeGreaterThan(0)
  })

  // 2026-08-23 사용자 지시: 피해는 고정 16이 아니라 "플레이어가 가진 체력의 30%"다.
  it('접촉 피해는 현재 체력의 30% 비율이다', () => {
    expect(B03_SHUTTLE_PLAYER_DAMAGE_RATIO).toBe(0.3)
    expect(getB03ShuttleRunPlayerDamage(100)).toBe(30)
    expect(getB03ShuttleRunPlayerDamage(0)).toBe(0)
    expect(getB03ShuttleRunPlayerDamage(-50)).toBe(0)
    expect(getB03ShuttleRunPlayerDamage(80)).toBeCloseTo(24, 10)
  })

  it('왕복 2패스는 각각 1회씩만 적중하고, 판정식은 레인 Z와 보스 X 양쪽을 요구한다', () => {
    const active = { ...createB03ShuttleRunState({ phase: 'active', laneZ: 0 }), passIndex: 0 }
    expect(consumeB03ShuttleRunPassHit(active, 0.61, 0, 0).hit).toBe(false)
    expect(consumeB03ShuttleRunPassHit(active, 0, 0.71, 0).hit).toBe(false)
    const first = consumeB03ShuttleRunPassHit(active, 0, 0, 0)
    expect(first.hit).toBe(true)
    expect(consumeB03ShuttleRunPassHit(first.state, 0, 0, 0).hit).toBe(false)
    const second = consumeB03ShuttleRunPassHit({ ...first.state, passIndex: 1 }, 0, 0, 0)
    expect(second.hit).toBe(true)
    expect(consumeB03ShuttleRunPassHit(second.state, 0, 0, 0).hit).toBe(false)
    expect(second.state.hitPasses).toEqual([true, true])
    // 무적시간을 무시했다면 100 HP 기준 30 + 21 = 51 손실이 되는 2연타다.
    // Enemy.jsx는 IGNORE_INVULNERABILITY 없이 damagePlayer를 호출해 i-frame이 걸러내게 둔다.
    const afterFirst = 100 - getB03ShuttleRunPlayerDamage(100)
    expect(100 - (afterFirst - getB03ShuttleRunPlayerDamage(afterFirst))).toBeCloseTo(51, 10)
  })
})
