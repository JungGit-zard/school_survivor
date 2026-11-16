import { describe, expect, it } from 'vitest'
import { STAGE_CAMERA_END_REVEAL, clampGameplayCameraFocus, getGameplayGroundReach, getStageCameraEndReveal } from './gameCameraFraming.js'
import { getStageBounds } from './stageConfig.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'stage9', 'stage10']
const ASPECTS = [390 / 844, 375 / 667, 450 / 800]

describe('Stage 6 camera end reveal (rendering only)', () => {
  it('exists for stage6 only: every other stage keeps the plain clamp camera (null at every position)', () => {
    expect(Object.keys(STAGE_CAMERA_END_REVEAL)).toEqual(['stage6'])
    for (const stageId of STAGES.filter((id) => id !== 'stage6')) {
      const { halfZ } = getStageBounds(stageId)
      for (let z = -halfZ; z <= halfZ; z += 0.5) {
        expect(getStageCameraEndReveal(stageId, { fov: 30, fitZoom: 1, focusZ: z, playerZ: z }), `${stageId} z=${z}`).toBeNull()
      }
    }
  })

  it('never shows less of the arena interior than the plain clamp, and brings the school front / gate into frame at the ends', () => {
    const { halfX, halfZ } = getStageBounds('stage6')
    const move = getPlayerMovementBounds('stage6')
    for (const aspect of ASPECTS) {
      const base = getGameplayGroundReach(30, aspect)
      const fitZoom = base.reachSideNear > halfX ? base.reachSideNear / halfX : 1
      const up = base.reachUp / fitZoom, down = base.reachDown / fitZoom
      for (let z = move.minZ; z <= move.maxZ + 1e-9; z += 0.25) {
        const fz = clampGameplayCameraFocus(z, up, down, halfZ)
        const r = getStageCameraEndReveal('stage6', { fov: 30, fitZoom, focusZ: fz, playerZ: z })
        if (Math.abs(z) <= STAGE_CAMERA_END_REVEAL.stage6.rampFrom) { expect(r, `z=${z}`).toBeNull(); continue }
        expect(r.zoom).toBeLessThanOrEqual(fitZoom)
        expect(r.zoom).toBeGreaterThan(0.7)
        // Interior-side edge: unchanged (within 1 mm) or further in; outer edge only ever extends.
        expect(r.viewBottom, `bottom z=${z}`).toBeGreaterThanOrEqual(fz + down - 1e-3)
        expect(r.viewTop, `top z=${z}`).toBeLessThanOrEqual(fz - up + 1e-3)
        expect(r.viewTop).toBeLessThan(z)
        expect(r.viewBottom).toBeGreaterThan(z)
      }
      const atTop = getStageCameraEndReveal('stage6', { fov: 30, fitZoom, focusZ: clampGameplayCameraFocus(move.minZ, up, down, halfZ), playerZ: move.minZ })
      expect(atTop.viewTop).toBeLessThanOrEqual(-halfZ - 5.5) // school front (z -24.5) and the hedges in front of it
      const atBottom = getStageCameraEndReveal('stage6', { fov: 30, fitZoom, focusZ: clampGameplayCameraFocus(move.maxZ, up, down, halfZ), playerZ: move.maxZ })
      expect(atBottom.viewBottom).toBeGreaterThanOrEqual(halfZ + 3) // fence + gate pillars (z +20.6) clear of the HUD bar
    }
  })
})
