import { describe, expect, it } from 'vitest'
import Stage5Environment, { getStage5EnvironmentScale } from './Stage5Environment.jsx'
import Floor from './Floor.jsx'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'
import { getStageVendingPlacement, isWithinStageVendingRange } from '../lib/stageVending.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getStageObjectColliders, getStageObjectSightObstacles } from './StageObjects/stageObjectColliders.js'

describe('Stage5 current unmocked dependency readiness (not gameplay/WebGL acceptance)', () => {
  it('either consumes registered gameplay bounds or fails closed while gameplay is pending', () => {
    const registered = getStageConfig('stage5').id === 'stage5'
    console.info(`STAGE5_GAMEPLAY_REGISTERED=${registered}`)
    if (!registered) {
      expect(getStage5EnvironmentScale()).toBeNull()
      expect(Stage5Environment()).toBeNull()
      expect(Floor({ stageId: 'stage5' })).toBeNull()
      return
    }
    expect(getStageBounds('stage5')).toEqual({ halfX: 7.5, halfZ: 19.2 })
    expect(getStage5EnvironmentScale()).toEqual([1, 1, 1])
    expect(Stage5Environment()).not.toBeNull()
    expect(Floor({ stageId: 'stage5' })).not.toBeNull()
  })

  it('adds no Stage3-only physics or sight blockers to the open Stage5 court', () => {
    expect(getStageObjectPlacements('stage5')).toEqual([])
    expect(getStageObjectColliders('stage5')).toEqual([])
    expect(getStageObjectSightObstacles('stage5')).toEqual([])
  })

  it('uses the actual gameplay vending contract and a reachable interior approach', () => {
    const placement = getStageVendingPlacement('stage5')
    expect(placement).toMatchObject({ id: 'vending-stage5', position: { x: 6.25, y: 0, z: -14 }, wallSide: 'east' })
    // This is a static XZ geometry check, not a player traversal claim.
    const approach = { x: 4.5, z: -14 }
    expect(Math.abs(approach.x)).toBeLessThan(7.5 - 0.5)
    expect(Math.abs(approach.z)).toBeLessThan(19.2 - 0.5)
    expect(isWithinStageVendingRange(approach, placement)).toBe(true)
  })
})
