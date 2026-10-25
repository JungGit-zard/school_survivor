import { describe, it, expect } from 'vitest'
import { EnemyEntityPool } from './enemyEntityPool.js'
import { ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import {
  ENEMY_RUNTIME_CONTACT_DIST,
  ENEMY_RUNTIME_DAMAGE,
  ENEMY_RUNTIME_HP,
  ENEMY_RUNTIME_SPEED,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_SPAWN_REVEAL_MS,
  createEnemySimulationRuntime,
  enemyContactDistance,
} from './enemySimulation.js'
import {
  ENEMY_STATE_NOVEL_APPROACH,
  ENEMY_STATE_NOVEL_ATTACK,
  ENEMY_STATE_NOVEL_ATTACK_ALT,
  ENEMY_STATE_NOVEL_RECOVER,
  ENEMY_STATE_NOVEL_RECOVER_ALT,
  ENEMY_STATE_NOVEL_TELEGRAPH,
  ENEMY_STATE_NOVEL_TELEGRAPH_ALT,
  NOVEL_BEHAVIORS,
  NOVEL_TYPE_MAX,
  NOVEL_TYPE_MIN,
  createNovelBehaviorResult,
  isNovelAttackState,
  isNovelTelegraphState,
  isNovelZombieType,
  stepNovelZombieBehavior,
} from './novelZombieBehavior.js'

// Track B 신규 12종(E34~E45)의 행동 QA.
// 기획 문서 Planner/stage_zombie_original_concepts_20261025.md의 Balance_QA_Mini 인계 메모가
// 지목한 세 가지를 코드로 못박는다:
//   (1) 예고가 피격 창보다 먼저 온다,
//   (2) 예고 중에는 피해가 0이다,
//   (3) 일시정지·재시작·사망·풀 슬롯 재사용에서 목표 방향·예고 포즈·공격 단계가 남지 않는다.

const NOVEL_IDS = ['E34', 'E35', 'E36', 'E37', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45']
const BOUNDS = { halfX: 9.36, halfZ: 16 }
const CASES = NOVEL_IDS.map((id) => [id, ENEMY_TYPE_CODES[id]])

function spawn(pool, id, { x = 0, z = 0 } = {}) {
  const code = ENEMY_TYPE_CODES[id]
  const hp = ENEMY_RUNTIME_HP[code]
  const handle = pool.spawn({
    type: id, x, y: 0, z, hp, maxHp: hp,
    visualScale: ENEMY_SIZE_MULTIPLIER,
    spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1,
  })
  expect(handle, `${id} 스폰`).not.toBeNull()
  return handle
}

/**
 * 한 슬롯을 지정 프레임 수만큼 돌리고, 프레임마다 (state, 이번 프레임 피해)를 기록한다.
 * 플레이어는 고정 좌표. 적이 플레이어를 향해 접근하도록 적을 플레이어 왼쪽에 둔다.
 */
function run(pool, runtime, frames, { playerX = 0, playerZ = 0, delta = 1 / 60 } = {}) {
  const log = []
  for (let frame = 0; frame < frames; frame += 1) {
    let frameDamage = 0
    runtime.step(pool, {
      delta, playerX, playerZ, ...BOUNDS, elapsedSec: 10 + frame * delta,
      activeProjectileCount: 0,
      onContact: (_i, _g, _x, _y, _z, value) => { frameDamage += value },
    })
    log.push({ frame, state: pool.state[0], damage: frameDamage, hp: pool.hp[0] })
  }
  return log
}

describe('Track B 신규 12종 등록', () => {
  it('37~48에 12종이 연속으로 등록되고 각 행동 파라미터가 완결돼 있다', () => {
    expect(NOVEL_TYPE_MIN).toBe(37)
    expect(NOVEL_TYPE_MAX).toBe(48)
    for (let code = NOVEL_TYPE_MIN; code <= NOVEL_TYPE_MAX; code += 1) {
      expect(isNovelZombieType(code), `code ${code}`).toBe(true)
      const p = NOVEL_BEHAVIORS[code]
      expect(p.telegraphMs, `${p.id} telegraphMs`).toBeGreaterThanOrEqual(300)
      expect(p.attackMs, `${p.id} attackMs`).toBeGreaterThan(0)
      expect(p.recoveryMs, `${p.id} recoveryMs`).toBeGreaterThan(0)
      expect(p.trigger, `${p.id} trigger`).toBeGreaterThan(0)
      expect(p.damageFrom, `${p.id} damageFrom`).toBeGreaterThanOrEqual(0)
      expect(p.damageFrom, `${p.id} damageFrom`).toBeLessThan(1)
    }
    expect(isNovelZombieType(36)).toBe(false)
    expect(isNovelZombieType(49)).toBe(false)
  })

  it('12종의 예고-공격-회복 조합이 서로 겹치지 않는다 (이름만 다른 적 금지)', () => {
    const fingerprints = new Set()
    for (let code = NOVEL_TYPE_MIN; code <= NOVEL_TYPE_MAX; code += 1) {
      const p = NOVEL_BEHAVIORS[code]
      fingerprints.add([p.approach, p.telegraphMove, p.attack, p.telegraphMs, p.attackMs, p.recoveryMs].join('|'))
    }
    expect(fingerprints.size).toBe(12)
  })

  it('투사체·원거리 파라미터를 한 종도 갖지 않는다 (Stage 1 원거리 0 포함)', () => {
    for (let code = NOVEL_TYPE_MIN; code <= NOVEL_TYPE_MAX; code += 1) {
      const p = NOVEL_BEHAVIORS[code]
      expect(p.ranged).toBeUndefined()
      expect(p.rangedCooldown).toBeUndefined()
      expect(p.rangedSpeed).toBeUndefined()
      expect(p.charger).toBeUndefined()
      expect(p.runCrew).toBeUndefined()
    }
  })
})

describe.each(CASES)('%s 예고 → 공격 순서와 예고 중 무피해', (id, code) => {
  const p = NOVEL_BEHAVIORS[code]

  it('예고가 반드시 첫 피격 창보다 먼저 나오고, 예고 프레임의 피해는 0이다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    // trigger 안쪽에서 시작시켜 첫 주기를 바로 보게 한다.
    const handle = spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })
    expect(handle.index).toBe(0)

    const log = run(pool, runtime, 220)
    const firstTelegraph = log.findIndex((row) => isNovelTelegraphState(row.state))
    const firstAttack = log.findIndex((row) => isNovelAttackState(row.state))
    const firstDamage = log.findIndex((row) => row.damage > 0)

    expect(firstTelegraph, `${id}: 예고 단계가 전혀 나오지 않았다`).toBeGreaterThanOrEqual(0)
    expect(firstAttack, `${id}: 공격 단계가 전혀 나오지 않았다`).toBeGreaterThan(firstTelegraph)
    // 예고 프레임 전체에서 피해가 0이어야 한다 — 기획 "예고 중 피해가 발생하지 않는다".
    for (const row of log) {
      if (isNovelTelegraphState(row.state)) expect(row.damage, `${id} frame ${row.frame}`).toBe(0)
      if (row.state === ENEMY_STATE_NOVEL_APPROACH) expect(row.damage, `${id} frame ${row.frame}`).toBe(0)
      if (row.state === ENEMY_STATE_NOVEL_RECOVER || row.state === ENEMY_STATE_NOVEL_RECOVER_ALT) {
        expect(row.damage, `${id} frame ${row.frame}`).toBe(0)
      }
    }
    if (firstDamage >= 0) {
      expect(firstDamage, `${id}: 예고보다 먼저 맞았다`).toBeGreaterThan(firstTelegraph)
      expect(isNovelAttackState(log[firstDamage].state), `${id}: 공격 단계가 아닌데 피해가 났다`).toBe(true)
    }
  })

  it('예고 시간이 60fps에서 최소 18프레임(300ms) 이상 유지된다 — 모바일에서도 읽힌다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })
    const log = run(pool, runtime, 220)
    const telegraphFrames = log.filter((row) => isNovelTelegraphState(row.state)).length
    expect(telegraphFrames, `${id} 예고 프레임 수`).toBeGreaterThanOrEqual(18)
  })

  it('한 주기당 피격은 접촉 쿨다운에 묶여 1회를 넘지 않는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })
    const log = run(pool, runtime, 220)
    // 공격 단계가 끊긴 지점을 주기 경계로 삼아 주기별 피격 횟수를 센다.
    let cycleHits = 0
    let maxCycleHits = 0
    let inAttack = false
    for (const row of log) {
      const attacking = isNovelAttackState(row.state)
      if (attacking && !inAttack) cycleHits = 0
      if (attacking && row.damage > 0) cycleHits += 1
      if (!attacking && inAttack) maxCycleHits = Math.max(maxCycleHits, cycleHits)
      inAttack = attacking
    }
    maxCycleHits = Math.max(maxCycleHits, cycleHits)
    expect(maxCycleHits, `${id} 한 주기 최대 피격`).toBeLessThanOrEqual(1)
  })
})

describe('공격 방향은 예고가 끝나는 순간 1회 확정되고 그 뒤 추적하지 않는다', () => {
  it.each(CASES)('%s는 공격 중 저장된 방향을 바꾸지 않는다', (id, code) => {
    const p = NOVEL_BEHAVIORS[code]
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })

    let lockedX = null
    let lockedZ = null
    let checked = false
    for (let frame = 0; frame < 220; frame += 1) {
      // 플레이어를 매 프레임 옮겨 "추적하면 방향이 변할" 조건을 만든다.
      const playerZ = Math.sin(frame * 0.21) * 2.5
      runtime.step(pool, { delta: 1 / 60, playerX: 0, playerZ, ...BOUNDS, elapsedSec: 10 + frame / 60, activeProjectileCount: 0 })
      if (isNovelAttackState(pool.state[0])) {
        if (lockedX === null) { lockedX = pool.runDirX[0]; lockedZ = pool.runDirZ[0] }
        else {
          expect(pool.runDirX[0], `${id} runDirX`).toBe(lockedX)
          expect(pool.runDirZ[0], `${id} runDirZ`).toBe(lockedZ)
          checked = true
        }
      } else if (lockedX !== null && !isNovelAttackState(pool.state[0])) {
        lockedX = null
        lockedZ = null
      }
    }
    expect(checked, `${id}: 공격이 2프레임 이상 지속되지 않아 확인하지 못했다`).toBe(true)
  })
})

describe('교대형은 좌우(또는 상하) 극성을 번갈아 쓴다', () => {
  const alternating = CASES.filter(([, code]) => NOVEL_BEHAVIORS[code].alternates)

  it('교대 선언 종이 11종이고 E36/E38만 비교대형이다', () => {
    expect(alternating.map(([id]) => id)).toEqual(['E34', 'E35', 'E37', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45'])
  })

  it.each(alternating)('%s는 primary 주기 뒤에 ALT 주기가 온다', (id, code) => {
    const p = NOVEL_BEHAVIORS[code]
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })
    const log = run(pool, runtime, 400)
    const states = new Set(log.map((row) => row.state))
    expect(states.has(ENEMY_STATE_NOVEL_ATTACK), `${id} primary 공격`).toBe(true)
    expect(states.has(ENEMY_STATE_NOVEL_ATTACK_ALT), `${id} ALT 공격`).toBe(true)
  })

  it.each(CASES.filter(([, code]) => !NOVEL_BEHAVIORS[code].alternates))('%s는 ALT 단계를 쓰지 않는다', (id, code) => {
    const p = NOVEL_BEHAVIORS[code]
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })
    const log = run(pool, runtime, 400)
    const states = new Set(log.map((row) => row.state))
    expect(states.has(ENEMY_STATE_NOVEL_TELEGRAPH_ALT), `${id} ALT 예고`).toBe(false)
    expect(states.has(ENEMY_STATE_NOVEL_ATTACK_ALT), `${id} ALT 공격`).toBe(false)
  })
})

describe('일시정지·재시작·사망·풀 슬롯 재사용에 잔상이 남지 않는다', () => {
  it.each(CASES)('%s: 공격 단계 중 죽은 슬롯을 재사용하면 APPROACH에서 다시 시작한다', (id, code) => {
    const p = NOVEL_BEHAVIORS[code]
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const first = spawn(pool, id, { x: -Math.min(p.trigger * 0.6, 1.0), z: 0 })

    // 공격 단계(혹은 예고 단계)까지 진행시킨다.
    let reached = false
    for (let frame = 0; frame < 220 && !reached; frame += 1) {
      runtime.step(pool, { delta: 1 / 60, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: 10 + frame / 60, activeProjectileCount: 0 })
      reached = isNovelAttackState(pool.state[first.index])
    }
    expect(reached, `${id}: 공격 단계에 도달하지 못했다`).toBe(true)
    const dirtyState = pool.state[first.index]
    const dirtyTimer = pool.stateTimer[first.index]
    expect(dirtyState).not.toBe(0)

    // 사망 → 같은 슬롯이 free list 맨 앞으로 돌아온다.
    runtime.applyHit(pool, first, ENEMY_RUNTIME_HP[code] * 10)
    expect(pool.active[first.index]).toBe(0)

    const reused = spawn(pool, id, { x: 4, z: 4 })
    expect(reused.index, '같은 슬롯이 재사용되지 않아 검증이 무의미하다').toBe(first.index)
    expect(pool.state[reused.index], `${id}: 이전 공격 단계가 남았다`).toBe(0)
    expect(pool.stateTimer[reused.index], `${id}: 이전 단계 타이머가 남았다`).toBe(0)
    expect(pool.attackCooldown[reused.index]).toBe(0)
    expect(pool.generation[reused.index]).not.toBe(first.generation)
    expect(dirtyTimer >= 0).toBe(true)

    // 첫 step에서 반드시 APPROACH로 정규화된다 — 이전 목표 방향(runDir)도 재사용하지 않는다.
    runtime.step(pool, { delta: 1 / 60, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: 99, activeProjectileCount: 0 })
    expect([ENEMY_STATE_NOVEL_APPROACH, ENEMY_STATE_NOVEL_TELEGRAPH]).toContain(pool.state[reused.index])
  })

  it('runtime.reset()이 플레이어 이동 방향 기억을 지운다 (E38 빈칸반응형 재시작 잔상)', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E38', { x: -1.2, z: 0 })
    for (let frame = 0; frame < 30; frame += 1) {
      runtime.step(pool, { delta: 1 / 60, playerX: frame * 0.05, playerZ: 0, ...BOUNDS, elapsedSec: 10 + frame / 60, activeProjectileCount: 0 })
    }
    expect(runtime._playerMoveX).not.toBe(0)
    runtime.reset()
    expect(runtime._playerMoveX).toBe(0)
    expect(runtime._playerMoveZ).toBe(0)
    expect(Number.isNaN(runtime._prevPlayerX)).toBe(true)
  })

  it('정지된 프레임만 흐르면(일시정지 직후) 어떤 종도 피해를 내지 않는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    for (const id of NOVEL_IDS) spawn(pool, id, { x: -1.0, z: 0 })
    let damage = 0
    // delta 0 = 일시정지 프레임. 타이머가 전진하지 않으므로 예고가 끝날 수 없다.
    for (let frame = 0; frame < 120; frame += 1) {
      runtime.step(pool, {
        delta: 0, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: 10, activeProjectileCount: 0,
        onContact: (_i, _g, _x, _y, _z, value) => { damage += value },
      })
    }
    expect(damage).toBe(0)
  })
})

describe('대응 가능성 — 안전한 이동 방향이 항상 남는다', () => {
  it('스윕형(E40/E43)의 호는 180° 미만이고 반대쪽은 열려 있다', () => {
    for (const id of ['E40', 'E43']) {
      const p = NOVEL_BEHAVIORS[ENEMY_TYPE_CODES[id]]
      const span = Math.abs(p.sweepFromDeg - p.sweepToDeg)
      const tol = Math.max(p.sweepTolDeg, p.sweepTolAltDeg)
      expect(span + tol * 2, `${id} 스윕 총 호`).toBeLessThan(180)
    }
  })

  it('콘형(E41)의 팔 각도는 180° 미만이다', () => {
    const p = NOVEL_BEHAVIORS[ENEMY_TYPE_CODES.E41]
    expect(Math.max(p.coneDeg, p.coneAltDeg)).toBeLessThan(180)
  })

  it('모든 종의 공격 reach는 접촉 거리 대비 과도하지 않다 (최대 1블록 = 4유닛 미만)', () => {
    for (const [id, code] of CASES) {
      const p = NOVEL_BEHAVIORS[code]
      const total = enemyContactDistance(code) + Math.max(p.reach, p.reachAlt)
      expect(total, `${id} 총 피격 반경`).toBeLessThan(4)
    }
  })

  it('예고 중 이동하는 두 종은 플레이어에게서 멀어지거나 아주 느리게만 접근한다', () => {
    const drift = NOVEL_BEHAVIORS[ENEMY_TYPE_CODES.E35]
    expect(drift.telegraphMove).toBe('drift')
    expect(drift.telegraphDriftMul).toBeLessThanOrEqual(0.35)
    const back = NOVEL_BEHAVIORS[ENEMY_TYPE_CODES.E36]
    expect(back.telegraphMove).toBe('back')
    expect(back.telegraphBackSpeed).toBeGreaterThan(0)
  })
})

/**
 * 정지한 플레이어(0,0) 하나를 두고 적 1기를 startDist에서 풀 런타임으로 seconds초 돌린다.
 * Balance_QA_Mini의 DPS 하네스(2026-10-25 BLOCKER-1 재현용)와 같은 조건이다 —
 * 적 1기 / 플레이어 (0,0) 정지 / 시작거리 2.0u / 60fps.
 */
function stationaryPlayerDamage(id, { seconds = 60, startDist = 2.0, generation = 0, delta = 1 / 60 } = {}) {
  const code = ENEMY_TYPE_CODES[id]
  const pool = new EnemyEntityPool()
  const runtime = createEnemySimulationRuntime()
  const hp = 1e9 // 플레이어 공격이 없는 조건이라 적이 죽지 않게 고정한다.
  pool.spawn({
    type: id, x: -startDist, y: 0, z: 0, hp, maxHp: hp,
    visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1,
  })
  // E34/E35/E42의 접근 분기는 side = ((index + generation) & 1)로 좌우를 가른다.
  // index는 0으로 고정되므로 generation만이 반대쪽 분기를 태우는 수단이다.
  pool.generation[0] = generation
  const frames = Math.round(seconds / delta)
  let total = 0
  let firstHitSec = -1
  let lateHalf = 0
  for (let frame = 0; frame < frames; frame += 1) {
    let frameDamage = 0
    runtime.step(pool, {
      delta, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: 10 + frame * delta,
      activeProjectileCount: 0,
      onContact: (_i, _g, _x, _y, _z, value) => { frameDamage += value },
    })
    if (frameDamage > 0) {
      total += frameDamage
      if (firstHitSec < 0) firstHitSec = frame * delta
      if (frame * delta >= seconds / 2) lateHalf += frameDamage
    }
  }
  return { code, total, firstHitSec, lateHalf }
}

/**
 * 위험대(danger band) 측정. 확정 방향을 +Z로 고정하고 1° 간격 방위각 × 0.05u 간격 반경으로
 * "그 자리에 정지한 플레이어가 이 공격 1회에 맞는가"를 전수 판정한다.
 * 반경 하한은 실효 명중 반경(contactDist + 그 극성의 reach)보다 큰 첫 격자다 — 그보다 안쪽은
 * 몸이 겹친 상태라 방향과 무관하게 맞고, 방위각 분포를 보는 이 측정에서는 의미가 없다.
 * 상한 2.0u: 쐐기는 하한에서 가장 넓고 멀어질수록 좁아지므로 그 위는 새 방위각을 더하지 않는다.
 */
function dangerBandDeg(id, alt, floorOverride = 0) {
  const code = ENEMY_TYPE_CODES[id]
  const p = NOVEL_BEHAVIORS[code]
  const reach = alt && p.reachAlt > 0 ? p.reachAlt : p.reach
  const floor = floorOverride || (Math.floor((enemyContactDistance(code) + reach) / 0.05) + 1) * 0.05
  const attackState = alt ? ENEMY_STATE_NOVEL_ATTACK_ALT : ENEMY_STATE_NOVEL_ATTACK
  const frameMs = 1000 / 60
  const out = createNovelBehaviorResult()
  const args = {
    playerX: 0, playerZ: 0, posX: 0, posZ: 0, distance: 0, nx: 0, nz: 0,
    speed: ENEMY_RUNTIME_SPEED[code], contactDist: enemyContactDistance(code),
    damage: 1, playerMoveX: 0, playerMoveZ: 0, hitReady: true,
  }
  const hits = (bearingDeg, radius) => {
    const pool = {
      type: [code], state: [attackState], stateTimer: [p.attackMs], attackCooldown: [0],
      hitCooldown: [0], runDirX: [0], runDirZ: [1], generation: [0],
    }
    const theta = bearingDeg * Math.PI / 180
    const px = radius * Math.sin(theta)
    const pz = radius * Math.cos(theta)
    args.playerX = px
    args.playerZ = pz
    let ex = 0
    let ez = 0
    for (let frame = 0; frame < Math.ceil(p.attackMs / frameMs); frame += 1) {
      const dx = px - ex
      const dz = pz - ez
      const distance = Math.hypot(dx, dz)
      args.posX = ex
      args.posZ = ez
      args.distance = distance
      args.nx = distance > 1e-8 ? dx / distance : 0
      args.nz = distance > 1e-8 ? dz / distance : 0
      stepNovelZombieBehavior(pool, 0, args, out)
      if (out.damage > 0) return true
      ex += out.velocityX * frameMs / 1000
      ez += out.velocityZ * frameMs / 1000
      pool.stateTimer[0] = Math.max(0, pool.stateTimer[0] - frameMs)
      if (pool.state[0] !== attackState) break
    }
    return false
  }
  const danger = new Set()
  for (let bearing = -180; bearing < 180; bearing += 1) {
    for (let radius = floor; radius <= 2.0; radius += 0.05) {
      if (hits(bearing, Number(radius.toFixed(2)))) { danger.add(bearing); break }
    }
  }
  let bestSafe = 0
  let runSafe = 0
  for (let i = 0; i < 720; i += 1) {
    const bearing = ((i % 360) + 180) % 360 - 180
    if (danger.has(bearing)) runSafe = 0
    else { runSafe += 1; if (runSafe > bestSafe) bestSafe = runSafe }
  }
  return { danger: danger.size, safe: Math.min(bestSafe, 360) }
}

describe('BLOCKER-1 — 정지한 플레이어에게 12종 전부 실제로 피해를 준다', () => {
  // 2026-10-25 Balance_QA_Mini 블로커. 이 단언이 없어서 12종 중 7종(E35/E37/E38/E40/E42/E43/E45)이
  // "정지 플레이어에게 영구히 피해 0"인 채로 기존 120개 테스트를 전부 통과했다.
  // 원인은 novelZombieBehavior.js 헤더 불변식 5 — 접근은 trigger에서 멈추는데 공격의 횡 성분이
  // 지배적이면 경로가 플레이어를 d·sinθ만큼 비껴가고, 주기마다 같은 고정점으로 되돌아왔다.
  // 2026-10-25 Balance_QA_Mini 보강 지시: 한 점(startDist 2.0 / generation 0)만 돌면
  // side = ((index + generation) & 1) 분기의 반대쪽과 먼 거리 접근이 미커버로 남는다.
  // generation 0/1은 좌우 대칭이라 수치가 같게 나오는 게 정상이고(적을 -X에 놓은 대칭 배치),
  // 한쪽 분기에만 부호 버그가 생기면 바로 갈라진다 — E45 weightShift가 정확히 그 class였다.
  const VARIANTS = []
  for (const generation of [0, 1]) for (const startDist of [1.0, 2.0, 4.0]) VARIANTS.push({ generation, startDist })

  it.each(CASES)('%s는 접근 극성·시작거리 6조합 전부에서 정지 플레이어에게 피해를 낸다', (id) => {
    for (const variant of VARIANTS) {
      const tag = `${id} gen${variant.generation}/d${variant.startDist}`
      const r = stationaryPlayerDamage(id, variant)
      expect(r.total, `${tag}: 60초 누적 피해`).toBeGreaterThan(0)
      // 한 번 닿고 다시 영구 공전으로 빠지는 패턴을 막는다 — 후반 30초에도 계속 닿아야 한다.
      expect(r.lateHalf, `${tag}: 30~60초 구간 피해`).toBeGreaterThan(0)
      // 60초 평균 피해 하한. "초반에 한 번 맞고 끝"을 lateHalf와 양쪽에서 막는다.
      // 현재 최저는 E37 gen*/d4.0의 5.55 — 임계 3.0은 1.85배 여유다.
      expect(r.total / 60, `${tag}: 60초 평균 피해/초`).toBeGreaterThanOrEqual(3.0)
      // 첫 명중이 늦으면 그만큼 무해한 적이다. 현재 최악은 E34 d4.0의 11.1초 — 임계 20초는 1.8배 여유.
      expect(r.firstHitSec, `${tag}: 첫 명중 시각(초)`).toBeLessThan(20)
    }
  })
})

describe('위험대는 반구를 넘지 않는다 (안전한 이동 방향이 반드시 남는다)', () => {
  // 1°×0.05u 전수 래스터. E43을 196°→162°로 좁힌 것과 같은 기준을 12종 전체에 적용한다.
  // 2026-10-25: E44 sideRetreatReturn이 224°(안전호 136°)로 유일한 위반이었다 —
  // 후퇴선과 재접근선이 크게 벌어져 몸이 지나는 통로가 반구를 덮었다.
  it.each(CASES)('%s의 위험대가 180° 미만이고 안전 연속호가 180°를 넘는다', (id) => {
    for (const alt of [false, true]) {
      const { danger, safe } = dangerBandDeg(id, alt)
      const tag = alt ? 'ALT' : 'primary'
      expect(danger, `${id} ${tag} 위험대`).toBeLessThan(180)
      expect(safe, `${id} ${tag} 안전 연속호`).toBeGreaterThan(180)
    }
  })

  // 2026-10-25 Balance_QA_Mini 보강 지시: 스윕형(E40/E43)은 실효 명중 반경(1.403u / 1.18·0.94u)이
  // 위 래스터의 반경 하한보다 크므로 위 단언이 0° < 180°로 공허하게 통과한다. 파라미터 산술
  // 단언(span + tol*2 < 180)은 sweepHit 배선 자체를 못 잡으므로(= weightShift 부호 버그와 같은 class)
  // 두 종만 하한 0.02u로 실제 래스터해 잠근다. 스윕 판정은 반경과 무관한 각도 조건이라 내측에서 재는 게 맞다.
  it.each([['E40'], ['E43']])('%s 스윕형의 실측 호는 180° 미만이다 (내측 래스터)', (id) => {
    for (const alt of [false, true]) {
      const { danger, safe } = dangerBandDeg(id, alt, 0.02)
      const tag = alt ? 'ALT' : 'primary'
      // 현재 실측: E40 142°/218°, E43 primary 146°/214° · ALT 162°/198°.
      expect(danger, `${id} ${tag} 스윕 실측 호`).toBeGreaterThan(0)
      expect(danger, `${id} ${tag} 스윕 실측 호`).toBeLessThan(180)
      expect(safe, `${id} ${tag} 안전 연속호`).toBeGreaterThan(180)
    }
  })
})

describe('150 동시 상한과 성능 경계', () => {
  it('12종을 섞어 풀을 꽉 채워도 150마리를 넘기지 않고 전부 살아남는다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    for (let i = 0; i < 150; i += 1) {
      const id = NOVEL_IDS[i % NOVEL_IDS.length]
      const code = ENEMY_TYPE_CODES[id]
      const hp = ENEMY_RUNTIME_HP[code]
      const spawned = pool.spawn({
        type: id, x: -8 + (i % 17) * 0.9, y: 0, z: -12 + Math.floor(i / 17) * 1.6,
        hp, maxHp: hp, visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1,
      })
      expect(spawned, `슬롯 ${i}`).not.toBeNull()
    }
    expect(pool.activeCount).toBe(150)
    expect(pool.spawn({ type: 'E34', x: 0, y: 0, z: 0, hp: 8, maxHp: 8 })).toBeNull()
    for (let frame = 0; frame < 60; frame += 1) {
      expect(runtime.step(pool, {
        delta: 1 / 60, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: 10 + frame / 60, activeProjectileCount: 0,
      })).toBe(true)
    }
    // ERROR 경로로 조용히 사라지면(유효 타입 게이트 누락) 여기서 걸린다.
    expect(pool.activeCount).toBe(150)
  })

  it('신규 12종은 접촉 피해 damage가 전부 양수이고 투사체 이벤트를 만들지 않는다', () => {
    for (const [id, code] of CASES) {
      expect(ENEMY_RUNTIME_DAMAGE[code], `${id} damage`).toBeGreaterThan(0)
      expect(ENEMY_RUNTIME_SPEED[code], `${id} speed`).toBeGreaterThan(0)
      expect(ENEMY_RUNTIME_CONTACT_DIST[code], `${id} contactDist`).toBeGreaterThan(0)
    }
  })
})
