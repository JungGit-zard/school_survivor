import * as THREE from 'three'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  getStageObjectColliderParts,
  getStageObjectColliders,
  getStageObjectSightObstacles,
} from './stageObjectColliders.js'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { collidesEnemyObstacle } from '../../lib/enemySimulation.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4']

function normalizeRotation(rotation = [0, 0, 0]) {
  return Array.isArray(rotation) ? rotation : [0, rotation, 0]
}

describe('probe', () => {
  beforeEach(() => {
    commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
  })

  it('compares physics vs sight obstacle sets', () => {
    for (const stageId of STAGES) {
      const sightIds = getStageObjectSightObstacles(stageId).map((o) => o.id)
      const physicsIds = []
      getStageObjectColliders(stageId).forEach((c) => {
        c.parts.forEach(() => physicsIds.push(c.id.replace(/-collider$/, '')))
      })
      const sightSet = new Set(sightIds)
      const physSet = new Set(physicsIds)
      const onlySight = [...sightSet].filter((id) => !physSet.has(id))
      const onlyPhys = [...physSet].filter((id) => !sightSet.has(id))
      console.log(stageId, 'sightParts', sightIds.length, 'physParts', physicsIds.length,
        'onlySight', JSON.stringify(onlySight), 'onlyPhys', JSON.stringify(onlyPhys))
    }
  })

  it('validates the emitted OBB against the true rapier box footprint', () => {
    let checked = 0
    let mismatches = 0
    let rotatedParts = 0
    const badFootprints = []
    for (const stageId of STAGES) {
      const obstacles = getStageObjectSightObstacles(stageId)
      const truth = []
      getStageObjectPlacements(stageId).forEach((placement) => {
        const parts = getStageObjectColliderParts(placement)
        if (parts.length === 0) return
        if (!obstacles.some((o) => o.id === placement.id)) return
        const rootPosition = new THREE.Vector3(...placement.position)
        const rootRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(...normalizeRotation(placement.rotation))
        )
        parts.forEach((part) => {
          const center = new THREE.Vector3(...part.position).applyQuaternion(rootRotation).add(rootPosition)
          const rotation = rootRotation.clone().multiply(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation))
          )
          const m = new THREE.Matrix4().makeRotationFromQuaternion(rotation).elements
          const [hx, hy, hz] = part.args
          const axes = [
            [m[0] * hx, m[2] * hx],
            [m[4] * hy, m[6] * hy],
            [m[8] * hz, m[10] * hz],
          ]
          truth.push({ id: placement.id, center, axes })
        })
      })
      expect(truth.length).toBe(obstacles.length)
      for (let i = 0; i < truth.length; i += 1) {
        const t = truth[i]
        const o = obstacles[i]
        expect(o.id).toBe(t.id)
        if (o.rotationY !== 0) rotatedParts += 1
        // the horizontal shadow must be a parallelogram: exactly one axis is vertical
        const lengths = t.axes.map(([ax, az]) => Math.hypot(ax, az))
        const degenerate = lengths.filter((l) => l < 1e-9).length
        const live = t.axes.filter((_, index) => lengths[index] >= 1e-9)
        if (degenerate !== 1 || live.length !== 2) {
          badFootprints.push(`${t.id} degenerate=${degenerate} lengths=${lengths.map((l) => l.toFixed(4))}`)
          continue
        }
        const [P, Q] = live
        const det = P[0] * Q[1] - P[1] * Q[0]
        for (let a = 0; a < 48; a += 1) {
          for (let r = 0; r < 10; r += 1) {
            const angle = (a / 48) * Math.PI * 2
            const dist = 0.05 + r * 0.2
            const dx = Math.cos(angle) * dist
            const dz = Math.sin(angle) * dist
            const alpha = (dx * Q[1] - dz * Q[0]) / det
            const beta = (P[0] * dz - P[1] * dx) / det
            const insideTruth = Math.abs(alpha) <= 1 && Math.abs(beta) <= 1
            const insideObb = collidesEnemyObstacle(t.center.x + dx, t.center.z + dz, 0, [o], 1)
            checked += 1
            if (insideTruth !== insideObb) mismatches += 1
          }
        }
      }
    }
    console.log('OBB parity checked', checked, 'mismatches', mismatches, 'rotatedParts', rotatedParts)
    console.log('badFootprints', badFootprints.length, badFootprints.slice(0, 5))
    expect(mismatches).toBe(0)
  })
})
