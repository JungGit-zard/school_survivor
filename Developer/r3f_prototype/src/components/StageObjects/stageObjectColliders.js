import * as THREE from 'three'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { STAGE_PROP_PLACEMENTS_EVENT } from '../../lib/stagePropPlacements.js'

export const BLOCKING_STAGE_OBJECT_TYPES = new Set(['classroomChair', 'classroomDesk'])

const DESK_COLLIDER_PARTS = [
  { key: 'desk-footprint', position: [0, 0.42, 0], size: [1.76, 0.84, 1.04] },
]

const CHAIR_COLLIDER_PARTS = [
  { key: 'chair-seat-footprint', position: [0, 0.38, 0], size: [1.02, 0.76, 0.9] },
  { key: 'chair-back-footprint', position: [0, 0.44, -0.36], size: [1.02, 0.88, 0.16] },
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
  const variant = def.variants[variantName] ?? def.variants.upright
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
    .filter(({ type, blocking }) => BLOCKING_STAGE_OBJECT_TYPES.has(type) && blocking !== false)
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
