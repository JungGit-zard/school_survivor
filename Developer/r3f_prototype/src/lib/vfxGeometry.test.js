import { describe, expect, it } from 'vitest'
import { getChargeWarningArrowConfig } from './vfxGeometry.js'

describe('charge warning geometry', () => {
  it('uses half the old default width for red zombie charge warnings', () => {
    const config = getChargeWarningArrowConfig({ length: 6 })

    expect(config.width).toBe(0.35)
  })

  it('points forward with a triangular arrow head', () => {
    const config = getChargeWarningArrowConfig({ width: 0.35, length: 6 })
    const tip = config.points[4]
    const maxY = Math.max(...config.points.map(([, y]) => y))

    expect(tip).toEqual([0, 3])
    expect(tip[1]).toBe(maxY)
    expect(config.points[3][0]).toBeGreaterThan(config.points[2][0])
    expect(config.points[5][0]).toBeLessThan(config.points[6][0])
  })
})
