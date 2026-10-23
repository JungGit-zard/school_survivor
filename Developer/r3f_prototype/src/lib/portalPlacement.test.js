import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { getPortalApproachPath, getPortalBlockers, getPortalPlacementBounds, isPortalSegmentClear, pickPortalPosition } from './portalPlacement.js'
import { getPlayerMovementBounds, clampPlayerPosition } from './playerMovementBounds.js'
import { getStageBounds } from './stageConfig.js'
import { getStageObjectColliders } from '../components/StageObjects/stageObjectColliders.js'
import { clampGameplayCameraFocus, getGameplayGroundReach, keepPlayerInsideCameraX } from './gameCameraFraming.js'
import { PLAYER_MESH_WORLD_HALF_WIDTH, PLAYER_MESH_WORLD_HEIGHT } from './characterVisualScale.js'

beforeAll(async () => { await RAPIER.init() })

function createPhysicalStage(stageId) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  for (const { position, rotation, parts } of getStageObjectColliders(stageId)) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
      .setTranslation(...position).setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation))))
    for (const part of parts) world.createCollider(RAPIER.ColliderDesc.cuboid(...part.args)
      .setTranslation(...part.position)
      .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation))).setFriction(1), body)
  }
  const { halfX, halfZ } = getStageBounds(stageId)
  for (const [x, z, hx, hz] of [[0, halfZ, halfX, .5], [0, -halfZ, halfX, .5], [halfX, 0, .5, halfZ], [-halfX, 0, .5, halfZ]]) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, .5, hz).setTranslation(x, .5, z))
  }
  const player = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, .32, 0).lockRotations().setLinearDamping(10))
  world.createCollider(RAPIER.ColliderDesc.cuboid(.136, .32, .136), player)
  return { world, player }
}

function projectAtArrival(stageId, aspect, point) {
  const camera = new THREE.PerspectiveCamera(30, aspect, .1, 1000)
  const base = getGameplayGroundReach(camera.fov, aspect)
  const { halfX, halfZ } = getStageBounds(stageId)
  const zoom = Math.max(1, base.reachSideNear / halfX)
  const fz = clampGameplayCameraFocus(point.z, base.reachUp / zoom, base.reachDown / zoom, halfZ)
  const fx = keepPlayerInsideCameraX({ focusX: clampGameplayCameraFocus(point.x, base.reachSideFar / zoom, base.reachSideFar / zoom, halfX),
    focusZ: fz, playerX: point.x, playerY: .32 + PLAYER_MESH_WORLD_HEIGHT, playerZ: point.z,
    playerHalfWidth: PLAYER_MESH_WORLD_HALF_WIDTH, fov: 30, aspect, zoom })
  camera.zoom = zoom
  camera.updateProjectionMatrix()
  camera.position.set(fx, 17, fz + 17)
  camera.lookAt(fx, 0, fz)
  camera.updateMatrixWorld()
  return new THREE.Vector3(point.x, .05, point.z).project(camera)
}

describe('portal reachability against the real movement/collider contract', () => {
  it.each(['stage1', 'stage2', 'stage3'])('uses the stricter north movement edge, not map inset alone: %s', (stageId) => {
    const movement = getPlayerMovementBounds(stageId)
    const portal = getPortalPlacementBounds(stageId)
    expect(portal.minZ).toBeGreaterThan(movement.minZ)
    expect(portal.maxZ).toBeLessThan(movement.maxZ)
    console.info('PORTAL_LIMITS', JSON.stringify({ stageId, movement, portal }))
  })

  // Four corner requests paired with wide/tall/extreme aspect ratios, not a
  // combinatorial screen matrix. Actual Rapier dynamic movement, no teleport.
  it.each([
    ['stage1', 0, 0, 9 / 16], ['stage2', 1, 0, 16 / 9],
    ['stage3', 0, 1, 9 / 32], ['stage3', 1, 1, 32 / 9],
  ])('walks into activation through physical props/walls: %s corner %s,%s aspect %s', (stageId, rx, rz, aspect) => {
    const from = { x: 0, z: 0 }
    let call = 0
    const pos = pickPortalPosition(stageId, from, () => [rx, rz][call++ % 2])
    const target = { x: pos[0], z: pos[2] }
    const route = getPortalApproachPath(from, target, getPortalBlockers(stageId))
    expect(route).not.toBeNull()
    expect(Math.hypot(target.x, target.z)).toBeGreaterThanOrEqual(5)
    const { world, player } = createPhysicalStage(stageId)
    try {
      for (const waypoint of route.slice(1)) {
        let reached = false
        for (let frame = 0; frame < 1500; frame++) {
          const t = player.translation()
          const dx = waypoint.x - t.x, dz = waypoint.z - t.z
          const distance = Math.hypot(dx, dz)
          if (distance < .04) { reached = true; break }
          const speed = Math.min(3, distance * 60)
          player.setLinvel({ x: dx / distance * speed, y: 0, z: dz / distance * speed }, true)
          world.step()
          const next = player.translation()
          const bounded = clampPlayerPosition(stageId, next)
          // The certified route must not need the player's corrective clamp.
          expect(next.x).toBeCloseTo(bounded.x, 4)
          expect(next.z).toBeCloseTo(bounded.z, 4)
        }
        expect(reached).toBe(true)
      }
      const end = player.translation()
      expect(Math.hypot(end.x - target.x, end.z - target.z)).toBeLessThan(.6)
      const ndc = projectAtArrival(stageId, aspect, target)
      expect(Math.abs(ndc.x)).toBeLessThan(1)
      expect(Math.abs(ndc.y)).toBeLessThan(1)
      console.info('PORTAL_CONTACT', JSON.stringify({ stageId, aspect, target, end, ndc: ndc.toArray(), legs: route.length - 1 }))
    } finally { world.free() }
  })

  it('rejects an empty target pocket separated by a full blocking wall', () => {
    const wall = [{ minX: -.5, maxX: .5, minZ: -10, maxZ: 10 }]
    expect(getPortalApproachPath({ x: -2, z: 0 }, { x: 2, z: 0 }, wall)).toBeNull()
    // Center-only checks miss this: endpoints clear, segment crosses blocker.
    expect(isPortalSegmentClear({ x: -2, z: 0 }, { x: -2, z: 1 }, wall)).toBe(true)
  })

  it('certifies a bent path without cutting the collider corner', () => {
    const blocks = [{ minX: -.5, maxX: .5, minZ: -.5, maxZ: .5 }]
    const from = { x: -2, z: -1 }, to = { x: 2, z: 1 }
    expect(isPortalSegmentClear(from, to, blocks)).toBe(false)
    const route = getPortalApproachPath(from, to, blocks)
    expect(route).toHaveLength(3)
    expect(route.slice(1).every((p, i) => isPortalSegmentClear(route[i], p, blocks))).toBe(true)
  })

  it('recovers deterministically after all 40 random samples fail', () => {
    const player = { x: 0, z: 0 }
    const pos = pickPortalPosition('stage1', player, () => .5)
    const target = { x: pos[0], z: pos[2] }
    expect(Math.hypot(target.x, target.z)).toBeGreaterThanOrEqual(5)
    expect(getPortalApproachPath(player, target, getPortalBlockers('stage1'))).not.toBeNull()
  })
})
