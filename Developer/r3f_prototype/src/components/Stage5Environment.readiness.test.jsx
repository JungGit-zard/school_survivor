import { describe, expect, it } from 'vitest'
import Stage5Environment, { getStage5EnvironmentScale } from './Stage5Environment.jsx'
import Floor from './Floor.jsx'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'
import { getPlayerMovementBounds } from '../lib/playerMovementBounds.js'
import { getStageVendingPlacement, isWithinStageVendingRange } from '../lib/stageVending.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getStageObjectColliders, getStageObjectFootprint, getStageObjectSightObstacles } from './StageObjects/stageObjectColliders.js'

describe('Stage5 current unmocked dependency readiness (not gameplay/WebGL acceptance)', () => {
  it('consumes the registered staff room bounds and mounts the environment', () => {
    expect(getStageConfig('stage5').id).toBe('stage5')
    expect(getStageBounds('stage5')).toEqual({ halfX: 9.36, halfZ: 16 })
    expect(getStage5EnvironmentScale()).toEqual([1, 1, 1])
    expect(Stage5Environment()).not.toBeNull()
    expect(Floor({ stageId: 'stage5' })).not.toBeNull()
  })

  it('registers 34 staff room placements whose 20 solids are the only physics and sight blockers', () => {
    expect(getStageObjectPlacements('stage5')).toHaveLength(34)
    expect(getStageObjectColliders('stage5')).toHaveLength(20)
    expect(new Set(getStageObjectSightObstacles('stage5').map(({ id }) => id)).size).toBe(20)
  })

  it('keeps the vending machine reachable from the player area and clear of every solid prop', () => {
    const placement = getStageVendingPlacement('stage5')
    expect(placement).toMatchObject({ id: 'vending-stage5', position: { x: 8.55, y: 0, z: -10.6 }, wallSide: 'east' })
    // Static XZ geometry: the nearest point the player can stand on, not a traversal claim.
    const bounds = getPlayerMovementBounds('stage5')
    const approach = {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, placement.position.x)),
      z: Math.min(bounds.maxZ, Math.max(bounds.minZ, placement.position.z)),
    }
    expect(isWithinStageVendingRange(approach, placement)).toBe(true)
    for (const prop of getStageObjectPlacements('stage5')) {
      const footprint = getStageObjectFootprint(prop)
      if (!footprint) continue
      for (const point of [approach, placement.position]) {
        const inside = Math.abs(point.x - footprint.x) <= footprint.halfX && Math.abs(point.z - footprint.z) <= footprint.halfZ
        expect(inside, prop.id).toBe(false)
      }
    }
  })
})
