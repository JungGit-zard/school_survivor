import { describe, expect, it } from 'vitest'
import { RIBBON_POINTS, RIBBON_SPACING, createRibbonTrail } from './vfxRibbonTrail.js'

describe('paper plane ribbon trail (drei Trail style, one draw call)', () => {
  it('follows a slot, records history by distance and collapses when released', () => {
    const ribbon = createRibbonTrail(4)
    const pos = ribbon.mesh.geometry.getAttribute('position').array
    const vertsPerSlot = RIBBON_POINTS * 2 * 3
    ribbon.update(1, 0, 0.5, 0, 0)
    for (let i = 1; i <= 20; i += 1) ribbon.update(1, i * RIBBON_SPACING * 1.1, 0.5, 0, i * 16)
    ribbon.commit()
    const head = 1 * vertsPerSlot
    // Head pair straddles the plane at y 0.5; the tail lies behind (smaller x).
    expect(pos[head + 1]).toBeCloseTo(0.5)
    expect((pos[head] + pos[head + 3]) / 2).toBeCloseTo(20 * RIBBON_SPACING * 1.1)
    const tail = head + (RIBBON_POINTS - 1) * 6
    expect(pos[tail]).toBeLessThan(pos[head])
    // Head is wider than the tail (0.14 vs 0.02 half width).
    expect(Math.abs(pos[head + 2] - pos[head + 5])).toBeGreaterThan(Math.abs(pos[tail + 2] - pos[tail + 5]))
    ribbon.release(1)
    expect(Array.from(pos.slice(head, head + vertsPerSlot)).every((v) => v === 0)).toBe(true)
    ribbon.dispose()
  })

  it('restarts the history when a slot is reused by a new plane', () => {
    const ribbon = createRibbonTrail(2)
    const pos = ribbon.mesh.geometry.getAttribute('position').array
    ribbon.update(0, 0, 0.5, 0, 0)
    ribbon.update(0, 1, 0.5, 0, 500)
    ribbon.update(0, 5, 0.5, 5, 10) // younger age = new plane in the same slot
    const tail = (RIBBON_POINTS - 1) * 6
    expect((pos[tail] + pos[tail + 3]) / 2).toBeCloseTo(5)
    expect((pos[tail + 2] + pos[tail + 5]) / 2).toBeCloseTo(5)
  })
})
