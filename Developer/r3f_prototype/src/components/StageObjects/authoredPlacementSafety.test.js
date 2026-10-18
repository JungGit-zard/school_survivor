import { beforeEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getStageObjectColliders } from './stageObjectColliders.js'
import { getStageObjectPlacements, STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'
import { getPlayerMovementBounds } from '../../lib/playerMovementBounds.js'
import { getPlayerStartPosition } from '../../lib/playerStartPosition.js'
import { getStageQuestDefinitions } from '../../lib/quests.js'
import { getQuestTargetPosition, QUEST_ITEM_INTERACTION_RADIUS } from '../QuestWorldLayer.jsx'
import { STUDENT_DIALOGUE_RADIUS } from '../../lib/studentProximity.js'

// Independent geometric oracle: actual runtime cuboid parts, root + part XYZ rotations,
// conservative world AABBs expanded by Player.jsx's real 0.136 half-width.
// Grid-cell margin makes each visited cell and its axis-aligned connection collision-free.
// This is offline geometry, NOT a real Rapier/browser/device acceptance claim.
const HALF_PLAYER = 0.136
const STEP = 0.1
function partBounds(collider, part) {
  const rootQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...collider.rotation))
  const center = new THREE.Vector3(...part.position).applyQuaternion(rootQ).add(new THREE.Vector3(...collider.position))
  const q = rootQ.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)))
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q).elements
  const [a,b,c] = part.args
  const hx = Math.abs(m[0])*a + Math.abs(m[4])*b + Math.abs(m[8])*c
  const hz = Math.abs(m[2])*a + Math.abs(m[6])*b + Math.abs(m[10])*c
  return { minX:center.x-hx, maxX:center.x+hx, minZ:center.z-hz, maxZ:center.z+hz }
}
function reachable(stageId) {
  const bounds = getPlayerMovementBounds(stageId)
  const boxes = getStageObjectColliders(stageId).flatMap(c => c.parts.map(p => partBounds(c,p)))
  expect(boxes.length).toBeGreaterThan(0)
  const margin = HALF_PLAYER + STEP/2
  const free = (x,z) => x>=bounds.minX && x<=bounds.maxX && z>=bounds.minZ && z<=bounds.maxZ &&
    boxes.every(b => x<b.minX-margin || x>b.maxX+margin || z<b.minZ-margin || z>b.maxZ+margin)
  const [sx,,sz] = getPlayerStartPosition(stageId)
  expect(free(sx,sz), `${stageId} physical spawn`).toBe(true)
  const seen = new Set(['0:0'])
  const queue = [[0,0]]
  for (let head=0;head<queue.length;head++) {
    const [ix,iz] = queue[head]
    for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=ix+dx, nz=iz+dz, key=`${nx}:${nz}`
      if (seen.has(key) || !free(sx+nx*STEP,sz+nz*STEP)) continue
      seen.add(key); queue.push([nx,nz])
    }
  }
  return { free, points:queue.map(([ix,iz]) => [sx+ix*STEP,sz+iz*STEP]), boxes }
}

describe('accepted revision1947 authored placement safety (offline actual collider geometry)', () => {
  beforeEach(() => commitFirebaseStudioRuntime({ propPlacements:{} }, { revision:0 }))
  it('detects a genuine spawn obstruction rather than accepting any pinned fixture', () => {
    commitFirebaseStudioRuntime({ propPlacements:{stage1:[{id:'negative-spawn-blocker',type:'classroomDesk',position:[0,0,0],rotation:[0,0,0],scale:3,blocking:true}]} },{revision:1})
    expect(()=>reachable('stage1')).toThrow()
  })
  for (const stageId of ['stage1','stage2']) {
    it(`${stageId}: spawn has connected north/south/east/west movement and sampled eligible portal locations are reachable`, () => {
      const { points,free } = reachable(stageId)
      for (const p of [[0,0,-1],[0,0,1],[-1,0,0],[1,0,0]]) {
        expect(free(p[0],p[2])).toBe(true)
        expect(points.some(([x,z])=>Math.hypot(x-p[0],z-p[2])<STEP/2)).toBe(true)
      }
      // EscapePortal uses inset3 + distance2 from every authored root, with centre fallback.
      // Enumerate admissible portal centres across the map, independently of its random sampler.
      const bounds = getPlayerMovementBounds(stageId)
      let admissible = 0
      for (let x=Math.ceil(bounds.minX);x<=Math.floor(bounds.maxX);x++) {
        for (let z=Math.ceil(bounds.minZ);z<=Math.floor(bounds.maxZ);z++) {
          if (STAGE_OBJECT_PLACEMENTS[stageId].some(p => Math.hypot(x-p.position[0],z-p.position[2])<2)) continue
          if (Math.hypot(x,z)<5) continue
          admissible++
          expect(points.some(([px,pz]) => Math.hypot(px-x,pz-z)<0.6), `${stageId} exit ${x},${z}`).toBe(true)
        }
      }
      expect(admissible).toBeGreaterThan(10)
      expect(points.some(([x,z])=>Math.hypot(x,z)<0.6)).toBe(true)
    })
    it(`${stageId}: every quest giver, item and completion trigger can be reached without crossing a collider`, () => {
      const { points } = reachable(stageId)
      const placements = getStageObjectPlacements(stageId)
      for (const quest of getStageQuestDefinitions(stageId)) {
        for (const key of ['giver','itemTarget','completion']) {
          const target = getQuestTargetPosition(stageId,quest.id,quest[key],placements)
          const radius = key==='giver' || (key==='completion' && quest.completion.kind==='return')
            ? STUDENT_DIALOGUE_RADIUS : QUEST_ITEM_INTERACTION_RADIUS
          expect(points.some(([x,z]) => Math.hypot(x-target.position[0],z-target.position[2])<=radius), `${quest.id}/${key}/${target.sourceId}`).toBe(true)
        }
      }
    })
  }
})
