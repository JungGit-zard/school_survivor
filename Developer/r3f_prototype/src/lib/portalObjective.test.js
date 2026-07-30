import { describe, expect, it } from 'vitest'
import {
  getPortalDirectionArrow,
  getPortalObjective,
  worldUnitsToZombieMeters,
} from './portalObjective.js'
import { clearPortalTarget, portalTarget, publishPortalTarget } from './refs.js'

describe('portal objective direction', () => {
  it.each([
    [0, -1, '↑'], [1, -1, '↗'], [1, 0, '→'], [1, 1, '↘'],
    [0, 1, '↓'], [-1, 1, '↙'], [-1, 0, '←'], [-1, -1, '↖'],
  ])('maps world (%i, %i) to %s', (x, z, arrow) => {
    expect(getPortalDirectionArrow(x, z)).toBe(arrow)
  })

  it('uses the canonical 1zm = 0.75 world unit conversion and rounds up for guidance', () => {
    expect(worldUnitsToZombieMeters(0)).toBe(0)
    expect(worldUnitsToZombieMeters(0.01)).toBe(1)
    expect(worldUnitsToZombieMeters(0.75)).toBe(1)
    expect(worldUnitsToZombieMeters(0.76)).toBe(2)
  })

  it('hides inactive targets and returns a directional distance for active targets', () => {
    expect(getPortalObjective({ x: 0, z: 0 }, { active: false, x: 1, z: 1 })).toBeNull()
    expect(getPortalObjective({ x: 0, z: 0 }, { active: true, x: 0, z: -1.5 })).toEqual({ arrow: '↑', distanceZm: 2 })
  })
})

describe('portal target runtime contract', () => {
  it('publishes the mounted portal target and fully clears it on unmount/reset', () => {
    publishPortalTarget(4, -3)
    expect(portalTarget).toEqual({ active: true, x: 4, z: -3 })

    clearPortalTarget()
    expect(portalTarget).toEqual({ active: false, x: 0, z: 0 })
  })
})
