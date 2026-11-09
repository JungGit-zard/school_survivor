// Stage 5 solid 프롭이 E04 사선·원거리 탄을 막는 규칙(wave 4, 스펙 Part B §3-4). 단위 u.
import { describe, expect, it } from 'vitest'
import {
  hasClearRangedSight,
  isPointInsideRangedBlockers,
  isRangedPropBlockStage,
  isSegmentBlockedByRangedBlockers,
} from './stageRangedBlockers.js'
import { E04_PROJECTILE_RADIUS, createEnemyProjectilePool } from './enemyProjectilePool.js'
import { SHOT_KIND, SHOT_MOTION, createProjectileZombieShotPool } from './projectileZombieShotPool.js'
import { createEnemyEntityPool } from './enemyEntityPool.js'
import { createEnemySimulationRuntime, ENEMY_EVENT_RANGED_FIRE } from './enemySimulation.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'

const S5 = getStageObjectSightObstacles('stage5')
// 책상 섬 R3 가운데 (0, 3.7), 반크기 1.0 × 1.7 — 이 상자를 가로지르는 사선을 쓴다.
const box = { x: 0, z: 0, halfX: 1, halfZ: 1 }
const rotated = { x: 0, z: 0, halfX: 2, halfZ: 0.2, rotationY: Math.PI / 4 }

describe('isRangedPropBlockStage', () => {
  it('Stage 5만 켠다 — Stage 4 기준선(사망 32%)은 그대로 둔다', () => {
    expect(isRangedPropBlockStage('stage5')).toBe(true)
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage6', 'stage7', undefined]) expect(isRangedPropBlockStage(id)).toBe(false)
  })
})

describe('기하', () => {
  it('점: 반크기 + 반지름 안이면 막힌다(회전 OBB 포함)', () => {
    expect(isPointInsideRangedBlockers(0.5, 0.5, 0, [box])).toBe(true)
    expect(isPointInsideRangedBlockers(1.05, 0, 0.09, [box])).toBe(true)
    expect(isPointInsideRangedBlockers(1.2, 0, 0.09, [box])).toBe(false)
    // rotationY π/4(콜라이더 규약 localX = dx·cos − dz·sin): 판의 긴 축은 (1, −1) 대각선이다.
    expect(isPointInsideRangedBlockers(1, -1, 0, [rotated])).toBe(true)
    expect(isPointInsideRangedBlockers(1, 1, 0, [rotated])).toBe(false)
    expect(isPointInsideRangedBlockers(0, 0, 0, null)).toBe(false)
  })

  it('선분: 상자를 지나면 막히고, 비켜 가면 열린다', () => {
    expect(isSegmentBlockedByRangedBlockers(-3, 0, 3, 0, [box])).toBe(true)
    expect(isSegmentBlockedByRangedBlockers(-3, 1.5, 3, 1.5, [box])).toBe(false)
    expect(isSegmentBlockedByRangedBlockers(-3, 1.05, 3, 1.05, [box], 0.09)).toBe(true)
    expect(isSegmentBlockedByRangedBlockers(-3, 0, -2, 0, [box])).toBe(false)   // 상자 앞에서 끝남
    expect(isSegmentBlockedByRangedBlockers(-2, -2, 2, 2, [rotated])).toBe(true)
    expect(isSegmentBlockedByRangedBlockers(-3, 2.5, 3, 2.5, [rotated])).toBe(false) // 45° 판 끝(±1.41)보다 위
    expect(hasClearRangedSight(-3, 1.5, 3, 1.5, [box])).toBe(true)
    expect(hasClearRangedSight(-3, 0, 3, 0, [box])).toBe(false)
  })

  it('Stage 5 실제 배치: 같은 레인(L3 x 2.1) 위아래는 트여 있고, 섬을 가로지르면 막힌다', () => {
    expect(S5.length).toBeGreaterThanOrEqual(20)
    expect(hasClearRangedSight(2.1, -10, 2.1, 12, S5, E04_PROJECTILE_RADIUS)).toBe(true)
    expect(hasClearRangedSight(-2.1, 3.7, 2.1, 3.7, S5, E04_PROJECTILE_RADIUS)).toBe(false)
  })
})

describe('E04 탄 풀', () => {
  it('Stage 5 장애물을 걸면 책상에 닿은 탄은 사라지고, 걸지 않으면(S4 등) 지나간다', () => {
    const blocked = createEnemyProjectilePool()
    blocked.setPropBlockers(S5)
    const open = createEnemyProjectilePool()
    for (const pool of [blocked, open]) pool.spawnInto({ index: -1, generation: 0 }, -2.1, 0.45, 3.7, 1, 0, 8, 1.9)
    for (let i = 0; i < 90; i += 1) { blocked.step(1 / 60, 50, 50, null); open.step(1 / 60, 50, 50, null) }
    expect(blocked.activeCount).toBe(0)
    expect(open.activeCount).toBe(1)
    blocked.setPropBlockers(null)
    expect(blocked._propBlockers).toBeNull()
  })
})

describe('투사체 좀비 탄 풀', () => {
  const spec = (motion) => ({
    kind: SHOT_KIND.ERASER, motion, speed: 3, damage: 6, lifeMs: 3000, hitRadius: 0.12,
    p0: motion === SHOT_MOTION.LOB ? 2.1 : 0, p1: motion === SHOT_MOTION.LOB ? 3.7 : 0, p2: motion === SHOT_MOTION.LOB ? 900 : 0, p3: 0.6, p4: 0, bounces: 0,
    hitSlowMul: 1, hitSlowMs: 0, endZoneKind: 0, endZoneRadius: 0, endZoneMs: 0, endZoneSlow: 1, endZoneDamage: 0, endZoneTickMs: 0, impulseU: 0, impulseMs: 0,
  })

  it('직진 탄은 책상에 막히고, 포물선(LOB)은 위로 넘어간다', () => {
    const pool = createProjectileZombieShotPool()
    pool.setPropBlockers(S5)
    pool.spawn(-2.1, 3.7, 1, 0, spec(SHOT_MOTION.STRAIGHT))
    for (let i = 0; i < 60; i += 1) pool.step(1 / 60, 50, 50, null)
    expect(pool.active.reduce((a, b) => a + b, 0)).toBe(0)

    const lob = createProjectileZombieShotPool()
    lob.setPropBlockers(S5)
    lob.spawn(-2.1, 3.7, 1, 0, spec(SHOT_MOTION.LOB))
    lob.step(1 / 60, 50, 50, null)
    expect(lob.active.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  })

  it('장애물을 걸지 않으면 기존 동작(같은 탄이 책상을 지나간다)', () => {
    const pool = createProjectileZombieShotPool()
    pool.spawn(-2.1, 3.7, 1, 0, spec(SHOT_MOTION.STRAIGHT))
    for (let i = 0; i < 60; i += 1) pool.step(1 / 60, 50, 50, null)
    expect(pool.active.reduce((a, b) => a + b, 0)).toBe(1)
  })
})

describe('E04 사격 시작 게이트(enemySimulation)', () => {
  function fires(rangedSightObstacles, playerX, playerZ) {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    pool.spawn({ type: 'E04', x: -2.1, z: 3.7, hp: 66, maxHp: 66, spawnTimer: 0 })
    const context = { delta: 1 / 60, playerX, playerZ, halfX: 9.36, halfZ: 16, elapsedSec: 30, spawnSec: 30, activeProjectileCount: 0,
      stageId: 'stage5', e04IntroSec: 12, bossPressure: false, obstacles: [], obstacleCount: 0, rangedSightObstacles }
    let fired = 0
    const event = {}
    for (let i = 0; i < 120; i += 1) {
      runtime.step(pool, context)
      while (runtime.events.drainInto(event)) if (event.type === ENEMY_EVENT_RANGED_FIRE) fired += 1
    }
    return fired
  }

  it('사선이 책상 섬에 막히면 쏘지 않고, 같은 레인이면 쏜다. 장애물을 안 넘기면(S4 등) 기존대로 쏜다', () => {
    expect(fires(S5, 3.2 + 2, 3.7)).toBe(0)      // 사수 L2 (−2.1, 3.7) → 플레이어 (5.2, 3.7): 가운데 섬을 가로지른다
    expect(fires(null, 3.2 + 2, 3.7)).toBeGreaterThan(0)
    expect(fires(S5, -2.1, 3.7 + 6)).toBeGreaterThan(0) // 같은 레인(L2 x −2.1) 아래쪽 — 섬 사이 세로 통로라 사선이 트여 있다
  })
})
