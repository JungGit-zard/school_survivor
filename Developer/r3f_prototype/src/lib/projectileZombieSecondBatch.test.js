// 2차 좀비 10종(E61~E70, typeCode 65~74, 2026-11-07) 계약.
// 등록·렌더·수치·스폰 배치, 그리고 종마다 새 메커니즘(돌진·왕복돌진·끌림·지속피해 지대·수렴·분열·방패·공전·도미노·순간이동)을
// 실제 시뮬레이션 런타임 + 탄 풀로 돌려 "서 있으면 맞고, 예고를 보고 움직이면 피한다"를 확인한다.
import { describe, expect, it } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { JARMOB_HP_TYPES, isPooledEnemyType } from '../components/Enemies.jsx'
import { ZOMBIE_PALETTE } from '../components/ZombieMesh.jsx'
import { resolvePooledZombieVisual } from '../components/ZombieInstanceLayer.jsx'
import { createEnemyEntityPool, ENEMY_TYPE_CODES, ENEMY_TYPE_NAMES, enemyTypeFromCode } from './enemyEntityPool.js'
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
  hasProjectileZombieSplit,
  isProjectileZombieShielded,
  spawnProjectileZombieTelegraphDecal,
  spawnProjectileZombieVolley,
} from './projectileZombieBehavior.js'
import {
  SHOT_KIND,
  SHOT_KIND_INFO,
  SHOT_MOTION,
  createPlayerImpulseState,
  createPlayerSlowState,
  createProjectileZombieShotPool,
} from './projectileZombieShotPool.js'
import { SHOT_VISUAL_FALLBACK, getShotVisualIndex } from './projectileZombieShotGeometry.js'
import {
  PROJECTILE_ZOMBIE_MAX_PROPS, PROJECTILE_ZOMBIE_TYPES, PROJECTILE_ZOMBIE_VISUALS, isProjectileZombieTypeCode, projectileZombieIndex,
} from './projectileZombieVisuals.js'
import { getBurstEventsForStage } from './burstEvents.js'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

const IDS = ['E61', 'E62', 'E63', 'E64', 'E65', 'E66', 'E67', 'E68', 'E69', 'E70']
const FIRST_BATCH = PROJECTILE_ZOMBIE_TYPES.slice(0, 15)
const HOST_HP_XP = { 8: 4, 10: 5, 16: 8, 32: 10, 70: 15 }
const DT = 1 / 60
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]))

function createWorld() {
  return {
    pool: createEnemyEntityPool(),
    runtime: createEnemySimulationRuntime(),
    shots: createProjectileZombieShotPool(),
    slow: createPlayerSlowState(),
    impulse: createPlayerImpulseState(),
    handle: { index: -1, generation: 0 },
  }
}

function spawn(world, id, x, z, hp) {
  const stats = ENEMY_STATS[id]
  const ok = world.pool.spawnInto(world.handle, {
    type: id, x, y: 0.3, z, hp: hp ?? stats.hp, maxHp: stats.hp, visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER, spawnTimer: 300,
  })
  expect(ok).toBe(true)
  return world.handle.index
}

// landed: 탄 명중 때 피해 경로(Enemies.jsx → damagePlayer)가 돌려주는 "피해가 실제로 들어갔는지". false = 무적 중 명중.
function run(world, { player, seconds, playerMove = null, landed = true }) {
  const out = { projectileDamage: 0, projectileHits: 0, contactDamage: 0, telegraphs: [], fires: [] }
  const event = {}
  const frames = Math.round(seconds / DT)
  for (let frame = 0; frame < frames; frame += 1) {
    const timeMs = frame * DT * 1000
    if (playerMove) playerMove(timeMs, player, out)
    world.runtime.step(world.pool, {
      delta: DT, playerX: player.x, playerZ: player.z, halfX: 60, halfZ: 60, elapsedSec: 30 + timeMs / 1000,
      activeProjectileCount: 0, stageId: 'stage2', bossPressure: false, projectileZombieShotCount: world.shots.hostileCount,
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
    world.shots.step(DT, player.x, player.z, (_i, _g, damage) => {
      out.projectileHits += 1
      if (landed) out.projectileDamage += damage
      return landed
    }, null, world.slow, null, world.impulse)
  }
  return out
}

// 첫 예고를 보는 순간부터 x축으로 걸어 나간다(플레이어 이동속도 3u/s).
function sidestepAfterTelegraph(direction = 1) {
  return (_t, player, out) => { if (out.telegraphs.length > 0) player.x += direction * 3 * DT }
}

function countShots(world, predicate) {
  let n = 0
  for (let i = 0; i < world.shots.capacity; i += 1) if (world.shots.active[i] && predicate(i)) n += 1
  return n
}

describe('2차 10종 등록·렌더', () => {
  it('typeCode 65~74에 앉고 64(E59 미니 예약)는 비어 있다', () => {
    expect(PROJECTILE_ZOMBIE_TYPES.slice(15)).toEqual(IDS)
    IDS.forEach((id, i) => {
      const code = 65 + i
      expect(ENEMY_TYPE_CODES[id]).toBe(code)
      expect(ENEMY_TYPE_NAMES[code]).toBe(id)
      expect(enemyTypeFromCode(code)).toBe(id)
      expect(isProjectileZombieTypeCode(code)).toBe(true)
      expect(projectileZombieIndex(code)).toBe(16 + i)
      expect(PROJECTILE_ZOMBIE_BEHAVIORS[code].id).toBe(id)
    })
    expect(ENEMY_TYPE_NAMES[64]).toBe('')
    expect(enemyTypeFromCode(64)).toBeNull()
    expect(isProjectileZombieTypeCode(64)).toBe(false)
    expect(PROJECTILE_ZOMBIE_BEHAVIORS[64]).toBeUndefined()
  })

  it('풀 렌더러가 고유 팔레트·1차 얼굴 재사용·소품으로 그린다(몸통 파트 10개)', () => {
    for (let code = 65; code <= 74; code += 1) {
      const visual = resolvePooledZombieVisual(code)
      expect(visual.name).toBe(IDS[code - 65])
      expect(visual.partCount).toBe(10)
      expect(visual.paletteIsE01Fallback).toBe(false)
      expect(visual.faceId).toBeGreaterThanOrEqual(1)
      expect(visual.faceId).toBeLessThanOrEqual(15)
      expect(visual.hidesEyeSlots).toBe(true)
      expect(visual.propCount).toBeGreaterThanOrEqual(1)
      expect(visual.propCount).toBeLessThanOrEqual(PROJECTILE_ZOMBIE_MAX_PROPS)
      expect(visual.studioTuned).toBe(false)
    }
  })

  it('상의 색이 서로, 그리고 기존 모든 좀비 몸통색과 구별된다', () => {
    for (let a = 0; a < IDS.length; a += 1) {
      for (let b = a + 1; b < IDS.length; b += 1) {
        expect(dist(PROJECTILE_ZOMBIE_VISUALS[IDS[a]].palette.top, PROJECTILE_ZOMBIE_VISUALS[IDS[b]].palette.top), `${IDS[a]} vs ${IDS[b]}`).toBeGreaterThan(30)
      }
    }
    const existing = Object.entries(ZOMBIE_PALETTE).filter(([type]) => !IDS.includes(type))
    for (const id of IDS) {
      const top = PROJECTILE_ZOMBIE_VISUALS[id].palette.top
      for (const [type, pal] of existing) expect(dist(top, pal.body), `${id} vs ${type}`).toBeGreaterThan(25)
    }
  })

  it('새 탄 kind마다 전용 외형과 아티스트 키가 있다', () => {
    for (const kind of [SHOT_KIND.MIC_CORD, SHOT_KIND.CHALK_BOMB, SHOT_KIND.EXAM_PAPER, SHOT_KIND.GLOBE, SHOT_KIND.DOMINO, SHOT_KIND.TAG_MARK]) {
      expect(SHOT_KIND_INFO[kind].key).toMatch(/^[a-zA-Z]+$/)
      expect(getShotVisualIndex(kind, SHOT_MOTION.STRAIGHT)).not.toBe(SHOT_VISUAL_FALLBACK)
    }
    for (const kind of [SHOT_KIND.ZONE_SOUP, SHOT_KIND.ZONE_CHALK, SHOT_KIND.DECAL_SHIELD]) expect(SHOT_KIND_INFO[kind]).toBeDefined()
  })

  it('ko·en·ja 이름이 있고 en·ja에 한글이 새지 않는다', () => {
    for (const id of IDS) {
      for (const [name, dict] of Object.entries({ ko, en, ja })) {
        const label = dict[`zombie.${id}`]
        expect(typeof label === 'string' && label.trim() !== '', `${name} ${id}`).toBe(true)
        if (name !== 'ko') expect(/[가-힣]/.test(label), `${name} ${id}`).toBe(false)
      }
    }
  })
})

describe('2차 10종 수치표', () => {
  it('ENEMY_STATS·시뮬레이션 표가 같은 정본을 쓰고 hp·xp는 host 값이다', () => {
    for (const id of IDS) {
      const code = ENEMY_TYPE_CODES[id]
      const stats = PROJECTILE_ZOMBIE_STATS[id]
      expect(ENEMY_STATS[id]).toBe(stats)
      expect(ENEMY_RUNTIME_HP[code]).toBe(Math.fround(stats.hp))
      expect(ENEMY_RUNTIME_SPEED[code]).toBe(Math.fround(stats.speed))
      expect(ENEMY_RUNTIME_DAMAGE[code]).toBe(Math.fround(stats.damage))
      expect(ENEMY_RUNTIME_XP[code]).toBe(Math.fround(stats.xp))
      expect(stats.xp).toBe(HOST_HP_XP[stats.hp])
      expect(JARMOB_HP_TYPES.has(id)).toBe(true)
      expect(isPooledEnemyType(id)).toBe(true)
    }
  })

  it('예고는 최소 500ms다', () => {
    for (const id of IDS) expect(PROJECTILE_ZOMBIE_VISUALS[id].telegraphMs).toBeGreaterThanOrEqual(500)
  })
})

describe('2차 10종 메커니즘(실제 런타임)', () => {
  it('E61 급식판: 일직선 돌진에 닿고, 멈춘 자리에 국물 웅덩이가 남는다. 옆으로 비키면 안 맞는다', () => {
    const world = createWorld()
    const i = spawn(world, 'E61', 0, 0)
    const hit = run(world, { player: { x: 0, z: 3.5 }, seconds: 3 })
    expect(hit.fires.length).toBeGreaterThanOrEqual(1)
    expect(hit.contactDamage).toBeGreaterThanOrEqual(PROJECTILE_ZOMBIE_BEHAVIORS[65].chargeDamage)
    expect(world.pool.posZ[i]).toBeGreaterThan(3)
    expect(countShots(world, (s) => world.shots.kind[s] === SHOT_KIND.ZONE_SOUP && world.shots.motion[s] === SHOT_MOTION.ZONE)).toBe(1)

    const dodge = createWorld()
    spawn(dodge, 'E61', 0, 0)
    const miss = run(dodge, { player: { x: 0, z: 3.5 }, seconds: 2.2, playerMove: sidestepAfterTelegraph() })
    expect(miss.telegraphs.length).toBeGreaterThanOrEqual(1)
    expect(miss.contactDamage).toBe(0)
  })

  it('E62 셔틀런: 같은 선을 왕복해 출발점 근처로 돌아온다', () => {
    const world = createWorld()
    const i = spawn(world, 'E62', 0, 0)
    let farthest = 0
    const out = run(world, { player: { x: 0, z: 2.5 }, seconds: 3.6, playerMove: () => { farthest = Math.max(farthest, world.pool.posZ[i]) } })
    expect(out.fires.length).toBe(1)
    // 몸은 플레이어를 뚫고 지나가지 못하고 부딪혀 멈춘 뒤 같은 선으로 3u 되돌아간다.
    expect(farthest).toBeGreaterThan(2.0)
    expect(world.pool.posZ[i]).toBeLessThan(0.5)
    expect(out.contactDamage).toBeGreaterThan(0)
  })

  it('E63 마이크줄: 맞으면 사수 쪽으로 끌리는 속도가 걸린다', () => {
    const world = createWorld()
    spawn(world, 'E63', 0, 0)
    const out = run(world, { player: { x: 0, z: 4 }, seconds: 3.2 })
    expect(out.projectileDamage).toBe(3)
    expect(world.impulse.ms).toBeGreaterThan(0)
    expect(world.impulse.vz).toBeLessThan(0)
    expect(Math.abs(world.impulse.vz) * world.impulse.ms / 1000).toBeLessThanOrEqual(1.4 + 1e-6)

    const dodge = createWorld()
    spawn(dodge, 'E63', 0, 0)
    const miss = run(dodge, { player: { x: 0, z: 4 }, seconds: 3.2, playerMove: sidestepAfterTelegraph() })
    expect(miss.projectileDamage).toBe(0)
    expect(dodge.impulse.ms).toBe(0)
  })

  // balanceqa 2026-11-07: E63 스폰을 늘리기 전 조건. 실제 이동 거리(1.4u / 제자리)는 components/Player.micCordPull.test.jsx.
  it('E63 마이크줄: 무적 중 명중(피해 경로가 false)은 끌림을 걸지 않는다', () => {
    const world = createWorld()
    spawn(world, 'E63', 0, 0)
    const out = run(world, { player: { x: 0, z: 4 }, seconds: 3.2, landed: false })
    expect(out.projectileHits).toBe(1)
    expect(world.impulse.ms).toBe(0)
  })

  it('E64 분필가루: 착지 자리에 머물면 지속 피해, 감속은 없다', () => {
    const world = createWorld()
    spawn(world, 'E64', 0, 0)
    const out = run(world, { player: { x: 0, z: 4 }, seconds: 5 })
    expect(out.projectileDamage).toBeGreaterThanOrEqual(6)
    expect(world.slow.ms).toBe(0)

    const dodge = createWorld()
    spawn(dodge, 'E64', 0, 0)
    const miss = run(dodge, { player: { x: 0, z: 4 }, seconds: 5, playerMove: sidestepAfterTelegraph() })
    expect(miss.projectileDamage).toBe(0)
  })

  it('E65 시험감독: 플레이어 자리 둘레 고리(2.4u)에 6장이 서고 가운데로 모인다', () => {
    const world = createWorld()
    spawn(world, 'E65', 0, 0)
    let ringSeen = 0
    const out = run(world, {
      player: { x: 0, z: 5 }, seconds: 3,
      playerMove: () => {
        ringSeen = Math.max(ringSeen, countShots(world, (s) => world.shots.kind[s] === SHOT_KIND.EXAM_PAPER
          && Math.abs(Math.hypot(world.shots.posX[s], world.shots.posZ[s] - 5) - 2.4) < 0.2))
      },
    })
    expect(ringSeen).toBe(6)
    expect(out.projectileDamage).toBeGreaterThan(0)

    const dodge = createWorld()
    spawn(dodge, 'E65', 0, 0)
    const miss = run(dodge, { player: { x: 0, z: 5 }, seconds: 3, playerMove: sidestepAfterTelegraph() })
    expect(miss.projectileDamage).toBe(0)
  })

  it('E66 플라나리아: 반피 이하에서 한 번만 둘로 갈라지고, 갈라진 개체는 다시 갈라지지 않는다', () => {
    const world = createWorld()
    const i = spawn(world, 'E66', 0, 0, 16)
    run(world, { player: { x: 0, z: 8 }, seconds: 1 })
    expect(world.pool.activeCount).toBe(1)
    world.pool.hp[i] = 7
    run(world, { player: { x: 0, z: 8 }, seconds: 1.5 })
    expect(world.pool.activeCount).toBe(2)
    for (let k = 0; k <= world.pool.highestActive; k += 1) {
      if (!world.pool.active[k]) continue
      expect(hasProjectileZombieSplit(world.pool, k)).toBe(true)
      expect(world.pool.hp[k]).toBe(7)
      expect(world.pool.maxHp[k]).toBe(8)
      world.pool.hp[k] = 2
    }
    run(world, { player: { x: 0, z: 8 }, seconds: 2 })
    expect(world.pool.activeCount).toBe(2)
  })

  it('E67 학생회 방패: 주변 아군 한 기에 한 번만 추가 체력 +5를 준다', () => {
    const world = createWorld()
    spawn(world, 'E67', 0, 0)
    const ally = spawn(world, 'E01', 1, 0)
    run(world, { player: { x: 0, z: 8 }, seconds: 4 })
    expect(isProjectileZombieShielded(world.pool, ally)).toBe(true)
    expect(world.pool.maxHp[ally]).toBe(8 + 5)
    expect(world.pool.hp[ally]).toBe(8 + 5)
    run(world, { player: { x: 0, z: 8 }, seconds: 8 })
    expect(world.pool.maxHp[ally]).toBe(8 + 5)
  })

  it('E68 지구본: 사수 둘레 1.1u에 지구본 3개가 돌고, 그 반경에 서 있으면 맞는다', () => {
    const world = createWorld()
    spawn(world, 'E68', 0, 0)
    let orbiting = 0
    const out = run(world, {
      player: { x: 0, z: 1.1 }, seconds: 3,
      playerMove: () => { orbiting = Math.max(orbiting, countShots(world, (s) => world.shots.motion[s] === SHOT_MOTION.ORBIT)) },
    })
    expect(orbiting).toBe(3)
    expect(out.projectileDamage).toBeGreaterThan(0)
  })

  it('E69 도미노: 조준선 위 5장이 차례로 터진다. 선에서 옆으로 비키면 안 맞는다', () => {
    const world = createWorld()
    spawn(world, 'E69', 0, 0)
    let placed = 0
    const out = run(world, { player: { x: 0, z: 3 }, seconds: 3, playerMove: () => { placed = Math.max(placed, countShots(world, (s) => world.shots.kind[s] === SHOT_KIND.DOMINO)) } })
    expect(placed).toBe(5)
    expect(out.projectileDamage).toBeGreaterThanOrEqual(4)

    const dodge = createWorld()
    spawn(dodge, 'E69', 0, 0)
    const miss = run(dodge, { player: { x: 0, z: 3 }, seconds: 3, playerMove: sidestepAfterTelegraph() })
    expect(miss.projectileDamage).toBe(0)
  })

  it('E70 술래: 찍어 둔 자리로 순간이동해 터치한다. 원 밖으로 나가면 안 맞는다', () => {
    const world = createWorld()
    const i = spawn(world, 'E70', 0, 0)
    const out = run(world, { player: { x: 0, z: 3 }, seconds: 2.6 })
    expect(out.fires.length).toBeGreaterThanOrEqual(1)
    expect(Math.hypot(world.pool.posX[i], world.pool.posZ[i] - 3)).toBeLessThan(0.6)
    expect(out.projectileDamage).toBeGreaterThanOrEqual(6)

    const dodge = createWorld()
    spawn(dodge, 'E70', 0, 0)
    const miss = run(dodge, { player: { x: 0, z: 3 }, seconds: 2.6, playerMove: sidestepAfterTelegraph() })
    expect(miss.projectileDamage).toBe(0)
  })
})

describe('2차 10종 스폰 배치(스1~5)', () => {
  const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']
  const NOVEL = ['E34', 'E35', 'E36', 'E37', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45', ...FIRST_BATCH]

  function debuts(ids) {
    const seen = new Map()
    for (const stage of STAGES) {
      for (const evt of [...getBurstEventsForStage(stage)].sort((a, b) => a.sec - b.sec)) {
        if (ids.includes(evt.type) && !seen.has(evt.type)) seen.set(evt.type, { stage, sec: evt.sec, count: evt.count })
      }
    }
    return seen
  }

  // 설계 규칙: 2차 10종의 첫 등장은 스1~4다(스5는 해금 전 계정이 많아 첫 조우 지점으로 쓰지 않는다).
  it('10종 전부 스1~4에 1마리 단독으로 첫 등장하고, 다른 신규 종과 같은 초에 겹치지 않는다', () => {
    const mine = debuts(IDS)
    expect([...mine.keys()].sort()).toEqual([...IDS].sort())
    const others = [...debuts(NOVEL).values()]
    for (const d of mine.values()) {
      expect(['stage1', 'stage2', 'stage3', 'stage4']).toContain(d.stage)
      expect(d.count).toBe(1)
      expect(d.sec).not.toBe(150)
      expect(d.sec).toBeLessThan(210)
      expect(others.filter((o) => o.stage === d.stage && o.sec === d.sec)).toEqual([])
      expect([...mine.values()].filter((o) => o.stage === d.stage && o.sec === d.sec)).toHaveLength(1)
    }
  })

  it('스테이지마다 1~2종, 총 배치는 소량(스테이지당 3마리 이하)이다', () => {
    for (const stage of STAGES) {
      const rows = getBurstEventsForStage(stage).filter((evt) => IDS.includes(evt.type))
      const types = new Set(rows.map((evt) => evt.type))
      expect(types.size, stage).toBeGreaterThanOrEqual(1)
      expect(types.size, stage).toBeLessThanOrEqual(3)
      expect(rows.reduce((sum, evt) => sum + evt.count, 0), stage).toBeLessThanOrEqual(3)
    }
  })

  it('스1에는 탄을 쏘는 종이 없다(몸 돌진 E62·분열 E66만)', () => {
    const stage1 = getBurstEventsForStage('stage1').filter((evt) => IDS.includes(evt.type)).map((evt) => evt.type)
    expect(new Set(stage1)).toEqual(new Set(['E62', 'E66']))
    for (const id of stage1) expect(PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]].shot).toBeNull()
  })

  it('스6~10 초안 표는 건드리지 않았다', () => {
    for (const stage of ['stage6', 'stage7', 'stage8', 'stage9', 'stage10']) {
      for (const evt of getBurstEventsForStage(stage)) expect(IDS).not.toContain(evt.type)
    }
  })
})
