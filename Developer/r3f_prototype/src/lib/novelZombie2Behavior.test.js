import { beforeEach, describe, expect, it } from 'vitest'
import { EnemyEntityPool, ENEMY_TYPE_CODES, ENEMY_TYPE_NAMES } from './enemyEntityPool.js'
import {
  ENEMY_RUNTIME_HP,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_SPAWN_REVEAL_MS,
  createEnemySimulationRuntime,
} from './enemySimulation.js'
import { clearExpansionAttacks, expansionAttackSnapshots } from './expansionAttackRuntime.js'
import {
  E89_COMMAND,
  E93_SHADOW,
  E96_DRIBBLE,
  E99_BURST_PATTERN,
  E103_COFFEE,
  E105_PAIR,
  N2_STATE_ATTACK,
  N2_STATE_STUN,
  N2_STATE_TELEGRAPH,
  isBuffableTypeCode,
  isCommandableTypeCode,
} from './novelZombie2Behavior.js'
import {
  NOVEL2_CHIEF_IDS,
  NOVEL2_FIRST_TYPE_CODE,
  NOVEL2_ROWS,
  NOVEL2_TYPE_IDS,
  NOVEL2_WAVE1_IDS,
  NOVEL2_WAVE2_IDS,
  NOVEL2_WAVE3_IDS,
  NOVEL2_ZOMBIE_STATS,
} from './novelZombie2Content.js'
import { CHIEF_ELITE_BONUS, admitChiefSpawn, createChiefDebutLedger, isChiefType } from './stageChiefContent.js'
import { isBossType } from './burstEvents.js'
import { getStageRotationRoster } from './stageRosterRotation.js'
import { NOVEL2_PLACEHOLDER_ALIASES, NOVEL2_VISUALS } from './novelZombie2Visuals.js'
import { MINI_ZOMBIE_VISUALS } from './miniZombieRoster.js'

// 2차 신규 좀비 1차 구현분(E89·E93·E94·E96·E97·E99·E103·E105)의 행동 QA.
// 종마다 못박는 것: (1) 예고 중 피해 0, (2) 예고 때 확정된 방향·자리는 그 뒤 플레이어를 따라가지 않는다,
// (3) 예고를 보고 옆으로 비키면 피해 0, (4) 가만히 선 플레이어는 60초 안에 반드시 맞는다(공격형만),
// (5) 버프·지휘 대상에서 마틸다·보스·치프·E08이 빠진다.

const DT = 1 / 60
const BOUNDS = { halfX: 9.36, halfZ: 16 }

beforeEach(() => {
  clearExpansionAttacks()
})

function spawn(pool, id, x, z, { hp, spawnTimer = ENEMY_SPAWN_REVEAL_MS + 1 } = {}) {
  const code = ENEMY_TYPE_CODES[id]
  const life = hp ?? (ENEMY_RUNTIME_HP[code] || 10)
  const handle = pool.spawn({ type: id, x, y: 0, z, hp: life, maxHp: life, visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer })
  expect(handle, `${id} spawn`).not.toBeNull()
  return handle
}

function step(runtime, pool, player, extra = {}) {
  let damage = 0
  runtime.step(pool, {
    delta: DT, playerX: player.x, playerZ: player.z, ...BOUNDS, elapsedSec: 30, activeProjectileCount: 0,
    stageId: extra.stageId ?? 'stage1',
    onContact: (_i, _g, _x, _y, _z, value) => { damage += value },
  })
  return damage
}

function stationaryDamage(id, { startX = -3, seconds = 60, stageId = 'stage1' } = {}) {
  const pool = new EnemyEntityPool()
  const runtime = createEnemySimulationRuntime()
  spawn(pool, id, startX, 0, { hp: 1e9, spawnTimer: 4000 })
  let total = 0
  for (let frame = 0; frame < seconds / DT; frame += 1) total += step(runtime, pool, { x: 0, z: 0 }, { stageId })
  return total
}

describe('2차 신규 좀비 등록', () => {
  it('18개 id를 typeCode 94~111에 끝에만 붙여 예약하고, 스탯은 1차 8종 + 2차 4종 + 3차 치프 3종만 갖는다', () => {
    NOVEL2_TYPE_IDS.forEach((id, i) => {
      expect(ENEMY_TYPE_CODES[id]).toBe(NOVEL2_FIRST_TYPE_CODE + i)
      expect(ENEMY_TYPE_NAMES[NOVEL2_FIRST_TYPE_CODE + i]).toBe(id)
    })
    expect(ENEMY_TYPE_CODES.B10).toBe(75)
    expect(Object.keys(NOVEL2_ZOMBIE_STATS).sort()).toEqual([...NOVEL2_WAVE1_IDS, ...NOVEL2_WAVE2_IDS, ...NOVEL2_WAVE3_IDS].sort())
    for (const id of [...NOVEL2_WAVE1_IDS, ...NOVEL2_WAVE2_IDS, ...NOVEL2_WAVE3_IDS]) {
      expect(ENEMY_RUNTIME_HP[ENEMY_TYPE_CODES[id]], id).toBe(NOVEL2_ZOMBIE_STATS[id].hp)
      // 비주얼은 visualId 뒤에 있다(행동은 비주얼을 모른다). 몸은 Kenney Mini 몸체 표(MiniZombieLayer)가 그린다.
      // 옛 자리표시 별칭(NOVEL2_PLACEHOLDER_ALIASES)은 데이터로만 남아 있다(렌더 경로에서는 쓰지 않는다).
      expect(MINI_ZOMBIE_VISUALS[NOVEL2_ROWS[id].visualId]?.id, `${id} Kenney Mini body`).toBe(id)
      expect(NOVEL2_PLACEHOLDER_ALIASES[id], `${id} placeholder data kept`).toMatch(/^E(3[4-9]|4[0-5])$/)
    }
  })

  it('일반 종은 host와 같은 HP다(스테이지 총 HP 불변 원칙)', () => {
    expect(NOVEL2_ZOMBIE_STATS.E93.hp).toBe(10) // E03
    expect(NOVEL2_ZOMBIE_STATS.E94.hp).toBe(16) // E07
    expect(NOVEL2_ZOMBIE_STATS.E96.hp).toBe(16) // E07
    expect(NOVEL2_ZOMBIE_STATS.E97.hp).toBe(10) // E03
    expect(NOVEL2_ZOMBIE_STATS.E99.hp).toBe(70) // E05
    expect(NOVEL2_ZOMBIE_STATS.E103.hp).toBe(32) // E04
    expect(NOVEL2_ZOMBIE_STATS.E105.hp).toBe(30) // E19(Stage 6 절대값)
  })

  it('Kenney 몸체 표는 이동·의료 보조기구를 쓰지 않는다', () => {
    const banned = /wheelchair|cane|crutch|hearing/
    for (const visual of Object.values(NOVEL2_VISUALS)) {
      expect(JSON.stringify(visual.kenney)).not.toMatch(banned)
    }
  })
})

describe('치프 계층', () => {
  it('치프는 보스가 아니고, 데뷔는 런마다 1회이며, 엘리트 보상은 교과서 2 × 45XP + 골드 2다', () => {
    for (const id of NOVEL2_CHIEF_IDS) {
      expect(isChiefType(id)).toBe(true)
      expect(isBossType(id)).toBe(false)
    }
    expect(CHIEF_ELITE_BONUS.E89).toEqual({ textbook: 2, textbookXp: 45, gold: 2 })
    expect(NOVEL2_ZOMBIE_STATS.E89.hp).toBe(120) // 2026-11-15 balanceqa wave 2 권고(400 → 240 → 120)
    const ledger = createChiefDebutLedger()
    expect(admitChiefSpawn(ledger, 'E89')).toBe(true)
    expect(admitChiefSpawn(ledger, 'E89')).toBe(false)
    expect(admitChiefSpawn(ledger, 'E01')).toBe(true)
    expect(admitChiefSpawn(ledger, 'E01')).toBe(true)
  })

  it('치프와 E105(쌍 단위)은 로스터 순환에 들어가지 않고, 일반 신규 종은 들어간다', () => {
    expect(getStageRotationRoster('stage1')).not.toContain('E89')
    expect(getStageRotationRoster('stage2')).toEqual(expect.arrayContaining(['E93', 'E94']))
    expect(getStageRotationRoster('stage3')).toEqual(expect.arrayContaining(['E96', 'E97']))
    expect(getStageRotationRoster('stage4')).toContain('E99')
    expect(getStageRotationRoster('stage5')).toContain('E103')
    expect(getStageRotationRoster('stage6')).not.toContain('E105')
  })
})

describe('E89 반장 좀비(치프) — 차렷! 경례!', () => {
  // 반장 (-3.5, 0), 부하 E01 (-1.9, 0), 플레이어 (0, 0). 부하는 반장 반경 4u 안이다.
  function setup() {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E89', -3.5, 0, { hp: 1e6, spawnTimer: E89_COMMAND.firstDelayMs + 1 })
    spawn(pool, 'E01', -1.9, 0, { hp: 1e6 })
    return { pool, runtime }
  }

  function runToFreeze(pool, runtime, player) {
    let telegraphDamage = 0
    let sawTelegraph = false
    for (let frame = 0; frame < 600; frame += 1) {
      const damage = step(runtime, pool, player)
      if (pool.state[0] === N2_STATE_TELEGRAPH) { sawTelegraph = true; telegraphDamage += damage }
      if (pool.state[1] === 2) return { sawTelegraph, telegraphDamage }
    }
    throw new Error('지휘가 내려지지 않았다')
  }

  it('예고(노란 원 r 4u, 1.2초) 중 피해 0 → 동결 → 확정 방향 1.6u 돌진', () => {
    const { pool, runtime } = setup()
    const player = { x: 0, z: 0 }
    // 예고 시작 프레임까지
    let snapshot = null
    for (let frame = 0; frame < 120 && !snapshot; frame += 1) {
      step(runtime, pool, player)
      snapshot = [...expansionAttackSnapshots.values()].find((s) => s.patternId === 'e89_command') ?? null
    }
    expect(snapshot).not.toBeNull()
    expect(snapshot).toMatchObject({ shape: 'disk', rangeUnits: E89_COMMAND.radius, damage: 0 })
    const { sawTelegraph, telegraphDamage } = runToFreeze(pool, runtime, player)
    expect(sawTelegraph).toBe(true)
    expect(telegraphDamage).toBe(0)
    // 동결 0.8초: 움직이지 않는다
    const fx = pool.posX[1]
    for (let frame = 0; frame < Math.floor(E89_COMMAND.freezeMs / 1000 / DT) - 2; frame += 1) step(runtime, pool, player)
    expect(Math.abs(pool.posX[1] - fx)).toBeLessThan(1e-3)
  })

  it('동결 순간 확정된 방향은 플레이어가 움직여도 바뀌지 않고, 옆으로 비키면 돌진 피해 0', () => {
    const { pool, runtime } = setup()
    const player = { x: 0, z: 0 }
    runToFreeze(pool, runtime, player)
    const startX = pool.posX[1]
    const startZ = pool.posZ[1]
    // 동결 중 옆으로 1.5u 비킨다
    player.z = 1.5
    let lungeDamage = 0
    let sawLunge = false
    for (let frame = 0; frame < (E89_COMMAND.freezeMs + E89_COMMAND.lungeMs) / 1000 / DT + 2; frame += 1) {
      const damage = step(runtime, pool, player)
      if (pool.state[1] === 3) { sawLunge = true; lungeDamage += damage }
    }
    expect(sawLunge).toBe(true)
    expect(lungeDamage).toBe(0)
    // 돌진은 +X(동결 순간의 플레이어 방향)로만 갔다 — z로 따라가지 않았다
    expect(pool.posX[1] - startX).toBeGreaterThan(1.2)
    expect(Math.abs(pool.posZ[1] - startZ)).toBeLessThan(0.2)
  })

  it('가만히 서 있으면 돌진에 맞는다', () => {
    const { pool, runtime } = setup()
    const player = { x: 0, z: 0 }
    runToFreeze(pool, runtime, player)
    let damage = 0
    for (let frame = 0; frame < 90; frame += 1) damage += step(runtime, pool, player)
    expect(damage).toBeGreaterThan(0)
  })

  it('반장이 죽으면 동결·돌진이 즉시 풀린다', () => {
    const { pool, runtime } = setup()
    const player = { x: 0, z: 0 }
    runToFreeze(pool, runtime, player)
    runtime.applyHitIndex(pool, 0, pool.generation[0], 1e9)
    step(runtime, pool, player)
    expect(pool.state[1]).not.toBe(2)
    expect(runtime.novel2.isCommanded(1)).toBe(false)
  })

  it('지휘 대상은 단순 추격 잡몹뿐이다(E08·E05·치프·신형 제외)', () => {
    for (const id of ['E01', 'E02', 'E03', 'E06', 'E07']) expect(isCommandableTypeCode(ENEMY_TYPE_CODES[id]), id).toBe(true)
    for (const id of ['E08', 'E05', 'E89', 'E34', 'E46', 'E93', 'E19', 'RZL', 'B01']) expect(isCommandableTypeCode(ENEMY_TYPE_CODES[id]), id).toBe(false)
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E89', -3.5, 0, { hp: 1e6, spawnTimer: E89_COMMAND.firstDelayMs + 1 })
    spawn(pool, 'E08', -2.5, 0, { hp: 1e6 })
    for (let frame = 0; frame < 300; frame += 1) step(runtime, pool, { x: 0, z: 0 })
    // 지휘할 잡몹이 없으면 예고조차 시작하지 않는다
    expect([...expansionAttackSnapshots.values()].some((s) => s.patternId === 'e89_command')).toBe(false)
    expect(runtime.novel2.isCommanded(1)).toBe(false)
  })

  it('가만히 선 플레이어는 60초 안에 반장 몸에 맞는다', () => {
    expect(stationaryDamage('E89')).toBeGreaterThan(0)
  })
})

describe('E93 그림자밟기 — 2초 전 플레이어 위치로 걷는다', () => {
  it('목표는 현재가 아니라 2초 전 플레이어 위치다(확정된 과거 좌표를 따라간다)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E93', -6, 0)
    const player = { x: 0, z: 0 }
    for (let frame = 0; frame < 180; frame += 1) step(runtime, pool, player, { stageId: 'stage2' })
    player.z = 5 // 순간 이동
    step(runtime, pool, player, { stageId: 'stage2' })
    const target = runtime.novel2.shadowTargetInto({ x: 0, z: 0 }, player.x, player.z)
    expect(target.z).toBeCloseTo(0, 5)
    // 이동 방향도 옛 자리(+X)를 향한다
    expect(Math.abs(pool.velZ[0])).toBeLessThan(Math.abs(pool.velX[0]))
    expect(E93_SHADOW.lagMs).toBe(2000)
  })

  it('계속 한 방향으로 걸으면 닿지 않는다(옆으로 비키기 = 0 피해)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E93', -3, 0)
    const player = { x: 0, z: -12 }
    let damage = 0
    for (let frame = 0; frame < 8 / DT; frame += 1) {
      player.z = -12 + frame * DT * 3.0 // 3u/s 직진
      damage += step(runtime, pool, player, { stageId: 'stage2' })
    }
    expect(damage).toBe(0)
  })

  it('가만히 선 플레이어는 60초 안에 맞는다', () => {
    expect(stationaryDamage('E93', { stageId: 'stage2' })).toBeGreaterThan(0)
  })
})

describe('E96 드리블 — 전역 박자(걸음·걸음·예고·돌진)', () => {
  it('예고(박 3) 중에는 몸이 닿아도 피해 0이고, 예고 시작에 확정된 방향으로만 돌진한다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E96', -2, 0, { hp: 1e6 })
    const player = { x: 0, z: 0 }
    // 예고 시작까지
    let frames = 0
    while (pool.state[0] !== N2_STATE_TELEGRAPH && frames < 600) { step(runtime, pool, player, { stageId: 'stage3' }); frames += 1 }
    expect(pool.state[0]).toBe(N2_STATE_TELEGRAPH)
    const lockX = pool.runDirX[0]
    const lockZ = pool.runDirZ[0]
    // 예고 중 몸을 플레이어에 붙여도 피해 0
    let telegraphDamage = 0
    while (pool.state[0] === N2_STATE_TELEGRAPH) {
      pool.posX[0] = player.x - 0.2
      pool.posZ[0] = player.z
      const damage = step(runtime, pool, player, { stageId: 'stage3' })
      // 예고 마지막 프레임에 돌진(상태 9)으로 넘어가며 닿은 피해는 공격 단계 피해다.
      if (pool.state[0] === N2_STATE_TELEGRAPH) telegraphDamage += damage
    }
    expect(telegraphDamage).toBe(0)
    expect(pool.state[0]).toBe(N2_STATE_ATTACK)
    // 돌진 중 플레이어가 움직여도 방향은 그대로
    player.z = 4
    step(runtime, pool, player, { stageId: 'stage3' })
    expect(pool.runDirX[0]).toBe(lockX)
    expect(pool.runDirZ[0]).toBe(lockZ)
    const speed = Math.hypot(pool.velX[0], pool.velZ[0])
    expect(speed).toBeGreaterThan(E96_DRIBBLE.lungeSpeed * 0.9)
  })

  it('예고를 보고 옆으로 1.5u 비키면 돌진 구간 피해 0', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    // 첫 예고(1.5초)에 몸이 아직 닿지 않는 거리에서 시작한다(걸음 2박 = 1.0u).
    spawn(pool, 'E96', -3.0, 0, { hp: 1e6 })
    const player = { x: 0, z: 0 }
    while (pool.state[0] !== N2_STATE_TELEGRAPH) step(runtime, pool, player, { stageId: 'stage3' })
    player.z = 1.5
    let lungeDamage = 0
    let sawAttack = false
    let frames = 0
    while (frames < 120) {
      const damage = step(runtime, pool, player, { stageId: 'stage3' })
      if (pool.state[0] === N2_STATE_ATTACK) { lungeDamage += damage; sawAttack = true }
      if (frames > 30 && pool.state[0] !== N2_STATE_ATTACK && pool.state[0] !== N2_STATE_TELEGRAPH) break
      frames += 1
    }
    expect(sawAttack).toBe(true)
    expect(lungeDamage).toBe(0)
  })

  it('같은 종 전원이 같은 프레임에 예고에 들어간다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E96', -4, 0)
    spawn(pool, 'E96', 4, 3)
    for (let frame = 0; frame < 200; frame += 1) {
      step(runtime, pool, { x: 0, z: 0 }, { stageId: 'stage3' })
      expect(pool.state[0] === N2_STATE_TELEGRAPH).toBe(pool.state[1] === N2_STATE_TELEGRAPH)
    }
  })

  it('가만히 선 플레이어는 60초 안에 맞는다', () => {
    expect(stationaryDamage('E96', { stageId: 'stage3' })).toBeGreaterThan(0)
  })
})

describe('E94 대걸레(확장 rootline) · E97 뜀틀(확장 hop)', () => {
  function attackRun(id, { sidestep = 0, stageId }) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, id, -1.5, 0, { hp: 1e6 })
    const player = { x: 0, z: 0 }
    let windupDamage = 0
    let activeDamage = 0
    let snapshot = null
    let lockedYaw = null
    for (let frame = 0; frame < 20 / DT; frame += 1) {
      const current = [...expansionAttackSnapshots.values()].find((s) => s.type === id)
      if (current && !snapshot) {
        snapshot = current
        lockedYaw = current.yaw
        player.z += sidestep
      }
      const damage = step(runtime, pool, player, { stageId })
      if (snapshot) {
        if (snapshot.phase === 'windup') windupDamage += damage
        else if (snapshot.phase === 'active') activeDamage += damage
        if (snapshot.phase === 'recovery' || !expansionAttackSnapshots.has(snapshot.key)) break
      }
    }
    return { snapshot, windupDamage, activeDamage, lockedYaw }
  }

  for (const [id, stageId, shape] of [['E94', 'stage2', 'line'], ['E97', 'stage3', 'disk']]) {
    it(`${id}: 예고 중 피해 0 · 확정 방향 불변 · 탈출 인증 · 가만히 서면 맞는다`, () => {
      const run = attackRun(id, { stageId })
      expect(run.snapshot, `${id} 공격 스냅샷`).not.toBeNull()
      expect(run.snapshot.escapeChannel).toBeTruthy()
      expect(run.windupDamage).toBe(0)
      expect(run.snapshot.yaw).toBe(run.lockedYaw)
      expect(run.snapshot.damage).toBe(9)
      expect(['line', 'disk']).toContain(shape)
      expect(stationaryDamage(id, { startX: -2.5, stageId })).toBeGreaterThan(0)
    })

    it(`${id}: 예고를 보고 옆으로 1.6u 비키면 그 공격의 피해 0`, () => {
      const run = attackRun(id, { stageId, sidestep: 1.6 })
      expect(run.snapshot).not.toBeNull()
      expect(run.activeDamage).toBe(0)
    })
  }
})

describe('E99 압력밥솥 — 죽은 자리 폭발', () => {
  function killAndWatch(sidestep) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    // Stage 4 중앙(0,0)은 압력솥 장애물 자리라 플레이어가 설 수 없다 — 빈 바닥 (0, 6)에서 잰다.
    spawn(pool, 'E99', -1.0, 6, { hp: 70 })
    const player = { x: 0, z: 6 }
    step(runtime, pool, player, { stageId: 'stage4' })
    runtime.applyHitIndex(pool, 0, pool.generation[0], 999)
    const burst = [...expansionAttackSnapshots.values()].find((s) => s.type === 'E99')
    player.z += sidestep
    let windupDamage = 0
    let total = 0
    for (let frame = 0; frame < 2.5 / DT; frame += 1) {
      const phase = burst?.phase
      const damage = step(runtime, pool, player, { stageId: 'stage4' })
      if (phase === 'windup' && burst.phase === 'windup') windupDamage += damage
      total += damage
    }
    return { burst, windupDamage, total, runtime }
  }

  it('1.2초 예고 중 피해 0, 가만히 있으면 12, 탈출 인증이 있다', () => {
    const run = killAndWatch(0)
    expect(run.burst).toBeTruthy()
    expect(run.burst).toMatchObject({ shape: 'disk', rangeUnits: E99_BURST_PATTERN.rangeUnits, windupMs: 1200 })
    expect(run.burst.escapeChannel).toBeTruthy()
    expect(run.windupDamage).toBe(0)
    expect(run.total).toBe(12)
    expect(expansionAttackSnapshots.has(run.burst.key)).toBe(false) // 끝나면 지운다
  })

  it('예고 동안 1.6u 비키면 피해 0(반경 1.4u)', () => {
    expect(killAndWatch(1.6).total).toBe(0)
  })

  it('가만히 선 플레이어는 60초 안에 몸에 맞는다', () => {
    expect(stationaryDamage('E99', { stageId: 'stage4' })).toBeGreaterThan(0)
  })
})

describe('E103 커피 셔틀 — 아군 버프(공격 없음)', () => {
  it('버프 대상에서 마틸다(풀 밖)·보스·치프·E08·런 크루·자기 자신이 빠진다', () => {
    expect(isBuffableTypeCode(ENEMY_TYPE_CODES.E01)).toBe(true)
    expect(isBuffableTypeCode(ENEMY_TYPE_CODES.E05)).toBe(true)
    expect(isBuffableTypeCode(ENEMY_TYPE_CODES.E93)).toBe(true)
    for (const id of ['E08', 'E89', 'E92', 'E95', 'E98', 'E101', 'E104', 'E103', 'RZL', 'RZC', 'RZT', 'RZG', 'B01', 'B02', 'B03', 'B04', 'B05', 'B10']) {
      expect(isBuffableTypeCode(ENEMY_TYPE_CODES[id]), id).toBe(false)
    }
    // 마틸다는 풀 타입이 아니다(React 특수 경로) — 코드가 없다.
    expect(ENEMY_TYPE_CODES.Matilda).toBeUndefined()
    expect(isBuffableTypeCode(0)).toBe(false)
  })

  it('예고 0.8초 중 피해 0 → 가까운 일반 좀비 1기 이동 ×1.35(5초), E08·치프는 가까워도 고르지 않는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E103', -5, 0, { spawnTimer: E103_COFFEE.firstDelayMs + 1 })
    spawn(pool, 'E08', -5, 1, { hp: 1e6 })
    spawn(pool, 'E89', -5, -1, { hp: 1e6, spawnTimer: 0 })
    spawn(pool, 'E01', -5, 2.5, { hp: 1e6 })
    const player = { x: 0, z: 0 }
    let telegraphDamage = 0
    let frames = 0
    while (pool.state[0] !== N2_STATE_TELEGRAPH && frames < 120) { step(runtime, pool, player, { stageId: 'stage5' }); frames += 1 }
    expect(pool.state[0]).toBe(N2_STATE_TELEGRAPH)
    while (pool.state[0] === N2_STATE_TELEGRAPH) telegraphDamage += step(runtime, pool, player, { stageId: 'stage5' })
    expect(telegraphDamage).toBe(0)
    expect(runtime.novel2.buffMs[3]).toBeGreaterThan(E103_COFFEE.buffMs - 100)
    expect(runtime.novel2.buffMs[1]).toBe(0)
    expect(runtime.novel2.buffMs[2]).toBe(0)
    expect(runtime.novel2.speedMultiplier(3)).toBe(E103_COFFEE.buffSpeedMul)
  })

  it('셔틀은 4~6u 거리를 유지하는 지원형이라 가만히 선 플레이어를 직접 때리지 않는다', () => {
    expect(stationaryDamage('E103', { startX: -5, stageId: 'stage5' })).toBe(0)
  })
})

describe('E105 2인3각 — 두 몸 연결', () => {
  it('둘이 짝을 짓고, 한쪽이 죽으면 남은 쪽이 2초 넘어진다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E105', -4, 0, { hp: 1e6 })
    spawn(pool, 'E105', -4, 0.6, { hp: 1e6 })
    const player = { x: 0, z: 0 }
    step(runtime, pool, player, { stageId: 'stage6' })
    expect(runtime.novel2.partner[0]).toBe(1)
    expect(runtime.novel2.partner[1]).toBe(0)
    runtime.applyHitIndex(pool, 1, pool.generation[1], 1e9)
    step(runtime, pool, player, { stageId: 'stage6' })
    expect(pool.state[0]).toBe(N2_STATE_STUN)
    const x = pool.posX[0]
    for (let frame = 0; frame < (E105_PAIR.tripMs - 100) / 1000 / DT; frame += 1) step(runtime, pool, player, { stageId: 'stage6' })
    expect(pool.posX[0]).toBeCloseTo(x, 3)
    for (let frame = 0; frame < 30; frame += 1) step(runtime, pool, player, { stageId: 'stage6' })
    expect(pool.state[0]).not.toBe(N2_STATE_STUN)
  })

  it('가만히 선 플레이어는 60초 안에 맞는다(쌍)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E105', -3, 0, { hp: 1e9 })
    spawn(pool, 'E105', -3, 0.6, { hp: 1e9 })
    let damage = 0
    for (let frame = 0; frame < 60 / DT; frame += 1) damage += step(runtime, pool, { x: 0, z: 0 }, { stageId: 'stage6' })
    expect(damage).toBeGreaterThan(0)
  })
})
