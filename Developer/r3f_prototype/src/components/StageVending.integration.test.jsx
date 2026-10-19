import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { STAGE_CONFIGS, getStageBounds } from '../lib/stageConfig.js'
import { STAGE_VENDING_PLACEMENTS, isWithinStageVendingRange } from '../lib/stageVending.js'
import StageVendingLayer, { getStageVendingMachineTransform } from './StageVendingLayer.jsx'
import { FloorVisual } from './Floor.jsx'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getStageObjectFootprint } from './StageObjects/stageObjectColliders.js'

describe('actual-game wiring and placement regression', () => {
  it('mounts real world vending and real HUD prompt, not only a standalone demo', () => {
    const floor = readFileSync(new URL('./Floor.jsx', import.meta.url), 'utf8')
    const hud = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')
    const game = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')
    expect(game).toContain('<Floor')
    expect(floor).toContain('<StageVendingLayer stageId={stageId} />')
    expect(hud).toContain('<StageVendingPrompt />')
  })
  it('covers all playable remote stages, without falling back from missing expansion stages', () => {
    expect(Object.keys(STAGE_VENDING_PLACEMENTS).sort()).toEqual(Object.keys(STAGE_CONFIGS).sort())
    expect(getStageVendingMachineTransform('stage11')).toBeNull()
  })
  for (const stageId of Object.keys(STAGE_CONFIGS)) {
    it(`${stageId}: visible transform and room-facing 0.4 unit player approach remain inside map and clear of physical furniture`, () => {
      const p = STAGE_VENDING_PLACEMENTS[stageId]
      const t = getStageVendingMachineTransform(stageId)
      const scene = FloorVisual({ stageId })
      const mounts = scene.props.children.flat(Infinity).filter(node => node?.type === StageVendingLayer)
      expect(mounts).toHaveLength(1)
      expect(mounts[0].props.stageId).toBe(stageId)
      expect(t.position).toEqual([p.position.x, 0, p.position.z])
      // Static wall yaw improves front alignment toward QA's off-axis perspective views.
      const approvedYaw = { west: Math.PI / 9, east: -Math.PI / 12, north: 0, south: Math.PI }[p.wallSide]
      expect(t.rotation).toEqual([0, approvedYaw, 0])
      const delta = { west: [1, 0], east: [-1, 0], north: [0, 1], south: [0, -1] }[p.wallSide]
      const approach = { x: p.position.x + delta[0] * 1.2, z: p.position.z + delta[1] * 1.2 }
      const b = getStageBounds(stageId)
      expect(Math.abs(approach.x) + 0.4).toBeLessThan(b.halfX)
      expect(Math.abs(approach.z) + 0.4).toBeLessThan(b.halfZ)
      expect(isWithinStageVendingRange(approach, p)).toBe(true)
      for (const prop of getStageObjectPlacements(stageId)) {
        const f = getStageObjectFootprint(prop)
        if (!f || prop.blocking === false && stageId !== 'stage3') continue
        const overlaps = Math.abs(approach.x - f.x) < f.halfX + 0.4 && Math.abs(approach.z - f.z) < f.halfZ + 0.4
        expect(overlaps, `approach blocked by ${prop.id}`).toBe(false)
      }
    })
  }
})
