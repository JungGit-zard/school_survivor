import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, playerPos } from './refs.js'
import { applyRadialDamage, findClosestEnemy } from './weaponTargeting.js'

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

  it('treats radius as a hard boundary (just-inside hits, just-outside misses)', () => {
    const inside = fakeEnemy(0.99, 0)
    const outside = fakeEnemy(1.01, 0)
    enemyBodies.set('in', inside)
    enemyBodies.set('out', outside)

    applyRadialDamage({ x: 0, z: 0, radius: 1, damage: 5, knockback: 1, knockbackMs: 50 })

    expect(inside._enemyHit).toHaveBeenCalledTimes(1)
    expect(outside._enemyHit).not.toHaveBeenCalled()
  })

  it('skips entries missing _enemyHit and returns 0 when nothing is hit', () => {
    enemyBodies.set('broken', { _enemyDead: false, translation: () => ({ x: 0, z: 0 }) })
    const count = applyRadialDamage({ x: 0, z: 0, radius: 2, damage: 5, knockback: 1, knockbackMs: 50 })
    expect(count).toBe(0)
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
})
