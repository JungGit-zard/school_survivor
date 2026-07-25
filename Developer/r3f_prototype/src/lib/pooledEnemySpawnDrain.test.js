import { describe, expect, it } from 'vitest'
import {
  POOLED_ENEMY_SPAWN_DRAIN_PER_FRAME,
  createPooledEnemySpawnDrainQueue,
  drainPooledEnemySpawnQueue,
  enqueuePooledEnemySpawn,
  resetPooledEnemySpawnDrainQueue,
} from './pooledEnemySpawnDrain.js'

function enqueueRange(queue, count, token = 1) {
  for (let index = 0; index < count; index += 1) {
    expect(enqueuePooledEnemySpawn(queue, { id: index }, token)).toBe(true)
  }
}

describe('pooled enemy spawn drain', () => {
  it.each([14, 27, 20])('drains a %i-entry wave in ordered groups of at most three', (count) => {
    const queue = createPooledEnemySpawnDrainQueue()
    const spawned = []
    enqueueRange(queue, count)
    while (queue.count > 0) {
      const before = spawned.length
      const result = drainPooledEnemySpawnQueue(queue, 1, (entry) => {
        spawned.push(entry.id)
        return true
      })
      expect(result.consumed).toBeLessThanOrEqual(POOLED_ENEMY_SPAWN_DRAIN_PER_FRAME)
      expect(spawned.length - before).toBeLessThanOrEqual(POOLED_ENEMY_SPAWN_DRAIN_PER_FRAME)
    }
    expect(spawned).toEqual(Array.from({ length: count }, (_, index) => index))
  })

  it('drops pending entries on reset so a previous stage cannot spawn later', () => {
    const queue = createPooledEnemySpawnDrainQueue()
    enqueueRange(queue, 14, 7)
    resetPooledEnemySpawnDrainQueue(queue)
    const spawned = []
    expect(drainPooledEnemySpawnQueue(queue, 8, (entry) => spawned.push(entry.id))).toMatchObject({ consumed: 0, spawned: 0, remaining: 0 })
    expect(spawned).toEqual([])
  })

  it('rejects a stale stage token without calling spawn', () => {
    const queue = createPooledEnemySpawnDrainQueue()
    enqueueRange(queue, 3, 1)
    const spawned = []
    const result = drainPooledEnemySpawnQueue(queue, 2, (entry) => {
      spawned.push(entry.id)
      return true
    })
    expect(result).toMatchObject({ consumed: 3, spawned: 0, remaining: 0 })
    expect(queue.staleDropped).toBe(3)
    expect(spawned).toEqual([])
  })

  it('counts overflow and keeps the already queued FIFO entries intact', () => {
    const queue = createPooledEnemySpawnDrainQueue(3)
    enqueueRange(queue, 3)
    expect(enqueuePooledEnemySpawn(queue, { id: 99 }, 1)).toBe(false)
    expect(queue.dropped).toBe(1)
    const spawned = []
    drainPooledEnemySpawnQueue(queue, 1, (entry) => {
      spawned.push(entry.id)
      return true
    })
    expect(spawned).toEqual([0, 1, 2])
  })
})
