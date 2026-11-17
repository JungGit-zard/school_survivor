import { describe, expect, it } from 'vitest'
import { STAGE_CAMERA_END_REVEAL, clampGameplayCameraFocus, getGameplayGroundReach, getStageCameraEndReveal } from './gameCameraFraming.js'
import { getStageBounds } from './stageConfig.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'stage9', 'stage10']
const ASPECTS = [390 / 844, 375 / 667, 450 / 800]

describe('Stage 6 camera end reveal (rendering only, constant zoom)', () => {
  it('exists for stage6 only: every other stage keeps the plain clamp camera (null at every position)', () => {
    expect(Object.keys(STAGE_CAMERA_END_REVEAL)).toEqual(['stage6'])
    for (const stageId of STAGES.filter((id) => id !== 'stage6')) {
      const { halfZ } = getStageBounds(stageId)
      for (let z = -halfZ; z <= halfZ; z += 0.5) {
        expect(getStageCameraEndReveal(stageId, { fov: 30, fitZoom: 1, halfZ, playerZ: z }), `${stageId} z=${z}`).toBeNull()
      }
    }
  })

  it('never zooms, never gives less interior view than mid-field, never shows arena the plain clamp hid, and frames the school front / gate', () => {
    // Derived from the stage data, so it holds for whatever arena size stage 6 has.
    const { halfX, halfZ } = getStageBounds('stage6')
    const move = getPlayerMovementBounds('stage6')
    for (const aspect of ASPECTS) {
      const base = getGameplayGroundReach(30, aspect)
      const fitZoom = base.reachSideNear > halfX ? base.reachSideNear / halfX : 1
      const up = base.reachUp / fitZoom, down = base.reachDown / fitZoom
      for (let z = move.minZ; z <= move.maxZ + 1e-9; z += 0.25) {
        const plainFz = clampGameplayCameraFocus(z, up, down, halfZ)
        const r = getStageCameraEndReveal('stage6', { fov: 30, fitZoom, halfZ, playerZ: z })
        expect(r.zoom, `z=${z}`).toBe(fitZoom)
        expect(r.plainViewTop).toBeCloseTo(plainFz - up, 6)
        // Interior view (the side facing the middle of the board) at least the mid-field amount.
        if (z <= 0) expect(r.viewBottom - z, `below z=${z}`).toBeGreaterThanOrEqual(down - 1e-6)
        if (z >= 0) expect(z - r.viewTop, `above z=${z}`).toBeGreaterThanOrEqual(up - 1e-6)
        // The arena part of the new view is inside the arena part of the plain view (no new on-screen spawns).
        const aTop = Math.max(-halfZ, r.viewTop), aBottom = Math.min(halfZ, r.viewBottom)
        expect(aTop, `arena top z=${z}`).toBeGreaterThanOrEqual(Math.max(-halfZ, plainFz - up) - 1e-6)
        expect(aBottom, `arena bottom z=${z}`).toBeLessThanOrEqual(Math.min(halfZ, plainFz + down) + 1e-6)
      }
      const atTop = getStageCameraEndReveal('stage6', { fov: 30, fitZoom, halfZ, playerZ: move.minZ })
      expect(atTop.viewTop).toBeLessThanOrEqual(-halfZ - 4) // school front + hedges past the top edge
      const atBottom = getStageCameraEndReveal('stage6', { fov: 30, fitZoom, halfZ, playerZ: move.maxZ })
      expect(atBottom.viewBottom).toBeGreaterThanOrEqual(halfZ + 2) // fence + gate pillars past the bottom edge
    }
  })
})
