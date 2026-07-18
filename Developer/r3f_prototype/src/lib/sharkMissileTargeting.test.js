import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, playerPos } from './refs.js'
import { findSharkMissileClusterTarget } from './sharkMissileTargeting.js'

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

describe('findSharkMissileClusterTarget', () => {
  it('chooses the densest zombie cluster instead of the nearest isolated zombie', () => {
    enemyBodies.set('near-isolated', fakeEnemy(1, 0))
    enemyBodies.set('cluster-a', fakeEnemy(8, 0))
    enemyBodies.set('cluster-b', fakeEnemy(8.3, 0.2))
    enemyBodies.set('cluster-c', fakeEnemy(7.8, -0.2))

    const target = findSharkMissileClusterTarget({ range: 28, radius: 1.8 })

    expect(target).toMatchObject({ enemyId: 'cluster-a', score: 3 })
    expect(target.x).toBeCloseTo(8)
    expect(target.z).toBeCloseTo(0)
  })

  it('ignores dead enemies and returns null when no living enemy is in range', () => {
    enemyBodies.set('dead', fakeEnemy(1, 0, { dead: true }))
    enemyBodies.set('far', fakeEnemy(40, 0))

    expect(findSharkMissileClusterTarget({ range: 28, radius: 1.8 })).toBeNull()
    expect(enemyBodies.has('dead')).toBe(false)
  })
})
