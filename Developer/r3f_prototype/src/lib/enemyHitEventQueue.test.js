import { describe, expect, it } from 'vitest'
import { createEnemyHitEventQueue } from './enemyHitEventQueue.js'

describe('EnemyHitEventQueue', () => {
  it('drains events in FIFO order into one caller-owned scratch object', () => {
    const queue = createEnemyHitEventQueue(2)
    const out = {}
    expect(queue.push(1, 2, 3, 4, true)).toBe(true)
    expect(queue.push(5, 6, 7, 8, false)).toBe(true)
    expect(queue.drainInto(out)).toBe(true)
    expect(out).toEqual({ x: 1, y: 2, z: 3, amount: 4, critical: true })
    expect(queue.drainInto(out)).toBe(true)
    expect(out).toEqual({ x: 5, y: 6, z: 7, amount: 8, critical: false })
    expect(queue.drainInto(out)).toBe(false)
  })

  it('counts overflow as dropped without overwriting queued hit events', () => {
    const queue = createEnemyHitEventQueue(1)
    const out = {}
    expect(queue.push(1, 0, 0, 3, false)).toBe(true)
    expect(queue.push(2, 0, 0, 9, true)).toBe(false)
    expect(queue.dropped).toBe(1)
    queue.drainInto(out)
    expect(out.amount).toBe(3)
  })

  it('keeps a three-minute drain loop drop-free at normal hit cadence', () => {
    const queue = createEnemyHitEventQueue()
    const out = {}
    for (let frame = 0; frame < 10_800; frame += 1) {
      if (frame % 2 === 0) expect(queue.push(frame, 0, 0, 8, false)).toBe(true)
      while (queue.drainInto(out)) {}
    }
    expect(queue.dropped).toBe(0)
    expect(queue.count).toBe(0)
  })
})
