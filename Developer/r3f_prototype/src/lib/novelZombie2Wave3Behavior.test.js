import { beforeEach, describe, expect, it } from 'vitest'
import { EnemyEntityPool, ENEMY_TYPE_CODES, MAX_ENEMIES } from './enemyEntityPool.js'
import { ENEMY_RUNTIME_HP, ENEMY_RUNTIME_XP, ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime } from './enemySimulation.js'
import { clearExpansionAttacks, expansionAttackSnapshots } from './expansionAttackRuntime.js'
import { EXPANSION_PLAYER_RADIUS } from './expansionAttackSafety.js'
import {
  E101_COPIER,
  E104_BALL,
  E98_EATER,
  N2_STATE_APPROACH,
  N2_STATE_STUN,
  N2_STATE_TELEGRAPH,
  isBallTargetTypeCode,
} from './novelZombie2Behavior.js'
import { NOVEL2_ROWS, NOVEL2_WAVE3_IDS, NOVEL2_ZOMBIE_STATS, isNovel2AbsoluteHp } from './novelZombie2Content.js'
import { isSupportImmune } from './projectileZombieBehavior.js'
import { CHIEF_ELITE_BONUS, admitChiefSpawn, createChiefDebutLedger, findLiveChiefInto, isChiefType } from './stageChiefContent.js'
import { getStageRotationRoster } from './stageRosterRotation.js'
import { STAGE4_BURST_EVENTS, STAGE5_BURST_EVENTS, getBurstEventsForStage, isBossType } from './burstEvents.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
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
    const ctx = setup(0, 8, { obstacles, obstacleCount: obstacles.length })
    ctx.step({ x: 0, z: 30 }) // 머리말에 맵 크기·장애물을 넣는다(멀어서 굴리지 않는다)
    const free = ctx.runtime.novel2._ballLaneLength(4, 8, 0, -1) // 골대 옆(x 4) — 막히지 않는다
    const blocked = ctx.runtime.novel2._ballLaneLength(0, 8, 0, -1) // 북쪽 골대(z −11) 정면
    expect(free).toBeCloseTo(E104_BALL.maxLength, 5)
    expect(blocked).toBeLessThan(8 + 11)
    expect(blocked).toBeGreaterThan(8 + 11 - 2)
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
