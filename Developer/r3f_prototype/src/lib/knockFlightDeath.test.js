// Knock-flight death VFX pool: bounded, allocation-free, racer timing (0.7 s flight → 8-puff pop), deterministic.
import { describe, expect, it } from 'vitest'
import {
  KNOCK_FLIGHT_CAPACITY, KNOCK_FLIGHT_PUFF_CAPACITY, KNOCK_FLIGHT_PUFFS_PER_POP, KNOCK_FLIGHT_SEC,
  createKnockFlightPool, drainKnockFlightPops, getKnockFlightPuffScale, resetKnockFlightPool, spawnKnockFlightDeath, stepKnockFlightPool,
} from './knockFlightDeath.js'

const PALETTE = { body: 0x2c3a66, skin: 0x7fae5a, eye: 0xd8353a, bottom: 0x2a2a36 }

function bufferSnapshot(pool) {
  // Every typed array keeps its identity and size forever (no reallocation, no growth).
  return Object.entries(pool).filter(([, v]) => ArrayBuffer.isView(v) || Array.isArray(v)).map(([k, v]) => [k, v, v.length])
}
function expectSameBuffers(pool, snapshot) {
  for (const [key, ref, length] of snapshot) {
    expect(pool[key], key).toBe(ref)
    expect(pool[key].length, key).toBe(length)
  }
}

describe('knock-flight death pool', () => {
  it('flies for 0.7 s (up and away, spinning) and then pops into 8 puffs', () => {
    const pool = createKnockFlightPool()
    const slot = spawnKnockFlightDeath(pool, 1, 0.3, 2, 1, 0, 0.333, PALETTE)
    expect(slot).toBe(0)
    expect(pool.activeCount).toBe(1)
    const ry0 = pool.ry[slot]
    let peakY = pool.y[slot]
    const dt = 1 / 60
    let t = 0
    while (pool.active[slot] && t < 2) { stepKnockFlightPool(pool, dt); t += dt; if (pool.active[slot]) peakY = Math.max(peakY, pool.y[slot]) }
    expect(t).toBeGreaterThanOrEqual(KNOCK_FLIGHT_SEC - 1e-6)
    expect(t).toBeLessThan(KNOCK_FLIGHT_SEC + 2 * dt)
    expect(peakY).toBeGreaterThan(0.3 + 0.3) // rose clearly above the death spot
    expect(pool.x[slot]).toBeGreaterThan(1.5) // flung along +X (the hit direction)
    expect(pool.ry[slot]).not.toBeCloseTo(ry0, 3) // tumbled
    expect(pool.activeCount).toBe(0)
    expect(pool.puffCount).toBe(KNOCK_FLIGHT_PUFFS_PER_POP)
    expect(pool.popped).toBe(1)
    // the pop is handed over once (purified student spot)
    const pops = []
    expect(drainKnockFlightPops(pool, (x, z, scale, palette) => pops.push([x, z, scale, palette]))).toBe(1)
    expect(pops[0][3]).toBe(PALETTE)
    expect(drainKnockFlightPops(pool, () => {})).toBe(0)
    // puffs grow then vanish
    for (let i = 0; i < 60; i += 1) stepKnockFlightPool(pool, dt)
    expect(pool.puffCount).toBe(0)
    expect(pool.puffActive.every((v) => v === 0)).toBe(true)
  })

  it('never allocates or grows: 2,000 deaths in bursts keep every buffer and stay within capacity', () => {
    const pool = createKnockFlightPool()
    const snapshot = bufferSnapshot(pool)
    let maxBodies = 0; let maxPuffs = 0
    for (let frame = 0; frame < 2000; frame += 1) {
      // 1 death per frame, plus a 10-death burst every 50 frames (a car ploughing a horde)
      const deaths = frame % 50 === 0 ? 11 : 1
      for (let d = 0; d < deaths; d += 1) spawnKnockFlightDeath(pool, d * 0.3, 0.3, frame * 0.01, (d % 3) - 1, 1, 0.333, PALETTE)
      stepKnockFlightPool(pool, 1 / 60)
      drainKnockFlightPops(pool, () => {})
      maxBodies = Math.max(maxBodies, pool.activeCount)
      maxPuffs = Math.max(maxPuffs, pool.puffCount)
      expect(pool.activeCount).toBe(pool.active.reduce((sum, v) => sum + v, 0))
      expect(pool.puffCount).toBe(pool.puffActive.reduce((sum, v) => sum + v, 0))
    }
    expectSameBuffers(pool, snapshot)
    expect(maxBodies).toBeLessThanOrEqual(KNOCK_FLIGHT_CAPACITY)
    expect(maxPuffs).toBeLessThanOrEqual(KNOCK_FLIGHT_PUFF_CAPACITY)
    expect(pool.spawned).toBe(2000 + 40 * 10)
    expect(pool.recycled).toBeGreaterThan(0) // bursts beyond 24 live flights pop the oldest early
    expect(pool.popCount).toBe(0)
  })

  it('recycles the oldest flight when full (it pops early) instead of dropping the new death', () => {
    const pool = createKnockFlightPool(4, 32)
    for (let i = 0; i < 4; i += 1) { spawnKnockFlightDeath(pool, i, 0.3, 0, 1, 0, 0.333, PALETTE); stepKnockFlightPool(pool, 0.05) }
    expect(pool.activeCount).toBe(4)
    const slot = spawnKnockFlightDeath(pool, 9, 0.3, 9, 0, 1, 0.333, PALETTE)
    expect(slot).toBe(0) // slot 0 was the oldest
    expect(pool.x[slot]).toBe(9)
    expect(pool.recycled).toBe(1)
    expect(pool.popped).toBe(1)
    expect(pool.activeCount).toBe(4)
  })

  it('makes fewer puffs instead of growing when the puff pool is full', () => {
    const pool = createKnockFlightPool(8, 10)
    for (let i = 0; i < 3; i += 1) spawnKnockFlightDeath(pool, i, 0.3, 0, 1, 0, 0.333, PALETTE)
    for (let t = 0; t < KNOCK_FLIGHT_SEC + 0.01; t += 0.05) stepKnockFlightPool(pool, 0.05) // puffs (life ≥ 0.38 s) outlive the pops
    expect(pool.activeCount).toBe(0)
    expect(pool.puffCount).toBe(10)
    expect(pool.puffsDropped).toBe(3 * KNOCK_FLIGHT_PUFFS_PER_POP - 10)
  })

  it('is deterministic (no Math.random), picks a direction when none is given, and resets in place', () => {
    const a = createKnockFlightPool(); const b = createKnockFlightPool()
    const original = Math.random
    Math.random = () => { throw new Error('Math.random used') }
    try {
      for (const pool of [a, b]) { spawnKnockFlightDeath(pool, 0, 0.3, 0, 0, 0, 0.333, null); stepKnockFlightPool(pool, 0.3) }
    } finally { Math.random = original }
    expect(Array.from(a.x)).toEqual(Array.from(b.x))
    expect(Math.hypot(a.vx[0], a.vz[0])).toBeGreaterThan(0)
    expect(a.body[0]).toBe(0x4a7a2c) // null palette → E01 colours
    const snapshot = bufferSnapshot(a)
    resetKnockFlightPool(a)
    expect(a.activeCount).toBe(0)
    expect(a.puffCount).toBe(0)
    expectSameBuffers(a, snapshot)
  })

  it('puff scale follows the racer curve: 1.2x at 30 % of life, 0 at the end', () => {
    expect(getKnockFlightPuffScale(0, 0.5, 1)).toBe(0)
    expect(getKnockFlightPuffScale(0.15, 0.5, 1)).toBeCloseTo(1.2, 5)
    expect(getKnockFlightPuffScale(0.5, 0.5, 1)).toBeCloseTo(0, 5)
  })
})
