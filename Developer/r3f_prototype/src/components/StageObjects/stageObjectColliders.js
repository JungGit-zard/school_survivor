import * as THREE from 'three'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { STAGE_PROP_PLACEMENTS_EVENT } from '../../lib/stagePropPlacements.js'

export const BLOCKING_STAGE_OBJECT_TYPES = new Set([
  'classroomChair',
  'classroomDesk',
  'corridorLockerBank',
  'corridorJanitorCart',
  'corridorLostFoundBoard',
  'basketballHoop',
  'basketballBallCart',
  'basketballCluster',
  'gymBench',
  'gymTrainingCones',
  'gymMats',
  'gymScoreboard',
  'gymBanner',
  'gymExitDoor',
  'gymEquipmentSpill',
])

const DESK_COLLIDER_PARTS = [
  { key: 'desk-footprint', position: [0, 0.42, 0], size: [1.76, 0.84, 1.04] },
]

const CHAIR_COLLIDER_PARTS = [
  { key: 'chair-seat-footprint', position: [0, 0.38, 0], size: [1.02, 0.76, 0.9] },
  { key: 'chair-back-footprint', position: [0, 0.44, -0.36], size: [1.02, 0.88, 0.16] },
]

const CORRIDOR_LOCKER_COLLIDER_PARTS = [
  { key: 'locker-footprint', position: [0, 0.78, 0], size: [1.34, 1.56, 0.54] },
]

const CORRIDOR_CART_COLLIDER_PARTS = [
  { key: 'cart-footprint', position: [0, 0.42, 0], size: [1.1, 0.84, 0.58] },
]

const CORRIDOR_LOST_FOUND_COLLIDER_PARTS = [
  { key: 'lost-found-footprint', position: [0, 0.78, 0], size: [1.34, 1.56, 0.18] },
]

const BASKETBALL_HOOP_COLLIDER_PARTS = [
  { key: 'hoop-wood-base', position: [0, 0.06, 0], size: [1.72, 0.12, 1.02] },
  { key: 'hoop-blue-base', position: [0, 0.38, 0], size: [0.72, 0.62, 0.52] },
  { key: 'hoop-post', position: [0, 1.26, -0.18], size: [0.20, 1.28, 0.20] },
  { key: 'hoop-support-arm', position: [0, 1.86, 0.04], size: [0.92, 0.16, 0.18] },
  { key: 'hoop-backboard', position: [0, 2.32, 0.4], size: [1.72, 1.08, 0.12] },
  { key: 'hoop-rim', position: [0, 1.94, 0.98], size: [0.9, 0.18, 0.56] },
]

const BASKETBALL_CART_COLLIDER_PARTS = [
  { key: 'ball-cart-frame', position: [0, 0.58, 0], size: [1.55, 1.04, 0.95] },
  { key: 'ball-cart-basket', position: [0, 0.82, 0], size: [1.28, 0.58, 0.74] },
  { key: 'ball-cart-wheel-left', position: [-0.58, 0.12, 0.34], size: [0.24, 0.24, 0.18] },
  { key: 'ball-cart-wheel-right', position: [0.58, 0.12, -0.34], size: [0.24, 0.24, 0.18] },
]

const BASKETBALL_CLUSTER_COLLIDER_PARTS = [
  { key: 'basketball-0', position: [-0.62, 0.19, -0.22], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-1', position: [-0.18, 0.19, 0.24], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-2', position: [0.26, 0.19, -0.18], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-3', position: [0.68, 0.19, 0.18], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-4', position: [0.05, 0.19, 0.66], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-5', position: [-0.74, 0.19, 0.52], size: [0.36, 0.36, 0.36] },
]

const GYM_BENCH_COLLIDER_PARTS = [
  { key: 'gym-bench-seat', position: [0, 0.58, 0], size: [2.35, 0.18, 0.42] },
  { key: 'gym-bench-left-leg', position: [-0.82, 0.28, 0], size: [0.18, 0.56, 0.52] },
  { key: 'gym-bench-right-leg', position: [0.82, 0.28, 0], size: [0.18, 0.56, 0.52] },
]

const GYM_TRAINING_CONES_COLLIDER_PARTS = [
  { key: 'gym-cone-0', position: [-0.78, 0.18, -0.44], size: [0.34, 0.36, 0.34] },
  { key: 'gym-cone-1', position: [-0.34, 0.18, 0.16], size: [0.34, 0.36, 0.34] },
  { key: 'gym-cone-2', position: [0.12, 0.18, -0.28], size: [0.34, 0.36, 0.34] },
  { key: 'gym-cone-3', position: [0.56, 0.18, 0.32], size: [0.34, 0.36, 0.34] },
]

const GYM_MATS_COLLIDER_PARTS = [
  { key: 'gym-mats-stack', position: [0, 0.4, 0], size: [1.65, 0.68, 1.05] },
]

const GYM_SCOREBOARD_COLLIDER_PARTS = [
  { key: 'gym-scoreboard-panel', position: [0, 1.15, 0.08], size: [2.72, 1.34, 0.2] },
]

const GYM_BANNER_COLLIDER_PARTS = [
  { key: 'gym-banner-cloth', position: [0, 1.12, 0], size: [2.45, 0.64, 0.12] },
  { key: 'gym-banner-rope', position: [0, 1.52, 0], size: [2.64, 0.12, 0.12] },
]

const GYM_EXIT_DOOR_COLLIDER_PARTS = [
  { key: 'gym-exit-door-panel', position: [0, 1.0, 0], size: [1.42, 2.0, 0.22] },
  { key: 'gym-exit-door-sign', position: [0, 2.25, 0.06], size: [1.62, 0.36, 0.16] },
]

const GYM_EQUIPMENT_SPILL_COLLIDER_PARTS = [
  { key: 'gym-equipment-cooler', position: [-0.58, 0.26, 0], rotation: [0, 0, Math.PI / 2], size: [0.62, 0.74, 0.52] },
  { key: 'gym-equipment-water', position: [-0.02, 0.04, 0.32], size: [0.82, 0.08, 0.46] },
  { key: 'gym-equipment-box', position: [0.84, 0.24, -0.1], size: [0.64, 0.42, 0.52] },
  { key: 'gym-equipment-whistle', position: [-1.28, 0.08, -0.38], rotation: [0, 0.25, 0], size: [0.32, 0.12, 0.18] },
]

const COLLIDER_DEFS = {
  classroomChair: {
    variants: CLASSROOM_CHAIR_VARIANTS,
    parts: CHAIR_COLLIDER_PARTS,
  },
  classroomDesk: {
    variants: CLASSROOM_DESK_VARIANTS,
    parts: DESK_COLLIDER_PARTS,
  },
  corridorLockerBank: { parts: CORRIDOR_LOCKER_COLLIDER_PARTS },
  corridorJanitorCart: { parts: CORRIDOR_CART_COLLIDER_PARTS },
  corridorLostFoundBoard: { parts: CORRIDOR_LOST_FOUND_COLLIDER_PARTS },
  basketballHoop: { parts: BASKETBALL_HOOP_COLLIDER_PARTS },
  basketballBallCart: { parts: BASKETBALL_CART_COLLIDER_PARTS },
  basketballCluster: { parts: BASKETBALL_CLUSTER_COLLIDER_PARTS },
  gymBench: { parts: GYM_BENCH_COLLIDER_PARTS },
  gymTrainingCones: { parts: GYM_TRAINING_CONES_COLLIDER_PARTS },
  gymMats: { parts: GYM_MATS_COLLIDER_PARTS },
  gymScoreboard: { parts: GYM_SCOREBOARD_COLLIDER_PARTS },
  gymBanner: { parts: GYM_BANNER_COLLIDER_PARTS },
  gymExitDoor: { parts: GYM_EXIT_DOOR_COLLIDER_PARTS },
  gymEquipmentSpill: { parts: GYM_EQUIPMENT_SPILL_COLLIDER_PARTS },
}

const MIN_BLOCKING_HALF_HEIGHT = 0.44
const SIGHT_BLOCK_PADDING = 0.08

function segmentIntersectsAxisAlignedBox(fromX, fromZ, toX, toZ, halfX, halfZ) {
  const dx = toX - fromX
  const dz = toZ - fromZ
  let enter = 0
  let exit = 1

  if (Math.abs(dx) < 1e-8) {
    if (fromX < -halfX || fromX > halfX) return false
  } else {
    const first = (-halfX - fromX) / dx
    const second = (halfX - fromX) / dx
    enter = Math.max(enter, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    if (enter > exit) return false
  }

  if (Math.abs(dz) < 1e-8) return fromZ >= -halfZ && fromZ <= halfZ
  const first = (-halfZ - fromZ) / dz
  const second = (halfZ - fromZ) / dz
  enter = Math.max(enter, Math.min(first, second))
  exit = Math.min(exit, Math.max(first, second))
  if (enter > exit) return false
  return true
}

export function isStageObjectSightBlocked(from, to, obstacles, padding = SIGHT_BLOCK_PADDING) {
  for (const obstacle of obstacles) {
    const angle = -(obstacle.rotationY ?? 0)
    const cos = angle === 0 ? 1 : Math.cos(angle)
    const sin = angle === 0 ? 0 : Math.sin(angle)
    const fromDx = from.x - obstacle.x
    const fromDz = from.z - obstacle.z
    const toDx = to.x - obstacle.x
    const toDz = to.z - obstacle.z
    const fromX = fromDx * cos - fromDz * sin
    const fromZ = fromDx * sin + fromDz * cos
    const toX = toDx * cos - toDz * sin
    const toZ = toDx * sin + toDz * cos
    if (segmentIntersectsAxisAlignedBox(
      fromX,
      fromZ,
      toX,
      toZ,
      obstacle.halfX + padding,
      obstacle.halfZ + padding
    )) return true
  }
  return false
}

function normalizeRotation(rotation = [0, 0, 0]) {
  return Array.isArray(rotation) ? rotation : [0, rotation, 0]
}

function normalizeScale(scale = 1) {
  return Array.isArray(scale) ? scale : [scale, scale, scale]
}

function multiplyPosition(position, scale) {
  return position.map((value, index) => value * scale[index])
}

function multiplyHalfExtents(size, scale) {
  return size.map((value, index) => {
    const halfExtent = (value * scale[index]) / 2
    return index === 1 ? Math.max(MIN_BLOCKING_HALF_HEIGHT, halfExtent) : halfExtent
  })
}

function transformLocalPosition(position, modelPosition, modelRotation) {
  const vector = new THREE.Vector3(...position)
  vector.applyEuler(new THREE.Euler(...modelRotation))
  vector.add(new THREE.Vector3(...modelPosition))
  return vector.toArray()
}

function combineRotations(modelRotation, partRotation = [0, 0, 0]) {
  const modelQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation))
  const partQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...partRotation))
  const combined = modelQuat.multiply(partQuat)
  return new THREE.Euler().setFromQuaternion(combined).toArray().slice(0, 3)
}

export function getStageObjectColliderParts(placement = {}) {
  const def = COLLIDER_DEFS[placement.type]
  if (!def) return []

  const variantName = placement.props?.variant ?? 'upright'
  const variant = def.variants?.[variantName] ?? def.variants?.upright ?? {}
  const placementScale = normalizeScale(placement.scale)

  return def.parts.map(({ key, position, rotation = [0, 0, 0], size }) => {
    const modelPosition = variant.modelPosition ?? [0, 0, 0]
    const modelRotation = variant.modelRotation ?? [0, 0, 0]

    return {
      key,
      args: multiplyHalfExtents(size, placementScale),
      position: multiplyPosition(
        transformLocalPosition(position, modelPosition, modelRotation),
        placementScale
      ),
      rotation: combineRotations(modelRotation, rotation),
    }
  })
}

export function getStageObjectColliders(stageId = 'stage1') {
  return getStageObjectPlacements(stageId)
    .filter(({ type, blocking }) => BLOCKING_STAGE_OBJECT_TYPES.has(type) && (stageId === 'stage3' || blocking !== false))
    .map((placement) => ({
      id: `${placement.id}-collider`,
      position: placement.position,
      rotation: normalizeRotation(placement.rotation),
      parts: getStageObjectColliderParts(placement),
    }))
}

const sightObstacleCache = new Map()

// 스튜디오 프랍 배치 오버라이드가 바뀌면 시야 장애물 캐시를 무효화한다.
if (typeof window !== 'undefined') {
  window.addEventListener(STAGE_PROP_PLACEMENTS_EVENT, () => sightObstacleCache.clear())
}

export function getStageObjectSightObstacles(stageId = 'stage1') {
  const cached = sightObstacleCache.get(stageId)
  if (cached) return cached

  const obstacles = getStageObjectPlacements(stageId)
    .filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
    .flatMap((placement) => {
      const rootPosition = new THREE.Vector3(...placement.position)
      const rootRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...normalizeRotation(placement.rotation)))
      return getStageObjectColliderParts(placement).map((part) => {
      const center = new THREE.Vector3(...part.position).applyQuaternion(rootRotation).add(rootPosition)
      const rotation = rootRotation.clone().multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation))
      )
      const matrix = new THREE.Matrix4().makeRotationFromQuaternion(rotation).elements
      const [halfX, halfY, halfZ] = part.args
      return Object.freeze({
        x: center.x,
        z: center.z,
        halfX: Math.abs(matrix[0]) * halfX + Math.abs(matrix[4]) * halfY + Math.abs(matrix[8]) * halfZ,
        halfZ: Math.abs(matrix[2]) * halfX + Math.abs(matrix[6]) * halfY + Math.abs(matrix[10]) * halfZ,
        rotationY: 0,
      })
      })
    })
  const frozen = Object.freeze(obstacles)
  sightObstacleCache.set(stageId, frozen)
  return frozen
}
