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

    // 세 클러스터 후보는 모두 3점으로 동률이다. 풀/특수 적 혼합 스캔의 거리 정렬은
    // 내부 구현이며, 특정 Map 삽입 순서를 타게팅 계약으로 고정하지 않는다.
    expect(target?.score).toBe(3)
    expect(['cluster-a', 'cluster-b', 'cluster-c']).toContain(target?.enemyId)
    expect(target?.x).toBeGreaterThan(7)
    expect(target?.x).toBeLessThan(9)
    expect(target?.z).toBeGreaterThan(-1)
    expect(target?.z).toBeLessThan(1)
  })

  it('ignores dead enemies and returns null when no living enemy is in range', () => {
    enemyBodies.set('dead', fakeEnemy(1, 0, { dead: true }))
    enemyBodies.set('far', fakeEnemy(40, 0))

    expect(findSharkMissileClusterTarget({ range: 28, radius: 1.8 })).toBeNull()
    expect(enemyBodies.has('dead')).toBe(false)
  })
})
