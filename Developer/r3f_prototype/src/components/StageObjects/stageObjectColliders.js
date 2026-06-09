import * as THREE from 'three'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'

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
    .filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
    .map((placement) => ({
      id: `${placement.id}-collider`,
      position: placement.position,
      rotation: normalizeRotation(placement.rotation),
      parts: getStageObjectColliderParts(placement),
    }))
}
