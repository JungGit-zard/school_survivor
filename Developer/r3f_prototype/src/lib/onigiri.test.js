import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FLIGHT_DONE, FLIGHT_FLYING, FLIGHT_HIT, FLIGHT_HOVERING,
  createOnigiriBurstGrains, createOnigiriFlight, findNearestUnhitEnemy, pickNextOnigiriTarget, planOnigiriFrame, stepOnigiriFlight,
} from './onigiri.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { enemyBodies as globalEnemyBodies, enemyPool, enemySimulationRuntime } from './refs.js'
import { applyEnemyHit, captureEnemyGeneration, isEnemyHitLive } from './weaponCollision.js'

function rb(x, z, alive = true) {
  return {
    _enemyHit: alive ? () => {} : null,
    _enemyDead: !alive,
    translation: () => ({ x, y: 0, z }),
  }
}

afterEach(() => {
  globalEnemyBodies.clear()
  enemyPool.reset()
  enemySimulationRuntime.grid.reset()
})

function spawnPooledEnemy(x, z, hit = vi.fn()) {
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 10, maxHp: 10 })
  enemyPool.setHitHandler(handle, hit)
  return { handle, hit }
}

describe('onigiri targeting', () => {
  it('retargets to the nearest living enemy when the current target is gone', () => {
    const enemies = new Map([
      ['dead-original', rb(0, 0, false)],
      ['far', rb(7, 0)],
      ['near', rb(2, 0)],
    ])

    const next = pickNextOnigiriTarget({
      enemyBodies: enemies,
      from: { x: 0, z: 0 },
      hitSet: new Set(['dead-original']),
      range: 8,
    })

    expect(next.enemyId).toBe('near')
  })

  it('returns null when no unhit living enemy remains so the projectile can expire immediately', () => {
    const enemies = new Map([
      ['already-hit', rb(1, 0)],
      ['dead', rb(2, 0, false)],
    ])

    const next = pickNextOnigiriTarget({
      enemyBodies: enemies,
      from: { x: 0, z: 0 },
      hitSet: new Set(['already-hit']),
      range: 8,
    })

    expect(next).toBeNull()
  })

  it('retargets to a pooled standard enemy and can actually damage it (regression: bounce used to only see enemyBodies Map)', () => {
    const pooled = spawnPooledEnemy(2, 0)

    const next = pickNextOnigiriTarget({ from: { x: 0, z: 0 }, hitSet: new Set(), range: 8 })

    expect(next).not.toBeNull()
    expect(next.rb).toBe(enemyPool.get(pooled.handle))
    expect(applyEnemyHit(next.rb, next.generation, 5, { source: { x: 0, z: 0 } })).toBe(true)
    expect(pooled.hit).toHaveBeenCalledWith(5, { source: { x: 0, z: 0 } })
  })

  it('excludes pooled enemies already in hitSet by their stable enemyId', () => {
    const hitOne = spawnPooledEnemy(1, 0)
    const untouched = spawnPooledEnemy(3, 0)
    const hitEnemyId = enemyPool.get(hitOne.handle)._enemyId

    const next = pickNextOnigiriTarget({ from: { x: 0, z: 0 }, hitSet: new Set([hitEnemyId]), range: 8 })

    expect(next.rb).toBe(enemyPool.get(untouched.handle))
  })

  it('does not double-count a pooled proxy duplicated in the Map', () => {
    const pooled = spawnPooledEnemy(1, 0)
    globalEnemyBodies.set('dup', enemyPool.get(pooled.handle))

    const next = pickNextOnigiriTarget({ from: { x: 0, z: 0 }, hitSet: new Set(), range: 8 })

    expect(next.rb).toBe(enemyPool.get(pooled.handle))
  })

  // "적이 죽어도 바운스한다": 맞은 적이 그 타격으로 죽어 풀에서 빠져나가도
  // 다음 대상을 계속 찾아야 한다. 죽은 슬롯은 hitSet과 무관하게 비활성이므로 후보에서 빠진다.
  it('keeps bouncing after the hit target dies and leaves the pool', () => {
    const killed = spawnPooledEnemy(0.5, 0)
    const survivor = spawnPooledEnemy(2, 0)
    const killedProxy = enemyPool.get(killed.handle)
    const killedEnemyId = killedProxy._enemyId

    enemyPool.despawn(killed.handle) // 사망 = 풀에서 despawn

    expect(killedProxy._enemyDead).toBe(true)
    const next = pickNextOnigiriTarget({
      from: { x: 0.5, z: 0 },
      hitSet: new Set([killedEnemyId]),
      range: 4.5,
    })

    expect(next).not.toBeNull()
    expect(next.rb).toBe(enemyPool.get(survivor.handle))
  })

  it('creates short scattered rice grains for the instant disappearance burst', () => {
    const grains = createOnigiriBurstGrains({ id: 5, x: 1, z: -2, count: 12 })

    expect(grains).toHaveLength(12)
    expect(grains[0]).toMatchObject({ key: '5-0', x: 1, z: -2 })
    expect(grains.every((grain) => grain.speed > 0 && grain.lift > 0 && grain.size > 0)).toBe(true)
    expect(Math.max(...grains.map((grain) => grain.delayMs))).toBeLessThan(24)
    expect(new Set(grains.map((grain) => grain.angle.toFixed(3))).size).toBeGreaterThan(8)
  })
})

// 2026-11-02 Terry 확정 규칙(오니기리·꼬마 로자리 공용):
//  1) 새 투척은 언제나 주인공(로자리) 현재 몸에서, 화면에 몇 개가 있든 상한 없이 나간다.
//  2) 바운스가 남은 발사체는 사라지지 않는다. 맞힌 자리에서 bounceRange 안 다음 적에게 이어 가고,
//     없으면 그 자리에 떠서(수평 이동 없음) 매 프레임 찾다가 적이 들어오면 날아간다.
//  3) 날아가던 표적이 죽어도 사라지지 않고 현재 위치에서 다시 조준한다(같은 규칙).
//  4) 바운스를 다 쓰면 끝난다. 피해·바운스 수·맞힌 적 목록·쿨다운·속도는 그대로.
describe.each(['onigiri', 'miniRosari'])('%s confirmed flight rules (2026-11-02)', (weaponId) => {
  const weapon = { ...WEAPON_CATALOG[weaponId].base, active: true }
  const SPEED = 11 / 8
  const DT = 1 / 60

  let id = 0
  function plan(player, { now, lastFireAt }) {
    return planOnigiriFrame({
      now, lastFireAt, weapon, origin: player,
      findFreshTarget: (range) => pickNextOnigiriTarget({ from: player, range }),
      nextId: () => ++id,
    })
  }

  // 발사체가 끝나거나(done) maxFrames가 될 때까지 진행. 상태 목록을 돌려준다.
  function run(flight, maxFrames, onEach = () => {}) {
    const states = []
    for (let i = 0; i < maxFrames; i += 1) {
      const state = stepOnigiriFlight(flight, DT, SPEED)
      states.push(state)
      onEach(state, flight)
      if (state === FLIGHT_DONE) break
    }
    return states
  }

  it('a new throw starts at the player current body, never at the target', () => {
    const player = { x: 2, y: 0.32, z: -1 }
    spawnPooledEnemy(4, -1)
    const launch = plan(player, { now: weapon.cooldown, lastFireAt: 0 })
    expect(launch.start).toEqual([2, 0.32, -1])
    expect(launch.hitIds).toHaveLength(1)
    expect([launch.maxBounces, launch.damage, launch.bounceRange]).toEqual([weapon.bounces, weapon.damage, weapon.bounceRange])
    expect(plan(player, { now: weapon.cooldown - 1, lastFireAt: 0 })).toBeNull()
  })

  it('keeps adding throws every cooldown however many are already alive, each from the player', () => {
    const player = { x: 0, y: 0.32, z: 0 }
    spawnPooledEnemy(3, 0)
    const alive = []
    let lastFireAt = 0
    for (let k = 1; k <= 6; k += 1) {
      player.x = -k * 0.5; player.z = k * 0.25
      const now = k * weapon.cooldown
      const launch = plan(player, { now, lastFireAt })
      expect(launch).not.toBeNull()
      expect(launch.start).toEqual([-k * 0.5, 0.32, k * 0.25])
      lastFireAt = now
      alive.push(launch) // 앞선 발사체는 하나도 끝나지 않았다(상한 없음).
    }
    expect(new Set(alive.map((l) => l.id)).size).toBe(6)
  })

  it('after a hit with bounces left it continues from the hit spot to the next unhit enemy in bounce range', () => {
    const player = { x: 0, y: 0.32, z: 0 }
    const first = spawnPooledEnemy(1, 0)
    const second = spawnPooledEnemy(1 + weapon.bounceRange * 0.6, 0)
    const launch = plan(player, { now: weapon.cooldown, lastFireAt: 0 })
    const flight = createOnigiriFlight(launch)
    let hitSpot = null
    run(flight, 600, (state, f) => {
      if (state === FLIGHT_HIT && !hitSpot) hitSpot = { x: f.x, z: f.z, target: f.target }
    })
    expect(hitSpot.x).toBeCloseTo(1)
    expect(hitSpot.target.rb).toBe(enemyPool.get(second.handle)) // 다음 표적을 맞힌 자리에서 바로 이어 받는다
    expect(first.hit).toHaveBeenCalledTimes(0) // 피해는 호출 측(컴포넌트)이 hitTarget으로 준다
    expect(flight.hitSet.size).toBe(2)
  })

  it('hovers in place without drifting when no unhit enemy is in bounce range, then resumes when one comes in', () => {
    const player = { x: 0, y: 0.32, z: 0 }
    spawnPooledEnemy(1, 0)
    const launch = plan(player, { now: weapon.cooldown, lastFireAt: 0 })
    const flight = createOnigiriFlight(launch)
    const states = run(flight, 120)
    expect(states).toContain(FLIGHT_HIT)
    expect(states.at(-1)).toBe(FLIGHT_HOVERING)
    expect(flight.bouncesLeft).toBe(weapon.bounces - 1)
    const parked = { x: flight.x, z: flight.z }

    // 사거리 밖 적만 있다 — 오래 기다려도 사라지지 않고 움직이지도 않는다.
    const far = spawnPooledEnemy(parked.x + weapon.bounceRange + 2, parked.z)
    expect(new Set(run(flight, 600))).toEqual(new Set([FLIGHT_HOVERING]))
    expect([flight.x, flight.z]).toEqual([parked.x, parked.z])

    // 적이 bounceRange 안으로 들어오면 바로 그쪽으로 날아간다.
    enemyPool.despawn(far.handle)
    const near = spawnPooledEnemy(parked.x + weapon.bounceRange * 0.5, parked.z)
    expect(stepOnigiriFlight(flight, DT, SPEED)).toBe(FLIGHT_FLYING)
    expect(flight.target.rb).toBe(enemyPool.get(near.handle))
    expect(flight.x).toBeGreaterThan(parked.x)
  })

  it('when the target dies mid-flight it re-aims from where it is (not from the player) or hovers there', () => {
    const player = { x: 0, y: 0.32, z: 0 }
    const doomed = spawnPooledEnemy(3, 0)
    const launch = plan(player, { now: weapon.cooldown, lastFireAt: 0 })
    const flight = createOnigiriFlight(launch)
    run(flight, 60) // 약 1초 비행
    const midAir = { x: flight.x, z: flight.z }
    expect(midAir.x).toBeGreaterThan(0.5)

    enemyPool.despawn(doomed.handle)
    player.x = -5 // 주인공이 멀리 가도 발사체는 주인공 쪽으로 돌아가지 않는다
    expect(stepOnigiriFlight(flight, DT, SPEED)).toBe(FLIGHT_HOVERING)
    expect([flight.x, flight.z]).toEqual([midAir.x, midAir.z])
    expect(flight.bouncesLeft).toBe(weapon.bounces)

    const next = spawnPooledEnemy(midAir.x, midAir.z + weapon.bounceRange * 0.5)
    expect(stepOnigiriFlight(flight, DT, SPEED)).toBe(FLIGHT_FLYING)
    expect(flight.target.rb).toBe(enemyPool.get(next.handle))
    expect(flight.z).toBeGreaterThan(midAir.z)
  })

  it('ends only when its bounces are used up, never hitting the same enemy twice', () => {
    const player = { x: 0, y: 0.32, z: 0 }
    const enemies = []
    for (let i = 0; i < weapon.bounces + 2; i += 1) enemies.push(spawnPooledEnemy(1 + i * 0.6, 0))
    const launch = plan(player, { now: weapon.cooldown, lastFireAt: 0 })
    const flight = createOnigiriFlight(launch)
    const hitIds = []
    const states = run(flight, 60 * 60, (state, f) => { if (f.hitTarget) hitIds.push(f.hitTarget.enemyId) })
    expect(states.at(-1)).toBe(FLIGHT_DONE)
    expect(hitIds).toHaveLength(weapon.bounces)
    expect(new Set(hitIds).size).toBe(weapon.bounces)
    expect(stepOnigiriFlight(flight, DT, SPEED)).toBe(FLIGHT_DONE)
  })
})

// 2026-11-13 성능 완화: 다음 표적 찾기가 풀 150칸 전체 대신 적 시뮬레이션의 공간 격자(사거리 상자 안 셀)만
// 본다. 고르는 적은 예전 전체 순회와 **완전히 같아야** 한다 — 아래는 예전 구현을 그대로 옮긴 기준 함수다.
function referenceFindNearestUnhitEnemy(enemyBodies, fromX, fromZ, hitSet, range) {
  let poolIndex = -1
  let minDSq = range * range
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    if (hitSet.has(enemyPool.proxies[index]._enemyId)) continue
    const dx = enemyPool.posX[index] - fromX
    const dz = enemyPool.posZ[index] - fromZ
    const dSq = dx * dx + dz * dz
    if (dSq < minDSq) { minDSq = dSq; poolIndex = index }
  }
  let special = null
  enemyBodies.forEach((rb, enemyId) => {
    if (Number.isInteger(rb?.index) && enemyPool.proxies[rb.index] === rb) return
    if (hitSet.has(enemyId) || !isEnemyHitLive(rb)) return
    const t = rb.translation()
    const dx = t.x - fromX
    const dz = t.z - fromZ
    const dSq = dx * dx + dz * dz
    if (dSq < minDSq) { minDSq = dSq; special = { rb, enemyId } }
  })
  if (special) return { ...special, generation: captureEnemyGeneration(special.rb) }
  if (poolIndex < 0) return null
  const rbHit = enemyPool.proxies[poolIndex]
  return { rb: rbHit, enemyId: rbHit._enemyId, generation: enemyPool.generation[poolIndex] }
}

describe('onigiri / mini rosari next-target search through the enemy spatial grid (2026-11-13)', () => {
  function seeded(seed) {
    let state = seed >>> 0
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 0x100000000
    }
  }

  function buildFixture() {
    const rand = seeded(20261113)
    // 맵 안쪽 무리 + 격자 밖(overflow) 몇 마리 + 같은 거리 동점 쌍(인덱스가 작은 쪽이 이겨야 한다).
    for (let i = 0; i < 110; i += 1) spawnPooledEnemy((rand() - 0.5) * 30, (rand() - 0.5) * 30)
    for (const [x, z] of [[70, 0], [-70, 3], [0, 75]]) spawnPooledEnemy(x, z)
    for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1.5, 1.5], [-1.5, -1.5]]) spawnPooledEnemy(10 + x, -6 + z)
    // 3칸 비워 슬롯 재사용·highestActive 경계도 섞는다.
    for (const index of [5, 40, 77]) enemyPool.despawn({ index, generation: enemyPool.generation[index] })
    globalEnemyBodies.set('boss', rb(9.2, -6.1))
    globalEnemyBodies.set('deadBoss', rb(10, -6, false))
  }

  function queries() {
    const rand = seeded(7)
    const out = [
      { x: 10, z: -6, range: 4.5 }, { x: 10, z: -6, range: 3.0 }, // 동점 무리 한가운데
      { x: 0, z: 0, range: Number.POSITIVE_INFINITY },
      { x: 68, z: 1, range: 4.5 }, // overflow 적
    ]
    for (let i = 0; i < 160; i += 1) {
      out.push({ x: (rand() - 0.5) * 40, z: (rand() - 0.5) * 40, range: i % 2 === 0 ? 4.5 : 3.0 })
    }
    return out.map((q, i) => {
      const hitSet = new Set()
      if (i % 3 === 0) {
        for (let k = 0; k < 20; k += 1) {
          const index = Math.floor(rand() * (enemyPool.highestActive + 1))
          if (enemyPool.active[index]) hitSet.add(enemyPool.proxies[index]._enemyId)
        }
        if (i % 6 === 0) hitSet.add('boss')
      }
      return { ...q, hitSet }
    })
  }

  it('picks exactly the same enemy as the old full scan, for ranges 4.5 (onigiri) and 3.0 (mini rosari)', () => {
    buildFixture()
    const grid = enemySimulationRuntime.grid
    grid.rebuild(enemyPool, 54, 54)
    expect(grid.isCurrentFor(enemyPool)).toBe(true) // 격자 경로를 실제로 탄다
    expect(grid.overflowHead).toBeGreaterThanOrEqual(0)

    let found = 0
    for (const q of queries()) {
      const expected = referenceFindNearestUnhitEnemy(globalEnemyBodies, q.x, q.z, q.hitSet, q.range)
      const actual = findNearestUnhitEnemy(globalEnemyBodies, q.x, q.z, q.hitSet, q.range)
      if (expected === null) {
        expect(actual).toBeNull()
        continue
      }
      found += 1
      expect(actual.rb).toBe(expected.rb)
      expect(actual.enemyId).toBe(expected.enemyId)
      expect(actual.generation).toBe(expected.generation)
    }
    expect(found).toBeGreaterThan(40)
    expect(grid.isCurrentFor(enemyPool)).toBe(true)
  })

  it('breaks exact distance ties toward the lower pool index, like the old scan', () => {
    const far = spawnPooledEnemy(-3, 0) // index 0
    const near = spawnPooledEnemy(3, 0) // index 1, 같은 거리
    enemySimulationRuntime.grid.rebuild(enemyPool, 54, 54)
    // 격자는 x가 큰 셀을 나중에 돌지만, 동점이면 인덱스 0이 이겨야 한다(예전 순회와 동일).
    const pick = findNearestUnhitEnemy(new Map(), 0, 0, new Set(), 4.5)
    expect(pick.rb).toBe(enemyPool.get(far.handle))
    expect(near.handle.index).toBe(1)
  })

  it('falls back to the full scan when the grid is stale, with the same answers', () => {
    buildFixture()
    enemySimulationRuntime.grid.rebuild(enemyPool, 54, 54)
    spawnPooledEnemy(10.1, -6.05) // 격자 rebuild 뒤 스폰 → 격자가 낡았다
    expect(enemySimulationRuntime.grid.isCurrentFor(enemyPool)).toBe(false)
    for (const q of queries()) {
      const expected = referenceFindNearestUnhitEnemy(globalEnemyBodies, q.x, q.z, q.hitSet, q.range)
      const actual = findNearestUnhitEnemy(globalEnemyBodies, q.x, q.z, q.hitSet, q.range)
      expect(actual?.rb ?? null).toBe(expected?.rb ?? null)
      expect(actual?.enemyId ?? null).toBe(expected?.enemyId ?? null)
    }
  })
})
