import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FLIGHT_DONE, FLIGHT_FLYING, FLIGHT_HIT, FLIGHT_HOVERING,
  createOnigiriBurstGrains, createOnigiriFlight, pickNextOnigiriTarget, planOnigiriFrame, stepOnigiriFlight,
} from './onigiri.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'
import { applyEnemyHit } from './weaponCollision.js'

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
