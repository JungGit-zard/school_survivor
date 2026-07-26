import { describe, expect, it } from 'vitest'
import { createEnemyHitEventQueue } from './enemyHitEventQueue.js'

describe('EnemyHitEventQueue', () => {
  it('drains events in FIFO order into one caller-owned scratch object', () => {
    const queue = createEnemyHitEventQueue(2)
    const out = {}
    expect(queue.push(1, 2, 3, 4, 5, true)).toBe(true)
    expect(queue.push(6, 7, 8, 9, 10, false)).toBe(true)
    expect(queue.drainInto(out)).toBe(true)
    expect(out).toEqual({ x: 1, sparkY: 2, numberY: 3, z: 4, amount: 5, critical: true })
    expect(queue.drainInto(out)).toBe(true)
    expect(out).toEqual({ x: 6, sparkY: 7, numberY: 8, z: 9, amount: 10, critical: false })
    expect(queue.drainInto(out)).toBe(false)
  })

  it('counts overflow as dropped without overwriting queued hit events', () => {
    const queue = createEnemyHitEventQueue(1)
    const out = {}
    expect(queue.push(1, 0.42, 0.95, 0, 3, false)).toBe(true)
    expect(queue.push(2, 0.42, 0.95, 0, 9, true)).toBe(false)
    expect(queue.dropped).toBe(1)
    queue.drainInto(out)
    expect(out.amount).toBe(3)
  })

  it('rejects invalid spark or number heights without corrupting an already queued hit', () => {
    const queue = createEnemyHitEventQueue(2)
    const out = {}
    expect(queue.push(1, 0.42, 0.95, 0, 3, false)).toBe(true)
    expect(queue.push(2, Number.NaN, 0.95, 0, 9, true)).toBe(false)
    expect(queue.push(3, 0.42, Number.POSITIVE_INFINITY, 0, 9, true)).toBe(false)
    expect(queue.dropped).toBe(2)
    expect(queue.drainInto(out)).toBe(true)
    expect(out).toMatchObject({ x: 1, z: 0, amount: 3, critical: false })
    expect(out.sparkY).toBeCloseTo(0.42)
    expect(out.numberY).toBeCloseTo(0.95)
    expect(queue.count).toBe(0)
  })

  it('keeps a three-minute drain loop drop-free at normal hit cadence', () => {
    const queue = createEnemyHitEventQueue()
    const out = {}
    for (let frame = 0; frame < 10_800; frame += 1) {
      if (frame % 2 === 0) expect(queue.push(frame, 0.42, 0.95, 0, 8, false)).toBe(true)
      while (queue.drainInto(out)) {}
    }
    expect(queue.dropped).toBe(0)
    expect(queue.count).toBe(0)
  })
})
