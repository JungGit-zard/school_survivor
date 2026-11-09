// B10 교감 좀비(Stage 5)가 확장 공격 런타임을 합성 조회(EXPANSION_BOSSES ?? AUTHORED_ATTACK_BOSSES)로 타는지 본다.
// 스펙 Part B §6-1·§6-4·§14-1. 거리 = 월드 유닛(u), 1블록 = 4u.
import { afterEach, describe, expect, it } from 'vitest'
import { clearExpansionAttacks, createExpansionAttackState, expansionAttackContains, expansionAttackSnapshots, stepExpansionAttack } from './expansionAttackRuntime.js'
import { expansionSafetyContext } from './expansionAttackSafety.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
import { isB10EnrageTransitionDone } from './stage5ViceBoss.js'

// 보스는 중앙 광장 (0, 0), 플레이어는 광장 안 (1.5, 0.5). 장애물은 실제 stage5 배치(책상 섬)를 쓴다.
const base = { x: 0, z: 0, playerX: 1.5, playerZ: 0.5, playing: true, alive: true, gameKey: 0, hpRatio: 1, deltaMs: 0, stageId: 'stage5', halfX: 9.36, halfZ: 16 }
const step = (state, extra) => stepExpansionAttack(state, { ...base, ...extra })

afterEach(() => clearExpansionAttacks())

describe('B10 authored-attack boss on the expansion runtime', () => {
  it('첫 공격은 2.5초 뒤 결재 도장(disk, 플레이어 스냅샷 1.6u), 다음은 출석부 휘두르기(120° sector, 보스 스냅샷 3.2u)', () => {
    const state = createExpansionAttackState('B10', 'b10', 0)
    step(state, { deltaMs: 2400 })
    expect(state.snapshot).toBeNull()
    step(state, { deltaMs: 100 })
    expect(state.snapshot).toMatchObject({ patternId: 'b10_p1', shape: 'disk', origin: 'player_snapshot', rangeUnits: 1.6, damage: 18, phase: 'windup' })
    expect(state.snapshot.originXZ).toEqual([1.5, 0.5])
    expect(expansionAttackSnapshots.get('b10')).toBe(state.snapshot)

    // windup 1,300ms → active: 원 안의 플레이어가 18 피해를 1회 받는다.
    expect(step(state, { deltaMs: 1300 }).damage).toBe(18)
    expect(step(state, { deltaMs: 100 }).damage).toBe(0)
    // active 300 + recovery 900 끝나면 스냅샷 해제.
    step(state, { deltaMs: 1200 })
    expect(state.snapshot).toBeNull()

    // P1 쿨다운 5,000ms(생성 시점부터) 뒤 두 번째 패턴.
    step(state, { deltaMs: 2500 })
    expect(state.snapshot).toMatchObject({ patternId: 'b10_p2', shape: 'sector', angleDeg: 120, origin: 'boss_snapshot', rangeUnits: 3.2, damage: 20 })
    expect(state.snapshot.originXZ).toEqual([0, 0])
  })

  it('도장 원 밖으로 한 걸음 나가면 맞지 않는다(1.6 + 몸 0.192u 밖)', () => {
    const state = createExpansionAttackState('B10', 'b10', 0)
    step(state, { deltaMs: 2500 })
    expect(state.snapshot?.patternId).toBe('b10_p1')
    expect(step(state, { deltaMs: 1300, playerX: 1.5 + 1.9, playerZ: 0.5 }).damage).toBe(0)
    expect(expansionAttackContains(state.snapshot, 1.5, 0.5)).toBe(true)
  })

  it('HP 50%에서 격노 전환 1,500ms 동안 멈추고 진행 중 텔레그래프를 취소한다', () => {
    const state = createExpansionAttackState('B10', 'b10', 0)
    step(state, { deltaMs: 2500 })
    expect(state.snapshot).not.toBeNull()
    expect(step(state, { deltaMs: 16, hpRatio: 1 }).stop).toBe(true)  // windup 중 정지(공격 자세)
    clearExpansionAttacks()
    const enraged = createExpansionAttackState('B10', 'b10-enrage', 0)
    expect(step(enraged, { deltaMs: 100, hpRatio: 0.5 }).stop).toBe(true)
    expect(enraged).toMatchObject({ enraged: true, snapshot: null })
    expect(isB10EnrageTransitionDone(enraged)).toBe(false)
    expect(step(enraged, { deltaMs: 1000, hpRatio: 0.5 }).stop).toBe(true)
    step(enraged, { deltaMs: 500, hpRatio: 0.5 })
    expect(enraged.enrageRemainingMs).toBe(0)
    expect(isB10EnrageTransitionDone(enraged)).toBe(true)
  })

  it('P2 쿨다운은 4,000ms로 줄어든다', () => {
    const state = createExpansionAttackState('B10', 'b10', 0)
    state.enraged = true
    step(state, { deltaMs: 2500, hpRatio: 0.4 })
    expect(state.snapshot?.patternId).toBe('b10_p1')
    expect(state.nextMs - state.ageMs).toBe(4000)
  })

  it('안전 기하는 a.stageId(stage5)의 책상 섬 장애물로 만든다 — 없으면 레코드의 stageId로 폴백', () => {
    const withStage = expansionSafetyContext('B10', { stageId: 'stage5', halfX: 9.36, halfZ: 16 })
    expect(withStage).toMatchObject({ stageId: 'stage5', halfX: 9.36, halfZ: 16 })
    expect(withStage.obstacles).toEqual(getStageObjectSightObstacles('stage5'))
    const fallback = expansionSafetyContext('B10', {})
    expect(fallback.stageId).toBe('stage5')
    // 확장 보스는 기존 동작 그대로(자기 확장 스테이지).
    expect(expansionSafetyContext('B05', {}).stageId).toBe('stage6')
  })
})
