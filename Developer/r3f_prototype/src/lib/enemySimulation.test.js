import { describe, expect, it } from 'vitest'
import { createEnemyEntityPool, MAX_ENEMIES } from './enemyEntityPool.js'
import {
  E04_FIRE_COOLDOWN_MS,
  ENEMY_CONTACT_COOLDOWN_MS,
  ENEMY_EVENT_CAPACITY,
  ENEMY_EVENT_CONTACT,
  ENEMY_EVENT_DEATH,
  ENEMY_EVENT_DESPAWN,
  ENEMY_EVENT_ERROR,
  ENEMY_EVENT_RANGED_FIRE,
  ENEMY_PHASE_ACTIVE,
  ENEMY_PHASE_REVEAL,
  ENEMY_STUCK_DETOUR_MS,
  ENEMY_STUCK_RECOVERY_MS,
  ENEMY_STATE_CHARGE,
  ENEMY_STATE_CHASE,
  ENEMY_STATE_STUN,
  ENEMY_STATE_WARN,
  EnemyEventQueue,
  collidesEnemyObstacle,
  createEnemySimulationRuntime,
  enemyCollisionRadius,
  resetDefaultEnemySimulationRuntime,
  resolveRangedEnemyVelocityRaw,
  stepEnemySimulation,
} from './enemySimulation.js'

function spawn(pool, type, x = 0, z = 0, overrides = {}) {
  return pool.spawn({ type, x, y: 0, z, hp: 100, maxHp: 100, visualScale: 1, ...overrides })
}

function context(overrides = {}) {
  return { delta: 1 / 60, playerX: 0, playerZ: 0, halfX: 12, halfZ: 12, elapsedSec: 100, ...overrides }
}

describe('enemySimulation 순수 일반 적 런타임', () => {
  it('3분 soak에서도 200 슬롯/프록시/typed-array 불변식을 유지한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    for (let index = 0; index < MAX_ENEMIES; index += 1) {
      expect(pool.spawn({
        type: 'E01', x: -10 + (index % 20), y: 0, z: -10 + Math.floor(index / 20),
        hp: 8, maxHp: 8, visualScale: 1,
      })).not.toBeNull()
    }
    const scratch = {}
    for (let frame = 0; frame < 10_800; frame += 1) {
      expect(runtime.step(pool, context({ playerX: 11, playerZ: 11 }))).toBe(true)
      while (runtime.events.drainInto(scratch)) {}
      if ((frame & 255) === 0) {
        expect(pool.activeCount).toBe(MAX_ENEMIES)
        expect(pool.liveProxyCount).toBe(MAX_ENEMIES)
        expect(pool.validateInvariants({ halfX: 12, halfZ: 12 })).toBe(true)
      }
    }
    expect(pool.activeCount).toBe(MAX_ENEMIES)
    expect(pool.liveProxyCount).toBe(MAX_ENEMIES)
    expect(pool.validateInvariants({ halfX: 12, halfZ: 12 })).toBe(true)
  })

  it('E01/E02/E03/E06은 기존 수치로 추격하고 contact 거리에서는 멈춘다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const cases = [['E01', 0.475], ['E02', 0.385], ['E03', 1.1], ['E06', 0.6]]
    for (let i = 0; i < cases.length; i += 1) {
      const handle = spawn(pool, cases[i][0], -5, i, { spawnTimer: 300 })
      runtime.step(pool, context({ playerZ: i }))
      expect(pool.velX[handle.index]).toBeCloseTo(cases[i][1], 5)
    }
    const contact = spawn(pool, 'E01', 0.1, 0, { spawnTimer: 300 })
    runtime.step(pool, context())
    expect(pool.velX[contact.index]).toBe(0)
    expect(pool.velZ[contact.index]).toBe(0)
  })

  it('spawn reveal 300ms 동안 이동·contact·발사를 모두 막는다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const handle = spawn(pool, 'E01', 0.1, 0)
    let contacts = 0
    runtime.step(pool, context({ onContact: () => { contacts += 1 } }))
    expect(pool.phase[handle.index]).toBe(ENEMY_PHASE_REVEAL)
    expect(pool.posX[handle.index]).toBeCloseTo(0.1, 6)
    expect(contacts).toBe(0)
    pool.spawnTimer[handle.index] = 300
    runtime.step(pool, context({ onContact: () => { contacts += 1 } }))
    expect(pool.phase[handle.index]).toBe(ENEMY_PHASE_ACTIVE)
    expect(contacts).toBe(1)
  })

  it('reveal 중에도 legacy/direct invalid spawn을 첫 step에 boundary-aware MTV로 탈출시킨다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const obstacles = [
      { x: 1.22, z: 0, halfX: 0.42, halfZ: 1.7 },
      { x: 0.18, z: 0, halfX: 0.42, halfZ: 0.42 },
    ]
    const handle = spawn(pool, 'E01', 1.2, 0, { spawnTimer: 0 })
    runtime.step(pool, context({ halfX: 2, halfZ: 2, obstacles, obstacleCount: obstacles.length }))
    expect(pool.phase[handle.index]).toBe(ENEMY_PHASE_REVEAL)
    expect(pool.velX[handle.index]).toBe(0)
    expect(pool.velZ[handle.index]).toBe(0)
    expect(collidesEnemyObstacle(pool.posX[handle.index], pool.posZ[handle.index], enemyCollisionRadius(1), obstacles, obstacles.length)).toBe(false)
  })

  it('contact damage는 500ms cadence이며 scalar callback과 event를 남긴다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawn(pool, 'E06', 0.1, 0, { spawnTimer: 300 })
    let calls = 0
    runtime.step(pool, context({ onContact: (_index, _generation, _x, _y, _z, damage) => { calls += damage } }))
    for (let i = 0; i < 20; i += 1) runtime.step(pool, context())
    expect(calls).toBe(20)
    const event = {}
    expect(runtime.events.drainInto(event)).toBe(true)
    expect(event.type).toBe(ENEMY_EVENT_CONTACT)
    expect(event.value).toBe(20)
    for (let i = 0; i < 11; i += 1) runtime.step(pool, context({ onContact: (_a, _b, _c, _d, _e, damage) => { calls += damage } }))
    expect(calls).toBe(40)
    expect(ENEMY_CONTACT_COOLDOWN_MS).toBe(500)
  })

  it('E04는 동일 3구간 이동과 intro/age/cap/boss/cooldown 발사 gate를 지킨다', () => {
    const velocity = { x: 0, z: 0 }
    expect(resolveRangedEnemyVelocityRaw(velocity, 1, 0, 3).x).toBe(-0.45)
    expect(Math.abs(resolveRangedEnemyVelocityRaw(velocity, 1, 0, 3).z)).toBe(0)
    expect(resolveRangedEnemyVelocityRaw(velocity, 1, 0, 6)).toMatchObject({ x: 0.45, z: 0 })
    expect(resolveRangedEnemyVelocityRaw(velocity, 1, 0, 4, -1)).toMatchObject({ x: 0, z: -0.3375 })

    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const handle = spawn(pool, 'E04', 5, 0, { spawnTimer: 900 })
    let fired = 0
    const fire = () => { fired += 1 }
    runtime.step(pool, context({ elapsedSec: 71, onRangedFire: fire }))
    runtime.step(pool, context({ elapsedSec: 72, activeProjectileCount: 6, onRangedFire: fire }))
    runtime.step(pool, context({ elapsedSec: 72, bossPressure: true, onRangedFire: fire }))
    runtime.step(pool, context({ elapsedSec: 72, onRangedFire: fire }))
    expect(fired).toBe(1)
    expect(pool.attackCooldown[handle.index]).toBeGreaterThan(E04_FIRE_COOLDOWN_MS - 20)
    runtime.step(pool, context({ elapsedSec: 72, onRangedFire: fire }))
    expect(fired).toBe(1)
    const event = {}
    while (runtime.events.drainInto(event) && event.type !== ENEMY_EVENT_RANGED_FIRE) {}
    expect(event.type).toBe(ENEMY_EVENT_RANGED_FIRE)
  })

  it('같은 frame E04 여러 마리도 step-local projectile cap 6을 넘지 않는다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    for (let index = 0; index < 7; index += 1) spawn(pool, 'E04', 5, index * 0.01, { spawnTimer: 900 })
    let fires = 0
    runtime.step(pool, context({ onRangedFire: () => { fires += 1 } }))
    expect(fires).toBe(6)
    expect(runtime.events.count).toBe(6)
  })

  it('E05는 chase → warn → charge → stun → chase 상태와 수치를 따른다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const handle = spawn(pool, 'E05', 4, 0, { spawnTimer: 300 })
    runtime.step(pool, context())
    expect(pool.state[handle.index]).toBe(ENEMY_STATE_WARN)
    for (let frame = 0; frame < 44; frame += 1) runtime.step(pool, context())
    expect(pool.state[handle.index]).toBe(ENEMY_STATE_CHARGE)
    expect(Math.hypot(pool.velX[handle.index], pool.velZ[handle.index])).toBeCloseTo(1.7, 4)
    runtime.step(pool, context({ playerX: pool.posX[handle.index], playerZ: pool.posZ[handle.index] }))
    expect(pool.state[handle.index]).toBe(ENEMY_STATE_STUN)
    for (let frame = 0; frame < 62; frame += 1) runtime.step(pool, context({ playerX: 10, playerZ: 0 }))
    expect(pool.state[handle.index]).toBe(ENEMY_STATE_CHASE)
  })

  it('RZL/RZC는 저장된 normalized runDir로 달리고 경계 +6 밖에서는 no-reward despawn한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const leader = spawn(pool, 'RZL', 6.98, 0, { spawnTimer: 300, runDirX: 10, runDirZ: 0 })
    const crew = spawn(pool, 'RZC', -4, 0, { spawnTimer: 300, runDirX: 0, runDirZ: -5 })
    runtime.step(pool, context({ halfX: 1, halfZ: 1 }))
    expect(pool.get(leader)).toBeNull()
    expect(pool.velZ[crew.index]).toBeCloseTo(-2.18, 4)
    const event = {}
    while (runtime.events.drainInto(event) && event.type !== ENEMY_EVENT_DESPAWN) {}
    expect(event.type).toBe(ENEMY_EVENT_DESPAWN)
    expect(event.value).toBe(0)
  })

  it('AABB 장애물에서 축별 slide하고 일반 적은 stage bounds 안에 clamp된다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const handle = spawn(pool, 'E01', -1, -1, { spawnTimer: 300 })
    const obstacles = [{ x: 0, z: 0, halfX: 0.2, halfZ: 2 }]
    for (let frame = 0; frame < 80; frame += 1) runtime.step(pool, context({ playerX: 2, playerZ: 2, obstacles, obstacleCount: 1, halfX: 2, halfZ: 2 }))
    expect(pool.posX[handle.index]).toBeLessThanOrEqual(-0.4)
    expect(pool.posZ[handle.index]).toBeGreaterThan(-1)
    expect(Math.abs(pool.posX[handle.index])).toBeLessThanOrEqual(2)
  })

  it('타입 반경으로 스폰 직후 obstacle 내부를 한 bounded step 안에 MTV 탈출시킨다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const obstacle = [{ x: 0, z: 0, halfX: 0.5, halfZ: 0.5 }]
    const handle = spawn(pool, 'E06', 0, 0, { spawnTimer: 300 })
    runtime.step(pool, context({ playerX: 4, playerZ: 0, halfX: 4, halfZ: 4, obstacles: obstacle, obstacleCount: 1 }))
    expect(enemyCollisionRadius(6)).toBeCloseTo(0.28 * 1.6 * (4 / 3), 6)
    expect(collidesEnemyObstacle(pool.posX[handle.index], pool.posZ[handle.index], enemyCollisionRadius(6), obstacle, 1)).toBe(false)
    expect(pool.validateInvariants({ halfX: 4, halfZ: 4 })).toBe(true)
  })

  it('모서리 full-block에서도 tangent slide로 다시 움직이고 0.5초 stuck 뒤 결정론적 우회를 쓴다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const obstacles = [{ x: 0, z: 0, halfX: 0.75, halfZ: 0.75 }]
    const handle = spawn(pool, 'E01', -1.2, -1.2, { spawnTimer: 300 })
    for (let frame = 0; frame < 90; frame += 1) runtime.step(pool, context({ playerX: 3, playerZ: 3, halfX: 4, halfZ: 4, obstacles, obstacleCount: 1 }))
    expect(collidesEnemyObstacle(pool.posX[handle.index], pool.posZ[handle.index], enemyCollisionRadius(1), obstacles, 1)).toBe(false)
    expect(Math.hypot(pool.posX[handle.index] + 1.2, pool.posZ[handle.index] + 1.2)).toBeGreaterThan(0.08)
    expect(pool.stuckMs[handle.index]).toBeLessThan(500)
  })

  it('축·양접선이 모두 막힌 enclosure는 1.2초 stuck 뒤 원점 밖 전역 안전 위치로 회복한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    // E01 확장 반경(약 0.373) 사이에 원점만 남긴 아주 작은 cavity.
    // 1/30 이동(약 0.0158)은 X/Z 축과 양접선 어느 쪽도 통과하지 못한다.
    const obstacles = [
      { x: -0.39, z: 0, halfX: 0.01, halfZ: 1 }, { x: 0.39, z: 0, halfX: 0.01, halfZ: 1 },
      { x: 0, z: -0.39, halfX: 1, halfZ: 0.01 }, { x: 0, z: 0.39, halfX: 1, halfZ: 0.01 },
    ]
    const handle = spawn(pool, 'E01', 0, 0, { spawnTimer: 300 })
    expect(collidesEnemyObstacle(0, 0, enemyCollisionRadius(1), obstacles, obstacles.length)).toBe(false)
    let maxObservedStuck = 0
    let sawDetour = false
    let sawGlobalJump = false
    let previousX = 0
    let previousZ = 0
    for (let frame = 0; frame < 80; frame += 1) {
      runtime.step(pool, context({ delta: 1 / 30, playerX: 10, playerZ: 10, halfX: 12, halfZ: 12, obstacles, obstacleCount: obstacles.length }))
      maxObservedStuck = Math.max(maxObservedStuck, pool.stuckMs[handle.index])
      sawDetour ||= pool.detourMs[handle.index] > 0
      const jumpX = pool.posX[handle.index] - previousX
      const jumpZ = pool.posZ[handle.index] - previousZ
      if (jumpX * jumpX + jumpZ * jumpZ > 4.5 * 4.5) sawGlobalJump = true
      previousX = pool.posX[handle.index]
      previousZ = pool.posZ[handle.index]
    }
    expect(maxObservedStuck).toBeGreaterThanOrEqual(ENEMY_STUCK_RECOVERY_MS - (1000 / 30) - 1)
    expect(sawDetour).toBe(true)
    expect(sawGlobalJump).toBe(true)
    expect(Math.hypot(pool.posX[handle.index], pool.posZ[handle.index])).toBeGreaterThan(4.5)
    expect(collidesEnemyObstacle(pool.posX[handle.index], pool.posZ[handle.index], enemyCollisionRadius(1), obstacles, obstacles.length)).toBe(false)
    expect(pool.stuckMs[handle.index]).toBeLessThan(ENEMY_STUCK_DETOUR_MS)
  })

  it('13 RZ crew는 obstacle을 우회한 뒤 +6 경계에서 전부 despawn한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const obstacles = [{ x: 0, z: 0, halfX: 1.1, halfZ: 1.1 }]
    for (let index = 0; index < 13; index += 1) {
      spawn(pool, index === 0 ? 'RZL' : 'RZC', -3.2 - index * 0.12, -3.2 - index * 0.12, { spawnTimer: 300, runDirX: 1, runDirZ: 1 })
    }
    for (let frame = 0; frame < 600; frame += 1) runtime.step(pool, context({ playerX: 0, playerZ: 0, halfX: 3, halfZ: 3, obstacles, obstacleCount: 1 }))
    expect(pool.activeCount).toBe(0)
    expect(pool.validateInvariants()).toBe(true)
  })

  it('RZ는 obstacle detour 뒤 원래 normalized runDir로 복귀한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const handle = spawn(pool, 'RZL', -3, -3, { spawnTimer: 300, runDirX: 1, runDirZ: 1 })
    const obstacles = [{ x: 0, z: 0, halfX: 1.1, halfZ: 1.1 }]
    for (let frame = 0; frame < 210; frame += 1) runtime.step(pool, context({ halfX: 8, halfZ: 8, obstacles, obstacleCount: 1 }))
    expect(pool.get(handle)).not.toBeNull()
    expect(pool.velX[handle.index]).toBeGreaterThan(0)
    expect(pool.velZ[handle.index]).toBeGreaterThan(0)
    expect(collidesEnemyObstacle(pool.posX[handle.index], pool.posZ[handle.index], enemyCollisionRadius(7), obstacles, 1)).toBe(false)
  })

  it('200 mixed + props 10,800 frame soak은 obstacle overlap/NaN/drop 없이 typed-array 정체성을 유지한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const obstacles = [
      { x: -5, z: -5, halfX: 0.9, halfZ: 2.6 }, { x: 5, z: -5, halfX: 0.9, halfZ: 2.6 },
      { x: -5, z: 5, halfX: 0.9, halfZ: 2.6 }, { x: 5, z: 5, halfX: 0.9, halfZ: 2.6 },
    ]
    let normalCount = 0
    for (let index = 0; index < MAX_ENEMIES; index += 1) {
      const type = index % 13 === 0 ? 'RZL' : (index % 13 === 1 ? 'RZC' : (index % 5 === 0 ? 'E05' : 'E01'))
      if (type !== 'RZL' && type !== 'RZC') normalCount += 1
      const x = -14 + (index % 20) * 1.45
      const z = -14 + Math.floor(index / 20) * 2.8
      spawn(pool, type, x, z, { spawnTimer: 300, runDirX: 1, runDirZ: 1 })
    }
    const identities = [pool.stuckMs, pool.detourMs, pool.lastSafeX, runtime.grid.head, runtime.events.type]
    const event = {}
    for (let frame = 0; frame < 10_800; frame += 1) {
      runtime.step(pool, context({ playerX: 0, playerZ: 0, halfX: 18, halfZ: 18, obstacles, obstacleCount: obstacles.length }))
      while (runtime.events.drainInto(event)) {}
      if ((frame & 255) === 0) {
        for (let index = 0; index <= pool.highestActive; index += 1) {
          if (!pool.active[index]) continue
          expect(collidesEnemyObstacle(pool.posX[index], pool.posZ[index], enemyCollisionRadius(pool.type[index]), obstacles, obstacles.length)).toBe(false)
        }
        expect(pool.validateInvariants({ halfX: 18, halfZ: 18, padding: 6 })).toBe(true)
      }
    }
    expect(pool.stuckMs).toBe(identities[0])
    expect(pool.detourMs).toBe(identities[1])
    expect(pool.lastSafeX).toBe(identities[2])
    expect(runtime.grid.head).toBe(identities[3])
    expect(runtime.events.type).toBe(identities[4])
    expect(runtime.events.dropped).toBe(0)
    let activeNormals = 0
    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (pool.active[index] && pool.type[index] !== 7 && pool.type[index] !== 8) activeNormals += 1
    }
    expect(activeNormals).toBe(normalCount)
  })

  it('E01/E02/E06 collider 반경은 render visualScale과 무관하게 타입 정본으로 bounds·장애물을 막는다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const types = ['E01', 'E02', 'E06']
    const radii = [0.28 * 1 * (4 / 3), 0.28 * 1.4 * (4 / 3), 0.28 * 1.6 * (4 / 3)]
    const handles = types.map((type, index) => spawn(pool, type, -2.5, -0.8 + index * 0.8, { spawnTimer: 300, visualScale: 0.01 }))
    const obstacles = [{ x: 0, z: 0, halfX: 0.1, halfZ: 3 }]
    for (let frame = 0; frame < 180; frame += 1) runtime.step(pool, context({ playerX: 3, playerZ: 0, halfX: 3, halfZ: 4, obstacles, obstacleCount: 1 }))
    for (let index = 0; index < handles.length; index += 1) {
      expect(pool.posX[handles[index].index]).toBeLessThanOrEqual(-0.1 - radii[index] + 0.001)
      expect(pool.setPosition(handles[index], 10, pool.posY[handles[index].index], pool.posZ[handles[index].index])).toBe(true)
    }
    runtime.step(pool, context({ playerX: 10, halfX: 1, halfZ: 4 }))
    for (let index = 0; index < handles.length; index += 1) expect(pool.posX[handles[index].index]).toBeLessThanOrEqual(1 - radii[index] + 0.001)
  })

  it('고정 spatial grid는 200 active에서도 N²보다 적은 비교로 separation을 유지한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    for (let index = 0; index < MAX_ENEMIES; index += 1) {
      spawn(pool, 'E01', -18 + (index % 20) * 1.7, -18 + Math.floor(index / 20) * 1.7, { spawnTimer: 300 })
    }
    runtime.step(pool, context({ halfX: 24, halfZ: 24, playerX: 20, playerZ: 20 }))
    expect(runtime.grid.comparisonCount).toBeLessThan((MAX_ENEMIES * MAX_ENEMIES) / 4)
    expect(pool.activeCount).toBe(MAX_ENEMIES)
    expect(pool.validateInvariants()).toBe(true)
  })

  it('완전히 같은 좌표의 separation은 양의 밀어냄을 적용해 finite 상태를 유지한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const first = spawn(pool, 'E01', 2, 2, { spawnTimer: 300 })
    const second = spawn(pool, 'E01', 2, 2, { spawnTimer: 300 })
    runtime.step(pool, context({ playerX: 10, playerZ: 2 }))
    expect(Number.isFinite(pool.velX[first.index])).toBe(true)
    expect(Number.isFinite(pool.velX[second.index])).toBe(true)
    expect(pool.posX[first.index]).not.toBe(pool.posX[second.index])
  })

  it('NaN 슬롯은 fail-closed 격리하고 stale hit은 재타격/중복 death를 만들지 않는다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const invalid = spawn(pool, 'E01', 1, 1, { spawnTimer: 300 })
    pool.posX[invalid.index] = Number.NaN
    runtime.step(pool, context())
    expect(pool.get(invalid)).toBeNull()
    const event = {}
    expect(runtime.events.drainInto(event)).toBe(true)
    expect(event.type).toBe(ENEMY_EVENT_ERROR)

    const victim = spawn(pool, 'E01', 3, 0, { spawnTimer: 300, hp: 4, maxHp: 4 })
    expect(runtime.applyHit(pool, victim, 4, 1, 0, 100)).toBe(true)
    expect(pool.get(victim)).toBeNull()
    expect(runtime.applyHit(pool, victim, 4)).toBe(false)
    while (runtime.events.drainInto(event) && event.type !== ENEMY_EVENT_DEATH) {}
    expect(event.type).toBe(ENEMY_EVENT_DEATH)
  })

  it('event ring은 overflow에서 덮어쓰지 않고 dropped을 기록하며 drainInto는 무할당이다', () => {
    const queue = new EnemyEventQueue(2)
    expect(queue.push(1, 1, 1)).toBe(true)
    expect(queue.push(2, 2, 1)).toBe(true)
    expect(queue.push(3, 3, 1)).toBe(false)
    expect(queue.dropped).toBe(1)
    const out = {}
    expect(queue.drainInto(out)).toBe(true)
    expect(out.index).toBe(1)
    expect(queue.drainInto(out)).toBe(true)
    expect(out.index).toBe(2)
    expect(queue.drainInto(out)).toBe(false)
    expect(queue.push(1, 1, 1, 3.5e38)).toBe(false)
    expect(queue.count).toBe(0)
    expect(ENEMY_EVENT_CAPACITY).toBeGreaterThan(2)
  })

  it('event queue reset은 배열 정체성을 유지한 채 cursor·drop을 초기화한다', () => {
    const queue = new EnemyEventQueue(2)
    const arrays = [queue.type, queue.index, queue.generation, queue.x, queue.aux]
    queue.push(1, 1, 1)
    queue.push(2, 2, 1)
    queue.push(3, 3, 1)
    queue.reset()
    expect(queue.count).toBe(0)
    expect(queue.dropped).toBe(0)
    expect(queue.read).toBe(0)
    expect(queue.write).toBe(0)
    expect(queue.type).toBe(arrays[0])
    expect(queue.index).toBe(arrays[1])
    expect(queue.generation).toBe(arrays[2])
    expect(queue.x).toBe(arrays[3])
    expect(queue.aux).toBe(arrays[4])
    expect(queue.type.length).toBe(2)
  })

  it('runtime reset 뒤 grid/event 잔존 상태 없이 새 이벤트 순서로 동작한다', () => {
    const runtime = createEnemySimulationRuntime()
    const gridHead = runtime.grid.head
    const eventType = runtime.events.type
    runtime.events.push(9, 9, 1)
    runtime.grid.comparisonCount = 99
    runtime.reset()
    expect(runtime.events.count).toBe(0)
    expect(runtime.grid.comparisonCount).toBe(0)
    expect(runtime.grid.head).toBe(gridHead)
    expect(runtime.events.type).toBe(eventType)
    runtime.events.push(1, 2, 3)
    const out = {}
    expect(runtime.events.drainInto(out)).toBe(true)
    expect(out).toMatchObject({ type: 1, index: 2, generation: 3 })

    resetDefaultEnemySimulationRuntime()
    const pool = createEnemyEntityPool()
    spawn(pool, 'E01', 0.1, 0, { spawnTimer: 300 })
    stepEnemySimulation(pool, context())
    resetDefaultEnemySimulationRuntime()
  })

  it('사용하지 않는 보스 코드와 모든 사용 float 오염은 ERROR 격리하며 hit overflow는 거절한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const boss = spawn(pool, 'B01', 1, 0, { spawnTimer: 300 })
    runtime.step(pool, context())
    expect(pool.get(boss)).toBeNull()
    const invalidTimer = spawn(pool, 'E01', 1, 0, { spawnTimer: 300 })
    pool.yaw[invalidTimer.index] = Number.NaN
    runtime.step(pool, context())
    expect(pool.get(invalidTimer)).toBeNull()
    const hitTarget = spawn(pool, 'E01', 1, 0, { spawnTimer: 300 })
    const hp = pool.hp[hitTarget.index]
    expect(runtime.applyHit(pool, hitTarget, 1, 3.5e38, 0, 1)).toBe(false)
    expect(pool.hp[hitTarget.index]).toBe(hp)
  })

  it('200 active 10,800프레임 soak에서 배열 길이·finite·generation/stale 안전성을 유지한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const old = []
    for (let index = 0; index < MAX_ENEMIES; index += 1) old.push(spawn(pool, index % 6 === 4 ? 'E05' : 'E01', -35 + (index % 20) * 3, -35 + Math.floor(index / 20) * 3, { spawnTimer: 300 }))
    const lengths = [pool.active, pool.posX, runtime.grid.head, runtime.grid.next, runtime.events.type].map((item) => item.length)
    const frameContext = context({ delta: 1 / 60, halfX: 50, halfZ: 50, playerX: 40, playerZ: 40 })
    for (let frame = 0; frame < 10_800; frame += 1) {
      runtime.step(pool, frameContext)
      expect(pool.activeCount).toBeLessThanOrEqual(MAX_ENEMIES)
      expect(pool.validateInvariants()).toBe(true)
    }
    expect([pool.active, pool.posX, runtime.grid.head, runtime.grid.next, runtime.events.type].map((item) => item.length)).toEqual(lengths)
    expect(pool.get(old[0])).not.toBeNull()
  })
})
