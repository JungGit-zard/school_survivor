// 투사체 좀비 15종(E46~E60) 행동 QA. 수치표·상태기계·탄 궤적을 실제 시뮬레이션 런타임으로 돌린다.
import { describe, expect, it } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { JARMOB_HP_TYPES, isPooledEnemyType } from '../components/Enemies.jsx'
import { createEnemyEntityPool, ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import {
  ENEMY_EVENT_CONTACT,
  ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE,
  ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH,
  ENEMY_RUNTIME_DAMAGE,
  ENEMY_RUNTIME_HP,
  ENEMY_RUNTIME_SPEED,
  ENEMY_RUNTIME_XP,
  ENEMY_SIZE_MULTIPLIER,
  createEnemySimulationRuntime,
} from './enemySimulation.js'
import {
  PROJECTILE_ZOMBIE_BEHAVIORS,
  PROJECTILE_ZOMBIE_STATS,
  PZ_MIN_LOCK_TO_FIRE_MS,
  PZ_SHOT_CAP,
  PZ_SHOT_CAP_BOSS,
  PZ_STATE,
  applyProjectileZombieHeal,
  projectileZombieTelegraphMs,
  spawnProjectileZombieTelegraphDecal,
  spawnProjectileZombieVolley,
} from './projectileZombieBehavior.js'
import {
  SHOT_KIND,
  SHOT_KIND_INFO,
  SHOT_MOTION,
  applyPlayerSlow,
  consumePlayerSlow,
  createPlayerSlowState,
  createProjectileZombieShotPool,
} from './projectileZombieShotPool.js'
import { PROJECTILE_ZOMBIE_TYPES } from './projectileZombieVisuals.js'
import { getBurstEventsForStage } from './burstEvents.js'

// 1차 15종(E46~E60) 계약. 2차 10종(E61~E70)은 projectileZombieSecondBatch.test.js가 따로 검사한다.
const IDS = PROJECTILE_ZOMBIE_TYPES.slice(0, 15)
const HOST_HP_XP = { 8: 4, 10: 5, 16: 8, 32: 10, 70: 15 }
const DT = 1 / 60
const NON_DAMAGING = new Set(['E49', 'E56'])

function createWorld() {
  const pool = createEnemyEntityPool()
  const runtime = createEnemySimulationRuntime()
  const shots = createProjectileZombieShotPool()
  const slow = createPlayerSlowState()
  return { pool, runtime, shots, slow, handle: { index: -1, generation: 0 } }
}

function spawn(world, id, x, z) {
  const stats = ENEMY_STATS[id]
  const ok = world.pool.spawnInto(world.handle, {
    type: id, x, y: 0.3, z, hp: stats.hp, maxHp: stats.hp, visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER, spawnTimer: 300,
  })
  expect(ok).toBe(true)
  return world.handle.index
}

/**
 * playerMove(timeMs, player, log) → 매 프레임 플레이어 위치를 바꾼다. log에는 예고/발사 시각이 쌓인다.
 * 반환: { projectileDamage, contactDamage, telegraphs, fires, log }
 */
function run(world, { player, seconds, playerMove = null, context = {} }) {
  const out = { projectileDamage: 0, contactDamage: 0, telegraphs: [], fires: [], states: [] }
  const event = {}
  const frames = Math.round(seconds / DT)
  for (let frame = 0; frame < frames; frame += 1) {
    const timeMs = frame * DT * 1000
    if (playerMove) playerMove(timeMs, player, out)
    world.runtime.step(world.pool, {
      delta: DT, playerX: player.x, playerZ: player.z, halfX: 60, halfZ: 60, elapsedSec: 30 + timeMs / 1000,
      activeProjectileCount: 0, stageId: 'stage2', bossPressure: false,
      projectileZombieShotCount: world.shots.hostileCount, ...context,
    })
    while (world.runtime.events.drainInto(event)) {
      if (event.type === ENEMY_EVENT_CONTACT) out.contactDamage += event.value
      else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH) {
        out.telegraphs.push(timeMs)
        spawnProjectileZombieTelegraphDecal(world.shots, world.pool, event.index, event.generation)
      } else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE) {
        out.fires.push(timeMs)
        spawnProjectileZombieVolley(world.shots, world.pool, event.index, event.generation)
      }
    }
    for (let i = 0; i <= world.pool.highestActive; i += 1) if (world.pool.active[i]) out.states.push(world.pool.state[i])
    world.shots.step(DT, player.x, player.z, (_i, _g, damage) => { out.projectileDamage += damage }, null, world.slow)
  }
  return out
}

describe('투사체 좀비 15종 수치표', () => {
  it('15종이 typeCode 49~63에 그대로 앉고 ENEMY_STATS·시뮬레이션 표가 같은 정본을 쓴다', () => {
    IDS.forEach((id, i) => {
      const code = ENEMY_TYPE_CODES[id]
      expect(code).toBe(49 + i)
      const stats = PROJECTILE_ZOMBIE_STATS[id]
      expect(ENEMY_STATS[id]).toBe(stats)
      expect(ENEMY_RUNTIME_HP[code]).toBe(Math.fround(stats.hp))
      expect(ENEMY_RUNTIME_SPEED[code]).toBe(Math.fround(stats.speed))
      expect(ENEMY_RUNTIME_DAMAGE[code]).toBe(Math.fround(stats.damage))
      expect(ENEMY_RUNTIME_XP[code]).toBe(Math.fround(stats.xp))
      expect(PROJECTILE_ZOMBIE_BEHAVIORS[code].id).toBe(id)
    })
  })

  it('hp·xp는 host 타입 값 그대로다(버스트 맞교환으로 총 HP·XP 불변)', () => {
    for (const id of IDS) {
      const { hp, xp } = PROJECTILE_ZOMBIE_STATS[id]
      expect(Object.keys(HOST_HP_XP).map(Number)).toContain(hp)
      expect(xp).toBe(HOST_HP_XP[hp])
    }
  })

  it('잡몹 분류·풀 경로에 들어간다', () => {
    for (const id of IDS) {
      expect(JARMOB_HP_TYPES.has(id)).toBe(true)
      expect(isPooledEnemyType(id)).toBe(true)
    }
  })

  it('탄 kind는 종마다 고유하고(16~30) 아티스트용 키가 있다', () => {
    const kinds = IDS.map((id) => PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]].shot?.kind ?? null)
    const real = kinds.filter((kind) => kind !== null)
    expect(new Set(real).size).toBe(real.length)
    IDS.forEach((id, i) => {
      if (id === 'E56') return expect(kinds[i]).toBeNull()
      expect(kinds[i]).toBe(16 + i)
      expect(SHOT_KIND_INFO[kinds[i]].key).toMatch(/^[a-zA-Z]+$/)
    })
    for (const kind of [SHOT_KIND.DECAL_MARKER, SHOT_KIND.DECAL_AIM_LINE, SHOT_KIND.ZONE_WATER, SHOT_KIND.ZONE_PAINT, SHOT_KIND.DECAL_HEAL]) {
      expect(SHOT_KIND_INFO[kind]).toBeDefined()
    }
  })

  it('예고 길이는 비주얼 정본(telegraphMs)이고 방향 확정 → 발사는 최소 500ms다', () => {
    for (const id of IDS) {
      const code = ENEMY_TYPE_CODES[id]
      const p = PROJECTILE_ZOMBIE_BEHAVIORS[code]
      const lockToFire = p.aim === 'lockLate' ? p.lockLeftMs : projectileZombieTelegraphMs(code)
      expect(lockToFire, id).toBeGreaterThanOrEqual(PZ_MIN_LOCK_TO_FIRE_MS)
    }
    expect(projectileZombieTelegraphMs(ENEMY_TYPE_CODES.E55)).toBe(1100)
    expect(projectileZombieTelegraphMs(ENEMY_TYPE_CODES.E54)).toBe(800)
  })

  it('탄은 발사 거리 안의 정지 목표까지 닿는다(사거리 ≥ fireRange)', () => {
    for (const id of IDS) {
      const p = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]]
      const s = p.shot
      if (!s || s.motion === SHOT_MOTION.LOB || s.motion === SHOT_MOTION.FUSE) continue
      let reach = s.speed * s.lifeMs / 1000
      if (s.motion === SHOT_MOTION.RETURN) reach = s.speed * s.speed / (2 * s.p0)
      if (s.motion === SHOT_MOTION.SPLIT) reach = s.speed * s.p0 / 1000 + s.p3 * s.p4 / 1000
      expect(reach + s.hitRadius + 0.136, id).toBeGreaterThanOrEqual(p.fireRange)
    }
  })
})

describe('투사체 좀비 상태기계(실제 시뮬레이션 런타임)', () => {
  it.each(IDS)('%s: 예고 중에는 움직이지 않고 예고가 끝나야 쏜다', (id) => {
    const world = createWorld()
    const p = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]]
    const index = spawn(world, id, 0, 0)
    if (p.heal) {
      // 회복 대상(다친 E01)을 옆에 둔다.
      world.pool.spawnInto(world.handle, { type: 'E01', x: 1, y: 0.3, z: 0, hp: 2, maxHp: 8, visualScale: 1.33, spawnTimer: 300 })
    }
    const distance = p.move === 'ambush' ? p.ambushRange * 0.8 : Math.min(p.fireRange - 0.3, p.prefDist)
    const player = { x: 0, z: distance }
    let telegraphStart = -1
    let posAtTelegraph = null
    let movedDuringTelegraph = 0
    let prevState = 0
    const result = run(world, {
      player, seconds: 8,
      playerMove: (timeMs) => {
        const state = world.pool.state[index]
        if (state === PZ_STATE.TELEGRAPH) {
          // 예고 한 번마다 시작 위치를 다시 잡는다.
          if (prevState !== PZ_STATE.TELEGRAPH) {
            if (telegraphStart < 0) telegraphStart = timeMs
            posAtTelegraph = [world.pool.posX[index], world.pool.posZ[index]]
          } else {
            movedDuringTelegraph = Math.max(movedDuringTelegraph, Math.hypot(world.pool.posX[index] - posAtTelegraph[0], world.pool.posZ[index] - posAtTelegraph[1]))
          }
        }
        prevState = state
      },
    })
    expect(result.fires.length, `${id} 발사`).toBeGreaterThan(0)
    expect(telegraphStart).toBeGreaterThanOrEqual(0)
    // 첫 발사는 예고 시작에서 예고 길이 이상 지난 뒤다.
    expect(result.fires[0] - telegraphStart).toBeGreaterThanOrEqual(projectileZombieTelegraphMs(ENEMY_TYPE_CODES[id]) - DT * 1000 * 2)
    // 예고 중 사수는 서 있다(이웃 분리력 정도의 미세 이동만 허용).
    expect(movedDuringTelegraph, id).toBeLessThan(0.05)
  })

  it.each(IDS.filter((id) => !NON_DAMAGING.has(id)))('%s: 서 있는 플레이어는 탄에 맞는다', (id) => {
    const world = createWorld()
    const p = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]]
    spawn(world, id, 0, 0)
    const distance = p.move === 'ambush' ? p.ambushRange * 0.8 : Math.min(p.fireRange - 0.3, p.prefDist)
    const result = run(world, { player: { x: 0, z: distance }, seconds: 12 })
    expect(result.projectileDamage, id).toBeGreaterThan(0)
  })

  it.each(IDS.filter((id) => !NON_DAMAGING.has(id)))('%s: 예고를 보고 옆으로 계속 걸으면 첫 공격을 전부 피한다', (id) => {
    const world = createWorld()
    const p = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]]
    spawn(world, id, 0, 0)
    const distance = p.move === 'ambush' ? p.ambushRange * 0.8 : Math.min(p.fireRange - 0.3, p.prefDist)
    let dodgeFrom = -1
    let damageBeforeDodge = 0
    const player = { x: 0, z: distance }
    const result = run(world, {
      player, seconds: 7,
      playerMove: (timeMs, pl, log) => {
        if (dodgeFrom < 0 && log.telegraphs.length > 0) { dodgeFrom = timeMs; damageBeforeDodge = log.projectileDamage }
        // 확정을 본 순간부터 사수 방향과 직각(+x)으로 3.0u/s(플레이어 속도) 계속 걷는다.
        if (dodgeFrom >= 0) pl.x += 3.0 * DT
      },
    })
    expect(result.telegraphs.length, id).toBeGreaterThan(0)
    expect(damageBeforeDodge).toBe(0)
    // 첫 공격의 모든 탄이 끝날 때까지 맞지 않는다. 걷는 중에 다음 공격이 와도 같은 이유로 빗나간다.
    expect(result.projectileDamage, id).toBe(0)
  })

  it('E49 물웅덩이는 피해 없이 감속만 준다', () => {
    const world = createWorld()
    spawn(world, 'E49', 0, 0)
    const result = run(world, { player: { x: 0, z: 3.5 }, seconds: 6 })
    expect(result.fires.length).toBeGreaterThan(0)
    expect(result.projectileDamage).toBe(0)
    let sawZone = false
    for (let i = 0; i < world.shots.capacity; i += 1) if (world.shots.active[i] && world.shots.kind[i] === SHOT_KIND.ZONE_WATER) sawZone = true
    expect(sawZone).toBe(true)
    expect(world.slow.ms).toBeGreaterThan(0)
    expect(world.slow.mul).toBeCloseTo(0.65, 5)
  })

  it('E56 보건실은 다친 아군만, 정해진 총량까지만 회복하고 보스·자기 자신은 회복하지 않는다', () => {
    const world = createWorld()
    const nurse = spawn(world, 'E56', 0, 0)
    world.pool.hp[nurse] = 10
    world.pool.spawnInto(world.handle, { type: 'E01', x: 1, y: 0.3, z: 0, hp: 2, maxHp: 8, visualScale: 1.33, spawnTimer: 300 })
    const ally = world.handle.index
    world.pool.spawnInto(world.handle, { type: 'B01', x: 0, y: 0.3, z: 1, hp: 100, maxHp: 1150, visualScale: 2, spawnTimer: 300 })
    const boss = world.handle.index
    const healed = applyProjectileZombieHeal(world.pool, nurse, PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES.E56].heal)
    expect(healed).toBeCloseTo(1.6, 5) // 8 × 20%
    expect(world.pool.hp[ally]).toBeCloseTo(3.6, 5)
    expect(world.pool.hp[boss]).toBe(100)
    expect(world.pool.hp[nurse]).toBe(10)
    // 평생 총량 36을 넘지 않는다.
    world.pool.spawnInto(world.handle, { type: 'E02', x: -1, y: 0.3, z: 0, hp: 1, maxHp: 1000, visualScale: 1.8, spawnTimer: 300 })
    let total = healed
    for (let k = 0; k < 20; k += 1) total += applyProjectileZombieHeal(world.pool, nurse, PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES.E56].heal)
    expect(total).toBeLessThanOrEqual(36 + 1e-6)
    expect(total).toBeGreaterThan(30)
  })

  it('매복형(E58·E60)은 숨어 있는 동안 몸이 바닥 아래로 내려가고 접촉 피해가 없다', () => {
    for (const id of ['E58', 'E60']) {
      const world = createWorld()
      const index = spawn(world, id, 0, 0)
      // 아주 가까이(접촉 거리) 두되 공격 쿨다운이 남아 숨은 상태를 유지하게 한다.
      const result = run(world, { player: { x: 0, z: 0.2 }, seconds: 0.5 })
      expect(world.pool.state[index]).toBe(PZ_STATE.APPROACH)
      expect(world.pool.posY[index]).toBeLessThan(0.3 - 0.1)
      expect(result.contactDamage).toBe(0)
    }
  })

  it('탄 상한: 맞을 수 있는 탄이 상한 이상이면 새 예고를 시작하지 않는다(보스 구간은 더 낮다)', () => {
    expect(PZ_SHOT_CAP_BOSS).toBeLessThan(PZ_SHOT_CAP)
    const world = createWorld()
    const index = spawn(world, 'E57', 0, 0)
    const result = run(world, { player: { x: 0, z: 4 }, seconds: 4, context: { projectileZombieShotCount: PZ_SHOT_CAP } })
    expect(result.telegraphs.length).toBe(0)
    expect(world.pool.state[index]).toBe(PZ_STATE.APPROACH)
    const boss = createWorld()
    spawn(boss, 'E57', 0, 0)
    const blocked = run(boss, { player: { x: 0, z: 4 }, seconds: 4, context: { bossPressure: true, projectileZombieShotCount: PZ_SHOT_CAP_BOSS - 2 } })
    expect(blocked.telegraphs.length).toBe(0) // 카드 3장이 2칸에 안 들어간다
    const open = createWorld()
    spawn(open, 'E57', 0, 0)
    expect(run(open, { player: { x: 0, z: 4 }, seconds: 4, context: { bossPressure: true } }).fires.length).toBeGreaterThan(0)
  })

  it('예고 중 죽은 사수는 쏘지 않는다(이벤트가 슬롯 세대를 확인한다)', () => {
    const world = createWorld()
    const index = spawn(world, 'E55', 0, 0)
    const generation = world.pool.generation[index]
    world.pool.despawnIndex(index, generation)
    expect(spawnProjectileZombieVolley(world.shots, world.pool, index, generation)).toBe(0)
    expect(world.shots.activeCount).toBe(0)
  })

  it('화면 밖 사수는 예고를 시작하지 않는다', () => {
    const world = createWorld()
    spawn(world, 'E47', 0, 0)
    const result = run(world, { player: { x: 0, z: 4 }, seconds: 4, context: { screenBounds: { minX: 10, maxX: 20, minZ: 10, maxZ: 20 } } })
    expect(result.telegraphs.length).toBe(0)
  })
})

describe('투사체 좀비 탄 풀', () => {
  it('감속은 가장 강한 1개만 적용되고 시간이 지나면 1로 돌아온다', () => {
    const slow = createPlayerSlowState()
    applyPlayerSlow(slow, 0.8, 1000)
    applyPlayerSlow(slow, 0.65, 200)
    applyPlayerSlow(slow, 0.9, 100)
    expect(slow.mul).toBe(0.65)
    expect(consumePlayerSlow(slow, 500)).toBe(0.65)
    expect(consumePlayerSlow(slow, 600)).toBe(0.65)
    expect(consumePlayerSlow(slow, 16)).toBe(1)
  })

  it('표식·지대는 맞을 수 있는 탄 수(hostileCount)에 들어가지 않는다', () => {
    const shots = createProjectileZombieShotPool()
    shots.spawnDecal(0, 0, SHOT_KIND.DECAL_MARKER, 0.8, 500)
    shots.spawnDecal(0, 0, SHOT_KIND.ZONE_WATER, 0.9, 500, 0, 0, 0.65)
    expect(shots.activeCount).toBe(2)
    expect(shots.hostileCount).toBe(0)
    for (let k = 0; k < 40; k += 1) shots.step(DT, 5, 5, null)
    expect(shots.activeCount).toBe(0)
  })

  it('플라스크는 정해진 시간 뒤 세 갈래로 갈라진다', () => {
    const shots = createProjectileZombieShotPool()
    const s = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES.E52].shot
    shots.spawn(0, 0, 0, 1, { ...s })
    for (let k = 0; k < Math.ceil(s.p0 / (DT * 1000)) + 2; k += 1) shots.step(DT, 50, 50, null)
    expect(shots.hostileCount).toBe(3)
  })

  it('부메랑은 멈췄다가 던진 쪽으로 되돌아온다', () => {
    const shots = createProjectileZombieShotPool()
    const s = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES.E48].shot
    const i = shots.spawn(0, 0, 0, 1, { ...s })
    let maxZ = 0
    for (let k = 0; k < 60 * 4; k += 1) { shots.step(DT, 50, 50, null); if (shots.active[i]) maxZ = Math.max(maxZ, shots.posZ[i]) }
    expect(maxZ).toBeGreaterThan(3.8)
    expect(maxZ).toBeLessThan(4.2)
    expect(shots.active[i] ? shots.posZ[i] : 0).toBeLessThan(1.5)
  })

  it('지우개는 화면 가장자리에서 튕겨 돌아온다', () => {
    const shots = createProjectileZombieShotPool()
    const s = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES.E46].shot
    const i = shots.spawn(0, 0, 1, 0, { ...s })
    const bounds = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 }
    for (let k = 0; k < 90; k += 1) shots.step(DT, 50, 50, null, bounds)
    expect(shots.velX[i]).toBeLessThan(0)
    expect(shots.bounces[i]).toBe(1)
  })
})

describe('투사체 좀비 스폰 배치', () => {
  const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']
  const OLD_DEBUTS = {
    stage1: [24, 72, 108], stage2: [5, 24, 108], stage3: [24, 120, 168], stage4: [40, 108, 150], stage5: [],
  }

  function debuts() {
    const seen = new Map()
    for (const stage of STAGES) {
      for (const evt of [...getBurstEventsForStage(stage)].sort((a, b) => a.sec - b.sec)) {
        if (IDS.includes(evt.type) && !seen.has(evt.type)) seen.set(evt.type, { stage, sec: evt.sec, count: evt.count })
      }
    }
    return seen
  }

  it('15종 전부 스1~5에 첫 등장하고 스테이지마다 1~6종이다', () => {
    const seen = debuts()
    expect([...seen.keys()].sort()).toEqual([...IDS].sort())
    for (const stage of STAGES) {
      const n = [...seen.values()].filter((d) => d.stage === stage).length
      expect(n, stage).toBeGreaterThanOrEqual(stage === 'stage3' ? 1 : 2)
      expect(n, stage).toBeLessThanOrEqual(6)
    }
  })

  it('첫 등장은 1마리 단독이고, 같은 스테이지의 다른 첫 등장(E34~E45 포함)과 30초 이상 떨어진다', () => {
    const seen = debuts()
    for (const stage of STAGES) {
      // 기존 첫 등장끼리의 간격(예: 스2 5·24초)은 이번 범위가 아니다. 새 첫 등장 하나하나를 나머지 전부와 비교한다.
      const mine = [...seen.values()].filter((d) => d.stage === stage).map((d) => d.sec)
      const all = [...OLD_DEBUTS[stage], ...mine]
      for (const sec of mine) {
        for (const other of all) if (other !== sec) expect(Math.abs(other - sec), `${stage} ${sec} vs ${other}`).toBeGreaterThanOrEqual(30)
      }
      for (const d of [...seen.values()].filter((v) => v.stage === stage)) {
        expect(d.count).toBe(1)
        // 같은 초에 다른 신규 종이 함께 처음 나오지 않는다.
        const sameSec = [...seen.values()].filter((v) => v.stage === stage && v.sec === d.sec)
        expect(sameSec).toHaveLength(1)
        // 보스 등장(150) 정각과 탈출 뒤(210~)에는 첫 등장시키지 않는다.
        expect(d.sec).not.toBe(150)
        expect(d.sec).toBeLessThan(210)
      }
    }
  })

  it('스1에는 피해를 주는 사수가 없다(E04 스1 제외 규칙의 정신)', () => {
    const stage1 = getBurstEventsForStage('stage1').filter((evt) => IDS.includes(evt.type)).map((evt) => evt.type)
    expect(new Set(stage1)).toEqual(new Set(['E56', 'E49']))
  })

  it('스6~10 초안 표는 건드리지 않았다', () => {
    for (const stage of ['stage6', 'stage7', 'stage8', 'stage9', 'stage10']) {
      for (const evt of getBurstEventsForStage(stage)) expect(IDS).not.toContain(evt.type)
    }
  })
})
