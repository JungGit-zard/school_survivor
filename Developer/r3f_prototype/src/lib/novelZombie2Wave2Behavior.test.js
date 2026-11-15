import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EnemyEntityPool, ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import { ENEMY_RUNTIME_HP, ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime, enemyContactDistance } from './enemySimulation.js'
import { clearExpansionAttacks, expansionAttackSnapshots } from './expansionAttackRuntime.js'
import { EXPANSION_SAFETY_LIMITS, buildExpansionSafetyGeometry, novel2NearSafetyObstacles } from './expansionAttackSafety.js'
import {
  E90_THIEF,
  E91_MIMIC,
  E92_HEAD_CONTACT,
  E92_TRAIN,
  E95_ROPE,
  N2_STATE_ATTACK,
  N2_STATE_AWAKE,
  N2_STATE_RECOVER,
  N2_STATE_STUN,
  N2_STATE_TELEGRAPH,
} from './novelZombie2Behavior.js'
import { NOVEL2_DROP_BONUS, NOVEL2_ZOMBIE_STATS } from './novelZombie2Content.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS, applyProjectileZombieHeal, applyProjectileZombieShield, hasDamagedAllyNear, hasUnshieldedAllyNear } from './projectileZombieBehavior.js'
import { CHIEF_ELITE_BONUS, admitChiefSpawn, chiefBodyCount, createChiefDebutLedger, findLiveChiefInto } from './stageChiefContent.js'
import { getStageRotationRoster } from './stageRosterRotation.js'
import { BURST_EVENTS, STAGE2_BURST_EVENTS, STAGE3_BURST_EVENTS } from './burstEvents.js'
import { clearTextbookTheftSource, setTextbookTheftSource } from './textbookTheftBridge.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'

// 2차 신규 좀비 2차분(wave 2, 2026-11-15): E90 숙제 걷기 당번 · E91 교과서 미믹 · E92 기관사(치프) · E95 줄넘기 듀오(치프).
// 못박는 것: 예고 중 피해 0, 예고 때 확정한 방향·자리 고정, 옆으로 비키면 피해 0, 공격이 예고선 밖으로 나가지 않음,
// 정지한 플레이어는 공격형에게 60초 안에 맞음, 버프·지휘 대상 제외, 동시 150 상한, Stage 3 장애물 39개 대응.

const DT = 1 / 60
const BOUNDS = { halfX: 7.5, halfZ: 19.2 }
const PLAYER_SPEED = 3
const E92_STAGE2_HP = Math.round(NOVEL2_ZOMBIE_STATS.E92.hp * 1.2)

beforeEach(() => { clearExpansionAttacks() })
afterEach(() => { clearTextbookTheftSource() })

function spawn(pool, id, x, z, { hp, spawnTimer = ENEMY_SPAWN_REVEAL_MS + 1, scale } = {}) {
  const code = ENEMY_TYPE_CODES[id]
  const life = hp ?? (ENEMY_RUNTIME_HP[code] || 10)
  const handle = pool.spawn({ type: id, x, y: 0, z, hp: life, maxHp: life, visualScale: (scale ?? 1) * ENEMY_SIZE_MULTIPLIER, spawnTimer })
  expect(handle, `${id} spawn`).not.toBeNull()
  return handle
}

function makeStep(runtime, pool, extraContext = {}) {
  return (player, stageId = 'stage1') => {
    let damage = 0
    runtime.step(pool, {
      delta: DT, playerX: player.x, playerZ: player.z, ...BOUNDS, elapsedSec: 30, activeProjectileCount: 0, stageId,
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

describe('wave 2 등록·배치', () => {
  it('일반 2종은 host와 같은 HP, 치프는 base × 배수(E92 머리 base 100 = 스2 실효 120, E95 몸 2개 × 실효 40)', () => {
    expect(NOVEL2_ZOMBIE_STATS.E90.hp).toBe(16) // E07
    expect(NOVEL2_ZOMBIE_STATS.E91.hp).toBe(8) // E01
    expect(NOVEL2_ZOMBIE_STATS.E90.damage).toBe(0) // 공격 없음
    // 2026-11-15 balanceqa wave 2 권고 실효값.
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E92.hp * 1.2)).toBe(120)
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E95.hp * 1.44)).toBe(40) // 몸 하나(스3), 두 몸 합 80
    expect(chiefBodyCount('E95')).toBe(2)
    expect(chiefBodyCount('E92')).toBe(1)
  })

  it('스1 150초 E07 → E90, 184초 혼합 E01 → E91, 스2 144초 E92, 스3 110초 E95×2', () => {
    expect(BURST_EVENTS).toContainEqual({ sec: 150, type: 'E90', count: 1 })
    expect(BURST_EVENTS).toContainEqual({ sec: 184, type: 'E91', count: 1 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 144, type: 'E92', count: 1 })
    expect(STAGE3_BURST_EVENTS).toContainEqual({ sec: 110, type: 'E95', count: 2 })
  })

  it('E90·E91은 스1 로스터 순환에 들어가고 치프(E92·E95)는 들어가지 않는다', () => {
    expect(getStageRotationRoster('stage1')).toEqual(expect.arrayContaining(['E90', 'E91']))
    expect(getStageRotationRoster('stage2')).not.toContain('E92')
    expect(getStageRotationRoster('stage3')).not.toContain('E95')
  })

  it('보상: E91 진짜 교과서 2권, E95는 몸마다 교과서 1 × 45XP + 골드 1(두 몸 = 치프 보상 2 + 2)', () => {
    expect(NOVEL2_DROP_BONUS.E91).toEqual({ textbook: 2 })
    expect(CHIEF_ELITE_BONUS.E92).toEqual({ textbook: 2, textbookXp: 45, gold: 2 })
    expect(CHIEF_ELITE_BONUS.E95).toEqual({ textbook: 1, textbookXp: 45, gold: 1 })
  })

  it('데뷔 장부: E95는 몸 2개까지, E92는 1개만', () => {
    const ledger = createChiefDebutLedger()
    expect(admitChiefSpawn(ledger, 'E95')).toBe(true)
    expect(admitChiefSpawn(ledger, 'E95')).toBe(true)
    expect(admitChiefSpawn(ledger, 'E95')).toBe(false)
    expect(admitChiefSpawn(ledger, 'E92')).toBe(true)
    expect(admitChiefSpawn(ledger, 'E92')).toBe(false)
  })
})

describe('E90 숙제 걷기 당번(도둑)', () => {
  function book(x, z, value = 4) { return { id: Math.random(), p: { x, z }, landed: true, collected: false, value } }

  it('자석 범위 + 1u 밖의 책을 주워 가방에 담고(가방 +8%), 플레이어 가까운 책은 건드리지 않는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const far = book(4, 5, 4)
    const near = book(0.8, 0.4, 4) // 플레이어(0,0) 자석 1.2 + 1 = 2.2 안
    const books = [far, near]
    setTextbookTheftSource(books)
    const thief = spawn(pool, 'E90', 4.5, 7)
    let damage = 0
    for (let f = 0; f < 6 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(far.stolen).toBe(true)
    expect(near.stolen).toBeUndefined()
    expect(runtime.novel2.bagBooks[thief.index]).toBe(1)
    expect(runtime.novel2.bagScale(pool, thief.index)).toBeCloseTo(1 + E90_THIEF.bagScalePerBook, 6)
    expect(damage).toBe(0)
  })

  it('3u 안이면 지그재그로 도망치지만 플레이어(3u/s)보다 느리다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const thief = spawn(pool, 'E90', 0, 2)
    let maxSpeed = 0
    let prevX = pool.posX[thief.index]
    let prevZ = pool.posZ[thief.index]
    for (let f = 0; f < 1.5 / DT; f += 1) {
      step({ x: 0, z: 0 })
      maxSpeed = Math.max(maxSpeed, Math.hypot(pool.posX[thief.index] - prevX, pool.posZ[thief.index] - prevZ) / DT)
      prevX = pool.posX[thief.index]; prevZ = pool.posZ[thief.index]
    }
    expect(pool.state[thief.index]).toBe(N2_STATE_ATTACK)
    expect(pool.posZ[thief.index]).toBeGreaterThan(2.5) // 멀어졌다
    expect(maxSpeed).toBeLessThan(PLAYER_SPEED)
    expect(maxSpeed).toBeLessThanOrEqual(E90_THIEF.fleeSpeed + 0.9) // 이웃 밀어내기 여유 포함
  })

  it('가만히 붙어 있어도 피해 0(공격하지 않는다)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    spawn(pool, 'E90', 0.2, 0, { hp: 1e9 })
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(damage).toBe(0)
  })

  it('처치하면 주운 책 전부 + 보너스 1권(8XP)을 그 자리에 떨어뜨린다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const books = [book(5, 6, 4), book(5.3, 6.2, 12)]
    setTextbookTheftSource(books)
    const thief = spawn(pool, 'E90', 5, 6.5)
    for (let f = 0; f < 4 / DT; f += 1) step({ x: -5, z: -10 })
    expect(runtime.novel2.bagBooks[thief.index]).toBe(2)
    const x = pool.posX[thief.index]
    const z = pool.posZ[thief.index]
    runtime.applyHitIndex(pool, thief.index, thief.generation, 999)
    const drops = []
    runtime.novel2.drainThiefLoot((dx, dz, value) => drops.push({ dx, dz, value }))
    expect(drops.map((d) => d.value).sort((a, b) => a - b)).toEqual([4, 8, 12])
    for (const d of drops) { expect(d.dx).toBeCloseTo(x, 4); expect(d.dz).toBeCloseTo(z, 4) }
    runtime.novel2.drainThiefLoot(() => { throw new Error('비워져야 한다') })
  })
})

describe('E91 교과서 미믹', () => {
  it('잠든 동안: 피해 0, 움직이지 않고, 자동조준 대상이 아니다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const mimic = spawn(pool, 'E91', 2, 0)
    let damage = 0
    for (let f = 0; f < 10 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(damage).toBe(0)
    expect(pool.posX[mimic.index]).toBeCloseTo(2, 5)
    expect(runtime.novel2.isUntargetable(pool, mimic.index)).toBe(true)
  })

  it('1.4u 안: 0.85초 예고(피해 0, 물기 자리 = 그 순간 플레이어 위치로 고정) → 가만히 있으면 물기 6', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const mimic = spawn(pool, 'E91', 1.2, 0, { spawnTimer: 2000 })
    let telegraphDamage = 0
    let frame = 0
    for (; frame < 2 / DT && pool.state[mimic.index] !== N2_STATE_TELEGRAPH; frame += 1) step({ x: 0, z: 0 })
    expect(pool.state[mimic.index]).toBe(N2_STATE_TELEGRAPH)
    expect(runtime.novel2.isUntargetable(pool, mimic.index)).toBe(false)
    const bite = [...expansionAttackSnapshots.values()].find((s) => s.type === 'E91')
    expect(bite.originXZ).toEqual([0, 0])
    expect(bite.rangeUnits).toBe(E91_MIMIC.biteRadius)
    let biteDamage = 0
    for (let f = 0; f < (E91_MIMIC.telegraphMs - 50) / 1000 / DT; f += 1) telegraphDamage += step({ x: 0, z: 0 })
    expect(telegraphDamage).toBe(0)
    for (let f = 0; f < 0.4 / DT; f += 1) biteDamage += step({ x: 0, z: 0 })
    expect(biteDamage).toBeGreaterThanOrEqual(E91_MIMIC.biteDamage)
    expect(pool.state[mimic.index]).toBe(N2_STATE_AWAKE)
  })

  it('예고를 보고 옆으로 비키면 물기 피해 0(물기 자리는 따라오지 않는다)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const mimic = spawn(pool, 'E91', 1.2, 0, { spawnTimer: 2000 })
    const player = { x: 0, z: 0 }
    for (let f = 0; f < 2 / DT && pool.state[mimic.index] !== N2_STATE_TELEGRAPH; f += 1) step(player)
    expect(pool.state[mimic.index]).toBe(N2_STATE_TELEGRAPH)
    let damage = 0
    // 물기가 끝날 때까지(예고 0.85 + 물기 0.15초) 옆(−z)으로 걷는다. 몸 접촉은 그 뒤에야 다시 켜진다.
    for (let f = 0; f < (E91_MIMIC.telegraphMs + E91_MIMIC.biteMs + 50) / 1000 / DT; f += 1) {
      player.z -= PLAYER_SPEED * DT
      damage += step(player)
    }
    expect(damage).toBe(0)
  })

  it('광역 무기에 맞으면 물기 없이 깨어나 깡충 추격하고, 가만히 선 플레이어는 60초 안에 맞는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const mimic = spawn(pool, 'E91', 4, 0, { hp: 1e9 })
    step({ x: 0, z: 0 })
    runtime.applyHitIndex(pool, mimic.index, mimic.generation, 1)
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 })
    expect(runtime.novel2.isDormant(mimic.index)).toBe(false)
    expect(damage).toBeGreaterThan(0)
  })

  it('잠든 미믹은 4기까지 — 넘치면 가장 오래 잔 미믹부터 깨어난다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const handles = [0, 1, 2, 3, 4, 5].map((k) => spawn(pool, 'E91', -6 + k * 2, 12))
    step({ x: 0, z: -12 })
    const dormant = handles.filter((h) => runtime.novel2.isDormant(h.index))
    expect(dormant).toHaveLength(E91_MIMIC.maxDormant)
  })

  // 2026-11-15 balanceqa: 예고 0.6초에서는 서 있던 플레이어가 0.2초에 반응해도 물렸다. 원(r 1.0u, 시각 예고와 같음)은 그대로 두고 예고를 늘렸다.
  it('물기 원은 r 1.0u 그대로, 서 있던 플레이어가 0.35초(+0.05초 여유) 뒤 3u/s로 어느 쪽으로 달아나도 물리지 않는다', () => {
    expect(E91_MIMIC.biteRadius).toBe(1.0)
    for (const reactMs of [350, 400]) {
      for (const dir of [[-1, 0], [0, 1], [0, -1], [1, 0]]) {
        clearExpansionAttacks()
        const pool = new EnemyEntityPool()
        const runtime = createEnemySimulationRuntime()
        const step = makeStep(runtime, pool)
        const mimic = spawn(pool, 'E91', 1.2, 0, { spawnTimer: 2000 })
        const player = { x: 0, z: 0 }
        for (let f = 0; f < 2 / DT && pool.state[mimic.index] !== N2_STATE_TELEGRAPH; f += 1) step(player)
        expect(pool.state[mimic.index]).toBe(N2_STATE_TELEGRAPH)
        let damage = 0
        let t = 0
        for (let f = 0; f < (E91_MIMIC.telegraphMs + E91_MIMIC.biteMs + 50) / 1000 / DT; f += 1) {
          if (t >= reactMs / 1000) { player.x += dir[0] * PLAYER_SPEED * DT; player.z += dir[1] * PLAYER_SPEED * DT }
          damage += step(player)
          t += DT
        }
        expect(damage, `react ${reactMs}ms dir ${dir}`).toBe(0)
      }
    }
  })

  // 2026-11-15 balanceqa: 잠든 미믹이 무리에 밀려 다녔다(중앙값 0.1u, 최대 3.2u) — 놓인 자리에서 1.4u 넘게 떨어진 플레이어가 물렸다.
  it('잠든 미믹은 놓인 자리에 그대로 있다(무리가 밀고 지나가도, 넉백 공격을 맞아도 그 프레임에 밀리지 않는다)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const mimic = spawn(pool, 'E91', 0, 3)
    const x0 = pool.posX[mimic.index]
    const z0 = pool.posZ[mimic.index]
    // 미믹 바로 뒤에서 E01 무리가 미믹을 지나 플레이어 쪽(−z)으로 몰려온다.
    for (let k = 0; k < 10; k += 1) spawn(pool, 'E01', (k - 5) * 0.15, 4 + k * 0.1, { hp: 1e6 })
    for (let f = 0; f < 6 / DT; f += 1) {
      step({ x: 0, z: -2 })
      expect(runtime.novel2.isDormant(mimic.index)).toBe(true)
      expect(pool.posX[mimic.index]).toBe(x0)
      expect(pool.posZ[mimic.index]).toBe(z0)
    }
    // 광역 무기 + 넉백(6u/s × 0.3초 = 1.8u): 피해 0이라도 맞으면 그 걸음에 깨어나고(깬 뒤로는 무리 밀어내기를 받는다),
    // 잠든 채로 넉백에 날아가지 않는다.
    runtime.applyHitIndex(pool, mimic.index, mimic.generation, 0, 6, 0, 300)
    let drift = 0
    for (let f = 0; f < 0.3 / DT; f += 1) {
      step({ x: 0, z: -2 })
      drift = Math.max(drift, Math.abs(pool.posX[mimic.index] - x0))
    }
    expect(runtime.novel2.isDormant(mimic.index)).toBe(false)
    expect(drift).toBeLessThan(0.5)
  })
})

describe('E92 기관사(치프) — 객차 E01(E92_TRAIN.carCount기)', () => {
  function setup(headX = 0, headZ = 8) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const head = spawn(pool, 'E92', headX, headZ, { hp: E92_STAGE2_HP, scale: NOVEL2_ZOMBIE_STATS.E92.scale })
    return { pool, runtime, step, head }
  }

  it('머리가 첫 걸음에 객차 E01을 carCount기 세운다(HP = 8 × 스테이지 배수, 기차 정체성 최소 3기), 객차는 지휘·커피 대상이 아니다', () => {
    const { pool, runtime, step, head } = setup()
    step({ x: 0, z: 0 }, 'stage2')
    const cars = activeOfType(pool, 'E01')
    expect(E92_TRAIN.carCount).toBeGreaterThanOrEqual(3)
    expect(cars).toHaveLength(E92_TRAIN.carCount)
    for (const car of cars) {
      expect(pool.maxHp[car]).toBe(10) // = E01 스2 실효(8 × 머리 실효/base 1.2) // = E01 스2 실효(8 × 머리 실효/base)
      expect(runtime.novel2.isTrainCar(pool, car)).toBe(true)
      expect(runtime.novel2.carHead[car]).toBe(head.index)
    }
    expect(runtime.novel2.pickCoffeeTarget(pool, head.index)).toBe(-1)
    expect(runtime.novel2._countCommandable(pool, head.index, pool.posX[head.index], pool.posZ[head.index])).toBe(0)
  })

  it('동시 150 상한(보스·마틸다 몫 2칸 남김) 안에서만 객차를 세운다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    for (let k = 0; k < 145; k += 1) spawn(pool, 'E03', -7 + (k % 15), -19 + Math.floor(k / 15) * 0.9)
    spawn(pool, 'E92', 0, 12, { hp: E92_STAGE2_HP })
    step({ x: 0, z: 0 }, 'stage2')
    expect(pool.activeCount).toBeLessThanOrEqual(148)
    expect(activeOfType(pool, 'E01').length).toBe(2)
  })

  it('객차는 머리 경로를 0.7u 간격으로 따라간다(객차 사이 거리 ≤ 1.2u)', () => {
    const { pool, step } = setup(0, 10)
    const player = { x: 0, z: -10 }
    for (let f = 0; f < 4 / DT; f += 1) step(player, 'stage2')
    const cars = activeOfType(pool, 'E01')
    expect(cars).toHaveLength(E92_TRAIN.carCount)
    const head = activeOfType(pool, 'E92')[0]
    // 머리에서 가까운 순서대로 이웃 거리.
    const order = [...cars].sort((a, b) => Math.hypot(pool.posX[a] - pool.posX[head], pool.posZ[a] - pool.posZ[head]) - Math.hypot(pool.posX[b] - pool.posX[head], pool.posZ[b] - pool.posZ[head]))
    let prev = head
    for (const car of order) {
      expect(Math.hypot(pool.posX[car] - pool.posX[prev], pool.posZ[car] - pool.posZ[prev])).toBeLessThanOrEqual(1.2)
      prev = car
    }
  })

  it('머리는 초당 70°까지만 돈다', () => {
    const { pool, runtime, step, head } = setup(0, 0)
    step({ x: 0, z: 10 }, 'stage2')
    runtime.novel2.headHeading[head.index] = 0 // +z로 진행 중
    pool.attackCooldown[head.index] = 1e9 // 돌진 없이 걸음만
    const before = runtime.novel2.headHeading[head.index]
    for (let f = 0; f < 30; f += 1) step({ x: 0, z: -10 }, 'stage2') // 정반대(180°)로 돌려 한다
    const turned = Math.abs(runtime.novel2.headHeading[head.index] - before)
    expect(turned).toBeLessThanOrEqual(E92_TRAIN.turnRateRad * 30 * DT + 1e-6)
    expect(turned).toBeGreaterThan(0)
  })

  function runToTelegraph(ctx, player) {
    for (let f = 0; f < 6 / DT; f += 1) {
      ctx.step(player, 'stage2')
      if (ctx.pool.state[ctx.head.index] === N2_STATE_TELEGRAPH) return true
    }
    return false
  }

  it('예고 0.9초 동안 피해 0·방향 고정, 돌진은 예고선 밖으로 나가지 않는다(길이·폭)', () => {
    const ctx = setup(0, 4.5)
    const player = { x: 0, z: 0 }
    pool_noCars(ctx)
    expect(runToTelegraph(ctx, player)).toBe(true)
    const { pool, head, step } = ctx
    const line = expansionAttackSnapshots.get(`novel2:e92:${head.index}:${head.generation}`)
    expect(line.shape).toBe('line')
    expect(line.widthUnits / 2).toBeGreaterThanOrEqual(E92_HEAD_CONTACT + E92_TRAIN.lateralTolerance - 1e-9)
    const ox = line.originXZ[0]; const oz = line.originXZ[1]
    const [dx, dz] = line.directionXZ
    let telegraphDamage = 0
    while (pool.state[head.index] === N2_STATE_TELEGRAPH) {
      player.x += PLAYER_SPEED * DT * 0.2 // 플레이어가 움직여도 방향은 따라가지 않는다
      telegraphDamage += step(player, 'stage2')
    }
    expect(telegraphDamage).toBe(0)
    expect([pool.runDirX[head.index], pool.runDirZ[head.index]]).toEqual([dx, dz].map(Math.fround))
    let maxAlong = 0
    let maxLateral = 0
    for (let f = 0; f < 2 / DT; f += 1) {
      step({ x: 6, z: -6 }, 'stage2') // 옆으로 비켜 있다
      const rx = pool.posX[head.index] - ox
      const rz = pool.posZ[head.index] - oz
      maxAlong = Math.max(maxAlong, rx * dx + rz * dz)
      maxLateral = Math.max(maxLateral, Math.abs(rx * -dz + rz * dx))
    }
    expect(maxAlong).toBeLessThanOrEqual(line.rangeUnits - E92_HEAD_CONTACT + 1e-3)
    expect(maxAlong).toBeGreaterThan(4)
    expect(maxLateral + E92_HEAD_CONTACT).toBeLessThanOrEqual(line.widthUnits / 2 + 1e-3)
  })

  function pool_noCars(ctx) {
    // 객차를 미리 비운다(머리 혼자의 돌진 기하만 본다): 첫 걸음에 세운 객차를 지운다.
    ctx.step({ x: 0, z: 0 }, 'stage2')
    for (const car of activeOfType(ctx.pool, 'E01')) ctx.pool.despawnIndex(car, ctx.pool.generation[car])
  }

  it('예고를 보고 옆으로 비키면 돌진 피해 0', () => {
    const ctx = setup(0, 4.5)
    pool_noCars(ctx)
    const player = { x: 0, z: 0 }
    expect(runToTelegraph(ctx, player)).toBe(true)
    let damage = 0
    for (let f = 0; f < (E92_TRAIN.telegraphMs + E92_TRAIN.chargeMs) / 1000 / DT; f += 1) {
      if (player.x < 1.6) player.x += PLAYER_SPEED * DT
      damage += ctx.step(player, 'stage2')
    }
    expect(damage).toBe(0)
  })

  it('가만히 선 플레이어는 60초 안에 머리에게 맞는다', () => {
    const { pool, step } = setup(0, 6)
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 }, 'stage2')
    expect(damage).toBeGreaterThan(0)
    expect(pool.activeCount).toBeGreaterThan(0)
  })

  it('머리가 죽으면 객차는 1.2초 기절(탈선)했다가 일반 E01이 된다', () => {
    const { pool, runtime, step, head } = setup(0, 8)
    // 객차는 머리와 함께 땅에서 올라온다(스폰 연출) — 연출이 끝난 뒤 머리를 잡는다.
    for (let f = 0; f < (ENEMY_SPAWN_REVEAL_MS + 100) / 1000 / DT; f += 1) step({ x: 0, z: 0 }, 'stage2')
    const cars = activeOfType(pool, 'E01')
    expect(cars).toHaveLength(E92_TRAIN.carCount)
    runtime.applyHitIndex(pool, head.index, head.generation, 1e9)
    step({ x: 0, z: 0 }, 'stage2')
    for (const car of cars) expect(pool.state[car]).toBe(N2_STATE_STUN)
    for (let f = 0; f < (E92_TRAIN.derailMs + 100) / 1000 / DT; f += 1) step({ x: 0, z: 0 }, 'stage2')
    for (const car of cars) {
      expect(runtime.novel2.isTrainCar(pool, car)).toBe(false)
      expect(pool.state[car]).not.toBe(N2_STATE_STUN)
    }
  })

  it('커피 버프가 객차에 걸려 있어도 경로 추종 속도(1.6u/s)를 넘지 않는다', () => {
    const { pool, runtime, step } = setup(0, 10)
    step({ x: 0, z: -10 }, 'stage2')
    const cars = activeOfType(pool, 'E01')
    for (const car of cars) runtime.novel2.buffMs[car] = 1e6
    let maxSpeed = 0
    const prev = cars.map((c) => [pool.posX[c], pool.posZ[c]])
    for (let f = 0; f < 3 / DT; f += 1) {
      step({ x: 0, z: -10 }, 'stage2')
      cars.forEach((c, k) => {
        maxSpeed = Math.max(maxSpeed, Math.hypot(pool.posX[c] - prev[k][0], pool.posZ[c] - prev[k][1]) / DT)
        prev[k] = [pool.posX[c], pool.posZ[c]]
      })
    }
    expect(maxSpeed).toBeLessThanOrEqual(E92_TRAIN.carMaxSpeed + 0.9) // 이웃 밀어내기 여유 포함, 1.35배 버프 없음
  })

  // 2026-11-15 balanceqa: 스2 120초 E67 방패와 기관사가 같은 순간에 나와 객차가 연필을 더 오래 받아 냈다.
  it('객차는 회복(E56·E84)·방패(E67·E78·E86)를 받지 않는다 — 옆의 일반 E01은 받는다', () => {
    const { pool, runtime, step } = setup(0, 8)
    step({ x: 0, z: 0 }, 'stage2')
    const cars = activeOfType(pool, 'E01')
    expect(cars.length).toBeGreaterThan(0)
    const plain = spawn(pool, 'E01', pool.posX[cars[0]] + 0.3, pool.posZ[cars[0]], { hp: 10 })
    for (const id of ['E56', 'E84']) {
      const heal = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]].heal
      expect(heal, id).toBeTruthy()
      const healer = spawn(pool, id, pool.posX[cars[0]], pool.posZ[cars[0]] + 0.5)
      for (const car of cars) pool.hp[car] = 2
      pool.hp[plain.index] = 2
      applyProjectileZombieHeal(pool, healer.index, heal)
      for (const car of cars) expect(pool.hp[car], `${id} car`).toBe(2)
      expect(pool.hp[plain.index], `${id} plain`).toBeGreaterThan(2)
      pool.despawnIndex(healer.index, healer.generation)
    }
    pool.despawnIndex(plain.index, plain.generation)
    for (const car of cars) pool.hp[car] = 2
    for (const id of ['E67', 'E78', 'E86']) {
      const shield = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]].shield
      expect(shield, id).toBeTruthy()
      const holder = spawn(pool, id, pool.posX[cars[0]], pool.posZ[cars[0]] + 0.5)
      expect(hasDamagedAllyNear(pool, holder.index, 50), `${id} heal trigger`).toBe(false)
      expect(hasUnshieldedAllyNear(pool, holder.index, 50), `${id} shield trigger`).toBe(false)
      expect(applyProjectileZombieShield(pool, holder.index, shield)).toBe(0)
      for (const car of cars) expect(pool.maxHp[car], `${id} car`).toBe(10)
      pool.despawnIndex(holder.index, holder.generation)
    }
  })

  // 2026-11-15 balanceqa: 예고 중 머리가 무리에 밀려 예고 시작 자리에서 벗어났다(자리 고정 불변식).
  it('예고 중 머리는 무리가 밀고 넉백을 맞아도 예고 시작 자리에서 움직이지 않는다', () => {
    const ctx = setup(0, 4.5)
    pool_noCars(ctx)
    const { pool, runtime, head, step } = ctx
    const player = { x: 0, z: 0 }
    expect(runToTelegraph(ctx, player)).toBe(true)
    for (let k = 0; k < 8; k += 1) spawn(pool, 'E01', pool.posX[head.index] + (k - 4) * 0.1, pool.posZ[head.index] + 0.2, { hp: 1e6 })
    const x0 = runtime.novel2.chargeOriginX[head.index]
    const z0 = runtime.novel2.chargeOriginZ[head.index]
    runtime.applyHitIndex(pool, head.index, head.generation, 0, 5, 5, 400)
    while (pool.state[head.index] === N2_STATE_TELEGRAPH) {
      step({ x: 6, z: -6 }, 'stage2')
      if (pool.state[head.index] !== N2_STATE_TELEGRAPH) break
      expect(pool.posX[head.index]).toBe(x0)
      expect(pool.posZ[head.index]).toBe(z0)
    }
  })

  function dashFrames(ctx, frames, player, onFrame) {
    const { pool, runtime, head } = ctx
    const ox = runtime.novel2.chargeOriginX[head.index]
    const oz = runtime.novel2.chargeOriginZ[head.index]
    const dx = pool.runDirX[head.index]
    const dz = pool.runDirZ[head.index]
    let maxLateral = 0
    let maxAlong = 0
    let maxJump = 0
    let px = pool.posX[head.index]
    let pz = pool.posZ[head.index]
    for (let f = 0; f < frames; f += 1) {
      const wasCharging = pool.state[head.index] === N2_STATE_ATTACK
      ctx.step(player, 'stage2')
      if (onFrame) onFrame(f)
      const x = pool.posX[head.index]
      const z = pool.posZ[head.index]
      maxJump = Math.max(maxJump, Math.hypot(x - px, z - pz))
      px = x; pz = z
      if (!wasCharging) continue
      const rx = x - ox
      const rz = z - oz
      maxAlong = Math.max(maxAlong, rx * dx + rz * dz)
      maxLateral = Math.max(maxLateral, Math.abs(rx * -dz + rz * dx))
    }
    return { maxLateral, maxAlong, maxJump }
  }

  it('돌진 중 옆에서 무리가 밀고 넉백을 맞아도 머리 접촉 판정은 폭 1.1u 예고선 안에 있다(같은 프레임 판정)', () => {
    const ctx = setup(0, 4.5)
    pool_noCars(ctx)
    const { pool, runtime, head } = ctx
    expect(runToTelegraph(ctx, { x: 0, z: 0 })).toBe(true)
    const line = expansionAttackSnapshots.get(`novel2:e92:${head.index}:${head.generation}`)
    // 선 바로 옆(+x)에 E01 무리를 세워 둔다 — 밀어내기가 머리를 −x로 미는 쪽.
    for (let k = 0; k < 12; k += 1) spawn(pool, 'E01', 0.5, 4.5 - k * 0.45, { hp: 1e6 })
    const result = dashFrames(ctx, (E92_TRAIN.telegraphMs + E92_TRAIN.chargeMs + 300) / 1000 / DT, { x: 6, z: -6 }, (f) => {
      if (f === 70 && pool.state[head.index] === N2_STATE_ATTACK) runtime.applyHitIndex(pool, head.index, head.generation, 0, 6, 0, 300)
    })
    expect(result.maxLateral).toBeLessThanOrEqual(E92_TRAIN.lateralTolerance + 1e-4)
    expect(result.maxLateral + E92_HEAD_CONTACT).toBeLessThanOrEqual(line.widthUnits / 2 + 1e-4)
    expect(result.maxAlong).toBeLessThanOrEqual(line.rangeUnits - E92_HEAD_CONTACT + 1e-3)
    expect(result.maxJump).toBeLessThanOrEqual(E92_TRAIN.chargeSpeed * DT + 0.05)
  })

  // 2026-11-15 balanceqa: 돌진 중 막힌 머리가 끼임 회복으로 25u 순간이동했다(런당 약 0.85회).
  it('돌진이 장애물에 막히면 순간이동하지 않고 그 자리에서 돌진을 취소한다(예고선도 지운다)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    // 머리(0, 4.5) → 플레이어(0, 0) 방향 돌진 경로 한가운데(z 2.2)에 상자 하나.
    const obstacles = [{ x: 0, z: 2.2, halfX: 1.2, halfZ: 0.3 }]
    const step = makeStep(runtime, pool, { obstacles, obstacleCount: obstacles.length })
    const head = spawn(pool, 'E92', 0, 4.5, { hp: E92_STAGE2_HP, scale: NOVEL2_ZOMBIE_STATS.E92.scale })
    step({ x: 0, z: 0 }, 'stage2')
    for (const car of activeOfType(pool, 'E01')) pool.despawnIndex(car, pool.generation[car])
    // 예고·탈출 인증을 건너뛰고 돌진 상태를 직접 세운다(막힘 처리만 본다).
    pool.state[head.index] = N2_STATE_ATTACK
    pool.stateTimer[head.index] = E92_TRAIN.chargeMs
    pool.runDirX[head.index] = 0
    pool.runDirZ[head.index] = -1
    runtime.novel2.chargeOriginX[head.index] = pool.posX[head.index]
    runtime.novel2.chargeOriginZ[head.index] = pool.posZ[head.index]
    const ctx = { pool, runtime, head, step }
    let cancelled = false
    const result = dashFrames(ctx, 4 / DT, { x: 6, z: -6 }, () => {
      if (pool.state[head.index] === N2_STATE_RECOVER) cancelled = true
    })
    expect(cancelled).toBe(true)
    expect(result.maxJump).toBeLessThanOrEqual(E92_TRAIN.chargeSpeed * DT + 0.05)
    expect(result.maxLateral).toBeLessThanOrEqual(E92_TRAIN.lateralTolerance + 1e-4)
    expect(expansionAttackSnapshots.has(`novel2:e92:${head.index}:${head.generation}`)).toBe(false)
  })
})

describe('E95 긴줄넘기 듀오(치프, 두 몸)', () => {
  function setup(stageId = 'stage3') {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const a = spawn(pool, 'E95', -2.25, 0, { hp: 288, spawnTimer: 2000 })
    const b = spawn(pool, 'E95', 2.25, 0, { hp: 288, spawnTimer: 2000 })
    return { pool, runtime, step: (p) => step(p, stageId), a, b }
  }

  function runToRope(ctx, player) {
    for (let f = 0; f < 3 / DT; f += 1) {
      ctx.step(player)
      if (ctx.pool.state[ctx.a.index] === N2_STATE_TELEGRAPH) return true
    }
    return false
  }

  it('두 몸이 짝이 되고, 줄 0.9초 예고 동안 피해 0 → 가만히 있으면 내려침 10', () => {
    const ctx = setup()
    expect(runToRope(ctx, { x: 0, z: 0 })).toBe(true)
    expect(ctx.runtime.novel2.partnerOf(ctx.pool, ctx.a.index)).toBe(ctx.b.index)
    const rope = [...expansionAttackSnapshots.values()].find((s) => s.type === 'E95')
    expect(rope.shape).toBe('line')
    expect(rope.damage).toBe(E95_ROPE.damage)
    const origin = [...rope.originXZ]
    let telegraphDamage = 0
    for (let f = 0; f < (E95_ROPE.windupMs - 50) / 1000 / DT; f += 1) telegraphDamage += ctx.step({ x: 0, z: 0 })
    expect(telegraphDamage).toBe(0)
    expect(rope.originXZ).toEqual(origin) // 양끝 고정
    let slam = 0
    for (let f = 0; f < 0.4 / DT; f += 1) slam += ctx.step({ x: 0, z: 0 })
    expect(slam).toBe(E95_ROPE.damage)
  })

  it('예고를 보고 줄에서 옆으로 비키면 피해 0', () => {
    const ctx = setup()
    const player = { x: 0, z: 0 }
    expect(runToRope(ctx, player)).toBe(true)
    let damage = 0
    for (let f = 0; f < (E95_ROPE.windupMs + E95_ROPE.slamMs) / 1000 / DT; f += 1) {
      if (player.z < 1.2) player.z += PLAYER_SPEED * DT
      damage += ctx.step(player)
    }
    expect(damage).toBe(0)
  })

  it('예고 중 한 몸이 죽으면 줄이 떨어진다(피해 0), 남은 몸은 1.5배 속도로 추격', () => {
    const ctx = setup()
    expect(runToRope(ctx, { x: 0, z: 0 })).toBe(true)
    ctx.runtime.applyHitIndex(ctx.pool, ctx.b.index, ctx.b.generation, 1e9)
    let damage = 0
    for (let f = 0; f < (E95_ROPE.windupMs + E95_ROPE.slamMs) / 1000 / DT; f += 1) damage += ctx.step({ x: 0, z: 6 })
    expect([...expansionAttackSnapshots.values()].some((s) => s.type === 'E95')).toBe(false)
    expect(damage).toBe(0)
    const x0 = ctx.pool.posX[ctx.a.index]; const z0 = ctx.pool.posZ[ctx.a.index]
    for (let f = 0; f < 60; f += 1) ctx.step({ x: 0, z: 6 })
    const speed = Math.hypot(ctx.pool.posX[ctx.a.index] - x0, ctx.pool.posZ[ctx.a.index] - z0) / (60 * DT)
    expect(speed).toBeGreaterThan(NOVEL2_ZOMBIE_STATS.E95.speed * 1.2)
    expect(speed).toBeLessThanOrEqual(NOVEL2_ZOMBIE_STATS.E95.speed * E95_ROPE.soloSpeedMul + 0.05)
  })

  it('가만히 선 플레이어는 60초 안에 맞는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    spawn(pool, 'E95', -5, 3, { hp: 1e9 })
    spawn(pool, 'E95', 5, 4, { hp: 1e9 })
    let damage = 0
    for (let f = 0; f < 60 / DT; f += 1) damage += step({ x: 0, z: 0 }, 'stage3')
    expect(damage).toBeGreaterThan(0)
  })

  it('Stage 3 체육관 장애물(39개 > 상한 32)에서도 가까운 32개로 줄 안전 기하를 만든다', () => {
    const obstacles = getStageObjectSightObstacles('stage3')
    expect(obstacles.length).toBeGreaterThan(EXPANSION_SAFETY_LIMITS.obstacles)
    const near = novel2NearSafetyObstacles(obstacles, 0, 0, 0, 0)
    expect(near.length).toBeLessThanOrEqual(EXPANSION_SAFETY_LIMITS.obstacles)
    const rope = { shape: 'line', originXZ: [-2.25, 0], directionXZ: [1, 0], yaw: Math.PI / 2, rangeUnits: 4.5, widthUnits: E95_ROPE.ropeWidth }
    expect(buildExpansionSafetyGeometry({ ...rope }, { halfX: 7.5, halfZ: 19.2, obstacles })).toEqual([])
    expect(buildExpansionSafetyGeometry({ ...rope }, { halfX: 7.5, halfZ: 19.2, obstacles: near }).length).toBeGreaterThan(0)
  })

  it('치프 바: 두 몸 HP 합 / (몸 하나 최대 HP × 2)', () => {
    const ctx = setup()
    ctx.pool.hp[ctx.b.index] = 144
    const live = findLiveChiefInto(ctx.pool, { index: -1, typeCode: 0, hp: 0, maxHp: 0 })
    expect(live.hp).toBe(288 + 144)
    expect(live.maxHp).toBe(576)
    ctx.runtime.applyHitIndex(ctx.pool, ctx.b.index, ctx.b.generation, 1e9)
    const after = findLiveChiefInto(ctx.pool, { index: -1, typeCode: 0, hp: 0, maxHp: 0 })
    expect(after.hp / after.maxHp).toBeCloseTo(0.5, 6)
  })
})

describe('공통 불변식', () => {
  it('E92·E95 접촉 판정은 예고선 반폭 안이다', () => {
    expect(enemyContactDistance(ENEMY_TYPE_CODES.E92)).toBeCloseTo(E92_HEAD_CONTACT, 5)
  })
})
