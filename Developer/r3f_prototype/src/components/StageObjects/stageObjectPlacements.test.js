import { describe, expect, it } from 'vitest'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'

describe('stage object placements', () => {
  it('provides classroom desk props for both playable stages', () => {
    expect(getStageObjectPlacements('stage1').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage2').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage1').every((item) => item.type === 'classroomDesk')).toBe(true)
    expect(getStageObjectPlacements('stage2').every((item) => item.type === 'classroomDesk')).toBe(true)
  })

  it('keeps Stage 1 desks away from the central spawn/play zone', () => {
    expect(
      getStageObjectPlacements('stage1').every(({ position: [x, , z] }) => Math.abs(x) >= 12 || Math.abs(z) >= 12)
    ).toBe(true)
  })

  it('uses disrupted Stage 1 desk variants for a zombie-scattered classroom feel', () => {
    const variants = new Set(
      getStageObjectPlacements('stage1').map(({ props }) => props?.variant ?? 'upright')
    )

    expect(variants).toContain('overturned')
    expect(variants).toContain('tilted')
    expect(variants).toContain('abandoned')
    expect([...variants].every((variant) => CLASSROOM_DESK_VARIANTS[variant])).toBe(true)
    expect(CLASSROOM_DESK_VARIANTS.overturned.modelRotation[2]).toBeCloseTo(Math.PI)
  })

  it('keeps Stage 2 desks near corridor edges instead of the center lane', () => {
    expect(
      getStageObjectPlacements('stage2').every(({ position: [x] }) => Math.abs(x) >= 9.5)
    ).toBe(true)
  })
})
