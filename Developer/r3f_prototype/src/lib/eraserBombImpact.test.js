import { describe, expect, it, vi } from 'vitest'
import { applyEraserBombImpact } from './eraserBombImpact.js'

describe('applyEraserBombImpact', () => {
  it('uses the eraser bomb combat contract exactly once', () => {
    const applyDamage = vi.fn(() => 3)

    expect(applyEraserBombImpact({ x: 2, z: -4, damage: 26, radius: 1.35, applyDamage })).toBe(3)
    expect(applyDamage).toHaveBeenCalledTimes(1)
    expect(applyDamage).toHaveBeenCalledWith({
      x: 2,
      z: -4,
      damage: 26,
      radius: 1.35,
      knockback: 2.5,
      knockbackMs: 120,
      deathStyleOverride: 'shatter5',
      canCrit: false,
      damageType: 'explosive',
      attackTags: ['radial', 'explosive'],
      ignoreSightBlock: false,
    })
  })

  it('forwards an explicit sight blocker only to callers that need one', () => {
    const applyDamage = vi.fn(() => 1)
    const sightBlocker = () => false

    applyEraserBombImpact({ x: 0, z: 0, damage: 1, radius: 1, sightBlocker, applyDamage })

    expect(applyDamage).toHaveBeenCalledWith(expect.objectContaining({ sightBlocker }))
  })

  it('forwards the second sight gate bypass only when explicitly requested', () => {
    const applyDamage = vi.fn(() => 1)

    applyEraserBombImpact({ x: 0, z: 0, damage: 1, radius: 1, ignoreSightBlock: true, applyDamage })

    expect(applyDamage).toHaveBeenCalledWith(expect.objectContaining({ ignoreSightBlock: true }))
  })
})
