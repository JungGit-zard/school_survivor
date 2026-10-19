import { describe, expect, it, vi } from 'vitest'
import { Euler, Vector3 } from 'three'
import { STAGE_VENDING_PLACEMENTS, isWithinStageVendingRange } from '../lib/stageVending.js'

vi.mock('../store/useGameStore.js', () => ({ useGameStore: vi.fn() }))

import { getStageVendingMachineTransform } from './StageVendingLayer.jsx'

// QA visual.json: representative steady-state perspective views, not a global +Z ray.
// Camera and model positions remain unchanged; center height matches QA's dot metric.
const QA_VIEWS = {
  stage1: { position: [-8.5, 0, -8], camera: [0, 17, 15.04486372867091], baselineYaw: Math.PI / 6 },
  stage3: { position: [6.25, 0, -14], camera: [0, 17, 7.781669672215598], baselineYaw: -Math.PI / 6 },
}

const frontAt = (yaw) => new Vector3(0, 0, 1).applyEuler(new Euler(0, yaw, 0))

describe('vending static front visibility toward representative actual gameplay camera rays', () => {
  for (const [stageId, placement] of Object.entries(STAGE_VENDING_PLACEMENTS)) {
    it(`${stageId}: preserves placement and applies the camera-aware static wall yaw`, () => {
      const transform = getStageVendingMachineTransform(stageId)
      expect(transform.id).toBe(placement.id)
      expect(transform.position).toEqual([placement.position.x, placement.position.y, placement.position.z])
      const yaw = { west: Math.PI / 9, east: -Math.PI / 12, north: 0, south: Math.PI }[placement.wallSide]
      expect(transform.rotation).toEqual([0, yaw, 0])
      const front = frontAt(transform.rotation[1])
      const view = QA_VIEWS[stageId]
      if (view) {
        expect(transform.position).toEqual(view.position)
        const center = new Vector3(...transform.position).add(new Vector3(0, 1.25, 0))
        const actualView = new Vector3(...view.camera).sub(center).normalize()
        expect(front.dot(actualView)).toBeGreaterThan(frontAt(view.baselineYaw).dot(actualView))
        expect(front.dot(actualView)).toBeGreaterThan(frontAt(0).dot(actualView))
      }
      // Range only: furniture clearance remains covered by the original room-side integration checks.
      const approach = { x: placement.position.x + front.x * 1.2, z: placement.position.z + front.z * 1.2 }
      expect(isWithinStageVendingRange(approach, placement)).toBe(true)
    })
  }

  it('does not invent a placement for an unknown stage', () => {
    expect(getStageVendingMachineTransform('stage11')).toBeNull()
  })
})
