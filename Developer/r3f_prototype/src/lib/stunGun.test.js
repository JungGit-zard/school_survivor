import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, enemyPool, playerPos } from './refs.js'
import { applyEnemyHit } from './weaponCollision.js'
import { findClosestEnemy } from './weaponTargeting.js'
import { pickStunGunChainTarget, STUN_GUN_TARGET_RANGE } from './stunGun.js'

afterEach(() => {
  enemyBodies.clear()
  enemyPool.reset()
  playerPos.set(0, 0, 0)
})

function spawnPooledEnemy(x, z, hit = vi.fn()) {
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 10, maxHp: 10 })
  enemyPool.setHitHandler(handle, hit)
  return { handle, hit }
}

describe('stunGun targeting', () => {
  it('exposes a large finite target range (scanClosestEnemiesInto rejects Infinity)', () => {
    expect(Number.isFinite(STUN_GUN_TARGET_RANGE)).toBe(true)
  })

  it('finds and actually damages the nearest pooled standard enemy (regression: fire logic used to only scan enemyBodies Map)', () => {
    spawnPooledEnemy(5, 0)
    const near = spawnPooledEnemy(1, 0)

    const target = findClosestEnemy(STUN_GUN_TARGET_RANGE)

    expect(target?.rb).toBe(enemyPool.get(near.handle))
    expect(applyEnemyHit(target.rb, target.generation, 6, { knockback: 2.2, knockbackMs: 80 })).toBe(true)
    expect(near.hit).toHaveBeenCalledWith(6, { knockback: 2.2, knockbackMs: 80 })
  })

  it('picks the nearest unhit pooled enemy within chain range around the impact point', () => {
    const inRange = spawnPooledEnemy(2, 0)
    const outOfRange = spawnPooledEnemy(10, 0)
    const alreadyHitRb = enemyPool.get(spawnPooledEnemy(2.2, 0).handle)

    const next = pickStunGunChainTarget(0, 0, new Set([alreadyHitRb]), 4.5)

    expect(next.rb).toBe(enemyPool.get(inRange.handle))
    expect(next.rb).not.toBe(enemyPool.get(outOfRange.handle))
  })

  it('returns null when nothing living is left in chain range', () => {
    expect(pickStunGunChainTarget(0, 0, new Set(), 4.5)).toBeNull()
  })

  it('excludes rb references already present in hitSet (object identity, not enemyId lookup)', () => {
    const target = spawnPooledEnemy(1, 0)
    const rb = enemyPool.get(target.handle)

    expect(pickStunGunChainTarget(0, 0, new Set([rb]), 4.5)).toBeNull()
  })
})
