import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, playerPos } from './refs.js'
import { applyRadialDamage, findClosestEnemies, findClosestEnemy, isPlayerWeaponSightBlocked, isInForwardBox, applyForwardBoxDamage, isInForwardCone, applyForwardConeDamage } from './weaponTargeting.js'

function fakeEnemy(x, z, { dead = false } = {}) {
  return {
    _enemyDead: dead,
    _enemyHit: vi.fn(),
    translation: () => ({ x, y: 0, z }),
  }
}

afterEach(() => {
  enemyBodies.clear()
  playerPos.set(0, 0, 0)
})

describe('player weapon prop raycast', () => {
  it('blocks a target when a stage prop collider intersects the player-to-target ray', () => {
    const deskCollider = { x: 0, z: 1, halfX: 0.5, halfZ: 0.35, rotationY: 0 }

    expect(isPlayerWeaponSightBlocked({ x: 0, z: 2 }, 'stage2', [deskCollider])).toBe(true)
    expect(isPlayerWeaponSightBlocked({ x: 2.5, z: 2 }, 'stage2', [deskCollider])).toBe(false)
  })
})

describe('isInForwardCone / applyForwardConeDamage (student lantern)', () => {
  it('widens from the player toward the 12 o clock direction', () => {
    const cone = { length: 5.2, width: 3.6, baseWidth: 0.35 }
    const origin = { originX: 0, originZ: 0, dirX: 0, dirZ: 1 }

    expect(isInForwardCone(origin, { x: 0, z: 4.2 }, cone)).toBe(true)
    expect(isInForwardCone(origin, { x: 1.45, z: 4.2 }, cone)).toBe(true)
    expect(isInForwardCone(origin, { x: 1.2, z: 0.4 }, cone)).toBe(false)
    expect(isInForwardCone(origin, { x: 0, z: -0.2 }, cone)).toBe(false)
  })

  it('damages enemies inside the lantern cone without hitting near-side enemies outside the beam', () => {
    const center = fakeEnemy(0, 3.8)
    const farSide = fakeEnemy(1.2, 3.5)
    const nearSide = fakeEnemy(1.2, 0.4)
    enemyBodies.set('center', center)
    enemyBodies.set('farSide', farSide)
    enemyBodies.set('nearSide', nearSide)

    const hits = applyForwardConeDamage({
      originX: 0, originZ: 0, dirX: 0, dirZ: 1,
      length: 5.2, width: 3.6, baseWidth: 0.35, damage: 9,
    })

    expect(hits).toBe(2)
    expect(center._enemyHit).toHaveBeenCalledWith(9, expect.objectContaining({ knockback: 0 }))
    expect(farSide._enemyHit).toHaveBeenCalledWith(9, expect.objectContaining({ knockback: 0 }))
    expect(nearSide._enemyHit).not.toHaveBeenCalled()
  })

  it('does not damage a cone target hidden by a prop sight blocker', () => {
    const blocked = fakeEnemy(0, 3.8)
    enemyBodies.set('blocked', blocked)

    const hits = applyForwardConeDamage({
      originX: 0, originZ: 0, dirX: 0, dirZ: 1,
      length: 5.2, width: 3.6, baseWidth: 0.35, damage: 9,
      sightBlocker: () => true,
    })

    expect(hits).toBe(0)
    expect(blocked._enemyHit).not.toHaveBeenCalled()
  })
})

describe('applyRadialDamage', () => {
  it('hits only living enemies within radius, once each, with the given impact', () => {
    const inA = fakeEnemy(0.5, 0)
    const inB = fakeEnemy(-0.3, 0.3)
    const out = fakeEnemy(5, 5)
    const dead = fakeEnemy(0.1, 0.1, { dead: true })
    enemyBodies.set('a', inA)
    enemyBodies.set('b', inB)
    enemyBodies.set('out', out)
    enemyBodies.set('dead', dead)

    const count = applyRadialDamage({ x: 0, z: 0, radius: 1, damage: 7, knockback: 2, knockbackMs: 80 })

    expect(count).toBe(2)
    expect(inA._enemyHit).toHaveBeenCalledTimes(1)
    expect(inA._enemyHit).toHaveBeenCalledWith(7, { source: { x: 0, z: 0 }, knockback: 2, knockbackMs: 80 })
    expect(inB._enemyHit).toHaveBeenCalledTimes(1)
    expect(out._enemyHit).not.toHaveBeenCalled()
    expect(dead._enemyHit).not.toHaveBeenCalled()
  })

  it('forwards a forced death style to enemies hit by explosive weapons', () => {
    const enemy = fakeEnemy(0.5, 0)
    enemyBodies.set('enemy', enemy)

    applyRadialDamage({
      x: 0,
      z: 0,
      radius: 1,
      damage: 99,
      knockback: 3,
      knockbackMs: 120,
      deathStyleOverride: 'shatter5',
    })

    expect(enemy._enemyHit).toHaveBeenCalledWith(99, {
      source: { x: 0, z: 0 },
      knockback: 3,
      knockbackMs: 120,
      deathStyleOverride: 'shatter5',
    })
  })

  it('treats radius as a hard boundary (just-inside hits, just-outside misses)', () => {
    const inside = fakeEnemy(0.99, 0)
    const outside = fakeEnemy(1.01, 0)
    enemyBodies.set('in', inside)
    enemyBodies.set('out', outside)

    applyRadialDamage({ x: 0, z: 0, radius: 1, damage: 5, knockback: 1, knockbackMs: 50 })

    expect(inside._enemyHit).toHaveBeenCalledTimes(1)
    expect(outside._enemyHit).not.toHaveBeenCalled()
  })

  it('does not apply splash damage through a prop sight blocker', () => {
    const blocked = fakeEnemy(0.5, 0)
    enemyBodies.set('blocked', blocked)

    expect(applyRadialDamage({ x: 0, z: 0, radius: 1, damage: 5, knockback: 0, knockbackMs: 0, sightBlocker: () => true })).toBe(0)
    expect(blocked._enemyHit).not.toHaveBeenCalled()
  })

  it('skips entries missing _enemyHit and returns 0 when nothing is hit', () => {
    enemyBodies.set('broken', { _enemyDead: false, translation: () => ({ x: 0, z: 0 }) })
    const count = applyRadialDamage({ x: 0, z: 0, radius: 2, damage: 5, knockback: 1, knockbackMs: 50 })
    expect(count).toBe(0)
  })

  it('does not hit every enemy when radius is missing', () => {
    const enemy = fakeEnemy(50, 50)
    enemyBodies.set('enemy', enemy)

    const count = applyRadialDamage({ x: 0, z: 0, radius: undefined, damage: 5, knockback: 0, knockbackMs: 0 })

    expect(count).toBe(0)
    expect(enemy._enemyHit).not.toHaveBeenCalled()
  })
})

describe('findClosestEnemy', () => {
  it('returns the nearest living enemy within range and prunes dead ones', () => {
    enemyBodies.set('near', fakeEnemy(1, 0))
    enemyBodies.set('far', fakeEnemy(3, 0))
    enemyBodies.set('dead', fakeEnemy(0.2, 0, { dead: true }))

    const closest = findClosestEnemy(5)

    expect(closest?.enemyId).toBe('near')
    // dead entries are deleted from the shared map during the scan
    expect(enemyBodies.has('dead')).toBe(false)
  })

  it('returns null when no enemy is within range', () => {
    enemyBodies.set('far', fakeEnemy(10, 0))
    expect(findClosestEnemy(5)).toBeNull()
  })

  it('returns distinct nearest enemies for multi-projectile weapons', () => {
    enemyBodies.set('third', fakeEnemy(3, 0))
    enemyBodies.set('first', fakeEnemy(1, 0))
    enemyBodies.set('second', fakeEnemy(2, 0))
    enemyBodies.set('outside', fakeEnemy(8, 0))

    expect(findClosestEnemies(5, 3).map((target) => target.enemyId)).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('skips blocked enemies so projectiles select the next visible target', () => {
    enemyBodies.set('blocked', fakeEnemy(1, 0))
    enemyBodies.set('visible', fakeEnemy(2, 0))

    expect(findClosestEnemy(5, { sightBlocker: ({ x }) => x === 1 })?.enemyId).toBe('visible')
  })
})

describe('isInForwardBox / applyForwardBoxDamage (학생용 랜턴)', () => {
  it('전방 박스 안팎을 정확히 판정한다 (+z 방향)', () => {
    const box = { length: 1.9, width: 1.9 }
    const origin = { originX: 0, originZ: 0, dirX: 0, dirZ: 1 }

    expect(isInForwardBox(origin, { x: 0, z: 1.0 }, box)).toBe(true)     // 정면 중앙
    expect(isInForwardBox(origin, { x: 0.9, z: 1.8 }, box)).toBe(true)   // 모서리 안
    expect(isInForwardBox(origin, { x: 0, z: 2.0 }, box)).toBe(false)    // 깊이 초과
    expect(isInForwardBox(origin, { x: 1.0, z: 1.0 }, box)).toBe(false)  // 폭 초과
    expect(isInForwardBox(origin, { x: 0, z: -0.5 }, box)).toBe(false)   // 후방
  })

  it('대각 방향에서도 회전된 박스로 판정한다', () => {
    const d = Math.SQRT1_2
    const origin = { originX: 0, originZ: 0, dirX: d, dirZ: d }
    expect(isInForwardBox(origin, { x: 1, z: 1 }, { length: 1.9, width: 1.9 })).toBe(true)
    expect(isInForwardBox(origin, { x: -1, z: 1 }, { length: 1.9, width: 1.9 })).toBe(false) // 측면 밖
  })

  it('빛 상자 안 전원 타격, 넉백 없음', () => {
    const inFront = fakeEnemy(0.2, 1.2)
    const behind = fakeEnemy(0, -1)
    const side = fakeEnemy(1.5, 1.0)
    enemyBodies.set('f', inFront)
    enemyBodies.set('b', behind)
    enemyBodies.set('s', side)

    const hits = applyForwardBoxDamage({
      originX: 0, originZ: 0, dirX: 0, dirZ: 1,
      length: 1.9, width: 1.9, damage: 9,
    })

    expect(hits).toBe(1)
    expect(inFront._enemyHit).toHaveBeenCalledWith(9, expect.objectContaining({ knockback: 0 }))
    expect(behind._enemyHit).not.toHaveBeenCalled()
    expect(side._enemyHit).not.toHaveBeenCalled()
  })

  it('does not damage a forward-box target hidden by a prop sight blocker', () => {
    const blocked = fakeEnemy(0, 1.2)
    enemyBodies.set('blocked', blocked)

    const hits = applyForwardBoxDamage({
      originX: 0, originZ: 0, dirX: 0, dirZ: 1,
      length: 1.9, width: 1.9, damage: 9,
      sightBlocker: () => true,
    })

    expect(hits).toBe(0)
    expect(blocked._enemyHit).not.toHaveBeenCalled()
  })
})
