export const ROSARI_ROOM_BOUNDS = Object.freeze({
  minX: -3.6,
  maxX: 3.6,
  minZ: -2.8,
  maxZ: 2.8,
})

export const ROSARI_RADIUS = 0.28
export const ROSARI_MAX_FRAME_DELTA = 1 / 30
export const ROSARI_MAX_MOVE_STEP = ROSARI_RADIUS * 0.5
export const WARDROBE_INTERACT_MARGIN = 0.5

export const ROSARI_ROOM_COLLIDERS = Object.freeze([
  { id: 'wardrobe', x: -2.85, z: -1.35, halfX: 0.78, halfZ: 0.68 },
  { id: 'bed', x: 2.25, z: -1.1, halfX: 1.02, halfZ: 1.02 },
  { id: 'vanity', x: -2.8, z: 1.45, halfX: 0.72, halfZ: 0.58 },
  { id: 'curtain-window', x: 1.2, z: -2.45, halfX: 0.9, halfZ: 0.25 },
])

export function clampRosariRoomPosition(position) {
  return {
    x: Math.min(ROSARI_ROOM_BOUNDS.maxX, Math.max(ROSARI_ROOM_BOUNDS.minX, position.x)),
    z: Math.min(ROSARI_ROOM_BOUNDS.maxZ, Math.max(ROSARI_ROOM_BOUNDS.minZ, position.z)),
  }
}

export function isRosariRoomPositionBlocked(position) {
  return ROSARI_ROOM_COLLIDERS.some((collider) => (
    Math.abs(position.x - collider.x) < collider.halfX + ROSARI_RADIUS
    && Math.abs(position.z - collider.z) < collider.halfZ + ROSARI_RADIUS
  ))
}

export function moveRosariRoomPosition(position, delta) {
  const distance = Math.hypot(delta.x, delta.z)
  const steps = Math.max(1, Math.ceil(distance / ROSARI_MAX_MOVE_STEP))
  let current = position

  for (let index = 0; index < steps; index += 1) {
    const next = clampRosariRoomPosition({
      x: current.x + delta.x / steps,
      z: current.z + delta.z / steps,
    })
    if (isRosariRoomPositionBlocked(next)) return current
    current = next
  }

  return current
}

export function normalizeRosariMoveVector(keys) {
  const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const z = (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
  const length = Math.hypot(x, z)
  if (length <= 0) return { x: 0, z: 0 }
  return { x: x / length, z: z / length }
}

export function capRosariFrameDelta(delta) {
  if (!Number.isFinite(delta) || delta <= 0) return 0
  return Math.min(delta, ROSARI_MAX_FRAME_DELTA)
}

export function getRosariWardrobeProximity(position) {
  const wardrobe = ROSARI_ROOM_COLLIDERS.find((candidate) => candidate.id === 'wardrobe')
  const dx = Math.max(Math.abs(position.x - wardrobe.x) - wardrobe.halfX, 0)
  const dz = Math.max(Math.abs(position.z - wardrobe.z) - wardrobe.halfZ, 0)
  return Math.hypot(dx, dz)
}

export function isRosariNearWardrobe(position) {
  return getRosariWardrobeProximity(position) <= WARDROBE_INTERACT_MARGIN
}
