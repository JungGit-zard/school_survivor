import { beforeEach, describe, expect, it } from 'vitest'
import { EnemyEntityPool, ENEMY_TYPE_CODES, MAX_ENEMIES } from './enemyEntityPool.js'
import { ENEMY_RUNTIME_HP, ENEMY_RUNTIME_XP, ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime } from './enemySimulation.js'
import { clearExpansionAttacks, expansionAttackSnapshots } from './expansionAttackRuntime.js'
import { EXPANSION_PLAYER_RADIUS, OBSTACLE_INGRESS_BODY_PAD, buildExpansionSafetyGeometry, certifyExpansionEscape, novel2NearSafetyObstacles } from './expansionAttackSafety.js'
import {
  NOVEL2_LANE_RETRY,
  E100_MOCHI,
  E101_COPIER,
  E102_CHAIR,
  E102_CONTACT,
  E104_BALL,
  E106_CAVALRY,
  E98_EATER,
  N2_STATE_APPROACH,
  N2_STATE_ATTACK,
  N2_STATE_RECOVER,
  N2_STATE_STUN,
  N2_STATE_TELEGRAPH,
  isBallTargetTypeCode,
} from './novelZombie2Behavior.js'
import { NOVEL2_ROWS, NOVEL2_WAVE3B_IDS, NOVEL2_WAVE3_IDS, NOVEL2_ZOMBIE_STATS, isNovel2AbsoluteHp } from './novelZombie2Content.js'
import { runStageRuntimeProbe } from './stageRuntimeProbe.js'
import { isSupportImmune } from './projectileZombieBehavior.js'
import { CHIEF_ELITE_BONUS, admitChiefSpawn, createChiefDebutLedger, findLiveChiefInto, isChiefType } from './stageChiefContent.js'
import { getStageRotationRoster } from './stageRosterRotation.js'
import { STAGE4_BURST_EVENTS, STAGE5_BURST_EVENTS, getBurstEventsForStage, isBossType } from './burstEvents.js'
import { getStageObjectSightObstacles, isStageObjectSightBlocked } from '../components/StageObjects/stageObjectColliders.js'
import { isNovel2DamageTelegraph } from '../components/expansion/expansionTelegraphs.js'

// 2차 신규 좀비 3차분(wave 3, 2026-11-16): 치프 3종 — E98 대식가(스4) · E101 복사기(스5) · E104 공굴리기 대장(스6).
// 못박는 것: 예고 시간(≥ 0.85초), 예고 중 피해 0, 예고 때 확정한 자리·방향 고정, 옆으로 비키면 피해 0, 그려진 범위 밖 피해 0,
// 정지한 플레이어는 60초 안에 맞음, 스테이지당 1회, 치프 부하(복사본·먹히는 개체)는 버프·지휘 대상 밖, 동시 150 상한, 보상.

const DT = 1 / 60
const PLAYER_SPEED = 3
const S4_BOUNDS = { halfX: 9.36, halfZ: 16 }
const S5_BOUNDS = { halfX: 9.36, halfZ: 16 }
const S6_BOUNDS = { halfX: 12, halfZ: 20 }
const E98_HP = Math.round(NOVEL2_ZOMBIE_STATS.E98.hp * 1.728) // 173
const E101_HP = Math.round(NOVEL2_ZOMBIE_STATS.E101.hp * 1.2 ** 4) // 187
const E104_HP = NOVEL2_ZOMBIE_STATS.E104.hp // 250(절대)

beforeEach(() => { clearExpansionAttacks() })

function spawn(pool, id, x, z, { hp, spawnTimer = ENEMY_SPAWN_REVEAL_MS + 1, scale } = {}) {
  const code = ENEMY_TYPE_CODES[id]
  const life = hp ?? (ENEMY_RUNTIME_HP[code] || 10)
  const handle = pool.spawn({ type: id, x, y: 0, z, hp: life, maxHp: life, visualScale: (scale ?? 1) * ENEMY_SIZE_MULTIPLIER, spawnTimer })
  expect(handle, `${id} spawn`).not.toBeNull()
  return handle
}

function makeStep(runtime, pool, bounds, stageId, extraContext = {}) {
  return (player) => {
    let damage = 0
    runtime.step(pool, {
      delta: DT, playerX: player.x, playerZ: player.z, ...bounds, elapsedSec: 80, activeProjectileCount: 0, stageId,
      onContact: (_i, _g, _x, _y, _z, value) => { damage += value },
      ...extraContext,
    })
    return damage
  }
}

function activeOfType(pool, id) {
  const code = ENEMY_TYPE_CODES[id]
  const out = []
  for (let i = 0; i <= pool.highestActive; i += 1) if (pool.active[i] && pool.type[i] === code) out.push(i)
  return out
}

function snapshotOf(type) {
  return [...expansionAttackSnapshots.values()].find((s) => s.type === type)
}

function runUntil(step, player, predicate, seconds = 5) {
  for (let f = 0; f < seconds / DT; f += 1) {
    step(player)
    if (predicate()) return true
  }
  return false
}

describe('wave 3 등록·배치', () => {
  it('세 치프 모두 implemented, base × 배수(E98 173 · E101 187) / 스6 절대(E104 250)', () => {
    expect(NOVEL2_WAVE3_IDS).toEqual(['E98', 'E101', 'E104'])
    for (const id of NOVEL2_WAVE3_IDS) {
      expect(NOVEL2_ROWS[id].implemented, id).toBe(true)
      expect(NOVEL2_ROWS[id].chief, id).toBe(true)
      expect(isChiefType(id), id).toBe(true)
      expect(isBossType(id), id).toBe(false)
      expect(ENEMY_RUNTIME_HP[ENEMY_TYPE_CODES[id]], id).toBe(NOVEL2_ZOMBIE_STATS[id].hp)
    }
    expect(E98_HP).toBe(173)
    expect(E101_HP).toBe(187)
    expect(isNovel2AbsoluteHp('E104')).toBe(true)
    expect(E104_HP).toBe(250)
  })

  it('등장 행: 스4 72초 E98, 스5 40초 E101, 스6 72초 E104 — 스테이지마다 치프 행 1개', () => {
    expect(STAGE4_BURST_EVENTS.filter((e) => isChiefType(e.type))).toEqual([{ sec: 72, type: 'E98', count: 1 }])
    expect(STAGE5_BURST_EVENTS.filter((e) => isChiefType(e.type))).toEqual([{ sec: 40, type: 'E101', count: 1 }])
    expect(getBurstEventsForStage('stage6').filter((e) => isChiefType(e.type))).toEqual([{ sec: 72, type: 'E104', count: 1 }])
  })

  it('치프는 로스터 순환에 들어가지 않는다', () => {
    expect(getStageRotationRoster('stage4')).not.toContain('E98')
    expect(getStageRotationRoster('stage5')).not.toContain('E101')
    expect(getStageRotationRoster('stage6')).not.toContain('E104')
  })

  it('보상: 교과서 2권 × 45XP + 골드 2, 데뷔는 런마다 1회', () => {
    const ledger = createChiefDebutLedger()
    for (const id of NOVEL2_WAVE3_IDS) {
      expect(CHIEF_ELITE_BONUS[id], id).toEqual({ textbook: 2, textbookXp: 45, gold: 2 })
      expect(admitChiefSpawn(ledger, id), id).toBe(true)
      expect(admitChiefSpawn(ledger, id), id).toBe(false)
    }
  })

  it('치프 바(이름표 + 미니 체력바)가 세 치프를 찾는다', () => {
    for (const id of NOVEL2_WAVE3_IDS) {
      const pool = new EnemyEntityPool()
      spawn(pool, 'E01', 3, 3)
      const chief = spawn(pool, id, 0, 0, { hp: 100 })
      pool.hp[chief.index] = 40
      const live = findLiveChiefInto(pool, { index: -1, typeCode: 0, hp: 0, maxHp: 0 })
      expect(live.index, id).toBe(chief.index)
      expect(live.hp / live.maxHp, id).toBeCloseTo(0.4, 6)
    }
  })
})

describe('E98 대식가(치프, 스4)', () => {
  function setup(eaterZ = 2) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4_BOUNDS, 'stage4')
    const eater = spawn(pool, 'E98', 0, eaterZ, { hp: E98_HP, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E98.scale })
    return { pool, runtime, step, eater }
  }

  it('1.0초 빨간 부채꼴(70°·r 2.2u) 예고 중 피해 0, 원점·방향 고정 → 가만히 있으면 물기 14', () => {
    const { pool, step, eater } = setup()
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => pool.state[eater.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const bite = snapshotOf('E98')
    expect(bite.shape).toBe('sector')
    expect(bite.angleDeg).toBe(E98_EATER.coneAngleDeg)
    expect(bite.rangeUnits).toBe(E98_EATER.coneRadius)
    expect(bite.windupMs).toBeGreaterThanOrEqual(850)
    expect(bite.damage).toBe(E98_EATER.biteDamage)
    expect(isNovel2DamageTelegraph(bite)).toBe(true)
    const origin = [...bite.originXZ]
    const dir = [...bite.directionXZ]
    let telegraphDamage = 0
    const wobble = { x: 0, z: 0 }
    for (let f = 0; f < (E98_EATER.telegraphMs - 50) / 1000 / DT; f += 1) {
      wobble.x = Math.sin(f * 0.2) * 0.3 // 플레이어가 흔들려도 부채꼴은 따라오지 않는다
      telegraphDamage += step(wobble)
    }
    expect(telegraphDamage).toBe(0)
    expect(bite.originXZ).toEqual(origin)
    expect(bite.directionXZ).toEqual(dir)
    let biteDamage = 0
    for (let f = 0; f < 0.4 / DT; f += 1) biteDamage += step({ x: 0, z: 0 })
    expect(biteDamage).toBe(E98_EATER.biteDamage)
  })

  it('예고를 보고 옆으로 비키면 피해 0', () => {
    const { pool, step, eater } = setup()
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => pool.state[eater.index] === N2_STATE_TELEGRAPH)).toBe(true)
    let damage = 0
    for (let f = 0; f < (E98_EATER.telegraphMs + E98_EATER.biteMs + 100) / 1000 / DT; f += 1) {
      player.x += PLAYER_SPEED * DT
      damage += step(player)
    }
    expect(damage).toBe(0)
  })

  it('물기는 그려진 부채꼴 밖으로 나가지 않는다(반경 바로 밖에 선 플레이어 피해 0)', () => {
    const { pool, step, eater } = setup()
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[eater.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const bite = snapshotOf('E98')
    // 방향 반대편(대식가 뒤)과 반경 + 몸 반경 바로 밖.
    const out = bite.rangeUnits + EXPANSION_PLAYER_RADIUS + 0.05
    const outside = { x: bite.originXZ[0] + bite.directionXZ[0] * out, z: bite.originXZ[1] + bite.directionXZ[1] * out }
    let damage = 0
    for (let f = 0; f < (E98_EATER.telegraphMs + E98_EATER.biteMs + 100) / 1000 / DT; f += 1) damage += step(outside)
    expect(damage).toBe(0)
  })

  it('부채꼴 안 약한 잡몹(HP ≤ 25%)만 먹는다 — 회복 8%·크기 +6%·속도 −5%, 강한 잡몹·부채꼴 밖·E08·치프는 그대로', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4_BOUNDS, 'stage4')
    const eater = spawn(pool, 'E98', 0, 4, { hp: E98_HP, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E98.scale })
    pool.hp[eater.index] = 100
    const food = spawn(pool, 'E01', 0, 2.6, { hp: 14 })
    const strong = spawn(pool, 'E02', 0.6, 2.9, { hp: 121 })
    const aside = spawn(pool, 'E01', 4, 4, { hp: 14 })
    const coin = spawn(pool, 'E08', -0.5, 2.9, { hp: 5 })
    const otherChief = spawn(pool, 'E89', 0.4, 3.0, { hp: 1, spawnTimer: 0 })
    const baseScale = pool.visualScale[eater.index]
    const player = { x: 0, z: -8 } // 멀리(물기 거리 밖) — 먹이 때문에 입을 벌린다
    step(player)
    expect(pool.state[eater.index]).toBe(N2_STATE_TELEGRAPH)
    for (let f = 0; f < (E98_EATER.telegraphMs + E98_EATER.suckMs + 100) / 1000 / DT; f += 1) step(player)
    expect(pool.isIndexGenerationAlive(food.index, food.generation)).toBe(false)
    for (const h of [strong, aside, coin, otherChief]) expect(pool.isIndexGenerationAlive(h.index, h.generation)).toBe(true)
    expect(runtime.novel2.eatCount[eater.index]).toBe(1)
    expect(pool.hp[eater.index]).toBeCloseTo(100 + E98_HP * E98_EATER.healPerEat, 3)
    expect(pool.visualScale[eater.index]).toBeCloseTo(baseScale * (1 + E98_EATER.growPerEat), 5)
    expect(runtime.novel2.eaterSpeedMultiplier(eater.index)).toBeCloseTo(1 - E98_EATER.slowPerEat, 6)
    // 대식가가 죽으면 먹은 잡몹의 XP(E01 4)가 교과서로 그대로 떨어진다.
    runtime.applyHitIndex(pool, eater.index, eater.generation, 1e9)
    const drops = []
    runtime.novel2.drainThiefLoot((_x, _z, value) => drops.push(value))
    expect(drops).toEqual([ENEMY_RUNTIME_XP[ENEMY_TYPE_CODES.E01]])
  })

  it('먹히는 잡몹은 끌려가는 동안 입으로 모이고(접촉 피해 끔), 치프 부하라 커피·지휘·복사 대상 밖', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4_BOUNDS, 'stage4')
    const eater = spawn(pool, 'E98', 0, 4, { hp: E98_HP, spawnTimer: 3000 })
    const food = spawn(pool, 'E01', 0, 2.6, { hp: 14 })
    const player = { x: 0, z: -8 }
    let sawEaten = false
    for (let f = 0; f < 2 / DT; f += 1) {
      step(player)
      if (!runtime.novel2.isBeingEaten(pool, food.index)) continue
      sawEaten = true
      expect(runtime.novel2.isChiefMinion(pool, food.index)).toBe(true)
      expect(runtime.novel2.pickCoffeeTarget(pool, eater.index)).not.toBe(food.index)
      expect(runtime.novel2._countCommandable(pool, eater.index, pool.posX[food.index], pool.posZ[food.index])).toBe(0)
      const out = { velocityX: 0, velocityZ: 0, moving: false, preserveFacing: false, noContact: false, hasYaw: false, yaw: 0 }
      runtime.novel2.stepEaten(pool, food.index, 0, out)
      expect(out.noContact).toBe(true)
      // 입(부채꼴 원점 앞 0.4u) 쪽으로 끌려간다.
      const mouthZ = runtime.novel2.mouthZ[eater.index]
      expect(Math.sign(out.velocityZ || (mouthZ - pool.posZ[food.index]))).toBe(Math.sign(mouthZ - pool.posZ[food.index]))
    }
    expect(sawEaten).toBe(true)
    expect(pool.isIndexGenerationAlive(food.index, food.generation)).toBe(false)
  })

  it('가만히 선 플레이어는 60초 안에 맞는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4_BOUNDS, 'stage4')
    spawn(pool, 'E98', -4, 0, { hp: 1e9, spawnTimer: 3000 })
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(damage).toBeGreaterThan(0)
  })
})

describe('E101 복사기(치프, 스5)', () => {
  function setup(copierX = 0, copierZ = 2) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S5_BOUNDS, 'stage5')
    const copier = spawn(pool, 'E101', copierX, copierZ, { hp: E101_HP, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E101.scale })
    return { pool, runtime, step, copier }
  }

  it('근접 부채꼴(60°·r 2.4u): 1.0초 예고 중 피해 0 → 가만히 있으면 12', () => {
    const { pool, step, copier } = setup()
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[copier.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const fan = snapshotOf('E101')
    expect(fan.shape).toBe('sector')
    expect(fan.angleDeg).toBe(E101_COPIER.fanAngleDeg)
    expect(fan.windupMs).toBeGreaterThanOrEqual(850)
    expect(isNovel2DamageTelegraph(fan)).toBe(true)
    let telegraphDamage = 0
    for (let f = 0; f < (E101_COPIER.fanTelegraphMs - 50) / 1000 / DT; f += 1) telegraphDamage += step({ x: 0, z: 0 })
    expect(telegraphDamage).toBe(0)
    let hit = 0
    for (let f = 0; f < 0.3 / DT; f += 1) hit += step({ x: 0, z: 0 })
    expect(hit).toBe(E101_COPIER.fanDamage)
  })

  it('예고를 보고 옆으로 비키면 피해 0', () => {
    const { pool, step, copier } = setup()
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => pool.state[copier.index] === N2_STATE_TELEGRAPH)).toBe(true)
    let damage = 0
    for (let f = 0; f < (E101_COPIER.fanTelegraphMs + E101_COPIER.fanActiveMs + 100) / 1000 / DT; f += 1) {
      player.x += PLAYER_SPEED * DT
      damage += step(player)
    }
    expect(damage).toBe(0)
  })

  it('복사: 1.2초 노란 원(피해 0) 뒤 대상 옆에 복사본 1기(HP 40%), 복사본은 치프 부하(회복·방패·커피·지휘 제외)', () => {
    const { pool, runtime, step, copier } = setup(0, 10)
    const target = spawn(pool, 'E01', 1, 10, { hp: 17 })
    const player = { x: 0, z: -15 }
    step(player)
    expect(pool.state[copier.index]).toBe(N2_STATE_TELEGRAPH)
    const scan = snapshotOf('E101')
    expect(scan.windupMs).toBe(E101_COPIER.scanMs)
    expect(scan.damage).toBe(0)
    expect(isNovel2DamageTelegraph(scan)).toBe(false) // 피해 없는 신호 = 노랑
    for (let f = 0; f < (E101_COPIER.scanMs + 100) / 1000 / DT; f += 1) step(player)
    const e01 = activeOfType(pool, 'E01')
    expect(e01).toHaveLength(2)
    const copy = e01.find((i) => i !== target.index)
    expect(runtime.novel2.isCopy(pool, copy)).toBe(true)
    expect(runtime.novel2.isCopy(pool, target.index)).toBe(false)
    expect(pool.maxHp[copy]).toBe(Math.round(17 * E101_COPIER.copyHpRatio))
    expect(isSupportImmune(pool, copy)).toBe(true)
    expect(runtime.novel2.isChiefMinion(pool, copy)).toBe(true)
    expect(runtime.novel2._countCommandable(pool, copier.index, pool.posX[copy], pool.posZ[copy])).toBe(1) // 원본만
    expect(runtime.novel2.pickCopyTarget(pool, copier.index)).toBe(target.index) // 복사본을 다시 복사하지 않는다
  })

  it('복사본은 동시 2기까지, 20초 뒤 소멸, 복사기가 죽으면 즉시 사라진다', () => {
    const { pool, runtime, step, copier } = setup(0, 12)
    for (let k = 0; k < 3; k += 1) spawn(pool, 'E01', -1 + k, 12.5, { hp: 1e6 })
    const player = { x: 0, z: -15 }
    let maxCopies = 0
    let firstCopy = null
    let firstSeenMs = 0
    let ms = 0
    for (let f = 0; f < 26 / DT; f += 1) {
      step(player)
      ms += DT * 1000
      const copies = activeOfType(pool, 'E01').filter((i) => runtime.novel2.isCopy(pool, i))
      maxCopies = Math.max(maxCopies, copies.length)
      if (!firstCopy && copies.length) { firstCopy = { index: copies[0], generation: pool.generation[copies[0]] }; firstSeenMs = ms }
      if (firstCopy && ms - firstSeenMs > E101_COPIER.copyLifeMs + 100) expect(pool.isIndexGenerationAlive(firstCopy.index, firstCopy.generation)).toBe(false)
    }
    expect(firstCopy).not.toBeNull()
    expect(maxCopies).toBe(E101_COPIER.maxCopies)
    const before = activeOfType(pool, 'E01').filter((i) => runtime.novel2.isCopy(pool, i))
    expect(before.length).toBeGreaterThan(0)
    runtime.applyHitIndex(pool, copier.index, copier.generation, 1e9)
    step(player)
    expect(activeOfType(pool, 'E01').filter((i) => runtime.novel2.isCopy(pool, i))).toHaveLength(0)
    expect(activeOfType(pool, 'E01')).toHaveLength(3) // 원본은 남는다
  })

  it('스캔 중 대상이 죽으면 "용지 없음" — 복사하지 않는다', () => {
    const { pool, runtime, step } = setup(0, 10)
    const target = spawn(pool, 'E01', 1, 10, { hp: 17 })
    const player = { x: 0, z: -15 }
    step(player)
    runtime.applyHitIndex(pool, target.index, target.generation, 1e9)
    for (let f = 0; f < (E101_COPIER.scanMs + 200) / 1000 / DT; f += 1) step(player)
    expect(activeOfType(pool, 'E01')).toHaveLength(0)
  })

  it('동시 150 상한: 보스·마틸다 몫 2칸이 비어 있지 않으면 복사하지 않는다', () => {
    const { pool, runtime, step } = setup(0, 10)
    spawn(pool, 'E01', 1, 10, { hp: 1e6 })
    for (let k = 0; MAX_ENEMIES - pool.activeCount > 1; k += 1) spawn(pool, 'E03', -8 + (k % 16), -14 + Math.floor(k / 16) * 0.9, { hp: 1e6 })
    expect(pool.activeCount).toBe(MAX_ENEMIES - 1)
    for (let f = 0; f < 3 / DT; f += 1) step({ x: 0, z: -15.5 })
    expect(pool.activeCount).toBeLessThanOrEqual(MAX_ENEMIES - 1)
    expect(activeOfType(pool, 'E01').filter((i) => runtime.novel2.isCopy(pool, i))).toHaveLength(0)
  })

  it('용지 걸림: 4초 안에 최대 HP 20%를 맞으면 2.5초 제자리(진행 중 예고는 피해 없이 취소), 끝난 뒤 3초는 다시 안 걸린다', () => {
    const { pool, runtime, step, copier } = setup()
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[copier.index] === N2_STATE_TELEGRAPH)).toBe(true)
    expect(snapshotOf('E101')).toBeTruthy()
    runtime.applyHitIndex(pool, copier.index, copier.generation, Math.ceil(E101_HP * E101_COPIER.jamDamageRatio))
    expect(pool.state[copier.index]).toBe(N2_STATE_STUN)
    step({ x: 0, z: 0 })
    expect(snapshotOf('E101')).toBeUndefined()
    const x0 = pool.posX[copier.index]
    let damage = 0
    for (let f = 0; f < (E101_COPIER.jamMs - 100) / 1000 / DT; f += 1) {
      damage += step({ x: 0, z: 0 })
      expect(pool.state[copier.index]).toBe(N2_STATE_STUN)
    }
    expect(damage).toBe(0)
    expect(Math.abs(pool.posX[copier.index] - x0)).toBeLessThan(0.3)
    for (let f = 0; f < 0.3 / DT; f += 1) step({ x: 0, z: -10 })
    expect(pool.state[copier.index]).not.toBe(N2_STATE_STUN)
    expect(runtime.novel2.noteCopierDamage(pool, copier.index, E101_HP)).toBe(false)
  })

  it('가만히 선 플레이어는 60초 안에 맞는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S5_BOUNDS, 'stage5')
    spawn(pool, 'E101', -4, 0, { hp: 1e9, spawnTimer: 3000 })
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(damage).toBeGreaterThan(0)
  })
})

describe('E104 공굴리기 대장(치프, 스6)', () => {
  function setup(x = 0, z = 8, extraContext = {}) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S6_BOUNDS, 'stage6', extraContext)
    const captain = spawn(pool, 'E104', x, z, { hp: E104_HP, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E104.scale })
    return { pool, runtime, step, captain }
  }

  function toTelegraph(ctx, player) {
    return runUntil(ctx.step, player, () => ctx.pool.state[ctx.captain.index] === N2_STATE_TELEGRAPH)
  }

  function rollMs(snapshot) { return snapshot.windupMs + snapshot.activeMs }

  it('1.3초 빨간 선(폭 1.8u = 공 지름, 맵 끝까지 최대 20u) 예고 중 피해 0, 선은 예고 시작 자리·방향 고정', () => {
    const ctx = setup()
    expect(toTelegraph(ctx, { x: 0, z: 0 })).toBe(true)
    const line = snapshotOf('E104')
    expect(line.shape).toBe('line')
    expect(line.widthUnits).toBe(2 * E104_BALL.ballRadius)
    expect(line.windupMs).toBe(E104_BALL.telegraphMs)
    expect(line.rangeUnits).toBeCloseTo(E104_BALL.maxLength, 6) // (0, 8) → −z, 맵 끝 28u보다 길이 상한 20u가 먼저
    expect(line.damage).toBe(E104_BALL.damage)
    expect(isNovel2DamageTelegraph(line)).toBe(true)
    expect(ctx.runtime.novel2.ballHeldScale(ctx.pool, ctx.captain.index)).toBe(1)
    const origin = [...line.originXZ]
    const dir = [...line.directionXZ]
    let damage = 0
    for (let f = 0; f < (E104_BALL.telegraphMs - 50) / 1000 / DT; f += 1) damage += ctx.step({ x: Math.sin(f * 0.3) * 0.5, z: 0 })
    expect(damage).toBe(0)
    expect(line.originXZ).toEqual(origin)
    expect(line.directionXZ).toEqual(dir)
  })

  it('가만히 선 플레이어: 공이 지나갈 때 1회 14(선 전체가 아니라 공 자리만), 공은 손에서 사라진다', () => {
    const ctx = setup()
    const player = { x: 0, z: 0 }
    expect(toTelegraph(ctx, player)).toBe(true)
    const line = snapshotOf('E104')
    let damage = 0
    let firstHitMs = -1
    let ms = 0
    for (let f = 0; f < (rollMs(line) + 50) / 1000 / DT; f += 1) {
      const d = ctx.step(player)
      ms += DT * 1000
      if (d > 0 && firstHitMs < 0) firstHitMs = ms
      damage += d
    }
    expect(damage).toBe(E104_BALL.damage)
    // 공이 플레이어(8u 앞)에 닿는 시각 = 예고 1.3초 + (8 − 0.9 − 0.9 − 0.19) / 6 초 근처 — 선이 켜지자마자가 아니다.
    const expectedMs = E104_BALL.telegraphMs + (8 - E104_BALL.ballRadius - E104_BALL.ballRadius - EXPANSION_PLAYER_RADIUS) / E104_BALL.rollSpeed * 1000
    expect(Math.abs(firstHitMs - expectedMs)).toBeLessThan(80)
    expect(ctx.runtime.novel2.ballPhase[ctx.captain.index]).toBe(3)
    expect(ctx.runtime.novel2.ballHeldScale(ctx.pool, ctx.captain.index)).toBe(0)
  })

  it('예고를 보고 옆으로 비키면 피해 0', () => {
    const ctx = setup()
    const player = { x: 0, z: 0 }
    expect(toTelegraph(ctx, player)).toBe(true)
    const line = snapshotOf('E104')
    let damage = 0
    for (let f = 0; f < (rollMs(line) + 50) / 1000 / DT; f += 1) {
      if (player.x < 1.6) player.x += PLAYER_SPEED * DT
      damage += ctx.step(player)
    }
    expect(damage).toBe(0)
  })

  it('공은 그려진 선 밖으로 나가지 않는다: 공 중심은 선 축 위 [r, 길이 − r], 선 바로 밖에 선 플레이어는 피해 0', () => {
    for (const [lateral, expected] of [[E104_BALL.ballRadius + EXPANSION_PLAYER_RADIUS + 0.03, 0], [E104_BALL.ballRadius + 0.1, E104_BALL.damage]]) {
      clearExpansionAttacks()
      const ctx = setup()
      expect(toTelegraph(ctx, { x: 0, z: 0 })).toBe(true)
      const line = snapshotOf('E104')
      const player = { x: lateral, z: 0 }
      let damage = 0
      let minAlong = Infinity
      let maxAlong = -Infinity
      let maxLateral = 0
      for (let f = 0; f < (rollMs(line) + 50) / 1000 / DT; f += 1) {
        damage += ctx.step(player)
        if (line.phase !== 'active') continue
        const rx = line.ballXZ[0] - line.originXZ[0]
        const rz = line.ballXZ[1] - line.originXZ[1]
        const along = rx * line.directionXZ[0] + rz * line.directionXZ[1]
        minAlong = Math.min(minAlong, along)
        maxAlong = Math.max(maxAlong, along)
        maxLateral = Math.max(maxLateral, Math.abs(rx * -line.directionXZ[1] + rz * line.directionXZ[0]))
      }
      expect(damage, `lateral ${lateral}`).toBe(expected)
      expect(minAlong).toBeGreaterThanOrEqual(E104_BALL.ballRadius - 1e-6)
      expect(maxAlong).toBeLessThanOrEqual(line.rangeUnits - E104_BALL.ballRadius + 1e-6)
      expect(maxLateral).toBeLessThan(1e-4)
    }
  })

  it('공은 지나가는 일반 좀비에게 굴림마다 1회 60(필드가 drainBallHits로 가져간다), 치프·E08·선 밖은 맞지 않는다', () => {
    const ctx = setup()
    const { pool, runtime } = ctx
    const onPath = [spawn(pool, 'E01', 0, 4, { hp: 1e6 }), spawn(pool, 'E19', 0.4, -4, { hp: 1e6 })]
    const off = spawn(pool, 'E01', 7, 0, { hp: 1e6 })
    const coin = spawn(pool, 'E08', 0, -6, { hp: 1e6 })
    const chief = spawn(pool, 'E89', 0.2, -9, { hp: 1e6, spawnTimer: 0 })
    expect(isBallTargetTypeCode(ENEMY_TYPE_CODES.E01)).toBe(true)
    expect(isBallTargetTypeCode(ENEMY_TYPE_CODES.E19)).toBe(true)
    for (const id of ['E08', 'E89', 'E92', 'E95', 'E98', 'E101', 'E104', 'RZL', 'RZC', 'RZT', 'RZG']) expect(isBallTargetTypeCode(ENEMY_TYPE_CODES[id]), id).toBe(false)
    const player = { x: 0, z: 0 }
    expect(toTelegraph(ctx, player)).toBe(true)
    const line = snapshotOf('E104')
    // 길 위의 좀비를 선 위에 붙잡아 둔다(이 테스트는 공 판정만 본다).
    const pin = () => { pool.posX[onPath[0].index] = 0; pool.posZ[onPath[0].index] = 4; pool.posX[onPath[1].index] = 0.4; pool.posZ[onPath[1].index] = -4 }
    const hits = new Map()
    for (let f = 0; f < (rollMs(line) + 50) / 1000 / DT; f += 1) {
      pin()
      ctx.step({ x: 6, z: 0 })
      runtime.novel2.drainBallHits((index, generation, damage) => {
        expect(damage).toBe(E104_BALL.zombieDamage)
        const key = `${index}:${generation}`
        hits.set(key, (hits.get(key) ?? 0) + 1)
      })
    }
    for (const h of onPath) expect(hits.get(`${h.index}:${h.generation}`), `on path ${h.index}`).toBe(1)
    for (const h of [off, coin, chief, ctx.captain]) expect(hits.has(`${h.index}:${h.generation}`)).toBe(false)
  })

  it('굴림 한 번에 좀비는 6기까지만 친다(XP 폭주 방지)', () => {
    const ctx = setup()
    const { pool, runtime } = ctx
    const row = Array.from({ length: 10 }, (_, k) => spawn(pool, 'E19', 0, 5 - k * 1.2, { hp: 1e6 }))
    const pin = () => row.forEach((h, k) => { pool.posX[h.index] = 0; pool.posZ[h.index] = 5 - k * 1.2 })
    expect(toTelegraph(ctx, { x: 0, z: -3 })).toBe(true) // 선 = (0, 8)에서 −z — 줄 10명을 모두 지난다
    const line = snapshotOf('E104')
    let hits = 0
    for (let f = 0; f < (rollMs(line) + 50) / 1000 / DT; f += 1) {
      pin()
      ctx.step({ x: 6, z: 0 })
      runtime.novel2.drainBallHits(() => { hits += 1 })
    }
    expect(hits).toBe(E104_BALL.maxZombieHitsPerRoll)
  })

  it('멈춘 공을 0.8u/s로 주우러 가고, 주우면 다시 손에 든다', () => {
    const ctx = setup(-6, 0)
    const player = { x: -9, z: 0 }
    expect(toTelegraph(ctx, player)).toBe(true)
    const line = snapshotOf('E104')
    expect(line.rangeUnits).toBeCloseTo(12 - 6 - E104_BALL.edgeMargin, 5) // 맵 끝(−12)까지
    for (let f = 0; f < (rollMs(line) + 50) / 1000 / DT; f += 1) ctx.step({ x: -9, z: 6 })
    const { pool, runtime, captain } = ctx
    expect(runtime.novel2.ballPhase[captain.index]).toBe(3)
    const ball = runtime.novel2.ballStateInto(pool, captain.index, {})
    expect(ball.phase).toBe(3)
    expect(ball.radius).toBe(E104_BALL.ballRadius)
    let maxSpeed = 0
    let px = pool.posX[captain.index]
    let pz = pool.posZ[captain.index]
    let pickedUp = false
    for (let f = 0; f < 9 / DT; f += 1) {
      ctx.step({ x: 0, z: 12 })
      maxSpeed = Math.max(maxSpeed, Math.hypot(pool.posX[captain.index] - px, pool.posZ[captain.index] - pz) / DT)
      px = pool.posX[captain.index]; pz = pool.posZ[captain.index]
      if (runtime.novel2.ballPhase[captain.index] === 0) { pickedUp = true; break }
    }
    expect(pickedUp).toBe(true)
    expect(runtime.novel2.ballRetrieveMs[captain.index]).toBeLessThan(E104_BALL.retrieveTimeoutMs)
    expect(maxSpeed).toBeLessThanOrEqual(E104_BALL.retrieveSpeed + 0.05)
    expect(runtime.novel2.ballHeldScale(pool, captain.index)).toBe(1)
  })

  it('골대(장애물)에 막히면 공 길이 그 앞까지 줄어든다', () => {
    const obstacles = getStageObjectSightObstacles('stage6')
    expect(obstacles.length).toBeGreaterThan(0)
    // 2026-11-18 경기장 축소: 골대는 z ±7.7(옛 ±11). 대장은 두 골대 사이 z 4에서 북쪽으로 찬다(맵 크기는 이 묶음의 가상 S6_BOUNDS).
    const ctx = setup(0, 4, { obstacles, obstacleCount: obstacles.length })
    ctx.step({ x: 0, z: 30 }) // 머리말에 맵 크기·장애물을 넣는다(멀어서 굴리지 않는다)
    const free = ctx.runtime.novel2._ballLaneLength(4, 4, 0, -1) // 골대 옆(x 4) — 막히지 않는다
    const blocked = ctx.runtime.novel2._ballLaneLength(0, 4, 0, -1) // 북쪽 골대(z −7.7) 정면
    expect(free).toBeCloseTo(E104_BALL.maxLength, 5)
    expect(blocked).toBeLessThan(4 + 7.7)
    expect(blocked).toBeGreaterThan(4 + 7.7 - 2)
  })

  it('굴리는 중 대장이 죽으면 공은 피해 없이 사라진다', () => {
    const ctx = setup()
    const player = { x: 0, z: 0 }
    expect(toTelegraph(ctx, player)).toBe(true)
    for (let f = 0; f < (E104_BALL.telegraphMs + 200) / 1000 / DT; f += 1) ctx.step({ x: 5, z: 0 })
    expect(snapshotOf('E104').phase).toBe('active')
    ctx.runtime.applyHitIndex(ctx.pool, ctx.captain.index, ctx.captain.generation, 1e9)
    let damage = 0
    for (let f = 0; f < 4 / DT; f += 1) damage += ctx.step(player)
    expect(damage).toBe(0)
    expect(snapshotOf('E104')).toBeUndefined()
  })

  it('HP 50% 이하에서는 굴림 간격이 8초 → 6초', () => {
    const ctx = setup()
    ctx.pool.hp[ctx.captain.index] = E104_HP * 0.4
    expect(toTelegraph(ctx, { x: 0, z: 0 })).toBe(true)
    expect(ctx.pool.attackCooldown[ctx.captain.index]).toBeGreaterThan(E104_BALL.enragedCooldownMs - 50)
    expect(ctx.pool.attackCooldown[ctx.captain.index]).toBeLessThanOrEqual(E104_BALL.enragedCooldownMs)
  })

  it('가만히 선 플레이어는 60초 안에 맞는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S6_BOUNDS, 'stage6')
    spawn(pool, 'E104', -4, 0, { hp: 1e9, spawnTimer: 3000 })
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(damage).toBeGreaterThan(0)
  })
})

// ── 3차 둘째 묶음(2026-11-17): 일반 3종 — E100 찹쌀떡(스4) · E102 회전의자(스5) · E106 기마전(스6, 몸 4) ──────────────
// 못박는 것: 예고 ≥ 0.85초·예고 중 피해 0·예고 시작에 자리·방향 고정·옆으로 비키면 피해 0·그려진 선/부채꼴 밖 피해 0,
// 찹쌀떡 매달림의 대응(4u 떨쳐내기·4초·처치)·2기 상한·면역(영구 감속 없음)·마틸다 경고 뒤 금지, 의자 활주가 선 띠 밖으로 나가지 않음,
// 기마전 편대·처치 순서, 치프 아님(이름표·보상 없음, 순환 풀), 같은 hp 맞교환 행, 기본 시드에서 실제 스폰.
const E100_HP = Math.round(16 * 1.728) // 28
const E102_HP = Math.round(16 * 1.2 ** 4) // 33

describe('wave 3 둘째 묶음 등록·배치', () => {
  it('세 종 모두 implemented 일반 종(치프 아님 — 이름표·체력바·치프 보상 없음), E100·E102 hp 16 × 배수, E106 절대 30', () => {
    expect(NOVEL2_WAVE3B_IDS).toEqual(['E100', 'E102', 'E106'])
    for (const id of NOVEL2_WAVE3B_IDS) {
      expect(NOVEL2_ROWS[id].implemented, id).toBe(true)
      expect(NOVEL2_ROWS[id].chief, id).toBe(false)
      expect(isChiefType(id), id).toBe(false)
      expect(isBossType(id), id).toBe(false)
      expect(CHIEF_ELITE_BONUS[id], id).toBeUndefined()
      expect(ENEMY_RUNTIME_HP[ENEMY_TYPE_CODES[id]], id).toBe(NOVEL2_ZOMBIE_STATS[id].hp)
      const pool = new EnemyEntityPool()
      spawn(pool, id, 0, 0, { hp: 30 })
      expect(findLiveChiefInto(pool, { index: -1, typeCode: 0, hp: 0, maxHp: 0 }).index, id).toBe(-1)
    }
    expect(NOVEL2_ZOMBIE_STATS.E100.hp).toBe(16)
    expect(NOVEL2_ZOMBIE_STATS.E102.hp).toBe(16)
    expect(E100_HP).toBe(28)
    expect(E102_HP).toBe(33)
    expect(isNovel2AbsoluteHp('E106')).toBe(true)
    expect(NOVEL2_ZOMBIE_STATS.E106.hp).toBe(30)
    expect(NOVEL2_ROWS.E106.bodyCount).toBe(4)
  })

  it('행: 스4 168초 E100(E44 복습 자리) · 스5 144초 E07 5 → 4 + E102 · 스6 192초 조회 줄 E19 12 → 8 + E106 몸 4', () => {
    expect(STAGE4_BURST_EVENTS.filter((e) => e.type === 'E100')).toEqual([{ sec: 168, type: 'E100', count: 1 }])
    expect(STAGE4_BURST_EVENTS.filter((e) => e.sec === 168 && e.type === 'E44')).toEqual([])
    expect(STAGE5_BURST_EVENTS.filter((e) => e.type === 'E102')).toEqual([{ sec: 144, type: 'E102', count: 1 }])
    expect(STAGE5_BURST_EVENTS.filter((e) => e.sec === 144 && e.type === 'E07')).toEqual([{ sec: 144, type: 'E07', count: 4 }])
    const s6 = getBurstEventsForStage('stage6')
    expect(s6.filter((e) => e.type === 'E106')).toEqual([{ sec: 192, type: 'E106', count: 4 }])
    expect(s6.filter((e) => e.sec === 192 && e.type === 'E19').map((e) => e.count)).toEqual([8])
  })

  it('E100·E102는 스테이지 순환 풀에 들어가고(첫 등장 168·144초), E106은 편대라 순환하지 않는다', () => {
    expect(getStageRotationRoster('stage4')).toContain('E100')
    expect(getStageRotationRoster('stage5')).toContain('E102')
    expect(getStageRotationRoster('stage6')).not.toContain('E106')
  })

  // 지난 차례에 작성 행이 순환에 조용히 바뀌어 사라진 일이 있었다 — 기본 시드 런타임 프로브(실제 스폰 경로)로 첫 등장을 확인한다.
  it.each([
    ['stage4', 'E100', 1, 172],
    ['stage5', 'E102', 1, 148],
    ['stage6', 'E106', 4, 196],
  ])('%s: 기본 시드 1 프로브에서 %s가 실제로 나온다(몸 %i)', (stageId, id, bodies, maxSec) => {
    const run = runStageRuntimeProbe({ stageId, seed: 1, immortal: true, maxSec })
    expect(run.spawnCountByType[id] ?? 0, JSON.stringify(run.spawnSecsByType?.[id])).toBeGreaterThanOrEqual(bodies)
  }, 60000)
})

describe('E100 찹쌀떡(스4)', () => {
  function setup({ elapsedSec = 80 } = {}) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4_BOUNDS, 'stage4', { elapsedSec })
    return { pool, runtime, step }
  }
  const spawnMochi = (pool, x, z) => spawn(pool, 'E100', x, z, { hp: E100_HP, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E100.scale })
  const mochiLine = () => [...expansionAttackSnapshots.values()].find((s) => s.type === 'E100')

  it('0.9초 빨간 선(1.75 × 0.9u) 웅크림 예고 중 피해 0·자리 고정 → 가만히 있으면 매달림(물기 6 한 번, 이동 ×0.75)', () => {
    const { pool, runtime, step } = setup()
    const m = spawnMochi(pool, 0, 1.2)
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => pool.state[m.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const line = mochiLine()
    expect(line.shape).toBe('line')
    expect(line.windupMs).toBeGreaterThanOrEqual(850)
    expect(line.rangeUnits).toBe(E100_MOCHI.lineLength)
    expect(line.widthUnits).toBe(E100_MOCHI.lineWidth)
    expect(isNovel2DamageTelegraph(line)).toBe(true)
    const origin = [...line.originXZ]
    const dir = [...line.directionXZ]
    const x0 = pool.posX[m.index]
    const z0 = pool.posZ[m.index]
    let telegraphDamage = 0
    for (let f = 0; f < (E100_MOCHI.telegraphMs - 50) / 1000 / DT; f += 1) telegraphDamage += step({ x: Math.sin(f * 0.3) * 0.1, z: 0 })
    expect(telegraphDamage).toBe(0)
    expect(line.originXZ).toEqual(origin)
    expect(line.directionXZ).toEqual(dir)
    expect(pool.posX[m.index]).toBeCloseTo(x0, 6)
    expect(pool.posZ[m.index]).toBeCloseTo(z0, 6)
    let damage = 0
    for (let f = 0; f < 0.8 / DT; f += 1) damage += step(player)
    expect(damage).toBe(E100_MOCHI.latchDamage)
    expect(runtime.novel2.clingerCount()).toBe(1)
    expect(runtime.novel2.playerSlowMul()).toBe(E100_MOCHI.slowOne)
    const visual = runtime.novel2.mochiStateInto(pool, m.index, {})
    expect(visual.phase).toBe(3)
    expect(visual.clinging).toBe(true)
    expect(Math.hypot(visual.offsetX, visual.offsetZ)).toBeCloseTo(E100_MOCHI.attachOffset, 5)
  })

  it('예고를 보고 옆으로 비키면 매달리지 않고 피해 0(떡은 바닥에 퍼진다)', () => {
    const { pool, runtime, step } = setup()
    const m = spawnMochi(pool, 0, 1.2)
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => pool.state[m.index] === N2_STATE_TELEGRAPH)).toBe(true)
    let damage = 0
    let sawMiss = false
    for (let f = 0; f < (E100_MOCHI.telegraphMs + 600) / 1000 / DT; f += 1) {
      if (player.x < 1.2) player.x += PLAYER_SPEED * DT
      damage += step(player)
      if (runtime.novel2.mochiPhase[m.index] === 4) sawMiss = true
    }
    expect(damage).toBe(0)
    expect(sawMiss).toBe(true)
    expect(runtime.novel2.clingerCount()).toBe(0)
    expect(runtime.novel2.playerSlowMul()).toBe(1)
  })

  function cling(ctx, x = 0, z = 1.2) {
    const m = spawnMochi(ctx.pool, x, z)
    expect(runUntil(ctx.step, { x: 0, z: 0 }, () => ctx.runtime.novel2.mochiPhase[m.index] === 3, 4)).toBe(true)
    return m
  }

  it('대응: 누적 4u를 움직이면 떨어진다 — 떨어진 떡은 1초 퍼져 있고, 플레이어는 1.5초 동안 새 매달림을 받지 않는다', () => {
    const ctx = setup()
    const m = cling(ctx)
    const player = { x: 0, z: 0 }
    let moved = 0
    let detachedAt = -1
    for (let f = 0; f < 2.5 / DT; f += 1) {
      player.x += PLAYER_SPEED * DT
      moved += PLAYER_SPEED * DT
      ctx.step(player)
      if (detachedAt < 0 && ctx.runtime.novel2.clingerCount() === 0) detachedAt = moved
    }
    expect(detachedAt).toBeGreaterThanOrEqual(E100_MOCHI.shakeOffDistance - 0.1)
    expect(detachedAt).toBeLessThanOrEqual(E100_MOCHI.shakeOffDistance + 0.2)
    expect(ctx.runtime.novel2.playerSlowMul()).toBe(1)
    // 면역 중에 다른 떡이 도약해도 매달리지 못한다(감속이 이어 붙지 않는다).
    const fresh = setup()
    const a = cling(fresh)
    fresh.runtime.applyHitIndex(fresh.pool, a.index, a.generation, 1e9) // 처치도 대응이다
    const b = spawnMochi(fresh.pool, 0, -1.2)
    let damage = 0
    let bClung = false
    for (let f = 0; f < (E100_MOCHI.playerImmuneMs - 100) / 1000 / DT; f += 1) {
      damage += fresh.step({ x: 0, z: 0 })
      if (fresh.runtime.novel2.mochiPhase[b.index] === 3) bClung = true
    }
    expect(fresh.runtime.novel2.playerSlowMul()).toBe(1)
    expect(bClung).toBe(false)
    expect(damage).toBe(0)
    expect(m).toBeTruthy()
  })

  it('가만히 있어도 4초면 떨어지고, 매달린 동안 추가 피해는 없다', () => {
    const ctx = setup()
    const m = cling(ctx)
    let damage = 0
    for (let f = 0; f < 3.8 / DT; f += 1) damage += ctx.step({ x: 0, z: 0 })
    expect(ctx.runtime.novel2.clingerCount()).toBe(1)
    expect(damage).toBe(0)
    for (let f = 0; f < 0.4 / DT; f += 1) ctx.step({ x: 0, z: 0 })
    expect(ctx.runtime.novel2.clingerCount()).toBe(0)
    expect(ctx.pool.state[m.index]).toBe(N2_STATE_STUN)
  })

  it('처치하면 즉시 풀린다(투사체를 막지 않는 보통 몸 — 맞으면 정상적으로 죽는다)', () => {
    const ctx = setup()
    const m = cling(ctx)
    ctx.runtime.applyHitIndex(ctx.pool, m.index, m.generation, 1e9)
    expect(ctx.pool.isIndexGenerationAlive(m.index, m.generation)).toBe(false)
    ctx.step({ x: 0, z: 0 })
    expect(ctx.runtime.novel2.playerSlowMul()).toBe(1)
  })

  it('동시에 매달리는 떡은 2기까지(이동 ×0.6) — 세 번째는 빗나가고, 감속은 0.6 아래로 내려가지 않는다', () => {
    const ctx = setup()
    for (const [x, z] of [[0, 1.2], [1.2, 0], [-1.2, 0]]) spawnMochi(ctx.pool, x, z)
    let maxClingers = 0
    let minMul = 1
    for (let f = 0; f < 3.5 / DT; f += 1) {
      ctx.step({ x: 0, z: 0 })
      maxClingers = Math.max(maxClingers, ctx.runtime.novel2.clingerCount())
      minMul = Math.min(minMul, ctx.runtime.novel2.playerSlowMul())
    }
    expect(maxClingers).toBe(E100_MOCHI.maxClingers)
    expect(minMul).toBe(E100_MOCHI.slowTwo)
  })

  it('마틸다 경고(205초) 뒤에는 매달리지 않고, 매달려 있던 떡은 떨어진다', () => {
    const ctx = setup()
    cling(ctx)
    const late = makeStep(ctx.runtime, ctx.pool, S4_BOUNDS, 'stage4', { elapsedSec: 206 })
    late({ x: 0, z: 0 })
    expect(ctx.runtime.novel2.clingerCount()).toBe(0)
    const fresh = setup({ elapsedSec: 206 })
    const m = spawnMochi(fresh.pool, 0, 1.2)
    let telegraphed = false
    for (let f = 0; f < 4 / DT; f += 1) {
      fresh.step({ x: 0, z: 0 })
      if (fresh.pool.state[m.index] === N2_STATE_TELEGRAPH) telegraphed = true
    }
    expect(telegraphed).toBe(false)
    expect(fresh.runtime.novel2.clingerCount()).toBe(0)
  })
})

describe('E102 회전의자(스5)', () => {
  function setup(obstacles = null) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const extra = obstacles ? { obstacles, obstacleCount: obstacles.length } : {}
    const step = makeStep(runtime, pool, S5_BOUNDS, 'stage5', extra)
    const chair = spawn(pool, 'E102', 0, 4, { hp: E102_HP, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E102.scale })
    return { pool, runtime, step, chair }
  }
  const chairLine = () => [...expansionAttackSnapshots.values()].find((s) => s.type === 'E102')

  it('0.9초 회전 예고(빨간 선 4.2 × 1.8u) 중 피해 0, 의자는 제자리, 선은 예고 시작 자리·방향 고정', () => {
    const { pool, step, chair } = setup()
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[chair.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const line = chairLine()
    expect(line.shape).toBe('line')
    expect(line.windupMs).toBeGreaterThanOrEqual(850)
    expect(line.rangeUnits).toBe(E102_CHAIR.lineLength)
    expect(line.widthUnits).toBe(E102_CHAIR.lineWidth)
    expect(isNovel2DamageTelegraph(line)).toBe(true)
    const origin = [...line.originXZ]
    const dir = [...line.directionXZ]
    const x0 = pool.posX[chair.index]
    const z0 = pool.posZ[chair.index]
    let damage = 0
    for (let f = 0; f < (E102_CHAIR.telegraphMs - 50) / 1000 / DT; f += 1) damage += step({ x: Math.sin(f * 0.2) * 0.4, z: 0 })
    expect(damage).toBe(0)
    expect(line.originXZ).toEqual(origin)
    expect(line.directionXZ).toEqual(dir)
    expect(pool.posX[chair.index]).toBeCloseTo(x0, 6)
    expect(pool.posZ[chair.index]).toBeCloseTo(z0, 6)
  })

  it('선 위에 가만히 선 플레이어는 활주에 맞고(접촉 10), 옆으로 비키면 피해 0', () => {
    for (const [dodge, expectHit] of [[false, true], [true, false]]) {
      clearExpansionAttacks()
      const { pool, step, chair } = setup()
      const player = { x: 0, z: 0 }
      expect(runUntil(step, player, () => pool.state[chair.index] === N2_STATE_TELEGRAPH)).toBe(true)
      let damage = 0
      for (let f = 0; f < (E102_CHAIR.telegraphMs + E102_CHAIR.glideMs + E102_CHAIR.driftMs) / 1000 / DT; f += 1) {
        if (dodge && player.x < 1.6) player.x += PLAYER_SPEED * DT
        damage += step(player)
      }
      if (expectHit) expect(damage).toBeGreaterThanOrEqual(NOVEL2_ZOMBIE_STATS.E102.damage)
      else expect(damage).toBe(0)
    }
  })

  it('활주(초당 25°까지 꺾음)·표류는 그려진 선 띠 밖으로 나가지 않는다 — 옆 ≤ 반폭 − 접촉, 앞 ≤ 길이 − 접촉, 최고 2.6u/s, 표류는 방향 고정', () => {
    const { pool, runtime, step, chair } = setup()
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => pool.state[chair.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const line = chairLine()
    const [ox, oz] = line.originXZ
    const [dx, dz] = line.directionXZ
    let maxLat = 0
    let maxAlong = -Infinity
    let minAlong = Infinity
    let maxSpeed = 0
    let driftDir = null
    let driftTurn = 0
    let px = pool.posX[chair.index]
    let pz = pool.posZ[chair.index]
    let sawGlide = false
    for (let f = 0; f < (E102_CHAIR.telegraphMs + E102_CHAIR.glideMs + E102_CHAIR.driftMs + 200) / 1000 / DT; f += 1) {
      player.x += PLAYER_SPEED * DT * 0.9 // 옆으로 계속 달려 의자가 꺾게 만든다
      step(player)
      const x = pool.posX[chair.index]
      const z = pool.posZ[chair.index]
      const visual = runtime.novel2.chairStateInto(pool, chair.index, {})
      if (visual.phase === 2 || visual.phase === 3) {
        sawGlide = true
        const along = (x - ox) * dx + (z - oz) * dz
        const lat = Math.abs((x - ox) * -dz + (z - oz) * dx)
        maxLat = Math.max(maxLat, lat)
        maxAlong = Math.max(maxAlong, along)
        minAlong = Math.min(minAlong, along)
        const v = Math.hypot(x - px, z - pz) / DT
        maxSpeed = Math.max(maxSpeed, v)
        if (visual.phase === 3 && v > 1e-3) {
          const dir = Math.atan2(x - px, z - pz)
          if (driftDir === null) driftDir = dir
          else driftTurn = Math.max(driftTurn, Math.abs(dir - driftDir))
        }
      }
      px = x
      pz = z
    }
    expect(sawGlide).toBe(true)
    expect(maxLat).toBeLessThanOrEqual(E102_CHAIR.lineWidth / 2 - E102_CONTACT + 1e-3)
    expect(maxLat).toBeGreaterThan(0.05) // 실제로 꺾었다(관성 활주)
    expect(maxAlong).toBeLessThanOrEqual(E102_CHAIR.lineLength - E102_CONTACT + 1e-3)
    expect(minAlong).toBeGreaterThanOrEqual(-0.01)
    expect(maxSpeed).toBeLessThanOrEqual(E102_CHAIR.maxSpeed + 0.05)
    expect(driftTurn).toBeLessThan(1e-3)
  })

  it('장애물에 막히면 그 자리에서 멈춘다 — 순간이동 없음, 장애물 안으로 들어가지 않음, 선은 지워진다', () => {
    const desk = Object.freeze({ id: 'desk', type: 'staffroomDeskIsland', x: 0, z: 2, halfX: 1.0, halfZ: 0.2, rotationY: 0, cosY: 1, sinY: 0 })
    const { pool, step, chair } = setup([desk])
    const player = { x: 0, z: 0 }
    let maxStep = 0
    let px = pool.posX[chair.index]
    let pz = pool.posZ[chair.index]
    let telegraphed = false
    for (let f = 0; f < 6 / DT; f += 1) {
      step(player)
      if (pool.state[chair.index] === N2_STATE_TELEGRAPH) telegraphed = true
      const x = pool.posX[chair.index]
      const z = pool.posZ[chair.index]
      maxStep = Math.max(maxStep, Math.hypot(x - px, z - pz))
      expect(Math.abs(x - desk.x) < desk.halfX && Math.abs(z - desk.z) < desk.halfZ).toBe(false)
      px = x
      pz = z
    }
    expect(telegraphed).toBe(true)
    expect(maxStep).toBeLessThanOrEqual(E102_CHAIR.maxSpeed * DT + 0.02)
  })
})

describe('E106 기마전(스6, 몸 4)', () => {
  function setup(positions = [[0, 6], [2, 7], [-2, 7], [0, 8]], spawnTimer = 0) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S6_BOUNDS, 'stage6')
    const bodies = positions.map(([x, z]) => spawn(pool, 'E106', x, z, { hp: 30, spawnTimer, scale: NOVEL2_ZOMBIE_STATS.E106.scale }))
    return { pool, runtime, step, bodies }
  }
  const state = (ctx, h) => ctx.runtime.novel2.cavalryStateInto(ctx.pool, h.index, {})

  it('첫 걸음에 편대: 가장 낮은 슬롯이 기수, 나머지 셋이 말(앞·왼뒤·오른뒤 자리로 바로 모임)', () => {
    const ctx = setup()
    ctx.step({ x: 0, z: 0 })
    const [rider, ...horses] = ctx.bodies
    expect(state(ctx, rider)).toMatchObject({ role: 1, slot: -1, mounted: true, scattered: false, rider: rider.index })
    expect(horses.map((h) => state(ctx, h).slot).sort()).toEqual([0, 1, 2])
    for (const h of horses) {
      expect(state(ctx, h)).toMatchObject({ role: 2, rider: rider.index, mounted: false })
      const d = Math.hypot(ctx.pool.posX[h.index] - ctx.pool.posX[rider.index], ctx.pool.posZ[h.index] - ctx.pool.posZ[rider.index])
      expect(d).toBeGreaterThan(0.7)
      expect(d).toBeLessThan(0.9)
    }
  })

  it('편대는 0.75u/s로 함께 온다(말은 자리에서 0.3u 안)', () => {
    const ctx = setup([[0, 10], [1, 11], [-1, 11], [0, 12]])
    const [rider, ...horses] = ctx.bodies
    const player = { x: 0, z: 0 }
    ctx.step(player)
    for (let f = 0; f < 1 / DT; f += 1) ctx.step(player)
    let maxRiderSpeed = 0
    let px = ctx.pool.posX[rider.index]
    let pz = ctx.pool.posZ[rider.index]
    for (let f = 0; f < 3 / DT; f += 1) {
      ctx.step(player)
      maxRiderSpeed = Math.max(maxRiderSpeed, Math.hypot(ctx.pool.posX[rider.index] - px, ctx.pool.posZ[rider.index] - pz) / DT)
      px = ctx.pool.posX[rider.index]
      pz = ctx.pool.posZ[rider.index]
    }
    expect(maxRiderSpeed).toBeLessThanOrEqual(E106_CAVALRY.formSpeed + 0.1)
    const heading = state(ctx, rider).heading
    for (const h of horses) {
      const [side, ahead] = E106_CAVALRY.slots[state(ctx, h).slot]
      const tx = ctx.pool.posX[rider.index] + Math.cos(heading) * side + Math.sin(heading) * ahead
      const tz = ctx.pool.posZ[rider.index] - Math.sin(heading) * side + Math.cos(heading) * ahead
      expect(Math.hypot(ctx.pool.posX[h.index] - tx, ctx.pool.posZ[h.index] - tz)).toBeLessThan(0.3)
    }
  })

  function toHatTelegraph(ctx, player) {
    const rider = ctx.bodies[0]
    return runUntil(ctx.step, player, () => ctx.pool.state[rider.index] === N2_STATE_TELEGRAPH, 12)
  }

  it('모자 뺏기: 2.0u에서 멈춰 0.9초 빨간 부채꼴(90°·r 2.2u) — 앞 말은 로사리와 0.5u 넘게 떨어진다, 예고 중 편대 정지·피해 0 → 가만히 있으면 10', () => {
    const ctx = setup([[0, 5], [1, 6], [-1, 6], [0, 7]])
    const player = { x: 0, z: 0 }
    expect(toHatTelegraph(ctx, player)).toBe(true)
    // 2026-11-17 브라우저 확인: 1.5u에서 멈추면 앞 말이 로사리 위에 겹쳤다. 앞 말(자리 0)과 로사리 몸 사이 빈틈 ≥ 0.5u.
    const front = ctx.bodies.find((h) => state(ctx, h).slot === 0)
    const frontGap = Math.hypot(ctx.pool.posX[front.index] - player.x, ctx.pool.posZ[front.index] - player.z)
      - NOVEL2_ZOMBIE_STATS.E106.contactDist * ENEMY_SIZE_MULTIPLIER - EXPANSION_PLAYER_RADIUS
    expect(frontGap).toBeGreaterThanOrEqual(0.5)
    expect(Math.hypot(ctx.pool.posX[ctx.bodies[0].index], ctx.pool.posZ[ctx.bodies[0].index])).toBeLessThanOrEqual(E106_CAVALRY.triggerDistance)
    expect(E106_CAVALRY.coneRadius).toBeGreaterThan(E106_CAVALRY.triggerDistance) // 멈춘 거리의 플레이어는 부채꼴 안
    const hat = snapshotOf('E106')
    expect(hat.shape).toBe('sector')
    expect(hat.angleDeg).toBe(E106_CAVALRY.coneAngleDeg)
    expect(hat.rangeUnits).toBe(E106_CAVALRY.coneRadius)
    expect(hat.windupMs).toBeGreaterThanOrEqual(850)
    expect(hat.damage).toBe(E106_CAVALRY.damage)
    expect(isNovel2DamageTelegraph(hat)).toBe(true)
    const before = ctx.bodies.map((h) => [ctx.pool.posX[h.index], ctx.pool.posZ[h.index]])
    let telegraphDamage = 0
    for (let f = 0; f < (E106_CAVALRY.telegraphMs - 50) / 1000 / DT; f += 1) telegraphDamage += ctx.step(player)
    expect(telegraphDamage).toBe(0)
    ctx.bodies.forEach((h, k) => {
      expect(Math.hypot(ctx.pool.posX[h.index] - before[k][0], ctx.pool.posZ[h.index] - before[k][1])).toBeLessThan(0.05)
    })
    let hit = 0
    for (let f = 0; f < 0.3 / DT; f += 1) hit += ctx.step(player)
    expect(hit).toBe(E106_CAVALRY.damage)
  })

  it('예고를 보고 옆으로 비키면 피해 0', () => {
    const ctx = setup([[0, 5], [1, 6], [-1, 6], [0, 7]])
    const player = { x: 0, z: 0 }
    expect(toHatTelegraph(ctx, player)).toBe(true)
    let damage = 0
    for (let f = 0; f < (E106_CAVALRY.telegraphMs + E106_CAVALRY.activeMs + 100) / 1000 / DT; f += 1) {
      player.x += PLAYER_SPEED * DT
      damage += ctx.step(player)
    }
    expect(damage).toBe(0)
  })

  it('기수를 먼저 잡으면 말 셋이 0.8초 휘청였다가 흩어져 0.6u/s로 추격한다', () => {
    const ctx = setup([[0, 10], [1, 11], [-1, 11], [0, 12]])
    const [rider, ...horses] = ctx.bodies
    const player = { x: 0, z: 0 }
    for (let f = 0; f < 1 / DT; f += 1) ctx.step(player)
    ctx.runtime.applyHitIndex(ctx.pool, rider.index, rider.generation, 1e9)
    ctx.step(player)
    for (const h of horses) {
      expect(ctx.pool.state[h.index]).toBe(N2_STATE_STUN)
      expect(state(ctx, h).scattered).toBe(true)
    }
    for (let f = 0; f < 1 / DT; f += 1) ctx.step(player)
    let maxSpeed = 0
    const prev = horses.map((h) => [ctx.pool.posX[h.index], ctx.pool.posZ[h.index]])
    for (let f = 0; f < 1 / DT; f += 1) {
      ctx.step(player)
      horses.forEach((h, k) => {
        maxSpeed = Math.max(maxSpeed, Math.hypot(ctx.pool.posX[h.index] - prev[k][0], ctx.pool.posZ[h.index] - prev[k][1]) / DT)
        prev[k] = [ctx.pool.posX[h.index], ctx.pool.posZ[h.index]]
      })
    }
    expect(maxSpeed).toBeGreaterThan(0.3)
    expect(maxSpeed).toBeLessThanOrEqual(E106_CAVALRY.horseSoloSpeed + 0.75) // 흩어진 몸끼리 밀어내기 몫(0.68) 여유
    for (const h of horses) expect(ctx.pool.state[h.index]).toBe(N2_STATE_APPROACH)
  })

  it('말 셋을 먼저 잡으면 기수가 1초 낙마했다가 1.2u/s로 질주한다(이때부터 몸 접촉 10)', () => {
    const ctx = setup([[0, 10], [1, 11], [-1, 11], [0, 12]])
    const [rider, ...horses] = ctx.bodies
    const player = { x: 0, z: 0 }
    for (let f = 0; f < 1 / DT; f += 1) ctx.step(player)
    expect(ctx.runtime.novel2.forcesNoContact(ctx.pool, rider.index)).toBe(true) // 말 위의 기수는 몸 접촉이 없다
    for (const h of horses) ctx.runtime.applyHitIndex(ctx.pool, h.index, h.generation, 1e9)
    ctx.step(player)
    expect(ctx.pool.state[rider.index]).toBe(N2_STATE_STUN)
    expect(state(ctx, rider)).toMatchObject({ role: 1, mounted: false, scattered: true })
    for (let f = 0; f < (E106_CAVALRY.dismountStunMs + 100) / 1000 / DT; f += 1) ctx.step(player)
    let px = ctx.pool.posX[rider.index]
    let pz = ctx.pool.posZ[rider.index]
    let maxSpeed = 0
    for (let f = 0; f < 1 / DT; f += 1) {
      ctx.step(player)
      maxSpeed = Math.max(maxSpeed, Math.hypot(ctx.pool.posX[rider.index] - px, ctx.pool.posZ[rider.index] - pz) / DT)
      px = ctx.pool.posX[rider.index]
      pz = ctx.pool.posZ[rider.index]
    }
    expect(maxSpeed).toBeCloseTo(E106_CAVALRY.riderSoloSpeed, 1)
    expect(ctx.runtime.novel2.forcesNoContact(ctx.pool, rider.index)).toBe(false)
    let damage = 0
    for (let f = 0; f < 12 / DT; f += 1) damage += ctx.step(player)
    expect(damage).toBeGreaterThanOrEqual(NOVEL2_ZOMBIE_STATS.E106.damage)
  })

  it('몸이 다 나오지 못하면(동시 150 상한) 1.5초 뒤 있는 몸끼리 편대를 짓는다', () => {
    const ctx = setup([[0, 10], [1, 11]])
    const [rider, horse] = ctx.bodies
    ctx.step({ x: 0, z: 0 })
    expect(state(ctx, rider).role).toBe(0)
    for (let f = 0; f < (E106_CAVALRY.linkGraceMs + 100) / 1000 / DT; f += 1) ctx.step({ x: 0, z: 0 })
    expect(state(ctx, rider)).toMatchObject({ role: 1, mounted: true })
    expect(state(ctx, horse)).toMatchObject({ role: 2, slot: 0, rider: rider.index })
  })
})

describe('E101 복사기 — 책상 옆에 붙어 선 플레이어(2026-11-17 브라우저 보고 "안전 판정이 계속 재시도돼")', () => {
  // 교무실 책상 섬(x −4.2·0, 반폭 1.0) 사이 통로(폭 2.2u)에서 책상 면에서 0.2u 떨어진 플레이어. 탈출 인증은 출발점에서 1.2u 중앙 통로
  // (반폭 0.792u)를 요구해 이 자리에서는 모든 후보가 막혔다 — 부채꼴이 영원히 인증 실패·재시도였다(2.5u 안 1,383자리 중 258자리).
  const obstacles = getStageObjectSightObstacles('stage5')
  const player = { x: -3.0, z: -8.0 }

  it('부채꼴 예고가 나오고, 통로를 따라 비키면 피해 0 · 가만히 있으면 12', () => {
    for (const [dodge, expected] of [[true, 0], [false, E101_COPIER.fanDamage]]) {
      clearExpansionAttacks()
      const pool = new EnemyEntityPool()
      const runtime = createEnemySimulationRuntime()
      const step = makeStep(runtime, pool, S5_BOUNDS, 'stage5', { obstacles, obstacleCount: obstacles.length })
      const copier = spawn(pool, 'E101', -2.1, -6.2, { hp: 1e9, spawnTimer: 3000 })
      const p = { ...player }
      expect(runUntil(step, p, () => pool.state[copier.index] === N2_STATE_TELEGRAPH && !!snapshotOf('E101') && snapshotOf('E101').patternId === 'e101_fan', 3)).toBe(true)
      const fan = snapshotOf('E101')
      expect(fan.escapeChannel.obstacleIngress).toBe(true)
      let damage = 0
      for (let f = 0; f < (E101_COPIER.fanTelegraphMs + E101_COPIER.fanActiveMs + 100) / 1000 / DT; f += 1) {
        if (dodge && p.z > -11.5) p.z -= PLAYER_SPEED * DT // 통로를 따라 아래로
        damage += step(p)
      }
      expect(damage, `dodge ${dodge}`).toBe(expected)
    }
  })

  it('진입 구간 허용은 2차 신규 좀비 옵션일 때만 — 확장 적·보스(옵션 없음) 판정은 그대로 이 자리를 거절한다', () => {
    const snapshot = {
      id: 'probe', patternId: 'probe', type: 'E101', key: 'probe', shape: 'sector', angleDeg: 60,
      originXZ: [-2.1, -6.2], directionXZ: [-0.447, -0.894], yaw: Math.atan2(-0.447, -0.894),
      rangeUnits: 2.4, widthUnits: 0, windupMs: 1000, activeMs: 150, recoveryMs: 0, damage: 12, phase: 'windup', elapsedMs: 0,
    }
    const context = () => ({ stageId: 'stage5', halfX: 9.36, halfZ: 16, obstacles: novel2NearSafetyObstacles(obstacles, -2.1, -6.2, player.x, player.z) })
    const ctxA = context()
    snapshot.safetyPolygons = buildExpansionSafetyGeometry(snapshot, ctxA)
    expect(snapshot.safetyPolygons.length).toBeGreaterThan(0)
    expect(certifyExpansionEscape(snapshot, { playerX: player.x, playerZ: player.z }, ctxA, [])).toBeNull()
    const ctxB = context()
    buildExpansionSafetyGeometry(snapshot, ctxB)
    const channel = certifyExpansionEscape(snapshot, { playerX: player.x, playerZ: player.z }, ctxB, [], { obstacleIngress: true })
    expect(channel).not.toBeNull()
    expect(channel.obstacleIngress).toBe(true)
    // 몸(0.9 × 0.192u)만 지나가는 구간도 장애물에 막히지 않는다(붙어 선 책상 면을 따라 빠져나간다).
    expect(isStageObjectSightBlocked({ x: player.x, z: player.z }, { x: channel.toXZ[0], z: channel.toXZ[1] }, obstacles, EXPANSION_PLAYER_RADIUS * 0.9)).toBe(false)
  })
})

// ── 2026-11-17 후속(비주얼 브라우저 확인) ───────────────────────────────────────
describe('E100 매달린 자리 = 로사리 몸 방향 기준 왼등·오른등(그린 몸 = 맞는 몸)', () => {
  it('첫 떡은 왼등, 둘째 떡은 오른등(등 뒤에서 0.6rad, 0.3u), 판정 몸이 그 자리에 있고, 로사리가 돌면 따라 돈다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const facing = { playerFacingX: 0, playerFacingZ: 1 }
    const step = (player) => {
      let damage = 0
      runtime.step(pool, { delta: DT, playerX: player.x, playerZ: player.z, ...S4_BOUNDS, elapsedSec: 80, activeProjectileCount: 0, stageId: 'stage4',
        ...facing, onContact: (_i, _g, _x, _y, _z, v) => { damage += v } })
      return damage
    }
    const a = spawn(pool, 'E100', 0, 1.2, { hp: E100_HP, spawnTimer: 3000 })
    const b = spawn(pool, 'E100', 1.2, 0, { hp: E100_HP, spawnTimer: 3000 })
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => runtime.novel2.clingerCount() === 2, 5)).toBe(true)
    for (let f = 0; f < 0.3 / DT; f += 1) step(player)
    const A = 0.6
    const R = E100_MOCHI.attachOffset
    const ms = (h) => runtime.novel2.mochiStateInto(pool, h.index, {})
    const first = runtime.novel2.clingers[0] === a.index ? a : b
    const second = first === a ? b : a
    // 몸 방향 +z → 왼쪽 = +x, 등 = −z.
    expect(ms(first).side).toBe(1)
    expect(ms(first).offsetX).toBeCloseTo(R * Math.sin(A), 3)
    expect(ms(first).offsetZ).toBeCloseTo(-R * Math.cos(A), 3)
    expect(ms(second).side).toBe(-1)
    expect(ms(second).offsetX).toBeCloseTo(-R * Math.sin(A), 3)
    expect(ms(second).offsetZ).toBeCloseTo(-R * Math.cos(A), 3)
    for (const h of [first, second]) {
      // 판정 몸(투사체가 맞는 자리) = 플레이어 + offset.
      expect(pool.posX[h.index]).toBeCloseTo(player.x + ms(h).offsetX, 2)
      expect(pool.posZ[h.index]).toBeCloseTo(player.z + ms(h).offsetZ, 2)
      // 로사리 앞(몸 방향 쪽)에는 절대 없다.
      expect(ms(h).offsetZ).toBeLessThan(0)
    }
    // 로사리가 +x를 보면(왼쪽 = −z, 등 = −x) 0.3초 안에 따라 돈다.
    facing.playerFacingX = 1; facing.playerFacingZ = 0
    for (let f = 0; f < 0.3 / DT; f += 1) step(player)
    expect(ms(first).offsetX).toBeCloseTo(-R * Math.cos(A), 3)
    expect(ms(first).offsetZ).toBeCloseTo(-R * Math.sin(A), 3)
    expect(ms(second).offsetX).toBeCloseTo(-R * Math.cos(A), 3)
    expect(ms(second).offsetZ).toBeCloseTo(R * Math.sin(A), 3)
    expect(pool.posX[first.index]).toBeCloseTo(player.x + ms(first).offsetX, 2)
    expect(pool.posZ[first.index]).toBeCloseTo(player.z + ms(first).offsetZ, 2)
  })

  it('방향을 넘겨주지 않으면(프로브·테스트) 플레이어 이동 방향을 몸 방향으로 쓴다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4_BOUNDS, 'stage4')
    const m = spawn(pool, 'E100', 0, 1.2, { hp: E100_HP, spawnTimer: 3000 })
    const player = { x: 0, z: 0 }
    expect(runUntil(step, player, () => runtime.novel2.mochiPhase[m.index] === 3, 4)).toBe(true)
    for (let f = 0; f < 0.4 / DT; f += 1) { player.x -= 1.5 * DT; step(player) } // −x로 걷는다(4u 전에 멈춘다)
    const st = runtime.novel2.mochiStateInto(pool, m.index, {})
    expect(st.clinging).toBe(true)
    expect(st.offsetX).toBeGreaterThan(0) // 등 = +x 쪽
  })
})

describe('선을 못 세우면 평범한 접촉 추격(3차 둘째 묶음 — 연속 4번 실패 뒤 1초 간격 재시도)', () => {
  // 맵 반폭 0.7u 복도: 안전 기하(반폭 ≥ 0.792u)가 서지 않아 인증이 늘 실패한다 — "선이 들어갈 자리가 없는 곳"의 가장 단순한 모형.
  const NARROW = { halfX: 0.7, halfZ: 16 }
  it.each([
    ['E102', 'stage5', 2, NOVEL2_ZOMBIE_STATS.E102.damage],
    ['E100', 'stage4', 1.2, NOVEL2_ZOMBIE_STATS.E100.damage],
  ])('%s: 0.25초 간격 재시도는 4번까지, 그 뒤로는 1초에 한 번만 묻고 다가와 몸 접촉으로 때린다', (id, stageId, z, contact) => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, NARROW, stageId)
    const h = spawn(pool, id, 0, z, { hp: 1e9, spawnTimer: 3000 })
    let damage = 0
    let telegraphed = false
    let blockedAt = -1
    let ms = 0
    for (let f = 0; f < 3.5 / DT; f += 1) {
      damage += step({ x: 0, z: 0 })
      ms += DT * 1000
      if (pool.state[h.index] === N2_STATE_TELEGRAPH) telegraphed = true
      if (blockedAt < 0 && runtime.novel2.laneBlocked(pool, h.index)) blockedAt = ms
    }
    expect(telegraphed).toBe(false)
    expect(blockedAt).toBeGreaterThan(0)
    expect(blockedAt).toBeLessThanOrEqual(1100 + 50)
    expect(runtime.novel2.laneBlocked(pool, h.index)).toBe(true)
    expect(damage).toBeGreaterThanOrEqual(contact)
    const visual = id === 'E102' ? runtime.novel2.chairStateInto(pool, h.index, {}) : runtime.novel2.mochiStateInto(pool, h.index, {})
    expect(visual.laneBlocked).toBe(true)
    expect(visual.phase).toBe(0)
    // 그 뒤로도 1초에 한 번 다시 묻는다(실패 횟수가 계속 는다) — 선이 들어갈 자리가 생기면 그때 예고한다.
    const fails = runtime.novel2.laneFails[h.index]
    for (let f = 0; f < (NOVEL2_LANE_RETRY.slowRetryMs * 2 + 100) / 1000 / DT; f += 1) step({ x: 0, z: 0 })
    expect(runtime.novel2.laneFails[h.index] - fails).toBeGreaterThanOrEqual(1)
    expect(runtime.novel2.laneFails[h.index] - fails).toBeLessThanOrEqual(3)
  })

  it('선이 서는 자리로 오면 바로 예고하고 상태가 풀린다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const narrow = makeStep(runtime, pool, NARROW, 'stage5')
    const open = makeStep(runtime, pool, S5_BOUNDS, 'stage5')
    const h = spawn(pool, 'E102', 0, 3, { hp: 1e9, spawnTimer: 3000 })
    expect(runUntil(narrow, { x: 0, z: 0 }, () => runtime.novel2.laneBlocked(pool, h.index), 2)).toBe(true)
    expect(runUntil(open, { x: 0, z: 0 }, () => pool.state[h.index] === N2_STATE_TELEGRAPH, 2)).toBe(true)
    expect(runtime.novel2.laneBlocked(pool, h.index)).toBe(false)
  })

  it('E106: 기수가 선을 못 세우면 편대는 멈추지 않고 다가와 말 접촉으로 때린다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, { halfX: 0.7, halfZ: 20 }, 'stage6')
    const bodies = [[0, 4], [0.2, 4.6], [-0.2, 4.6], [0, 5.2]].map(([x, zz]) => spawn(pool, 'E106', x, zz, { hp: 1e9, spawnTimer: 0 }))
    let damage = 0
    let telegraphed = false
    for (let f = 0; f < 8 / DT; f += 1) {
      damage += step({ x: 0, z: 0 })
      if (pool.state[bodies[0].index] === N2_STATE_TELEGRAPH) telegraphed = true
    }
    expect(telegraphed).toBe(false)
    expect(runtime.novel2.cavalryStateInto(pool, bodies[1].index, {}).laneBlocked || runtime.novel2.laneFails[bodies[0].index] > 0).toBe(true)
    expect(damage).toBeGreaterThanOrEqual(NOVEL2_ZOMBIE_STATS.E106.damage)
  })
})

describe('E102 회전의자 — 로사리가 교무실 책상 면에 붙어 선 자리(2026-11-17 브라우저 보고: 0.25u 옆에서 0.25초마다 재시도)', () => {
  // 원인: 탈출 인증의 "몸만 지나가는 진입 구간" 패딩이 0.9 × 0.192 = 0.173u였는데, 로사리 충돌 상자 반폭은 0.136u라 책상 면에서
  // 0.136~0.173u 떨어져 선 출발점이 패딩 상자 안에 들어가 모든 후보가 막혔다. 교무실 실측(책상에서 0.14u까지 붙은 자리 × 의자 2u 8방향,
  // 27,015경우): 사거리 안인데 8초 동안 예고 0번 155 → 41(남은 39는 책상 모서리에 걸려 다가오지 못한 의자 — 공통 이동 경로, 2는 접촉 추격).
  const obstacles = getStageObjectSightObstacles('stage5')
  it('몸 패딩은 로사리 실제 충돌 상자 반폭(0.136u)보다 작다', () => {
    expect(OBSTACLE_INGRESS_BODY_PAD).toBeLessThan(0.136)
  })

  it('책상 면에서 0.15u 떨어져 선 로사리에게 의자가 8초 안에 회전 예고를 낸다(전에는 0.23u 옆에서 영원히 재시도)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S5_BOUNDS, 'stage5', { obstacles, obstacleCount: obstacles.length })
    const chair = spawn(pool, 'E102', -4.75 + Math.SQRT2, -6.25 + Math.SQRT2, { hp: 1e9, spawnTimer: 3000 })
    const player = { x: -4.75, z: -6.25 } // 책상 섬(−4.2, −8.1, 반폭 1.0 × 1.7) 윗면 z −6.4에서 0.15u
    expect(runUntil(step, player, () => pool.state[chair.index] === N2_STATE_TELEGRAPH && !!snapshotOf('E102'), 8)).toBe(true)
    expect(snapshotOf('E102').escapeChannel).toBeTruthy()
    expect(runtime.novel2.laneBlocked(pool, chair.index)).toBe(false)
  })
})
