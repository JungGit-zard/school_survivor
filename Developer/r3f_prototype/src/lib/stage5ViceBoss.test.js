import { describe, expect, it } from 'vitest'
import {
  AUTHORED_ATTACK_BOSSES,
  B10_TYPE_CODE,
  STAGE5_B10_SUMMON_FIXED_HP,
  STAGE5_BOSS_STATS,
  createB10SummonState,
  getAuthoredAttackBoss,
  isAuthoredAttackBoss,
  stepB10SummonTriggers,
} from './stage5ViceBoss.js'
import { ENEMY_TYPE_CODES, enemyTypeFromCode } from './enemyEntityPool.js'
import { EXPANSION_BOSSES } from './expansionContent.js'
import { getStageConfig } from './stageConfig.js'

const STAGE5_HP_MULTIPLIER = 1.2 ** 4

describe('B10 교감 좀비 데이터(스펙 Part B §6)', () => {
  it('B10 레코드는 확장 DATA.bosses 밖에 있고 Stage 5 보스로 묶인다', () => {
    expect(isAuthoredAttackBoss('B10')).toBe(true)
    expect(isAuthoredAttackBoss('B05')).toBe(false)
    expect(getAuthoredAttackBoss('B03')).toBeNull()
    expect(Object.hasOwn(EXPANSION_BOSSES, 'B10')).toBe(false)
    const boss = AUTHORED_ATTACK_BOSSES.B10
    expect(boss).toMatchObject({ id: 'B10', typeCode: B10_TYPE_CODE, stageId: 'stage5', modelKey: 'stage5-b10', studioItemId: 'zombie-b10',
      enrageHpRatio: 0.5, enrageTransitionMs: 1500, firstAttackDelayMs: 2500 })
    expect(getStageConfig('stage5').bossType).toBe('B10')
    expect(Object.isFrozen(boss.patterns[0])).toBe(true)
  })

  it('typeCode는 다음 빈 번호 75이고 풀 이름표와 왕복한다(65~74는 2차 10종)', () => {
    expect(B10_TYPE_CODE).toBe(75)
    expect(ENEMY_TYPE_CODES.B10).toBe(75)
    expect(enemyTypeFromCode(75)).toBe('B10')
    expect(ENEMY_TYPE_CODES.E70).toBe(74)
  })

  it('실효 HP 3,241 = S4 B04 실효 2,592의 1.25배 — 보스 사다리 단조 증가', () => {
    expect(STAGE5_BOSS_STATS.B10).toMatchObject({ hp: 1563, speed: 0.5225, damage: 22, scale: 2, xp: 0, contactDist: 0.36, authoredAttackBoss: true })
    const effective = Math.round(1563 * STAGE5_HP_MULTIPLIER)
    expect(effective).toBe(3241)
    const ladder = [Math.round(1150 * 1), Math.round(1150 * 1.2), Math.round(1246 * 1.44), Math.round(1500 * 1.728), effective]
    expect(ladder).toEqual([1150, 1380, 1794, 2592, 3241])
    for (let i = 1; i < ladder.length; i += 1) expect(ladder[i]).toBeGreaterThan(ladder[i - 1])
    expect(effective / 2592).toBeCloseTo(1.25, 2)
  })

  it('패턴은 결재 도장(disk, 플레이어 스냅샷) → 출석부 휘두르기(120° sector, 보스 스냅샷) 2종 교대', () => {
    const [p1, p2] = AUTHORED_ATTACK_BOSSES.B10.patterns
    expect(AUTHORED_ATTACK_BOSSES.B10.patterns).toHaveLength(2)
    expect(p1).toMatchObject({ id: 'b10_p1', shape: 'disk', origin: 'player_snapshot', rangeUnits: 1.6, windupMs: 1300, activeMs: 300,
      recoveryMs: 900, cooldownMs: 5000, phase2CooldownMs: 4000, damage: 18, maxHitsPerTarget: 1 })
    expect(p2).toMatchObject({ id: 'b10_p2', shape: 'sector', angleDeg: 120, origin: 'boss_snapshot', rangeUnits: 3.2, windupMs: 1000,
      activeMs: 250, recoveryMs: 900, cooldownMs: 5000, phase2CooldownMs: 4000, damage: 20, maxHitsPerTarget: 1 })
    // 회피 여유: 도장 반지름+플레이어 반폭 1.79u를 1.3s에 = 1.38u/s < 플레이어 3.0u/s.
    expect((1.6 + 0.192) / (p1.windupMs / 1000)).toBeLessThan(3.0)
    // 출석부 최악(정면 0.7u)에서 3.4u까지 2.7u를 1.0s에 = 2.7u/s < 3.0u/s.
    expect((3.4 - 0.7) / (p2.windupMs / 1000)).toBeLessThan(3.0)
  })

  it('교무회의 소집은 E57·E51·E54 3기, 링 2.5u, 최대 3회 = 실효 684 HP', () => {
    const summon = AUTHORED_ATTACK_BOSSES.B10.summon
    expect(summon).toMatchObject({ id: 'b10_summon', ringRadius: 2.5, stopMs: 800 })
    expect([...summon.hpTriggers]).toEqual([0.85, 0.5, 0.25])
    expect([...summon.types]).toEqual(['E57', 'E51', 'E54'])
    const perSummon = [70, 8, 32].reduce((sum, base) => sum + Math.round(base * STAGE5_HP_MULTIPLIER), 0)
    expect(perSummon).toBe(228)
    expect(perSummon * summon.hpTriggers.length).toBe(STAGE5_B10_SUMMON_FIXED_HP)
  })
})

describe('stepB10SummonTriggers', () => {
  it('85% 1회, 50%는 격노 전환이 끝난 프레임에, 25% 1회 — 총 3회 상한', () => {
    const state = createB10SummonState()
    expect(stepB10SummonTriggers(state, 1.0, 0.84, false)).toBe(1)
    expect(stepB10SummonTriggers(state, 0.84, 0.49, false)).toBe(0)   // 격노 정지 중 → 보류
    expect(stepB10SummonTriggers(state, 0.84, 0.49, true)).toBe(1)    // 정지 끝 프레임에 실행
    expect(stepB10SummonTriggers(state, 0.49, 0.20, true)).toBe(1)
    expect(state.firedCount).toBe(3)
    expect(stepB10SummonTriggers(state, 0.20, 0.0, true)).toBe(0)
    expect(stepB10SummonTriggers(state, 1.0, 0.0, true)).toBe(0)
  })

  it('한 프레임에 여러 선을 넘으면 넘은 개수만큼 실행한다', () => {
    const state = createB10SummonState()
    // 0.9 → 0.3: 0.85·0.5 넘음. 0.5는 격노 대기, 0.85만 즉시.
    expect(stepB10SummonTriggers(state, 0.9, 0.3, false)).toBe(1)
    // 0.3 → 0.1: 0.25 넘음. 격노 전환이 끝나면 대기 중인 0.5와 함께 2회.
    expect(stepB10SummonTriggers(state, 0.3, 0.1, true)).toBe(2)
    expect(state.firedCount).toBe(3)
  })

  it('경계는 "직전 > t ≥ 현재"다 — 같은 비율에 머물면 다시 쏘지 않는다', () => {
    const state = createB10SummonState()
    expect(stepB10SummonTriggers(state, 0.85, 0.85, false)).toBe(0)  // 직전이 t와 같으면 아직 아님
    expect(stepB10SummonTriggers(state, 0.86, 0.85, false)).toBe(1)
    expect(stepB10SummonTriggers(state, 0.85, 0.85, false)).toBe(0)
  })

  it('잘못된 입력은 소환하지 않는다', () => {
    const state = createB10SummonState()
    expect(stepB10SummonTriggers(state, Number.NaN, 0.1, true)).toBe(0)
    expect(stepB10SummonTriggers(null, 1, 0.1, true)).toBe(0)
    expect(state.firedCount).toBe(0)
  })
})

describe('b10SummonRingPositions / B10_SFX', () => {
  it('소집 3기는 보스 중심 2.5u 링에 120° 간격, 첫 자리는 플레이어 반대쪽', async () => {
    const { b10SummonRingPositions, B10_SFX } = await import('./stage5ViceBoss.js')
    const ring = b10SummonRingPositions(0, 0, 0, 5)
    expect(ring.map((r) => r.type)).toEqual(['E57', 'E51', 'E54'])
    for (const r of ring) expect(Math.hypot(r.x, r.z)).toBeCloseTo(2.5, 9)
    // 플레이어가 +Z(5)에 있으니 첫 자리는 −Z 쪽(보스 등 뒤).
    expect(ring[0].x).toBeCloseTo(0, 9)
    expect(ring[0].z).toBeCloseTo(-2.5, 9)
    // 120° 간격 = 이웃 자리 사이 현의 길이 2.5·√3.
    for (let i = 0; i < 3; i += 1) {
      const p = ring[i]
      const q = ring[(i + 1) % 3]
      expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeCloseTo(2.5 * Math.sqrt(3), 9)
    }
    expect(B10_SFX).toEqual({ b10_p1: 'b10StampSlam', b10_p2: 'b10LedgerSwing', summon: 'b10MeetingBell' })
  })
})
