// Stage 6 확장 런타임 변경 R1~R4 + 비보스 해저드 발신(스펙 Part C C-6-3·C-7). 단위 u.
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearExpansionAttacks,
  createExpansionAttackState,
  emitExpansionHazardSnapshot,
  expansionAttackContains,
  expansionAttackSnapshots,
  snapshotRangeUnits,
  stepExpansionAttack,
  stepExpansionHazardSnapshots,
} from './expansionAttackRuntime.js'
import { expansionAuthoredPolygons } from './expansionAttackSafety.js'
import { EXPANSION_BOSSES, EXPANSION_HAZARDS } from './expansionContent.js'

afterEach(() => clearExpansionAttacks())

const H06 = EXPANSION_HAZARDS.H06
const B05 = EXPANSION_BOSSES.B05
const bossArgs = { x: 0, z: -12, playerX: 0, playerZ: -7, playing: true, alive: true, gameKey: 0, hpRatio: 1, deltaMs: 0 }

describe('B05 교장 데이터', () => {
  it('typeCode 32 유지, HP 4,050, 패턴 훈화 고리(annulus) → 교가 제창(cross)', () => {
    expect(B05).toMatchObject({ typeCode: 32, nameKo: '교장 선생님 좀비', hp: 4050, contactDamage: 22, scale: 2.2, textbooks: 4, textbookXp: 45, gold: 10 })
    expect(B05.patterns.map((p) => [p.id, p.nameKo, p.shape])).toEqual([['b05_p1', '훈화 고리', 'annulus'], ['b05_p2', '교가 제창', 'cross']])
    expect(B05.patterns.some((p) => p.nameKo.includes('애국가'))).toBe(false)
  })
})

describe('R1 플레이어 거리 반지름', () => {
  it('보스에서 5u 떨어진 플레이어 → b05_p1 외반경 5.6u, 범위는 2~40u로 자른다', () => {
    const state = createExpansionAttackState('B05', 'b05', 0)
    stepExpansionAttack(state, { ...bossArgs, deltaMs: 2500 })
    expect(state.snapshot).toMatchObject({ patternId: 'b05_p1', shape: 'annulus' })
    expect(state.snapshot.rangeUnits).toBeCloseTo(5.6, 9)
    const p = B05.patterns[0]
    expect(snapshotRangeUnits(p, [0, 0], 0, 0.5)).toBe(2)
    expect(snapshotRangeUnits(p, [0, 0], 0, 100)).toBe(40)
    expect(snapshotRangeUnits(B05.patterns[1], [0, 0], 0, 3)).toBe(7)
  })
})

describe('R2·R3 격노 2중 고리', () => {
  it('격노 후 훈화 고리는 extraRingOffsetsUnits [2.4]를 싣고, 폴리곤 수가 1중의 2배', () => {
    const calm = createExpansionAttackState('B05', 'calm', 0)
    stepExpansionAttack(calm, { ...bossArgs, deltaMs: 2500 })
    expect(calm.snapshot.extraRingOffsetsUnits).toBeUndefined()
    const single = expansionAuthoredPolygons(calm.snapshot).length
    clearExpansionAttacks()
    const angry = createExpansionAttackState('B05', 'angry', 0)
    angry.enraged = true
    stepExpansionAttack(angry, { ...bossArgs, deltaMs: 2500, hpRatio: 0.4 })
    expect(angry.snapshot.extraRingOffsetsUnits).toEqual([2.4])
    expect(expansionAuthoredPolygons(angry.snapshot)).toHaveLength(single * 2)
    // 바깥 고리 띠(외반경 5.6+2.4 = 8.0, 내반경 6.8) 위는 피해, 두 고리 사이(6.0)는 안전.
    expect(expansionAttackContains(angry.snapshot, 0, -12 + 7.4)).toBe(true)
    expect(expansionAttackContains(angry.snapshot, 0, -12 + 6.2)).toBe(false)
  })
})

describe('R4 + 해저드 발신(훈화 말씀)', () => {
  const emit = (playerX, playerZ, key = 'H06:1:0:0') => emitExpansionHazardSnapshot({
    hazardId: 'H06', pattern: H06.pattern, originXZ: H06.originUnits, key, gameKey: 1, playerX, playerZ, stageId: 'stage6', halfX: 12, halfZ: 20,
  })

  it('고리 띠가 플레이어를 지나고, active에서 9 피해 1회(B05 고리와 같다), 다음 프레임 0', () => {
    const s = emit(0, 0)
    expect(s).not.toBeNull()
    expect(s).toMatchObject({ hazard: true, shape: 'annulus', damage: 9 })
    expect(s.rangeUnits).toBeCloseTo(19.6, 9)
    expect(expansionAttackSnapshots.get('H06:1:0:0')).toBe(s)
    const a = { deltaMs: 1599, playing: true, playerX: 0, playerZ: 0, gameKey: 1 }
    expect(stepExpansionHazardSnapshots(a).damage).toBe(0)
    const hit = stepExpansionHazardSnapshots({ ...a, deltaMs: 10 })
    expect(hit.damage).toBe(9)
    expect(hit.activeStarts).toBe(1)
    expect(stepExpansionHazardSnapshots({ ...a, deltaMs: 10 }).damage).toBe(0)
    // recovery까지 끝나면 지운다.
    stepExpansionHazardSnapshots({ ...a, deltaMs: 1000 })
    expect(expansionAttackSnapshots.has('H06:1:0:0')).toBe(false)
  })

  it('고리 안쪽으로 1.5u 들어가면 맞지 않는다(안쪽도 안전)', () => {
    emit(0, 0)
    const a = { deltaMs: 1609, playing: true, playerX: 0, playerZ: -1.5, gameKey: 1 }
    expect(stepExpansionHazardSnapshots(a).damage).toBe(0)
  })

  it('정지 중에는 진행하지 않고, 다른 판(gameKey)의 해저드는 지운다', () => {
    const s = emit(0, 0)
    stepExpansionHazardSnapshots({ deltaMs: 5000, playing: false, playerX: 0, playerZ: 0, gameKey: 1 })
    expect(s.elapsedMs).toBe(0)
    stepExpansionHazardSnapshots({ deltaMs: 16, playing: true, playerX: 0, playerZ: 0, gameKey: 2 })
    expect(expansionAttackSnapshots.size).toBe(0)
  })

  it('골대가 발신원과 플레이어 사이에 있어도 고리 피해 기하는 골대 뒤를 덮는다(ignoresSightBlockers)', () => {
    // 북쪽 골대 (0, −11, 반길이 0.45) 뒤(+Z) 플레이어. 발신원 (0, −19) → 플레이어 (0, −9.2).
    // (골대에 0.79u보다 바짝 붙으면 기존 탈출 인증이 통로를 못 찾아 발신을 미룬다 — 그건 재시도 규칙의 몫이다.)
    const s = emit(0, -9.2)
    expect(s).not.toBeNull()
    expect(expansionAttackContains(s, 0, -9.2)).toBe(true)
    // 같은 고리를 장애물 차단으로 만들었다면 골대 그림자에 가려졌을 자리다.
    expect(s.ignoresSightBlockers).toBe(true)
  })

  it('해저드가 떠 있으면 일반 적 특수행동은 열리지 않는다(보스 활성과 같은 규칙)', () => {
    emit(0, 0)
    const ring = createExpansionAttackState('E20', 'e20', 0)
    stepExpansionAttack(ring, { x: 1, z: 0, playerX: 0, playerZ: 0, playing: true, alive: true, gameKey: 0, hpRatio: 1, deltaMs: 3000, stageId: 'stage6', halfX: 12, halfZ: 20 })
    expect(ring.snapshot).toBeNull()
  })
})
