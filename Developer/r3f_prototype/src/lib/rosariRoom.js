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

// Room shell (world units). Walls are 0.12 thick boxes; these are their inner faces.
// The floor slab runs past the side walls' front ends to a lip at frontZ so the follow camera has floor
// under its bottom edge when Rosari stands at the front.
export const ROSARI_ROOM_SHELL = Object.freeze({
  floorTop: 0.01,
  backZ: -2.99,
  sideX: 3.99,
  wallTop: 3.025,
  frontZ: 3.75,
})

// Furniture placement, shared by the meshes (RosariRoom.jsx / rosariBedroomMesh.js) and the colliders
// below so a collider can never drift away from what is drawn. Floor props stand on the floor; the
// wardrobe, bed and nightstand sit 1.5-3 cm off the back wall (no hide-behind strip, no z-fighting).
export const ROSARI_ROOM_FURNITURE = Object.freeze({
  wardrobe: Object.freeze({ x: -3.2, z: -2.62, width: 1.35, depth: 0.7 }),
  bed: Object.freeze({ x: 2.88, z: -1.94, width: 2.0, depth: 1.75, headboardWidth: 2.18, headboardDepth: 0.16 }),
  nightstand: Object.freeze({ x: 1.45, z: -2.75, width: 0.5, depth: 0.42, top: 0.52 }),
  vanity: Object.freeze({ x: -2.8, z: 1.45, width: 1.28, depth: 0.55 }),
  plush: Object.freeze({ x: 3.15, z: 2.3 }),
  pouf: Object.freeze({ x: -3.25, z: 2.45, radius: 0.36 }),
  rug: Object.freeze({ x: 0, z: 0.75 }),
  window: Object.freeze({ x: 2.88, y: 1.78 }),
  art: Object.freeze({ x: -0.75, y: 1.75 }),
})

const F = ROSARI_ROOM_FURNITURE
// Every collider is the visible floor footprint of its prop (+<=2 cm). Flat wall decor (window,
// curtains, picture) and the rug have no collider: nothing stands on the floor there.
export const ROSARI_ROOM_COLLIDERS = Object.freeze([
  // body + doors + knobs (the crown overhang is above her head)
  { id: 'wardrobe', x: F.wardrobe.x, z: F.wardrobe.z + 0.04, halfX: 0.69, halfZ: 0.4 },
  { id: 'bed', x: F.bed.x, z: F.bed.z, halfX: 1.05, halfZ: 0.885 },
  { id: 'bed-headboard', x: F.bed.x, z: F.bed.z - 0.955, halfX: 1.1, halfZ: 0.09 },
  // top slab + drawer knob; the radio sits inside the top
  { id: 'nightstand', x: F.nightstand.x, z: F.nightstand.z + 0.0225, halfX: 0.28, halfZ: 0.245 },
  // desk + drawer knobs
  { id: 'vanity', x: F.vanity.x, z: F.vanity.z + 0.0275, halfX: 0.66, halfZ: 0.305 },
  { id: 'plush', x: F.plush.x - 0.24, z: F.plush.z + 0.03, halfX: 0.48, halfZ: 0.22 },
  { id: 'pouf', x: F.pouf.x, z: F.pouf.z, halfX: F.pouf.radius + 0.01, halfZ: F.pouf.radius + 0.01 },
].map((collider) => Object.freeze(collider)))

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

// The wardrobe opens only from its front side. It stands against the back wall (back face -2.97,
// front face -2.27), so nothing is behind it; standing beside its back half (z behind the box centre)
// is refused too, which keeps the +z view-mode camera from looking at it from the side.
export const WARDROBE_FRONT_FACE_Z = F.wardrobe.z + F.wardrobe.depth / 2
export const WARDROBE_OPEN_MIN_Z = WARDROBE_FRONT_FACE_Z - 0.35

export function isRosariNearWardrobe(position) {
  return position.z >= WARDROBE_OPEN_MIN_Z && getRosariWardrobeProximity(position) <= WARDROBE_INTERACT_MARGIN
}

// Retro radio on the nightstand (left of the bed). World position of the radio body's centre.
export const ROSARI_RADIO_POSITION = Object.freeze({ x: F.nightstand.x, y: F.nightstand.top + 0.1, z: F.nightstand.z - 0.02 })
export const RADIO_INTERACT_MARGIN = 0.5

// Distance from Rosari's centre to the nightstand footprint (0 when touching it).
export function getRosariRadioProximity(position) {
  const stand = ROSARI_ROOM_COLLIDERS.find((candidate) => candidate.id === 'nightstand')
  const dx = Math.max(Math.abs(position.x - stand.x) - stand.halfX, 0)
  const dz = Math.max(Math.abs(position.z - stand.z) - stand.halfZ, 0)
  return Math.hypot(dx, dz)
}

export function isNearRosariRadio(position) {
  return getRosariRadioProximity(position) <= RADIO_INTERACT_MARGIN
}

// Floating-joystick (analog, magnitude 0..1) wins over keys while a finger is down.
// Writes into `out` so the per-frame caller does not allocate.
export function resolveRosariMoveVector(keys, joystick, out = { x: 0, z: 0 }) {
  if (joystick?.active && (joystick.x !== 0 || joystick.z !== 0)) {
    const length = Math.hypot(joystick.x, joystick.z)
    const scale = length > 1 ? 1 / length : 1
    out.x = joystick.x * scale
    out.z = joystick.z * scale
    return out
  }
  const x = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0))
  const z = ((keys.down ? 1 : 0) - (keys.up ? 1 : 0))
  const length = Math.hypot(x, z)
  out.x = length > 0 ? x / length : 0
  out.z = length > 0 ? z / length : 0
  return out
}

export function isRosariTextEntryTarget(target) {
  if (!target || typeof target !== 'object') return false
  if (target.isContentEditable) return true
  const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : ''
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}
