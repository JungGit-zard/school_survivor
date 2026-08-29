import { describe, expect, it } from 'vitest'
import {
  B03_SHUTTLE_BASE_SPEED,
  B03_SHUTTLE_LANE_EDGE_INSET,
  B03_SHUTTLE_PLAYER_DAMAGE_RATIO,
  B03_SHUTTLE_SPEED_MULTIPLIER,
  B03_SHUTTLE_TELEGRAPH_BLINKS,
  B03_SHUTTLE_TELEGRAPH_BLINK_MIN,
  B03_SHUTTLE_TELEGRAPH_MS,
  B03_SHUTTLE_STUN_MS,
  advanceB03ShuttleRun,
  consumeB03ShuttleRunPassHit,
  createB03ShuttleRunState,
  getB03ShuttleRunFacingX,
  getB03ShuttleRunLaneFromBoss,
  getB03ShuttleRunLaneX,
  getB03ShuttleRunPassDurationMs,
  getB03ShuttleRunPlayerDamage,
  getB03ShuttleRunTrigger,
  getB03ShuttleRunLaneZ,
  getB03ShuttleRunX,
  getB03ShuttleTelegraphBlinkFactor,
  startB03ShuttleRun,
} from './b03ShuttleRun.js'

// stage3 실전 좌표: mapHalfX 7.5 - edgeInset 0.9 → 레인 양끝 ±6.6, 편도 13.2 units.
const STAGE3_START_X = -6.6
const STAGE3_END_X = 6.6
// stageConfig.js stage3: mapHalfX 7.5 / mapHalfZ 19.2 (12이 아니다).
const STAGE3_HALF_X = 7.5
const STAGE3_HALF_Z = 19.2
const STAGE3_LANE_LIMIT = STAGE3_HALF_X - B03_SHUTTLE_LANE_EDGE_INSET
const FRAME_MS = 1000 / 60

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

  it('clamps the telegraphed lane Z inside stage bounds', () => {
    expect(getB03ShuttleRunLaneZ(4, 19.2)).toBe(4)
    expect(getB03ShuttleRunLaneZ(30, 19.2)).toBeCloseTo(18.2, 10)
    expect(getB03ShuttleRunLaneZ(-30, 19.2)).toBeCloseTo(-18.2, 10)
  })

  // ── 2026-08-29 실플레이 회귀(사용자 보고) 방지 ───────────────────────────────
  // "경고선이 그려진뒤 완전히 엉뚱한 곳으로 보스가 날아가서 달리는 느낌이 전혀
  //  나지않는 정지자세로 어딘가로 이동한다."
  // 원인 1: 출발점을 보스 위치가 아니라 아레나 가장자리로 잡아 첫 액티브 프레임에
  //         최대 6.6유닛을 한 프레임에 밀었다.
  it('출발점은 보스의 현재 X이고 도착점만 반대편 끝이다', () => {
    for (const bossX of [-6.4, -3.1, -0.2, 0, 0.2, 2.7, 6.4]) {
      const { startX, endX } = getB03ShuttleRunLaneX(bossX, STAGE3_HALF_X)
      expect(startX).toBeCloseTo(bossX, 10)
      expect(endX).toBeCloseTo(startX <= 0 ? STAGE3_LANE_LIMIT : -STAGE3_LANE_LIMIT, 10)
    }
    // 경계 밖 좌표는 레인 안으로 clamp된다(벽 뚫고 출발 금지).
    expect(getB03ShuttleRunLaneX(99, STAGE3_HALF_X).startX).toBeCloseTo(STAGE3_LANE_LIMIT, 10)
    expect(getB03ShuttleRunLaneX(-99, STAGE3_HALF_X).startX).toBeCloseTo(-STAGE3_LANE_LIMIT, 10)
    expect(getB03ShuttleRunLaneX(Number.NaN, STAGE3_HALF_X).startX).toBe(0)
  })

  it('첫 액티브 프레임의 이동량이 한 프레임 분량(속도×delta)을 넘지 않는다 — 순간이동 없음', () => {
    // 한 프레임 최대 이동 = 기본속도 × 3 × delta. 옛 구현은 여기서 5유닛 이상 튀었다.
    const maxFrameTravel = B03_SHUTTLE_BASE_SPEED * B03_SHUTTLE_SPEED_MULTIPLIER * (FRAME_MS / 1000)
    for (const bossX of [-6.4, -3.1, -0.2, 0, 0.2, 2.7, 6.4]) {
      const { laneZ, startX, endX } = getB03ShuttleRunLaneFromBoss(bossX, 3.5, STAGE3_HALF_X, STAGE3_HALF_Z)
      expect(laneZ).toBeCloseTo(3.5, 10)
      let state = startB03ShuttleRun(createB03ShuttleRunState(), 'sixtyFive', {
        laneZ, startX, endX, baseSpeed: B03_SHUTTLE_BASE_SPEED,
      })
      // 텔레그래프 1.25초 동안 보스는 제자리(_vel 전부 0)다.
      state = advanceB03ShuttleRun(state, B03_SHUTTLE_TELEGRAPH_MS)
      expect(state.phase).toBe('active')
      expect(getB03ShuttleRunX(state)).toBeCloseTo(bossX, 10)
      // Enemy.jsx는 이 X와 보스의 실제 t.x 차이를 delta로 나눠 속도로 넣는다.
      const stepped = advanceB03ShuttleRun(state, FRAME_MS)
      expect(Math.abs(getB03ShuttleRunX(stepped) - bossX)).toBeLessThanOrEqual(maxFrameTravel + 1e-9)
      // 그 속도 자체도 "평소 이동속도 ×3"을 넘지 않아야 한다.
      const impliedSpeed = Math.abs(getB03ShuttleRunX(stepped) - bossX) / (FRAME_MS / 1000)
      expect(impliedSpeed).toBeLessThanOrEqual(B03_SHUTTLE_BASE_SPEED * B03_SHUTTLE_SPEED_MULTIPLIER + 1e-6)
    }
  })

  // 원인 2: 레인 Z를 플레이어 Z로 잡았는데 보스는 _vel.z = 0으로 자기 Z를 달렸다.
  it('레인 Z는 플레이어가 아니라 보스의 현재 Z를 따른다', () => {
    const lane = getB03ShuttleRunLaneFromBoss(1.2, -5.5, STAGE3_HALF_X, STAGE3_HALF_Z)
    expect(lane.laneZ).toBeCloseTo(-5.5, 10)
    // 보스 Z 기준 레인이므로, 보스와 같은 줄에 선 플레이어는 맞고 떨어진 플레이어는 빗나간다.
    const active = { ...createB03ShuttleRunState({ phase: 'active', laneZ: lane.laneZ }), passIndex: 0 }
    expect(consumeB03ShuttleRunPassHit(active, -5.5, 1.2, 1.2).hit).toBe(true)
    expect(consumeB03ShuttleRunPassHit(active, 2.0, 1.2, 1.2).hit).toBe(false)
    // 경계 밖 보스 Z는 여전히 아레나 안으로 clamp된다.
    expect(getB03ShuttleRunLaneFromBoss(0, 99, STAGE3_HALF_X, STAGE3_HALF_Z).laneZ).toBeCloseTo(18.2, 10)
  })

  // 원인 3: 옆으로 미끄러지지 않도록 보스가 왕복 방향을 바라봐야 한다.
  it('보스는 텔레그래프와 각 패스에서 진행 방향을 바라본다', () => {
    const base = createB03ShuttleRunState({ phase: 'telegraph', startX: 1.2, endX: -6.6 })
    expect(getB03ShuttleRunFacingX(base)).toBeLessThan(0)
    expect(getB03ShuttleRunFacingX({ ...base, phase: 'active', passIndex: 0 })).toBeLessThan(0)
    expect(getB03ShuttleRunFacingX({ ...base, phase: 'active', passIndex: 1 })).toBeGreaterThan(0)
    expect(getB03ShuttleRunFacingX({ ...base, phase: 'stun', passIndex: -1 })).toBe(0)
    expect(getB03ShuttleRunFacingX(createB03ShuttleRunState())).toBe(0)
    // 반대편에서 출발하면 부호도 뒤집힌다.
    const mirrored = createB03ShuttleRunState({ phase: 'active', startX: -1.2, endX: 6.6 })
    expect(getB03ShuttleRunFacingX({ ...mirrored, passIndex: 0 })).toBeGreaterThan(0)
    expect(getB03ShuttleRunFacingX({ ...mirrored, passIndex: 1 })).toBeLessThan(0)
  })

  // 원인 4: 사용자 원 사양 "바닥에 예상루트가 깜빡인후". 예고선이 한 번도 깜빡이지 않았다.
  it('예고선은 텔레그래프 1.25초 동안 정확히 3번 깜빡인다', () => {
    expect(B03_SHUTTLE_TELEGRAPH_BLINKS).toBe(3)
    expect(getB03ShuttleTelegraphBlinkFactor(0)).toBeCloseTo(1, 10)
    const cycleMs = B03_SHUTTLE_TELEGRAPH_MS / B03_SHUTTLE_TELEGRAPH_BLINKS
    for (let cycle = 0; cycle < B03_SHUTTLE_TELEGRAPH_BLINKS; cycle += 1) {
      expect(getB03ShuttleTelegraphBlinkFactor(cycle * cycleMs)).toBeCloseTo(1, 10)
      expect(getB03ShuttleTelegraphBlinkFactor((cycle + 0.5) * cycleMs)).toBeCloseTo(B03_SHUTTLE_TELEGRAPH_BLINK_MIN, 10)
    }
    // 60fps 샘플링으로 실제 밝기 골짜기 개수를 세어 3회를 확인한다.
    const samples = []
    for (let ms = 0; ms <= B03_SHUTTLE_TELEGRAPH_MS; ms += FRAME_MS) samples.push(getB03ShuttleTelegraphBlinkFactor(ms))
    let dips = 0
    for (let i = 1; i < samples.length - 1; i += 1) {
      if (samples[i] < samples[i - 1] && samples[i] <= samples[i + 1]) dips += 1
    }
    expect(dips).toBe(B03_SHUTTLE_TELEGRAPH_BLINKS)
    // 완전히 사라지지도, 원래 밝기를 넘지도 않는다.
    for (const factor of samples) {
      expect(factor).toBeGreaterThanOrEqual(B03_SHUTTLE_TELEGRAPH_BLINK_MIN - 1e-9)
      expect(factor).toBeLessThanOrEqual(1 + 1e-9)
    }
  })

  it('1.25초 예고 뒤 2패스(왕복 1회)를 돌고 1.2초 경직으로 끝난다', () => {
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

  // 2026-08-29 사용자 지시 최종본: "평소 이동하는 애니메이션 그대로, 속도만 3배로
  // 그 직선 위를 걷는다. 1번 왕복한다."
  // 고정 duration 상수로는 이 사양을 지킬 수 없다 — 레인 길이에서 역산해야 한다.
  it('편도 소요시간은 레인 길이 ÷ (기본속도 × 3)으로 역산된다', () => {
    expect(B03_SHUTTLE_SPEED_MULTIPLIER).toBe(3)
    const distance = Math.abs(STAGE3_END_X - STAGE3_START_X)
    const expectedMs = (distance / (B03_SHUTTLE_BASE_SPEED * B03_SHUTTLE_SPEED_MULTIPLIER)) * 1000
    const state = startB03ShuttleRun(createB03ShuttleRunState(), 'sixtyFive', {
      laneZ: 0, startX: STAGE3_START_X, endX: STAGE3_END_X, baseSpeed: B03_SHUTTLE_BASE_SPEED,
    })
    expect(state.passDurationMs).toBeCloseTo(expectedMs, 6)
    // stage3 최장 레인 실측: 13.2 / 1.5675 ≈ 8.42초 편도 → 왕복 ≈ 16.8초.
    // 보스가 중앙에서 발동하면 편도 6.6이라 왕복 ≈ 8.4초다(출발점 = 보스 현재 X).
    expect(state.passDurationMs).toBeCloseTo(8421.05, 1)
    // 실효 이동속도가 정확히 기본속도의 3배인지 X 보간으로 직접 확인한다.
    const active = advanceB03ShuttleRun(state, B03_SHUTTLE_TELEGRAPH_MS)
    const oneSecondIn = advanceB03ShuttleRun(active, 1000)
    const travelled = getB03ShuttleRunX(oneSecondIn) - STAGE3_START_X
    expect(travelled).toBeCloseTo(B03_SHUTTLE_BASE_SPEED * 3, 6)
  })

  it('레인이 길어져도 이동속도는 3배로 고정된다(길이에 비례해 시간만 늘어난다)', () => {
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
