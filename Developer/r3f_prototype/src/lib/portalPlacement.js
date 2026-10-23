import * as THREE from 'three'
import { getStageBounds } from './stageConfig.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'
import { getStageObjectColliders } from '../components/StageObjects/stageObjectColliders.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

// Player.jsx: axis-aligned, rotation-locked CuboidCollider [0.136, 0.32, 0.136].
// Expand actual transformed collider parts by this footprint, not prop origins.
const PLAYER_HALF_XZ = 0.136
const CONTACT_MARGIN = 0.02
const MAP_INSET = 3
const MIN_DIST_FROM_PLAYER = 5
const MIN_DIST_FROM_OBSTACLE = 2

export function getPortalPlacementBounds(stageId) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const movement = getPlayerMovementBounds(stageId)
  return {
    minX: Math.max(-halfX + MAP_INSET, movement.minX + CONTACT_MARGIN),
    maxX: Math.min(halfX - MAP_INSET, movement.maxX - CONTACT_MARGIN),
    minZ: Math.max(-halfZ + MAP_INSET, movement.minZ + CONTACT_MARGIN),
    maxZ: Math.min(halfZ - MAP_INSET, movement.maxZ - CONTACT_MARGIN),
  }
}

export function getPortalBlockers(stageId) {
  return getStageObjectColliders(stageId).flatMap(({ position, rotation, parts }) => {
    const root = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    )
    return parts.map((part) => {
      const local = new THREE.Matrix4().compose(
        new THREE.Vector3(...part.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),
        new THREE.Vector3(1, 1, 1),
      )
      const [x, y, z] = part.args
      const box = new THREE.Box3(new THREE.Vector3(-x, -y, -z), new THREE.Vector3(x, y, z))
        .applyMatrix4(root.clone().multiply(local))
      const padding = PLAYER_HALF_XZ + CONTACT_MARGIN
      return { minX: box.min.x - padding, maxX: box.max.x + padding,
        minZ: box.min.z - padding, maxZ: box.max.z + padding }
    })
  })
}

// A conservative swept square: rejects rotated-box AABB corners too, but can
// never accept a route through a real collider. All work happens once on spawn.
export function isPortalSegmentClear(from, to, blockers) {
  return !blockers.some((box) => {
    let enter = 0
    let exit = 1
    for (const [axis, lo, hi] of [['x', 'minX', 'maxX'], ['z', 'minZ', 'maxZ']]) {
      const delta = to[axis] - from[axis]
      if (Math.abs(delta) < 1e-9) {
        if (from[axis] < box[lo] || from[axis] > box[hi]) return false
      } else {
        const a = (box[lo] - from[axis]) / delta
        const b = (box[hi] - from[axis]) / delta
        enter = Math.max(enter, Math.min(a, b))
        exit = Math.min(exit, Math.max(a, b))
        if (enter > exit) return false
      }
    }
    return true
  })
}

export function getPortalApproachPath(from, to, blockers) {
  if (isPortalSegmentClear(from, to, blockers)) return [from, to]
  // Both bends remain inside the convex movement rectangle. Sweeping each leg
  // prevents corner cutting and isolated-but-empty target pockets.
  for (const bend of [{ x: from.x, z: to.z }, { x: to.x, z: from.z }]) {
    if (isPortalSegmentClear(from, bend, blockers) && isPortalSegmentClear(bend, to, blockers)) {
      return [from, bend, to]
    }
  }
  return null
}

export function pickPortalPosition(stageId, player, random = Math.random) {
  const bounds = getPortalPlacementBounds(stageId)
  const blockers = getPortalBlockers(stageId)
  const obstacles = getStageObjectPlacements(stageId)
  const from = { x: player.x, z: player.z }
  const acceptable = (to) => Math.hypot(to.x - from.x, to.z - from.z) >= MIN_DIST_FROM_PLAYER
    && !obstacles.some(({ position: [x, , z] }) => Math.hypot(to.x - x, to.z - z) < MIN_DIST_FROM_OBSTACLE)
    && getPortalApproachPath(from, to, blockers)

  for (let attempt = 0; attempt < 40; attempt++) {
    const to = { x: bounds.minX + random() * (bounds.maxX - bounds.minX),
      z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ) }
    if (acceptable(to)) return [to.x, 0.05, to.z]
  }
  // Bounded deterministic recovery, not the old unchecked origin (which may
  // contain a prop). Keep normal minimum distance/prop spacing when possible.
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (acceptable({ x, z })) return [x, 0.05, z]
    }
  }
  // A trapped player has no certified approach. Their current occupied position
  // is the only guaranteed reachable footprint; never fabricate a remote exit.
  return [from.x, 0.05, from.z]
}
